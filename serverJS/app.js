const express = require("express")
const cookieParser = require("cookie-parser")
const logger = require("morgan")

app.use(express.json({ limit: "1mb" }), cookieParser(), logger)

const app = express()

module.exports = app
