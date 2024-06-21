
/*
 *       Calls to Identus / Atala Prism agent / Proofs
 */

const srvIdentusUtils = require("./util_identus_utils");

/*
 *       VC - Proof / Verification
 */

const async_getAllVCPresentationRequests = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("present-proof/presentations"+(objParam.thid? "?thid="+objParam.thid: ""), objParam.key);
}

const async_createVCPresentationRequest = async function (objParam) {
    try {
        let data= await  srvIdentusUtils.async_simplePost("present-proof/presentations/", objParam.key, {
            connectionId: objParam.connection,
            proofs: [],
            options:{
                challenge: objParam.challenge,
                domain: objParam.domain
            },
            credentialFormat: "JWT"
        });

        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await new Promise(resolve => setTimeout(resolve, 2000));        // wait for 2sec
        return data;
    }
    catch(err) {throw err}
}

// from holder point of view
const async_acceptVCPresentation = async function (objParam) {
    // patching presentation
    try {
        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await new Promise(resolve => setTimeout(resolve, 8000));        // wait for 4sec

        let data= await srvIdentusUtils.async_simplePatch("present-proof/presentations/"+objParam.presentationId, objParam.key, {
            action: "request-accept",
            proofId: [objParam.recordId]
        });

        return data;
    }
    catch(err) {throw err}
}

// from verifier point of view
const async_getVCProof = async function (objParam) {
    // patching presentation
    try {
        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await new Promise(resolve => setTimeout(resolve, 8000));        // wait for 4sec

        let data= await srvIdentusUtils.async_simplePatch("present-proof/presentations/"+objParam.presentationId, objParam.key, {
            action: "presentation-accept"
        });

        return data;
    }
    catch(err) {throw err}
}


module.exports = {
    async_createVCPresentationRequest,
    async_getAllVCPresentationRequests,
    async_acceptVCPresentation,
    async_getVCProof
}