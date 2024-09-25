
/*
 *       Calls to Identus / Atala Prism agent / Credentials
 */

const srvIdentusUtils = require("./util_identus_utils");
const { consoleLog } = require("./util_services");

/*
 *       VC - Offer / Accept / Issue
 */

const async_createVCOfferWithoutSchema = async function (objParam) {
    try {
        let dataRet = await srvIdentusUtils.async_simplePost("issue-credentials/credential-offers/", objParam.key, {
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
        consoleLog("Issuer issued a new offer (thid= "+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch (err) {throw err}
    return 
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
    try {
        let dataRet = await srvIdentusUtils.async_simplePost("issue-credentials/records/"+objParam.recordId+"/accept-offer", objParam.key, {
            subjectId: objParam.did
        })
        consoleLog("Holder accepted creds offer (thid= "+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch (err) {throw err}
}

const async_issueVC = async function (objParam) {
    try {
        let dataRet = await srvIdentusUtils.async_simplePost("issue-credentials/records/"+objParam.recordId+"/issue-credential", objParam.key, {
            // todo : put param here
        })
        consoleLog("Issuer issued VC for offer (thid= "+dataRet.data.thid+ ")");
        return dataRet;
    }
    catch (err) {throw err}
}

// custodial full issuance (with issuer and holder actions) 
const async_createCustodialCredential = async function (objParam) {
    try {
        // we have a custodial context, we can do all in one go

        // create an offer
        let dataOfferByIssuer= await async_createVCOfferWithoutSchema({
            connection: objParam.connection,
            validity: objParam.validity,
            key: objParam.keyPeer1,
            author: objParam.didPeer1,
            claims: objParam.claims
        });
            
        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await srvIdentusUtils.wait(gConfig.identus.delay);

        // get offer record from holder point of view
        let _recordId=null;
        let dataOfferedToHolder= await async_getAllVCOffers({
            key: objParam.keyPeer2,
            thid: dataOfferByIssuer.data.thid
        });

        // we should have only one in the array
        dataOfferedToHolder.data.forEach(item => {
            if(item.thid===dataOfferByIssuer.data.thid) {
                _recordId=item.recordId;
            }
        })

        if(!_recordId) {
            throw({
                data:null,
                status: 404,
                statusText: "Offer just issued by issuer cannot be found by holder after a delay of "+(gConfig.identus.delay/1000)+ " secs"
            })
        }

        // ask the AI to accept this offer (with its own recordId)
        let dataAcceptedByHolder= await async_acceptVCOffer({
            key: objParam.keyPeer2,
            recordId: _recordId,
            did: objParam.didPeer2
        });

        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await srvIdentusUtils.wait(gConfig.identus.delay);

        // now issue the VC
        let dataVCByIssuer=await async_issueVC({
            key: objParam.keyPeer1,
            recordId: dataOfferByIssuer.data.recordId
        })        

        // F@@# Identus will fail if called within less than 4, 5, or 6 secs after this call... oh my... we slow it down
        await srvIdentusUtils.wait(gConfig.identus.delay);

        // get the proof (as per holder)
        let dataVCToHolder= await async_getAllVCOffers({
            key: objParam.keyPeer2,
            thid: dataOfferByIssuer.data.thid
        });

        return {
            data: {
                wasOffered: true,
                wasAccepted: true,
                vc: dataVCToHolder.data[0]
            }
        }
    }
    catch (err) {throw err}
}

module.exports = {
    async_createVCOfferWithoutSchema,
    async_getAllVCOffers,
    async_getVCOffer,
    async_acceptVCOffer,
    async_issueVC,
    async_createCustodialCredential
}