#!/usr/bin/env python3
"""Build the graph datasets, rankings and images of grafo/ from the open base (every number comes from here).

Input:  estudos/biblia-referencias/data/xref.npz + stats.json (OpenBible.info cross references, CC BY; 301,584 unique
        verse pairs on the 66-book / 1,189-chapter / 31,102-verse KJV grid).
Output: grafo/dados/*.csv|gexf|json, grafo/RANKINGS.md, grafo/imagens/*.png

  python3 grafo/build.py            # everything (~2 min)
  python3 grafo/build.py --no-img   # datasets and rankings only
"""
import csv, json, sys, time
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "grafo"; DATA = OUT / "dados"; IMG = OUT / "imagens"
DATA.mkdir(exist_ok=True); IMG.mkdir(exist_ok=True)
REF = ROOT / "estudos/biblia-referencias/data"
D = np.load(REF / "xref.npz"); ST = json.load(open(REF / "stats.json"))
PA, PB, VOTES, VMAX = D["a"].astype(np.int64), D["b"].astype(np.int64), D["votes"].astype(np.int64), D["vmax"].astype(np.int64)
CHAP_V, CHAP_FIRST, CHAP_BOOK, CHAP_OF = D["chap_verses"], D["chap_first"], D["chap_book"], D["chap_of_gv"]
OSIS, PT = ST["osis"], ST["books_pt"]
NV, NCH = len(CHAP_OF), len(CHAP_V)
BOOK_FIRST_CHAP = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])
BOOK_OF = CHAP_BOOK[CHAP_OF]
assert NV == 31102 and NCH == 1189 and len(PA) == 301584 and ST["stats"]["rows_total"] == 344799
keep = PA != PB                                   # 45 self-pairs out of the graph
A, B, V, VM = PA[keep], PB[keep], VOTES[keep], VMAX[keep]
lo, hi = np.minimum(A, B), np.maximum(A, B)
assert len(np.unique(lo * 40000 + hi)) == len(A)
NE = len(A)


def chap_num(c): return int(c - BOOK_FIRST_CHAP[CHAP_BOOK[c]]) + 1
def verse_num(g): return int(g - CHAP_FIRST[CHAP_OF[g]]) + 1
def ref_pt(g): c = int(CHAP_OF[g]); return f"{PT[CHAP_BOOK[c]]} {chap_num(c)}:{verse_num(g)}"
def ref_osis(g): c = int(CHAP_OF[g]); return f"{OSIS[CHAP_BOOK[c]]}.{chap_num(c)}.{verse_num(g)}"
def fmt(n): return f"{int(n):,}".replace(",", ".")


