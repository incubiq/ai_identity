
/*
 *       Calls to Identus / Atala Prism agent / Proofs
 */

const srvIdentusUtils = require("./util_identus_utils");
const jwtDecode = require('jwt-decode');
const { consoleLog } = require("./util_services");

/*
 *       VC - Proof / Verification
 */

const async_getAllVCPresentationRequests = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("present-proof/presentations"+(objParam.thid? "?thid="+objParam.thid: ""), objParam.key);
}

const async_getFirstHolderVCPresentationMatchingType = async function (objParam) {
    try {
        // all requests received from holder point of view
        let aPresReceived = await async_getAllVCPresentationRequests({
            key: objParam.key,
        });

        // no request? Houston we have a problem... F@@# wait time not long enough or what else?
        if(aPresReceived.data && aPresReceived.data.length==0) {
            throw({
                data:null,
                status: 404,
                statusText: "No presentation request received so far"
            })
        }

        // we need to check in all VC received by peer2, if one matches the proof request
        let _bestMatch=null;
        let _cVCAccepted=null;
        let isValid=false;
        let hasSameType=false;
        aPresReceived.data.forEach(item => {

            // only filter through Presentations Sent (in a final state), but keep first mathing one if we have it
            if(_bestMatch==null && item.status == "PresentationSent") {
                _cVCAccepted++;
                const decoded_wrapper = jwtDecode(item.data[0]);
                const type=decoded_wrapper.nonce;           // not used anymore

                // happy with the challenge requested?
                const encoded_proof=decoded_wrapper.vp.verifiableCredential[0];
                const decoded_proof = jwtDecode(encoded_proof);
                const dateExpire = new Date(decoded_proof.exp * 1000);
                const now = new Date();
                if(dateExpire> now) {
                    isValid=true;

                    // we have a valid claim, but is it of same type? 
                    if(decoded_proof.vc.credentialSubject && decoded_proof.vc.credentialSubject.claim_type==objParam.claim_type) {
                        hasSameType=true;
                        _bestMatch=decoded_proof.vc.credentialSubject;
                    }
                }                
            }
        })

        if(!_bestMatch) {
            if(_cVCAccepted==0) {
                throw({
                    data:null,
                    status: 404,
                    statusText: "Holder does not hold any Verifiable Credential yet"
                })    
            }
            if(!isValid) {
                throw({
                    data:null,
                    status: 404,
                    statusText: "All proofs have expired for this proof type ("+objParam.type+")"
                })    
            }
            if(!hasSameType) {
                throw({
                    data:null,
                    status: 404,
                    statusText: "No matching Verifiable Credential for this proof request (type: "+objParam.type+")"
                })    
            }
        }

        return {data: _bestMatch}
    }
    catch(err) {throw err}
}

const async_createVCPresentationRequest = async function (objParam) {
    try {

        let dataRet= await  srvIdentusUtils.async_simplePost("present-proof/presentations/", objParam.key, {
            connectionId: objParam.connection,
            proofs: objParam.proofs,
            options:{
                challenge: objParam.challenge,
                domain: objParam.domain
            },
            credentialFormat: "JWT"
        });
        consoleLog("Verifier issued a presentation request (thid= "+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch(err) {throw err}
}

// from holder point of view
const async_acceptVCPresentation = async function (objParam) {
    // patching presentation
    try {
        let dataRet= await srvIdentusUtils.async_simplePatch("present-proof/presentations/"+objParam.presentationId, objParam.key, {
            action: "request-accept",
            proofId: [objParam.recordId]
        });
        consoleLog("Prover accepts presentation request with record (thid= "+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch(err) {throw err}
}

// from verifier point of view
const async_getVCProof = async function (objParam) {
    // patching presentation
    try {
        let dataRet= await srvIdentusUtils.async_simplePatch("present-proof/presentations/"+objParam.presentationId, objParam.key, {
            action: "presentation-accept"
        });
        consoleLog("Verifier presented proof (thid= "+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch(err) {throw err}
}

// from verifier point of view (includes holder actions)
const async_createCustodialProof = async function (objParam) {
    // we have a custodial context, we can do all in one go
    try {
        let dataPresReq = await async_createVCPresentationRequest({
            key: objParam.keyPeer1,
            connection: objParam.connection,
            challenge: objParam.challenge,
            domain: objParam.domain, 
            proofs: [] //objParam.proofs
        });

        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await srvIdentusUtils.wait(gConfig.identus.delay);

        let dataBestMatch = await async_getFirstHolderVCPresentationMatchingType({
            key: objParam.keyPeer2,
            claim_type: objParam.claim_type
        })

        let dataAccept = await async_acceptVCPresentation({
            key: objParam.keyPeer2,
            presentationId: dataPresReq.data.presentationId,
        });

        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await srvIdentusUtils.wait(gConfig.identus.delay);

        let data= await async_getVCProof({
            key: objParam.keyPeer1,
            presentationId: dataPresReq.data.presentationId,
        });

        return data;
    }
    catch(err) {throw err}
}



module.exports = {
    async_createVCPresentationRequest,
    async_getAllVCPresentationRequests,
    async_getFirstHolderVCPresentationMatchingType,
    async_acceptVCPresentation,
    async_getVCProof,
    async_createCustodialProof
}