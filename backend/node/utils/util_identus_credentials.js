
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
            "validityPeriod": 3600,
            "schemaId": objParam.schemaLocation,
            "credentialDefinitionId": "620d3402-b1ca-474e-a1b9-1ad81e07dfee",
            "credentialFormat": "JWT",
            "claims": {
                "uid": "99999",
                "name": "Stable Diffusion SDXL",
                "model": "sd_xl_refiner_1.0.safetensors",
                "repo": "https://github.com/Stability-AI/generative-models",
                "location": "https://yahoo-pensions-concerns-quantum.trycloudflare.com/",
                "gpu": "RTX 3090"
            },
            "automaticIssuance": false,
            "issuingDID": "did:prism:a91d1b1b53eb65b15202261c8b821b5e3a94a394050eaf7056d4d6e35e0b7267",
            "connectionId": "6d9022b7-9000-4ba4-ac3c-5fdb2d81d1ec"
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