import type { NextConfig } from "next";
import books from "./src/data/generated/books.json";
import { abbreviationRedirects } from "./src/lib/canon/redirects";
import { EXPLORE_HOME_PATH } from "./src/lib/explore/home";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Safari's Add to Home Screen needs the app identity in the initial head, including on /arcos.
  // Dynamic metadata otherwise streams into body; keep icons, manifest and the app title together in head.
  htmlLimitedBots: /.*/,
  // books.json is written by `npm run data`, which runs before `next build` and `next dev` reads the last one
  async redirects() {
    // /explorar opens on the home centre (src/lib/explore/home.ts); checked before the filesystem, so it stays static
    return [{ source: "/explorar", destination: EXPLORE_HOME_PATH, permanent: false }, ...abbreviationRedirects(books)];
  },
  // the open data bundle (DADOS.md) can be read by pages and apps on other sites
  async headers() {
    return [{ source: "/dados/v1/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] }];
  },
};

export default nextConfig;
