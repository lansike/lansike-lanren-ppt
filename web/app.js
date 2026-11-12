// 懒人做 PPT · 向导前端（无框架）
const $ = (s, el = document) => el.querySelector(s)
const app = $('#app')
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const api = async (path, opts = {}) => {
  const res = await fetch(path, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}
const postJSON = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

let S // /api/state
const pick = { purpose: null, source: null, text: '', file: null, style: null, length: null, video: null }
let step = 0
let pollTimer

const ICONS = {
  report: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  notes: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-3a3 3 0 0 0-3 3"/><path d="M20 4v14h-6"/>',
  course: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  product: '<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>',
  defense: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  topic: '<path d="M4 6h16M4 12h10M4 18h6"/>',
  outline: '<path d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14h6M9 17h4"/>',
}
const icon = id => `<svg viewBox="0 0 24 24" class="ico">${ICONS[id] || ''}</svg>`

const STEPS = [
  { key: 'purpose', label: '目的', q: '这份 PPT 是<em>做什么</em>用的？' },
  { key: 'source', label: '内容', q: '内容<em>从哪来</em>？' },
  { key: 'style', label: '风格', q: '挑个<em>风格</em>，定个篇幅' },
  { key: 'video', label: '视频', q: '要不要让它<em>动起来</em>？' },
]

// 当前选择（没选 = 默认；风格默认按目的推荐）
const cur = k => {
  if (k === 'style') return pick.style || S.presets.purposes.find(p => p.id === cur('purpose')).style
  return pick[k] || S.defaults[k]
}

function renderSteps() {
  $('#steps').innerHTML = step < 4
    ? STEPS.map((s, i) => `<button class="${i === step ? 'on' : i < step ? 'done' : ''}" data-go="${i}"><b>0${i + 1}</b>${s.label}</button>`).join('')
    : ''
  $('#steps').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { step = +b.dataset.go; renderWizard() })
}

const card = (k, o, extra = '') => `
  <button class="card ${cur(k) === o.id ? 'sel' : ''}" data-k="${k}" data-v="${o.id}">
    ${extra}
    ${o.id === S.defaults[k] ? '<span class="badge">默认</span>' : ''}
    <span class="card-name">${esc(o.name)}</span>
    <span class="card-desc">${esc(o.desc)}</span>
  </button>`

function stepBody() {
  const P = S.presets
  if (step === 0) {
    return `<div class="cards five">${P.purposes.map(o => card('purpose', o, icon(o.id))).join('')}</div>`
  }
  if (step === 1) {
    const src = cur('source')
    const input = src === 'topic'
      ? `<input id="text" class="big-input" placeholder="一句话说清楚，比如：第三季度用户增长复盘" value="${esc(pick.text)}">`
      : src === 'outline'
        ? `<textarea id="text" class="big-input" rows="7" placeholder="把已有大纲粘进来，一行一个要点">${esc(pick.text)}</textarea>`
        : `<label class="drop ${pick.file ? 'has' : ''}" id="drop"><input type="file" id="file" accept=".pdf,.docx" hidden>
            <b>${pick.file ? esc(pick.file.name) : '点这里选文件，或把文件拖进来'}</b><span>支持 PDF、Word（.docx）</span></label>`
    return `<div class="cards three">${P.sources.map(o => card('source', o, icon(o.id))).join('')}</div><div class="input-wrap">${input}</div>`
  }
  if (step === 2) {
    const rec = P.purposes.find(p => p.id === cur('purpose')).style
    return `<div class="cards five styles">${P.styles.map(o => `
        <button class="card thumb ${cur('style') === o.id ? 'sel' : ''}" data-k="style" data-v="${o.id}">
          <img src="/thumbs/${o.id}.jpg" alt="" loading="lazy">
          ${o.id === rec ? '<span class="badge">推荐</span>' : ''}
          <span class="card-name">${esc(o.name)}</span>
          <span class="swatch">${o.colors.map(c => `<i style="background:${c}"></i>`).join('')}</span>
        </button>`).join('')}</div>
      <div class="lengths">${P.lengths.map(o => `
        <button class="chip ${cur('length') === o.id ? 'sel' : ''}" data-k="length" data-v="${o.id}">
          <b>${o.name}</b><span>${o.desc}</span>${o.id === S.defaults.length ? '<em>默认</em>' : ''}</button>`).join('')}</div>`
  }
  const mini = n => `<span class="mini">${[0, 1, 2, 3].map(i => `<i class="${i < n ? 'v' : ''}"></i>`).join('')}</span>`
  return `<div class="cards three">${P.videos.map((o, i) => card('video', o, mini([0, 1, 3][i]))).join('')}</div>
    <p class="note">本工具不生成视频，模型 Key 只负责写文字；要视频的话，需要另外用视频生成工具或接口（如即梦、可灵或其他视频模型 API），照工具出的需求单（在 <code>data/orders/</code>）去生成，再把 mp4 放进 <code>data/inbox/</code> 文件夹（或在结果页点「导入视频」），就会自动嵌入封面。也可以放任意自己的 mp4，或者不放、直接用模板自带封面；需求单照样生成。</p>`
}

