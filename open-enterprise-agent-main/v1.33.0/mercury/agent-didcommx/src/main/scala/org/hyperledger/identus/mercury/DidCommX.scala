package org.hyperledger.identus.mercury

import org.didcommx.didcomm.DIDComm

import zio._
import org.didcommx.didcomm.model._

import org.hyperledger.identus.resolvers.UniversalDidResolver
import org.hyperledger.identus.mercury.model.{given, _}
import scala.language.implicitConversions

object DidCommX {
  val liveLayer: ZLayer[Any, Nothing, DidOps] = ZLayer.succeed(
    new DidCommX(): DidOps
  )
}
class DidCommX() extends DidOps /* with DidAgent with DIDResolver */ {

  def didCommFor(agent: DidAgent) = {
    new DIDComm(UniversalDidResolver, AgentPeerService.getSecretResolverInMemory(agent))
  }

  // override def id: DidId = fixme // FIXME the Secret is on org.didcommx.didcomm.model.DIDComm ...

  // override def resolveDID(did: DidId): Task[DIDDoc] = UniversalDidResolver.resolveDID(did)

  override def packSigned(msg: Message): URIO[DidAgent, SignedMesage] = for {
    agent <- ZIO.service[DidAgent]
    params = new PackSignedParams.Builder(msg, agent.id.value).build()
    ret = didCommFor(agent).packSigned(params)
  } yield (ret)

  override def packEncrypted(msg: Message, to: DidId): URIO[DidAgent, EncryptedMessage] = for {
    agent <- ZIO.service[DidAgent]
    params = new PackEncryptedParams.Builder(msg, to.value)
      .from(agent.id.value)
      .forward(false)
      .build()
    ret = didCommFor(agent).packEncrypted(params)
  } yield (ret)

  // FIXME theoretically DidAgent is not needed
  override def packEncryptedAnon(msg: Message, to: DidId): URIO[DidAgent, EncryptedMessage] = for {
    agent <- ZIO.service[DidAgent]
    params = new PackEncryptedParams.Builder(msg, to.value)
      // .from(myDid.value)
      .forward(true)
      .build()
    ret = didCommFor(agent).packEncrypted(params)
  } yield (ret)

  override def unpack(data: String): URIO[DidAgent, UnpackMessage] = for {
    agent <- ZIO.service[DidAgent]
    ret = didCommFor(agent).unpack(new UnpackParams.Builder(data).build())
  } yield (ret)

}

// object AgentService {
//   val alice = ZLayer.succeed(
//     AgentService[Agent.Alice.type](
//       new DIDComm(UniversalDidResolver, AliceSecretResolver.secretResolver),
//       Agent.Alice
//     )
//   )
//   val bob = ZLayer.succeed(
//     AgentService[Agent.Bob.type](
//       new DIDComm(UniversalDidResolver, BobSecretResolver.secretResolver),
//       Agent.Bob
//     )
//   )

//   // val charlie = ZLayer.succeed(
//   //   AgentService[Agent.Charlie.type](
//   //     new DIDComm(UniversalDidResolver, CharlieSecretResolver.secretResolver),
//   //     Agent.Charlie
//   //   )
//   // )

// }
