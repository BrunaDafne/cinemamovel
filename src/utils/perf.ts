export function now() {
    return Date.now();
  }
  
  export function logPerf(label: string, t0: number, t1?: number) {
    const end = t1 ?? now();
    const dt = end - t0;
    // aqui: console.log e também salvar em AsyncStorage se quiser exportar depois
    // eslint-disable-next-line no-console
    console.log(`[PERF] ${label}: ${dt}ms`);
  }
  