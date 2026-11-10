import type { MetadataRoute } from "next";
import { FIRST_THEME, THEME_COLOR } from "@/components/header/theme";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from "@/lib/site-identity";

// The installed app's splash and title bar: the ground of the theme the app opens in (a manifest cannot follow the
// reader's choice; "sistema" has no single ground, so it keeps the night's).
const GROUND = FIRST_THEME === "sistema" ? THEME_COLOR.noite : THEME_COLOR[FIRST_THEME];

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: GROUND,
    theme_color: GROUND,
    categories: ["books", "education"],
    icons: [
      { src: "/icons/app-192-v1.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-512-v1.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/app-maskable-512-v1.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ler a Bíblia", short_name: "Ler", url: "/ler", description: "Escolha um livro e comece a leitura." },
      { name: "Céu de ligações", short_name: "Conexões", url: "/arcos", description: "Explore conexões bíblicas em 3D." },
      { name: "Caminhos de Jesus", short_name: "Mapa", url: "/caminhos", description: "Siga as passagens pelo mapa." },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
