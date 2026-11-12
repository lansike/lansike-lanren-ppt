> 这是懒斯克自研的开源项目。

# 懒人做 PPT

没思路也能做 PPT：得到一份**深色、带动效、能直接放映的网页 PPT**。放映用 [Slidev](https://sli.dev)。两种做法：

- **用你的 Agent 做（推荐，不用 Key）**：Claude Code、Codex、Cursor 这类能跑命令的 Agent，用它自己的模型写大纲和每页内容，再调本工具出 PPT。
- **直接在网页里做（需要一个模型 Key）**：跟着 4 步向导点几下（每步都有默认值，不想选就跳过），网页替你调模型写内容。

本地运行，Windows / macOS / Linux 都能跑；不用装 Office，也不导出 PPTX。

### 效果说明

1. 文字内容靠模型 Key（或你的 Agent 自己的模型）。
2. 要视频填充，得另接视频生成接口：本工具不生成视频，只出视频需求单，做好的 mp4 放进来就嵌进页面。
3. 要配图丰富，得另接图片生成接口。
4. 最后做出来的效果，取决于你接的模型和接口的质量。

---

## 一、怎么装

1. 装 **Node.js 18.18 或更新的版本**：到 <https://nodejs.org> 下载 LTS 版，一路「下一步」装完。
2. 下载本项目：GitHub 页面点 **Code → Download ZIP**，然后解压。
   > 解压出来的文件夹叫 `lansike-lanren-ppt-main`，**带 `-main` 是正常的**，不用改名。（会用 git 的话直接 `git clone` 也行，以后更新更方便。）
3. 在这个文件夹里打开终端：
   - Windows：打开文件夹，在上方地址栏输入 `cmd` 后回车。
   - macOS：在「访达」里右键这个文件夹 →「服务」→「新建位于文件夹位置的终端窗口」。
   - Linux：在文件夹里右键 →「在终端中打开」。
4. 运行这一条命令：

   ```bash
   npm start
   ```

   第一次运行会先自动安装依赖（1～3 分钟），装好后自动打开浏览器，进入 <http://127.0.0.1:5210>。关掉终端窗口就停止。

### 以后再打开

- **双击启动文件**：项目文件夹里的 `启动懒人做PPT.bat`（Windows）或 `启动懒人做PPT.command`（Mac），双击就会启动并打开浏览器；已经开着的话，只打开浏览器。第一次双击会问一句要不要在桌面建快捷方式（只建在桌面，以后双击桌面上的「懒人做PPT」也一样）。
  > Mac 第一次双击如果提示「无法打开」：到「系统设置 → 隐私与安全性」，在页面下方点「仍要打开」（旧版 macOS 也可以按住 Control 点这个文件，选「打开」）。
- **跟 Agent 说一句**：对你的 Agent 说「打开懒人做PPT」就行。（Agent 得知道本项目在哪：在本项目文件夹里打开 Agent；不在的话，第一次说时带上 SKILL.md 的完整路径。）
- 在终端里运行 `npm start` 也照样可以。

## 二、Agent 怎么调（推荐）

把下面这句话发给你的 Agent（把「××」换成你的主题；Agent 不在本项目文件夹里运行的话，把路径写成完整路径，网页首页点「用你的 Agent 做」会显示带完整路径、能直接复制的版本）：

```text
读 skills/lanren-ppt/SKILL.md，帮我做一份关于××的工作汇报 PPT
```

Agent 会照 [`skills/lanren-ppt/SKILL.md`](skills/lanren-ppt/SKILL.md) 做：用它自己的模型写好每页内容存成 JSON，再调命令行出 PPT，**全程不需要 Key**；做完把放映地址和视频需求单告诉你。

Agent 用到的入口（也可以自己调）：

```bash
# 每页内容已经写好（格式见 SKILL.md），直接出 PPT：不调模型、不要 Key
node bin/lanren-ppt.mjs new --slides data/agent-deck.json --purpose report --video cover

# 同样的内容走 HTTP（先 npm start）
curl -X POST http://127.0.0.1:5210/api/generate -H "Content-Type: application/json" -d @data/agent-deck.json
```

### 自带 Key 时的其他用法

配了 Key（见第四节）以后，也可以让工具自己调模型写内容：

```bash
node bin/lanren-ppt.mjs new --purpose notes --topic "《眨眼之间》读书笔记" --video more   # 一句话主题
node bin/lanren-ppt.mjs new --file 报告.pdf --length short                                  # 从文档生成
node bin/lanren-ppt.mjs build 20261112-213000                                               # 重新构建
node bin/lanren-ppt.mjs ingest-video 20261112-213000 1 封面.mp4                             # 把视频嵌进第 1 页
node bin/lanren-ppt.mjs ingest-video data/inbox/20261112-213000_P01.mp4                     # 按约定文件名自动对页
```

可选值：`--purpose report|notes|course|product|defense`、`--style night-report|collage|noir-mag|neon|ink-gold`、`--length short|medium|long`、`--video none|cover|more`，另有 `--slides 内容.json`、`--topic`、`--outline 大纲.md`、`--file 文档.pdf|.docx`。所有选项都能省略，省略就用默认值。结果以 JSON 输出，里面有编号、放映地址、每页状态和需求单路径。

**HTTP 接口**（先 `npm start`，只监听本机 127.0.0.1:5210）：

| 接口 | 说明 |
|---|---|
| `POST /api/generate` | 请求体 JSON。带 `slides`（和可选的 `title`）就直接用这些内容、不调模型；否则按 `purpose`、`source`（`topic` / `outline` / `file`）、`text` 调模型写。都可加 `style`、`length`、`video`；上传文档时加 `file: {"name":"a.pdf","data":"<base64>"}` |
| `POST /api/build` | `{"id":"<编号>"}`，重新构建 |
| `POST /api/ingest-video?id=<编号>&page=<页码>` | 请求体为 mp4，例如 `curl -X POST "http://127.0.0.1:5210/api/ingest-video?id=20261112-213000&page=1" --data-binary @封面.mp4` |
| `GET /api/decks/<编号>` | 查看某份 PPT 的每页状态（`video`：`none` 没要视频 / `waiting` 待放视频 / `embedded` 已嵌入） |
| `GET /play/<编号>/` | 放映 |

## 三、在网页里怎么点

0. **首页**：先二选一。点「用你的 Agent 做」会显示上面那句话和复制按钮；点「直接在网页里做」，粘贴你的模型 Key（见第四节），点「保存，开始做 PPT」。以后再进来，Key 已经存着，直接点「继续」；要换 Key 就在这里粘新的。
1. **目的**：工作汇报（默认）/ 读书笔记或知识分享 / 课程培训 / 产品或方案介绍 / 答辩提案。
2. **内容**：一句话主题（默认，工具帮你扩成大纲）/ 粘贴大纲 / 上传 PDF 或 Word（.docx）。
3. **风格和篇幅**：点缩略图选一套模板（默认按目的推荐，标着「推荐」）；篇幅选短 6～8 页 / 中 10～12 页（默认）/ 长 16～20 页。
4. **视频**（可选）：不要 / 只给封面一段（默认）/ 封面加 2～3 页。选了视频只是多出视频需求单，PPT 照样马上能放，见下面「视频怎么来」。
5. 点「**生成 PPT**」，等半分钟到两分钟。工具先写大纲，再按模板逐页写出幻灯片。
6. **结果页**：
   - 点「**全屏放映**」就能讲。翻页用 ← →，按 `F` 全屏。
   - 右边列出每一页。选了视频的页标着「待放视频」，旁边的「需求单」就是这一页的视频需求单（在 `data/orders/` 里，写清了页码、画面说明、5～8 秒、16:9）。
   - 视频做好以后，在这一页点「**导入视频**」选 mp4，或者按需求单里的文件名放进 `data/inbox/`。已经打开的放映页会在几秒内自己刷新。

### 视频怎么来

本工具不生成视频，模型 Key 只负责写文字；要视频的话，需要另外用视频生成工具或接口（如即梦、可灵或其他视频模型 API），照工具出的需求单去生成，再把 mp4 放进文件夹（`data/inbox/`，`npm start` 开着时），就会自动嵌入封面。也可以放任意自己的 mp4，或者不放、直接用模板自带封面；需求单照样生成。

- 放进来的视频会自动播放、静音、循环。文件名对不上或者文件损坏，工具会提示，不会动整份 PPT。
- 任何一页都能放自己的视频，不一定要有需求单。

## 四、需要自备什么 Key

- **用 Agent 做：不需要任何 Key**，用的是你的 Agent 自己的模型。
- **在网页里做：需要一个兼容 OpenAI 接口的大模型 Key**，用来写大纲和幻灯片。到你用的模型平台控制台的「API Keys」里新建一个：
  - 默认是 OpenAI（接口地址 `https://api.openai.com/v1`，模型 `gpt-4o-mini`）。
  - 用 DeepSeek、通义千问、Kimi、本机 Ollama 等也行：粘贴 Key 时展开「用的不是 OpenAI？」，填它们给的接口地址和模型名。本机 Ollama 不需要 Key，随便填几个英文字符即可。
  - Key 只存在本机的 `data/config.local.json` 里，不会进仓库。Key 里混进中文或全角字符会提示「Key 无效，请检查」。

**不需要**任何视频或图片接口的 Key：本工具不接这些接口。

## 五、更新

- **让 Agent 更新**：对你的 Agent 说「更新懒人做PPT」。是 git 装的就 `git pull`，是 ZIP 装的就重新下载 ZIP（详见 SKILL.md 最后一节）。
- **在网页里更新**：右上角「检查更新」。有新版本时按钮会变亮；git 装的点一下就同步，ZIP 装的会给出新版下载地址。同步完关掉终端窗口，重新 `npm start` 生效。
- **定时检查**：每次 `npm start` 时，如果距上次检查超过 7 天，会去 GitHub 查一次最新版本号；有新版只在页面上提示，你点了才更新，不会自动覆盖。不想要就在「检查更新」面板里关掉。
- **你的东西不会被覆盖**：做好的 PPT、需求单、inbox 里的视频、Key 和更新设置都在 `data/` 里，这个文件夹不进仓库，`git pull` 不会动它。ZIP 装的：解压新版后把旧文件夹里的 `data/` 拷过去，或者直接解压覆盖旧文件夹。

---

## 目录

| 位置 | 内容 |
|---|---|
| `启动懒人做PPT.bat` / `启动懒人做PPT.command` | 双击启动（Windows / Mac） |
| `skills/lanren-ppt/SKILL.md` | 给 Agent 看的说明 |
| `web/` | 网页 |
| `src/` | 本地服务、生成流程、视频嵌入、`data/inbox/` 监视、检查更新 |
| `bin/lanren-ppt.mjs` | 命令行 |
| `templates/` | 自建的 5 套深色模板：暗夜汇报、拼贴海报、深色杂志、霓虹发布、学术沉稳 |
| `data/` | 你的数据：`decks/` 做好的 PPT、`orders/` 视频需求单、`inbox/` 待嵌入的视频、`config.local.json` Key、`update.json` 更新检查记录（整个文件夹不进仓库） |

## 许可证

自有代码用 [MIT](LICENSE)，版权归懒斯克。5 套模板是本项目自建的，同样用 MIT。

用到的第三方开源软件通过 npm 安装，各自的 LICENSE 和署名保留在 `node_modules/` 对应目录里：

- [Slidev](https://github.com/slidevjs/slidev)：MIT，© Anthony Fu。放映引擎。
- [unpdf](https://github.com/unjs/unpdf)：MIT，© Johann Schopplich。读 PDF 的文字。
- [mammoth](https://github.com/mwilliamson/mammoth.js)：BSD-2-Clause，© Michael Williamson。读 Word 的文字。

中文断行用的是 Node.js 自带的 `Intl.Segmenter`（ICU 词典），不额外安装。
