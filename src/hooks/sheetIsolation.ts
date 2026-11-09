// Native Modal owns presentation and accessibility isolation.
export function isolateSheetBackground(): () => void { return () => undefined; }
