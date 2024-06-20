
/*
 *       Calls to Identus / Atala Prism agent / Credentials
 */

const srvIdentusUtils = require("./util_identus_utils");

/*
 *       VC - Offer / Accept / Issue
 */

const async_createVCOffer = async function (objParam) {
    return srvIdentusUtils.async_simplePost("issue-credentials/credential-offers/", objParam.key, {
        "validityPeriod": objParam.validity,
        "schemaId": objParam.location,
        "credentialDefinitionId": objParam.definition,
        "credentialFormat": "JWT",
        "claims": objParam.claims,
        "automaticIssuance": false,
        "issuingDID": objParam.author,
        "connectionId": objParam.connection
    });
}

const async_getAllVCPendingOffers = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("issue-credentials/records/", objParam.key);
}

const async_getVCPendingOffer = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("issue-credentials/records/"+objParam.id, objParam.key);
}

const async_acceptVCOffer = async function (objParam) {
    return srvIdentusUtils.async_simplePost("issue-credentials/records/"+objParam.id+"/accept-offer", objParam.key, {
        subjectId: objParam.did
    })
}

const async_issueVC = async function (objParam) {
    return srvIdentusUtils.async_simplePost("issue-credentials/records/"+objParam.id+"/issue-credential", objParam.key, {
        // todo : put param here
    })
}

/*
 *       VC - Proof / Verification
 */

const async_getAllVCPresentationRequests = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("present-proof/presentations/", objParam.key);
}

const async_getVCPresentationRequestByThid = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("present-proof/presentations?thid="+objParam.thid, objParam.key);
}

const async_createVCPresentationRequest = async function (objParam) {
    return srvIdentusUtils.async_simplePost("present-proof/presentations/", objParam.key, {
        connectionId: objParam.connectionId,
        proofs: [],
        options:{
            challenge: objParam.challenge,
            domain: objParam.domain
        },
        credentialFormat: "JWT"
    });
}

// from holder point of view
const async_acceptVCPresentation = async function (objParam) {
    // patching presentation
    return srvIdentusUtils.async_simplePatch("present-proof/presentations/"+objParam.id, objParam.key, {
        action: "request-accept",
        proofId: [objParam.proofId]
    });
}

// from verifier point of view
const async_getVCProof = async function (objParam) {
    // patching presentation
    return srvIdentusUtils.async_simplePatch("present-proof/presentations/"+objParam.id, objParam.key, {
        action: "presentation-accept"
    });
}


module.exports = {
    async_createVCOffer,
    async_getAllVCPendingOffers,
    async_getVCPendingOffer,
    async_acceptVCOffer,
    async_issueVC,

    async_createVCPresentationRequest,
    async_getAllVCPresentationRequests,
    async_getVCPresentationRequestByThid,
    async_acceptVCPresentation,
    async_getVCProof
}