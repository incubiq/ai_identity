package steps

import abilities.ListenToEvents
import com.nimbusds.jose.crypto.bc.BouncyCastleProviderSingleton
import com.sksamuel.hoplite.ConfigException
import com.sksamuel.hoplite.ConfigLoader
import common.TestConstants
import config.*
import io.cucumber.java.AfterAll
import io.cucumber.java.BeforeAll
import io.ktor.server.util.url
import io.restassured.RestAssured
import io.restassured.builder.RequestSpecBuilder
import net.serenitybdd.screenplay.Actor
import net.serenitybdd.screenplay.actors.Cast
import net.serenitybdd.screenplay.actors.OnStage
import net.serenitybdd.screenplay.rest.abilities.CallAnApi
import org.apache.http.HttpStatus
import org.hyperledger.identus.client.models.CreateWalletRequest
import org.hyperledger.identus.client.models.CreateWebhookNotification
import java.security.Security
import java.util.UUID

object Setup {
    private val config: Config

    init {
        try {
            config = ConfigLoader().loadConfigOrThrow<Config>(TestConstants.TESTS_CONFIG)
        } catch (e: Exception) {
            throw RuntimeException(e)
        }
    }

    /**
     * This function starts all services and actors before all tests.
     */
    fun initServices() {
        config.services?.keycloak?.setUsers(config.roles)?.start()
        config.services?.keycloakOid4vci?.setUsers(config.roles.filter { it.name == "Holder" })?.start()
        config.services?.prismNode?.start()
        config.services?.vault?.start()
        config.agents?.forEach {
            it.start()
        }
    }

    /**
     * This function initializes all actors and sets the stage.
     */
    fun initActors() {
        /**
         * This function initializes a wallet for an actor when Keycloak is used.
         *
         * @param actor The actor for which the wallet should be initialized.
         */
        fun initializeWallet(actor: Actor) {
            RestAssured
                .given()
                .baseUri(actor.usingAbilityTo(CallAnApi::class.java).resolve("/"))
                .auth().oauth2(actor.recall("BEARER_TOKEN"))
                .body(
                    CreateWalletRequest(
                        name = UUID.randomUUID().toString(),
                    ),
                )
                .post("/wallets")
                .then().statusCode(HttpStatus.SC_CREATED)
        }

        /**
         * This function registers a webhook for an actor.
         *
         * @param actor The actor for which the webhook should be registered.
         * @param webhookUrl The url of the webhook.
         */
        fun registerWebhook(actor: Actor, webhookUrl: String) {
            val spec = RequestSpecBuilder()
                .setBaseUri(actor.usingAbilityTo(CallAnApi::class.java).resolve("/"))
            if (actor.recall<String>("AUTH_KEY") != null) {
                spec.addHeader(actor.recall("AUTH_HEADER"), actor.recall("AUTH_KEY"))
            }
            if (actor.recall<String>("BEARER_TOKEN") != null) {
                spec.addHeader("Authorization", "Bearer ${actor.recall<String>("BEARER_TOKEN")}")
            }
            val response = RestAssured
                .given().spec(spec.build())
                .body(CreateWebhookNotification(url = webhookUrl))
                .post("/events/webhooks")
                .thenReturn()
            response.then().statusCode(HttpStatus.SC_OK)
            actor.remember("WEBHOOK_ID", response.body.jsonPath().getString("id"))
        }

        val cast = Cast()
        config.roles.forEach { role ->
            cast.actorNamed(
                role.name,
                CallAnApi.at(role.url.toExternalForm()),
            )
        }
        if (config.services?.keycloak != null) {
            config.roles.forEach { role ->
                val actor = cast.actorNamed(role.name)
                try {
                    actor.remember(
                        "BEARER_TOKEN",
                        config.services.keycloak.getKeycloakAuthToken(actor.name, actor.name),
                    )
                } catch (e: NullPointerException) {
                    throw ConfigException("Keycloak is configured, but no token found for user ${actor.name}!")
                }
                if (role.agentRole != AgentRole.Admin) {
                    initializeWallet(actor)
                }
            }
        }
        config.roles.forEach { role ->
            val actor = cast.actorNamed(role.name)
            if (role.apikey != null) {
                actor.remember("AUTH_KEY", role.apikey)
                actor.remember("AUTH_HEADER", role.authHeader)
            }
            if (role.token != null) {
                actor.remember("BEARER_TOKEN", role.token)
            }
            if (role.webhook != null) {
                actor.whoCan(ListenToEvents.at(role.webhook.url, role.webhook.localPort))
                actor.remember("webhookUrl", role.webhook.url)
                if (role.webhook.initRequired) {
                    registerWebhook(actor, role.webhook.url.toExternalForm())
                }
            }
            actor.remember("baseUrl", role.url.toExternalForm())
        }
        if (config.services?.keycloakOid4vci != null) {
            val issuerRole = config.roles.find { it.name == "Issuer" } ?: throw ConfigException("Issuer role does not exist")
            val issuerActor = cast.actorNamed(issuerRole.name)
            with(issuerActor) {
                val url = issuerRole.oid4vciAuthServer ?: throw ConfigException("Issuer's oid4vci_auth_server must be provided")
                remember("OID4VCI_AUTH_SERVER_URL", url.toExternalForm())
                remember("OID4VCI_AUTH_SERVER_CLIENT_ID", config.services.keycloakOid4vci.clientId)
                remember("OID4VCI_AUTH_SERVER_CLIENT_SECRET", config.services.keycloakOid4vci.clientSecret)
            }

            val holderRole = config.roles.find { it.name == "Holder" } ?: throw ConfigException("Holder role does not exist")
            val holderActor = cast.actorNamed(holderRole.name)
            holderActor.remember("OID4VCI_AUTH_SERVER_CLIENT_ID", "holder")
        }
        OnStage.setTheStage(cast)
    }

    /**
     * This function destroys all actors and clears the stage.
     */
    fun stopActors() {
        /**
         * This function deletes a webhook for an actor.
         *
         * @param actor The actor for which the webhook should be deleted.
         */
        fun deleteWebhook(actor: Actor) {
            val spec = RequestSpecBuilder()
                .setBaseUri(actor.usingAbilityTo(CallAnApi::class.java).resolve("/"))
            if (actor.recall<String>("AUTH_KEY") != null) {
                spec.addHeader(actor.recall("AUTH_HEADER"), actor.recall("AUTH_KEY"))
            }
            if (actor.recall<String>("BEARER_TOKEN") != null) {
                spec.addHeader("Authorization", "Bearer ${actor.recall<String>("BEARER_TOKEN")}")
            }
            RestAssured
                .given().spec(spec.build())
                .delete("/events/webhooks/${actor.recall<String>("WEBHOOK_ID")}")
                .then().statusCode(HttpStatus.SC_OK)
        }

        // Delete webhooks
        config.roles.forEach { role ->
            val actor = OnStage.theActorCalled(role.name)
            if (role.webhook != null && role.webhook.initRequired) {
                deleteWebhook(actor)
            }
        }
        OnStage.drawTheCurtain()
    }

    /**
     * Stop all the created services, unless they are set to keep running.
     */
    fun stopServices() {
        config.agents?.forEach { agent ->
            agent.stop()
        }
        config.services?.keycloak?.stop()
        config.services?.prismNode?.stop()
        config.services?.vault?.stop()
    }
}

@BeforeAll
fun init() {
    Security.insertProviderAt(BouncyCastleProviderSingleton.getInstance(), 2)
    Setup.initServices()
    Setup.initActors()
}

@AfterAll
fun clearStage() {
    Setup.stopActors()
    Setup.stopServices()
}
