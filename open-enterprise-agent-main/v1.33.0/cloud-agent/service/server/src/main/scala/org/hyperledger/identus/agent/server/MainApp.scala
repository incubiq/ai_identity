package org.hyperledger.identus.agent.server

import com.nimbusds.jose.crypto.bc.BouncyCastleProviderSingleton
import org.hyperledger.identus.agent.server.config.AppConfig
import org.hyperledger.identus.agent.server.http.ZioHttpClient
import org.hyperledger.identus.agent.server.sql.Migrations as AgentMigrations
import org.hyperledger.identus.agent.walletapi.service.{
  EntityServiceImpl,
  ManagedDIDService,
  ManagedDIDServiceWithEventNotificationImpl,
  WalletManagementServiceImpl
}
import org.hyperledger.identus.agent.walletapi.sql.{
  JdbcDIDNonSecretStorage,
  JdbcEntityRepository,
  JdbcWalletNonSecretStorage
}
import org.hyperledger.identus.agent.walletapi.storage.GenericSecretStorage
import org.hyperledger.identus.castor.controller.{DIDControllerImpl, DIDRegistrarControllerImpl}
import org.hyperledger.identus.castor.core.service.DIDServiceImpl
import org.hyperledger.identus.castor.core.util.DIDOperationValidator
import org.hyperledger.identus.connect.controller.ConnectionControllerImpl
import org.hyperledger.identus.connect.core.service.{ConnectionServiceImpl, ConnectionServiceNotifier}
import org.hyperledger.identus.connect.sql.repository.{JdbcConnectionRepository, Migrations as ConnectMigrations}
import org.hyperledger.identus.credential.status.controller.CredentialStatusControllerImpl
import org.hyperledger.identus.event.controller.EventControllerImpl
import org.hyperledger.identus.event.notification.EventNotificationServiceImpl
import org.hyperledger.identus.iam.authentication.DefaultAuthenticator
import org.hyperledger.identus.iam.authentication.apikey.JdbcAuthenticationRepository
import org.hyperledger.identus.iam.authorization.DefaultPermissionManagementService
import org.hyperledger.identus.iam.authorization.core.EntityPermissionManagementService
import org.hyperledger.identus.iam.entity.http.controller.{EntityController, EntityControllerImpl}
import org.hyperledger.identus.iam.wallet.http.controller.WalletManagementControllerImpl
import org.hyperledger.identus.issue.controller.IssueControllerImpl
import org.hyperledger.identus.mercury.*
import org.hyperledger.identus.pollux.core.service.*
import org.hyperledger.identus.pollux.core.service.verification.VcVerificationServiceImpl
import org.hyperledger.identus.pollux.credentialdefinition.controller.CredentialDefinitionControllerImpl
import org.hyperledger.identus.pollux.credentialschema.controller.{
  CredentialSchemaController,
  CredentialSchemaControllerImpl,
  VerificationPolicyControllerImpl
}
import org.hyperledger.identus.pollux.sql.repository.{
  JdbcCredentialDefinitionRepository,
  JdbcCredentialRepository,
  JdbcCredentialSchemaRepository,
  JdbcCredentialStatusListRepository,
  JdbcPresentationRepository,
  JdbcVerificationPolicyRepository,
  Migrations as PolluxMigrations
}
import org.hyperledger.identus.presentproof.controller.PresentProofControllerImpl
import org.hyperledger.identus.resolvers.DIDResolver
import org.hyperledger.identus.system.controller.SystemControllerImpl
import org.hyperledger.identus.verification.controller.VcVerificationControllerImpl
import io.micrometer.prometheus.{PrometheusConfig, PrometheusMeterRegistry}
import zio.*
import zio.metrics.connectors.micrometer
import zio.metrics.connectors.micrometer.MicrometerConfig
import zio.metrics.jvm.DefaultJvmMetrics
import zio.logging.*
import zio.logging.LogFormat.*
import zio.logging.backend.SLF4J

