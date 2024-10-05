
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentusDef = require("../utils/util_identus_definitions");
const srvIdentusCreds = require("../utils/util_identus_credentials");

// all routes here start with               api/v1/vc/

/*
 *      VC: offer / acceptance / issuance
 */

// POST VC offer 
router.post("/offer-noschema", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_createVCOfferWithoutSchema, {
    connection:  req.body.connection? req.body.connection : null,   // didComm connection_id for exchanging request (offer/accept)
    author:  req.body.author? req.body.author : null,               // published short DID of author for this offer
    validity:  req.body.validity? req.body.validity : gConfig.identus.validity,         // offer valid for x seconds (30 days by defalut)
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

// GET first VC that matches a type (point of view of Holder)
router.get("/match/:type", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getFirstHolderVCMatchingType, {
    key: req.headers.apikey? req.headers.apikey: null,             // apikey to get in the header...,
    claim_type: req.params.type
  });
});

// POST - will do a full offer + accept + issue vc (custodial mode)
router.post("/issuance/custodial", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_createCustodialCredential, {
    connection: req.body.connection? req.body.connection: null,       // the connectionId between issuer and holder (compulsory)
    keyPeer1: req.body.key_peer1? req.body.key_peer1: null,           // apikey of peer 1 (issuer)
    keyPeer2: req.body.key_peer2? req.body.key_peer2: null,           // apikey of peer 2 (holder)
    didPeer1:  req.body.did_peer1? req.body.did_peer1 : null,         // published short DID of issuer
    didPeer2:  req.body.did_peer2? req.body.did_peer2 : null,         // published short DID of holder
    validity:  req.body.validity? req.body.validity : gConfig.identus.validity,           // offer valid for x seconds (30d by defalut)
    claims:  req.body.claims? req.body.claims : {},                   // the claims to be issued in the VC
    noDuplicate: req.body.noDuplicate!=null ? !(req.body.noDuplicate==false || req.body.noDuplicate=="false") : true,   // no duplicate of issuance of same type
  });
});


module.exports = router;
