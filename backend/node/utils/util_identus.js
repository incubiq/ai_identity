
/*
 *       Calls to Identus / Atala Prism agent 
 */

const srvCardano = require("./util_cardano");
const fs = require("fs");
const axios = require('axios').default;
const crypto = require('crypto');
const HASH_ALGORITHM = "sha256"; // NOTE: must match the algorithm in api auth2admin

const DID_PURPOSE_AUTH = "authentication"
const DID_PURPOSE_ISSUANCE = "issue"

const DIR_ASSET_CREDS="/assets/credentials/";

const getIdentusAdminKey = () => {
    return gConfig.identus.adminKey;
}

const getIdentusHost = () => {
    return "http://localhost:8100/";
}

const getIdentusAgent = () => {
    return getIdentusHost() + "prism-agent/";
}

const getAdminHeader = () => {
    return { 
        name: 'content-type',
        value: 'application/x-www-form-urlencoded',
        charset: "UTF-8",
        "x-admin-api-key": getIdentusAdminKey()
    }
}

const getEntityHeader = (_key) => {
    return { 
        name: 'content-type',
        value: 'application/json',
        charset: "UTF-8",
        "apikey": _key
    }
}

const getRandomSeed = function (_username) {
    return crypto.createHash(HASH_ALGORITHM).update(_username+ new Date().toUTCString()).digest('hex');
}

const isDIDLongFrom = function (_did)  {
    // 3 : = long form did
    return (_did.match(/:/g) || []).length === 3;   
}

/*
 *       Entity + wallet
 */

