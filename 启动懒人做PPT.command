#!/bin/bash
# 双击启动懒人做 PPT（macOS）；已经在运行就只打开浏览器。桌面上的快捷方式是指向本文件的链接，先找到本文件所在的文件夹
cd "$(dirname "$(readlink "$0" || echo "$0")")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "没找到 Node.js：请先到 https://nodejs.org 下载安装 LTS 版（18.18 以上），装好后再双击本文件。"
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi
exec node scripts/start.mjs --launcher
