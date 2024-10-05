
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentus = require("../utils/util_identus_identity");

// all routes here start with               api/v1/identity/

/*
 *      DID routes
 */

// GET /dids  (apikey of calling entity in the header {apikey: ...})
router.get("/dids", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getDidForEntity, {
      key: req.headers.apikey? req.headers.apikey: null           // the API key for this entity (to list all DIDs of the entity)
  });
});

// GET /did/ <didRef / didLong>  
router.get("/dids/:did", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getDidForEntity, {
      did:  req.params.did? req.params.did : null,                // the did to inspect (can be either SHORT or LONG form)
  });
});

// POST /did  (will create a DID for a purpose)  (apikey of calling entity in the header {apikey: ...})
router.post("/did", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_createAndPublishDid, {
      id:  req.body && req.body.id? req.body.id : "key-2",                             // a short ID for the DID doc entry (eg: "key-2")
      purpose:  req.body && req.body.purpose? req.body.purpose : "authentication",     // purpose of the DID that will be created (if null, no DID created)
      key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// POST /did  (will create a DID for a purpose)  (apikey of calling entity in the header {apikey: ...})
router.patch("/did/:did", function(req, res, next) {
  routeUtils.apiPatch(req, res, srvIdentus.async_updateAndPublishDid, {
      did:  req.params.did? req.params.did : null,                         // the (short) DID to update 
  }, {
      id:  req.body && req.body.id? req.body.id : "issue-2",                           // a short ID for the DID doc entry (eg: "key-2")
      purpose:  req.body && req.body.purpose? req.body.purpose : "issue",              // purpose of the DID that will be updated (if null, no update)
      key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

module.exports = router;
