const express = require('express');
const router = express.Router();
const path = require('path');
const routeUtils = require('./route_utils');
const ui = require('../ui');

/*
 *      UI routes
 */

// homepage
router.get("/", function(req, res, next) {
    res.sendFile(path.join(__dirname, '../../static_website', 'index.html'));
});

router.get("/static/entities", function(req, res, next) {
    ui.pageEntity(req, res, next);
});

/*
router.get("/static/identities", function(req, res, next) {
    res.sendFile(path.join(__dirname, '../../static_website', 'identities.html'));
});

router.get("/static/credentials", function(req, res, next) {
    res.sendFile(path.join(__dirname, '../../static_website', 'credentials.html'));
});
*/

module.exports = router;
