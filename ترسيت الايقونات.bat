@echo off
rem Rebuild icon cache (fix white/blank icons)

taskkill /f /im explorer.exe

del /f /a "%localappdata%\IconCache.db"
del /f /a "%localappdata%\Microsoft\Windows\Explorer\iconcache_*.db"

start explorer.exe
exit