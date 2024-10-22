
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const identusUtils = require('../utils/util_identus_utils');
const srvIdentus = require("../utils/util_identus_identity");

// all routes here start with               api/v1/admin/

/*
 *      Private routes (requires login)
 */

/*
 *      status
 */

// get authenticated admin details
router.get("/", function(req, res, next) {
    routeUtils.apiGet(req, res, identusUtils.async_getAdminStatus, {});
});


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
          name:  req.body && req.body.name? req.body.name : null,                   // a name for this wallet & entity
          role:  req.body && req.body.role? req.body.role : null,                   // a role for this entity (caller, worker, provider, admin) 
          mnemonic:  req.body.mnemonic? req.body.mnemonic : null,       // a seed phrase (optional ; if not provided, the API will generate a random one)
          id_wallet: req.body.id_wallet? req.body.id_wallet : null      // id of the existing wallet (then we do not use mnemonic) 
      });
    });
  
   // DEL /entity
  router.delete("/entity/:entity", function(req, res, next) {
    routeUtils.apiGet(req, res, srvIdentus.async_deleteEntityById, {
      entity:  req.params.entity? req.params.entity : null,           // id of entity to delete
    });
  });
  
module.exports = router;
