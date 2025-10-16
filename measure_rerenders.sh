#!/usr/bin/env bash
# Isso é para caso falhe: 
# -e -> Para o script em caso de erro
# -u -> Erro se usar variável indefinida
# -o pipefail -> Erro se qualquer comando em pipe falhar
set -euo pipefail 

# ----------------- CONFIG -----------------
PKG="com.cinemamovel"
ACTIVITY=".MainActivity"
OUTDIR="./results_rerender"
mkdir -p "$OUTDIR"

X_CENTER=360
Y_SEARCH=120
Y_FILTER=220
CARD_X=180
CARD_Y=550
# Texto digitado no campo de busca
SEARCH_TEXT="Amor"
# Tempo de espera inicial para dar tempo de logar
WAIT_AFTER_START=8
# Quantidade de vezes que vai rodar, sair e voltar do card
LOOPS=3
# Delay para gerar os dados
SLEEP_SHORT=1
SLEEP_MED=2
FINAL_WAIT=3

# Arquivos de saída
TS=$(date +"%Y%m%d_%H%M%S")
RAW_LOG="$OUTDIR/metrics_raw_$TS.log"
JSON_FILE="$OUTDIR/metrics_json_$TS.json"
SUMMARY_FILE="$OUTDIR/summary_$TS.txt"

echo "Output: $OUTDIR"
echo "Limpando app..."
adb shell pm clear "$PKG" >/dev/null

echo "Iniciando app..."
adb shell am start -W "$PKG/$ACTIVITY" >/dev/null
echo "Esperando $WAIT_AFTER_START s para carregamento..."
sleep $WAIT_AFTER_START

echo "Limpando buffer de logcat..."
adb logcat -c

echo "🔄 Iniciando sequência (loops=$LOOPS)..."
adb shell input tap $X_CENTER $Y_SEARCH
sleep $SLEEP_SHORT
adb shell input text "$SEARCH_TEXT"
sleep $SLEEP_SHORT
adb shell input keyevent 66
sleep $SLEEP_MED
adb shell input tap $X_CENTER $Y_FILTER
sleep $SLEEP_MED

for i in $(seq 1 $LOOPS); do
  echo " ➤ Loop $i: abrir card (tap $CARD_X,$CARD_Y)"
  adb shell input tap $CARD_X $CARD_Y
  sleep $SLEEP_MED
  adb shell input keyevent 4
  sleep $SLEEP_MED
done

echo "⏳ Aguardando $FINAL_WAIT s para métricas serem logadas..."
sleep $FINAL_WAIT

echo "📥 Capturando logcat (arquivo grande, útil para debug)..."
adb logcat -d > "$RAW_LOG"

# ----- extrair O ÚLTIMO bloco entre os marcadores -----
# usamos awk: busca o último bloco entre as linhas marker
# (awk mantém a última ocorrência em buffer_last)
awk '
  /---METRICS_JSON_START---/ { inblock = 1; buf = ""; next }
  /---METRICS_JSON_END---/   { inblock = 0; last = buf; next }
  inblock { buf = buf $0 "\n" }
  END { if (last) { printf "%s", last } else if (buf) { printf "%s", buf } }
' "$RAW_LOG" > "${JSON_FILE}.tmp" || true

# Se tmp vazio -> erro
if [[ ! -s "${JSON_FILE}.tmp" ]]; then
  echo "❗ Não encontrei bloco JSON no raw log. Veja $RAW_LOG para debug."
  exit 1
fi

# remover possíveis prefixos do tipo "10-14 22:33:42.773  6446  6479 I ReactNativeJS: "
# e linhas vazias; produzir JSON limpo
sed -E 's/^.*I ReactNativeJS: //; s/^[0-9]{2}-[0-9]{2} .*I ReactNativeJS: //; /^$/d' "${JSON_FILE}.tmp" > "$JSON_FILE" || true
rm -f "${JSON_FILE}.tmp"

# valida JSON simples (tenta achar { e })
if ! grep -q '{' "$JSON_FILE"; then
  echo "❗ JSON extraído vazio ou inválido. Veja $RAW_LOG"
  exit 1
fi

# ---------- Parser Python (gera resumo legível) ----------
python3 - <<PY > "$SUMMARY_FILE"
import json,sys,os
p = "$JSON_FILE"
try:
    with open(p,'r',encoding='utf8') as f:
        raw = f.read().strip()
        start = raw.find('{')
        end = raw.rfind('}')+1
        if start==-1 or end==-1:
            print("ERRO: JSON inválido em", p); sys.exit(2)
        j = json.loads(raw[start:end])
except Exception as e:
    print("Erro lendo JSON:", e); sys.exit(2)

dashboard_renders = j.get("dashboardRenders", 0)
card_renders = j.get("cardRenders", {})
nav_events = j.get("navigationEvents", [])

total_cards = len(card_renders)
total_card_renders = sum(card_renders.values()) if card_renders else 0
avg_per_card = (total_card_renders / total_cards) if total_cards else 0
top = sorted(card_renders.items(), key=lambda x: x[1], reverse=True)[:20]

print("📊 RESUMO DE RERENDERIZAÇÕES")
print("Arquivo JSON:", p)
print()
print(f"Dashboard renders: {dashboard_renders}")
print(f"Cards distintos renderizados: {total_cards}")
print(f"Total de renders em cards: {total_card_renders}")
print(f"Média de renders por card: {avg_per_card:.2f}")
print()
print("Top cards por número de renders:")
for cid, cnt in top:
    print(f"  - id={cid} => {cnt} renders")
print()
print("Eventos de navegação (count):", len(nav_events))
if nav_events:
    print("Últimos eventos (acao @ timestamp):")
    for ev in nav_events[-10:]:
        print("  ", ev.get("action"), "@", ev.get("timestamp"))
print()
out_json = os.path.join(os.path.dirname(p), "metrics_raw_json_saved.json")
with open(out_json, "w", encoding="utf8") as fo:
    json.dump(j, fo, indent=2, ensure_ascii=False)
print("JSON final salvo em:", out_json)
PY

echo "Coleta concluída."
echo " - Raw log: $RAW_LOG"
echo " - JSON extraído: $JSON_FILE"
echo " - Resumo: $SUMMARY_FILE"
echo ""
cat "$SUMMARY_FILE"
