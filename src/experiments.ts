export const EXPERIMENTS = {
    simulateNetworkDelay: false,   // simula latência para testar UI bloqueante
    blockUIOnSubmit: true,         // bloquear botão enquanto submit (p/ testar render)
    storeTokenSecurely: false,     // trocar AsyncStorage por implementação mais custosa (ex.: criptografia)
    prefetchHomeAssets: true,      // após login, prefetch de imagens/recursos do Home
    lazyLoadHomeScreen: true,      // import('Home') vs import direto (code-splitting)
  };
  