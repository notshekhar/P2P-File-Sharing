const express = require("express")

const cookieParser = require("cookie-parser")
const logger = require("morgan")
const { errorHandler } = require("./error")

const app = express()

app.use(express.json({ limit: "1mb" }), cookieParser(), logger("dev"))
app.use(express.static("public"))
app.set("view engine", "ejs")

app.get("/", async (req, res, next) => {
    try {
        let str =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
        let id = "xxx-xx-xx".replace(
            /x/g,
            (e) => str[Math.floor(Math.random() * str.length)]
        )
        console.log(id)
        res.redirect(`/${id}`)
    } catch (err) {
        next(err)
    }
})
app.get("/:id", async (req, res, next) => {
    let { id } = req.params
    res.render("index", { id })
})

app.use(errorHandler)
module.exports = app
