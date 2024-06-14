package org.hyperledger.identus.mercury.protocol.issuecredential

import io.circe.generic.semiauto.*
import io.circe.{Decoder, Encoder}

/** @see
  *   https://github.com/decentralized-identity/waci-didcomm/blob/main/issue_credential/README.md#preview-credential
  *
  * This is not a message but an inner object for other messages in this protocol. It is used construct a preview of the
  * data for the credential that is to be issued. Its schema follows:
  * {{{
  * {
  *   "type": "https://didcomm.org/issue-credential/%VER/credential-credential",
  *   "id": "<uuid of issue message>",
  *   "body": {
  *     "attributes": [
  *       {
  *         "name": "<attribute name>",
  *         "media_type": "<type>",
  *         "value": "<value>"
  *       }
  *       // more attributes
  *     ]
  *   }
  * }
  * }}}
  */
final case class CredentialPreview(
    `type`: String = "https://didcomm.org/issue-credential/3.0/credential-credential",
    schema_id: Option[String] = None,
    body: CredentialPreviewBody,
)

object CredentialPreview {
  def apply(attributes: Seq[Attribute]) = new CredentialPreview(body = CredentialPreviewBody(attributes))
  def apply(schema_id: Option[String], attributes: Seq[Attribute]) =
    new CredentialPreview(schema_id = schema_id, body = CredentialPreviewBody(attributes))

  given Encoder[CredentialPreview] = deriveEncoder[CredentialPreview]
  given Decoder[CredentialPreview] = deriveDecoder[CredentialPreview]
}

case class CredentialPreviewBody(attributes: Seq[Attribute])

object CredentialPreviewBody {
  given Encoder[CredentialPreviewBody] = deriveEncoder[CredentialPreviewBody]
  given Decoder[CredentialPreviewBody] = deriveDecoder[CredentialPreviewBody]
}

/** @param name
  *   name key maps to the attribute name as a string.
  * @param media_type
  *   The optional media_type advises the issuer how to render a binary attribute, to judge its content for
  *   applicability before issuing a credential containing it. Its value parses case-insensitively in keeping with MIME
  *   type semantics of RFC 2045. If media_type is missing, its value is null.
  * @param value
  *   - if media_type is missing (null), then value is a string. In other words, implementations interpret it the same
  *     as any other key+value pair in JSON.
  *   - if media_type is not null, then value is always a base64url-encoded string that represents a binary BLOB, and
  *     media_type tells how to interpret the BLOB after base64url-decoding.
  */
final case class Attribute(
    name: String,
    value: String,
    media_type: Option[String] = None,
)
object Attribute {
  given Encoder[Attribute] = deriveEncoder[Attribute]
  given Decoder[Attribute] = deriveDecoder[Attribute]
}
