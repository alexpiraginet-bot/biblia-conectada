export type NativeAppLinks = { ios: string | null; android: string | null };

type AppEnvironment = {
  [key: string]: string | undefined;
  IOS_APP_AVAILABLE?: string;
  IOS_APP_STORE_URL?: string;
  ANDROID_APP_AVAILABLE?: string;
  ANDROID_PLAY_STORE_URL?: string;
};

/** These are public store addresses, never API credentials or unverified custom schemes. */
function storeUrl(value: string | undefined, platform: "ios" | "android"): string | null {
  if (!value || value.length > 512 || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return null;
    if (platform === "ios") {
      if (url.hostname !== "apps.apple.com" || !/^\/(?:[a-z]{2}\/)?app\/(?:[a-zA-Z0-9%_-]+\/)?id[1-9]\d*$/.test(url.pathname) || url.search) return null;
    } else {
      if (url.hostname !== "play.google.com" || url.pathname !== "/store/apps/details") return null;
      const ids = url.searchParams.getAll("id");
      if (ids.length !== 1 || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(ids[0])) return null;
      // Canonicalize rather than forwarding campaign or arbitrary query parameters.
      url.search = new URLSearchParams({ id: ids[0] }).toString();
    }
    return url.href;
  } catch { return null; }
}

/** Availability is an explicit launch switch; merely setting an address does not announce a release. */
export function nativeAppLinks(env: AppEnvironment = process.env): NativeAppLinks {
  return {
    ios: env.IOS_APP_AVAILABLE === "true" ? storeUrl(env.IOS_APP_STORE_URL, "ios") : null,
    android: env.ANDROID_APP_AVAILABLE === "true" ? storeUrl(env.ANDROID_PLAY_STORE_URL, "android") : null,
  };
}

export function appleStoreId(url: string | null): string | null {
  try { return url ? new URL(url).pathname.match(/\/id([1-9]\d*)$/)?.[1] ?? null : null; }
  catch { return null; }
}
