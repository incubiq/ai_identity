
/*
 *       Calls to Identus / Atala Prism agent 
 */

const srvCardano = require("./util_cardano");
const srvIdentusUtils = require("./util_identus_utils");
const axios = require('axios').default;
const crypto = require('crypto');
const HASH_ALGORITHM = "sha256"; // NOTE: must match the algorithm in api auth2admin

const DID_PURPOSE_AUTH = "authentication"
const DID_PURPOSE_ISSUANCE = "issue"

/*
 *       Entity + wallet
 */

const async_getEntities = async function (){
    try {
        let response = await axios.get(srvIdentusUtils.getIdentusAgent()+ "iam/entities", {
            headers: srvIdentusUtils.getAdminHeader()
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

const async_getEntityById = async function (objEntity){
    try {
        let response = await axios.get(srvIdentusUtils.getIdentusAgent()+ "iam/entities/"+objEntity.entity, {
            headers: srvIdentusUtils.getAdminHeader()
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

const async_findOrCreateIdentityWallet = async function (objParam){
    try {
        // does the wallet exist?
        try {
            let responseW = await axios.get(srvIdentusUtils.getIdentusAgent()+ "wallets/"+objParam.id_wallet, {
                headers: srvIdentusUtils.getAdminHeader()
            });        

            if(responseW.data.id) {
                return {
                    data: responseW.data
                }
            }
        }
        catch(err)  {
            // create Identity wallet
            responseW = await axios.post(srvIdentusUtils.getIdentusAgent()+ "wallets", {
                seed: objParam.seed,
                name: objParam.name
            }, {
                headers: srvIdentusUtils.getAdminHeader()
            });        
            return {
                data: responseW.data
            }
        }
    
    }    
    catch(err)  {
        throw err;
    }
}

const async_createEntityWithAuthForRole = async function (objParam){
    try {
        // get Cardano wallet keys...
        let objKeys=await srvCardano.getWalletDetails({
            mnemonic: objParam.mnemonic
        });
        
        // create Identity wallet  / or find existing one
        let responseW = await async_findOrCreateIdentityWallet({
            id_wallet: objParam.id_wallet,            // optional (to seach if exist, otherwise we create)
            seed: objKeys.data.seed,
            name: objParam.name
        }, {
            headers: srvIdentusUtils.getAdminHeader()
        });
        
        // we have a wallet (new or old), now create entity for the role 
        let responseE = await axios.post(srvIdentusUtils.getIdentusAgent()+ "iam/entities", {
            name: objParam.name + " ("+objParam.role+")",
            walletId: responseW.data.id
        }, {
            headers: srvIdentusUtils.getAdminHeader()
        });

        // register auth key
        let dateCreatedAt=new Date(responseE.data.createdAt);
        let key= crypto.createHash(HASH_ALGORITHM).update(objKeys.data.seed+ objParam.name+objParam.role+ dateCreatedAt.toUTCString()).digest('hex');
        let responseK = await axios.post(srvIdentusUtils.getIdentusAgent()+ "iam/apikey-authentication", {
            entityId: responseE.data.id,
            apiKey: key
        }, {
            headers: srvIdentusUtils.getAdminHeader()
        });

        // we create a did for Auth
        let dataDID = await async_createAndPublishDid({
            purpose: DID_PURPOSE_AUTH,
            key: key
        })

        // return important info
        return {
            data: {
                id_entity: responseE.data.id,      // id of the entity
                id_wallet: responseW.data.id,      // id of the wallet
                name: objParam.name,        // name of the wallet ; entity will have (<role>) appended to the name
                role: objParam.role,        // role of this entity
                created_at: dateCreatedAt,
                key: key,                   // auth key of the entity
                public_addr: objKeys.data.addr,     // public address of the wallet used by this entity
                didAuth: dataDID ? dataDID.data.did : null,     // DID for authenticating this entity into Identus
                longDid: dataDID ? dataDID.data.longDid: null
            }
        };    
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

        let dataRet = await async_createEntityWithAuthForRole({
            mnemonic: mnemonic,                 // case new wallet
            id_wallet: objParam.id_wallet,      // case existing wallet
            name: objParam.name,
            role: objParam.role
        })
        
        return dataRet;    
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
        let responseDid = await axios.post(srvIdentusUtils.getIdentusAgent()+ "did-registrar/dids",  doc, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        // now publish
        let responsePub = await axios.post(srvIdentusUtils.getIdentusAgent()+ "did-registrar/dids/"+responseDid.data.longFormDid+"/publications",  {}, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
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
        let _url=srvIdentusUtils.getIdentusAgent()+ "did-registrar/dids";
        let _header = srvIdentusUtils.getEntityHeader(objParam.key);
        if(objParam.did) {
            _url=srvIdentusUtils.getIdentusAgent()+ "dids/"+objParam.did;
            _header = srvIdentusUtils.getAdminHeader();
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
    DID_PURPOSE_AUTH, 
    DID_PURPOSE_ISSUANCE,

    async_getEntities,
    async_getEntityById,
    async_createEntityWithAuth,
    async_createAndPublishDid,
    async_getDidForEntity,
}