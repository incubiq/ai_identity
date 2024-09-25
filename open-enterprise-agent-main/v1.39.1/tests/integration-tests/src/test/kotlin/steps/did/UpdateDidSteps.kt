package steps.did

import interactions.Get
import interactions.Post
import interactions.body
import io.cucumber.java.en.Then
import io.cucumber.java.en.When
import io.iohk.atala.automation.extensions.get
import io.iohk.atala.automation.serenity.ensure.Ensure
import io.iohk.atala.automation.serenity.interactions.PollingWait
import net.serenitybdd.rest.SerenityRest
import net.serenitybdd.screenplay.Actor
import net.serenitybdd.screenplay.Question
import org.apache.http.HttpStatus
import org.hamcrest.CoreMatchers.equalTo
import org.hyperledger.identus.client.models.*
import java.util.UUID

class UpdateDidSteps {

    @When("{actor} updates PRISM DID by adding new key with {curve} curve and {purpose} purpose")
    fun actorUpdatesPrismDidByAddingNewKeys(actor: Actor, curve: Curve, purpose: Purpose) {
        val newDidKeyId = UUID.randomUUID().toString()
        val updatePrismDidAction = UpdateManagedDIDRequestAction(
            actionType = ActionType.ADD_KEY,
            addKey = ManagedDIDKeyTemplate(
                id = newDidKeyId,
                purpose = purpose,
                curve = curve,
            ),
        )
        actor.remember("newDidKeyId", newDidKeyId)
        actorSubmitsPrismDidUpdateOperation(actor, updatePrismDidAction)
    }

    @When("{actor} updates PRISM DID by removing keys")
    fun actorUpdatesPrismDidByRemovingKeys(actor: Actor) {
        val didKeyId = actor.recall<String>("newDidKeyId")
        val updatePrismDidAction = UpdateManagedDIDRequestAction(
            actionType = ActionType.REMOVE_KEY,
            removeKey = RemoveEntryById(didKeyId),
        )
        actorSubmitsPrismDidUpdateOperation(actor, updatePrismDidAction)
    }

    @When("{actor} updates PRISM DID with new services")
    fun actorUpdatesPrismDidWithNewServices(actor: Actor) {
        val serviceId = UUID.randomUUID().toString()
        val updatePrismDidAction = UpdateManagedDIDRequestAction(
            actionType = ActionType.ADD_SERVICE,
            addService = Service(
                id = serviceId,
                type = listOf("LinkedDomains"),
                serviceEndpoint = Json("https://service.com/"),
            ),
        )
        actor.remember("newServiceId", serviceId)
        actorSubmitsPrismDidUpdateOperation(actor, updatePrismDidAction)
    }

    @When("{actor} updates PRISM DID by removing services")
    fun actorUpdatesPrismDidByRemovingServices(actor: Actor) {
        val serviceId = actor.recall<String>("newServiceId")
        val updatePrismDidAction = UpdateManagedDIDRequestAction(
            actionType = ActionType.REMOVE_SERVICE,
            removeService = RemoveEntryById(serviceId),
        )
        actorSubmitsPrismDidUpdateOperation(actor, updatePrismDidAction)
    }

    @When("{actor} updates PRISM DID by updating services")
    fun actorUpdatesPrismDidByUpdatingServices(actor: Actor) {
        val serviceId = actor.recall<String>("newServiceId")
        val newServiceUrl = "https://update.com"
        val updatePrismDidAction = UpdateManagedDIDRequestAction(
            actionType = ActionType.UPDATE_SERVICE,
            updateService = UpdateManagedDIDServiceAction(
                id = serviceId,
                type = listOf("LinkedDomains"),
                serviceEndpoint = Json(newServiceUrl),
            ),
        )

        actor.remember("newServiceUrl", newServiceUrl)
        actorSubmitsPrismDidUpdateOperation(actor, updatePrismDidAction)
    }

    @Then("{actor} sees PRISM DID was successfully updated with new keys of {purpose} purpose")
    fun actorSeesDidSuccessfullyUpdatedWithNewKeys(actor: Actor, purpose: Purpose) {
        val newDidKeyId = actor.recall<String>("newDidKeyId")

        actor.attemptsTo(
            PollingWait.until(
                Question.about("did update").answeredBy {
                    actor.attemptsTo(
                        Get.resource("/dids/${actor.recall<String>("shortFormDid")}"),
                    )
                    val didKey = "${actor.recall<String>("shortFormDid")}#$newDidKeyId"
                    val didDocument = SerenityRest.lastResponse().get<DIDResolutionResult>().didDocument!!
                    val foundVerificationMethod = didDocument.verificationMethod!!.map { it.id }.any { it == didKey }

                    foundVerificationMethod && when (purpose) {
                        Purpose.ASSERTION_METHOD -> didDocument.assertionMethod!!.any { it == didKey }
                        Purpose.AUTHENTICATION -> didDocument.authentication!!.any { it == didKey }
                        Purpose.CAPABILITY_DELEGATION -> didDocument.capabilityDelegation!!.any { it == didKey }
                        Purpose.CAPABILITY_INVOCATION -> didDocument.capabilityInvocation!!.any { it == didKey }
                        Purpose.KEY_AGREEMENT -> didDocument.keyAgreement!!.any { it == didKey }
                    }
                },
                equalTo(true),
            ),
        )
    }

