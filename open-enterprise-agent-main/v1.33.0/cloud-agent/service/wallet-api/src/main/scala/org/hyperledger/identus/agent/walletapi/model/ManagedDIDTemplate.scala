package org.hyperledger.identus.agent.walletapi.model

import org.hyperledger.identus.castor.core.model.did.{
  EllipticCurve,
  Service,
  ServiceEndpoint,
  ServiceType,
  VerificationRelationship
}

final case class ManagedDIDTemplate(
    publicKeys: Seq[DIDPublicKeyTemplate],
    services: Seq[Service],
    contexts: Seq[String]
)

final case class DIDPublicKeyTemplate(
    id: String,
    purpose: VerificationRelationship,
    curve: EllipticCurve
)

sealed trait UpdateManagedDIDAction

object UpdateManagedDIDAction {
  final case class AddKey(template: DIDPublicKeyTemplate) extends UpdateManagedDIDAction
  final case class RemoveKey(id: String) extends UpdateManagedDIDAction
  final case class AddService(service: Service) extends UpdateManagedDIDAction
  final case class RemoveService(id: String) extends UpdateManagedDIDAction
  final case class UpdateService(patch: UpdateServicePatch) extends UpdateManagedDIDAction
  final case class PatchContext(context: Seq[String]) extends UpdateManagedDIDAction
}

final case class UpdateServicePatch(
    id: String,
    serviceType: Option[ServiceType],
    serviceEndpoints: Option[ServiceEndpoint]
)
