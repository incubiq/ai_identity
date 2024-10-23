const express = require('express');
const router = express.Router();
const jsonwebtoken = require("jsonwebtoken");

const utilIdentity = require('../utils/util_identus_identity');
const utilConnection = require('../utils/util_identus_connections');
const utilProof = require('../utils/util_identus_proof');


/*
 *      Cookies
 */

    function getCookieName() {
        if(gConfig.isDebug) {
            return "jwt_DEBUG_token_"+gConfig.appName;
        }
        return "jwt_token_"+gConfig.appName;
    }

    // same site cookie info...
    function getCookieOptions() {
        var objOptions= {
            sameSite: "Lax"
        };
        if(!gConfig.isDebug){
            objOptions.secure=true;
        }
        return objOptions
    }

    // JWT signed payload to authenticate into SIWW
    async function async_addSecretToCookie(req) {
        try {
            const secret = req.body && req.body.secret? req.body.secret : null;
            dataPayload=await async_getInfoFromCookie(req, getCookieName());
            if(dataPayload && dataPayload.data) {
                dataPayload.data.aEntity.push({
                    id: req.params.id,
                    secret: secret
                })
            }
            else {
                dataPayload.data={
                    aEntity: [{
                        id: req.params.id,
                        secret: secret
                    }]}
            }
        
            return jsonwebtoken.sign(dataPayload.data, gConfig.cookieSecret, {
                expiresIn: gConfig.authentication_expire
            });    
        }
        catch(err) {throw err}
    }

    // read inside the cookie
    function getSecretsFromCookie(req, cookieName) {
        var token = null;
        if (req && req.cookies) {
            token = req.cookies[cookieName];
        }
        return token;
    }
    
    // read the details inside the cookie
    async function async_getInfoFromCookie (req, secret) {
        try {
            let token=getSecretsFromCookie(req, getCookieName());
            if(!token) {
                return {
                    data: null,
                    status: 401,
                    message: "no cookie found"
                };
            }

            return new Promise((resolve, reject) => {
                jsonwebtoken.verify(token, gConfig.cookieSecret, function(err, decoded){
                    if(err) {
                        return resolve({
                            data: null
                        });
                    }
                    else {
                        return resolve({
                            data: {aEntity: decoded.aEntity}
                        });
                    }
                });
            })
        }
        catch (err) {throw err}
    }

/*
 *      Extra with keys
 */

    // add keys to entities who have been set (in cookie)
    async function async_getEntitiesWithKeys(aKeys) {
        let dataA=await utilIdentity.async_getEntities();
        if(dataA && dataA.data) {
            for (var k=0; k<aKeys.length; k++) {
                let i=dataA.data.findIndex(function (x) {return x.id===aKeys[k].id});
                if(i!==-1) {
                    dataA.data[i].key=aKeys[k].secret;
                }
            }
        }
        return dataA.data;
    }

    async function async_getPrivateEntity(id, key) {
        try {
            let dataDid=null;
            let dataConnect=null;
            let dataProof=null;
            let dataE=await utilIdentity.async_getEntityById({
                entity: id
            });

            // we try to get the private info, but do not fail if cannot get
            if(dataE && dataE.data && key) {
                try {
                    dataDid=await utilIdentity.async_getDidForEntity({key: key})
                    if(dataDid.data && dataDid.data.length==0) {dataDid.data=null}
                }
                catch(err){}

                try {
                    dataConnect = await utilConnection.async_getAllConnectionsForEntity({key: key})
                    if(dataConnect.data && dataConnect.data.length==0) {dataConnect.data=null}
                }
                catch(err){}

                try {
                    dataProof = await utilProof.async_getAllVCPresentationRequests({key: key})
                    if(dataProof.data && dataProof.data.length==0) {dataProof.data=null}
                }
                catch(err){}
            }

            return {
                entity: dataE? dataE.data: null,
                aDid: dataDid? dataDid.data: null,
                aConnect: dataConnect? dataConnect.data: null,
                aProof: dataProof? dataProof.data: null,
            }
        }
        catch (err) {throw err}
    }

