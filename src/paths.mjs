import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const TEMPLATES = join(ROOT, 'templates')
// 用户数据（Key、做好的 PPT、需求单、inbox 视频）全放 data/，不进仓库，更新程序时不动它
export const DATA = join(ROOT, 'data')
export const DECKS = join(DATA, 'decks')
export const ORDERS = join(DATA, 'orders')
export const INBOX = join(DATA, 'inbox')
