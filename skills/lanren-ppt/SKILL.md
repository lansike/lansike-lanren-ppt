---
name: lanren-ppt
description: 用「懒人做 PPT」给用户做一份深色、带动效、能直接放映的网页 PPT。你（Agent）用自己的模型写每页内容，再调本项目的命令行出 PPT，全程不需要模型 Key。用户说「帮我做一份××的 PPT」「打开懒人做PPT」或「更新懒人做PPT」时用。
---

# 懒人做 PPT · 给 Agent 的说明

写给 Claude Code、Codex、Cursor 这类能跑命令的 Agent。**内容由你自己的模型来写**，本工具只负责套模板、加动效、打包成网页 PPT，所以**不需要任何 Key**。

下文的「项目目录」指本文件往上两级的文件夹（有 `package.json`、`bin/`、`src/` 的那个）。所有命令都在项目目录里运行。

## 做一份 PPT

### 0. 准备（只要一次）

- 需要 Node.js 18.18 或更新的版本（`node -v` 查看）。
- 项目目录里没有 `node_modules/` 的话，先运行 `npm install --no-audit --no-fund`。

### 1. 弄清要什么（用户没说就用默认，别追问太多）

| 选项 | 可选值 | 默认 |
|---|---|---|
| 目的 `--purpose` | `report` 工作汇报 / `notes` 读书笔记或知识分享 / `course` 课程培训 / `product` 产品或方案介绍 / `defense` 答辩提案 | `report` |
| 篇幅 | 短 6～8 页 / 中 10～12 页 / 长 16～20 页 | 中 |
| 风格 `--style` | `night-report` 暗夜汇报 / `collage` 拼贴海报 / `noir-mag` 深色杂志 / `neon` 霓虹发布 / `ink-gold` 学术沉稳 | 按目的推荐（汇报→暗夜汇报、读书→拼贴海报、课程→深色杂志、产品→霓虹发布、答辩→学术沉稳） |
| 视频需求单 `--video` | `none` 不要 / `cover` 只给封面一段 / `more` 封面加 2～3 页 | `cover` |

用户给了 PDF、Word 或网页，你自己读内容，再按下面的格式写。

### 2. 用你自己的模型写内容，存成 JSON

先在心里排好大纲，再逐页写。存到项目目录的 `data/` 里（这个文件夹不进仓库），例如 `data/agent-deck.json`：

```json
{
  "title": "整份 PPT 的标题",
  "slides": [
    { "type": "cover", "kicker": "WORK REPORT · 2026", "title": "主标题", "subtitle": "一句副标题", "visual": "…", "notes": "…" },
    { "type": "points", "kicker": "PART 01 · PROGRESS", "title": "标题", "items": [{ "head": "要点", "text": "可选的一句补充" }], "visual": "…", "notes": "…" },
    { "type": "end", "title": "谢谢", "subtitle": "一句收尾", "visual": "…", "notes": "…" }
  ]
}
```

每页按 `type` 选字段：

- `cover`：`kicker`（英文小标，如 `WORK REPORT · 2026`）、`title`、`subtitle`
- `points`：`kicker`、`title`、`subtitle`（可选）、`items: [{ "head": "要点", "text": "可选补充" }]`（2～4 条）
- `bars`：`kicker`、`title`、`subtitle`（可选）、`bars: [{ "label": "名称", "value": 52, "unit": "%" }]`（3～6 条，`value` 是数字）
- `number`：`kicker`、`value`（大数字，如 `"51%"`）、`title`（这个数字说明什么）、`subtitle`（可选）
- `quote`：`kicker`、`quote`（一句金句或核心结论）、`by`（出处，可选）
- `compare`：`kicker`、`title`、`left: { "head": "左侧名", "items": ["…"] }`、`right: { "head": "右侧名", "items": ["…"] }`（每侧 2～4 条）
- `end`：`title`（结尾大字，如「谢谢」「下一步」）、`subtitle`

每页另外都写：

