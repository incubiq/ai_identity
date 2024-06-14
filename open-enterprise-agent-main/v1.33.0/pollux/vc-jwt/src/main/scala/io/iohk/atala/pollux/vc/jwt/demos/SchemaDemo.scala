package org.hyperledger.identus.pollux.vc.jwt.demos

import io.circe.*
import net.reactivecore.cjs.{DocumentValidator, Loader}

@main def schemaDemo(): Unit =
  val schemaCode =
    """
      |{
      |  "type": "object",
      |  "properties": {
      |    "userName": {
      |      "$ref": "#/$defs/user"
      |    },
      |    "age": {
      |      "$ref": "#/$defs/age"
      |    },
      |    "email": {
      |      "$ref": "#/$defs/email"
      |    }
      |  },
      |  "required": ["userName", "age", "email"],
      |  "$defs": {
      |    "user": {
      |       "type": "string",
      |       "minLength": 3
      |     },
      |     "age": {
      |       "type": "number"
      |     },
      |     "email": {
      |       "type": "string",
      |       "format": "email"
      |     }
      |  }
      |}
      |""".stripMargin

  val validator = Loader.empty.fromJson(io.circe.parser.parse(schemaCode).toOption.get)

  def test(s: Json): Unit = {
    validator match {
      case Right(v) =>
        val result = v.validate(s)
        println(s"Result of $s: $result")
      case Left(e) =>
        println(s"Validation failed with error: $e")
    }
  }

  test(Json.fromString("wrongType"))
  test(
    Json.obj(
      "userName" -> Json.fromString("Bob"),
      "age" -> Json.fromInt(42)
    )
  )

  // Missing UserName
  test(
    Json.obj(
      "age" -> Json.fromInt(42),
      "email" -> Json.fromString("email@email.com")
    )
  )

  // Age has Wrong type
  test(
    Json.obj(
      "userName" -> Json.fromString("Bob"),
      "age" -> Json.fromBoolean(false),
      "email" -> Json.fromString("email@email.com")
    )
  )

  // Success
  test(
    Json.obj(
      "userName" -> Json.fromString("Bob"),
      "age" -> Json.fromInt(42),
      "email" -> Json.fromString("email")
    )
  )
