package org.hyperledger.identus.mercury.protocol.invitation.v1

import io.circe.parser.*
import io.circe.syntax.*
import io.circe.Json
import munit.*
import org.hyperledger.identus.mercury.model.AttachmentDescriptor
import org.hyperledger.identus.mercury.protocol.invitation.*

class InvitationV1Spec extends ZSuite {

  test("out-of-band invitation") {
    val payload = "attachmentData"
    val payloadBase64 = java.util.Base64.getUrlEncoder.encodeToString(payload.getBytes)

    val expectedJson = parse(s"""{
                                |  "@id": "f3375429-b116-4224-b55f-563d7ef461f1",
                                |  "@type": "https://didcomm.org/out-of-band/2.0/invitation",
                                |  "label": "Faber College",
                                |  "goal": "To issue a Faber College Graduate credential",
                                |  "goal_code": "issue-vc",
                                |  "accept": [
                                |    "didcomm/aip2;env=rfc587",
                                |    "didcomm/aip2;env=rfc19"
                                |  ],
                                |  "handshake_protocols": [
                                |    "https://didcomm.org/didexchange/1.0",
                                |    "https://didcomm.org/connections/1.0"
                                |  ],
                                |  "requests~attach": [
                                |    {
                                |      "@id": "request-0",
                                |      "data": {"base64" : "$payloadBase64"}
                                |    }
                                |  ],
                                |  "services": ["did:sov:LjgpST2rjsoxYegQDRm7EL"]
                                |}""".stripMargin).getOrElse(Json.Null)

    val did = Did("did:sov:LjgpST2rjsoxYegQDRm7EL")
    val accepts = Seq("didcomm/aip2;env=rfc587", "didcomm/aip2;env=rfc19")
    val handshakeProtocols = Seq("https://didcomm.org/didexchange/1.0", "https://didcomm.org/connections/1.0")

    val attachmentDescriptor =
      AttachmentDescriptor.buildBase64Attachment(id = "request-0", payload = payload.getBytes())

    val invitation = Invitation(
      `@id` = "f3375429-b116-4224-b55f-563d7ef461f1",
      label = "Faber College",
      goal = "To issue a Faber College Graduate credential",
      goal_code = "issue-vc",
      accept = accepts,
      handshake_protocols = handshakeProtocols,
      `requests~attach` = Seq(attachmentDescriptor),
      services = Seq(did)
    )
    val result = invitation.asJson.deepDropNullValues

    println(result)
    assertEquals(result, expectedJson)
  }
}
