import * as Comlink from "./comlink.mjs"
import { deploy, max_users, peer_url } from "./config.js"

function queueTask(cb) {
    setTimeout(cb)
}
//
;(function () {
    const escape_string = (unsafe) =>
        unsafe.replace(/[^]/g, function (e) {
            return "&#" + e.charCodeAt(0) + ";"
        })

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
    const { handleDownloadData, getFileData, cleanMemory, downloadPercentage } =
        Comlink.wrap(worker)

    const id = v4()

    // let int = false
    // function setInterrupt(sec) {
    //     int = true
    //     setTimeout(() => (int = false), sec)
    // }
    window.files = {}
    window.file_metas = {}
    window.sendingFile = {}
    window.colors = new Set()
    window.sounds = {
        new_message: new Audio("./sounds/new_message.mp3"),
        new_file: new Audio("./sounds/new_file.mp3"),
    }

    function uniqueColor() {
        function hslToHex(h, s, l) {
            l /= 100
            const a = (s * Math.min(l, 1 - l)) / 100
            const f = (n) => {
                const k = (n + h / 30) % 12
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
                return Math.round(255 * color)
                    .toString(16)
                    .padStart(2, "0") // convert to Hex and prefix "0" if needed
            }
            return `#${f(0)}${f(8)}${f(4)}`
        }
        let c = hslToHex(Math.floor(Math.random() * 255), 100, 50)
        // let str = "0123456789abcdef"
        // c = c.replace(/x/g, (e) => str[Math.floor(Math.random() * str.length)])
        // while (true) {
        //     if (colors.has(c)) {
        //         c = c.replace(
        //             /x/g,
        //             (e) => str[Math.floor(Math.random() * str.length)]
        //         )
        //     } else {
        //         colors.add(c)
        //         break
        //     }
        // }
        return c
    }
    window.connections = {}

    const peer = new Peer(
        id,
        deploy == "dev"
            ? {
                  host: location.hostname,
                  port: 3001,
                  // path: "/peerjs",
                  path: "/",
              }
            : peer_url
    )
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
        if (max_users > Object.keys(connections).length) {
            socket.emit("confirmed-joined", uid, id)
            addConnection(uid)
            addUserDiv(uid)
            checkConnections()
        } else {
            socket.emit("room-full", uid)
        }
    })
    socket.on("room-full", () => {
        let p = confirm("Room is full, Create new Room")
        if (p) {
            window.location = window.location.origin
        }
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

    peer.on("error", (err) => {
        console.log(err)
    })
    peer.on("connection", async (connection) => {
        connection.on("error", (err) => {
            if (err.type == "disconnect") connection.reconnect()
        })
        connection.on("data", (e) => {
            if (e.type != "data_chunk") console.log(e)
            if (e.type == "text") {
                addChat(e, true)
            } else if (e.type == "meta") {
                printFileMeta(e, true)
            } else if (e.type == "asking_data") {
                sendingFile[e.file_id] = true
                queueTask(() => sendStream(e.file_id, e.from))
            } else if (e.type == "data_chunk") {
                // console.log(new Uint8Array(e.value))
                if (file_metas[e.file_id].download == true) {
                    handleDownloadData(e, file_metas[e.file_id].size)
                    showDownloadProgress(e.file_id)
                }
                if (e.done) downloadFile(e.file_id)
            } else if (e.type == "stop_sending_file_data") {
                stopSendingFile(e.file_id)
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
            queueTask(() =>
                peerSend({ message: value, from: id, type: "text" })
            )
            addChat({ message: value, from: id, type: "text" })
            // setInterrupt(100)
        }
    }
    function stopSendingFile(fid) {
        sendingFile[fid] = false
        // let div = document.querySelector(`#_${fid}`)
        // div.remove()
    }
    // let data = new Uint8Array()
    function sendStream(file_id, to) {
        let file = files[file_id]
        let stream = file.stream()
        let reader = stream.getReader()
        reader.read().then(function processData({ done, value }) {
            if (!sendingFile[file_id]) return
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
            //delay for some milisececonds
            // reader.read().then(processData)
            // let interval = setInterval(() => {
            //     if (!int) {
            //         setTimeout(() => reader.read().then(processData))
            //         clearInterval(interval)
            //     } else {
            //         console.log("not sending data")
            //     }
            // })
            queueTask(() => reader.read().then(processData))
        })
        // console.log(files[file_id], to)
    }
    async function downloadFile(fid) {
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
        downloadButon.disabled = true
        downloadButon.innerHTML = "..."
    }
    function hideLoading(fid) {
        let downloadButon = document.querySelector(
            `#_${fid} > .body > .down-cancel > ._down`
        )
        downloadButon.disabled = false
    }

    async function showDownloadProgress(fid) {
        let progress = document.querySelector(`#_${fid} > .body > .progress`)
        let speed_div = document.querySelector(`#_${fid} > .body > .speed`)
        let { per, speed, recieved } = await downloadPercentage(fid)
        // console.log(p)
        let bar = progress.querySelector(".bar")
        bar.style.width = `${per}%`
        progress.style.display = "block"
        speed_div.style.display = "block"
        speed_div.innerHTML = `${calculateSize(recieved)} - ${calculateSize(
            speed
        )}/SEC`
    }
    function hideDownloadProgress(fid) {
        let progress = document.querySelector(`#_${fid} > .body > .progress`)
        let speed = document.querySelector(`#_${fid} > .body > .speed`)
        progress.remove()
        speed.remove()
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
              }</div><div class="value">${escape_string(
                  chat.message
              )}</div></div>`
            : `<div class="icon" style="background-color:black"></div><div class="text"><div class="title">You</div><div class="value">${escape_string(
                  chat.message
              )}</div></div>`
        chat_body.prepend(message_div)
        if (r) PlayNewMessageSound()
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
        // setInterrupt(100)
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
        title.innerHTML = escape_string(meta.name)
        let size_div = document.createElement("div")
        size_div.classList.add("size")
        size_div.innerHTML = escape_string(size)
        body.append(title, size_div)
        if (e) {
            file_metas[meta.id] = meta
            file_metas[meta.id].download = true
            let progress = document.createElement("div")
            progress.classList.add("progress")
            let progress_loading = document.createElement("div")
            progress_loading.classList.add("bar")
            progress.append(progress_loading)

            let speed = document.createElement("div")
            speed.classList.add("speed")

            let down_cancel = document.createElement("div")
            down_cancel.classList.add("down-cancel")

            let download = document.createElement("button")
            download.classList.add("_down")
            download.innerHTML = "Download"

            download.onclick = () => {
                connections[meta.from].connection.send({
                    type: "asking_data",
                    file_id: meta.id,
                    from: id,
                })
                startLoading(meta.id)
            }

            let cancel = document.createElement("button")
            cancel.classList.add("_cancel")
            cancel.innerHTML = "Cancel"
            cancel.addEventListener("click", async () => {
                file_metas[meta.id].download = false
                div.remove()
                cleanMemory(meta.id)
                connections[meta.from].connection.send({
                    type: "stop_sending_file_data",
                    file_id: meta.id,
                })
            })

            down_cancel.append(download, cancel)
            body.append(progress, speed, down_cancel)
            PlayNewFileSound()
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

    function PlayNewMessageSound() {
        sounds.new_message.play()
    }
    function PlayNewFileSound() {
        sounds.new_file.play()
    }
    //add users prompt
    function init() {
        let hidden = true
        let add_btn = document.querySelector(".addUsers")
        add_btn.addEventListener("click", toggleShareDiv)

        let share_div = document.querySelector(".share")

        new QRCode(document.querySelector(".wrap > .qr_url > .qr "), {
            text: `${window.location}`,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H,
        })
        let input = document.querySelector(".wrap > .qr_url > .url > input")
        input.value = window.location
        let btn = document.querySelector(".wrap > .qr_url > .url > button")
        btn.addEventListener("click", () => {
            input.select()
            let c = document.execCommand("copy")
            if (c) n_message("copied")
        })
        input.addEventListener("click", () => {
            input.select()
            let c = document.execCommand("copy")
            if (c) n_message("copied")
        })
        let close_div = document.querySelector(".share > .close")
        let close_btn = document.querySelector(".share > .wrap > .cancel")
        close_div.addEventListener("click", toggleShareDiv)
        close_btn.addEventListener("click", toggleShareDiv)

        function toggleShareDiv() {
            share_div.style.display = hidden ? "block" : "none"
            hidden = !hidden
        }
    }
    init()

    function n_message(message) {
        let n_message = document.querySelector(".n_message")
        n_message.style.display = "block"
        n_message.innerHTML = message
        setTimeout(() => {
            n_message.style.display = "none"
        }, 2000)
    }

    let chat_display = false
    function toggleChat() {
        let chat = document.querySelector(".root > .chat")
        chat.classList.remove(chat_display ? "show_chat" : "hide_chat")
        chat.classList.add(chat_display ? "hide_chat" : "show_chat")
        chat_display = !chat_display
    }
    let new_messsage_div = document.querySelector(".new_message")
    let hide_chat_div = document.querySelector(".hideChat")
    new_messsage_div.addEventListener("click", toggleChat)
    hide_chat_div.addEventListener("click", toggleChat)
})()
