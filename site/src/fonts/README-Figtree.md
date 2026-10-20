# Figtree — interface typography

Figtree by Erik Kennedy / The Figtree Project Authors replaces Space Grotesk as the interface voice. Newsreader Display and Literata remain the title and Scripture families. The previous Space Grotesk asset is retained for reproducibility, but is no longer imported by the root layout.

- Source: <https://github.com/erikdkennedy/figtree>
- Original file: `fonts/webfonts/Figtree[wght].woff2`
- Exact upstream Git blob: `a24730ed2dad827ae56e795de64aa231640515dc`
- Downloaded unchanged on 2026-10-20 as `Figtree-VF.woff2`.
- SHA-256: `6b96ce6d4783658f09e2b92d468da8e542d57aa6e4bc461ab2e7ae71565fdc64`.
- Payload: 27,676 bytes, 32 bytes smaller than the previous 27,708-byte UI font.
- Variable upright weight axis: 300–900. Official family metadata: <https://github.com/google/fonts/blob/main/ofl/figtree/METADATA.pb>.
- License: SIL Open Font License 1.1. The upstream license is copied unchanged in `OFL-Figtree.txt` (Git blob `80b12bb3d0c0942676657ef6d125daf4a1e1346d`).

`next/font/local` serves this single variable WOFF2 with `font-display: swap` through the existing `--nf-ui` / `--font-ui` variables. No third-party runtime stylesheet or font request is added. The full upstream webfont is used rather than a modified subset. UI icons continue to use the existing SVG icon component; browser fallback remains available for uncommon symbols.

To reproduce the file exactly, retrieve GitHub's blob API resource for the hash above and decode its base64 `content`; verify the SHA-256 before replacing the local file. The older `scripts/subset-fonts.sh` describes the original Space Grotesk/Newsreader process and does not regenerate Figtree.
