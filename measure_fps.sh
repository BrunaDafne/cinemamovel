#!/bin/bash
# Automação simples para medir FPS/Jank no React Native

PKG="com.cinemamovel"         # nome do seu package
ACTIVITY=".MainActivity"      # activity principal
LOOPS=5                       # quantas vezes repetir
WAIT_AFTER_START=10           # tempo para garantir carregamento da lista
YSTART=400                    # ponto inicial do swipe (meio da tela)
YEND=1200                     # ponto final do swipe (quase fundo da tela)
X=360                         # metade da largura (720 / 2)

echo "Limpando cache do app..."
adb shell pm clear $PKG

echo "Iniciando app..."
adb shell am start -W $PKG/$ACTIVITY
sleep $WAIT_AFTER_START # espera o tempo de 10 segundos 

echo "Iniciando coleta de métricas..."
adb shell dumpsys gfxinfo $PKG reset

for i in $(seq 1 $LOOPS); do 
  echo "Loop $i: scroll para baixo..."
  adb shell input swipe $X $YEND $X $YSTART 500
  sleep 1
  echo "Loop $i: scroll para cima..."
  adb shell input swipe $X $YSTART $X $YEND 500
  sleep 1
done

echo "Coletando métricas finais..."
adb shell dumpsys gfxinfo $PKG > results_fps.txt

echo "Teste finalizado. Veja o arquivo results_fps.txt"
