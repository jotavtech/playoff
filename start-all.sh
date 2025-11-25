#!/bin/bash

echo "🚀 Iniciando PlayOff - Sistema Completo"
echo "📡 Backend na porta 3000"
echo "🎵 Frontend na porta 5173"

# Mata processos existentes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Aguarda um pouco para os processos terminarem
sleep 2

# Inicia o backend em background
echo "🔧 Iniciando backend..."
node server.js &
BACKEND_PID=$!

# Aguarda o backend inicializar
sleep 3

# Inicia o frontend em background  
echo "🎨 Iniciando frontend..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Sistema iniciado!"
echo "📱 Acesse: http://localhost:5173"
echo "🔍 API: http://localhost:3000/api/health"
echo ""
echo "Para parar: Ctrl+C ou rode: pkill -f node && pkill -f vite"

# Aguarda os processos
wait $BACKEND_PID $FRONTEND_PID 