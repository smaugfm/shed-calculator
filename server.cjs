const express = require('express')
const path = require('path')

const root = path.join(__dirname, 'dist')
const port = Number(process.env.PORT) || 80

const app = express()
// Content-hashed assets cache hard; index.html is served fresh by the fallback below.
app.use(express.static(root, { index: false, maxAge: '1y' }))
app.use((_req, res) => res.sendFile(path.join(root, 'index.html')))
app.listen(port, () => console.log(`shed-calculator listening on :${port}`))
