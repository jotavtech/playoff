#!/bin/bash

# PlayOff Music Voting - Script de Inicialização
# Versão 3.1.0 - Simplificação da Interface

echo "🎵 Iniciando PlayOff Music Voting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto PlayOff"
    exit 1
fi

# Finalizar processos anteriores se existirem
echo "🧹 Limpando processos anteriores..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Verificar dependências
echo "📦 Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "🔄 Instalando dependências..."
    npm install
fi

# Iniciar os serviços
echo "🚀 Iniciando servidor backend na porta 3000..."
echo "🚀 Iniciando frontend na porta 5173..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Funcionalidades:"
echo "  🎯 Votação simplificada por cards"
echo "  ⚡ Super Voto com reprodução imediata"
echo "  🎨 Interface clean sem chat"
echo "  📱 Totalmente responsivo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Acesse: http://localhost:5173"
echo "📡 API: http://localhost:3000/api"
echo ""
echo "⚡ Para usar o Super Voto:"
echo "   1. Navegue pelos cards de música"
echo "   2. Clique no botão '⚡ Super Voto'"
echo "   3. A música será votada E tocará imediatamente!"
echo ""
echo "🔄 Pressione Ctrl+C para parar os serviços"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Iniciar com concurrently
npm start 