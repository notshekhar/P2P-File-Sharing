const v4 = function () {
    var dt = Date.now()
    var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            var r = (dt + Math.random() * 16) % 16 | 0
            dt = Math.floor(dt / 16)
            return (c == "x" ? r : (r & 0x3) | 0x8).toString(16)
        }
    )
    return uuid
}

const root = document.querySelector(".root")
const id = v4()
let connectedUsers = new Set()

const peer = new Peer(id, {
    host: location.hostname,
    port: 3001,
    // path: "/peerjs",
    path: "/",
})
const socket = io("/")

peer.on("open", (id) => {
    socket.emit("join-room", ROOM_ID, id)
})
socket.on("user-joined", (uid) => {
    console.log(uid, "->", "joined room")
    root.innerHTML += `<br>${uid} -> joined room`
    socket.emit("confirmed-joined", uid, id)
    connectedUsers.add(uid)
})

socket.on("confirmed-joined", (uid) => {
    // console.log(uid)
    console.log("joined with user", "->", uid)
    root.innerHTML += `<br>${uid} -> joined room`
    connectedUsers.add(uid)
})
socket.on("user-disconnected", (uid) => {
    root.innerHTML += `<br>${uid} -> disconnected from room`
    connectedUsers.delete(uid)
})

root.innerHTML = "no user is connected"
