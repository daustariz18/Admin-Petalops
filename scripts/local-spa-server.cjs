const http = require('http')
const fs = require('fs')
const path = require('path')

const distDir = path.join(process.cwd(), 'dist')
const host = '127.0.0.1'
const port = Number(process.env.PORT || 5500)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const contentType = contentTypes[ext] || 'application/octet-stream'
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  })
  fs.createReadStream(filePath).pipe(res)
}

function serveIndex(res) {
  sendFile(res, path.join(distDir, 'index.html'))
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0])
  const filePath = path.join(distDir, pathname)

  if (pathname === '/' || pathname === '') {
    return serveIndex(res)
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendFile(res, filePath)
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html')
    if (fs.existsSync(indexPath)) {
      return sendFile(res, indexPath)
    }
  }

  return serveIndex(res)
})

server.listen(port, host)
