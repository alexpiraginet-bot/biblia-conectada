import { books } from "@/lib/data";
import { formatInt } from "@/lib/canon/text";
import { GROUP_NAMES, hubText, votesWord, type AtlasLayout, type GroupId } from "@/lib/explore/atlas";
import { groupOfBook, medals, type Atlas } from "@/lib/explore/atlas-data";
import { enterAt, flowPeriod } from "@/lib/explore/atlas-motion";
import { chapterKey } from "@/lib/explore/data";
import { connectionPath } from "@/lib/explore/home";
import { measure } from "@/lib/explore/measure";
import { partnersText } from "@/lib/explore/text";
import { chapterRef } from "@/lib/reading";
import { AtlasNodes } from "./AtlasNodes";
import type { HubView, NodeView, VariantView } from "./atlas-view";
import styles from "./explore.module.css";

const r3 = (n: number) => Math.round(n * 1000) / 1000;
// The map is alive (design §7.1): on its entrance the dial sweeps from Gênesis, at the top, clockwise, and the trunks
// grow from the seal in the order of the canon (enterAt), each medallion arriving with its trunk. Then a bead of light
// keeps running along each trunk, more often the more votes it carries (flowPeriod).
const hubAlign = { below: "center", above: "center", right: "start", left: "end" } as const;
const nodeAlign = { b: "center", t: "center", r: "start", l: "end" } as const;

function variantView(atlas: Atlas, l: AtlasLayout): VariantView {
  const centre = { slug: atlas.centre.book.slug, chapter: atlas.centre.chapter };
  const m = medals();
  const hubs: HubView[] = l.hubs.map((h) => {
    const g = atlas.groups[h.k];
    const t = hubText(l.spec, g);
    const lead = g.partners[0] && chapterRef(g.partners[0].ci);
    const name = GROUP_NAMES[g.id].name;
    return {
      id: g.id,
      name: t.name,
      meta: t.meta,
      // starts with the words on the medallion (name, then votes), so a voice command that reads them finds the link
      aria: lead
        ? `${name}, ${votesWord(g.votes)}: ${partnersText(g.chapters)}. O mais votado é ${lead.label}, com ${votesWord(g.partners[0].votes)}.`
        : `${name}: nenhum capítulo ligado.`,
      href: lead ? connectionPath(centre, { slug: lead.book.slug, chapter: lead.chapter }) : null,
      lead: lead ? chapterKey(lead) : null,
      x: h.x,
      y: h.y,
      s: h.s,
      label: [r3(h.box[0] - (h.x - h.s / 2)), r3(h.box[1] - (h.y - h.s / 2)), r3(h.box[2] - h.box[0]), r3(h.box[3] - h.box[1])],
      align: hubAlign[h.side],
      trunk: h.trunk,
      img: { src: m[g.id].src96, src2: m[g.id].src192 },
      t: enterAt(h.k),
    };
  });
  const nodes: NodeView[] = l.nodes.map((n) => {
    const ref = chapterRef(n.ci);
    const p = atlas.groups.find((g) => g.id === n.id)!.partners[n.j];
    return {
      key: chapterKey(ref),
      group: n.id,
      j: n.j,
      href: connectionPath(centre, { slug: ref.book.slug, chapter: ref.chapter }),
      title: ref.label,
      sub: votesWord(p.votes),
      num: String(ref.chapter),
      x: n.x,
      y: n.y,
      s: n.s,
      label: [r3(n.box[0] - (n.x - n.s / 2)), r3(n.box[1] - (n.y - n.s / 2)), r3(n.box[2] - n.box[0]), r3(n.box[3] - n.box[1])],
      align: nodeAlign[n.side],
      tx: n.tx,
      ty: n.ty,
      cx: n.x,
      cy: n.y,
    };
  });
  return { key: l.spec.key, W: l.spec.W, H: l.spec.H, hubs, nodes };
}

let slugGroups: Record<string, GroupId> | null = null;
function groupOfSlug(): Record<string, GroupId> {
  slugGroups ??= Object.fromEntries(books.map((b) => [b.slug, groupOfBook(b)]));
  return slugGroups;
}