import java.security.Security

object MainApp extends ZIOAppDefault {

  val colorFormat: LogFormat =
    fiberId.color(LogColor.YELLOW) |-|
      line.highlight |-|
      allAnnotations |-|
      cause.highlight

  override val bootstrap: ZLayer[ZIOAppArgs, Any, Any] =
    Runtime.removeDefaultLoggers >>> SLF4J.slf4j(colorFormat)

  Security.insertProviderAt(BouncyCastleProviderSingleton.getInstance(), 2)

  // FIXME: remove this when db app user have correct privileges provisioned by k8s operator.
  // This should be executed before migration to have correct privilege for new objects.
  private val preMigrations = for {
    _ <- ZIO.logInfo("running pre-migration steps.")
    appConfig <- ZIO.service[AppConfig].provide(SystemModule.configLayer)
    _ <- PolluxMigrations
      .initDbPrivileges(appConfig.pollux.database.appUsername)
      .provide(RepoModule.polluxTransactorLayer)
    _ <- ConnectMigrations
      .initDbPrivileges(appConfig.connect.database.appUsername)
      .provide(RepoModule.connectTransactorLayer)
    _ <- AgentMigrations
      .initDbPrivileges(appConfig.agent.database.appUsername)
      .provide(RepoModule.agentTransactorLayer)
  } yield ()