/*
 *      UI routes
 */

const renderError = function (req, res) {
    res.render("page_error",{
        config: gConfig,
        layout: 'layout',
        url: "/",
        metadata: {
            type: "article",
            pathname: req.route.path,
            author: gConfig.email,
            keywords: gConfig.appName,
            description: "",
            title: gConfig.appDisplayName,
            theme_color: gConfig.theme_color
        },
        param: {
        }
    });
}
// homepage
router.get("/", function(req, res, next) {
    res.render("page_home",{
        config: gConfig,
        layout: 'layout',
        url: "/",
        metadata: {
            type: "article",
            pathname: req.route.path,
            author: gConfig.email,
            keywords: gConfig.appName,
            description: "",
            title: gConfig.appDisplayName,
            theme_color: gConfig.theme_color
        },
        param: {
        }
    });
});

router.get("/static/entities", function(req, res, next) {
    async_getInfoFromCookie(req)
    .then(data=> {
        let _aKey=(data.data? data.data.aEntity: []);
        async_getEntitiesWithKeys(_aKey)
        .then(aE => {
            res.render("page_entities",{
                config: gConfig,
                layout: 'layout',
                url: "/entities",
                metadata: {
                    type: "article",
                    pathname: req.route.path,
                    author: gConfig.email,
                    keywords: gConfig.appName,
                    description: "",
                    title: gConfig.appDisplayName,
                    theme_color: gConfig.theme_color
                },
                param: {
                    items: aE
                }
            });
        })
        .catch(err => {throw err})    
    })
    .catch(err => {
        renderError(req, res)
    })
});

router.get("/static/entity/:id", function(req, res, next) {
    async_getInfoFromCookie(req)
    .then(data=> {
        let _aKey=(data.data? data.data.aEntity: []);
        let i=_aKey.findIndex(function (x) {return x.id===req.params.id});
        async_getPrivateEntity(req.params.id, (i!=-1? _aKey[i].secret : null))
        .then(obj => {
            obj.key= (i!=-1?_aKey[i].secret : null);
            res.render("page_entity",{
                config: gConfig,
                layout: 'layout',
                url: "/entity",
                metadata: {
                    type: "article",
                    pathname: req.route.path,
                    author: gConfig.email,
                    keywords: gConfig.appName,
                    description: "",
                    title: gConfig.appDisplayName,
                    theme_color: gConfig.theme_color
                },
                param: obj
            });

        })
        .catch(err => {
            renderError(req, res)
        })
    })
    .catch(err => {
        renderError(req, res)
    })
});

router.post("/static/entity/:id/secret", function(req, res, next) {
    // we need to test secret first (it it the correct one?)
    const secret = req.body && req.body.secret? req.body.secret : null;
    utilIdentity.async_getDidForEntity({
        key: secret
    })
    .then(data => {
        if (data.data.length>0) {
            async_addSecretToCookie(req)
            .then(_cookie => {
                res.cookie(getCookieName(), _cookie, getCookieOptions());       // store this cookie
                res.redirect("/static/entity/"+req.params.id);            
            })
            .catch(err => {throw err})
        }
    })
    .catch(err => {
        res.redirect("/static/entity/"+req.params.id);
    })

});

router.get("/static/identities/:entity", function(req, res, next) {
    async_getInfoFromCookie(req)
    .then(data=> {
        let _aKey=(data.data? data.data.aEntity: []);


        utilIdentity.async_getDidForEntity({
            did: req.params.entity,
            key: null
        })
        .then(aDid => {
            res.render("page_dids",{
                config: gConfig,
                layout: 'layout',
                url: "/identities",
                metadata: {
                    type: "article",
                    pathname: req.route.path,
                    author: gConfig.email,
                    keywords: gConfig.appName,
                    description: "",
                    title: gConfig.appDisplayName,
                    theme_color: gConfig.theme_color
                },
                param: {
                    items: aDid.data
                }
            });

        })
        .catch(err => {
            renderError(req, res)
        })
    })
});


module.exports = router;
