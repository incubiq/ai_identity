package org.hyperledger.identus.shared.crypto

import org.hyperledger.identus.shared.models.HexString
import org.bouncycastle.jce.ECNamedCurveTable
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.jce.spec.ECNamedCurveSpec
import zio.*

import java.security.KeyFactory
import java.security.spec.{ECPrivateKeySpec, ECPublicKeySpec}
import scala.util.Try

trait Apollo {
  def secp256k1: Secp256k1KeyOps
  def ed25519: Ed25519KeyOps
  def x25519: X25519KeyOps
}

object Apollo {
  def layer: ULayer[Apollo] = ZLayer.succeed(default)

  def default: Apollo = new {
    override def secp256k1: Secp256k1KeyOps = KmpSecp256k1KeyOps
    override def ed25519: Ed25519KeyOps = KmpEd25519KeyOps
    override def x25519: X25519KeyOps = KmpX25519KeyOps
  }
}

trait Encodable {
  def getEncoded: Array[Byte]
}

trait Signable {
  def sign(data: Array[Byte]): Array[Byte]
}

trait Verifiable {
  def verify(data: Array[Byte], signature: Array[Byte]): Try[Unit]
}

trait PublicKey extends Encodable
trait PrivateKey extends Encodable {
  type Pub <: PublicKey
  def toPublicKey: Pub
  override final def toString(): String = "<REDACTED>"
}

enum DerivationPath {
  case Normal(i: Int) extends DerivationPath
  case Hardened(i: Int) extends DerivationPath
}

final case class ECPoint(x: Array[Byte], y: Array[Byte])

// secp256k1
final case class Secp256k1KeyPair(publicKey: Secp256k1PublicKey, privateKey: Secp256k1PrivateKey)
trait Secp256k1PublicKey extends PublicKey, Verifiable {
  def getEncodedCompressed: Array[Byte]

  def getEncodedUncompressed: Array[Byte]

  def getECPoint: ECPoint

  override final def hashCode(): Int = HexString.fromByteArray(getEncoded).hashCode()

  override final def equals(x: Any): Boolean = x match {
    case otherPK: Secp256k1PublicKey =>
      HexString.fromByteArray(this.getEncoded) == HexString.fromByteArray(otherPK.getEncoded)
    case _ => false
  }

  def toJavaPublicKey: java.security.interfaces.ECPublicKey = {
    val point = getECPoint
    val x = BigInt(1, point.x)
    val y = BigInt(1, point.y)
    val keyFactory = KeyFactory.getInstance("EC", new BouncyCastleProvider())
    val ecParameterSpec = ECNamedCurveTable.getParameterSpec("secp256k1")
    val ecNamedCurveSpec = ECNamedCurveSpec(
      ecParameterSpec.getName(),
      ecParameterSpec.getCurve(),
      ecParameterSpec.getG(),
      ecParameterSpec.getN()
    )
    val ecPublicKeySpec = ECPublicKeySpec(java.security.spec.ECPoint(x.bigInteger, y.bigInteger), ecNamedCurveSpec)
    keyFactory.generatePublic(ecPublicKeySpec).asInstanceOf[java.security.interfaces.ECPublicKey]
  }
}
trait Secp256k1PrivateKey extends PrivateKey, Signable {
  type Pub = Secp256k1PublicKey

  override final def hashCode(): Int = HexString.fromByteArray(getEncoded).hashCode()

  override final def equals(x: Any): Boolean = x match {
    case otherPK: Secp256k1PrivateKey =>
      HexString.fromByteArray(this.getEncoded) == HexString.fromByteArray(otherPK.getEncoded)
    case _ => false
  }

  def toJavaPrivateKey: java.security.interfaces.ECPrivateKey = {
    val bytes = getEncoded
    val keyFactory = KeyFactory.getInstance("EC", new BouncyCastleProvider())
    val ecParameterSpec = ECNamedCurveTable.getParameterSpec("secp256k1")
    val ecNamedCurveSpec = ECNamedCurveSpec(
      ecParameterSpec.getName(),
      ecParameterSpec.getCurve(),
      ecParameterSpec.getG(),
      ecParameterSpec.getN()
    )
    val ecPrivateKeySpec = ECPrivateKeySpec(java.math.BigInteger(1, bytes), ecNamedCurveSpec)
    keyFactory.generatePrivate(ecPrivateKeySpec).asInstanceOf[java.security.interfaces.ECPrivateKey]
  }
}
trait Secp256k1KeyOps {
  def publicKeyFromEncoded(bytes: Array[Byte]): Try[Secp256k1PublicKey]
  def publicKeyFromCoordinate(x: Array[Byte], y: Array[Byte]): Try[Secp256k1PublicKey]
  def privateKeyFromEncoded(bytes: Array[Byte]): Try[Secp256k1PrivateKey]
  def generateKeyPair: Secp256k1KeyPair
  def randomBip32Seed: UIO[(Array[Byte], Seq[String])]
  def deriveKeyPair(seed: Array[Byte])(path: DerivationPath*): UIO[Secp256k1KeyPair]
}

// ed25519
final case class Ed25519KeyPair(publicKey: Ed25519PublicKey, privateKey: Ed25519PrivateKey)
trait Ed25519PublicKey extends PublicKey, Verifiable
trait Ed25519PrivateKey extends PrivateKey, Signable {
  type Pub = Ed25519PublicKey
}
trait Ed25519KeyOps {
  def publicKeyFromEncoded(bytes: Array[Byte]): Try[Ed25519PublicKey]
  def privateKeyFromEncoded(bytes: Array[Byte]): Try[Ed25519PrivateKey]
  def generateKeyPair: Ed25519KeyPair
}

// x25519
final case class X25519KeyPair(publicKey: X25519PublicKey, privateKey: X25519PrivateKey)
trait X25519PublicKey extends PublicKey
trait X25519PrivateKey extends PrivateKey {
  type Pub = X25519PublicKey
}
trait X25519KeyOps {
  def publicKeyFromEncoded(bytes: Array[Byte]): Try[X25519PublicKey]
  def privateKeyFromEncoded(bytes: Array[Byte]): Try[X25519PrivateKey]
  def generateKeyPair: X25519KeyPair
}