  private val migrations = for {
    _ <- ZIO.serviceWithZIO[PolluxMigrations](_.migrate)
    _ <- ZIO.serviceWithZIO[ConnectMigrations](_.migrate)
    _ <- ZIO.serviceWithZIO[AgentMigrations](_.migrate)
    _ <- ZIO.logInfo("Running post-migration RLS checks for DB application users")
    _ <- PolluxMigrations.validateRLS.provide(RepoModule.polluxContextAwareTransactorLayer)
    _ <- ConnectMigrations.validateRLS.provide(RepoModule.connectContextAwareTransactorLayer)
    _ <- AgentMigrations.validateRLS.provide(RepoModule.agentContextAwareTransactorLayer)
  } yield ()
  override def run: ZIO[Any, Throwable, Unit] = {

    val app = for {
      _ <- Console
        .printLine(s"""
      |██╗██████╗ ███████╗███╗   ██╗████████╗██╗   ██╗███████╗
      |██║██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██║   ██║██╔════╝
      |██║██║  ██║█████╗  ██╔██╗ ██║   ██║   ██║   ██║███████╗
      |██║██║  ██║██╔══╝  ██║╚██╗██║   ██║   ██║   ██║╚════██║
      |██║██████╔╝███████╗██║ ╚████║   ██║   ╚██████╔╝███████║
      |╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚══════╝
      |
      | ██████╗██╗      ██████╗ ██╗   ██╗██████╗
      |██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗
      |██║     ██║     ██║   ██║██║   ██║██║  ██║
      |██║     ██║     ██║   ██║██║   ██║██║  ██║
      |╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝
      | ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝
      |
      | █████╗  ██████╗ ███████╗███╗   ██╗████████╗
      |██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
      |███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║
      |██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║
      |██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║
      |╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝
      |
      |version: ${buildinfo.BuildInfo.version}
      |
      |""".stripMargin)
        .ignore

      _ <- preMigrations
      _ <- migrations

      app <- CloudAgentApp.run
        .provide(
          DidCommX.liveLayer,
          // infra
          SystemModule.configLayer,
          ZioHttpClient.layer,
          // observability
          DefaultJvmMetrics.live.unit,
          SystemControllerImpl.layer,
          ZLayer.succeed(PrometheusMeterRegistry(PrometheusConfig.DEFAULT)),
          ZLayer.succeed(MicrometerConfig.default),
          micrometer.micrometerLayer,
          // controller
          ConnectionControllerImpl.layer,
          CredentialSchemaControllerImpl.layer,
          CredentialDefinitionControllerImpl.layer,
          DIDControllerImpl.layer,
          DIDRegistrarControllerImpl.layer,
          IssueControllerImpl.layer,
          CredentialStatusControllerImpl.layer,
          PresentProofControllerImpl.layer,
          VcVerificationControllerImpl.layer,
          VerificationPolicyControllerImpl.layer,
          EntityControllerImpl.layer,
          WalletManagementControllerImpl.layer,
          EventControllerImpl.layer,
          // domain
          AppModule.apolloLayer,
          AppModule.didJwtResolverLayer,
          DIDOperationValidator.layer(),
          DIDResolver.layer,
          HttpURIDereferencerImpl.layer,
          // service
          ConnectionServiceImpl.layer >>> ConnectionServiceNotifier.layer,
          CredentialSchemaServiceImpl.layer,
          CredentialDefinitionServiceImpl.layer,
          CredentialStatusListServiceImpl.layer,
          LinkSecretServiceImpl.layer >>> CredentialServiceImpl.layer >>> CredentialServiceNotifier.layer,
          DIDServiceImpl.layer,
          EntityServiceImpl.layer,
          ManagedDIDServiceWithEventNotificationImpl.layer,
          LinkSecretServiceImpl.layer >>> PresentationServiceImpl.layer >>> PresentationServiceNotifier.layer,
          VerificationPolicyServiceImpl.layer,
          WalletManagementServiceImpl.layer,
          VcVerificationServiceImpl.layer,
          // authentication
          AppModule.builtInAuthenticatorLayer,
          AppModule.keycloakAuthenticatorLayer,
          AppModule.keycloakPermissionManagementLayer,
          DefaultAuthenticator.layer,
          DefaultPermissionManagementService.layer,
          EntityPermissionManagementService.layer,
          // grpc
          GrpcModule.prismNodeStubLayer,
          // storage
          RepoModule.agentContextAwareTransactorLayer ++ RepoModule.agentTransactorLayer >>> JdbcDIDNonSecretStorage.layer,
          RepoModule.agentContextAwareTransactorLayer >>> JdbcWalletNonSecretStorage.layer,
          RepoModule.allSecretStorageLayer,
          RepoModule.agentTransactorLayer >>> JdbcEntityRepository.layer,
          RepoModule.agentTransactorLayer >>> JdbcAuthenticationRepository.layer,
          RepoModule.connectContextAwareTransactorLayer ++ RepoModule.connectTransactorLayer >>> JdbcConnectionRepository.layer,
          RepoModule.polluxContextAwareTransactorLayer ++ RepoModule.polluxTransactorLayer >>> JdbcCredentialRepository.layer,
          RepoModule.polluxContextAwareTransactorLayer ++ RepoModule.polluxTransactorLayer >>> JdbcCredentialStatusListRepository.layer,
          RepoModule.polluxContextAwareTransactorLayer ++ RepoModule.polluxTransactorLayer >>> JdbcCredentialSchemaRepository.layer,
          RepoModule.polluxContextAwareTransactorLayer ++ RepoModule.polluxTransactorLayer >>> JdbcCredentialDefinitionRepository.layer,
          RepoModule.polluxContextAwareTransactorLayer ++ RepoModule.polluxTransactorLayer >>> JdbcPresentationRepository.layer,
          RepoModule.polluxContextAwareTransactorLayer >>> JdbcVerificationPolicyRepository.layer,
          // event notification service
          ZLayer.succeed(500) >>> EventNotificationServiceImpl.layer,
          // HTTP client
          SystemModule.zioHttpClientLayer,
          Scope.default,
        )
    } yield app

    app.provide(
      RepoModule.polluxDbConfigLayer(appUser = false) >>> PolluxMigrations.layer,
      RepoModule.connectDbConfigLayer(appUser = false) >>> ConnectMigrations.layer,
      RepoModule.agentDbConfigLayer(appUser = false) >>> AgentMigrations.layer,
    )
  }

}
