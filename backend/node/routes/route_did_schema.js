
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentus = require("../utils/util_identus_schema");

// all routes here start with               api/v1/schema/

/*
 *      Schema routes
 */

// GET all schemas
router.get("/", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getSchemas, {
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// GET - get a schema by id
router.get("/:schema", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getSchemaById, {
    id: req.params.schema? req.params.schema: null,
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// POST - create a schema
router.post("/", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_createSchema, {
    name:  req.body.name? req.body.name : null,             // name for this schema (compulsory)
    version: req.body.version? req.body.version : "1.0.0",  // version for this schema (optional)
    description:  req.body.description? req.body.description : null,     // description for this schema (compulsory)
    author:  req.body.author? req.body.author : null,       // published short DID of author for this schema (compulsory)
    aTag:  req.body.aTag? req.body.aTag : [],               // array of tag strings
    aProp:  req.body.aProp? req.body.aProp : null,          // array of props in this format: {name: "abc", type: "string", isRequired: true}
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// PATCH - update a schema
router.patch("/:schema", function(req, res, next) {
  routeUtils.apiPatch(req, res, srvIdentus.async_updateSchema, {
    id: req.params.schema? req.params.schema: null,         // id of schema to update (compulsory)
    name:  req.body.name? req.body.name : null,             // name for this schema (compulsory)
    version: req.body.version? req.body.version : "1.0.0",  // version for this schema (optional)
    description:  req.body.description? req.body.description : null,     // description for this schema (compulsory)
    author:  req.body.author? req.body.author : null,       // published short DID of author for this schema (compulsory)
    aTag:  req.body.aTag? req.body.aTag : [],               // array of tag strings
    aProp:  req.body.aProp? req.body.aProp : null,          // array of props in this format: {name: "abc", type: "string", isRequired: true}
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// POST - ensure that all schemas passed in params are installed
router.post("/install", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_ensureSchemas, {
    aSchema: req.body.aSchema? req.body.aSchema : [],       // array of all schema to ensure are created
    key: req.headers.apikey? req.headers.apikey: null       // apikey to get in the header...
  });
});



module.exports = router;
