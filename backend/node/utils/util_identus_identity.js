
/*
 *       Calls to Identus / Atala Prism agent 
 */

const srvCardano = require("./util_cardano");
const srvIdentusUtils = require("./util_identus_utils");
const crypto = require('crypto');
const HASH_ALGORITHM = "sha256"; // NOTE: must match the algorithm in api auth2admin

const DID_PURPOSE_AUTH = "authentication"
const DID_PURPOSE_ISSUANCE = "issue"

/*
 *       Entity + wallet
 */

const async_getEntities = async function (){
    try {
        let resp = await srvIdentusUtils.async_simpleGet("iam/entities/", null);
        if(resp.data) {
            return {
                data: resp.data
            }
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_getEntityById = async function (objEntity){
    try {
        let resp = await srvIdentusUtils.async_simpleGet("iam/entities/"+objEntity.entity, null);
        if(resp.data) {
            return {
                data: resp.data
            }
        }
    }
    catch(err)  {
        throw {
            data: null,
            status: 404,
            statusText: "Not found"
        };
    }
}

const async_findOrCreateIdentityWallet = async function (objParam){
    try {
        // does the wallet exist?
        try {
            let responseW = await srvIdentusUtils.async_simpleGet("wallets/"+objParam.id_wallet, null);
            if(responseW.data.id) {
                return {
                    data: responseW.data
                }
            }
        }
        catch(err)  {
            // create Identity wallet
            return srvIdentusUtils.async_simplePost("wallets/", null, {
                seed: objParam.seed,
                name: objParam.name
            });
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
        let responseE = await srvIdentusUtils.async_simplePost("iam/entities/", null, {
            name: objParam.name + " ("+objParam.role+")",
            walletId: responseW.data.id
        });

        // register auth key
        let dateCreatedAt=new Date(responseE.data.createdAt);
        let key= crypto.createHash(HASH_ALGORITHM).update(objKeys.data.seed+ objParam.name+objParam.role+ dateCreatedAt.toUTCString()).digest('hex');
        let responseK = await srvIdentusUtils.async_simplePost("iam/apikey-authentication/", null, {
            entityId: responseE.data.id,
            apiKey: key
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
        let responseDid = await srvIdentusUtils.async_simplePost("did-registrar/dids/", objParam.key, doc)

        // now publish
        let responsePub = await srvIdentusUtils.async_simplePost("did-registrar/dids/"+responseDid.data.longFormDid+"/publications", objParam.key, {})

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

// mainly for adding issuance capability to a DID
const async_updateAndPublishDid = async function (objFind, objUpdate) {
    try {
        // update did
        let doc={"actions": [
            {
                "actionType": "ADD_KEY",
                "addKey": {
                  "id": objUpdate.id? objUpdate.id : "issue-2",
                   "purpose": objUpdate.purpose === DID_PURPOSE_AUTH? "authentication" : objUpdate.purpose === DID_PURPOSE_ISSUANCE? "assertionMethod" : "unknown"
                }
            }
        ]}

        // now update
        let responseDid = await srvIdentusUtils.async_simplePost("did-registrar/dids/"+objFind.did+"/updates", objUpdate.key, doc)

        return {
            data: {
                did: objFind.did,
                wasUpdated: true
            }
        }
    }
    catch(err)  {
        throw err;
    }
}

const async_getDidForEntity = async function (objParam){
    try {
        if(objParam.did) {
            return srvIdentusUtils.async_simpleGet("dids/"+objParam.did, null);
        }
        return srvIdentusUtils.async_simpleGet("did-registrar/dids/", objParam.key);
    }
    catch(err)  {
        throw err;
    }
}

const async_deleteEntityById = async function (objParam){
    try {
        return srvIdentusUtils.async_simpleDelete("iam/entities/"+objParam.entity, null);
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
    async_updateAndPublishDid,
    async_getDidForEntity,
    async_deleteEntityById
}