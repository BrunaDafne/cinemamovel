#!/usr/bin/env bash
set -euo pipefail

PKG="com.cinemamovel"
ACTIVITY=".MainActivity"
OUTDIR="./results_details"
mkdir -p "$OUTDIR"

# Coordenadas (ajuste para seu device)
X_CENTER=360
Y_SEARCH=120
CARD_X=180
CARD_Y=550

# Dentro do detail: coordenadas dos controles (necessário ajustar/provar)
FAV_X=650   # exemplo: botão favorito no canto superior direito (ajuste)
FAV_Y=1010
STAR3_X=350
STAR3_Y=1200
TOGGLE_OVERVIEW_X=350
TOGGLE_OVERVIEW_Y=1350

WAIT_AFTER_START=8
LOOPS=3
SLEEP_SHORT=1
SLEEP_MED=2
FINAL_WAIT=3

TS=$(date +"%Y%m%d_%H%M%S")
RAW_LOG="$OUTDIR/raw_$TS.log"
JSON_FILE="$OUTDIR/metrics_json_$TS.json"
SUMMARY_FILE="$OUTDIR/summary_$TS.txt"

echo "Output: $OUTDIR"
echo "Limpando app..."
adb shell pm clear "$PKG" >/dev/null

echo "Iniciando app..."
adb shell am start -W "$PKG/$ACTIVITY" >/dev/null
echo "Esperando $WAIT_AFTER_START s..."
sleep $WAIT_AFTER_START

echo "Limpando logcat..."
adb logcat -c

# abrir dashboard -> tocar card (ajuste coords conforme seu layout)
echo "Abrindo card (tap $CARD_X,$CARD_Y)"
adb shell input tap $CARD_X $CARD_Y
sleep $SLEEP_MED

echo "🔄 Executando sequência no detalhe (loops=$LOOPS)..."

for i in $(seq 1 $LOOPS); do
  echo " ➤ Loop $i: toggle favorite"
  adb shell input tap $FAV_X $FAV_Y
  sleep $SLEEP_SHORT

  echo "    set star 3"
  adb shell input tap $STAR3_X $STAR3_Y
  sleep $SLEEP_SHORT

  echo "    toggle overview"
  adb shell input tap $TOGGLE_OVERVIEW_X $TOGGLE_OVERVIEW_Y
  sleep $SLEEP_SHORT

  echo "    voltar"
  adb shell input keyevent 4
  sleep $SLEEP_MED

  # reabrir para próximo loop
  adb shell input tap $CARD_X $CARD_Y
  sleep $SLEEP_MED
done

echo "Aguardando $FINAL_WAIT s para métricas..."
sleep $FINAL_WAIT

echo "Capturando logcat..."
adb logcat -d > "$RAW_LOG"

# extrai último bloco JSON entre marcadores (awk)
awk '
  /---METRICS_JSON_START---/ { inblock = 1; buf = ""; next }
  /---METRICS_JSON_END---/   { inblock = 0; last = buf; next }
  inblock { buf = buf $0 "\n" }
  END { if (last) { printf "%s", last } else if (buf) { printf "%s", buf } }
' "$RAW_LOG" > "${JSON_FILE}.tmp" || true

if [[ ! -s "${JSON_FILE}.tmp" ]]; then
  echo "❗ Não encontrei bloco JSON no raw log. Veja $RAW_LOG"
  exit 1
fi

# limpa prefixos de log (por ex '10-14 22:33:42.773 ... ReactNativeJS:')
sed -E 's/^.*I ReactNativeJS: //; /^$/d' "${JSON_FILE}.tmp" > "$JSON_FILE" || true
rm -f "${JSON_FILE}.tmp"

# resumo Python (sem mudanças, gera summary)
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

sr = j.get("screenRenders", 0)
comp = j.get("componentRenders", {})
ie = j.get("interactionEvents", [])

total_comp = len(comp)
total_comp_renders = sum(comp.values()) if comp else 0
avg_per_comp = (total_comp_renders / total_comp) if total_comp else 0
top = sorted(comp.items(), key=lambda x: x[1], reverse=True)[:30]

print("📊 RESUMO - DETAILS RERENDERS")
print("Arquivo JSON:", p)
print()
print(f"Screen renders: {sr}")
print(f"Componentes distintos contados: {total_comp}")
print(f"Total de renders em componentes: {total_comp_renders}")
print(f"Média de renders por componente: {avg_per_comp:.2f}")
print()
print("Top components por número de renders:")
for cid, cnt in top:
    print(f"  - {cid} => {cnt} renders")
print()
print("Eventos de interação (count):", len(ie))
if ie:
    print("Últimos eventos (acao @ timestamp):")
    for ev in ie[-20:]:
        print(" ", ev.get("action"), "@", ev.get("timestamp"))
print()
out_json = os.path.join(os.path.dirname(p), "metrics_details_saved.json")
with open(out_json, "w", encoding="utf8") as fo:
    json.dump(j, fo, indent=2, ensure_ascii=False)
print("JSON final salvo em:", out_json)
PY

echo "Concluído."
echo " - Raw log: $RAW_LOG"
echo " - JSON extraído: $JSON_FILE"
echo " - Resumo: $SUMMARY_FILE"
cat "$SUMMARY_FILE"
