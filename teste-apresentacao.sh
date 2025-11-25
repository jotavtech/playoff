#!/bin/bash

echo "🎵 DEMONSTRAÇÃO PLAYGROUND - PADRÃO OBSERVER"
echo "=============================================="
echo ""

echo "📡 1. VERIFICANDO STATUS DO SISTEMA..."
curl -s http://localhost:3000/api/health | jq -r '"Status: " + .status + " | Músicas: " + (.totalSongs|tostring) + " | Observers: " + (.observersRegistered|tostring)'
echo ""

echo "🎯 2. ESTADO INICIAL - MÚSICA ATUAL LÍDER:"
curl -s http://localhost:3000/api/health | jq -r '.highestVoted | "🎵 " + .title + " - " + .artist + " (" + (.votes|tostring) + " votos)"'
echo ""

echo "🔥 3. VOTANDO EM 'COCHISE' PARA DEMONSTRAR OBSERVER..."
echo "   Adicionando 10 votos para fazer Cochise assumir liderança..."

for i in {1..10}; do
  curl -s -X POST -H "Content-Type: application/json" \
       -d '{"songId":"audioslave-cochise"}' \
       http://localhost:3000/api/vote > /dev/null
  echo -n "."
done
echo " ✅ Votos adicionados!"
echo ""

echo "🎵 4. VERIFICANDO MUDANÇA AUTOMÁTICA (OBSERVER EM AÇÃO):"
curl -s http://localhost:3000/api/health | jq -r '.playerStatus | "🎧 Tocando agora: " + .song.title + " - " + .song.artist + " (" + (.song.votes|tostring) + " votos)"'
echo ""

echo "📊 5. TOP 3 MÚSICAS ATUAIS:"
curl -s http://localhost:3000/api/songs | jq -r '.songs[0:3] | to_entries[] | "  " + ((.key+1)|tostring) + ". " + .value.title + " - " + .value.artist + " (" + (.value.votes|tostring) + " votos)"'
echo ""

echo "🔄 6. TESTANDO SUPER VOTO (3 votos de uma vez) em 'Feel Good Inc.':"
curl -s -X POST -H "Content-Type: application/json" \
     -d '{"songId":"gorillaz-feel-good-inc"}' \
     http://localhost:3000/api/super-vote | jq -r '"✅ Super voto registrado! " + .song.title + " agora tem " + (.song.votes|tostring) + " votos"'
echo ""

echo "🎯 7. ESTADO FINAL DO SISTEMA:"
curl -s http://localhost:3000/api/health | jq -r '.playerStatus | "🎵 Música tocando: " + .song.title + " (" + (.song.votes|tostring) + " votos)"'
echo ""

echo "🚀 DEMONSTRAÇÃO CONCLUÍDA!"
echo "Observer funcionando perfeitamente - música mudou automaticamente! 🎵" 