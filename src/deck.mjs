// 生成流程：选项 + 材料 → 大纲 → 幻灯片 JSON → 按模板写出 Slidev 文稿 → 静态构建；以及视频需求单和视频嵌入。
import { spawn } from 'node:child_process'
import { closeSync, copyFileSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createRequire } from 'node:module'
import { chatJSON } from './llm.mjs'
import { DECKS, ORDERS, TEMPLATES } from './paths.mjs'
import { LENGTHS, PURPOSES, STYLES, byId, normalizeOptions } from './presets.mjs'

const TYPES = ['cover', 'points', 'bars', 'number', 'quote', 'compare', 'end']
const MAX_MATERIAL = 24000
const pageId = n => `P${String(n).padStart(2, '0')}`
const deckDir = id => join(DECKS, id)

// ---------- 材料 ----------

export async function extractText(name, buf) {
  const ext = extname(name).toLowerCase()
  if (ext === '.pdf') {
    const { extractText: pdfText, getDocumentProxy } = await import('unpdf')
    const { text } = await pdfText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: true })
    return text
  }
  if (ext === '.docx') {
    const mammoth = (await import('mammoth')).default
    return (await mammoth.extractRawText({ buffer: buf })).value
  }
  if (ext === '.txt' || ext === '.md') return buf.toString('utf8')
  throw new Error(`不支持的文件类型 ${ext}：请上传 PDF 或 Word（.docx）`)
}

// ---------- 提示词 ----------

const SCHEMA = `每页的 JSON 结构（按 type 选字段）：
- cover：{"type":"cover","kicker":"英文小标，如 WORK REPORT · 2026","title":"主标题","subtitle":"一句副标题"}
- points：{"type":"points","kicker":"英文小标，如 PART 01 · PROGRESS","title":"标题","subtitle":"可选","items":[{"head":"要点","text":"可选的一句补充"}]}（2～4 条）
- bars：{"type":"bars","kicker":"…","title":"标题","subtitle":"可选","bars":[{"label":"名称","value":数字,"unit":"单位如 % 或 万"}]}（3～6 条）
- number：{"type":"number","kicker":"…","value":"大数字如 51%","title":"这个数字说明什么","subtitle":"可选"}
- quote：{"type":"quote","kicker":"…","quote":"一句金句或核心结论","by":"出处，可选"}
- compare：{"type":"compare","kicker":"…","title":"标题","left":{"head":"左侧名","items":["…"]},"right":{"head":"右侧名","items":["…"]}}（每侧 2～4 条）
- end：{"type":"end","title":"结尾大字，如 谢谢 / 下一步","subtitle":"一句收尾"}
每页另外都要有：
- "visual"：给这一页配一段 5～8 秒、16:9 短视频的画面说明（主体、动作、镜头运动、色调；画面里不出现文字）
- "notes"：讲这一页时可以说的 1～3 句讲稿`

const RULES = `硬性要求：
- 第 1 页必须是 cover，最后一页必须是 end；中间各页的类型要有变化，不要连续三页同一类型。
- 少字：每页可见文字尽量不超过 25 个字，最多不超过 50 个字；标题不超过 14 个字。
- 不编造数字：bars 和 number 只在材料里给了真实数字时才用；没有就改用 points、quote 或 compare。
- 全部用简体中文（kicker 用大写英文）。只输出 JSON，不要任何解释。`

function materialOf(opts, material) {
  if (opts.source === 'file') return `用户上传的文档内容（节选）：\n${material.slice(0, MAX_MATERIAL)}`
  if (opts.source === 'outline') return `用户粘贴的大纲：\n${opts.text}`
  return `用户的一句话主题：${opts.text || '（用户没有填写，请根据用途自拟一个常见、通用的主题）'}`
}

async function makeOutline(opts, material) {
  const purpose = byId(PURPOSES, opts.purpose)
  const len = byId(LENGTHS, opts.length)
  return chatJSON(
    `你是资深演示文稿策划，擅长把零散想法变成一份结构清晰、少字、有冲击力的 PPT。\n${RULES}`,
    `用途：${purpose.name}。${purpose.hint}\n篇幅：${len.min}～${len.max} 页。\n${materialOf(opts, material)}\n\n` +
    `先规划大纲，输出 {"title":"整份 PPT 的标题","pages":[{"type":"${TYPES.join('|')}","point":"这一页讲什么（一句话）"}]}`,
  )
}

