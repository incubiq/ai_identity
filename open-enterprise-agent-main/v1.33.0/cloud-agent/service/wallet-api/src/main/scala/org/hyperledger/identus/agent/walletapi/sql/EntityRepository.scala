package org.hyperledger.identus.agent.walletapi.sql

import io.getquill.*
import io.getquill.doobie.DoobieContext
import io.getquill.idiom.*
import org.hyperledger.identus.agent.walletapi.model.Entity
import org.hyperledger.identus.agent.walletapi.model.error.EntityServiceError
import zio.{IO, ZIO}

import java.time.Instant
import java.util.UUID

trait EntityRepository {
  def insert(entity: Entity): IO[EntityServiceError, Entity]
  def getById(id: UUID): IO[EntityServiceError, Entity]
  def updateName(entityId: UUID, name: String): IO[EntityServiceError, Unit]
  def updateWallet(entityId: UUID, walletId: UUID): IO[EntityServiceError, Unit]
  def delete(id: UUID): IO[EntityServiceError, Unit]
  def getAll(offset: Int, limit: Int): IO[EntityServiceError, List[Entity]]
}

object EntityRepository {
  def insert(entity: Entity): ZIO[EntityRepository, EntityServiceError, Entity] = {
    for {
      repository <- ZIO.service[EntityRepository]
      insertedEntity <- repository.insert(entity)
    } yield insertedEntity
  }

  def getById(id: UUID): ZIO[EntityRepository, EntityServiceError, Entity] = {
    for {
      repository <- ZIO.service[EntityRepository]
      entity <- repository.getById(id)
    } yield entity
  }

  def updateName(entityId: UUID, name: String): ZIO[EntityRepository, EntityServiceError, Unit] = {
    for {
      repository <- ZIO.service[EntityRepository]
      _ <- repository.updateName(entityId, name)
    } yield ()
  }

  def updateWallet(entityId: UUID, walletId: UUID): ZIO[EntityRepository, EntityServiceError, Unit] = {
    for {
      repository <- ZIO.service[EntityRepository]
      _ <- repository.updateWallet(entityId, walletId)
    } yield ()
  }

  def delete(id: UUID): ZIO[EntityRepository, EntityServiceError, Unit] = {
    for {
      repository <- ZIO.service[EntityRepository]
      _ <- repository.delete(id)
    } yield ()
  }

  def getAll(skip: Int, take: Int): ZIO[EntityRepository, EntityServiceError, List[Entity]] = {
    for {
      repository <- ZIO.service[EntityRepository]
      entities <- repository.getAll(skip, take)
    } yield entities
  }
}

object EntityStorageSql extends DoobieContext.Postgres(SnakeCase) {
  import scala.language.implicitConversions

  object db {
    case class Entity(id: UUID, name: String, walletId: UUID, createdAt: Instant, updatedAt: Instant)
  }

  val model2db: Conversion[Entity, db.Entity] = (entity: Entity) =>
    db.Entity(entity.id, entity.name, entity.walletId, entity.createdAt, entity.updatedAt)

  val db2model: Conversion[db.Entity, Entity] = (entity: db.Entity) =>
    Entity(entity.id, entity.name, entity.walletId, entity.createdAt, entity.updatedAt)

  def insert(entity: db.Entity) = run {
    quote(
      query[db.Entity]
        .insertValue(lift(entity))
        .returning(e => e)
    )
  }

  def getById(entityId: UUID) = run {
    quote(
      query[db.Entity]
        .filter(_.id == lift(entityId))
    )
  }

  def updateName(entityId: UUID, name: String) = run {
    quote(
      query[db.Entity]
        .filter(_.id == lift(entityId))
        .update(_.name -> lift(name), _.updatedAt -> lift(Instant.now()))
    )
  }

  def updateWallet(entityId: UUID, walletId: UUID) = run {
    quote(
      query[db.Entity]
        .filter(_.id == lift(entityId))
        .update(_.walletId -> lift(walletId), _.updatedAt -> lift(Instant.now()))
    )
  }

  def delete(entityId: UUID) = run {
    quote(
      query[db.Entity]
        .filter(_.id == lift(entityId))
        .delete
    )
  }

  def getAll(skip: Int, take: Int) = run {
    quote(
      query[db.Entity]
        .drop(lift(skip))
        .take(lift(take))
    )
  }
}
