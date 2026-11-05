@echo off
setlocal
title DGX LLM - Versao Local
cd /d "%~dp0"

echo ============================================
echo         DGX LLM - CONVERSA LOCAL
echo ============================================
echo.
echo Esta versao roda no SEU computador, sem enviar
echo mensagens para APIs comerciais de IA.
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo ERRO: Python nao encontrado no PATH.
  echo Instale Python 3 em https://www.python.org/downloads/
  pause
  exit /b 1
)
where ollama >nul 2>nul
if errorlevel 1 (
  echo ERRO: Ollama nao encontrado.
  echo Instale em https://ollama.com/download
  pause
  exit /b 1
)
ollama list | findstr /I /C:"qwen3:4b" >nul
if errorlevel 1 (
  echo O modelo qwen3:4b ainda nao foi baixado.
  echo Abra o Prompt de Comando e execute:
  echo   ollama pull qwen3:4b
  echo Depois execute este arquivo novamente.
  pause
  exit /b 1
)

set "DGX_HOST=127.0.0.1"
set "PORT=8765"
set "LLM_BASE_URL=http://127.0.0.1:11434/v1"
set "LLM_MODEL=qwen3:4b"
set "LLM_API_KEY="
set "DGX_ACCESS_PIN=dgx-local"

echo Abrindo DGX LLM em http://127.0.0.1:8765
echo Codigo de acesso: dgx-local
echo.
echo Nao feche esta janela enquanto estiver usando a IA.
echo Use CTRL+C para encerrar.
start "" "http://127.0.0.1:8765"
python app.py
echo.
echo O servidor DGX LLM foi encerrado.
pause
