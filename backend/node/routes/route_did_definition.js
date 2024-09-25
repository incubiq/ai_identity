
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentus = require("../utils/util_identus_definitions");

// all routes here start with               api/v1/definition/

/*
 *      Schema routes
 */

// GET all definitions
router.get("/", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getAllVCDefinitions, {
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// GET a specific definitions
router.get("/:uid", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getVCDefinition, {
    guid: req.params.uid? req.params.uid: null,
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// POST - create a definition
router.post("/", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_createVCDefinition, {
    name:  req.body.name? req.body.name : null,             // name for this def (compulsory)
    version: req.body.version? req.body.version : "1.0.0",  // version for this def (optional)
    description:  req.body.description? req.body.description : null,     // description for this def (compulsory)
    author:  req.body.author? req.body.author : null,       // published short DID of author for this def (compulsory)
    tags:  req.body.tags? req.body.tags : "",               // string
    location:  req.body.location? req.body.location : null,          // location of the schema definition
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

module.exports = router;
