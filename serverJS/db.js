const nedb = require("nedb-promise")
let rooms = nedb({ filename: "rooms.db", autoload: true })

async function InsertRoom(id) {
    rooms.insert({ id })
}

async function FindRoom(id) {
    let room = rooms.findOne({ id })
    return room
}

module.exports = {
    InsertRoom,
    FindRoom,
}
