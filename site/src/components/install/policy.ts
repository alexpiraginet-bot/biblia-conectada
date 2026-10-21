export const INSTALL_DISMISSED_KEY = "biblia-install-dismissed-until";
export const INSTALL_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

export function installDismissed(now = Date.now()): boolean {
  try {
    const until = Number(window.localStorage.getItem(INSTALL_DISMISSED_KEY));
    return Number.isFinite(until) && until > now && until <= now + INSTALL_DISMISS_MS;
  } catch { return false; }
}

export function dismissInstall(now = Date.now()): void {
  try { window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(now + INSTALL_DISMISS_MS)); }
  catch { /* The current visit still dismisses the notice when storage is unavailable. */ }
}
