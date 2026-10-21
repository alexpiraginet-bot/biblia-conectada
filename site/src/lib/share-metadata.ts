import type { Metadata } from "next";
import { SHARE_IMAGE_VERSION, SITE_NAME, SITE_URL } from "@/lib/site-identity";

type ShareMetadataInput = { title: string; description: string; path: string };

/** Server metadata points to one on-demand image endpoint, never an image built for every verse. */
export function shareMetadata({ title, description, path }: ShareMetadataInput): Metadata {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Share metadata requires a local path");
  const canonical = new URL(path, SITE_URL);
  if (canonical.origin !== new URL(SITE_URL).origin) throw new Error("Share metadata requires the site origin");
  // Fragments never reach crawlers. A selected sky passage must use its server-visible ref query instead.
  canonical.hash = "";
  const localPath = `${canonical.pathname}${canonical.search}`;
  const pageTitle = title.trim();
  const brandedTitle = pageTitle === SITE_NAME || pageTitle.endsWith(` · ${SITE_NAME}`)
    ? pageTitle
    : `${pageTitle} · ${SITE_NAME}`;
  const imageUrl = new URL(`/og?path=${encodeURIComponent(localPath)}&v=${encodeURIComponent(SHARE_IMAGE_VERSION)}`, SITE_URL).href;
  return {
    title: { absolute: brandedTitle },
    description,
    alternates: { canonical: canonical.href },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: SITE_NAME,
      title: brandedTitle,
      description,
      url: canonical.href,
      images: [{ url: imageUrl, width: 1200, height: 630, type: "image/png", alt: brandedTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: [{ url: imageUrl, alt: brandedTitle }],
    },
  };
}
