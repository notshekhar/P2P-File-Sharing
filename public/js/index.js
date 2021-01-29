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

let colors = new Set()
function uniqueColor() {
    let c = "#xxxxxx"
    let str = "0123456789abcdef"
    c = c.replace(/x/g, (e) => str[Math.floor(Math.random() * str.length)])
    while (true) {
        if (colors.has(c)) {
            c = c.replace(
                /x/g,
                (e) => str[Math.floor(Math.random() * str.length)]
            )
        } else {
            colors.add(c)
            break
        }
    }
    return c
}
let connectedUsers = {}

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
    // root.innerHTML += `<br>${uid} -> joined room`
    socket.emit("confirmed-joined", uid, id)
    addConnection(uid)
    addUserDiv(uid)
})

socket.on("confirmed-joined", (uid) => {
    console.log("joined with user", "->", uid)
    // root.innerHTML += `<br>${uid} -> joined room`
    addConnection(uid)
    addUserDiv(uid)
})
socket.on("user-disconnected", (uid) => {
    // root.innerHTML += `<br>${uid} -> disconnected from room`
    removeConnection(uid)
    removeUserDiv(uid)
})

peer.on("connection", (connection) => {
    connection.on("data", (e) => {
        if (e.type == "text") {
            addChat(e, true)
        }
    })
})

let message_send = document.querySelector(".chat > .input > button")
let input = document.querySelector(".chat > .input > input")

message_send.addEventListener("click", () => sendMessage())
input.addEventListener("change", () => sendMessage())

function sendMessage() {
    let value = input.value
    input.value = ""
    for (let key in connectedUsers) {
        let connection = connectedUsers[key].connection
        connection.send({ message: value, from: id, type: "text" })
    }
    addChat({ message: value, from: id, type: "text" })
}

function addChat(chat, r) {
    let chat_body = document.querySelector(".chat > .body")
    let message_div = document.createElement("div")
    message_div.classList.add("message")
    message_div.classList.add(r ? "message-recieved" : "message-sent")
    message_div.innerHTML = r
        ? `<div class="icon" style="background-color:${
              connectedUsers[chat.from].color
          }"></div><div class="text"><div class="title">${
              chat.from
          }</div><div class="value">${chat.message}</div></div>`
        : `<div class="icon" style="background-color:black"></div><div class="text"><div class="title">You</div><div class="value">${chat.message}</div></div>`
    chat_body.prepend(message_div)
}
// message = (type, data, id)
function addConnection(uid) {
    let connection = peer.connect(uid)
    connectedUsers[uid] = { connection, color: uniqueColor() }
}
function removeConnection(uid) {
    colors.delete(connectedUsers[uid].color)
    delete connectedUsers[uid]
}
function addUserDiv(id) {
    let user = document.querySelector(".users")
    let sampleName = id.toString().slice(0, 4)
    let div = document.createElement("div")
    div.id = `_${id}`
    div.style.backgroundColor = connectedUsers[id].color
    let span = document.createElement("span")
    span.innerHTML = sampleName + "..."
    div.append(span)
    user.append(div)
    //chat
    let chat_body = document.querySelector(".chat > .body")
    let message_div = document.createElement("div")
    message_div.classList.add("notification_message")
    message_div.innerHTML = `<span>${id}</span> is in the room`
    chat_body.prepend(message_div)
}
function removeUserDiv(id) {
    let uid = document.querySelector(`#_${id}`)
    uid.remove()
    //chat
    let chat_body = document.querySelector(".chat > .body")
    let message_div = document.createElement("div")
    message_div.classList.add("notification_message")
    message_div.innerHTML = `<span>${id}</span> left the room`
    chat_body.prepend(message_div)
}
