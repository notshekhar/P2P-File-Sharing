function socketHandler(s) {
    s.on("join-room", (room_id, user_id) => {
        s.join(room_id)
        s.join(user_id)
        s.to(room_id).broadcast.emit("user-joined", user_id)
        s.on("disconnect", () => {
            s.to(room_id).broadcast.emit("user-disconnected", user_id)
        })
    })
    s.on("room-full", (uid) => {
        s.to(uid).broadcast.emit("room-full")
    })
    s.on("confirmed-joined", (uid, id) => {
        console.log(uid, id)
        s.to(uid).broadcast.emit("confirmed-joined", id)
    })
}

module.exports = socketHandler
