import { EXPERIMENTS } from '../experiments';

export async function authenticate(email: string, password: string): Promise<string> {
  if (EXPERIMENTS.simulateNetworkDelay) {
    // simula latência de rede (útil para testar jank/blocking)
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    return 'fake-token-123';
  }
  // exemplo real (JSONPlaceholder apenas para simular request)
  const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  if (!res.ok) throw new Error('Network error');
  // só retornamos uma string token fictícia
  return 'token-from-server';
}
