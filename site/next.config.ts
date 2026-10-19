import type { NextConfig } from "next";
import books from "./src/data/generated/books.json";
import { abbreviationRedirects } from "./src/lib/canon/redirects";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // books.json is written by `npm run data`, which runs before `next build` and `next dev` reads the last one
  async redirects() {
    return abbreviationRedirects(books);
  },
  // the open data bundle (DADOS.md) can be read by pages and apps on other sites
  async headers() {
    return [{ source: "/dados/v1/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] }];
  },
};

export default nextConfig;
