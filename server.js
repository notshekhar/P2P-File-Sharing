const app = require("./serverJS/app")
const { ExpressPeerServer } = require("peer")
const socketio = require("socket.io")
const socketHandler = require("./serverJS/socketHandler")
const initPeerServer = require("./peerServer")

require("dotenv").config()

initPeerServer()

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`listening to port -> ${server.address().port}`)
})

const io = socketio(server)
io.on("connection", socketHandler)

// app.use(
//     "/peerjs",
//     ExpressPeerServer(server, {
//         debug: true,
//     })
// )
