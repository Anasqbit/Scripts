@echo off
echo Enabling Safe Mode (Minimal)...
bcdedit /set {current} safeboot minimal
echo Done. Restart your PC.
pause