/** The seal's book line: the name when it fits the disc, else the abbreviation. */
function sealBook(atlas: Atlas, l: AtlasLayout, font: number): string {
  const b = atlas.centre.book;
  return measure("ui", b.name, font) <= l.spec.seal * 0.78 ? b.name : b.abbr;
}

const SEAL_BOOK = { wide: 13, narrow: 13 } as const;

function Stage({ atlas, l, fallback, fixed, label, hint }: { atlas: Atlas; l: AtlasLayout; fallback: { key: string; group: string }; fixed: boolean; label: string; hint: string }) {
  const s = l.spec;
  const v = variantView(atlas, l);
  const style = {
    "--W": s.W,
    "--H": s.H,
    "--fn": s.hubName,
    "--fm": s.hubMeta ?? s.hubName,
    "--cn": s.nodes?.name ?? 16,
    "--cs": s.nodes?.sub ?? 14,
    "--pad": s.pad,
  } as React.CSSProperties;
  const sealStyle = { "--x": s.cx / s.W, "--y": s.cy / s.H, "--s": s.seal, "--sb": SEAL_BOOK[s.key] } as React.CSSProperties;
  const nodeAt = new Map(l.nodes.map((n) => [n.ci, n]));
  const maxWeb = Math.max(1, ...atlas.web.map((w) => w[3]));
  const tOf = new Map(v.hubs.map((h) => [h.id, h.t]));
  const trunks = l.hubs.filter((h) => h.trunkW > 0).sort((a, b) => a.trunkW - b.trunkW);
  const view = `0 0 ${s.W} ${s.H}`;
  return (
    <div className={`${styles.stage} ${s.key === "wide" ? styles.wide : styles.narrow}`} style={style} data-variant={s.key}>
      {/* the dial: a tick per linked chapter, from Gênesis at the top, clockwise (its own layer, so it can sweep in) */}
      <svg className={styles.dial} viewBox={view} style={{ "--x": s.cx / s.W, "--y": s.cy / s.H } as React.CSSProperties} aria-hidden="true">
        <circle className={styles.dialRing} cx={s.cx} cy={s.cy} r={l.rOut + 3} style={{ transformOrigin: `${s.cx}px ${s.cy}px` }} />
        {l.ticks.map((d, i) => d && <path key={i} className={styles.tick} d={d} style={{ strokeOpacity: [0.4, 0.6, 0.8, 1][i] }} />)}
        {l.leads.map((t) => (
          <path key={t.id} className={`${styles.tick} ${styles.lead}`} d={t.d} />
        ))}
      </svg>
      <svg className={styles.lines} viewBox={view} aria-hidden="true">
        <ellipse className={styles.orbit} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} />
        {s.key === "wide" &&
          atlas.web.map(([a, b, , votes]) => {
            const p = nodeAt.get(a), q = nodeAt.get(b);
            if (!p || !q) return null;
            return <path key={`${a}-${b}`} className={styles.web} d={`M${p.x} ${p.y}L${q.x} ${q.y}`} style={{ strokeOpacity: r3(0.35 + 0.5 * Math.sqrt(Math.max(0, votes) / maxWeb)) }} />;
          })}
        {trunks.map((h) => (
          <path key={h.id} className={styles.trunk} d={h.trunk} pathLength={1} style={{ strokeWidth: h.trunkW, strokeOpacity: h.trunkO, "--t": tOf.get(h.id) } as React.CSSProperties} />
        ))}
        {l.nodes.map((n) => (
          <path key={n.ci} className={styles.twig} d={`M${n.tx} ${n.ty}L${n.x} ${n.y}`} pathLength={1} style={{ strokeWidth: n.twigW, "--t": tOf.get(n.id) } as React.CSSProperties} />
        ))}
      </svg>
      {/* the links alive: a bead of light runs from the seal along each trunk (its own layer: the only one that repaints) */}
      <svg className={styles.flows} viewBox={view} aria-hidden="true">
        {trunks.map((h) => (
          <path
            key={h.id}
            className={styles.flow}
            d={h.trunk}
            pathLength={1}
            style={{ strokeWidth: r3(h.trunkW + 1.4), "--t": tOf.get(h.id), "--period": flowPeriod(h.trunkW) } as React.CSSProperties}
          />
        ))}
      </svg>
      <div className={styles.seal} style={sealStyle} role="img" aria-label={`${atlas.centre.label}, com ${partnersText(atlas.partners)}`}>
        <span className={styles.sealBook}>{sealBook(atlas, l, SEAL_BOOK[s.key])}</span>
        <span className={styles.sealNum}>{atlas.centre.chapter}</span>
      </div>
      {l.caption && (
        <span
          className={styles.caption}
          style={{ "--x": l.caption[0] / s.W, "--y": l.caption[1] / s.H, "--lw": l.caption[2] - l.caption[0], "--lh": l.caption[3] - l.caption[1] } as React.CSSProperties}
        >
          {partnersText(atlas.partners)}
        </span>
      )}
      <AtlasNodes v={v} fallback={fallback} fixed={fixed} groupOfSlug={groupOfSlug()} label={label} hint={hint} />
    </div>
  );
}

