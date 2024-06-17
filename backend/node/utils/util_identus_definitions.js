
/*
 *       Calls to Identus / Atala Prism agent / Creds Definitions
 */

const srvIdentusUtils = require("./util_identus_utils");
const axios = require('axios').default;


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
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
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
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
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
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseDef.data
        }
    }
    catch(err)  {
        throw err;
    }
}

module.exports = {
    async_createVCDefinition,
    async_getAllVCDefinitions,
    async_getVCDefinition,
}