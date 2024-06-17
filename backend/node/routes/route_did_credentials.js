
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
    aTag:  req.body.aTag? req.body.aTag : [],               // array of tag strings
    schema:  req.body.schema? req.body.schema : null,       // location of the schema (eg : https://<identity_repo>/assets/credentials/<name>.json)
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

/*
 *      VC: offer / acceptance / issuance
 */

// POST VC offer 
router.post("/offer", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_createVCOffer, {
    name:  req.body.name? req.body.name : null,             // name for this definition (compulsory)
    version: req.body.version? req.body.version : "1.0.0",  // version for this definition (optional)
    description:  req.body.description? req.body.description : null,     // description for this definition (compulsory)
    author:  req.body.author? req.body.author : null,       // published short DID of author for this definition (compulsory)
    aTag:  req.body.aTag? req.body.aTag : [],               // array of tag strings
    schema:  req.body.schema? req.body.schema : null,       // location of the schema (eg : https://<identity_repo>/assets/credentials/<name>.json)
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// GET all issued records, ie pending VC offers (point of view of Issuer or of Receiver)
router.get("/offers", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getAllVCPendingOffers, {
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// GET a specific pending VC offer (point of view of Issuer or of Receiver)
router.get("/offer/:id", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getVCPendingOffer, {
    id: req.params.id? req.params.id: null,                    // id of the pending offer to search for (compulsory)
    key: req.headers.apikey? req.headers.apikey: null                // apikey to get in the header...
  });
});


// POST VC accept 
router.post("/accept", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_acceptVCOffer, {
    id: req.body.id? req.body.id: null,                       // id of the pending offer to accept (compulsory / point of view of receiver)
    did:  req.body.did? req.body.did : null,                  // did of the VC offer doc (compulsory)
    key: req.headers.apikey? req.headers.apikey: null         // apikey to get in the header...
  });
});

// POST VC issue 
router.post("/issue", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_issueVC, {
    id: req.body.id? req.body.id: null,                       // id of the pending offer to accept (compulsory / point of view of issuer)
    key: req.headers.apikey? req.headers.apikey: null         // apikey to get in the header...
  });
});

/*
 *      VC: proof
 */

// GET all VC presentation requests (point of view of Issuer or of Receiver)
router.get("/presentations", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getAllVCPresentationRequests, {
    key: req.headers.apikey? req.headers.apikey: null                    // apikey to get in the header...
  });
});

// GET one specific VC presentation request (point of view of Issuer or of Receiver)
router.get("/presentation/:thid", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getVCPresentationRequestByThid, {
    thid: req.params.thid? req.params.thid: null,                    // thid of presentation req to search for (compulsory / point of view of issuer or receiver)
    key: req.headers.apikey? req.headers.apikey: null                // apikey to get in the header...
  });
});

// POST - create a VC presentation request (from verifier to holder)
router.post("/presentation", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_createVCPresentationRequest, {
    connectionId: req.body.connectionId? req.body.connectionId: null,         // the connectionId between verifier and prover (compulsory)
    challenge: req.body.challenge? req.body.challenge: null,                  // a text string for the prover (compulsory / point of view of verifier)
    domain: req.body.domain? req.body.domain: null,                           // domain where this VC applies to (compulsory / point of view of verifier)
    key: req.headers.apikey? req.headers.apikey: null         // apikey (of verifier) to get in the header...
  });
});

// POST - accept a VC presentation request (from holder)
router.post("/presentation/accept", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusCreds.async_acceptVCPresentation, {
    id: req.body.id? req.body.id: null,                       // the id of the presentation from holder point of view (compulsory)
    proofId: req.body.proofId? req.body.proofId: null,        // the proof to accept by holder (compulsory)
    key: req.headers.apikey? req.headers.apikey: null         // apikey (of verifier) to get in the header...
  });
});

// GET final VC proof (point of view of Issuer)
router.get("/proof/:id", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusCreds.async_getVCProof, {
    id: req.params.id? req.params.id: null,                   // the id of the presentation from verifier point of view (compulsory)
    key: req.headers.apikey? req.headers.apikey: null         // apikey to get in the header...
  });
});

module.exports = router;
