#!/usr/bin/env bash
set -euo pipefail

PKG="com.cinemamovel"            # ajuste se necessário
ACTIVITY=".MainActivity"         # ajuste se necessário
OUT="./results_images"
mkdir -p "$OUT"

TS=$(date +"%Y%m%d_%H%M%S")
RAW="$OUT/logcat_$TS.log"
JSON="$OUT/metrics_json_$TS.json"
SUMMARY="$OUT/summary_$TS.txt"

echo "Output: $OUT"
echo "Clearing app data..."
adb shell pm clear "$PKG" >/dev/null || true

echo "Starting app..."
adb shell am start -W "$PKG/$ACTIVITY" >/dev/null || true

WAIT_AFTER_START=10
echo "Waiting $WAIT_AFTER_START s for app to load..."
sleep $WAIT_AFTER_START

echo "Clearing logcat buffer..."
adb logcat -c

# --- Interaction: perform slow scrolls to force image loads ---
# You can customize number of swipes and speed (y coordinates depend on device)
SWIPES=8
DELAY=1.2
echo "Performing $SWIPES swipe(s) to scroll the list..."
# swipe from near bottom to near top
for i in $(seq 1 $SWIPES); do
  echo " swipe $i ..."
  adb shell input swipe 360 1400 360 400 300   # adjust coordinates/duration for your device
  sleep $DELAY
done

# wait a bit for remaining loads
FINAL_WAIT=6
echo "Waiting $FINAL_WAIT s for final image loads..."
sleep $FINAL_WAIT

echo "Dumping logcat to $RAW ..."
adb logcat -d > "$RAW"

# extract last metrics block
awk '
  /---IMG_METRICS_START---/ { inblock = 1; buf = ""; next }
  /---IMG_METRICS_END---/   { inblock = 0; last = buf; next }
  inblock { buf = buf $0 "\n" }
  END { if (last) { printf "%s", last } else if (buf) { printf "%s", buf } }
' "$RAW" > "${JSON}.tmp" || true

if [[ ! -s "${JSON}.tmp" ]]; then
  echo "❗ Não encontrou blocos de métricas no logcat. Verifique $RAW"
  exit 1
fi

# Remove log prefixes like "10-27 12:34: ... I ReactNativeJS: "
sed -E 's/^.*ReactNativeJS: //; /^$/d' "${JSON}.tmp" > "$JSON" || true
rm -f "${JSON}.tmp"

# Validate JSON minimally
if ! grep -q '{' "$JSON"; then
  echo "❗ JSON inválido extraído. Veja $RAW"
  exit 1
fi

# Python parser to generate summary
python3 - <<PY > "$SUMMARY"
import json,sys,os,statistics
p = "$JSON"
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

card_renders = j.get("cardRenders", {})
image_loads = j.get("imageLoads", [])
dashboard_renders = j.get("dashboardRenders", 0)
nav_events = j.get("navigationEvents", [])

durations = [it.get("durationMs") for it in image_loads if isinstance(it.get("durationMs"), (int,float))]
cnt_images = len(durations)
total_images = len(image_loads)
avg = statistics.mean(durations) if durations else 0
med = statistics.median(durations) if durations else 0
_max = max(durations) if durations else 0
p95 = sorted(durations)[int(len(durations)*0.95)-1] if durations and len(durations)>=1 else 0

print("📊 IMAGE LOADING SUMMARY")
print("JSON:", p)
print()
print("Dashboard renders:", dashboard_renders)
print("Distinct cards rendered:", len(card_renders))
print("Total card render events (sum):", sum(card_renders.values()) if card_renders else 0)
print()
print("Image load events:", total_images)
print(f"Images with valid durations: {cnt_images}")
print(f"Average image load (ms): {avg:.1f}")
print(f"Median image load (ms): {med:.1f}")
print(f"95th percentile (ms): {p95:.1f}")
print(f"Max image load (ms): {_max}")
print()
print("Top 10 slowest images:")
for it in sorted(image_loads, key=lambda x: x.get("durationMs",0), reverse=True)[:10]:
    print("  id:", it.get("id"), "dur(ms):", it.get("durationMs"))
print()
print("Navigation events count:", len(nav_events))
if nav_events:
    print("Last navigation events:")
    for ev in nav_events[-10:]:
        print(" ", ev.get("action"), "@", ev.get("timestamp"))
print()
# Save raw JSON copy
out_json = os.path.join(os.path.dirname(p), "metrics_raw_json_saved.json")
with open(out_json, "w", encoding="utf8") as fo:
    json.dump(j, fo, indent=2, ensure_ascii=False)
print("Raw JSON saved to:", out_json)
PY

echo "Done. Summary -> $SUMMARY"
cat "$SUMMARY"
