package org.hyperledger.identus.connect.controller.http

import org.hyperledger.identus.api.http.Annotation
import org.hyperledger.identus.connect.controller.http.ConnectionInvitation.annotations
import org.hyperledger.identus.mercury.protocol.invitation.v2.Invitation
import sttp.tapir.Schema
import sttp.tapir.Schema.annotations.{description, encodedExample}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.util.UUID

case class ConnectionInvitation(
    @description(annotations.id.description)
    @encodedExample(annotations.id.example)
    id: UUID,
    @description(annotations.`type`.description)
    @encodedExample(annotations.`type`.example)
    `type`: String,
    @description(annotations.from.description)
    @encodedExample(annotations.from.example)
    from: String,
    @description(annotations.invitationUrl.description)
    @encodedExample(annotations.invitationUrl.example)
    invitationUrl: String
)

object ConnectionInvitation {

  def fromDomain(domain: Invitation) = ConnectionInvitation(
    id = UUID.fromString(domain.id),
    `type` = domain.`type`,
    from = domain.from.value,
    invitationUrl = s"https://my.domain.com/path?_oob=${domain.toBase64}"
  )

  object annotations {
    object id
        extends Annotation[UUID](
          description =
            "The unique identifier of the invitation. It should be used as parent thread ID (pthid) for the Connection Request message that follows.",
          example = UUID.fromString("0527aea1-d131-3948-a34d-03af39aba8b4")
        )

    object `type`
        extends Annotation[String](
          description = "The DIDComm Message Type URI (MTURI) the invitation message complies with.",
          example = "https://didcomm.org/out-of-band/2.0/invitation"
        )

    object from
        extends Annotation[String](
          description = "The DID representing the sender to be used by recipients for future interactions.",
          example = "did:peer:1234457"
        )

    object invitationUrl
        extends Annotation[String](
          description =
            "The invitation message encoded as a URL. This URL follows the Out of [Band 2.0 protocol](https://identity.foundation/didcomm-messaging/spec/v2.0/#out-of-band-messages) and can be used to generate a QR code for example.",
          example =
            "https://my.domain.com/path?_oob=eyJAaWQiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvbXktZmFtaWx5LzEuMC9teS1tZXNzYWdlLXR5cGUiLCJkaWQiOiJXZ1d4cXp0ck5vb0c5MlJYdnhTVFd2IiwiaW1hZ2VVcmwiOiJodHRwOi8vMTkyLjE2OC41Ni4xMDEvaW1nL2xvZ28uanBnIiwibGFiZWwiOiJCb2IiLCJyZWNpcGllbnRLZXlzIjpbIkgzQzJBVnZMTXY2Z21NTmFtM3VWQWpacGZrY0pDd0R3blpuNnozd1htcVBWIl0sInJvdXRpbmdLZXlzIjpbIkgzQzJBVnZMTXY2Z21NTmFtM3VWQWpacGZrY0pDd0R3blpuNnozd1htcVBWIl0sInNlcnZpY2VFbmRwb2ludCI6Imh0dHA6Ly8xOTIuMTY4LjU2LjEwMTo4MDIwIn0="
        )
  }

  val Example = ConnectionInvitation(
    id = annotations.id.example,
    `type` = annotations.`type`.example,
    from = annotations.from.example,
    invitationUrl = annotations.invitationUrl.example
  )

  given encoder: JsonEncoder[ConnectionInvitation] =
    DeriveJsonEncoder.gen[ConnectionInvitation]

  given decoder: JsonDecoder[ConnectionInvitation] =
    DeriveJsonDecoder.gen[ConnectionInvitation]

  given schema: Schema[ConnectionInvitation] = Schema.derived
}