function renderWizard() {
  clearInterval(pollTimer)
  renderSteps()
  const s = STEPS[step]
  app.innerHTML = `
    <section class="screen wizard" style="--n:${step}">
      <p class="eyebrow">第 ${step + 1} 步 / 共 4 步 · 不想选就跳过，用默认</p>
      <h1>${s.q}</h1>
      <div class="body">${stepBody()}</div>
      <footer class="actions">
        ${step > 0 ? '<button class="ghost" id="back">← 上一步</button>' : '<span></span>'}
        <div>
          <button class="ghost" id="skip">跳过，用默认</button>
          <button class="primary" id="next">${step === 3 ? '生成 PPT <span>✦</span>' : '下一步 <span>→</span>'}</button>
        </div>
      </footer>
    </section>`
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { pick[b.dataset.k] = b.dataset.v; renderWizard() })
  const text = $('#text')
  if (text) { text.oninput = () => { pick.text = text.value }; text.focus() }
  const file = $('#file')
  if (file) {
    file.onchange = () => { pick.file = file.files[0] || null; renderWizard() }
    const drop = $('#drop')
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over') }
    drop.ondragleave = () => drop.classList.remove('over')
    drop.ondrop = e => { e.preventDefault(); pick.file = e.dataTransfer.files[0] || null; renderWizard() }
  }
  $('#back')?.addEventListener('click', () => { step--; renderWizard() })
  $('#skip').onclick = () => {
    if (step === 1) { pick.source = null; pick.file = null }
    else if (step === 2) { pick.style = null; pick.length = null }
    else pick[STEPS[step].key] = null
    step === 3 ? generate() : (step++, renderWizard())
  }
  $('#next').onclick = () => step === 3 ? generate() : (step++, renderWizard())
}

const toBase64 = f => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = reject
  r.readAsDataURL(f)
})

async function generate() {
  const source = cur('source')
  if (source === 'file' && !pick.file) { step = 1; renderWizard(); return toast('选了「上传 PDF / Word」，先选个文件吧') }
  if (source === 'outline' && !pick.text.trim()) { step = 1; renderWizard(); return toast('选了「粘贴大纲」，先把大纲粘进来吧') }
  step = 4
  renderSteps()
  app.innerHTML = $('#tpl-making').innerHTML
  const stages = [...(source === 'file' ? ['读文档'] : []), '写大纲', '逐页写幻灯片', '套模板、加动效', '打包成能放映的网页']
  $('#stages').innerHTML = stages.map(s => `<li>${s}</li>`).join('')
  let i = 0
  const tick = () => {
    $('#makingStage').textContent = `${stages[i]}…`
    $('#stages').querySelectorAll('li').forEach((li, j) => li.className = j < i ? 'done' : j === i ? 'on' : '')
    if (i < stages.length - 1) i++
  }
  tick()
  const timer = setInterval(tick, 9000)
  try {
    const body = { purpose: cur('purpose'), source, text: pick.text, style: cur('style'), length: cur('length'), video: cur('video') }
    if (source === 'file') body.file = { name: pick.file.name, data: await toBase64(pick.file) }
    const deck = await postJSON('/api/generate', body)
    location.hash = `deck/${deck.id}`
  }
  catch (e) {
    step = 3
    renderWizard()
    toast(`没生成成功：${e.message}`, 8000)
  }
  finally { clearInterval(timer) }
}

