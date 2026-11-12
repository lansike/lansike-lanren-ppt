// 监视 inbox/：按约定文件名（<PPT编号>_P01.mp4）丢进来的视频，自动嵌进对应页；对不上就报告，不动整份 PPT。
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, watch } from 'node:fs'
import { join } from 'node:path'
import { ingestVideo } from './deck.mjs'
import { INBOX } from './paths.mjs'

export const NAME = /^(\d{8}-\d{6})_P(\d+)\b.*\.mp4$/i
const DONE = join(INBOX, '已嵌入')
const sleep = ms => new Promise(r => setTimeout(r, ms))

export function watchInbox(report) {
  mkdirSync(DONE, { recursive: true })
  const failed = new Map()
  let running = false
  let again = false
  let timer

  async function scan() {
    if (running) { again = true; return }
    running = true
    for (const name of readdirSync(INBOX)) {
      const file = join(INBOX, name)
      if (!/\.mp4$/i.test(name) || !existsSync(file) || !statSync(file).isFile()) continue
      const size = statSync(file).size
      const sig = `${size}-${statSync(file).mtimeMs}`
      if (failed.get(name) === sig) continue
      await sleep(1500)
      if (!existsSync(file) || statSync(file).size !== size) { again = true; continue } // 还在拷贝
      const m = name.match(NAME)
      try {
        if (!m) throw new Error('文件名对不上约定，应为「PPT编号_P页码.mp4」，例如 20261112-213000_P01.mp4')
        await ingestVideo(m[1], m[2], file)
        renameSync(file, join(DONE, name))
        failed.delete(name)
        report({ ok: true, file: name, id: m[1], page: Number(m[2]), message: `已嵌进 ${m[1]} 第 ${Number(m[2])} 页` })
      }
      catch (e) {
        failed.set(name, sig)
        report({ ok: false, file: name, id: m?.[1], message: e.message })
      }
    }
    running = false
    if (again) { again = false; schedule() }
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(scan, 800) }
  watch(INBOX, schedule)
  scan()
}