def w(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        cw = csv.writer(f); cw.writerow(header); cw.writerows(rows)
    print(f"{path.relative_to(ROOT)}: {len(rows)} linhas")


t0 = time.time()
# ------------------------------------------------------------------ verses
deg = np.bincount(np.concatenate([A, B]), minlength=NV)
vsum = np.bincount(np.concatenate([A, B]), weights=np.concatenate([V, V]), minlength=NV).astype(np.int64)
other_book = np.concatenate([BOOK_OF[B], BOOK_OF[A]]); me = np.concatenate([A, B])
deg_at = np.bincount(me[other_book < 39], minlength=NV); deg_nt = np.bincount(me[other_book >= 39], minlength=NV)
w(DATA / "versiculos.csv", ["gv", "osis", "ref_pt", "livro", "capitulo", "versiculo", "testamento", "ligacoes", "ligacoes_at", "ligacoes_nt", "soma_votos"],
  [[g, ref_osis(g), ref_pt(g), PT[BOOK_OF[g]], chap_num(int(CHAP_OF[g])), verse_num(g), "AT" if BOOK_OF[g] < 39 else "NT",
    int(deg[g]), int(deg_at[g]), int(deg_nt[g]), int(vsum[g])] for g in range(NV)])

# ------------------------------------------------------------------ edges (verse level)
order = np.lexsort((hi, lo))
w(DATA / "arestas.csv", ["gv_a", "gv_b", "osis_a", "osis_b", "ref_a", "ref_b", "votos", "voto_max", "at_nt"],
  [[int(lo[i]), int(hi[i]), ref_osis(lo[i]), ref_osis(hi[i]), ref_pt(lo[i]), ref_pt(hi[i]), int(V[i]), int(VM[i]),
    int((BOOK_OF[lo[i]] < 39) != (BOOK_OF[hi[i]] < 39))] for i in order])

# ------------------------------------------------------------------ chapters
ca, cb = CHAP_OF[lo].astype(np.int64), CHAP_OF[hi].astype(np.int64)
cl, ch_ = np.minimum(ca, cb), np.maximum(ca, cb)
key = cl * NCH + ch_
uk, inv = np.unique(key, return_inverse=True)
cnt = np.bincount(inv); cv = np.bincount(inv, weights=V).astype(np.int64)
ck_a, ck_b = uk // NCH, uk % NCH
cdeg_w = np.bincount(np.concatenate([ca, cb]), minlength=NCH)                 # verse-pair links touching the chapter
cpart = np.zeros(NCH, np.int64)                                                 # distinct partner chapters
m = ck_a != ck_b
cpart += np.bincount(ck_a[m], minlength=NCH) + np.bincount(ck_b[m], minlength=NCH)
w(DATA / "capitulos.csv", ["capitulo_id", "osis", "livro", "capitulo", "testamento", "versiculos", "ligacoes", "capitulos_ligados"],
  [[c, f"{OSIS[CHAP_BOOK[c]]}.{chap_num(c)}", PT[CHAP_BOOK[c]], chap_num(c), "AT" if CHAP_BOOK[c] < 39 else "NT", int(CHAP_V[c]),
    int(cdeg_w[c]), int(cpart[c])] for c in range(NCH)])
w(DATA / "capitulos-arestas.csv", ["capitulo_a", "capitulo_b", "osis_a", "osis_b", "ligacoes", "soma_votos"],
  [[int(a), int(b), f"{OSIS[CHAP_BOOK[a]]}.{chap_num(a)}", f"{OSIS[CHAP_BOOK[b]]}.{chap_num(b)}", int(n), int(s)]
   for a, b, n, s in zip(ck_a, ck_b, cnt, cv) if a != b])

# ------------------------------------------------------------------ books
ba, bb = BOOK_OF[lo].astype(np.int64), BOOK_OF[hi].astype(np.int64)
M = np.zeros((66, 66), np.int64)
np.add.at(M, (ba, bb), 1); np.add.at(M, (bb, ba), (ba != bb).astype(np.int64))   # symmetric; diagonal = links inside the book
bdeg = M.sum(1)
w(DATA / "livros.csv", ["livro_id", "osis", "livro", "testamento", "capitulos", "versiculos", "ligacoes", "ligacoes_internas", "livros_ligados",
                        "versiculo_mais_ligado", "ligacoes_do_versiculo"],
  [[b, OSIS[b], PT[b], "AT" if b < 39 else "NT", int((CHAP_BOOK == b).sum()), int((BOOK_OF == b).sum()), int(bdeg[b]), int(M[b, b]),
    int((M[b] > 0).sum() - (M[b, b] > 0)), ref_pt(int(np.where(BOOK_OF == b)[0][np.argmax(deg[BOOK_OF == b])])),
    int(deg[BOOK_OF == b].max())] for b in range(66)])
with open(DATA / "livros-matriz.csv", "w", newline="", encoding="utf-8") as f:
    cw = csv.writer(f); cw.writerow([""] + PT)
    for b in range(66): cw.writerow([PT[b]] + M[b].tolist())
print("grafo/dados/livros-matriz.csv: 66x66")

# ------------------------------------------------------------------ GEXF (chapter graph, for Gephi) + compact JSON for the web
import networkx as nx
G = nx.Graph()
for c in range(NCH):
    G.add_node(int(c), label=f"{PT[CHAP_BOOK[c]]} {chap_num(c)}", livro=PT[CHAP_BOOK[c]], testamento="AT" if CHAP_BOOK[c] < 39 else "NT",
               versiculos=int(CHAP_V[c]), ligacoes=int(cdeg_w[c]))
for a, b, n, s in zip(ck_a, ck_b, cnt, cv):
    if a != b: G.add_edge(int(a), int(b), weight=int(n), votos=int(s))
nx.write_gexf(G, DATA / "capitulos.gexf"); print(f"grafo/dados/capitulos.gexf: {G.number_of_nodes()} nós, {G.number_of_edges()} arestas")
json.dump({"nodes": [{"id": c, "l": f"{OSIS[CHAP_BOOK[c]]}.{chap_num(c)}", "b": int(CHAP_BOOK[c]), "v": int(CHAP_V[c]), "d": int(cdeg_w[c])} for c in range(NCH)],
           "edges": [[int(a), int(b), int(n)] for a, b, n in zip(ck_a, ck_b, cnt) if a != b]},
          open(DATA / "capitulos.json", "w"), separators=(",", ":"))
# verse-level binary for the site: uint16 a, uint16 b, int16 votes (as HANDOFF §5.5)
np.concatenate([lo.astype("<u2").view(np.uint8), hi.astype("<u2").view(np.uint8), np.clip(V, -32768, 32767).astype("<i2").view(np.uint8)]).tofile(DATA / "arestas.bin")
print(f"grafo/dados/arestas.bin: {NE} pares x (u16,u16,i16), {(DATA / 'arestas.bin').stat().st_size / 1e6:.1f} MB")

# ------------------------------------------------------------------ summary + rankings
top_v = np.argsort(-deg)[:100]
top_e = np.argsort(-V)[:50]
top_c = np.argsort(-cdeg_w)[:50]
top_atnt = [i for i in np.argsort(-V) if (BOOK_OF[lo[i]] < 39) != (BOOK_OF[hi[i]] < 39)][:30]
summary = {"versiculos": NV, "capitulos": NCH, "livros": 66, "referencias_linhas": 344799, "pares_unicos": 301584,
           "pares_sem_autoligacao": NE, "pares_at_nt": int(((BOOK_OF[lo] < 39) != (BOOK_OF[hi] < 39)).sum()),
           "versiculos_com_ligacao": int((deg > 0).sum()), "versiculos_sem_ligacao": int((deg == 0).sum()),
           "media_ligacoes_por_versiculo": round(float(deg.mean()), 2), "mediana": int(np.median(deg)),
           "capitulos_arestas": int(G.number_of_edges()), "livros_pares_ligados": int(((M > 0).sum() - 66) // 2),
           "mais_ligado": {"ref": ref_pt(top_v[0]), "ligacoes": int(deg[top_v[0]])},
           "par_mais_votado": {"a": ref_pt(lo[top_e[0]]), "b": ref_pt(hi[top_e[0]]), "votos": int(V[top_e[0]])}}
json.dump(summary, open(DATA / "resumo.json", "w"), ensure_ascii=False, indent=1)


def table(header, rows):
    return "| " + " | ".join(header) + " |\n|" + "---|" * len(header) + "\n" + "\n".join("| " + " | ".join(str(x) for x in r) + " |" for r in rows) + "\n"


md = [f"# Rankings do grafo\n\nGerado por `grafo/build.py` a partir da base aberta (OpenBible.info, CC BY). \"Ligações\" de um versículo = versículos "
      f"diferentes ligados a ele, qualquer voto. Números do resumo: {fmt(NV)} versículos, {fmt(NE)} pares (sem auto-ligações), "
      f"{fmt(summary['versiculos_com_ligacao'])} versículos com pelo menos uma ligação, média de {summary['media_ligacoes_por_versiculo']} por versículo.\n"]
md.append("## Os 100 versículos mais ligados\n\n" + table(["#", "Versículo", "Ligações", "No AT", "No NT", "Soma de votos"],
          [[i + 1, ref_pt(g), deg[g], deg_at[g], deg_nt[g], vsum[g]] for i, g in enumerate(top_v)]))
md.append("## Os 50 pares mais votados\n\n" + table(["#", "Versículo A", "Versículo B", "Votos"],
          [[i + 1, ref_pt(lo[e]), ref_pt(hi[e]), V[e]] for i, e in enumerate(top_e)]))
md.append("## Os 30 pares AT ↔ NT mais votados\n\n" + table(["#", "Antigo Testamento", "Novo Testamento", "Votos"],
          [[i + 1, ref_pt(lo[e]) if BOOK_OF[lo[e]] < 39 else ref_pt(hi[e]), ref_pt(hi[e]) if BOOK_OF[lo[e]] < 39 else ref_pt(lo[e]), V[e]] for i, e in enumerate(top_atnt)]))
md.append("## Os 50 capítulos mais ligados\n\n" + table(["#", "Capítulo", "Versículos", "Ligações", "Capítulos ligados"],
          [[i + 1, f"{PT[CHAP_BOOK[c]]} {chap_num(c)}", CHAP_V[c], cdeg_w[c], cpart[c]] for i, c in enumerate(top_c)]))
md.append("## Os 66 livros\n\n" + table(["#", "Livro", "Ligações", "Internas", "Livros ligados", "Versículo mais ligado", "Ligações dele"],
          [[i + 1, PT[b], bdeg[b], M[b, b], (M[b] > 0).sum() - (M[b, b] > 0), ref_pt(int(np.where(BOOK_OF == b)[0][np.argmax(deg[BOOK_OF == b])])), deg[BOOK_OF == b].max()]
           for i, b in enumerate(np.argsort(-bdeg))]))
bp = [(M[a, b], a, b) for a in range(66) for b in range(a + 1, 66)]; bp.sort(reverse=True)
md.append("## Os 40 pares de livros mais ligados\n\n" + table(["#", "Livro A", "Livro B", "Ligações"], [[i + 1, PT[a], PT[b], n] for i, (n, a, b) in enumerate(bp[:40])]))
(OUT / "RANKINGS.md").write_text("\n".join(md), encoding="utf-8"); print("grafo/RANKINGS.md")
print(f"dados em {time.time() - t0:.0f} s")

# ------------------------------------------------------------------ images
if "--no-img" in sys.argv: sys.exit(0)
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import cv2
sys.path.insert(0, str(ROOT / "estudos/biblia-comentarios"))
import engine as E  # noqa: E402  (the arc engine of the videos)
BG = "#060D1A"; GOLD = "#FFCC6B"; TXT = "#F2EBDD"


def style(ax):
    ax.set_facecolor(BG)
    for s in ax.spines.values(): s.set_color("#2A3B57")
    ax.tick_params(colors="#A9B4C8"); ax.title.set_color(TXT); ax.xaxis.label.set_color("#A9B4C8"); ax.yaxis.label.set_color("#A9B4C8")


# 1. the whole Bible as arcs (same engine as the videos), landscape crop of the dome
dome = E.Dome(); dome.grow_to(len(E.A.ORDER))
FULL = dome.image(float(np.percentile(dome.den[dome.den > 0], 99.5)))
fr = np.zeros((E.H, E.W, 3), np.float32)
cam = E.Cam(1.0, 0.5, 0.0, 540, 1300)
fr += E.warp_dome(FULL, cam) * 1.1; E.draw_bars(fr, cam, op=0.9, hscale=0.9)
img = E.to8(fr)[640:1420]
cv2.imwrite(str(IMG / "biblia-arcos.png"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR)); print("grafo/imagens/biblia-arcos.png")

# 2. book x book matrix (log scale)
fig, ax = plt.subplots(figsize=(13, 12), facecolor=BG); style(ax)
im = ax.imshow(np.log10(M + 1), cmap="magma"); ax.set_xticks(range(66)); ax.set_yticks(range(66))
ax.set_xticklabels(PT, rotation=90, fontsize=6); ax.set_yticklabels(PT, fontsize=6)
ax.set_title("Ligações entre livros (escala log10 do nº de pares de versículos)", fontsize=12)
cb = fig.colorbar(im, ax=ax, fraction=0.03); cb.ax.yaxis.set_tick_params(color="#A9B4C8"); plt.setp(cb.ax.get_yticklabels(), color="#A9B4C8")
fig.savefig(IMG / "livros-matriz.png", dpi=130, bbox_inches="tight", facecolor=BG); plt.close(fig); print("grafo/imagens/livros-matriz.png")

# 3. degree distribution
fig, ax = plt.subplots(figsize=(10, 5), facecolor=BG); style(ax)
ax.hist(deg[deg > 0], bins=np.logspace(0, np.log10(deg.max() + 1), 50), color=GOLD); ax.set_xscale("log"); ax.set_yscale("log")
ax.set_xlabel("ligações por versículo"); ax.set_ylabel("versículos"); ax.set_title(f"Distribuição das ligações ({fmt(summary['versiculos_com_ligacao'])} versículos ligados; máximo {ref_pt(top_v[0])} = {deg[top_v[0]]})")
fig.savefig(IMG / "distribuicao-ligacoes.png", dpi=130, bbox_inches="tight", facecolor=BG); plt.close(fig); print("grafo/imagens/distribuicao-ligacoes.png")

# 4. chapter graph as a circle in Bible order: chords between chapters with 12+ verse pairs (quadratic curves through the centre)
from matplotlib.path import Path as MPath
import matplotlib.patches as mpatches
fig, ax = plt.subplots(figsize=(14, 14), facecolor=BG); ax.set_facecolor(BG); ax.axis("off"); ax.set_aspect("equal")
ang = -np.pi / 2 + 2 * np.pi * (np.arange(NCH) + 0.5) / NCH            # Genesis at the top, clockwise
px, py = np.cos(ang), np.sin(ang)
sel = [(a, b, n) for a, b, n in zip(ck_a, ck_b, cnt) if a != b and n >= 12]
sel.sort(key=lambda x: x[2])
for a, b, n in sel:
    atnt = (CHAP_BOOK[a] < 39) != (CHAP_BOOK[b] < 39)
    col = "#FF801F" if atnt else GOLD
    verts = [(px[a], py[a]), (0.0, 0.0), (px[b], py[b])]
    path = MPath(verts, [MPath.MOVETO, MPath.CURVE3, MPath.CURVE3])
    ax.add_patch(mpatches.PathPatch(path, fill=False, lw=0.3 + 0.03 * n, edgecolor=col, alpha=min(0.9, 0.08 + n / 120)))
ax.scatter(px * 1.015, py * 1.015, c=[CHAP_BOOK[c] / 65 for c in range(NCH)], cmap="plasma", s=3 + 0.05 * cdeg_w, linewidths=0, zorder=3)
for bk in range(66):
    cs = np.where(CHAP_BOOK == bk)[0]; am = float(ang[cs].mean()); r = 1.06
    ax.text(r * np.cos(am), r * np.sin(am), PT[bk], color=TXT, fontsize=5.5, rotation=np.degrees(am) + (180 if np.cos(am) < 0 else 0),
            ha="left" if np.cos(am) >= 0 else "right", va="center", rotation_mode="anchor")
ax.set_xlim(-1.3, 1.3); ax.set_ylim(-1.3, 1.3)
ax.set_title(f"Os 1.189 capítulos em círculo, na ordem da Bíblia · {len(sel)} ligações entre capítulos com 12+ pares (laranja = AT ↔ NT)", color=TXT, fontsize=12)
fig.savefig(IMG / "capitulos-circulo.png", dpi=130, bbox_inches="tight", facecolor=BG); plt.close(fig); print("grafo/imagens/capitulos-circulo.png")

# 5. maps of the 12 most linked verses (the "star" look of the videos)
for rank, g in enumerate(top_v[:12], 1):
    j = np.where((A == g) | (B == g))[0]; oth = np.where(A[j] == g, B[j], A[j])
    xt, xo = float(E.A.gv_x(g)), E.A.gv_x(oth)
    fr = np.zeros((E.H, E.W, 3), np.float32); cam = E.Cam(1.0, 0.5, 0.0, 540, 1300)
    fr += E.warp_dome(FULL, cam) * 0.08; E.draw_bars(fr, cam, op=0.5)
    hi_ = np.zeros(len(j), bool); hi_[np.argsort(-V[j])[:12]] = True
    E.draw_arcs(fr, [E.arc_poly(x, xt, cam) for x in xo[~hi_]], E.GOLD * 0.55, width=1, glow=0.8)
    E.draw_arcs(fr, [E.arc_poly(x, xt, cam) for x in xo[hi_]], E.GOLD, width=2, glow=1.0)
    E.star_point(fr, float(cam.X(xt)), float(cam.Y(0)), 1.6, 16, rays=0.5)
    E.titled(fr, E.text_layer([ref_pt(g).upper()], E.font("grot", 96, 700), track=-0.01, glow=6), 540, 380, 1.0)
    E.titled(fr, E.text_layer([f"{deg[g]} versículos ligados"], E.font("serifi", 56, 500), color=(255, 214, 140)), 540, 480, 1.0)
    E.titled(fr, E.text_layer([f"#{rank} DA BÍBLIA"], E.font("mono", 30), color=(230, 230, 236), track=0.12), 540, 290, 1.0)
    img = E.to8(fr * E.VIGN)[200:1500]
    cv2.imwrite(str(IMG / f"top{rank:02d}-{ref_osis(g).replace('.', '-')}.png"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
print("grafo/imagens/top01..top12")
print(f"tudo em {time.time() - t0:.0f} s")
