// 检查更新：读 GitHub 上 main 分支 package.json 的版本号；git 安装就 git pull，否则给出 ZIP 下载地址。
// 只动程序代码；用户数据都在 data/（已 .gitignore），pull 和覆盖解压都碰不到。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA, ROOT } from './paths.mjs'

const STATE = join(DATA, 'update.json')
const WEEK = 7 * 24 * 3600 * 1000
const pkg = () => JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const REPO = /github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(pkg().repository?.url || '')?.[1]
const isGit = () => existsSync(join(ROOT, '.git'))
const newer = (a, b) => {
  const [x, y] = [a, b].map(v => String(v).split('.').map(Number))
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0)
  return false
}

const load = () => ({ auto: true, last: 0, latest: '', ...(existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {}) })
const save = s => { mkdirSync(DATA, { recursive: true }); writeFileSync(STATE, JSON.stringify(s, null, 2)); return s }

export function updateState() {
  const s = load()
  const current = pkg().version
  return {
    current, latest: s.latest, hasNew: !!s.latest && newer(s.latest, current), auto: s.auto, last: s.last, failed: !!s.failed, git: isGit(),
    page: REPO && `https://github.com/${REPO}`, download: REPO && `https://github.com/${REPO}/archive/refs/heads/main.zip`,
  }
}

export async function checkUpdate() {
  try {
    if (!REPO) throw new Error('package.json 里没写 GitHub 仓库地址，没法检查更新')
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/package.json`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`没查到最新版本（GitHub 返回 ${res.status}）`)
    save({ ...load(), last: Date.now(), failed: false, latest: (await res.json()).version })
    return updateState()
  }
  catch (e) {
    // 查失败也记下时间，7 天内启动不再重查
    save({ ...load(), last: Date.now(), failed: true })
    throw e
  }
}

export const setAuto = auto => { save({ ...load(), auto: !!auto }); return updateState() }

// 启动时：开着定时检查、且距上次超过 7 天，才查一次；查不到就算了，不打扰
export function checkOnStart() {
  const s = load()
  if (s.auto && Date.now() - s.last > WEEK) checkUpdate().catch(e => console.log(`[更新] ${e.message}`))
}

// 点「同步」：git 安装才自动拉；拉完装一下依赖，重启后生效
export function applyUpdate() {
  if (!isGit()) return { ...updateState(), message: '这份不是用 git 装的，没法自动同步。请下载新版 ZIP，解压后把旧文件夹里的 data/ 拷进去（或直接解压覆盖旧文件夹）。' }
  const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', shell: process.platform === 'win32' })
  try { run('git', ['pull', '--ff-only']) }
  catch (e) { throw new Error(`git pull 没成功：${(e.stderr || e.message).trim().slice(0, 300)}`) }
  run('npm', ['install', '--no-audit', '--no-fund'])
  return { ...updateState(), synced: true, message: `已同步到 ${pkg().version}。关掉终端窗口，再运行 npm start 就是新版。` }
}
