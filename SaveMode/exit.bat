@echo off
echo Disabling Safe Mode...
bcdedit /deletevalue {current} safeboot
echo Done.
pause
