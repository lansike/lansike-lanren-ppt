// 本地网页 + HTTP 接口（只监听 127.0.0.1）
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { build, createDeck, ingestVideo, summary } from './deck.mjs'
import { watchInbox } from './inbox.mjs'
import { loadConfig, saveConfig } from './llm.mjs'
import { DECKS, INBOX, ORDERS, ROOT, TEMPLATES } from './paths.mjs'
import { applyUpdate, checkOnStart, checkUpdate, setAuto, updateState } from './update.mjs'
import { DEFAULTS, LENGTHS, PURPOSES, SOURCES, STYLES, VIDEOS } from './presets.mjs'

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.md': 'text/plain; charset=utf-8' }
const notices = []

const readBody = req => new Promise((resolve, reject) => {
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => resolve(Buffer.concat(chunks)))
  req.on('error', reject)
})
const send = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)) }

// 静态文件；视频支持 Range，浏览器才能顺畅循环播放
function serveFile(req, res, file) {
  if (!existsSync(file) || !statSync(file).isFile()) return false
  const type = MIME[extname(file)] || 'application/octet-stream'
  const size = statSync(file).size
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
  if (range) {
    const start = range[1] ? +range[1] : 0
    const end = range[2] ? +range[2] : size - 1
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
    res.end(readFileSync(file).subarray(start, end + 1))
  }
  else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' })
    res.end(readFileSync(file))
  }
  return true
}
const inside = (base, rel) => { const p = normalize(join(base, rel)); return p.startsWith(base) ? p : null }

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`
  if (route === 'GET /api/state') {
    const c = loadConfig()
    return send(res, 200, { hasKey: !!c.apiKey, baseURL: c.baseURL, model: c.model, defaults: DEFAULTS, root: ROOT, update: updateState(),
      presets: { purposes: PURPOSES, sources: SOURCES, styles: STYLES, lengths: LENGTHS, videos: VIDEOS } })
  }
  if (route === 'POST /api/key') {
    const c = saveConfig(JSON.parse(await readBody(req) || '{}'))
    return send(res, 200, { hasKey: !!c.apiKey, baseURL: c.baseURL, model: c.model })
  }
  if (route === 'POST /api/update') {
    const b = JSON.parse(await readBody(req) || '{}')
    return send(res, 200, b.do === 'apply' ? applyUpdate() : b.do === 'check' ? await checkUpdate() : 'auto' in b ? setAuto(b.auto) : updateState())
  }
  if (route === 'POST /api/generate') {
    const body = JSON.parse(await readBody(req) || '{}')
    const file = body.file?.data ? { name: body.file.name || 'upload.pdf', buffer: Buffer.from(body.file.data, 'base64') } : null
    return send(res, 200, await createDeck(body, file))
  }
  if (route === 'POST /api/build') {
    const { id } = JSON.parse(await readBody(req) || '{}')
    await build(id)
    return send(res, 200, summary(id))
  }
  if (route === 'POST /api/ingest-video') {
    const id = url.searchParams.get('id')
    summary(id)
    const tmp = join(DECKS, id, '.upload.mp4')
    writeFileSync(tmp, await readBody(req))
    try { return send(res, 200, await ingestVideo(id, url.searchParams.get('page'), tmp)) }
    finally { unlinkSync(tmp) }
  }
  const m = /^GET \/api\/decks\/([\w-]+)$/.exec(route)
  if (m) return send(res, 200, { ...summary(m[1]), notices: notices.filter(n => n.id === m[1]).slice(-5) })
  send(res, 404, { error: '没有这个接口' })
}

export function startServer(port = 5210) {
  for (const d of [DECKS, ORDERS, INBOX]) mkdirSync(d, { recursive: true })
  watchInbox(n => { notices.push({ ...n, at: Date.now() }); console.log(`[inbox] ${n.ok ? '✓' : '✗'} ${n.file}：${n.message}`) })
  checkOnStart()

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url)
      const play = /^\/play\/([\w-]+)(\/.*)?$/.exec(url.pathname)
      if (play) {
        const dist = join(DECKS, play[1], 'dist')
        if (!play[2]) { res.writeHead(302, { Location: `/play/${play[1]}/` }); return res.end() }
        const f = inside(dist, decodeURIComponent(play[2]) === '/' ? 'index.html' : decodeURIComponent(play[2]))
        // 放映页：每 3 秒看一眼这份 PPT 有没有重新构建过（比如刚嵌了视频），有就刷新，停在当前页
        if (f === join(dist, 'index.html') && existsSync(f)) {
          const watch = `<script>setInterval(()=>fetch('/api/decks/${play[1]}').then(r=>r.json()).then(d=>{if(d.rev&&d.rev!==${summary(play[1]).rev})location.reload()}).catch(()=>{}),3000)</script>`
          res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' })
          return res.end(readFileSync(f, 'utf8').replace('</body>', `${watch}</body>`))
        }
        if (f && serveFile(req, res, f)) return
      }
      const order = /^\/data\/orders\/([^/]+\.md)$/.exec(url.pathname)
      if (order && serveFile(req, res, inside(ORDERS, decodeURIComponent(order[1])))) return
      const thumb = /^\/thumbs\/([\w-]+)\.jpg$/.exec(url.pathname)
      if (thumb && serveFile(req, res, join(TEMPLATES, thumb[1], 'thumb.jpg'))) return
      const f = inside(join(ROOT, 'web'), url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname))
      if (f && serveFile(req, res, f)) return
      res.writeHead(404); res.end('Not found')
    }
    catch (e) {
      console.error(e)
      send(res, e.status || 500, { error: e.message })
    }
  })
  server.requestTimeout = 0
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}
