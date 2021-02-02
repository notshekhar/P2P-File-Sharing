const { PeerServer } = require("peer")
require("dotenv").config()

function initPeerServer() {
    const peerserver = PeerServer({
        port: 3001,
        path: "/",
    })
    peerserver.on("connection", (client) => {
        console.log(`Connection ${client.id}`)
    })
    peerserver.on("disconnect", (client) => {
        console.log(`Disconnected ${client.id}`)
    })
    console.log("peer server listening to PORT -> 3001")
}

module.exports = initPeerServer
