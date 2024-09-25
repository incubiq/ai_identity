package org.hyperledger.identus.pollux.prex

import io.circe.*
import io.circe.generic.auto.*
import io.circe.parser.*
import org.hyperledger.identus.pollux.prex.PresentationDefinitionError.{
  InvalidFilterJsonPath,
  InvalidFilterJsonSchema,
  JsonSchemaOptionNotSupported
}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import scala.io.Source
import scala.util.Using

object PresentationDefinitionValidatorSpec extends ZIOSpecDefault {

  final case class ExampleTransportEnvelope(presentation_definition: PresentationDefinition)

  override def spec = suite("PresentationDefinitionValidatorSpec")(
    test("accept presentation-definition examples from spec") {
      val resourcePaths = Seq(
        "pd/minimal_example.json",
        "pd/filter_by_cred_type.json",
        "pd/two_filters_simplified.json",
        "pd/single_group.json",
      )
      ZIO
        .foreach(resourcePaths) { path =>
          for {
            validator <- ZIO.service[PresentationDefinitionValidator]
            _ <- ZIO
              .fromTry(Using(Source.fromResource(path))(_.mkString))
              .flatMap(json => ZIO.fromEither(decode[ExampleTransportEnvelope](json)))
              .map(_.presentation_definition)
              .flatMap(validator.validate)
          } yield ()
        }
        .as(assertCompletes)
    },
    test("reject when filter is invalid json-schema") {
      val pdJson =
        """{
          |  "presentation_definition": {
          |    "id": "32f54163-7166-48f1-93d8-ff217bdb0653",
          |    "input_descriptors": [
          |      {
          |        "id": "wa_driver_license",
          |        "name": "Washington State Business License",
          |        "purpose": "We can only allow licensed Washington State business representatives into the WA Business Conference",
          |        "constraints": {
          |          "fields": [
          |            {
          |              "path": ["$.credentialSubject.dateOfBirth"],
          |              "filter": {"type": 123}
          |            }
          |          ]
          |        }
          |      }
          |    ]
          |  }
          |}
          """.stripMargin

      for {
        validator <- ZIO.service[PresentationDefinitionValidator]
        pd <- ZIO
          .fromEither(decode[ExampleTransportEnvelope](pdJson))
          .map(_.presentation_definition)
        exit <- validator.validate(pd).exit
      } yield assert(exit)(failsWithA[InvalidFilterJsonSchema])
    },
    test("reject when filter is valid but use disallowed filter property") {
      val pdJson =
        """{
          |  "presentation_definition": {
          |    "id": "32f54163-7166-48f1-93d8-ff217bdb0653",
          |    "input_descriptors": [
          |      {
          |        "id": "wa_driver_license",
          |        "name": "Washington State Business License",
          |        "purpose": "We can only allow licensed Washington State business representatives into the WA Business Conference",
          |        "constraints": {
          |          "fields": [
          |            {
          |              "path": ["$.credentialSubject.dateOfBirth"],
          |              "filter": {"type": "string", "format": "date-time"}
          |            }
          |          ]
          |        }
          |      }
          |    ]
          |  }
          |}
          """.stripMargin

      for {
        validator <- ZIO.service[PresentationDefinitionValidator]
        pd <- ZIO
          .fromEither(decode[ExampleTransportEnvelope](pdJson))
          .map(_.presentation_definition)
        exit <- validator.validate(pd).exit
      } yield assert(exit)(failsWithA[JsonSchemaOptionNotSupported])
    },
    test("reject when path is not a valid json path") {
      val pdJson =
        """{
          |  "presentation_definition": {
          |    "id": "32f54163-7166-48f1-93d8-ff217bdb0653",
          |    "input_descriptors": [
          |      {
          |        "id": "wa_driver_license",
          |        "name": "Washington State Business License",
          |        "purpose": "We can only allow licensed Washington State business representatives into the WA Business Conference",
          |        "constraints": {
          |          "fields": [
          |            {
          |              "path": ["$$"]
          |            }
          |          ]
          |        }
          |      }
          |    ]
          |  }
          |}
          """.stripMargin

      for {
        validator <- ZIO.service[PresentationDefinitionValidator]
        pd <- ZIO
          .fromEither(decode[ExampleTransportEnvelope](pdJson))
          .map(_.presentation_definition)
        exit <- validator.validate(pd).exit
      } yield assert(exit)(failsWithA[InvalidFilterJsonPath])
    }
  )
    .provide(PresentationDefinitionValidatorImpl.layer)

}
