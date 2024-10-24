
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

// creates a p2p connection beetween 2 peers        !! warning: it could create another connection even if one already exists...
const async_createCustodialConnection = async function(objParam) {
    try {

        // create a connection (from point of view peer1)
        let _dataInvite=await async_createInvite({
            key: objParam.keyPeer1, 
            from: objParam.namePeer1 + " for "+objParam.namePeer2
        });

        // wait before this call (or it may very well fail)
        await srvIdentusUtils.wait(gConfig.identus.delay);

        // peer 2 accepts the connection invite
        let _oob=_dataInvite.data.invitation.invitationUrl.replace("https://my.domain.com/path?_oob=","");
        let _dataAccept= await async_acceptInvite({
            key: objParam.keyPeer2,
            invitation: _oob
        });
        let _connectionIdForInvitee=_dataAccept.data.connectionId;        

        // wait before this call (or it may very well fail)
        await srvIdentusUtils.wait(gConfig.identus.delay);

        // frompoint of view of peer1, get back the final connection and status
        let _dataFinal=await async_getConnectionById({
            key: objParam.keyPeer1,
            id: _dataInvite.data.connectionId
        });

        // send back important data
        return {data: {
            from: objParam.namePeer1,
            anonDidFrom: _dataFinal.data.myDid,            
            connection_id_from: _dataInvite && _dataInvite.data? _dataInvite.data.connectionId: null,

            to: objParam.namePeer2,
            anonDidTo: _dataFinal.data.theirDid,            
            connection_id_to: _connectionIdForInvitee,

            thid: _dataInvite.data.thid,
            isAccepted: _dataFinal.data.state == "ConnectionResponseSent"
        }}
    }
    catch(err) {
        throw err;
    }
}

module.exports = {
    async_getAllConnectionsForEntity,
    async_getConnectionById,
    async_createInvite,
    async_acceptInvite,
    async_createCustodialConnection
}