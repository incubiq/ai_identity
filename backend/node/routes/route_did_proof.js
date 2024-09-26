
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvIdentusProof = require("../utils/util_identus_proof");

// all routes here start with               api/v1/proof/

/*
 *      VC: proof
 */

// GET all VC presentation requests (point of view of Issuer or of Holder)
router.get("/presentations", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusProof.async_getAllVCPresentationRequests, {
    thid: req.query.thid && req.query.thid!="null"? req.query.thid: null,                   // thid in the query?
    status: req.query.status? req.query.status: null,             // status in the query?
    key: req.headers.apikey? req.headers.apikey: null             // apikey to get in the header...
  });
});

// GET first presentation request (or proof) that matches a type (point of view of Holder)
router.get("/presentation/match/:type", function(req, res, next) {
  routeUtils.apiGet(req, res, srvIdentusProof.async_getFirstHolderPresentationRequestMatchingType, {
    key: req.headers.apikey? req.headers.apikey: null,             // apikey to get in the header...,
    claim_type: req.params.type,
    status: req.query.status? req.query.status: null               // keep null to get proofs, or pass a status (e.g. RequestReceived) to get those pending requests
  });
});

// POST - create a VC presentation request (from verifier to holder)
router.post("/presentation", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusProof.async_createVCPresentationRequest, {
    connection: req.body.connection? req.body.connection: null,               // the connectionId between verifier and prover (compulsory)
//    proofs: req.body.proofs? req.body.proofs: [],                             // all proof properties the verifier is asking
    challenge: req.body.challenge? req.body.challenge: null,                  // text : claim_type that verifier wants to ask for (holder will have to provide a record creds of same claim_type)
    domain: req.body.domain? req.body.domain: null,                           // domain where this VC applies to (compulsory / point of view of verifier)
    key: req.headers.apikey? req.headers.apikey: null         // apikey (of verifier) to get in the header...
  });
});

// POST - accept a VC presentation request (from holder)
router.post("/presentation/accept", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusProof.async_acceptVCPresentation, {
    presentationId: req.body.presentationId? req.body.presentationId: null,     // the id of the presentation from holder point of view (compulsory)
    recordId: req.body.recordId? req.body.recordId: null,        // the recordId of the VC we will provide as proof (as holder)
    key: req.headers.apikey? req.headers.apikey: null            // apikey (of verifier) to get in the header...
  });
});

// GET final VC proof (point of view of Issuer)
router.patch("/presentation/:id", function(req, res, next) {
  routeUtils.apiPatch(req, res, srvIdentusProof.async_issueVCProof, {
    presentationId: req.params.id? req.params.id: null,                   // the id of the presentation from verifier point of view (compulsory)
    key: req.headers.apikey? req.headers.apikey: null         // apikey to get in the header...
  }, {});
});

// POST - will do a full request + accept + issue proof (custodial mode)
router.post("/presentation/custodial", function(req, res, next) {
  routeUtils.apiPost(req, res, srvIdentusProof.async_createCustodialProof, {
    connection: req.body.connection? req.body.connection: null,       // the connectionId between verifier and prover (compulsory)
    keyPeer1: req.body.key_peer1? req.body.key_peer1: null,           // apikey of peer 1 (verifier)
    keyPeer2: req.body.key_peer2? req.body.key_peer2: null,           // apikey of peer 2 (prover)
//    proofs: req.body.proofs? req.body.proofs: "",                     // comma separated list of all proof properties the verifier is asking
    claim_type:  req.body.claim_type? req.body.claim_type: null,        // the type that the VC must contain for a match (eg : "identity")
    domain: req.body.domain? req.body.domain: null,                   // domain where this VC applies to (compulsory / point of view of verifier - unused??)
    noDuplicate: req.body.noDuplicate!=null? !(req.body.noDuplicate==false || req.body.noDuplicate=="false") : true,   // no duplicate of issuance of same type
    thid: req.body.thid? req.body.thid: null                          // to force the use of a specific credential in the proof (otherwise, first available is taken)
  });
});

module.exports = router;
