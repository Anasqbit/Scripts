import os
import glob
import subprocess

# 1. جلب المسارات الديناميكية لكل جهاز
user_profile = os.environ.get('USERPROFILE', os.path.expanduser('~'))
discord_dir = os.path.join(user_profile, 'AppData', 'Local', 'Discord')
bat_path = os.path.join(discord_dir, 'start_discord.bat')

# جلب مسار سطح المكتب الصحيح حتى لو كان مغيراً أو مخصصاً
desktop_path = os.path.join(user_profile, 'Desktop')
try:
    import winreg
    key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders")
    desktop_path, _ = winreg.QueryValueEx(key, "Desktop")
    desktop_path = os.path.expandvars(desktop_path)
except Exception:
    pass

shortcut_path = os.path.join(desktop_path, 'Discord.lnk')

# 2. تحديد مسار الأيقونة ديناميكياً من أحدث إصدار مثبت للديسكورد
icon_target = os.path.join(discord_dir, 'Update.exe')
app_folders = glob.glob(os.path.join(discord_dir, 'app-*'))
if app_folders:
    latest_app = max(app_folders, key=os.path.getmtime)
    possible_exe = os.path.join(latest_app, 'Discord.exe')
    if os.path.exists(possible_exe):
        icon_target = possible_exe

# 3. كتابة ملف الـ BAT بالمسارات العامة (%LOCALAPPDATA%)
bat_content = """@echo off
tasklist /fi "imagename eq goodbyedpi.exe" | find /i "goodbyedpi.exe" >nul
if errorlevel 1 (
    call "%LOCALAPPDATA%\\Discord\\VPN\\turkey_dnsredir_alternative2_superonline.cmd"
    timeout /t 2 /nobreak >nul
)
"%LOCALAPPDATA%\\Discord\\Update.exe" --processStart Discord.exe
"""

with open(bat_path, 'w', encoding='utf-8') as f:
    f.write(bat_content)

# 4. إنشاء الشورتكت على سطح المكتب
ps_script = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{shortcut_path}')
$Shortcut.TargetPath = '{bat_path}'
$Shortcut.WorkingDirectory = '{discord_dir}'
$Shortcut.IconLocation = '{icon_target},0'
$Shortcut.Save()
"""

subprocess.run(["powershell", "-Command", ps_script], capture_output=True)
print("تم الشغل بنجاح.")