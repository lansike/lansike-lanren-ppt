// 一条命令：缺依赖就先装，然后启动本地网页并打开浏览器；已经开着就直接打开浏览器
// 从双击启动文件（启动懒人做PPT.bat / .command）进来时带 --launcher：第一次问一句要不要在桌面建快捷方式
import { execFileSync, execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { DATA, ROOT } from '../src/paths.mjs'

const port = 5210
const url = `http://127.0.0.1:${port}/`
const openBrowser = () => {
  const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]]
  spawn(...opener, { stdio: 'ignore', detached: true }).on('error', () => {}).unref()
}

// 桌面快捷方式：只建在桌面，不进开始菜单、不写系统目录；问过一次就记在 data/ 里，不再问
const ASKED = join(DATA, 'shortcut-asked')
async function askShortcut() {
  if (!process.argv.includes('--launcher') || existsSync(ASKED) || !process.stdin.isTTY || !['win32', 'darwin'].includes(process.platform)) return
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const yes = /^\s*(y|yes|是|要|好)?\s*$/i.test(await rl.question('要在桌面建一个「懒人做PPT」快捷方式吗？以后双击它就能打开。[Y/n] '))
  rl.close()
  mkdirSync(DATA, { recursive: true })
  writeFileSync(ASKED, '')
  if (!yes) return console.log('好的，不建。以后双击项目文件夹里的启动文件就行。')
  try {
    if (process.platform === 'win32') {
      execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        '$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path ([Environment]::GetFolderPath("Desktop")) $env:LR_NAME)); $s.TargetPath=$env:LR_TARGET; $s.WorkingDirectory=$env:LR_ROOT; $s.Save()'],
        { stdio: 'ignore', env: { ...process.env, LR_NAME: '懒人做PPT.lnk', LR_TARGET: join(ROOT, '启动懒人做PPT.bat'), LR_ROOT: ROOT } })
    }
    else {
      const link = join(homedir(), 'Desktop', '懒人做PPT.command')
      rmSync(link, { force: true })
      symlinkSync(join(ROOT, '启动懒人做PPT.command'), link)
    }
    console.log('已在桌面建好「懒人做PPT」，以后双击它就能打开。')
  }
  catch (e) { console.log(`桌面快捷方式没建成（${e.message.split('\n')[0]}），以后双击项目文件夹里的启动文件也一样。`) }
}

await askShortcut()

// 已经开着一个「懒人做 PPT」：不再起服务，直接打开浏览器
if (await fetch(`${url}api/state`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok, () => false)) {
  console.log(`懒人做 PPT 已经在运行，已打开浏览器：${url}`)
  openBrowser()
  process.exit(0)
}

if (!existsSync(join(ROOT, 'node_modules', '@slidev', 'cli'))) {
  console.log('第一次运行，正在安装依赖（约 1～3 分钟）…')
  execSync('npm install --no-audit --no-fund', { cwd: ROOT, stdio: 'inherit' })
}

const { startServer } = await import('../src/server.mjs')
try {
  await startServer(port)
}
catch (e) {
  console.error(e.code === 'EADDRINUSE' ? `端口 ${port} 被别的程序占用了，请先关掉它再启动。` : e)
  process.exit(1)
}
console.log(`\n  懒人做 PPT 已启动：${url}\n  关掉这个窗口即停止。\n`)
openBrowser()
