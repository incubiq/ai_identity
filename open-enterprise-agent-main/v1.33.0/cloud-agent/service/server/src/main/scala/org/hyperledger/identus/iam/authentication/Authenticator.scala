package org.hyperledger.identus.iam.authentication

import org.hyperledger.identus.agent.walletapi.model.BaseEntity
import org.hyperledger.identus.agent.walletapi.model.Entity
import org.hyperledger.identus.agent.walletapi.model.EntityRole
import org.hyperledger.identus.api.http.ErrorResponse
import org.hyperledger.identus.shared.models.WalletAccessContext
import org.hyperledger.identus.shared.models.WalletAdministrationContext
import org.hyperledger.identus.shared.models.WalletId
import zio.{IO, ZIO, ZLayer}

trait Credentials

trait AuthenticationError {
  def message: String
}

object AuthenticationError {

  case class InvalidCredentials(message: String) extends AuthenticationError

  case class AuthenticationMethodNotEnabled(message: String) extends AuthenticationError

  case class UnexpectedError(message: String) extends AuthenticationError

  case class ServiceError(message: String) extends AuthenticationError

  case class ResourceNotPermitted(message: String) extends AuthenticationError

  case class InvalidRole(message: String) extends AuthenticationError

  def toErrorResponse(error: AuthenticationError): ErrorResponse =
    ErrorResponse(
      status = sttp.model.StatusCode.Forbidden.code,
      `type` = "authentication_error",
      title = "",
      detail = Option(error.message)
    )
}

trait Authenticator[E <: BaseEntity] {
  def authenticate(credentials: Credentials): IO[AuthenticationError, E]

  def isEnabled: Boolean

  def apply(credentials: Credentials): IO[AuthenticationError, E] = authenticate(credentials)
}

trait Authorizer[E <: BaseEntity] {
  protected def authorizeWalletAccessLogic(entity: E): IO[AuthenticationError, WalletAccessContext]

  final def authorizeWalletAccess(entity: E): IO[AuthenticationError, WalletAccessContext] =
    ZIO
      .fromEither(entity.role)
      .mapError(msg =>
        AuthenticationError.UnexpectedError(s"Unable to retrieve entity role for entity id ${entity.id}. $msg")
      )
      .filterOrFail(_ != EntityRole.Admin)(
        AuthenticationError.InvalidRole("Admin role is not allowed to access the tenant's wallet.")
      )
      .flatMap(_ => authorizeWalletAccessLogic(entity))

  def authorizeWalletAdmin(entity: E): IO[AuthenticationError, WalletAdministrationContext]
}

object EntityAuthorizer extends EntityAuthorizer

trait EntityAuthorizer extends Authorizer[Entity] {
  override def authorizeWalletAccessLogic(entity: Entity): IO[AuthenticationError, WalletAccessContext] =
    ZIO.succeed(entity.walletId).map(WalletId.fromUUID).map(WalletAccessContext.apply)

  override def authorizeWalletAdmin(entity: Entity): IO[AuthenticationError, WalletAdministrationContext] = {
    val ctx =
      if (entity == Entity.Admin) WalletAdministrationContext.Admin()
      else WalletAdministrationContext.SelfService(Seq(WalletId.fromUUID(entity.walletId)))
    ZIO.succeed(ctx)
  }
}

trait AuthenticatorWithAuthZ[E <: BaseEntity] extends Authenticator[E], Authorizer[E]

object DefaultEntityAuthenticator extends AuthenticatorWithAuthZ[BaseEntity] {

  override def isEnabled: Boolean = true
  override def authenticate(credentials: Credentials): IO[AuthenticationError, BaseEntity] = ZIO.succeed(Entity.Default)
  override def authorizeWalletAccessLogic(entity: BaseEntity): IO[AuthenticationError, WalletAccessContext] =
    EntityAuthorizer.authorizeWalletAccessLogic(Entity.Default)
  override def authorizeWalletAdmin(entity: BaseEntity): IO[AuthenticationError, WalletAdministrationContext] =
    EntityAuthorizer.authorizeWalletAdmin(Entity.Default)

  val layer = ZLayer.apply(ZIO.succeed(DefaultEntityAuthenticator))
}
