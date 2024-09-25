
/*
 *       Calls to Identus / Atala Prism agent / Credentials
 */

const srvIdentusUtils = require("./util_identus_utils");

/*
 *       VC - Offer / Accept / Issue
 */

const async_createVCOfferWithoutSchema = async function (objParam) {
    return srvIdentusUtils.async_simplePost("issue-credentials/credential-offers/", objParam.key, {
        "validityPeriod": objParam.validity,
        "schemaId": null,
//        "schemaId": objParam.location,
//        "credentialDefinitionId": objParam.definition,
        "credentialFormat": "JWT",
        "claims": objParam.claims,
        "automaticIssuance": false,
        "issuingDID": objParam.author,
        "connectionId": objParam.connection
    });
}

// get all offers issued by this peer (can be pending, accpted, issued...)
const async_getAllVCOffers = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("issue-credentials/records"+(objParam.thid? "?thid="+objParam.thid: ""), objParam.key);
}

// get a specific offer issued by this peer (can be pending, accpted, issued...)
const async_getVCOffer = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("issue-credentials/records/"+objParam.recordId, objParam.key);
}

const async_acceptVCOffer = async function (objParam) {
    return srvIdentusUtils.async_simplePost("issue-credentials/records/"+objParam.recordId+"/accept-offer", objParam.key, {
        subjectId: objParam.did
    })
}

const async_issueVC = async function (objParam) {
    return srvIdentusUtils.async_simplePost("issue-credentials/records/"+objParam.recordId+"/issue-credential", objParam.key, {
        // todo : put param here
    })
}

module.exports = {
    async_createVCOfferWithoutSchema,
    async_getAllVCOffers,
    async_getVCOffer,
    async_acceptVCOffer,
    async_issueVC
}