import { createContext, useContext, type PropsWithChildren } from 'react';

const PresentationContext = createContext(true);

/** Visibility only; global timing, audio and notification owners never use this scope. */
export function PresentationScope({ active, independent = false, children }: PropsWithChildren<{ active: boolean; independent?: boolean }>) {
  const parent = useContext(PresentationContext);
  return <PresentationContext.Provider value={active && (independent || parent)}>{children}</PresentationContext.Provider>;
}
export function usePresentationActive() { return useContext(PresentationContext); }