async function makeSlides(opts, material, outline) {
  const purpose = byId(PURPOSES, opts.purpose)
  return chatJSON(
    `你是演示文稿撰稿人，按给定大纲逐页写出幻灯片内容。\n${SCHEMA}\n${RULES}`,
    `用途：${purpose.name}。${purpose.hint}\n${materialOf(opts, material)}\n\n大纲：\n${JSON.stringify(outline)}\n\n` +
    `按大纲逐页写，输出 {"title":"整份标题","slides":[…每页一个对象…]}`,
  )
}

// ---------- 整理与渲染 ----------

// 兼容模型常见的格式偏差：要点写成字符串、数字写成 "52%"、对比项写成对象
const str = x => typeof x === 'string' ? x : x?.head || x?.text || ''
const side = x => x && { head: str(x.head ?? x.title), items: (x.items || []).map(str) }
function tidySlides(raw) {
  const arr = (Array.isArray(raw) ? raw : []).filter(s => s && typeof s === 'object')
    .map(s => ({
      ...s,
      type: TYPES.includes(s.type) ? s.type : 'points',
      ...(s.items && { items: s.items.map(it => typeof it === 'string' ? { head: it } : it) }),
      ...(s.bars && { bars: s.bars.map(b => ({ ...b, value: Number.parseFloat(b.value) || 0 })) }),
      ...(s.left && { left: side(s.left), right: side(s.right) }),
    }))
  if (!arr.length) throw new Error('没有写出幻灯片（slides 为空或格式不对），请再试一次')
  if (arr[0]?.type !== 'cover') arr.unshift({ type: 'cover', title: arr[0]?.title || '' })
  if (arr.at(-1).type !== 'end') arr.push({ type: 'end', title: '谢谢' })
  return arr
}

// 选视频页：封面固定；「封面加 2～3 页」再从中间内容页里均匀挑
function pickVideoPages(slides, opts) {
  if (opts.video === 'none') return []
  const pages = [1]
  if (opts.video === 'more') {
    const k = byId(LENGTHS, opts.length).videoPages
    const mid = slides.map((s, i) => i + 1).slice(1, -1)
    for (let j = 1; j <= k && mid.length; j++) pages.push(mid[Math.floor((j * mid.length) / (k + 1))])
  }
  return [...new Set(pages)]
}

const safeNote = s => String(s || '').replace(/-->/g, '—>')

// 中文断行：用 Node 自带的 Intl.Segmenter（ICU 词典）切词，词之间插零宽空格作分隔（只留在 slides.md 里，模板的 Txt / Words 组件把它换成 <wbr> 或分组，页面上不出现），
// 配合模板里的 word-break: keep-all，只在词之间换行，不会把「上传」「复盘」拆到两行。ICU 偶尔把一个词切成单字（复|盘、上|传），连续单字并成一组，落单的单字贴到前一个词上。
const ZW = '\u200B'
const seg = new Intl.Segmenter('zh-CN', { granularity: 'word' })
const han = s => /^\p{Script=Han}$/u.test(s)
function phrases(t) {
  const segs = [...seg.segment(t)].map(x => x.segment)
  const out = []
  for (let i = 0; i < segs.length; i++) {
    let s = segs[i]
    if (han(s)) {
      while (han(segs[i + 1] ?? '')) s += segs[++i]
      if (s.length === 1 && out.length && /\p{Script=Han}$/u.test(out.at(-1))) { out[out.length - 1] += s; continue }
      if (s.length === 1 && i + 1 < segs.length) { segs[i + 1] = s + segs[i + 1]; continue }
    }
    out.push(s)
  }
  return out
}
const RAW = new Set(['type', 'kicker', 'value', 'unit'])
const wrapText = x => typeof x === 'string' ? phrases(x).join(ZW)
  : Array.isArray(x) ? x.map(wrapText)
    : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, RAW.has(k) ? v : wrapText(v)])) : x

function renderMarkdown(deck) {
  const total = deck.slides.length
  return deck.slides.map((s, i) => {
    const no = i + 1
    const v = deck.videos[pageId(no)]
    const { notes, visual, ...rest } = s
    // 还没放视频的页就用模板自带的版式，放了 mp4 才出视频位
    const data = { ...wrapText(rest), no, total, ...(v?.src ? { video: { page: pageId(no), src: v.src } } : {}) }
    const head = no === 1
      ? ['theme: none', `title: ${JSON.stringify(deck.title)}`, 'fonts:\n  provider: none', 'transition: lr', 'routerMode: hash',
          'canvasWidth: 1280', 'aspectRatio: 16/9', 'colorSchema: dark', 'info: false', 'download: false']
      : []
    return `---\n${[...head, `layout: lr-${s.type}`, `data: ${JSON.stringify(data)}`].join('\n')}\n---\n\n<!--\n${safeNote(notes)}\n-->\n`
  }).join('\n')
}