const async_getEntities = async function (){
    try {
        let response = await axios.get(getIdentusAgent()+ "iam/entities", {
            headers: getAdminHeader()
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

const async_getEntityById = async function (objEntity){
    try {
        let response = await axios.get(getIdentusAgent()+ "iam/entities/"+objEntity.entity, {
            headers: getAdminHeader()
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

const async_createEntityWithAuth = async function (objParam){
    try {

        // make a random double long seed for this entity
        let mnemonic=objParam.mnemonic;
        if(!mnemonic) {
            mnemonic = (await srvCardano.generateSeedPhrase()).data.mnemonic;
        }
        
        // get Cardano wallet keys...
        let objKeys=await srvCardano.getWalletDetails({
            mnemonic: mnemonic
        });

        // create Identity wallet
        let responseW = await axios.post(getIdentusAgent()+ "wallets", {
            seed: objKeys.data.seed,
            name: objParam.name
        }, {
            headers: getAdminHeader()
        });

        // we have a new wallet, now create entity 
        let responseE = await axios.post(getIdentusAgent()+ "iam/entities", {
            name: objParam.name,
            walletId: responseW.data.id
        }, {
            headers: getAdminHeader()
        });

        // register auth key
        let dateCreatedAt=new Date(responseE.data.createdAt);
        let key= crypto.createHash(HASH_ALGORITHM).update(objKeys.data.seed+ objParam.name+objParam.role+ dateCreatedAt.toUTCString()).digest('hex');
        let responseK = await axios.post(getIdentusAgent()+ "iam/apikey-authentication", {
            entityId: responseE.data.id,
            apiKey: key
        }, {
            headers: getAdminHeader()
        });

        // we create a did for Auth
        let dataDID = await async_createAndPublishDid({
            purpose: DID_PURPOSE_AUTH,
            key: key
        })
        
        // return important info
        return {
            data: {
                id: responseE.data.id,
                name: objParam.name,
                role: objParam.role,
                created_at: dateCreatedAt,
                key: key,
                public_addr: objKeys.data.addr,
                didAuth: dataDID ? dataDID.data.did : null,
            }
        };    
    }
    catch(err)  {
        throw err;
    }
}

// note : objparam.id (a short string...) is required if publishing other than the first authentication related DID
const async_createAndPublishDid = async function (objParam){
    try {
        // create did
        let doc={"documentTemplate": {
            "publicKeys": [
              {
                "id": objParam.id? objParam.id : "key-1",          // this field has severe undocumented length restriction 
                "purpose": objParam.purpose === DID_PURPOSE_AUTH? "authentication" : objParam.purpose === DID_PURPOSE_ISSUANCE? "assertionMethod" : "unknown"
              }
            ],
            "services": []
          }
        };
        let responseDid = await axios.post(getIdentusAgent()+ "did-registrar/dids",  doc, {
            headers: getEntityHeader(objParam.key)
        });

        // now publish
        let responsePub = await axios.post(getIdentusAgent()+ "did-registrar/dids/"+responseDid.data.longFormDid+"/publications",  {}, {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: {
                longDid: responseDid.data.longFormDid,
                wasPublished: true
            }
        }
    }
    catch(err)  {
        throw err;
    }
}


const async_getDidForEntity = async function (objParam){
    try {
        let _url=getIdentusAgent()+ "did-registrar/dids";
        let _header = getEntityHeader(objParam.key);
        if(objParam.did) {
            _url=getIdentusAgent()+ "dids/"+objParam.did;
            _header = getAdminHeader();
        }

        // get all dids
        let responseDid = await axios.get(_url, {
            headers:  _header
        });

        return {
            data: responseDid.data
        }
    }
    catch(err)  {
        throw err;
    }
}

/*
 *       Schemas
 */

// get all schemas issued by this entity (authenticated by key)
const async_getSchemas = async function (objParam){
    try {
        let response = await axios.get(getIdentusAgent()+ "/schema-registry/schemas", {
            headers: getEntityHeader(objParam.key)
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

// get one schema (by id) issued by this entity (authenticated by key)
const async_getSchemaById = async function (objParam){
    try {
        let response = await axios.get(getIdentusAgent()+ "/schema-registry/schemas/"+objParam.id, {
            headers: getEntityHeader(objParam.key)
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

// note : objparam must contain : {name: ..., version: ..., description: ..., author: ..., aTag: ["...", ""..."], aProp: [{name:..., type:..., isRequired:T/F}, {...}], root:"https://opensourceAIs.com/assets/credentials/" }
// create schema will ALSO upload the final JSON schema to the root location
const _async_createSchema = async function (objParam) {
    try {
        if (!objParam || !objParam.name || !objParam.version || !objParam.description || !objParam.author || !objParam.aProp) {
            throw {
                data: null,
                status: 400,
                message: "Bad params for creating Schema"
            }
        }
        // remove spaces in name
        objParam.name = objParam.name.replace(/ /g, "_");


        // schema location
        let _location =  DIR_ASSET_CREDS + objParam.name+ "_"+objParam.version;
        _location = _location.replace("." /g, "_")+".json";

        // content
        let _jsonProp={};
        let _aRequired=[];
        objParam.aProp.forEach(item => {
            _jsonProp[item.name]= {
                type: item.type
            }
            if(item.isRequired) {
                _aRequired.push(item.name);
            }
        })

        // create schema doc
        let doc={
            "name": objParam.name,
            "version": objParam.version, 
            "description": objParam.description,
            "type": "https://w3c-ccg.github.io/vc-json-schemas/schema/2.0/schema.json",
            "author": objParam.author,      // a short published DID
            "tags": objParam.aTag? objParam.aTag: [],
            "schema": {
              "$id": _location,   // eg "https://opensourceAIs.com/assets/credentials/ai_identity.json",
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "description":  objParam.description,
              "type": "object",
              "properties": _jsonProp,
              "required": _aRequired,
              "additionalProperties": true
            }
        };

        // write doc to schema registry
        fs.writeFileSync(_location, doc)
        return doc;
    }
    catch(err)  {
        throw err;
    }
}

// create a schema on behalf of this entity
const async_createSchema = async function (objParam) {
    try {   
        let _doc =  await _async_createSchema(objParam);

        // create schema
        let responseSchema = await axios.post(getIdentusAgent()+ "schema-registry/schemas",  _doc, {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseSchema.data
        }
        }
    catch(err)  {
        throw err;
    }
}

// update a schema owned by this entity
const async_updateSchema = async function (objParam) {
    try {   
        let _doc =  await _async_createSchema(objParam);

        // update schema
        let responseSchema = await axios.put(getIdentusAgent()+ "schema-registry/"+_doc.author+"/"+objParam.id,  _doc, {
            headers: getEntityHeader(objParam.key)
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
 *       p2p connections
 */

// get all active connnections for the authenticated entity
const async_getAllConnectionsForEntity = async function(objParam) {
    try {  
        // get all connections
        let responseP2P = await axios.get(getIdentusAgent()+ "connections", {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// get a specific connnection (by ID) for the authenticated entity
const async_getConnectionById = async function(objParam) {
    try {  
        // get this connection
        let responseP2P = await axios.get(getIdentusAgent()+ "connections/"+objParam.id, {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// create a p2p connection invite by the authenticated entity
const async_createInvite = async function(objParam) {
    try {  
        // create a connection request
        let responseP2P = await axios.post(getIdentusAgent()+ "connections", {
            label: "p2p initiated by " + objParam.from+ " for "+objParam.to,
            goalcode: "p2p",
            goal: "p2p connection"
        }, {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// accept a p2p connection invite (by the authenticated entity)
const async_acceptInvite = async function(objParam) {
    try {  
        // accept a connection request
        let responseP2P = await axios.post(getIdentusAgent()+ "connection-invitations", {
            invitation: objParam.invitation,
        }, {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}


/*
 *       VC - Definitions
 */

const async_createVCDefinition = async function (objParam) {
    try {   
        if (!objParam || !objParam.name || !objParam.version || !objParam.description || !objParam.author || !objParam.aProp) {
            throw {
                data: null,
                status: 400,
                message: "Bad params for creating Schema"
            }
        }
        // remove spaces in name
        objParam.name = objParam.name.replace(/ /g, "_");


        let _jsonVCDefinition = {
            "name":objParam.name,
            "description": objParam.description,
            "version": objParam.version,
            "tag": objParam.aTag,       // TODO check if supports array or only ""
            "author": objParam.author,
            "schemaId": objParam.location,
            "signatureType": "CL",
            "supportRevocation": true
        }
        let responseDef = await axios.post(getIdentusAgent()+ "credential-definition-registry/definitions",  _jsonVCDefinition, {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseDef.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_getAllVCDefinitions = async function (objParam) {
    try {   

        let responseDef = await axios.get(getIdentusAgent()+ "credential-definition-registry/definitions", {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseDef.data
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_getVCDefinition = async function (objParam) {
    try {   

        let responseDef = await axios.get(getIdentusAgent()+ "credential-definition-registry/definitions/"+objParam.guid, {
            headers: getEntityHeader(objParam.key)
        });

        return {
            data: responseDef.data
        }
    }
    catch(err)  {
        throw err;
    }
}

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
        let responseVC = await axios.post(getIdentusAgent()+ "issue-credentials/credential-offers",  _jsonVCOffer, {
            headers: getEntityHeader(objParam.key)
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

        let response = await axios.get(getIdentusAgent()+ "issue-credentials/records", {
            headers: getEntityHeader(objParam.key)
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

        let response = await axios.get(getIdentusAgent()+ "issue-credentials/records/"+objParam.id, {
            headers: getEntityHeader(objParam.key)
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

        let responseSchema = await axios.post(getIdentusAgent()+ "issue-credentials/records/"+objParam.id+"/accept-offer",  {
            subjectId: objParam.did
        }, {
            headers: getEntityHeader(objParam.key)
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

        let responseSchema = await axios.post(getIdentusAgent()+ "issue-credentials/records/"+objParam.id+"/issue-credential",  _jsonVCOffer, {
            headers: getEntityHeader(objParam.key)
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

        let response = await axios.get(getIdentusAgent()+ "present-proof/presentations", {
            headers: getEntityHeader(objParam.key)
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

        let response = await axios.get(getIdentusAgent()+ "present-proof/presentations?thid="+objParam.thid, {
            headers: getEntityHeader(objParam.key)
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

        let response = await axios.post(getIdentusAgent()+ "present-proof/presentations/", {
            connectionId: objParam.connectionId,
            proofs: [],
            options:{
                challenge: objParam.challenge,
                domain: objParam.domain
            },
            credentialFormat: "JWT"
        }, {
            headers: getEntityHeader(objParam.key)
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
        let response = await axios.patch(getIdentusAgent()+ "present-proof/presentations/"+objParam.id, {
            action: "request-accept",
            proofId: [objParam.proofId]
        }, {
            headers: getEntityHeader(objParam.key)
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
        let response = await axios.patch(getIdentusAgent()+ "present-proof/presentations/"+objParam.id, {
            action: "presentation-accept"
        }, {
            headers: getEntityHeader(objParam.key)
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
    getIdentusHost,
    getIdentusAgent,

    getRandomSeed,

    async_getEntities,
    async_getEntityById,
    async_createEntityWithAuth,
    async_createAndPublishDid,
    async_getDidForEntity,

    async_getSchemas,
    async_getSchemaById,
    async_createSchema,
    async_updateSchema,

    async_getAllConnectionsForEntity,
    async_getConnectionById,
    async_createInvite,
    async_acceptInvite,

    async_createVCDefinition,
    async_getAllVCDefinitions,
    async_getVCDefinition,

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