- `visual`：给这一页配一段 5～8 秒、16:9 短视频的画面说明（主体、动作、镜头运动、色调；画面里不出现文字）。会写进视频需求单。
- `notes`：讲这一页时可以说的 1～3 句讲稿。

硬性要求：

- 第 1 页是 `cover`，最后一页是 `end`；中间各页类型要有变化，不要连续三页同一类型。
- 少字：每页可见文字尽量不超过 25 个字，最多不超过 50 个字；标题不超过 14 个字。
- 不编造数字：`bars` 和 `number` 只在材料里有真实数字时才用；没有就改用 `points`、`quote` 或 `compare`。
- 全部用简体中文（`kicker` 用大写英文）。

### 3. 出 PPT（不调模型、不要 Key）

```bash
node bin/lanren-ppt.mjs new --slides data/agent-deck.json --purpose report --video cover
```

约 3～10 秒，标准输出是一段 JSON：`id`（编号）、`play`（放映路径）、`pages`（每页状态）、`orders`（视频需求单路径）。出错时会在标准错误里打印中文原因并以非 0 退出，按提示改 JSON 再跑一次。

已经开着本地服务的话，也可以走 HTTP，请求体就是上面的 JSON 再加选项：

```bash
curl -X POST http://127.0.0.1:5210/api/generate -H "Content-Type: application/json" -d @data/agent-deck.json
```

### 4. 交给用户

- 放映要先开本地服务：在项目目录运行 `npm start`（会一直运行，请放到后台；端口已被占用说明已经开着）。然后把 `http://127.0.0.1:5210/play/<编号>/` 给用户。网页结果页是 `http://127.0.0.1:5210/#deck/<编号>`。
- 文件在 `data/decks/<编号>/`。
- 选了视频的话，把需求单路径（`data/orders/<编号>_P01.md`）告诉用户，并照实说明下面「视频」一节。

## 视频怎么来（照实告诉用户，别承诺做不到的事）

本工具不生成视频，模型只负责写文字。要视频的话，需要另外用视频生成工具或接口（如即梦、可灵或其他视频模型 API），照工具出的需求单去生成，再把 mp4 放进 `data/inbox/` 文件夹（文件名照需求单写，例如 `20261112-213000_P01.mp4`），就会自动嵌入封面（要 `npm start` 开着才会自动嵌；没开就用下面的 `ingest-video`）。也可以放任意自己的 mp4，或者不放、直接用模板自带封面；需求单照样生成。

嵌视频也可以由你来做：

```bash
node bin/lanren-ppt.mjs ingest-video <编号> 1 封面.mp4
```

已经打开的放映页会在几秒内自己刷新。

本工具不出图片，也没有放图片的入口。最后的效果取决于你的模型写的内容，以及用户另接的视频、图片工具的质量。

## 打开懒人做PPT

用户说「打开懒人做PPT」时：在项目目录**放到后台**运行 `npm start`（它会一直运行；已经开着的话，它只打开浏览器就退出），然后告诉用户网页地址 `http://127.0.0.1:5210/`。

用户自己也可以双击项目目录里的 `启动懒人做PPT.bat`（Windows）或 `启动懒人做PPT.command`（Mac）。

## 更新懒人做PPT

用户说「更新懒人做PPT」时：

1. 项目目录里有 `.git/`：运行 `git pull --ff-only`，再运行 `npm install --no-audit --no-fund`。
2. 没有 `.git/`（是下载 ZIP 装的）：重新下载 GitHub 上的 ZIP（仓库地址见 `package.json` 的 `repository`，下载地址是 `<仓库地址>/archive/refs/heads/main.zip`），解压后**把旧文件夹里的 `data/` 整个拷进新文件夹**；或者直接解压覆盖到旧文件夹。然后运行 `npm install --no-audit --no-fund`。
3. 告诉用户：关掉正在运行的 `npm start` 再重新运行，新版才生效。

用户做过的 PPT、需求单、inbox 里的视频和 Key 都在 `data/` 里，这个文件夹不进仓库，`git pull` 和覆盖解压都不会动它。**不要删除或覆盖 `data/`。**
