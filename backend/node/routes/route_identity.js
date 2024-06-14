
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentus = require("../utils/util_identus");

// all routes here start with               api/v1/identity/

/*
 *      entity routes
 */

// GET /entities
router.get("/entities", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getEntities, {
  });
});

// GET /entity
router.get("/entity/:entity", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getEntityById, {
    entity:  req.params.entity? req.params.entity : null,           // id of entity to get
  });
});

// POST /entity  (will create entity, wallet, auth key, and auth DID) ; note: a caller role will create a new wallet whereas any other role expects 
router.post("/entity", function(req, res, next) {
    routeUtils.apiPost(req, res, srvIdentus.async_createEntityWithAuth, {
        name:  req.body.name? req.body.name : null,                   // a name for this wallet & entity
        role:  req.body.role? req.body.role : null,                   // a role for this entity (caller, worker, provider, admin) 
        mnemonic:  req.body.mnemonic? req.body.mnemonic : null,       // a seed phrase (optional ; if not provided, the API will generate a random one)
        id_wallet: req.body.id_wallet? req.body.id_wallet : null      // id of the existing wallet (then we do not use mnemonic) 
    });
  });

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
      id:  req.body.id? req.body.id : "key-2",                             // a short ID for the DID doc entry (eg: "key-2")
      purpose:  req.body.purpose? req.body.purpose : "authentication",     // purpose of the DID that will be created (if null, no DID created)
      key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

module.exports = router;
