package org.hyperledger.identus.verification.controller.http

import org.hyperledger.identus.api.http.ErrorResponse
import org.hyperledger.identus.pollux.core.service
import org.hyperledger.identus.pollux.core.service.verification.VcVerification as ServiceVcVerification
import sttp.tapir.Schema
import zio.json.{JsonDecoder, JsonEncoder}
import zio.{IO, *}

enum VcVerification {
  case SignatureVerification
  case IssuerIdentification
  case ExpirationCheck
  case NotBeforeCheck
  case AudienceCheck
  case SubjectVerification
  case IntegrityOfClaims
  case ComplianceWithStandards
  case RevocationCheck
  case AlgorithmVerification
  case SchemaCheck
  case SemanticCheckOfClaims
}

object VcVerification {
  given encoder: JsonEncoder[VcVerification] = JsonEncoder[String].contramap(_.toString)

  given decoder: JsonDecoder[VcVerification] =
    JsonDecoder[String].mapOrFail(s =>
      VcVerification.values.find(_.toString == s).toRight(s"Unknown VcVerification: $s")
    )

  given schema: Schema[VcVerification] = Schema.derivedEnumeration.defaultStringBased

  def convert(
      verification: VcVerification,
      maybeParameter: Option[VcVerificationParameter]
  ): IO[ErrorResponse, ServiceVcVerification] = {
    (verification, maybeParameter) match {
      case (SignatureVerification, None) => ZIO.succeed(ServiceVcVerification.SignatureVerification)
      case (IssuerIdentification, Some(DidParameter(iss))) =>
        ZIO.succeed(ServiceVcVerification.IssuerIdentification(iss))
      case (ExpirationCheck, Some(DateTimeParameter(dateTime))) =>
        ZIO.succeed(ServiceVcVerification.ExpirationCheck(dateTime))
      case (NotBeforeCheck, Some(DateTimeParameter(dateTime))) =>
        ZIO.succeed(ServiceVcVerification.NotBeforeCheck(dateTime))
      case (AudienceCheck, Some(DidParameter(aud))) => ZIO.succeed(ServiceVcVerification.AudienceCheck(aud))
      case (SubjectVerification, None)              => ZIO.succeed(ServiceVcVerification.SubjectVerification)
      case (IntegrityOfClaims, None)                => ZIO.succeed(ServiceVcVerification.IntegrityOfClaims)
      case (ComplianceWithStandards, None)          => ZIO.succeed(ServiceVcVerification.ComplianceWithStandards)
      case (RevocationCheck, None)                  => ZIO.succeed(ServiceVcVerification.RevocationCheck)
      case (AlgorithmVerification, None)            => ZIO.succeed(ServiceVcVerification.AlgorithmVerification)
      case (SchemaCheck, None)                      => ZIO.succeed(ServiceVcVerification.SchemaCheck)
      case (SemanticCheckOfClaims, None)            => ZIO.succeed(ServiceVcVerification.SemanticCheckOfClaims)
      case _ =>
        ZIO.fail(
          ErrorResponse.badRequest(detail =
            Some(s"Unsupported Verification:$verification and Parameters:$maybeParameter")
          )
        )
    }
  }

  def toService(verification: ServiceVcVerification): VcVerification = {
    verification match {
      case ServiceVcVerification.SignatureVerification   => SignatureVerification
      case ServiceVcVerification.IssuerIdentification(_) => IssuerIdentification
      case ServiceVcVerification.ExpirationCheck(_)      => ExpirationCheck
      case ServiceVcVerification.NotBeforeCheck(_)       => NotBeforeCheck
      case ServiceVcVerification.AudienceCheck(_)        => AudienceCheck
      case ServiceVcVerification.SubjectVerification     => SubjectVerification
      case ServiceVcVerification.IntegrityOfClaims       => IntegrityOfClaims
      case ServiceVcVerification.ComplianceWithStandards => ComplianceWithStandards
      case ServiceVcVerification.RevocationCheck         => RevocationCheck
      case ServiceVcVerification.AlgorithmVerification   => AlgorithmVerification
      case ServiceVcVerification.SchemaCheck             => SchemaCheck
      case ServiceVcVerification.SemanticCheckOfClaims   => SemanticCheckOfClaims
    }
  }
}
