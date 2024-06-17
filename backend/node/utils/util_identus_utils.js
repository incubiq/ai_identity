
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

module.exports = {
    DIR_ASSET_CREDS, 
    DIR_ASSET_SCHEMA,
    
    getIdentusHost,
    getIdentusAgent,

    getAdminHeader,
    getEntityHeader,

    getRandomSeed,
}