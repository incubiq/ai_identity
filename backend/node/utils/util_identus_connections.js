
/*
 *       Calls to Identus / Atala Prism agent / Connections
 */

const srvIdentusUtils = require("./util_identus_utils");

/*
 *       p2p connections
 */

// get all active connnections for the authenticated entity
const async_getAllConnectionsForEntity = async function(objParam) {
    return srvIdentusUtils.async_simpleGet("connections/", objParam.key);
}

// get a specific connnection (by ID) for the authenticated entity
const async_getConnectionById = async function(objParam) {
    return srvIdentusUtils.async_simpleGet("connections/"+objParam.id, objParam.key);
}

// create a p2p connection invite by the authenticated entity
const async_createInvite = async function(objParam) {
    return srvIdentusUtils.async_simplePost("connections/", objParam.key, {
        label: "p2p initiated by " + (objParam.from? objParam.from : "Anon"),
        goalcode: "p2p",
        goal: "p2p connection"
    });
}

// accept a p2p connection invite (by the authenticated entity)
const async_acceptInvite = async function(objParam) {
    return srvIdentusUtils.async_simplePost("connection-invitations/", objParam.key, {
        invitation: objParam.invitation
    });
}

module.exports = {
    async_getAllConnectionsForEntity,
    async_getConnectionById,
    async_createInvite,
    async_acceptInvite,
}