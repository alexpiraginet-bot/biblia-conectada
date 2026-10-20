// What the server hands the map's client component (AtlasNodes): plain data, no data imports.

/** A medallion on the canvas. Positions are shares of the canvas; sizes are in canvas units (see src/lib/explore/atlas.ts). */
export type HubView = {
  id: string;
  name: string;
  meta: string | null;
  /** accessible name: the group, its counts and where the link goes */
  aria: string;
  /** the connection with the group's most voted chapter; null when no chapter of the group is linked */
  href: string | null;
  /** key ("lucas-2") of the group's most voted chapter */
  lead: string | null;
  x: number;
  y: number;
  s: number;
  /** label plate, from the top left corner of the medallion's box */
  label: [x: number, y: number, w: number, h: number];
  align: "start" | "end" | "center";
  trunk: string;
  img: { src: string; src2: string };
};

/** A chapter around its medallion. */
export type NodeView = {
  key: string;
  group: string;
  j: number;
  href: string;
  title: string;
  sub: string;
  num: string;
  x: number;
  y: number;
  s: number;
  label: [x: number, y: number, w: number, h: number];
  align: "start" | "end" | "center";
  /** where its twig leaves the medallion (canvas units), for the lit path */
  tx: number;
  ty: number;
  /** canvas units, for the lit path */
  cx: number;
  cy: number;
};

export type VariantView = {
  key: "wide" | "narrow";
  W: number;
  H: number;
  hubs: HubView[];
  nodes: NodeView[];
};
