
/*
 *       Calls to Identus / Atala Prism agent / Creds Definitions
 */

const srvIdentusUtils = require("./util_identus_utils");

/*
 *       VC - Definitions
 */

const async_createVCDefinition = async function (objParam) {
    try {   
        if (!objParam || !objParam.name || !objParam.version || !objParam.description || !objParam.author || !objParam.location) {
            throw {
                data: null,
                status: 400,
                message: "Bad params for creating VC Definition"
            }
        }
        // remove spaces in name
        objParam.name = objParam.name.replace(/ /g, "_");


        return srvIdentusUtils.async_simplePost("credential-definition-registry/definitions/", objParam.key, {
            "name":objParam.name,
            "description": objParam.description,
            "version": objParam.version,
            "tag": objParam.tags? objParam.tags : "", 
            "author": objParam.author,
            "schemaId": objParam.location,
            "signatureType": "CL",
            "supportRevocation": true
        });
    }
    catch(err)  {
        throw err;
    }
}

const async_getAllVCDefinitions = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("credential-definition-registry/definitions/", objParam.key);
}

const async_getVCDefinition = async function (objParam) {
    return srvIdentusUtils.async_simpleGet("credential-definition-registry/definitions/"+objParam.guid, objParam.key);
}

module.exports = {
    async_createVCDefinition,
    async_getAllVCDefinitions,
    async_getVCDefinition,
}