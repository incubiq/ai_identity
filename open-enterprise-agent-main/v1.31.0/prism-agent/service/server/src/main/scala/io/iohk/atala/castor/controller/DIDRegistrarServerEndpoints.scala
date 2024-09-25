package io.iohk.atala.castor.controller

import io.iohk.atala.LogUtils.*
import io.iohk.atala.agent.walletapi.model.BaseEntity
import io.iohk.atala.iam.authentication.Authenticator
import io.iohk.atala.iam.authentication.Authorizer
import io.iohk.atala.iam.authentication.DefaultAuthenticator
import io.iohk.atala.iam.authentication.SecurityLogic
import io.iohk.atala.shared.models.WalletAccessContext
import sttp.tapir.ztapir.*
import zio.*

class DIDRegistrarServerEndpoints(
    didRegistrarController: DIDRegistrarController,
    authenticator: Authenticator[BaseEntity],
    authorizer: Authorizer[BaseEntity]
) {

  private val listManagedDidServerEndpoint: ZServerEndpoint[Any, Any] =
    DIDRegistrarEndpoints.listManagedDid
      .zServerSecurityLogic(SecurityLogic.authorizeWalletAccessWith(_)(authenticator, authorizer))
      .serverLogic { wac =>
        { case (rc, paginationInput) =>
          didRegistrarController
            .listManagedDid(paginationInput)(rc)
            .provideSomeLayer(ZLayer.succeed(wac))
            .logTrace(rc)
        }
      }

  private val createManagedDidServerEndpoint: ZServerEndpoint[Any, Any] =
    DIDRegistrarEndpoints.createManagedDid
      .zServerSecurityLogic(SecurityLogic.authorizeWalletAccessWith(_)(authenticator, authorizer))
      .serverLogic { wac =>
        { case (rc, createManagedDidRequest) =>
          didRegistrarController
            .createManagedDid(createManagedDidRequest)(rc)
            .provideSomeLayer(ZLayer.succeed(wac))
            .logTrace(rc)
        }
      }

  private val getManagedDidServerEndpoint: ZServerEndpoint[Any, Any] =
    DIDRegistrarEndpoints.getManagedDid
      .zServerSecurityLogic(SecurityLogic.authorizeWalletAccessWith(_)(authenticator, authorizer))
      .serverLogic { wac =>
        { case (rc, did) =>
          didRegistrarController
            .getManagedDid(did)(rc)
            .provideSomeLayer(ZLayer.succeed(wac))
            .logTrace(rc)
        }
      }

  private val publishManagedDidServerEndpoint: ZServerEndpoint[Any, Any] =
    DIDRegistrarEndpoints.publishManagedDid
      .zServerSecurityLogic(SecurityLogic.authorizeWalletAccessWith(_)(authenticator, authorizer))
      .serverLogic { wac =>
        { case (rc, did) =>
          didRegistrarController
            .publishManagedDid(did)(rc)
            .provideSomeLayer(ZLayer.succeed(wac))
            .logTrace(rc)
        }
      }

  private val updateManagedDidServerEndpoint: ZServerEndpoint[Any, Any] =
    DIDRegistrarEndpoints.updateManagedDid
      .zServerSecurityLogic(SecurityLogic.authorizeWalletAccessWith(_)(authenticator, authorizer))
      .serverLogic { wac =>
        { case (rc, did, updateRequest) =>
          didRegistrarController
            .updateManagedDid(did, updateRequest)(rc)
            .provideSomeLayer(ZLayer.succeed(wac))
            .logTrace(rc)
        }
      }

  private val deactivateManagedDidServerEndpoint: ZServerEndpoint[Any, Any] =
    DIDRegistrarEndpoints.deactivateManagedDid
      .zServerSecurityLogic(SecurityLogic.authorizeWalletAccessWith(_)(authenticator, authorizer))
      .serverLogic { wac =>
        { case (rc, did) =>
          didRegistrarController
            .deactivateManagedDid(did)(rc)
            .provideSomeLayer(ZLayer.succeed(wac))
            .logTrace(rc)
        }
      }

  val all: List[ZServerEndpoint[Any, Any]] = List(
    listManagedDidServerEndpoint,
    createManagedDidServerEndpoint,
    getManagedDidServerEndpoint,
    publishManagedDidServerEndpoint,
    updateManagedDidServerEndpoint,
    deactivateManagedDidServerEndpoint
  )

}

object DIDRegistrarServerEndpoints {
  def all: URIO[DIDRegistrarController & DefaultAuthenticator, List[ZServerEndpoint[Any, Any]]] = {
    for {
      authenticator <- ZIO.service[DefaultAuthenticator]
      didRegistrarController <- ZIO.service[DIDRegistrarController]
      didRegistrarEndpoints = new DIDRegistrarServerEndpoints(didRegistrarController, authenticator, authenticator)
    } yield didRegistrarEndpoints.all
  }
}