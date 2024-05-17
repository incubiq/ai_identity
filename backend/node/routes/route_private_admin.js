
const express = require('express');
const router = express.Router();
const routeUtils = require('./route_utils');

// all routes here start with               api/v1/private/admin/

/*
 *      Private routes (requires login)
 */

// -------------
//  admin
// -------------

// get authenticated admin details
router.get("/", function(req, res, next) {
    // todo
    routeUtils.apiGet(req, res, gConfig.app.apiAdmin.async_findAdmin.bind(gConfig.app.apiAdmin), {
        username: req.user.username? req.user.username : null,
    });
});


module.exports = router;
