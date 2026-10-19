---
version: 1
slug: "site-src-app-layout-tsx"
primary_target: "site/src/app/layout.tsx"
related_targets: ["site/src/app/page.tsx","site/src/app/(site)","site/src/app/arcos","site/src/components"]
---

# Surface brief: the whole site (v4 "Atlas")

Scope: every route of `site/` (shell, capa, leitura, Explorar e conexão, linha do tempo, temas, palavras, comunidade, céu, dados, sobre, busca, 404). Modes per surface: design/README.md §1.2 (Read for reading and lists, Experience for the capa map and the sky, Operate for search and panels).

Audience and job: people arriving from the Reels on a phone, then students; open a passage, read it comfortably, follow its links, find any verse or word in one gesture. Constraint: Alex's feedback of 19/10 (contrast, hard reading, hard search) is the acceptance test.

## Direction contract

THESIS: An atlas of the Bible's links. Every passage opens a map: the text reads in one calm column, every link is a gold line on a navy sky. Refuses the category default of a devotional reader with a verse-of-the-day card and of a dark dashboard with card grids.

OWN-WORLD: Navy night ground (#06121B) and parchment day (#F6F1E6); gold/bronze accent for numbers and lit links; engraved medallions (gold on navy coins) for the book groups; the arc over a baseline as the only motif; Newsreader Display titles, Literata scripture at 19–21px, Space Grotesk interface; hairline lists instead of cards; one floating surface at a time (sheet, search, menu).

STORY: The visitor sees that the Bible is a map of links, with real counts ("830 ligações", "427 capítulos ligados"); trusts the numbers because each states its rule; reads the passage, opens a link, and finds anything by typing it once.

FIRST VIEWPORT: Capa: title and a factual sentence at top left, the big search field right below, the Isaías 9 map (chapter seal in the centre, eight medallions in orbit, gold strokes weighted by votes) filling the right two thirds on desktop and the top on phones, the "Conexão selecionada" panel (Isaías 9 ⇄ Lucas 2, "Ler lado a lado" as the one primary action) beside it on desktop and peeking below on phones. Reading pages: chapter rail, the scripture column, the links panel; the verse in focus lit, its count in gold.

FORM: Atlas with B's editorial reading and C's universal search, first of the three built prototypes Alex compared (A Atlas noturno, B Editorial vivo, C App moderno). seed: none (direction chosen by Alex on 19/10 from three built prototypes; no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

design/README.md §14.
