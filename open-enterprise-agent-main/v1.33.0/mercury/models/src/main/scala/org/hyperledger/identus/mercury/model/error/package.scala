package org.hyperledger.identus.mercury

import java.io.IOException

package object error {

  type MercuryException = MercuryError | IOException
  type MercuryThrowable = MercuryError | IOException | Throwable // REMOVE Throwable

  def mercuryErrorAsThrowable(error: MercuryThrowable): java.lang.Throwable = error match
    // case ex: MercuryError =>
    //   ex match
    //     case te: TransportError => new RuntimeException(te)
    case ex: IOException => ex
    case ex: Throwable   => ex

  sealed trait MercuryError

  trait TransportError extends Exception with MercuryError

  case class SendMessageError(cause: Throwable, mData: Option[String] = None)
      extends RuntimeException(
        s"Error when sending message: ${cause.getMessage};${mData.map(e => s" DATA:'$e'").getOrElse("")}",
        cause
      )
      with TransportError

  case class ParseResponse(cause: Throwable)
      extends RuntimeException(s"Error when sending message: ${cause.getMessage}", cause)
      with TransportError
}
