package org.hyperledger.identus.oid4vci.service

import io.circe.parser.parse
import io.circe.Json
import org.hyperledger.identus.agent.walletapi.storage.DIDNonSecretStorage
import org.hyperledger.identus.castor.core.model.did.{DID, DIDUrl, PrismDID, VerificationRelationship}
import org.hyperledger.identus.oid4vci.domain.{IssuanceSession, Openid4VCIProofJwtOps}
import org.hyperledger.identus.oid4vci.http.*
import org.hyperledger.identus.oid4vci.storage.IssuanceSessionStorage
import org.hyperledger.identus.pollux.core.model.schema.CredentialSchema
import org.hyperledger.identus.pollux.core.service.{
  CredentialService,
  OID4VCIIssuerMetadataService,
  OID4VCIIssuerMetadataServiceError,
  URIDereferencer
}
import org.hyperledger.identus.pollux.vc.jwt.{
  DidResolver,
  Issuer,
  JWT,
  JWTVerification,
  JwtCredential,
  W3cCredentialPayload,
  *
}
import org.hyperledger.identus.shared.models.*
import zio.*

import java.net.{URI, URL}
import java.time.Instant
import java.util.UUID
import scala.util.Try

// TODO: move to pollux
// OIDC prefix is added to the service name to avoid name conflicts with a similar service CredentialIssuerService
// It would be nice to refactor these services and merge them into one
trait OIDCCredentialIssuerService {

  import OIDCCredentialIssuerService.Error
  import OIDCCredentialIssuerService.Errors.*

  def verifyJwtProof(jwt: JWT): IO[InvalidProof | DIDResolutionError, Boolean]

  def validateCredentialDefinition(
      credentialDefinition: CredentialDefinition
  ): IO[UnexpectedError, CredentialDefinition]

  def issueJwtCredential(
      issuingDID: PrismDID,
      subjectDID: Option[DID],
      claims: zio.json.ast.Json,
      credentialIdentifier: Option[String],
      credentialDefinition: CredentialDefinition,
  ): IO[Error, JWT]

  def createCredentialOffer(
      credentialIssuerBaseUrl: URL,
      issuerId: UUID,
      credentialConfigurationId: String,
      issuingDID: PrismDID,
      claims: zio.json.ast.Json,
  ): ZIO[WalletAccessContext, Error, CredentialOffer]

  def getIssuanceSessionByIssuerState(issuerState: String): IO[Error, IssuanceSession]

  def getIssuanceSessionByNonce(nonce: String): IO[Error, IssuanceSession]

  def updateIssuanceSession(issuanceSession: IssuanceSession): IO[Error, IssuanceSession]
}

object OIDCCredentialIssuerService {
  sealed trait Error extends Failure {
    override val namespace = "OIDCCredentialIssuerService"
    override val statusCode = StatusCode.BadRequest
  }

  // TODO: use shared Failure trait
  object Errors {
    case class InvalidProof(userFacingMessage: String) extends Error

    case class DIDResolutionError(userFacingMessage: String) extends Error

    case class CredentialConfigurationNotFound(issuerId: UUID, credentialConfigurationId: String) extends Error {
      override def userFacingMessage: String =
        s"Credential configuration with id $credentialConfigurationId not found for issuer $issuerId"
    }

    case class CredentialSchemaError(cause: org.hyperledger.identus.pollux.core.model.error.CredentialSchemaError)
        extends Error {
      override def userFacingMessage: String = cause.userFacingMessage
    }

    case class ServiceError(userFacingMessage: String) extends Error

    case class UnexpectedError(cause: Throwable) extends Error {
      override def userFacingMessage: String = cause.getMessage // TODO
    }
  }
}

