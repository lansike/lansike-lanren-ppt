// 向导 4 步的选项与默认值；网页、CLI、HTTP 共用这一份。

export const PURPOSES = [
  { id: 'report', name: '工作汇报', desc: '结论先行，数据说话', style: 'night-report', hint: '偏结论、进展、数据和下一步计划；多用条形图和大数字页。' },
  { id: 'notes', name: '读书笔记 / 知识分享', desc: '金句、结构、核心观点', style: 'collage', hint: '偏核心观点、章节结构和金句摘录；多用金句页和要点页。' },
  { id: 'course', name: '课程培训', desc: '循序渐进，讲清楚', style: 'noir-mag', hint: '偏概念讲解、步骤、案例和小结；每页只讲一件事。' },
  { id: 'product', name: '产品 / 方案介绍', desc: '痛点、方案、亮点', style: 'neon', hint: '偏用户痛点、解决方案、核心亮点、对比和行动号召。' },
  { id: 'defense', name: '答辩 / 提案', desc: '问题、方法、结论', style: 'ink-gold', hint: '偏研究或提案背景、问题、方法、结果、结论与展望；严谨克制。' },
]

export const SOURCES = [
  { id: 'topic', name: '一句话主题', desc: '只写一句，帮你扩成大纲' },
  { id: 'outline', name: '粘贴大纲', desc: '已有提纲，直接排版' },
  { id: 'file', name: '上传 PDF / Word', desc: '从文档里提炼' },
]

export const STYLES = [
  { id: 'night-report', name: '暗夜汇报', colors: ['#06080c', '#eef3f6', '#2ef2c0', '#ffb03a'] },
  { id: 'collage', name: '拼贴海报', colors: ['#12110f', '#f6efe2', '#3347ff', '#ff2d87', '#ffc414'] },
  { id: 'noir-mag', name: '深色杂志', colors: ['#0d0b0a', '#f3ece0', '#ff3b2f', '#c8a97e'] },
  { id: 'neon', name: '霓虹发布', colors: ['#07031a', '#f5f3ff', '#a855f7', '#22d3ee'] },
  { id: 'ink-gold', name: '学术沉稳', colors: ['#0a1311', '#e8e3d6', '#c9a45c', '#6fa38f'] },
]

export const LENGTHS = [
  { id: 'short', name: '短', desc: '6～8 页', min: 6, max: 8, videoPages: 2 },
  { id: 'medium', name: '中', desc: '10～12 页', min: 10, max: 12, videoPages: 2 },
  { id: 'long', name: '长', desc: '16～20 页', min: 16, max: 20, videoPages: 3 },
]

export const VIDEOS = [
  { id: 'none', name: '不要视频', desc: '不出需求单，用模板自带的样子' },
  { id: 'cover', name: '只给封面一段', desc: '出 1 份封面视频需求单；没放视频就用模板封面' },
  { id: 'more', name: '封面加 2～3 页', desc: '多出几份需求单，视频要多做几段' },
]

export const DEFAULTS = { purpose: 'report', source: 'topic', length: 'medium', video: 'cover' }

const pick = (list, id, fallback) => list.find(x => x.id === id) || list.find(x => x.id === fallback)

// 补齐默认值：没选 = 用默认；风格默认按目的推荐
export function normalizeOptions(o = {}) {
  const purpose = pick(PURPOSES, o.purpose, DEFAULTS.purpose)
  return {
    purpose: purpose.id,
    source: pick(SOURCES, o.source, DEFAULTS.source).id,
    style: pick(STYLES, o.style, purpose.style).id,
    length: pick(LENGTHS, o.length, DEFAULTS.length).id,
    video: pick(VIDEOS, o.video, DEFAULTS.video).id,
    text: String(o.text || '').trim(),
  }
}

export const byId = (list, id) => list.find(x => x.id === id)
