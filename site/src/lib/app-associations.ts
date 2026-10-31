import "server-only";
import books from "@/data/generated/books.json";

type AssociationEnvironment = {
  [key: string]: string | undefined;
  IOS_UNIVERSAL_LINKS_ENABLED?: string;
  IOS_APPLICATION_ID?: string;
  ANDROID_APP_LINKS_ENABLED?: string;
  ANDROID_APPLICATION_ID?: string;
  ANDROID_SIGNING_SHA256?: string;
};

type PathComponent = { "/": string; exclude?: true };

/** Only public content families. Do not replace this with a domain-wide wildcard. */
export const NATIVE_CONTENT_PATHS = [
  "/", "/ler", "/ler/open-nbv", "/liturgia", "/dia/*",
  "/arcos", "/arcos/plano", "/explorar", "/explorar/*",
  "/conexao/*", "/caminhos", "/cronologia", "/linha-do-tempo", "/linha-do-tempo/*",
  "/interlinear", "/interlinear/*", "/tema", "/tema/*", "/palavra", "/palavra/*",
  "/ponte", "/ponte/*", "/trilha", "/trilha/antes-do-natal", "/trilha/antes-do-natal/*",
  "/coracao", "/assistente", "/buscar", "/sobre",
  ...books.flatMap(({ slug }) => [
    `/${slug}`, `/${slug}/*`, `/ler/open-nbv/${slug}`, `/ler/open-nbv/${slug}/*`,
  ]),
] as const;

// Saved items, anonymous rewards and the personal study desk belong to the browser's
// local session. A content link must not imply that those records migrate to an app.
const WEB_ONLY_PREFIXES = [
  "/api", "/_next", "/.well-known", "/instalar", "/og", "/files", "/data", "/dados",
  "/admin", "/salvos", "/jornada", "/mesa",
] as const;

/** Both formats evaluate the first matching component. Preserve this ordering. */
export function nativeLinkComponents(): PathComponent[] {
  return [
    ...WEB_ONLY_PREFIXES.flatMap((path) => [
      { "/": path, exclude: true as const },
      { "/": `${path}/*`, exclude: true as const },
    ]),
    ...NATIVE_CONTENT_PATHS.map((path) => ({ "/": path })),
    { "/": "*", exclude: true },
  ];
}

function appleApplicationId(value: string | undefined): string | null {
  if (!value || value.length > 255) return null;
  // application-identifier from the signed app: prefix (usually Team ID) + bundle ID.
  // An App Store numeric ID is a different identifier and is intentionally rejected.
  return /^[A-Z0-9]{10}\.[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*)+$/.test(value) ? value : null;
}

function androidApplicationId(value: string | undefined): string | null {
  if (!value || value.length > 255) return null;
  return /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(value) ? value : null;
}

function signingFingerprints(value: string | undefined): string[] | null {
  if (!value || value.length > 2_000) return null;
  const fingerprints = value.split(",").map((part) => part.trim().toUpperCase());
  if (fingerprints.length > 10 || fingerprints.some((part) => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(part))) return null;
  return [...new Set(fingerprints)];
}

/** IDs are configuration, never guessed. Syntax validation does not prove app ownership. */
export function appleAppAssociation(env: AssociationEnvironment = process.env) {
  const appID = env.IOS_UNIVERSAL_LINKS_ENABLED === "true" ? appleApplicationId(env.IOS_APPLICATION_ID) : null;
  return {
    applinks: {
      apps: [],
      details: appID ? [{ appIDs: [appID], components: nativeLinkComponents() }] : [],
    },
  };
}

export function androidAppAssociation(env: AssociationEnvironment = process.env) {
  if (env.ANDROID_APP_LINKS_ENABLED !== "true") return [];
  const packageName = androidApplicationId(env.ANDROID_APPLICATION_ID);
  const fingerprints = signingFingerprints(env.ANDROID_SIGNING_SHA256);
  if (!packageName || !fingerprints) return [];
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: fingerprints,
    },
    relation_extensions: {
      "delegate_permission/common.handle_all_urls": {
        // Android <= 14 ignores these rules. Its Manifest MUST also restrict paths.
        dynamic_app_link_components: nativeLinkComponents(),
      },
    },
  }];
}

// No stale empty/incorrect association in our CDN. Apple/Android control their own
// association caches; revocation still requires testing the platform's refresh behavior.
export const ASSOCIATION_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
