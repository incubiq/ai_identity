
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');
const srvCardano = require("../utils/util_cardano");

// all routes here start with               api/v1/wallet/

/*
 *      Identity routes
 */

// generate a random seed phrase
router.post("/mnemonic", function(req, res, next) {
  routeUtils.apiPost(req, res, srvCardano.generateSeedPhrase, {    
  });
});

// get a wallet from seed mnemonic
router.get("/:mnemonic", function(req, res, next) {
  routeUtils.apiGet(req, res, srvCardano.getWalletDetails, {
    mnemonic: req.params.mnemonic? req.params.mnemonic: null
  });
});

module.exports = router;
