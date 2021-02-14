const express = require("express")

const cookieParser = require("cookie-parser")
const logger = require("morgan")

const { errorHandler } = require("./error")
const { InsertRoom, FindRoom } = require("./db")

const app = express()

app.use(express.json({ limit: "1mb" }), cookieParser(), logger("dev"))
app.use(express.static("public"))
app.set("view engine", "ejs")

app.get("/", async (req, res, next) => {
    res.render("new")
})

function generateID() {
    let str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    let id = "xxx-xx-xx".replace(
        /x/g,
        (e) => str[Math.floor(Math.random() * str.length)]
    )
    return id
}
app.get("/offline", (req, res) => {
    res.render("offline")
})
app.get("/new/room/create", async (req, res, next) => {
    try {
        let id = ""
        while (true) {
            id = generateID()
            let room = await FindRoom(id)
            if (!room) break
        }
        InsertRoom(id)
        res.redirect(`/${id}`)
    } catch (err) {
        next(err)
    }
})
app.get("/:id", async (req, res, next) => {
    let { id } = req.params
    let room = await FindRoom(id)
    if (room) res.render("index", { id })
    else res.render("new")
})

app.use(errorHandler)
module.exports = app
