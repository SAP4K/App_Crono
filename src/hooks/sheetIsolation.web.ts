let count = 0;
let release: (() => void) | undefined;

export function isolateSheetBackground(): () => void {
  if (count++ === 0) {
    const app = document.getElementById('crono-app');
    const wasInert = app?.inert;
    const wasHidden = app?.getAttribute('aria-hidden');
    if (app) { app.inert = true; app.setAttribute('aria-hidden', 'true'); }
    release = () => {
      if (!app) return;
      app.inert = wasInert ?? false;
      if (wasHidden === null || wasHidden === undefined) app.removeAttribute('aria-hidden');
      else app.setAttribute('aria-hidden', wasHidden);
    };
  }
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (--count === 0) { release?.(); release = undefined; }
  };
}
