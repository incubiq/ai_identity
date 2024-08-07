package org.hyperledger.identus.iam.authentication.oidc

import sttp.tapir.EndpointInput.Auth
import sttp.tapir.EndpointInput.AuthType.Http
import sttp.tapir.ztapir.*

object JwtSecurityLogic {
  val jwtAuthHeader: Auth[JwtCredentials, Http] = auth
    .bearer[Option[String]]()
    .mapTo[JwtCredentials]
    .securitySchemeName("jwtAuth")
}