    @Then("{actor} sees PRISM DID was successfully updated and keys removed with {purpose} purpose")
    fun actorSeesDidSuccessfullyUpdatedAndKeysRemoved(actor: Actor, purpose: Purpose) {
        val newDidKeyId = actor.recall<String>("newDidKeyId")

        actor.attemptsTo(
            PollingWait.until(
                Question.about("did update").answeredBy {
                    actor.attemptsTo(
                        Get.resource("/dids/${actor.recall<String>("shortFormDid")}"),
                    )
                    val didKey = "${actor.recall<String>("shortFormDid")}#$newDidKeyId"
                    val didDocument = SerenityRest.lastResponse().get<DIDResolutionResult>().didDocument!!
                    val verificationMethodNotPresent = didDocument.verificationMethod!!.map { it.id }.none { it == didKey }

                    verificationMethodNotPresent && when (purpose) {
                        Purpose.ASSERTION_METHOD -> didDocument.assertionMethod!!.none { it == didKey }
                        Purpose.AUTHENTICATION -> didDocument.authentication!!.none { it == didKey }
                        Purpose.CAPABILITY_DELEGATION -> didDocument.capabilityDelegation!!.none { it == didKey }
                        Purpose.CAPABILITY_INVOCATION -> didDocument.capabilityInvocation!!.none { it == didKey }
                        Purpose.KEY_AGREEMENT -> didDocument.keyAgreement!!.none { it == didKey }
                    }
                },
                equalTo(true),
            ),
        )
    }

    @Then("{actor} sees that PRISM DID should have the new service")
    fun actorSeesDidSuccessfullyUpdatedWithNewServices(actor: Actor) {
        val serviceId = actor.recall<String>("newServiceId")
        actor.attemptsTo(
            PollingWait.until(
                Question.about("did update").answeredBy {
                    actor.attemptsTo(
                        Get.resource("/dids/${actor.recall<String>("shortFormDid")}"),
                    )
                    val serviceIds =
                        SerenityRest.lastResponse().get<DIDResolutionResult>().didDocument!!.service!!.map { it.id }
                    serviceIds.any {
                        it == "${actor.recall<String>("shortFormDid")}#$serviceId"
                    }
                },
                equalTo(true),
            ),
        )
    }

    @Then("{actor} sees the PRISM DID should have the service removed")
    fun actorSeesDidSuccessfullyUpdatedByRemovingServices(actor: Actor) {
        val serviceId = actor.recall<String>("newServiceId")
        actor.attemptsTo(
            PollingWait.until(
                Question.about("did update").answeredBy {
                    actor.attemptsTo(
                        Get.resource("/dids/${actor.recall<String>("shortFormDid")}"),
                    )
                    val serviceIds =
                        SerenityRest.lastResponse().get<DIDResolutionResult>().didDocument!!.service!!.map { it.id }
                    serviceIds.none {
                        it == "${actor.recall<String>("shortFormDid")}#$serviceId"
                    }
                },
                equalTo(true),
            ),
        )
    }

    @Then("{actor} sees the PRISM DID should have the service updated")
    fun actorSeesDidSuccessfullyUpdatedByUpdatingServices(actor: Actor) {
        val serviceUrl = actor.recall<String>("newServiceUrl")
        actor.attemptsTo(
            PollingWait.until(
                Question.about("did update").answeredBy {
                    actor.attemptsTo(
                        Get.resource("/dids/${actor.recall<String>("shortFormDid")}"),
                    )
                    val service = SerenityRest.lastResponse().get<DIDResolutionResult>().didDocument!!.service!!
                    service.any { it.serviceEndpoint.value.contains(serviceUrl) }
                },
                equalTo(true),
            ),
        )
    }

    private fun actorSubmitsPrismDidUpdateOperation(actor: Actor, updatePrismDidAction: UpdateManagedDIDRequestAction) {
        actor.attemptsTo(
            Post.to("/did-registrar/dids/${actor.recall<String>("shortFormDid")}/updates")
                .body(UpdateManagedDIDRequest(listOf(updatePrismDidAction))),
        )
    }

    @Then("{actor} sees the PRISM DID should have been updated successfully")
    fun checkIfUpdateWasSuccessful(actor: Actor) {
        val didOperationResponse = SerenityRest.lastResponse().get<DIDOperationResponse>()
        actor.attemptsTo(
            Ensure.thatTheLastResponse().statusCode().isEqualTo(HttpStatus.SC_ACCEPTED),
            Ensure.that(didOperationResponse.scheduledOperation.didRef).isNotEmpty(),
            Ensure.that(didOperationResponse.scheduledOperation.id).isNotEmpty(),
        )
    }

    @Then("{actor} sees the PRISM DID was not successfully updated")
    fun checkIfUpdateWasNotSuccessful(actor: Actor) {
        val detail: String = SerenityRest.lastResponse().get("detail")
        actor.attemptsTo(
            Ensure.thatTheLastResponse().statusCode().isEqualTo(HttpStatus.SC_BAD_REQUEST),
            Ensure.that(detail)
                .contains(
                    "Ed25519 must be used in [Authentication, AssertionMethod]. X25519 must be used in [KeyAgreement]",
                ),
        )
    }
}