case class OIDCCredentialIssuerServiceImpl(
    didNonSecretStorage: DIDNonSecretStorage,
    credentialService: CredentialService,
    issuerMetadataService: OID4VCIIssuerMetadataService,
    issuanceSessionStorage: IssuanceSessionStorage,
    didResolver: DidResolver,
    uriDereferencer: URIDereferencer,
) extends OIDCCredentialIssuerService
    with Openid4VCIProofJwtOps {

  import OIDCCredentialIssuerService.Error
  import OIDCCredentialIssuerService.Errors.*

  private def resolveVerificationMethodByKeyId(didUrl: DIDUrl): IO[DIDResolutionError, VerificationMethod] = {
    for {
      didDocument <- JWTVerification
        .resolve(didUrl.did.toString)(didResolver)
        .flatMap(_.toZIO)
        .mapError(msg => DIDResolutionError(s"Failed to resolve DID: $msg"))
      verificationMethodKeyOpt = didDocument.verificationMethod
        .find(_.id == didUrl.toString)
      assertionMethodKeyOpt = didDocument.assertionMethod
        .filter(m => m.isInstanceOf[VerificationMethod])
        .map(_.asInstanceOf[VerificationMethod])
        .find(_.id == didUrl.toString)
      verificationMethod <- ZIO
        .fromOption(verificationMethodKeyOpt.orElse(assertionMethodKeyOpt))
        .mapError(_ => DIDResolutionError(s"Verification method not found for keyId: ${didUrl.toString}"))
    } yield verificationMethod
  }

  override def verifyJwtProof(jwt: JWT): IO[InvalidProof | DIDResolutionError, Boolean] = {
    for {
      algorithm <- getAlgorithmFromJwt(jwt)
        .mapError(e => InvalidProof(e.getMessage))
      didUrl <- parseDIDUrlFromKeyId(jwt)
        .mapError(e => InvalidProof(e.getMessage))
      verificationMethod <- resolveVerificationMethodByKeyId(didUrl)
      publicKey <- JWTVerification.extractPublicKey(verificationMethod).toZIO.mapError(InvalidProof.apply)
      _ <- JWTVerification.validateEncodedJwt(jwt, publicKey).toZIO.mapError(InvalidProof.apply)
    } yield true
  }

  override def validateCredentialDefinition(
      credentialDefinition: CredentialDefinition
  ): IO[UnexpectedError, CredentialDefinition] = {
    ZIO.succeed(credentialDefinition) // TODO: implement
  }

  override def issueJwtCredential(
      issuingDID: PrismDID,
      subjectDID: Option[DID],
      claims: zio.json.ast.Json,
      credentialIdentifier: Option[String],
      credentialDefinition: CredentialDefinition
  ): IO[Error, JWT] = {
    for {
      wac <- didNonSecretStorage
        .getPrismDidWalletId(issuingDID)
        .flatMap(ZIO.fromOption)
        .mapError(_ => ServiceError(s"Failed to get wallet ID for DID: $issuingDID"))
        .map(WalletAccessContext.apply)

      jwtIssuer <- credentialService
        .getJwtIssuer(issuingDID, VerificationRelationship.AssertionMethod, None)
        .provideSomeLayer(ZLayer.succeed(wac))

      jwtVC <- buildJwtVerifiableCredential(
        jwtIssuer.did,
        subjectDID,
        credentialIdentifier,
        credentialDefinition,
        claims
      )
      jwt <- issueJwtVC(jwtIssuer, jwtVC)
    } yield jwt
  }

  def buildJwtVerifiableCredential(
      issuerDid: DID,
      subjectDid: Option[DID],
      credentialIdentifier: Option[String],
      credentialDefinition: CredentialDefinition,
      claims: zio.json.ast.Json
  ): IO[Error, W3cCredentialPayload] = {
    val credential = W3cCredentialPayload(
      `@context` = Set(
        "https://www.w3.org/2018/credentials/v1"
        // TODO: Add schemaID from schema registry
      ) ++ credentialDefinition.`@context`.getOrElse(Nil), // TODO: Figure out how to validate the context ^^^
      maybeId = credentialIdentifier,
      `type` = Set(
        "VerifiableCredential"
      ) ++ credentialDefinition.`type`, // TODO: This information should come from Schema registry by record.schemaId
      issuer = Left(issuerDid.toString),
      issuanceDate = Instant.now(),
      maybeExpirationDate = None, // TODO: Add expiration date
      maybeCredentialSchema = None, // TODO: Add schema from schema registry
      credentialSubject = buildCredentialSubject(subjectDid, claims),
      maybeCredentialStatus = None, // TODO: Add credential status
      maybeRefreshService = None, // TODO: Add refresh service
      maybeEvidence = None, // TODO: Add evidence
      maybeTermsOfUse = None, // TODO: Add terms of use,
      maybeValidFrom = None, // TODO: Add ValidFrom
      maybeValidUntil = None // TODO: Add ValidUntil
    )

    ZIO.succeed(credential) // TODO: there might be other calls to fill the VC claims from the session, etc
  }

  private def simpleZioToCirce(json: zio.json.ast.Json): Json =
    parse(json.toString).toOption.get

  private def buildCredentialSubject(subjectDid: Option[DID], claims: zio.json.ast.Json): Json = {
    val subjectClaims = simpleZioToCirce(claims)
    subjectDid.fold(subjectClaims)(did => Json.obj("id" -> Json.fromString(did.toString)) deepMerge subjectClaims)
  }

  def issueJwtVC(issuer: Issuer, payload: W3cCredentialPayload): IO[Error, JWT] = {
    ZIO
      .fromTry(Try(JwtCredential.encodeJwt(payload.toJwtCredentialPayload, issuer)))
      .mapError(e => ServiceError(s"Failed to issue JWT: ${e.getMessage}"))
  }

  override def getIssuanceSessionByIssuerState(
      issuerState: String
  ): IO[Error, IssuanceSession] =
    issuanceSessionStorage
      .getByIssuerState(issuerState)
      .mapError(e => ServiceError(s"Failed to get issuance session: ${e.message}"))
      .someOrFail(ServiceError(s"The IssuanceSession with the issuerState $issuerState does not exist"))

  override def createCredentialOffer(
      credentialIssuerBaseUrl: URL,
      issuerId: UUID,
      credentialConfigurationId: String,
      issuingDID: PrismDID,
      claims: zio.json.ast.Json
  ): ZIO[WalletAccessContext, Error, CredentialOffer] =
    for {
      schemaId <- issuerMetadataService
        .getCredentialConfigurationById(issuerId, credentialConfigurationId)
        .mapError { case _: OID4VCIIssuerMetadataServiceError.CredentialConfigurationNotFound =>
          CredentialConfigurationNotFound(issuerId, credentialConfigurationId)
        }
        .map(_.schemaId)
      _ <- CredentialSchema
        .validateJWTCredentialSubject(schemaId.toString(), simpleZioToCirce(claims).noSpaces, uriDereferencer)
        .mapError(e => CredentialSchemaError(e))
      session <- buildNewIssuanceSession(issuerId, issuingDID, claims, schemaId)
      _ <- issuanceSessionStorage
        .start(session)
        .mapError(e => ServiceError(s"Failed to start issuance session: ${e.message}"))
    } yield CredentialOffer(
      credential_issuer = credentialIssuerBaseUrl.toString(),
      credential_configuration_ids = Seq(credentialConfigurationId),
      grants = Some(
        CredentialOfferGrant(
          authorization_code = CredentialOfferAuthorizationGrant(issuer_state = Some(session.issuerState))
        )
      )
    )

  def getIssuanceSessionByNonce(nonce: String): IO[Error, IssuanceSession] = {
    issuanceSessionStorage
      .getByNonce(nonce)
      .mapError(e => ServiceError(s"Failed to get issuance session: ${e.message}"))
      .someOrFail(ServiceError(s"The IssuanceSession with the nonce $nonce does not exist"))
  }

  override def updateIssuanceSession(issuanceSession: IssuanceSession): IO[Error, IssuanceSession] = {
    issuanceSessionStorage
      .update(issuanceSession)
      .mapError(e => ServiceError(s"Failed to update issuance session: ${e.message}"))
  }

  private def buildNewIssuanceSession(
      issuerId: UUID,
      issuerDid: PrismDID,
      claims: zio.json.ast.Json,
      schemaId: URI
  ): UIO[IssuanceSession] = {
    for {
      id <- ZIO.random.flatMap(_.nextUUID)
      nonce <- ZIO.random.flatMap(_.nextUUID)
      issuerState <- ZIO.random.flatMap(_.nextUUID)
    } yield IssuanceSession(
      id = id,
      issuerId = issuerId,
      nonce = nonce.toString,
      issuerState = issuerState.toString,
      claims = claims,
      schemaId = Some(schemaId.toString),
      subjectDid = None, // FIXME: populate correct value
      issuingDid = issuerDid,
    )
  }
}

object OIDCCredentialIssuerServiceImpl {
  val layer: URLayer[
    DIDNonSecretStorage & CredentialService & IssuanceSessionStorage & DidResolver & URIDereferencer &
      OID4VCIIssuerMetadataService,
    OIDCCredentialIssuerService
  ] =
    ZLayer.fromFunction(OIDCCredentialIssuerServiceImpl(_, _, _, _, _, _))
}
