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

let files = {}
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
let connections = {}

const peer = new Peer(id, {
    host: location.hostname,
    port: 3001,
    // path: "/peerjs",
    path: "/",
})
const socket = io("/")

function peerSend(data) {
    for (let key in connections) {
        let connection = connections[key].connection
        connection.send(data)
    }
}

checkConnections()

peer.on("open", (id) => {
    socket.emit("join-room", ROOM_ID, id)
})
socket.on("user-joined", (uid) => {
    console.log(uid, "->", "joined room")
    // root.innerHTML += `<br>${uid} -> joined room`
    socket.emit("confirmed-joined", uid, id)
    addConnection(uid)
    addUserDiv(uid)
    checkConnections()
})

socket.on("confirmed-joined", (uid) => {
    console.log("joined with user", "->", uid)
    // root.innerHTML += `<br>${uid} -> joined room`
    addConnection(uid)
    addUserDiv(uid)
    checkConnections()
})
socket.on("user-disconnected", (uid) => {
    // root.innerHTML += `<br>${uid} -> disconnected from room`
    removeConnection(uid)
    removeUserDiv(uid)
    checkConnections()
})

peer.on("connection", (connection) => {
    connection.on("data", (e) => {
        console.log(e)
        if (e.type == "text") {
            addChat(e, true)
        } else if (e.type == "meta") {
            printFileMeta(e, true)
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
    if (value.length > 0) {
        peerSend({ message: value, from: id, type: "text" })
        addChat({ message: value, from: id, type: "text" })
    }
}

function checkConnections() {
    let keys = Object.keys(connections)
    if (keys.length < 1) hideTools()
    else showTools()
}

//show send_div
function showTools() {
    let send_div = document.querySelector(".send")
    let history_div = document.querySelector(".history")
    let waiting = document.querySelector(".waiting")
    send_div.style.display = "block"
    history_div.style.display = "block"
    waiting.style.display = "none"
}
function hideTools() {
    let send_div = document.querySelector(".send")
    let history_div = document.querySelector(".history")
    let waiting = document.querySelector(".waiting")
    send_div.style.display = "none"
    history_div.style.display = "none"
    waiting.style.display = "block"
}
function addChat(chat, r) {
    let chat_body = document.querySelector(".chat > .body")
    let message_div = document.createElement("div")
    message_div.classList.add("message")
    message_div.classList.add(r ? "message-recieved" : "message-sent")
    message_div.innerHTML = r
        ? `<div class="icon" style="background-color:${
              connections[chat.from].color
          }"></div><div class="text"><div class="title">${
              chat.from
          }</div><div class="value">${chat.message}</div></div>`
        : `<div class="icon" style="background-color:black"></div><div class="text"><div class="title">You</div><div class="value">${chat.message}</div></div>`
    chat_body.prepend(message_div)
}
// message = (type, data, id)
function addConnection(uid) {
    let connection = peer.connect(uid)
    connections[uid] = { connection, color: uniqueColor() }
}
function removeConnection(uid) {
    colors.delete(connections[uid].color)
    delete connections[uid]
}
function addUserDiv(id) {
    let user = document.querySelector(".users")
    let sampleName = id.toString().slice(0, 4)
    let div = document.createElement("div")
    div.id = `_${id}`
    div.style.backgroundColor = connections[id].color
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

//file handle
const drop_file = document.querySelector(".drop_file")
const file_input = document.querySelector(".drop_file > input")

file_input.onchange = (e) => {
    let file = file_input.files[0]
    sendFileMeta(file)
}

drop_file.onclick = (e) => {
    file_input.click()
}

drop_file.ondragover = (e) => {
    e.preventDefault()
    drop_file.classList.add("dragHover")
}
drop_file.ondragleave = (e) => {
    e.preventDefault()
    drop_file.classList.remove("dragHover")
}
drop_file.ondrop = (e) => {
    drop_file.classList.remove("dragHover")
    e.preventDefault()
    e.stopPropagation()
    file_input.files = e.dataTransfer.files
    let file = file_input.files[0]
    sendFileMeta(file)
}

function sendFileMeta(file) {
    let fid = v4()
    files[fid] = file
    let metaData = {
        id: fid,
        type: "meta",
        fileType: file.type,
        name: file.name,
        size: file.size,
        from: id,
    }
    peerSend(metaData)
    printFileMeta(metaData)
}

function printFileMeta(meta, e) {
    let history = document.querySelector(".history")
    let div = document.createElement("div")
    div.id = `_${meta.id}`
    div.classList.add("file_card")
    let size = calculateSize(meta.size)
    if (e)
        div.innerHTML = `<div class="icon" style="background-color:${
            connections[meta.from].color
        }"></div><div class="body"><div class="title">${
            meta.name
        }</div><div class="size">${size}</div><div class="down-cancel"><button class="_down">Download</button><button class="_cancel">Cancel</button></div></div>`
    else
        div.innerHTML = `<div class="icon" style="background-color:black"></div><div class="body"><div class="title">${meta.name}</div><div class="size">${size}</div></div>`
    history.prepend(div)
}
function calculateSize(bytes) {
    let sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    if (bytes == 0) return "0 Byte"
    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
    return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i]
}

// #2f0000
