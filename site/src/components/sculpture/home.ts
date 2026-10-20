// The sculpture as the page opens, the same on every screen: the orbit that frames the whole Bible at HOME_ASPECT, and
// the free area of the stage its box fills. Shared by the page (Sculpture.tsx) and the poster script
// (scripts/render-sculpture-poster.mjs), so the poster is the first frame.
import { BOOKS } from "@/lib/community/books-client";
import { axisX, boxIn, fitOrbit, HOME, HOME_ASPECT, sculptureOutline, type Box, type Orbit } from "./space";

const LAST = BOOKS[BOOKS.length - 1];
/** where the New Testament begins on the axis */
export const NT_START = axisX(BOOKS.find((b) => b.testament === "NT")!.firstChapter / (LAST.firstChapter + LAST.verses.length));

/** the whole Bible's orbit: only its box changes from screen to screen */
export const HOME_ORBIT: Orbit = fitOrbit(sculptureOutline(NT_START), HOME, HOME_ASPECT, 0.03);

/** the field's row at the top of the stage (CSS px), the same as sculpture.module.css .search */
export const TOP = 16 + 48 + 12;
/** below this stage width the phone layout applies (sculpture.module.css 48rem) */
export const NARROW = 768;

/**
 * The free area for the whole Bible on a stage of this size (CSS px). From 48rem: right of the intro, under the field;
 * on phones: a band under the field, no taller than the picture at the phone's width (and at most 42% of the stage),
 * the intro below it. sculpture.module.css .poster and .intro mirror this, so both agree without script.
 */
export function homeArea(width: number, height: number): Box {
  if (width < NARROW) {
    const w = width - 24;
    return { x: 12, y: TOP, w, h: Math.min(Math.min(Math.max(height * 0.42, 160), 400), w / HOME_ASPECT) };
  }
  // the intro's column ends 24px before this (sculpture.module.css .intro), so the picture never runs under its words
  const left = Math.min(Math.max(width * 0.34, 360), 560);
  return { x: left, y: TOP, w: width - left - 16, h: height - TOP - 56 };
}

export function homeBox(width: number, height: number): Box {
  return boxIn(homeArea(width, height), HOME_ASPECT);
}
