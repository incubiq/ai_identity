
/*
 *       Our Utilities
 */

const srvCardano = require("./util_cardano");
const fs = require("fs");
const axios = require('axios').default;
const crypto = require('crypto');
const HASH_ALGORITHM = "sha256"; // NOTE: must match the algorithm in api auth2admin

const DIR_ASSET_CREDS="/assets/credentials/";
const DIR_ASSET_SCHEMA="/assets/schema/";

const getIdentusAdminKey = () => {
    return gConfig.identus.adminKey;
}

const getIdentusHost = () => {
    return gConfig.identus.host;
}

const getIdentusAgent = () => {
    return getIdentusHost() + "cloud-agent/";
}

const async_getAdminStatus = async() => {
    return {
        data: {
            isAdmin: true,    
            host: getIdentusHost(),
            agent: getIdentusAgent()   
        }
    }
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
const wait = (msec) => new Promise((resolve, _) => {
    setTimeout(resolve, msec);
});
  
const async_simpleGet = async function (_url, _key){
    try {
        let _objHeader = _key==null? getAdminHeader() : getEntityHeader(_key);
        let response = await axios.get(getIdentusAgent()+_url, {
            headers: _objHeader
        });

        // if we have contents, we return it, overwise straight data
        let _data = response.data.contents? response.data.contents : response.data;
        return {data: _data};
    }
    catch(err)  {
        throw err;
    }
}

const async_simplePost = async function (_url, _key, objParam){
    try {
        let _objHeader = _key==null? getAdminHeader() : getEntityHeader(_key);
        let response = await axios.post(getIdentusAgent()+_url, objParam, {
            headers: _objHeader
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

const async_simplePut = async function (_url, _key, objParam){
    try {
        let _objHeader = _key==null? getAdminHeader() : getEntityHeader(_key);
        let response = await axios.put(getIdentusAgent()+_url, objParam, {
            headers: _objHeader
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

const async_simplePatch = async function (_url, _key, objParam){
    try {
        let _objHeader = _key==null? getAdminHeader() : getEntityHeader(_key);
        let response = await axios.patch(getIdentusAgent()+_url, objParam, {
            headers: _objHeader
        });
        return {data: response.data};    
    }
    catch(err)  {
        throw err;
    }
}

const async_simpleDelete = async function (_url, _key){
    try {
        let _objHeader = _key==null? getAdminHeader() : getEntityHeader(_key);
        let response = await axios.delete(getIdentusAgent()+_url, {
            headers: _objHeader
        });
        return {data: response.data};
    }
    catch(err)  {
        throw err;
    }
}

module.exports = {
    DIR_ASSET_CREDS, 
    DIR_ASSET_SCHEMA,
    
    getIdentusAdminKey,
    getIdentusHost,
    getIdentusAgent,
    async_getAdminStatus,

    getAdminHeader,
    getEntityHeader,

    wait,
    getRandomSeed,

    async_simpleGet,
    async_simplePost,
    async_simplePut,
    async_simplePatch,
    async_simpleDelete
}