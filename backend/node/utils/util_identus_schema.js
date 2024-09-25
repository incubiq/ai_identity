
/*
 *       Calls to Identus / Atala Prism agent / Schema
 */

const srvIdentusUtils = require("./util_identus_utils");
const fs = require("fs");
const path=require('path');
const { consoleLog } = require("./util_services");

/*
 *       Schemas
 */

// get all schemas issued by this entity (authenticated by key)
const async_getSchemas = async function (objParam){
    return srvIdentusUtils.async_simpleGet("schema-registry/schemas/", objParam.key);
}

// get one schema (by id) issued by this entity (authenticated by key)
const async_getSchemaById = async function (objParam){
    return srvIdentusUtils.async_simpleGet("schema-registry/schemas/"+objParam.id, objParam.key);
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
        let _location =  srvIdentusUtils.DIR_ASSET_SCHEMA + objParam.name+ "_"+objParam.version;
        _location = _location.replace(/\./g, "_")+".json";
        let _locationFile=path.resolve(process.cwd() + "/backend"+ _location);
        let _locationUrl=gConfig.isDebug? gConfig.tunnel + _location.substr(1,_location.length): gConfig.prod + _location.substr(1,_location.length);

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
              "$id": _locationUrl,   // eg "https://opensourceAIs.com/assets/credentials/ai_identity.json",
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "description":  objParam.description,
              "type": "object",
              "properties": _jsonProp,
              "required": _aRequired,
              "additionalProperties": true
            }
        };

        // write doc to schema registry
        fs.writeFileSync(_locationFile, JSON.stringify(doc))
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
        _doc = JSON.stringify(_doc);

        // call Identus to create schema 
        return srvIdentusUtils.async_simplePost("schema-registry/schemas/", objParam.key, _doc);
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
        return srvIdentusUtils.async_simplePost("schema-registry/schemas/"+_doc.author+"/"+objParam.id, objParam.key, _doc);
    }
    catch(err)  {
        throw err;
    }
}

// ensure all schemas exist
const async_ensureSchemas = async function (objParam) {
    try {   
        // get all existing registered schemas
        let _data=await async_getSchemas({
            key: objParam.key
        });


        // loop over all schemas
        let _aReg=[];
        let _aUpd=[];
        if(objParam && objParam.aSchema) {
            for (var i=0; i<objParam.aSchema.length; i++) {
                let item=objParam.aSchema[i];

                // check we have it registered... (same name, version and author)
                let j=_data.data.findIndex(function (x) {return (x.name===item.name && x.author===item.author)});
                let _isRegistered=(j!=-1);
                if(!_isRegistered) {
                    // create
                    try {
                        await async_createSchema({
                            name:  item.name? item.name : null,
                            version: item.version? item.version : "1.0.0",
                            description:  item.description? item.description : null,
                            author:  item.author? item.author : null,
                            aTag:  item.aTag? item.aTag : [], 
                            aProp:  item.aProp? item.aProp : [],
                            key: objParam.key
                        });
                        _aReg.push(item.name)
                    }
                    catch(err)  {
                        consoleLog("Could not create Schema "+item.name)
                    }
                }
                else {
                    j=_data.data.findIndex(function (x) {return (x.name===item.name && x.author===item.author && x.version===item.version)});

                    // this version does not exist, we add it
                    if (j===-1) {
                        // update
                        try {
                            async_updateSchema({
                                id: _data.data.contents[i].id,
                                name:  item.name? item.name : null,
                                version: item.version? item.version : "1.0.0",
                                description:  item.description? item.description : null,
                                author:  item.author? item.author : null,
                                aTag:  item.aTag? item.aTag : [], 
                                aProp:  item.aProp? item.aProp : [],
                                key: objParam.key
                            });
                            _aUpd.push(item.name)
                        }
                        catch(err)  {
                            consoleLog("Could not update Schema "+item.name)
                        }
                    }
                    else {
                        // we already have it... 
                    }
                }
            }
        }

        return {
            data: {
                aRegistered: _aReg,
                aUpdated: _aUpd
            }
        }
    }
    catch(err)  {
        throw err;
    }
}

module.exports = {

    async_getSchemas,
    async_getSchemaById,
    async_createSchema,
    async_updateSchema,
    async_ensureSchemas,

}