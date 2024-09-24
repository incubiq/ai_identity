
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentusDef = require("../utils/util_identus_definitions");
const srvIdentusCreds = require("../utils/util_identus_credentials");

// all routes here start with               api/v1/vc/

/*
 *      VC defintions
 */

// GET all definitions
router.get("/definitions", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusDef.async_getAllVCDefinitions, {
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// GET a definition (by guid)
router.get("/definition/:guid", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusDef.async_getVCDefinition, {
    guid: req.params.guid? req.params.guid: null,                    // guid of definition to search for (compulsory)
    key: req.headers.apikey? req.headers.apikey: null                // apikey to get in the header...
  });
});

// POST VC definition
router.post("/definition", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusDef.async_createVCDefinition, {
    name:  req.body.name? req.body.name : null,             // name for this definition (compulsory)
    version: req.body.version? req.body.version : "1.0.0",  // version for this definition (optional)
    description:  req.body.description? req.body.description : null,     // description for this definition (compulsory)
    author:  req.body.author? req.body.author : null,       // published short DID of author for this definition (compulsory)
    tags:  req.body.tags? req.body.tags : [],               // string of comma separated tags
    location:  req.body.location? req.body.location : null,       // location of the schema (eg : https://<identity_repo>/assets/credentials/<name>.json)
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

/*
 *      VC: offer / acceptance / issuance
 */

// POST VC offer 
router.post("/offer-noschema", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_createVCOfferWithoutSchema, {
    connection:  req.body.connection? req.body.connection : null,   // didComm connection_id for exchanging request (offer/accept)
    author:  req.body.author? req.body.author : null,               // published short DID of author for this offer
    validity:  req.body.validity? req.body.validity : 3600,         // offer valid for x seconds (1h by defalut)
//    definition:  req.body.definition? req.body.definition : null,   // id of the definition VC 
//    location:  req.body.location? req.body.location : null,         // location of the schema (eg : https://<identity_repo>/assets/credentials/<name>.json)
    claims:  req.body.claims? req.body.claims : {},                 // the claims to be issued in the VC (no idea why they are here, they are already in the definition)
    key: req.headers.apikey? req.headers.apikey: null               // apikey to get in the header...    
  });
});

// GET all issued records, ie pending, accepted, or issued VC offers (point of view of Issuer or of Receiver)
router.get("/offers", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getAllVCOffers, {
    thid: req.query.thid? req.query.thid: null,                   // thid in the query?
    key: req.headers.apikey? req.headers.apikey: null             // apikey to get in the header...
  });
});

// GET a specific VC offer (point of view of Issuer or of Receiver)
router.get("/offer/:id", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getVCOffer, {
    recordId: req.params.id? req.params.id: null,                 // id of the pending offer to search for (compulsory)
    key: req.headers.apikey? req.headers.apikey: null             // apikey to get in the header...
  });
});


// POST VC accept 
router.post("/accept", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_acceptVCOffer, {
    recordId: req.body.recordId? req.body.recordId: null,     // id of the pending offer to accept (compulsory / point of view of receiver)
    did:  req.body.did? req.body.did : null,                  // did of the VC offer doc (compulsory)
    key: req.headers.apikey? req.headers.apikey: null         // apikey to get in the header...
  });
});

// POST VC issue 
router.post("/issue", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_issueVC, {
    recordId: req.body.recordId? req.body.recordId: null,     // id of the pending offer to accept (compulsory / point of view of issuer)
    key: req.headers.apikey? req.headers.apikey: null         // apikey to get in the header...
  });
});

module.exports = router;
