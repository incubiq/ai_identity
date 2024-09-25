
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentus = require("../utils/util_identus_connections");

// all routes here start with               api/v1/p2p/

/*
 *      Connection routes
 */

// GET all connections for an entity
router.get("/", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getAllConnectionsForEntity, {
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// GET a connection by ID
router.get("/:id", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentus.async_getConnectionById, {
    id: req.params.id? req.params.id: null,
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// POST - request to establish a p2p connection
router.post("/invite", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_createInvite, {
    from:  req.body.from? req.body.from : null,                    // strictly not required, but using to generate nicely formed message 
    key: req.headers.apikey? req.headers.apikey: null              // apikey to get in the header...
  });
});

// POST - accept a p2p connection invite
router.post("/accept", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_acceptInvite, {
    invitation:  req.body.invitation ? req.body.invitation : null,    // the encoded invite
    key: req.headers.apikey? req.headers.apikey: null                 // apikey to get in the header...
  });
});

// POST - connects both "in one call" by an admin controlling both keys (custodial) 
router.post("/custodial/connect", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_createCustodialConnection, {
    keyPeer1: req.body.key_peer1? req.body.key_peer1: null,           // apikey of peer 1
    keyPeer2: req.body.key_peer2? req.body.key_peer2: null,           // apikey of peer 2
    namePeer1: req.body.name_peer1? req.body.name_peer1: null,
    namePeer2: req.body.name_peer2? req.body.name_peer2: null,
  });
});

module.exports = router;
