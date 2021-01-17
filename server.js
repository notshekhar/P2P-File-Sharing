const app = require("./serverJS/app")

require("dotenv").config()

const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`listening to port -> ${server.address().port}`)
})
