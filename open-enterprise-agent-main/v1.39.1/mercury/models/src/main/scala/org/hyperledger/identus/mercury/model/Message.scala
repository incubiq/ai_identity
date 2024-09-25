package org.hyperledger.identus.mercury.model

import io.circe.*
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

import java.time.{LocalDateTime, ZoneOffset}
import scala.jdk.CollectionConverters.*

type PIURI = String //type URI or URL?
case class Message(
    `type`: PIURI,
    from: Option[DidId],
    to: Seq[DidId],
    body: JsonObject = JsonObject.empty,
    id: String = java.util.UUID.randomUUID.toString(),
    createdTime: Option[Long] = Some(LocalDateTime.now().toEpochSecond(ZoneOffset.of("Z"))),
    expiresTimePlus: Option[Long] = Some(1000),
    attachments: Option[Seq[AttachmentDescriptor]] = None, // id -> data  (data is also a json)
    thid: Option[String] = None,
    pthid: Option[String] = None,
    ack: Option[Seq[String]] = None,
    pleaseAck: Option[Seq[String]] = None,
) {
  def piuri = `type`
}

object Message {
  given Encoder[Message] = {
    import AttachmentDescriptor.attachmentDescriptorEncoderV2
    deriveEncoder[Message]
  }
  given Decoder[Message] = deriveDecoder[Message]
}