const STATUS = { waiting: ['待放视频', 'wait'], embedded: ['已嵌入', 'ok'], none: ['', ''] }

async function renderDeck(id) {
  clearInterval(pollTimer)
  step = 4
  renderSteps()
  let d
  try { d = await api(`/api/decks/${id}`) }
  catch (e) { location.hash = ''; return toast(e.message) }
  const sig = x => x.pages.map(p => p.video).join()
  app.innerHTML = `
    <section class="screen done">
      <div class="done-head">
        <div>
          <p class="eyebrow">做好了 · 编号 ${esc(d.id)}</p>
          <h1>${esc(d.title)}</h1>
        </div>
        <div class="done-actions">
          <a class="primary" href="${d.play}" target="_blank">全屏放映 <span>▶</span></a>
          <a class="ghost" href="#make">再做一份</a>
        </div>
      </div>
      <div class="done-grid">
        <div class="stage"><iframe id="preview" src="${d.play}" title="预览"></iframe><p class="hint">点进预览后用 ← → 翻页，按 F 全屏。文件在 <code>${esc(d.dir)}/</code></p></div>
        <aside class="pages">
          <h3>每一页 · 视频</h3>
          <ul id="pages"></ul>
          <p class="hint">也可以把 mp4 命名成 <code>${esc(d.id)}_P01.mp4</code> 这样，丢进 <code>data/inbox/</code> 文件夹，会自动嵌进对应页。没放视频的页就用模板自带的样子。</p>
        </aside>
      </div>
    </section>`
  const list = $('#pages')
  const paint = x => {
    list.innerHTML = x.pages.map(p => {
      const [label, cls] = STATUS[p.video]
      return `<li class="${cls}">
        <b>${p.page}</b><span class="t">${esc(p.title)}</span>
        ${label ? `<em>${label}</em>` : ''}
        ${p.order ? `<a href="/${p.order}" target="_blank" title="视频需求单">需求单</a>` : ''}
        <label class="mini-btn">${p.video === 'embedded' ? '换视频' : '导入视频'}<input type="file" accept="video/mp4" data-page="${p.no}" hidden></label>
      </li>`
    }).join('')
    list.querySelectorAll('input[type=file]').forEach(inp => inp.onchange = async () => {
      const f = inp.files[0]
      if (!f) return
      inp.parentElement.textContent = '嵌入中…'
      try {
        const nd = await api(`/api/ingest-video?id=${id}&page=${inp.dataset.page}`, { method: 'POST', body: f })
        paint(nd); d = nd
        toast(`第 ${inp.dataset.page} 页的视频已嵌入`)
      }
      catch (e) { toast(e.message, 6000); paint(d) }
    })
  }
  paint(d)
  // 盯着 inbox：有新视频嵌进来就更新列表（预览和放映页会自己刷新）
  pollTimer = setInterval(async () => {
    const nd = await api(`/api/decks/${id}`).catch(() => null)
    if (nd && sig(nd) !== sig(d)) { d = nd; paint(d); toast('inbox 里的视频已嵌入') }
  }, 3000)
}

