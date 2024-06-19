
/*
 *       Calls to Identus / Atala Prism agent / Credentials
 */

const srvIdentusUtils = require("./util_identus_utils");
const axios = require('axios').default;


/*
 *       VC - Offer / Accept / Issue
 */

const async_createVCOffer = async function (objParam) {
    try {   
    
        let _jsonVCOffer = {
            "validityPeriod": objParam.validity,
            "schemaId": objParam.location,
            "credentialDefinitionId": objParam.definition,
            "credentialFormat": "JWT",
            "claims": objParam.claims,
            "automaticIssuance": false,
            "issuingDID": objParam.author,
            "connectionId": objParam.connection
        }
        let responseVC = await axios.post(srvIdentusUtils.getIdentusAgent()+ "issue-credentials/credential-offers",  _jsonVCOffer, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseVC.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_getAllVCPendingOffers = async function (objParam) {
    try {   

        let response = await axios.get(srvIdentusUtils.getIdentusAgent()+ "issue-credentials/records", {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: response.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_getVCPendingOffer = async function (objParam) {
    try {   

        let response = await axios.get(srvIdentusUtils.getIdentusAgent()+ "issue-credentials/records/"+objParam.id, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: response.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_acceptVCOffer = async function (objParam) {
    try {   

        let responseSchema = await axios.post(srvIdentusUtils.getIdentusAgent()+ "issue-credentials/records/"+objParam.id+"/accept-offer",  {
            subjectId: objParam.did
        }, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseSchema.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_issueVC = async function (objParam) {
    try {   

        let responseSchema = await axios.post(srvIdentusUtils.getIdentusAgent()+ "issue-credentials/records/"+objParam.id+"/issue-credential",  _jsonVCOffer, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseSchema.data
        }
    }
    catch(err)  {
        throw err;
    }
}

/*
 *       VC - Proof / Verification
 */

const async_getAllVCPresentationRequests = async function (objParam) {
    try {   

        let response = await axios.get(srvIdentusUtils.getIdentusAgent()+ "present-proof/presentations", {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: response.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_getVCPresentationRequestByThid = async function (objParam) {
    try {   

        let response = await axios.get(srvIdentusUtils.getIdentusAgent()+ "present-proof/presentations?thid="+objParam.thid, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: response.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_createVCPresentationRequest = async function (objParam) {
    try {   

        let response = await axios.post(srvIdentusUtils.getIdentusAgent()+ "present-proof/presentations/", {
            connectionId: objParam.connectionId,
            proofs: [],
            options:{
                challenge: objParam.challenge,
                domain: objParam.domain
            },
            credentialFormat: "JWT"
        }, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: response.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// from holder point of view
const async_acceptVCPresentation = async function (objParam) {
    try {   

        // patching presentation
        let response = await axios.patch(srvIdentusUtils.getIdentusAgent()+ "present-proof/presentations/"+objParam.id, {
            action: "request-accept",
            proofId: [objParam.proofId]
        }, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: response.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// from verifier point of view
const async_getVCProof = async function (objParam) {
    try {   

        // patching presentation
        let response = await axios.patch(srvIdentusUtils.getIdentusAgent()+ "present-proof/presentations/"+objParam.id, {
            action: "presentation-accept"
        }, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: response.data
        }
    }
    catch(err)  {
        throw err;
    }
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