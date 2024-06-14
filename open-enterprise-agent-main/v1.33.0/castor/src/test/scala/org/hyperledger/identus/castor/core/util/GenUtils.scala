package org.hyperledger.identus.castor.core.util

import io.circe.Json
import org.hyperledger.identus.castor.core.model.did.*
import org.hyperledger.identus.castor.core.model.did.ServiceEndpoint.UriOrJsonEndpoint
import org.hyperledger.identus.castor.core.model.did.ServiceEndpoint.UriValue
import org.hyperledger.identus.shared.crypto.Apollo
import org.hyperledger.identus.shared.models.Base64UrlString
import zio.*
import zio.test.Gen

import scala.language.implicitConversions

object GenUtils {

  given Conversion[String, ServiceType.Name] = ServiceType.Name.fromStringUnsafe

  val uriFragment: Gen[Any, String] = Gen.stringBounded(1, 20)(Gen.asciiChar).filter(UriUtils.isValidUriFragment)

  val uri: Gen[Any, String] =
    for {
      scheme <- Gen.fromIterable(Seq("http", "https", "ftp", "ws", "wss", "file", "imap", "ssh"))
      host <- Gen.alphaNumericStringBounded(1, 10)
      path <- Gen.listOfBounded(0, 5)(Gen.alphaNumericStringBounded(1, 10)).map(_.mkString("/"))
      uri <- Gen.const(s"$scheme://$host/$path").map(UriUtils.normalizeUri).collect { case Some(uri) => uri }
    } yield uri

  // TODO: generate all key types
  val publicKeyData: Gen[Any, PublicKeyData] =
    for {
      curve <- Gen.const(EllipticCurve.SECP256K1)
      pk <- Gen.fromZIO(ZIO.succeed(Apollo.default.secp256k1.generateKeyPair.publicKey))
      x = Base64UrlString.fromByteArray(pk.getECPoint.x)
      y = Base64UrlString.fromByteArray(pk.getECPoint.y)
      uncompressedKey = PublicKeyData.ECKeyData(curve, x, y)
      compressedKey = PublicKeyData.ECCompressedKeyData(curve, Base64UrlString.fromByteArray(pk.getEncodedCompressed))
      generated <- Gen.fromIterable(Seq(uncompressedKey, compressedKey))
    } yield generated

  val publicKey: Gen[Any, PublicKey] =
    for {
      id <- uriFragment
      purpose <- Gen.fromIterable(VerificationRelationship.values)
      keyData <- publicKeyData
    } yield PublicKey(id, purpose, keyData)

  val internalPublicKey: Gen[Any, InternalPublicKey] =
    for {
      id <- uriFragment
      purpose <- Gen.fromIterable(InternalKeyPurpose.values)
      keyData <- publicKeyData
    } yield InternalPublicKey(id, purpose, keyData)

  val service: Gen[Any, Service] =
    for {
      id <- uriFragment
      serviceType <- Gen.oneOf(
        Gen.const(ServiceType.Single("LinkedDomains")),
        Gen
          .int(0, 1)
          .map(n => Seq[ServiceType.Name]("CredentialRepository").take(n))
          .map(tail => ServiceType.Multiple("LinkedDomains", tail))
      )
      sampleUri = "https://example.com"
      uriEndpointGen = Gen.const(UriOrJsonEndpoint.Uri(UriValue.fromString(sampleUri).toOption.get))
      jsonEndpointGen = Gen.const(UriOrJsonEndpoint.Json(Json.obj("uri" -> Json.fromString(sampleUri)).asObject.get))
      endpoints <- Gen.oneOf[Any, ServiceEndpoint](
        uriEndpointGen.map(ServiceEndpoint.Single(_)),
        jsonEndpointGen.map(ServiceEndpoint.Single(_)),
        Gen
          .listOfBounded(1, 3)(Gen.oneOf[Any, UriOrJsonEndpoint](uriEndpointGen, jsonEndpointGen))
          .map(xs => ServiceEndpoint.Multiple(xs.head, xs.tail))
      )
    } yield Service(id, serviceType, endpoints).normalizeServiceEndpoint()

  val createOperation: Gen[Any, PrismDIDOperation.Create] = {
    for {
      masterKey <- internalPublicKey.map(_.copy(purpose = InternalKeyPurpose.Master))
      publicKeys <- Gen.listOfBounded(0, 5)(publicKey)
      keys: List[InternalPublicKey | PublicKey] = masterKey :: publicKeys
      services <- Gen.listOfBounded(0, 5)(service)
      contexts <- Gen.listOfBounded(0, 5)(uri)
    } yield PrismDIDOperation.Create(keys, services, contexts)
  }

  val didData: Gen[Any, DIDData] = {
    for {
      op <- createOperation
    } yield DIDData(
      id = op.did,
      publicKeys = op.publicKeys.collect { case pk: PublicKey => pk },
      services = op.services,
      internalKeys = op.publicKeys.collect { case pk: InternalPublicKey => pk },
      context = op.context
    )
  }

}
