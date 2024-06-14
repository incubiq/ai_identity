package org.hyperledger.identus.verification.controller

import io.circe.*
import io.circe.syntax.*
import org.hyperledger.identus.agent.walletapi.model.BaseEntity
import org.hyperledger.identus.agent.walletapi.service.{ManagedDIDService, MockManagedDIDService}
import org.hyperledger.identus.castor.core.service.MockDIDService
import org.hyperledger.identus.iam.authentication.AuthenticatorWithAuthZ
import org.hyperledger.identus.pollux.vc.jwt.*
import org.hyperledger.identus.pollux.vc.jwt.CredentialPayload.Implicits.*
import org.hyperledger.identus.verification.controller.http.*
import sttp.client3.ziojson.*
import sttp.client3.{DeserializationException, Response, UriContext, basicRequest}
import sttp.model.StatusCode
import zio.*
import zio.Config.OffsetDateTime
import zio.json.EncoderOps
import zio.test.*
import zio.test.Assertion.*

import java.time.Instant

object VcVerificationControllerImplSpec extends ZIOSpecDefault with VcVerificationControllerTestTools {

  def spec = httpErrorResponses.provideSomeLayerShared(
    MockDIDService.empty ++ MockManagedDIDService.empty >>> testEnvironmentLayer
  )

  private val httpErrorResponses = suite("IssueControllerImp http failure cases")(
    test("provide incorrect recordId to endpoint") {
      for {
        vcVerificationController <- ZIO.service[VcVerificationController]
        verifier = DID("did:prism:verifier")
        currentTime = OffsetDateTime.parse("2010-01-01T00:00:00Z").toOption.get
        jwtCredentialPayload = W3cCredentialPayload(
          `@context` = Set("https://www.w3.org/2018/credentials/v1", "https://www.w3.org/2018/credentials/examples/v1"),
          maybeId = Some("http://example.edu/credentials/3732"),
          `type` = Set("VerifiableCredential", "UniversityDegreeCredential"),
          issuer = issuer.did,
          issuanceDate = Instant.parse("2010-01-01T00:00:00Z"),
          maybeExpirationDate = Some(Instant.parse("2010-01-12T00:00:00Z")),
          maybeCredentialSchema = Some(
            CredentialSchema(
              id = "did:work:MDP8AsFhHzhwUvGNuYkX7T;id=06e126d1-fa44-4882-a243-1e326fbe21db;version=1.0",
              `type` = "JsonSchemaValidator2018"
            )
          ),
          credentialSubject = Json.obj(
            "userName" -> Json.fromString("Bob"),
            "age" -> Json.fromInt(42),
            "email" -> Json.fromString("email")
          ),
          maybeCredentialStatus = Some(
            CredentialStatus(
              id = "did:work:MDP8AsFhHzhwUvGNuYkX7T;id=06e126d1-fa44-4882-a243-1e326fbe21db;version=1.0",
              `type` = "StatusList2021Entry",
              statusPurpose = StatusPurpose.Revocation,
              statusListIndex = 0,
              statusListCredential = "https://example.com/credentials/status/3"
            )
          ),
          maybeRefreshService = Some(
            RefreshService(
              id = "https://example.edu/refresh/3732",
              `type` = "ManualRefreshService2018"
            )
          ),
          maybeEvidence = Option.empty,
          maybeTermsOfUse = Option.empty,
          aud = Set(verifier.value)
        ).toJwtCredentialPayload
        signedJwtCredential = issuer.signer.encode(jwtCredentialPayload.asJson)
        authenticator <- ZIO.service[AuthenticatorWithAuthZ[BaseEntity]]
        backend = httpBackend(vcVerificationController, authenticator)
        request = List(
          VcVerificationRequest(
            signedJwtCredential.value,
            List(
              ParameterizableVcVerification(VcVerification.SignatureVerification, None),
              ParameterizableVcVerification(VcVerification.NotBeforeCheck, Some(DateTimeParameter(currentTime))),
              ParameterizableVcVerification(VcVerification.ExpirationCheck, Some(DateTimeParameter(currentTime)))
            )
          ),
          VcVerificationRequest(
            signedJwtCredential.value,
            List(
              ParameterizableVcVerification(VcVerification.AudienceCheck, Some(DidParameter(verifier.value))),
              ParameterizableVcVerification(
                VcVerification.IssuerIdentification,
                Some(DidParameter(issuer.did.value))
              )
            )
          )
        ).toJsonPretty
        response: Response[Either[DeserializationException[String], List[VcVerificationResponse]]] <-
          basicRequest
            .post(uri"${vcVerificationUriBase}")
            .body(request)
            .response(asJsonAlways[List[VcVerificationResponse]])
            .send(backend)
        statusCodeIs200 = assert(response.code)(equalTo(StatusCode.Ok))
        body <- ZIO.fromEither(response.body)
        bodyIsOk = assert(body)(
          equalTo(
            List(
              VcVerificationResponse(
                signedJwtCredential.value,
                List(
                  VcVerificationResult(VcVerification.SignatureVerification, false),
                  VcVerificationResult(VcVerification.NotBeforeCheck, true),
                  VcVerificationResult(VcVerification.ExpirationCheck, true)
                )
              ),
              VcVerificationResponse(
                signedJwtCredential.value,
                List(
                  VcVerificationResult(VcVerification.AudienceCheck, true),
                  VcVerificationResult(VcVerification.IssuerIdentification, true)
                )
              )
            )
          )
        )
      } yield statusCodeIs200 && bodyIsOk
    }
  )

}