/**
 * The map of a chapter: the wide atlas from a 760 px box, the phone one below (both in the HTML, one shown), and the
 * legend. `selected` is the connection lit when the URL names none: the centre's most voted linked chapter.
 */
export function AtlasMap({ atlas, selected, fixed = false }: { atlas: Atlas; selected: { key: string; group: GroupId }; fixed?: boolean }) {
  const c = atlas.centre;
  const label = `Mapa de ${c.label}: os oito grupos de livros e, em volta de cada um, os capítulos mais votados. A lista depois do mapa traz os mesmos números.`;
  const hint = "Setas para os lados: grupos de livros. Para baixo e para cima: os capítulos do grupo. Enter abre a ligação.";
  const m = medals();
  const shownWeb = atlas.web.some(([a, b]) => atlas.wide.nodes.some((n) => n.ci === a) && atlas.wide.nodes.some((n) => n.ci === b));
  // Every partner in every group is present here; the map draws only the strongest that fit.
  const pairs = atlas.groups.reduce((total, group) => total + group.partners.reduce((sum, partner) => sum + partner.pairs, 0), 0);
  return (
    <div className={styles.atlas}>
      <div className={styles.connectionSummary} data-chapter-connections={pairs}>
        <p><strong>{formatInt(pairs)} conexões</strong> com <strong>{partnersText(atlas.partners)}</strong></p>
        <p>Pares de versículos de {c.label} com outros capítulos, contando todos os votos. O mapa destaca os mais votados por grupo.</p>
      </div>
      <Stage atlas={atlas} l={atlas.wide} fallback={selected} fixed={fixed} label={label} hint={hint} />
      <Stage atlas={atlas} l={atlas.narrow} fallback={selected} fixed={fixed} label={label} hint={hint} />
      <ul className={styles.legend} aria-label="Legenda do mapa">
        <li>
          <svg viewBox="0 0 28 12" aria-hidden="true">
            <path className={styles.swThin} d="M1 9h26" />
            <path className={styles.swThick} d="M1 3h26" />
          </svg>
          Traço mais grosso, mais votos
        </li>
        <li>
          <svg viewBox="0 0 28 12" aria-hidden="true">
            <path className={styles.swTicks} d="M3 11V8M8 11V3M13 11V6M18 11V1M23 11V7" />
          </svg>
          Cada risco no selo, um capítulo ligado
        </li>
        <li className={styles.motionOnly}>
          <svg viewBox="0 0 28 12" aria-hidden="true">
            <path className={styles.swThick} d="M1 6h26" />
            <path className={styles.swFlow} d="M1 6h26" pathLength={1} />
          </svg>
          Pulso de luz mais frequente, mais votos
        </li>
        {shownWeb && (
          <li className={styles.wideOnly}>
            <svg viewBox="0 0 28 12" aria-hidden="true">
              <path className={styles.swDots} d="M1 6h26" />
            </svg>
            Pontilhado: capítulos do mapa ligados entre si
          </li>
        )}
        <li data-illustrations="">
          Ilustração por grupo de livros:{" "}
          {Object.values(m)
            .map((x) => `${x.category} (${x.label.charAt(0).toLowerCase()}${x.label.slice(1)})`)
            .join(", ")}
        </li>
      </ul>
    </div>
  );
}
