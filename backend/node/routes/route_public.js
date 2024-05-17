const express = require('express');
const router = express.Router();

/*
 *      Public routes
 */

// For checking we are running
router.get("/", function(req, res, next) {
    res.send({data: {
        status: "running",
        app: gConfig.appName,
        config: gConfig.env,
        host: gConfig.origin,
        version: gConfig.version,
        isDebug: gConfig.isDebug,
        isDocker: gConfig.isDocker,
    }});
});

// api call
router.get('/unauthorized_api', function (req, res, next) {
    res.status(401);
    res.json({
        data:null,
        status: 401,
        statusText: "What made you think you are authorized to call this?"
    });
});

module.exports = router;
