package org.hyperledger.identus.mercury.protocol.outofbandlogin

import java.net.URL
import org.hyperledger.identus.mercury

object Utils {

  /** provides new msg id
    * @return
    */
  def getNewMsgId: String = java.util.UUID.randomUUID().toString

  def parseLink(url: String): Option[String] = parseLink(new URL(url))
  def parseLink(url: URL): Option[String] = (url.getQuery() match {
    case str if str.startsWith("_oob=") => Some(str.drop(5))
    case _                              => None
  }).map { e =>
    val decoder = java.util.Base64.getUrlDecoder()
    String(decoder.decode(e))
  }

  // def parseInvitation(url: String): Option[OutOfBandLoginInvitation] = {
  //   parseLink(url).map(e => parse(e).getOrElse(???).as[OutOfBandLoginInvitation].getOrElse(???))
  // }

}