// 把模板（共用布局/组件 + 所选风格的样式）铺进 deck 目录，再写 slides.md
export function render(id) {
  const dir = deckDir(id)
  const deck = loadDeck(id)
  cpSync(join(TEMPLATES, '_shared', 'layouts'), join(dir, 'layouts'), { recursive: true })
  cpSync(join(TEMPLATES, '_shared', 'components'), join(dir, 'components'), { recursive: true })
  writeFileSync(join(dir, 'style.css'), readFileSync(join(TEMPLATES, '_shared', 'base.css'), 'utf8') + '\n' + readFileSync(join(TEMPLATES, deck.style, 'theme.css'), 'utf8'))
  writeFileSync(join(dir, 'slides.md'), renderMarkdown(deck))
}

// ---------- 构建 ----------

const SLIDEV = join(createRequire(import.meta.url).resolve('@slidev/cli/package.json'), '..', 'bin', 'slidev.mjs')
const building = new Map()

export function build(id) {
  if (!existsSync(join(deckDir(id), 'deck.json'))) throw new Error(`找不到 PPT：${id}`)
  const prev = building.get(id) || Promise.resolve()
  const run = prev.then(() => new Promise((resolve, reject) => {
    render(id)
    const p = spawn(process.execPath, [SLIDEV, 'build', 'slides.md', '--out', 'dist', '--base', `/play/${id}/`], { cwd: deckDir(id), stdio: ['ignore', 'pipe', 'pipe'] })
    let log = ''
    p.stdout.on('data', d => { log += d })
    p.stderr.on('data', d => { log += d })
    p.on('close', code => {
      if (code !== 0) return reject(new Error(`Slidev 构建失败：\n${log.slice(-1500)}`))
      // 记下构建版本，已经打开的放映页看到它变了就自动刷新（否则同一会话里还是旧的页面）
      saveDeck({ ...loadDeck(id), rev: Date.now() })
      resolve()
    })
  }))
  building.set(id, run.catch(() => {}))
  return run
}

// ---------- 视频需求单 ----------

function writeOrders(id) {
  const deck = loadDeck(id)
  const style = byId(STYLES, deck.style)
  mkdirSync(ORDERS, { recursive: true })
  return Object.keys(deck.videos).map(p => {
    const no = Number(p.slice(1))
    const s = deck.slides[no - 1]
    const file = `${id}_${p}.mp4`
    const words = [s.title, s.subtitle, s.quote, s.value].filter(Boolean).join(' / ')
    writeFileSync(join(ORDERS, `${id}_${p}.md`), `# 视频需求单 · ${deck.title} · 第 ${no} 页

| 项目 | 要求 |
|---|---|
| PPT | ${deck.title}（编号 \`${id}\`） |
| 页码 | 第 ${no} 页（${p}）${no === 1 ? '· 封面' : ''} |
| 时长 | 5～8 秒，首尾能自然循环 |
| 画幅 | 16:9（建议 1920×1080），mp4（H.264） |
| 声音 | 不需要，播放时静音 |
| 色调 | 「${style.name}」风格，主色 ${style.colors.join(' ')}，整体偏暗 |

## 画面说明

${s.visual || '围绕本页主题的一段慢节奏氛围镜头，主体清晰，镜头缓慢推进。'}

## 本页文字（仅供理解，画面里不要出现文字）

${words || '（无）'}

## 怎么做出这段视频

本工具不生成视频。请用视频生成工具或接口（如即梦、可灵或其他视频模型 API），照上面的要求生成；也可以用任意自己的 mp4。
不放视频也行，这一页就用模板自带的样子。

## 交付

把做好的 mp4 命名为 \`${file}\`，放进项目里的 \`data/inbox/\` 文件夹，工具会自动嵌进第 ${no} 页；
也可以在网页结果页点这一页的「导入视频」。
`)
    return { page: p, no, order: `data/orders/${id}_${p}.md`, inbox: `data/inbox/${file}` }
  })
}

// ---------- 对外操作 ----------

export function loadDeck(id) {
  const f = join(deckDir(id), 'deck.json')
  if (!/^[\w-]+$/.test(id) || !existsSync(f)) throw new Error(`找不到 PPT：${id}`)
  return JSON.parse(readFileSync(f, 'utf8'))
}

