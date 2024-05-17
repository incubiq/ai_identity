
/*
 *       Calls to Identus / Atala Prism agent 
 */

const srvCardano = require("./util_cardano");
const axios = require('axios').default;
const crypto = require('crypto');
const HASH_ALGORITHM = "sha256"; // NOTE: must match the algorithm in api auth2admin

const DID_PURPOSE_AUTH = "authentication"
const DID_PURPOSE_ISSUANCE = "issue"

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


module.exports = {
    getIdentusHost,
    getIdentusAgent,

    getRandomSeed,

    async_getEntities,
    async_getEntityById,
    async_createEntityWithAuth,
    async_createAndPublishDid,
    async_getDidForEntity
}