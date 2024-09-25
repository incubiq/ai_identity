
/*
 *       Calls to Identus / Atala Prism agent / Proofs
 */

const srvIdentusUtils = require("./util_identus_utils");
const srvIdentusIdentity = require("../utils/util_identus_identity");
const srvIdentusCreds = require("../utils/util_identus_credentials");
const jwtDecode = require('jwt-decode');
const { consoleLog } = require("./util_services");

const STATUS_PROVER_PROOF_REQRECEIVED="RequestReceived";
const STATUS_PROVER_PROOF_SENT="PresentationSent";

/*
 *       VC - Proof / Verification
 */

const async_getAllVCPresentationRequests = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("present-proof/presentations"+(objParam.thid? "?thid="+objParam.thid: ""), objParam.key);
}

const async_getFirstHolderPresentationRequestMatchingType = async function (objParam) {
    try {
        // all requests received from holder point of view
        let aPresReceived = await async_getAllVCPresentationRequests({
            key: objParam.key,
        });

        // no request? Houston we have a problem... F@@# wait time not long enough or what else?
        if(aPresReceived.data && aPresReceived.data.length==0) {
            let dataDID = await srvIdentusIdentity.async_getDidForEntity({
                key: objParam.key,
            })
            throw({
                data:null,
                status: 404,
                statusText: "No presentation request received so far"+(objParam.thid? " (thid="+objParam.thid+")" : " for DID "+dataDID.data[0].did)
            })
        }

        // we need to check in all VC received by peer2, if one matches the proof request
        let _presId=null;
        let _proof=null;
        let _claim=null;
        let _cVCAccepted=null;
        let isValid=false;
        let hasSameType=false;
        aPresReceived.data.forEach(item => {

            // filter through given status (if no status, only get those Proofs in a final state), but keep first mathing one if we have it
            let _filterStatus = objParam.status? objParam.status : STATUS_PROVER_PROOF_SENT;      
            if(_presId==null && item.status == _filterStatus) {
                _cVCAccepted++;

                // happy with the challenge requested?
                const _options=(item.requestData? JSON.parse(item.requestData[0]).options : {});
                if(_options.challenge==objParam.claim_type) {

                    _presId=item.presentationId;
                    hasSameType=true;

                    if(_filterStatus===STATUS_PROVER_PROOF_SENT) {
                        _proof=item.data[0];
                        const decoded_wrapper = jwtDecode(item.data[0]);
                        const encoded_proof=decoded_wrapper.vp.verifiableCredential[0];
                        const decoded_proof = jwtDecode(encoded_proof);
                        const dateExpire = new Date(decoded_proof.exp * 1000);
                        const now = new Date();
//                        if(dateExpire> now) {              SHIT Identus expiry date does not work, so we cannot compare...
    
                            // now this must be the one 
                            if(decoded_proof.vc.credentialSubject && decoded_proof.vc.credentialSubject.claim_type==objParam.claim_type) {
                                isValid=true;
                                delete decoded_proof.vc.credentialSubject.id;
                                _claim=decoded_proof.vc.credentialSubject;
                                return;
                            }
//                        }

                        // it s not good in the end...
                        _presId=null;
                    }
                }
            }
        })

        if(!_presId) {
            if(_cVCAccepted==0) {
                throw({
                    data:null,
                    status: 404,
                    statusText: "Holder does not hold any Proof yet"
                })    
            }
            if(!hasSameType) {
                throw({
                    data:null,
                    status: 404,
                    statusText: "No matching presentation for this proof request (type: "+objParam.claim_type+")"
                })    
            }
            if(!isValid) {
                throw({
                    data:null,
                    status: 404,
                    statusText: "All proofs have expired for this proof type ("+objParam.claim_type+")"
                })    
            }
        }

        return {data: {
            presentationId: _presId,
            proof: _proof,
            claim: _claim
        }}
    }
    catch(err) {throw err}
}

const async_createVCPresentationRequest = async function (objParam) {
    try {

        let dataRet= await  srvIdentusUtils.async_simplePost("present-proof/presentations/", objParam.key, {
            connectionId: objParam.connection,
            proofs: objParam.proofs? objParam.proofs: [],
            options:{
                challenge: objParam.challenge,
                domain: objParam.domain
            },
            credentialFormat: "JWT"
        });
        consoleLog("Verifier issued a presentation request (thid="+dataRet.data.thid+ ")");
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
        consoleLog("Prover accepts presentation request with record (thid="+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch(err) {throw err}
}

// from verifier point of view
const async_issueVCProof = async function (objParam) {
    // patching presentation
    try {
        let dataRet= await srvIdentusUtils.async_simplePatch("present-proof/presentations/"+objParam.presentationId, objParam.key, {
            action: "presentation-accept"
        });
        consoleLog("Verifier presented proof (thid="+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch(err) {throw err}
}

// from verifier point of view (includes holder actions)
const async_createCustodialProof = async function (objParam) {
    // we have a custodial context, we can do all in one go
    try {
        // if the proof already exists, we take it
        let dataExist=null;
        try {
            dataExist= await async_getFirstHolderPresentationRequestMatchingType({
                key: objParam.keyPeer2,
                claim_type: objParam.claim_type,
            })
            return dataExist;
        }
        catch(err) {}

        // we don t have any existing one.. so we request it
        let dataPresReqAsVerifier = await async_createVCPresentationRequest({
            key: objParam.keyPeer1,
            connection: objParam.connection,
            challenge: objParam.claim_type,
            domain: objParam.domain, 
        });

        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await srvIdentusUtils.wait(gConfig.identus.delay);
        
        let dataPresReqAsHolder = await async_getAllVCPresentationRequests({
            key: objParam.keyPeer2,
            thid: dataPresReqAsVerifier.data.thid
        })

        let dataBestMatchRecord = await srvIdentusCreds.async_getFirstHolderVCMatchingType({
            key: objParam.keyPeer2,
            claim_type: objParam.claim_type
        })

        let dataAccept = await async_acceptVCPresentation({
            key: objParam.keyPeer2,
            presentationId: dataPresReqAsHolder.data[0].presentationId,
            recordId: dataBestMatchRecord.data.recordId
        });

        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await srvIdentusUtils.wait(gConfig.identus.delay);

        let dataProof= await async_issueVCProof({
            key: objParam.keyPeer1,
            presentationId: dataPresReqAsVerifier.data.presentationId,
        });

        const decoded_wrapper = jwtDecode(dataProof.data.data[0]);
        const encoded_proof=decoded_wrapper.vp.verifiableCredential[0];
        const decoded_proof = jwtDecode(encoded_proof);
        delete decoded_proof.vc.credentialSubject.id;
        return {
            data: {
                wasPresented: true,
                wasAccepted: true,
                proof: dataProof.data.data[0],
                claim: decoded_proof.vc.credentialSubject
            }
        }
    }
    catch(err) {throw err}
}



module.exports = {
    async_createVCPresentationRequest,
    async_getAllVCPresentationRequests,
    async_getFirstHolderPresentationRequestMatchingType,
    async_acceptVCPresentation,
    async_issueVCProof,
    async_createCustodialProof
}