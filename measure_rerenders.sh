#!/bin/bash
PKG="com.cinemamovel"
ACTIVITY=".MainActivity"

echo "🧹 Limpando cache..."
adb shell pm clear $PKG

echo "🚀 Iniciando app..."
adb shell am start -W $PKG/$ACTIVITY
sleep 10

echo "🔍 Simulando busca..."
adb shell input tap 300 150 # campo de busca
adb shell input text "Matrix"
sleep 2
adb shell input keyevent 66 # Enter

echo "🎬 Coletando logs..."
adb logcat -d | grep "render" > render_logs.txt

echo "✅ Teste concluído. Veja render_logs.txt"