const saveDeck = deck => writeFileSync(join(deckDir(deck.id), 'deck.json'), JSON.stringify(deck, null, 2))

function newId() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  let id = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  while (existsSync(deckDir(id))) id = id.replace(/(\d)$/, m => String((+m + 1) % 10))
  return id
}

// options：purpose / source / text / style / length / video；file：{ name, buffer }（来源为上传文档时）
// options.slides：Agent 已经用自己的模型写好的每页内容（结构同 SCHEMA），给了就不调模型、不需要 Key
export async function createDeck(options, file, onStep = () => {}) {
  if (options.slides) return saveNewDeck(normalizeOptions(options), options.title, tidySlides(options.slides))
  const opts = normalizeOptions({ ...options, source: file ? 'file' : options.source })
  let material = ''
  if (opts.source === 'file') {
    if (!file) throw new Error('选了「上传 PDF / Word」但没有文件')
    onStep('读文档')
    material = (await extractText(file.name, file.buffer)).trim()
    if (!material) throw new Error('文档里没读到文字（扫描版 PDF 需要先转成可复制文字）')
  }
  if (opts.source === 'outline' && !opts.text) throw new Error('选了「粘贴大纲」但大纲是空的')

  onStep('写大纲')
  const outline = await makeOutline(opts, material)
  onStep('写幻灯片')
  const out = await makeSlides(opts, material, outline)
  return saveNewDeck(opts, out.title || outline.title, tidySlides(out.slides), outline.pages, onStep)
}

async function saveNewDeck(opts, rawTitle, slides, pages, onStep = () => {}) {
  const id = newId()
  const dir = deckDir(id)
  mkdirSync(join(dir, 'public', 'videos'), { recursive: true })
  const title = rawTitle || slides[0].title || '未命名'
  const deck = { id, title, createdAt: new Date().toISOString(), options: opts, style: opts.style, slides, videos: {} }
  for (const no of pickVideoPages(slides, opts)) deck.videos[pageId(no)] = { src: '' }
  saveDeck(deck)
  pages ||= slides.map(s => ({ type: s.type, point: s.title || s.quote || s.value || '' }))
  writeFileSync(join(dir, 'outline.md'), `# ${title}\n\n${pages.map((p, i) => `${i + 1}. [${p.type}] ${p.point}`).join('\n')}\n`)
  const orders = writeOrders(id)

  onStep('打包放映')
  await build(id)
  return { ...summary(id), orders }
}

const isMp4 = file => {
  const fd = openSync(file, 'r')
  const b = Buffer.alloc(12)
  readSync(fd, b, 0, 12, 0)
  closeSync(fd)
  return b.toString('latin1', 4, 8) === 'ftyp'
}

// 把一段 mp4 嵌进第 page 页：没有需求单的页也可以（用户放自己的视频），自动播放、静音、循环
export async function ingestVideo(id, page, srcPath) {
  const deck = loadDeck(id)
  const no = Number(String(page).replace(/^p/i, ''))
  if (!Number.isInteger(no) || no < 1 || no > deck.slides.length) throw new Error(`页码不对：${page}（这份 PPT 共 ${deck.slides.length} 页）`)
  if (!existsSync(srcPath) || !isMp4(srcPath)) throw new Error('这不是有效的 mp4 视频文件（可能没拷完或已损坏）')
  const p = pageId(no)
  copyFileSync(srcPath, join(deckDir(id), 'public', 'videos', `${p}.mp4`))
  deck.videos[p] = { src: `videos/${p}.mp4?v=${Date.now()}` }
  saveDeck(deck)
  await build(id)
  return summary(id)
}

export function summary(id) {
  const deck = loadDeck(id)
  return {
    id,
    title: deck.title,
    style: deck.style,
    createdAt: deck.createdAt,
    play: `/play/${id}/`,
    dir: `data/decks/${id}`,
    rev: deck.rev || 0,
    pages: deck.slides.map((s, i) => {
      const v = deck.videos[pageId(i + 1)]
      return { no: i + 1, page: pageId(i + 1), type: s.type, title: s.title || s.quote || s.value || '', video: v ? (v.src ? 'embedded' : 'waiting') : 'none', order: v && existsSync(join(ORDERS, `${id}_${pageId(i + 1)}.md`)) ? `data/orders/${id}_${pageId(i + 1)}.md` : null }
    }),
  }
}
