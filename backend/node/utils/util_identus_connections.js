
/*
 *       Calls to Identus / Atala Prism agent / Connections
 */

const srvIdentusUtils = require("./util_identus_utils");
const axios = require('axios').default;

/*
 *       p2p connections
 */

// get all active connnections for the authenticated entity
const async_getAllConnectionsForEntity = async function(objParam) {
    try {  
        // get all connections
        let responseP2P = await axios.get(getIdentusAgent()+ "connections", {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// get a specific connnection (by ID) for the authenticated entity
const async_getConnectionById = async function(objParam) {
    try {  
        // get this connection
        let responseP2P = await axios.get(getIdentusAgent()+ "connections/"+objParam.id, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// create a p2p connection invite by the authenticated entity
const async_createInvite = async function(objParam) {
    try {  
        // create a connection request
        let responseP2P = await axios.post(getIdentusAgent()+ "connections", {
            label: "p2p initiated by " + objParam.from+ " for "+objParam.to,
            goalcode: "p2p",
            goal: "p2p connection"
        }, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}

// accept a p2p connection invite (by the authenticated entity)
const async_acceptInvite = async function(objParam) {
    try {  
        // accept a connection request
        let responseP2P = await axios.post(getIdentusAgent()+ "connection-invitations", {
            invitation: objParam.invitation,
        }, {
            headers: srvIdentusUtils.getEntityHeader(objParam.key)
        });

        return {
            data: responseP2P.data
        }
    }
    catch(err)  {
        throw err;
    }
}

module.exports = {
    async_getAllConnectionsForEntity,
    async_getConnectionById,
    async_createInvite,
    async_acceptInvite,
}