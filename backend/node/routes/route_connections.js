
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
    didFrom:  req.body.from? req.body.from : null,                    // strictly not required, but using to generate nicely formed message (TODO: is this a privacy issue?)
    didTo:  req.body.to? req.body.to : null,                          // strictly not required, but using to generate nicely formed message (TODO: is this a privacy issue?)
    key: req.headers.apikey? req.headers.apikey: null                 // apikey to get in the header...
    // TODO
  });
});

// POST - accept a p2p connection invite
router.post("/accept", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentus.async_acceptInvite, {
    invitation:  req.body.invitation ? req.body.invitation : null,    // the encoded invite
    key: req.headers.apikey? req.headers.apikey: null                 // apikey to get in the header...
    // TODO
  });
});

module.exports = router;
