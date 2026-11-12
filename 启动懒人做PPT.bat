@echo off
rem Double-click to start Lanren PPT (Windows). If it is already running, this just opens the browser.
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
node scripts\start.mjs --launcher
if errorlevel 1 pause
exit /b
:nonode
echo 没找到 Node.js：请先到 https://nodejs.org 下载安装 LTS 版（18.18 以上），装好后再双击本文件。
pause
