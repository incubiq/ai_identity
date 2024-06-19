const services = require("../utils/util_services");

/*
 *      Utils to make route calls easier
 */

module.exports = {
    apiGet,
    apiPost,
    apiPatch,
    apiDelete,
    apiLink,
    apiUnlink,
    
    onError
};

function _error(res, objErr) {
    var status=objErr && objErr.status? objErr.status:500;
    let msg=objErr? (objErr.statusText? objErr.statusText: objErr.message) : "something went wrong"

    // specials identus...
    if(objErr.response && objErr.response.data && objErr.response.data.detail) {msg = msg + " - "+ objErr.response.data.detail}
    
    services.consoleLog(msg);    

    // return error
    res.status(status).send({
        data: null,
        status: status,
        message: msg
    });
}

function onError(res, objErr){
    return _error(res, objErr);
}

function apiGet(req, res, fnFind, objFind){
    if(objFind===undefined) {
        console.error("GET - PARAM REQUIRED");
        return _error(res, null);
    }

    fnFind(objFind)
        .then(function(data){
            if(data && (data.data==null && data.status!=null)) {
                res.status(data.status);
            }
            res.set('Cache-Control', 'public, max-age=31557600');           // cache this call for a long time....
            res.setHeader("Content-Type", 'application/json');
            res.json(data);
        })
        .catch(function(objErr){
            _error(res, objErr);
        });
}

function apiPost(req, res, fnCreate, objCreate){
    if(objCreate===undefined) {
        console.error("POST - PARAM REQUIRED");
        return _error(res, null);
    }

    fnCreate(objCreate)
        .then(function(data){
            if (data.data) {
                res.status(201);            // resource was created
            }
            res.setHeader("Content-Type", 'application/json');
            res.json(data);
        })
        .catch(function(objErr){
            _error(res, objErr);
        });
}

function apiPatch(req, res, fnUpdate, objFind, objUpdate){
    if(objFind===undefined || objUpdate===undefined) {
        console.error("PATCH - PARAM REQUIRED");
        return _error(res, null);
    }

    fnUpdate(objFind, objUpdate)
        .then(function(data){
            res.setHeader("Content-Type", 'application/json');
            res.json(data);
        })
        .catch(function(objErr){
            _error(res, objErr);
        });
}

function apiDelete(req, res, fnDelete, objFind){
    if(objFind===undefined ) {
        console.error("DELETE - PARAM REQUIRED");
        return _error(res, null);
    }

    fnDelete(objFind)
        .then(function(data){
            res.status(204);            // resource was deleted
            res.setHeader("Content-Type", 'application/json');
            res.json(data);
        })
        .catch(function(objErr){
            _error(res, objErr);
        });
}

function apiLink(req, res, fnLink, objLink){
    if(objLink===undefined ) {
        console.error("LINK - PARAM REQUIRED");
        return _error(res, null);
    }

    fnLink(objLink)
        .then(function(data){
            res.status(200);
            res.setHeader("Content-Type", 'application/json');
            res.json(data);
        })
        .catch(function(objErr){
            _error(res, objErr);
        });
}

function apiUnlink(req, res, fnUnlink, objUnlink){
    if(objUnlink===undefined ) {
        console.error("UNLINK - PARAM REQUIRED");
        return _error(res, null);
    }

    fnUnlink(objUnlink)
        .then(function(data){
            res.status(200);
            res.setHeader("Content-Type", 'application/json');
            res.json(data);
        })
        .catch(function(objErr){
            _error(res, objErr);
        });
}