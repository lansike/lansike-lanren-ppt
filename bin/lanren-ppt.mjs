#!/usr/bin/env node
// 给 Agent 用的命令行：new / build / ingest-video
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseArgs } from 'node:util'
import { build, createDeck, ingestVideo, summary } from '../src/deck.mjs'
import { NAME } from '../src/inbox.mjs'

const HELP = `用法：
  lanren-ppt new --slides 内容.json [--purpose …] [--style …] [--video none|cover|more]
                 （Agent 用：每页内容已写好，不调模型、不需要 Key；格式见 skills/lanren-ppt/SKILL.md）
  lanren-ppt new [--purpose report|notes|course|product|defense] [--topic "一句话主题"]
                 [--outline 大纲.md] [--file 文档.pdf|.docx]
                 [--style night-report|collage|noir-mag|neon|ink-gold]
                 [--length short|medium|long] [--video none|cover|more]
  lanren-ppt build <PPT编号>
  lanren-ppt ingest-video <PPT编号> <页码> <视频.mp4>
  lanren-ppt ingest-video <PPT编号_P页码.mp4>      （按约定文件名自动对页）
所有选项都可省略，省略即用默认值（工作汇报 / 中篇 / 出一份封面视频需求单，风格按目的推荐）。
结果以 JSON 打印到标准输出；放映需先 npm start，再打开 http://127.0.0.1:5210/play/<PPT编号>/`

const [cmd, ...rest] = process.argv.slice(2)
const out = x => console.log(JSON.stringify(x, null, 2))

try {
  if (cmd === 'new') {
    const { values: v } = parseArgs({ args: rest, options: Object.fromEntries(['purpose', 'topic', 'outline', 'file', 'slides', 'style', 'length', 'video'].map(k => [k, { type: 'string' }])) })
    const file = v.file ? { name: basename(v.file), buffer: readFileSync(v.file) } : null
    const source = file ? 'file' : v.outline ? 'outline' : 'topic'
    const text = v.outline ? readFileSync(v.outline, 'utf8') : v.topic
    const given = v.slides && JSON.parse(readFileSync(v.slides, 'utf8'))
    const slides = given && (Array.isArray(given) ? { slides: given } : given)
    out(await createDeck({ ...v, source, text, ...slides }, file, step => console.error(`… ${step}`)))
  }
  else if (cmd === 'build' && rest[0]) {
    await build(rest[0])
    out(summary(rest[0]))
  }
  else if (cmd === 'ingest-video' && rest.length >= 3) out(await ingestVideo(rest[0], rest[1], rest[2]))
  else if (cmd === 'ingest-video' && rest.length === 1) {
    const m = basename(rest[0]).match(NAME)
    if (!m) throw new Error('文件名对不上约定（PPT编号_P页码.mp4），请写成：ingest-video <PPT编号> <页码> <视频.mp4>')
    out(await ingestVideo(m[1], m[2], rest[0]))
  }
  else console.log(HELP)
}
catch (e) {
  console.error(`出错了：${e.message}`)
  process.exit(1)
}
