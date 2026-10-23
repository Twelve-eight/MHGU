@echo off
rem Builds boxprobe.dll, the read-only item-box site probe for Forge PC (MSVC x64, C only).
rem Needs no Vulkan SDK: the plugin only uses forge_pc.h.
rem Output: dist\mods\0100770008DD8000\BoxProbe\plugins\boxprobe.dll
setlocal
cd /d "%~dp0"

rem locate the Visual Studio environment, same search as forge-pc's build.bat
where cl >nul 2>&1 && goto :env_ok
"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -property installationPath > "%TEMP%\boxprobe_vsdir.txt"
set /p VSDIR=<"%TEMP%\boxprobe_vsdir.txt"
call "%VSDIR%\VC\Auxiliary\Build\vcvars64.bat" >nul || exit /b 1
:env_ok

set "OUT=dist\mods\0100770008DD8000\BoxProbe\plugins"
if not exist build mkdir build
if not exist "%OUT%" mkdir "%OUT%"

rem forge_pc.h lives in the workspace checkout of forge-pc, three levels above this folder
cl /nologo /O2 /MT /W4 /LD boxprobe.c /I"..\..\..\.tmp\ext\forge-pc\include" /Fo:build\boxprobe.obj /Fe:"%OUT%\boxprobe.dll" /link /IMPLIB:build\boxprobe.lib || exit /b 1
del /q "%OUT%\boxprobe.exp" 2>nul

echo.
echo Built: %OUT%\boxprobe.dll
