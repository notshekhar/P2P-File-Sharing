import * as Comlink from "./comlink.mjs"

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
let interval

let worker = new Worker("./js/worker.js")
const { handleDownloadData, getFileData, cleanMemory } = Comlink.wrap(worker)

const id = v4()

window.files = {}
window.file_loading = {}
window.file_metas = {}
window.colors = new Set()
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
window.connections = {}

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

peer.on("connection", async (connection) => {
    connection.on("data", (e) => {
        if (e.type != "data_chunk") console.log(e)
        if (e.type == "text") {
            addChat(e, true)
        } else if (e.type == "meta") {
            printFileMeta(e, true)
        } else if (e.type == "asking_data") {
            sendStream(e.file_id, e.from)
        } else if (e.type == "data_chunk") {
            // console.log(new Uint8Array(e.value))
            if (file_metas[e.file_id].download == true) {
                handleDownloadData(e, file_metas[e.file_id].size)
                showDownloadProgress(e)
            }
            if (e.done) downloadFile(e.file_id)
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
// let data = new Uint8Array()
function sendStream(file_id, to) {
    let file = files[file_id]
    let stream = file.stream()
    let reader = stream.getReader()
    reader.read().then(function processData({ done, value }) {
        if (done) {
            connections[to].connection.send({
                done,
                file_id,
                type: "data_chunk",
            })
            return
        }
        connections[to].connection.send({
            done,
            value,
            file_id,
            type: "data_chunk",
        })
        reader.read().then(processData)
    })
    // console.log(files[file_id], to)
}
async function downloadFile(fid) {
    startLoading(fid)
    let data = await getFileData(fid)
    hideLoading(fid)
    let meta = file_metas[fid]
    let downloadButon = document.querySelector(
        `#_${meta.id} > .body > .down-cancel > ._down`
    )
    downloadButon.innerHTML = "Save Again"
    downloadButon.onclick = () => {
        download(data, meta.name, meta.type)
    }
    download(data, meta.name, meta.type)
    hideDownloadProgress(fid)
}
function startLoading(fid) {
    let downloadButon = document.querySelector(
        `#_${fid} > .body > .down-cancel > ._down`
    )
    let dot = 1
    file_loading[fid].interval = setInterval(() => {
        let str = ""
        for (let i = 0; i < dot; i++) {
            str += "."
        }
        downloadButon.innerHTML = str
        dot++
        dot = (dot % 4) + 1
    }, 300)
}
function hideLoading(fid) {
    clearInterval(file_loading[fid].interval)
}

function showDownloadProgress(e) {
    let progress = document.querySelector(`#_${e.file_id} > .body > .progress`)
    let bar = progress.querySelector(".bar")
    if (!e.done) {
        if (!file_loading[e.file_id].recieved)
            file_loading[e.file_id].recieved = e.value.byteLength
        else file_loading[e.file_id].recieved += e.value.byteLength

        let recieved = file_loading[e.file_id].recieved
        let total = file_loading[e.file_id].totalBytes

        bar.style.width = `${(recieved / total) * 100}%`
    }
    progress.style.display = "block"
}
function hideDownloadProgress(fid) {
    let progress = document.querySelector(`#_${fid} > .body > .progress`)
    progress.remove()
}
function download(data, filename, type) {
    let blob = new Blob([data], { type })
    let url = URL.createObjectURL(blob)
    // window.open(url)
    let a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
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
    clearInterval(interval)
}
function hideTools() {
    let send_div = document.querySelector(".send")
    let history_div = document.querySelector(".history")
    let waiting = document.querySelector(".waiting")
    send_div.style.display = "none"
    history_div.style.display = "none"
    waiting.style.display = "block"
    let dots = 0
    interval = setInterval(() => {
        let text = "Waiting for user to connect"
        for (let i = 0; i < dots; i++) {
            text += "."
        }
        waiting.innerHTML = text
        dots++
        dots %= 5
    }, 200)
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
    let icon = document.createElement("div")
    icon.classList.add("icon")
    icon.style.backgroundColor = e ? connections[meta.from].color : "black"
    let body = document.createElement("div")
    body.classList.add("body")
    let title = document.createElement("div")
    title.classList.add("title")
    title.innerHTML = meta.name
    let size_div = document.createElement("div")
    size_div.classList.add("size")
    size_div.innerHTML = size
    body.append(title, size_div)
    if (e) {
        file_metas[meta.id] = meta
        file_metas[meta.id].download = true
        file_loading[meta.id] = { totalBytes: meta.size }
        let progress = document.createElement("div")
        progress.classList.add("progress")
        let progress_loading = document.createElement("div")
        progress_loading.classList.add("bar")
        progress.append(progress_loading)
        let down_cancel = document.createElement("div")
        down_cancel.classList.add("down-cancel")

        let download = document.createElement("button")
        download.classList.add("_down")
        download.innerHTML = "Download"

        download.onclick = () =>
            connections[meta.from].connection.send({
                type: "asking_data",
                file_id: meta.id,
                from: id,
            })

        let cancel = document.createElement("button")
        cancel.classList.add("_cancel")
        cancel.innerHTML = "Cancel"
        cancel.addEventListener("click", async () => {
            file_metas[meta.id].download = false
            div.remove()
            cleanMemory(meta.id)
        })

        down_cancel.append(download, cancel)
        body.append(progress, down_cancel)
    }
    div.append(icon, body)
    history.prepend(div)
}
function calculateSize(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// async function init() {
//     let a = await handleDownloadData(123)
//     console.log(a)
// }
// init()
// #2f0000