function renderHome() {
  clearInterval(pollTimer)
  $('#steps').innerHTML = ''
  app.innerHTML = $('#tpl-home').innerHTML
  $('#sayText').textContent = `读 ${S.root.replace(/\\/g, '/')}/skills/lanren-ppt/SKILL.md，帮我做一份关于××的工作汇报 PPT`
  app.querySelector('[data-way="agent"]').onclick = e => { e.currentTarget.classList.add('sel'); $('#say').hidden = false }
  app.querySelector('[data-way="web"]').onclick = () => { location.hash = 'key' }
  $('#copy').onclick = () => navigator.clipboard.writeText($('#sayText').textContent)
    .then(() => toast('已复制，粘给你的 Agent 吧'), () => toast('没复制成功，请手动选中这句话复制'))
}

function renderKey() {
  clearInterval(pollTimer)
  $('#steps').innerHTML = ''
  app.innerHTML = $('#tpl-key').innerHTML
  const form = $('#keyForm')
  form.baseURL.value = S.baseURL
  form.model.value = S.model
  if (S.hasKey) { form.apiKey.required = false; form.apiKey.placeholder = '已保存过 Key，直接点继续；要换就粘新的'; $('#keyGo').textContent = '继续' }
  form.onsubmit = async e => {
    e.preventDefault()
    try { Object.assign(S, await postJSON('/api/key', Object.fromEntries(new FormData(form)))) }
    catch (err) { return toast(err.message) }
    step = 0
    location.hash = 'make'
  }
}

// 检查更新：右上角按钮 + 小面板
const fmt = t => new Date(t).toLocaleDateString('zh-CN')
function paintUpdate() {
  const u = S.update
  const btn = $('#updBtn')
  btn.textContent = u.hasNew ? `有新版本 v${u.latest}` : '检查更新'
  btn.classList.toggle('hot', u.hasNew)
  $('#upd').innerHTML = `
    <p><b>当前 v${esc(u.current)}</b> · ${u.hasNew ? `GitHub 上有新版本 v${esc(u.latest)}` : u.last ? u.failed ? `上次检查没成功（${fmt(u.last)}）` : `已是最新（${fmt(u.last)} 查过）` : '还没检查过'}</p>
    <div class="upd-act">
      <button class="ghost small" id="updCheck">检查更新</button>
      ${u.hasNew ? u.git ? '<button class="primary small" id="updApply">点一下同步</button>'
        : `<a class="primary small" href="${esc(u.download)}" target="_blank">下载新版 ZIP</a>` : ''}
    </div>
    ${u.hasNew && !u.git ? '<p class="hint">这份不是用 git 装的，没法自动同步：下载后解压，把旧文件夹里的 <code>data/</code> 拷进去（或直接解压覆盖旧文件夹），做过的 PPT 都在里面。</p>' : ''}
    ${u.message ? `<p class="hint">${esc(u.message)}</p>` : ''}
    <label class="upd-auto"><input type="checkbox" id="updAuto" ${u.auto ? 'checked' : ''}> 每次启动时，距上次超过 7 天就自动查一次（只提示，不自动更新）</label>`
  const act = async (body, busy) => {
    if (busy) busy.textContent = '稍等…'
    try { S.update = await postJSON('/api/update', body) }
    catch (e) { toast(e.message, 6000); S.update = (await api('/api/state').catch(() => S)).update }
    paintUpdate()
  }
  $('#updCheck').onclick = e => act({ do: 'check' }, e.target)
  $('#updApply')?.addEventListener('click', e => act({ do: 'apply' }, e.target))
  $('#updAuto').onchange = e => act({ auto: e.target.checked })
}
$('#updBtn').onclick = () => { $('#upd').hidden = !$('#upd').hidden }

let toastTimer
function toast(msg, ms = 3500) {
  let t = $('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t) }
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('show'), ms)
}

function route() {
  const m = /^#deck\/([\w-]+)/.exec(location.hash)
  if (m) return renderDeck(m[1])
  if (location.hash === '#key' || (location.hash === '#make' && !S.hasKey)) return renderKey()
  if (location.hash !== '#make') return renderHome()
  if (step > 3) step = 0
  renderWizard()
}

window.addEventListener('hashchange', () => { if (location.hash !== '#make') step = 0; route() })
S = await api('/api/state')
paintUpdate()
route()
