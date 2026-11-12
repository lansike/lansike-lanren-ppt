// OpenAI 兼容接口：POST {baseURL}/chat/completions。Key 由用户提供，存在本机 data/config.local.json。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA } from './paths.mjs'

const CONFIG = join(DATA, 'config.local.json')
const FALLBACK = { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' }
// Key 只能是可见的英文字符（HTTP 请求头放不下中文、全角符号和空格）
const checkKey = k => { if (!/^[\x21-\x7e]+$/.test(k)) throw Object.assign(new Error('Key 无效，请检查'), { status: 400 }) }

export function loadConfig() {
  return { ...FALLBACK, ...(existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')) : {}) }
}

export function saveConfig({ apiKey, baseURL, model }) {
  const c = loadConfig()
  const next = { apiKey: apiKey?.trim() || c.apiKey, baseURL: baseURL?.trim() || c.baseURL, model: model?.trim() || c.model }
  if (next.apiKey) checkKey(next.apiKey)
  mkdirSync(DATA, { recursive: true })
  writeFileSync(CONFIG, JSON.stringify(next, null, 2))
  return next
}

// 让模型只回 JSON；兼容会包 ```json 代码块或多说几句的模型
function parseJSON(text) {
  const s = text.replace(/```(?:json)?/g, '')
  return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1))
}

export async function chatJSON(system, user) {
  const { apiKey, baseURL, model } = loadConfig()
  if (!apiKey) throw new Error('还没配 Key：先运行 npm start，在打开的网页里粘贴 Key（或者让你的 Agent 按 skills/lanren-ppt/SKILL.md 来做，不用 Key）')
  checkKey(apiKey)
  let lastErr
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!res.ok) throw new Error(`模型接口报错 ${res.status}：${(await res.text()).slice(0, 300)}`)
    const text = (await res.json()).choices?.[0]?.message?.content || ''
    try { return parseJSON(text) }
    catch (e) { lastErr = e }
  }
  throw new Error(`模型没有返回合法 JSON：${lastErr.message}`)
}
