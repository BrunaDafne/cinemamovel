import { useEffect, useRef } from 'react';

export function useRenderCount(label?: string) {
  const ref = useRef(0);
  ref.current++;
  useEffect(() => {
    // loga a cada render (útil em dev)
    // eslint-disable-next-line no-console
    console.log(`[RENDER] ${label ?? 'comp'} => ${ref.current}`);
  });
  return ref.current;
}
