#!/usr/bin/env python3
"""The prompts of "Grand Testament Adventure", written out from the code, so the documents never drift from it.

PROMPTS.md: every take of cenas.ORDEM exactly as tools/fila.py asks for it (where it starts from, the prompt, what the
HUD draws over it, the job that made it, the generations thrown away and why). SKILL.md: the sections between
"<!-- gerado:NAME -->" and "<!-- /gerado -->" (the prompt blocks and the request, the frame's measures, the "Pescadores
de gente" episode, "A jornada", the queue). Everything comes from cenas.py, tools/fila.py, hud.py, data/passagens.json
(episodios.py through tools/check.py), jornada.py, procurado.py, data/geracoes.json and the caption files.

It also holds the prompts to the series' rules: no prompt names Jesus, Christ, God, an angel or the game that inspires
the series, and every prompt carries the two shots and the closing block (adults only, no children, no text, no HUD).

  python3 -I tools/prompts.py            -> writes PROMPTS.md and fills the generated sections of SKILL.md
  python3 -I tools/prompts.py --check    -> exit 1 when PROMPTS.md or SKILL.md is out of date, or a prompt breaks a rule
"""
import inspect, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "tools"))
import cenas  # noqa: E402
from cenas import CENAS, ORDEM, PERSONAGEM, pedido  # noqa: E402
from fila import VID, LAST  # noqa: E402
import hud, jornada, procurado  # noqa: E402
from episodios import EPISODIOS  # noqa: E402

MAN = json.load(open(ROOT / "data/geracoes.json", encoding="utf-8"))
PAS = json.load(open(ROOT / "data/passagens.json", encoding="utf-8"))
PASS = {p["id"]: p for p in PAS["passagens"]}
LIVRO = {"Matt": "Mateus", "Mark": "Marcos", "Luke": "Lucas", "John": "João"}
PROIBIDO = re.compile(r"\b(Jesus|Christ|Cristo|God|Deus|angels?|anjos?|GTA|Grand Theft|Rockstar)\b", re.I)
BLOCOS = [("JOGO", "sempre, no começo; `{luz}` é a luz da missão ou a do episódio"),
          ("HEROI_REF", "missão que parte da folha de personagem (a 1ª do episódio, ou `novo`); a missão pode trocar por `heroi_ref`"),
          ("HEROI_QUADRO", "missão que parte do último quadro do take anterior; a missão pode trocar por `heroi`"),
          ("DOIS", "sempre: os dois planos `a` e `b` da missão"),
          ("FIM", "sempre, no fim: `{povo}` e `{som}` da missão"),
          ("POVO", "o `{povo}` padrão"),
          ("POVO_UNICO", "o `{povo}` de cena com gente perto dele (A jornada, missões 2 a 7)"),
          ("POVO_HOJE", "o `{povo}` do especial de hoje (Procurado)"),
          ("CIDADE", "o `mundo` da cidade de hoje (Procurado)"),
          ("POLICIA", "como os carros de polícia são descritos (Procurado)"),
          ("GALILEIA", "o `mundo` da 1ª missão de A jornada"),
          ("CONTINUA", "NÃO USAR: emenda com o take anterior como referência de vídeo (recomeçou da praia e vestiu outro como ele)")]


def br(x, nd=1):
    """A number the way the post and the reports write it (decimal comma)."""
    return f"{x:.{nd}f}".replace(".", ",")


def brs(x):
    """br() without trailing zeros: 1.1 -> "1,1", 1.15 -> "1,15", 2.0 -> "2"."""
    return br(x, 2).rstrip("0").rstrip(",")


def fim_gratis():
    """The end of the Higgsfield free window, as the manifest records it."""
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})", MAN["conta"])
    return f"{m[3]}/{m[2]}/{m[1]} às {m[4]} UTC"


def ref(osis):
    b, c, v = osis.split("."); return f"{LIVRO[b]} {c}:{v}"


def titulo(ep):
    if ep in PASS: return f"{PASS[ep]['titulo']} ({PASS[ep]['ref_pt']})"
    if ep in procurado.PARTES: return f"Procurado, parte {procurado.PARTES[ep]['parte']} de 3 (especial: ele numa cidade de hoje)"
    return f"{jornada.J['titulo']} ({jornada.J['ref'].lower()}, {len(jornada.J['missoes'])} missões)"


def inicio(ep, k):
    """Where take k starts from, the way tools/fila.py asks for it."""
    m = CENAS[ep]["missoes"][k - 1]
    if k == 1 or m.get("novo"):
        return f"folha de personagem (`image_references` = `{PERSONAGEM}`)" + (" · lugar novo (`novo`)" if k > 1 else "")
    fim = MAN["takes"].get(f"{ep}-{k - 1}", {}).get("fim")
    return f"último quadro (nº {LAST}) do take `{ep}-{k - 1}` (`start_image`)" + (f"; o que foi usado: media `{fim}`" if fim else "")


def hud_de(ep, k):
    """What the HUD draws over take k (episodios.py through data/passagens.json, procurado.py or jornada.py)."""
    if ep in PAS["episodios"]:
        e = PAS["episodios"][ep]; mi = e["missoes"][k - 1]; out = [f"objetivo “{mi['objetivo']}”"]
        if mi.get("acao"): out.append(f"tecla [E] “{mi['acao']}”")
        if mi["fala"]: out.append(f"fala “{mi['fala']['texto']}” ({mi['fala']['ref']})")
        if e.get("contador"): out.append(f"{e['contador']['rotulo']} {mi['conta']} de {e['contador']['total']} no fim da missão")
        if mi.get("seguidores"): out.append(f"{mi['seguidores']} seguidores no radar")
        return " · ".join(out)
    if ep in procurado.PARTES:
        mi = procurado.PARTES[ep]["missoes"][k - 1]; out = [f"objetivo “{mi['objetivo']}”"]
        if mi.get("acao"): out.append(f"tecla [E] “{mi['acao']}”")
        if mi.get("escolha"): out.append(f"escolha [E] “{mi['escolha'][0]}” ou “{mi['escolha'][1]}” (aperta a 2ª)")
        out += [f"fala (plano {s if isinstance(s, str) else br(s) + ' s'}) “{frag}” ({ref(o)})" for s, o, frag in mi["falas"]]
        out.append("estrelas " + " → ".join(str(c) for _, c in mi["estrelas"]))
        if mi.get("cartao"): out.append(f"cartão “{mi['cartao']}” no corte")
        return " · ".join(out)
    mi = jornada.J["missoes"][k - 1]; o = mi.get("objetivo"); out = []
    if isinstance(o, dict): out.append(" / ".join(f"objetivo (plano {s}) “{t}”" for s, t in o.items()))
    elif o: out.append(f"objetivo “{o}”" + (" (a partir do corte)" if mi.get("objetivo_de") == "corte" else ""))
    out += [f"tecla [E] “{t}” (plano {s})" for t, s in mi.get("acoes", [])]
    out += [f"fala (plano {s}) “{frag}” ({ref(osis)})" for s, osis, frag in mi.get("falas", [])]
    b = mi.get("banner")
    if b: out.append(f"faixa “{b[1].upper()}” / " + (f"“{b[2].upper()}”" if len(b) == 3 else f"“{b[3]}” ({ref(b[2])})"))
    if mi.get("contador"): lab, tot, by = mi["contador"]; out.append(f"{lab} " + ", ".join(f"{c} de {tot} (plano {s})" for s, c in by.items()))
    if mi.get("sinais"): out.append(f"conta {len(mi['sinais'])} {'sinal' if len(mi['sinais']) == 1 else 'sinais'} no contador de sinais")
    if mi.get("viagem"): out.append("mapa de viagem rápida no corte")
    if mi.get("cena"): out.append(f"cena de corte (faixas pretas, sem HUD) no(s) plano(s) {', '.join(mi['cena'])}")
    if mi.get("seguidores"): out.append(f"{mi['seguidores']} seguidores no radar")
    return " · ".join(out)


def descartes(key):
    """The generations of take `key` that were thrown away: (job, reason)."""
    out = []
    for name, v in MAN.get("descartados", {}).items():
        if not re.match(rf"^{re.escape(key)}(?!\d)", name): continue
        job = v.get("job") if isinstance(v, dict) else (re.search(r"\(([0-9a-f-]{36})\)", name) or [None, None])[1]
        out.append((job, v.get("motivo") if isinstance(v, dict) else v))
    return out


def gerado(key):
    t = MAN["takes"].get(key)
    if not t or not t.get("url"): return "ainda não gerado"
    return f"job `{t['job']}`" + (f" (usado no take montado da {t['montagem']}, ver `jornada.py`)" if t.get("montagem") else "")


def regras(ep, k, p):
    bad = []
    if PROIBIDO.search(p): bad.append(f"nomeia o que não pode: {PROIBIDO.search(p)[0]}")
    for must in ("Two shots with one hard cut", "No children.", "no HUD", "no text"):
        if must not in p: bad.append(f"falta “{must}”")
    return [f"{ep}-{k}: {b}" for b in bad]


def take_md(ep, k, level="###"):
    p = pedido(ep, k, k == 1); key = f"{ep}-{k}"; n = len(CENAS[ep]["missoes"])
    out = [f"{level} `{key}` · missão {k} de {n}", "", f"- Começa de: {inicio(ep, k)}", f"- HUD por cima: {hud_de(ep, k)}", f"- Gerado: {gerado(key)}"]
    for job, why in descartes(key): out.append(f"- Descartado (job `{job}`): {why}")
    out += ["", f"```text\n{p}\n```", "", f"{len(p)} caracteres.", ""]
    return out


def medidas(ep):
    r = MAN["reels"].get(ep)
    if not r: return []
    s = (f"`{r['arquivo']}`: {r['quadros']} quadros ({br(r['duracao_s'], 3)} s), {br(r['bytes'] / 1e6, 2)} MB, {br(r['lufs'])} LUFS, "
         f"pico real {br(r['pico_dbtp'])} dBTP, cortes em {', '.join(br(c, 2) + ' s' for c in r['cortes_s'])}, mudança mediana por quadro "
         f"{br(r['mudanca_mediana'], 2)} ({br(r['mudanca_relativa_pct'])}% da luz), fala ouvida pelo Whisper: "
         f"{'nenhuma' if not r['fala_ouvida'] else '; '.join(r['fala_ouvida'])}; capa `{r['capa']}`.")
    return [f"Medido por `tools/confere.py` no arquivo entregue: {s}" + (f" Entregue: {r['entregue']}." if r.get("entregue") else ""), ""]


def legenda_de(arquivo, cabecalho=None):
    t = (ROOT / arquivo).read_text(encoding="utf-8")
    if cabecalho: t = t[t.index(cabecalho):]
    a = t.index("```\n") + 4; return t[a:t.index("\n```", a)]


# ------------------------------------------------------------------------------------------------ PROMPTS.md
def prompts_md():
    n = sum(len(CENAS[e]["missoes"]) for e in ORDEM)
    out = ["# Prompts: Grand Testament Adventure", "",
           "Gerado por `tools/prompts.py` a partir de `cenas.py`, `tools/fila.py`, `data/passagens.json`, `procurado.py`, `jornada.py` e "
           "`data/geracoes.json`. Não edite à mão: mude o código e rode `python3 -I tools/prompts.py`. Como usar, as regras e o porquê de cada "
           "bloco estão no `SKILL.md`. O texto é o de hoje em `cenas.py`; cada job listado foi pedido com o texto daquele momento (o "
           "histórico está no git de `cenas.py`).", "",
           f"{n} takes em {len(ORDEM)} episódios, na ordem da fila (`cenas.ORDEM`). Cada bloco `text` é o prompt exato que "
           "`python3 -I tools/fila.py prox` manda ao Higgsfield (`generate_video_batch`), sempre com estes parâmetros:", "",
           "```json", json.dumps(VID, ensure_ascii=False), "```", "",
           f"`medias`: na missão que parte da folha, `[{{\"role\": \"image_references\", \"value\": \"{PERSONAGEM}\"}}]`; na que continua, "
           "`[{\"role\": \"start_image\", \"value\": \"<media id do último quadro do take anterior>\"}]` (o upload está no `SKILL.md`, seção 6). "
           f"A janela grátis do `use_unlim` acabou em {fim_gratis()}; fora dela, veja a seção 6 do `SKILL.md` antes de pedir.", "",
           "## Índice", ""]
    for e in ORDEM:
        done = sum(1 for k in range(1, len(CENAS[e]["missoes"]) + 1) if MAN["takes"].get(f"{e}-{k}", {}).get("url"))
        out.append(f"- `{e}`: {titulo(e)}, {done} de {len(CENAS[e]['missoes'])} takes gerados" + (", reel conferido" if e in MAN["reels"] else ""))
    out.append("")
    for e in ORDEM:
        c = CENAS[e]; out += [f"## {titulo(e)}", "", f"Episódio `{e}` · luz do episódio: “{c['luz']}”" + (" · povo: `POVO_HOJE`" if c.get("povo") == cenas.POVO_HOJE else ""), ""]
        for k in range(1, len(c["missoes"]) + 1): out += take_md(e, k)
        out += medidas(e)
    return "\n".join(out).rstrip() + "\n"


# ------------------------------------------------------------------------------------------------ SKILL.md sections
def sec_blocos():
    out = ["O prompt de cada take sai de `cenas.pedido` (código exato):", "", "```python", inspect.getsource(cenas.pedido).rstrip(), "```", "",
           "Os blocos, palavra por palavra (`cenas.py`):", ""]
    for name, when in BLOCOS:
        out += [f"**`{name}`**: {when}.", "", "```text", getattr(cenas, name).rstrip(), "```", ""]
    first = {**VID, "medias": [{"role": "image_references", "value": PERSONAGEM}], "prompt": "<pedido(ep, 1, True)>"}
    nxt = {**VID, "medias": [{"role": "start_image", "value": "<media id do último quadro do take anterior>"}], "prompt": "<pedido(ep, k, False)>"}
    out += ["O pedido que `tools/fila.py prox` escreve (o `requests` de `generate_video_batch`), na missão que parte da folha e na que continua:", "",
            "```json", json.dumps([{"index": 0, "params": first}], ensure_ascii=False, indent=1), "```", "",
            "```json", json.dumps([{"index": 0, "params": nxt}], ensure_ascii=False, indent=1), "```", "",
            f"O último quadro é o nº {LAST} (o take tem 193; esse é o último limpo)."]
    return out


def sec_medidas():
    return [f"- Quadro final: {hud.W}×{hud.H}, {hud.FPS} fps. Cada take dura {brs(hud.TAKE)} s, chega em {VID['resolution']} e é ampliado para {hud.W}×{hud.H} "
            "com lanczos e `unsharp=5:5:0.4`.",
            f"- Caixa segura do Reels: x {hud.SAFE[0]}–{hud.SAFE[2]}, y {hud.SAFE[1]}–{hud.SAFE[3]} (tudo que importa fica dentro dela).",
            f"- Radar: {hud.R}×{hud.R} px com o canto superior esquerdo em ({hud.MX}, {hud.MY}); a barra de progresso fica embaixo dele e a placa do lugar à direita.",
            f"- Cores: creme {hud.CREAM}, ouro {hud.GOLD}, tinta {hud.INK}, escuro {hud.DARK}, céu (seguidores) {hud.SKY}.",
            f"- Abertura da série (2 linhas, ouro): “{hud.HOOK[0]} / {hud.HOOK[1]}”.",
            "- Tipos: Space Grotesk (missão, títulos, legenda), Space Mono (letreiro, rótulos, números), Cormorant itálico (nomes no mapa); "
            "arquivos em `../biblia-referencias/assets/fonts/`."]


def sec_pescadores():
    ep = "mc-pescadores"; e = PAS["episodios"][ep]; p = PASS[ep]
    out = [f"Passagem: {p['titulo']} ({p['ref_pt']}). Placa do lugar: “{p['lugar']}” ({p['lugar_ref']}, como a BLIVRE escreve); ponto do radar: "
           f"`{p['geo']['id']}` no OpenBible ({br(p['geo']['lat'], 2)}° N · {br(p['geo']['lon'], 2)}° L; nota de `passagens.py`: “{p['geo']['nota']}”). "
           f"Raio do radar {brs(e['raio_km'])} km; ritmo {brs(e['ritmo'])}x; contador “{e['contador']['rotulo']}” até {e['contador']['total']} "
           "(a soma dos nomes que o texto lista, `contador.prova` em `episodios.py`: "
           + ", ".join(f"{nome} ({ref(osis)})" for osis, nome in EPISODIOS[ep]["contador"]["prova"]) + ").", "",
           "| Missão | Objetivo | Tecla | Fala (BLIVRE) | Contador | Rumo |", "|---|---|---|---|---|---|"]
    for k, mi in enumerate(e["missoes"], 1):
        fala = f"“{mi['fala']['texto']}” ({mi['fala']['ref']})" if mi["fala"] else "nenhuma"
        out.append(f"| {k} | {mi['objetivo']} | {mi.get('acao') or '—'} | {fala} | {mi['conta']} de {e['contador']['total']} | {mi['rumo']}° |")
    out.append("")
    for k in range(1, 4): out += take_md(ep, k, "####")
    out += medidas(ep) + ["A legenda do post (`tools/legenda.py` → `LEGENDAS.md`):", "", "```", legenda_de("LEGENDAS.md", "## Pescadores de gente"), "```"]
    return out


def sec_jornada():
    J = jornada.J; ms = J["missoes"]
    out = [f"Gancho: “{' / '.join(J['gancho'])}” (`{{s}}` é a duração medida do reel); título “{J['titulo']}”; ritmo {brs(J['ritmo'])}x; "
           f"último quadro parado {brs(J['pausa'])} s; cartão final {brs(J['fim_s'])} s com “{jornada.FIM_QUOTE[1]}” ({ref(jornada.FIM_QUOTE[0])}).", "",
           "| Missão | O que o HUD mostra | Take montado de |", "|---|---|---|"]
    for k, mi in enumerate(ms, 1):
        mont = "; ".join(f"quadros {a}–{b - 1} de `{Path(f).name}`" + (f" (aproximado {br(z[0])}x)" if z else "") for f, a, b, *z in mi["montagem"]) if mi.get("montagem") else "o take inteiro"
        out.append(f"| {k} | {hud_de('jornada', k)} | {mont} |")
    out.append("")
    for k in range(1, len(ms) + 1): out += take_md("jornada", k, "####")
    out += medidas("jornada") + ["A legenda do post (`python3 -I jornada.py --legenda` → `LEGENDAS-JORNADA.md`):", "", "```", legenda_de("LEGENDAS-JORNADA.md"), "```"]
    return out


def sec_fila():
    out = ["| Episódio | Takes gerados | Reel |", "|---|---|---|"]
    for e in ORDEM:
        n = len(CENAS[e]["missoes"]); done = sum(1 for k in range(1, n + 1) if MAN["takes"].get(f"{e}-{k}", {}).get("url")); r = MAN["reels"].get(e)
        out.append(f"| `{e}` · {titulo(e)} | {done} de {n} | " + (f"conferido, {br(r['duracao_s'], 2)} s" if r else "—") + " |")
    return out


SECOES = {"blocos": sec_blocos, "medidas": sec_medidas, "pescadores": sec_pescadores, "jornada": sec_jornada, "fila": sec_fila}


def skill_md(text):
    def fill(m):
        name = m[1]; assert name in SECOES, f"SKILL.md asks for an unknown section: {name}"
        return f"<!-- gerado:{name} -->\n" + "\n".join(SECOES[name]()).rstrip() + "\n<!-- /gerado -->"
    new, n = re.subn(r"<!-- gerado:([a-z]+) -->\n.*?<!-- /gerado -->", fill, text, flags=re.S)
    assert n == len(SECOES), f"SKILL.md has {n} generated sections, expected {len(SECOES)}"
    return new


def main():
    bad = [b for e in ORDEM for k in range(1, len(CENAS[e]["missoes"]) + 1) for b in regras(e, k, pedido(e, k, k == 1))]
    for b in bad: print("FAIL", b)
    files = {ROOT / "PROMPTS.md": prompts_md(), ROOT / "SKILL.md": skill_md((ROOT / "SKILL.md").read_text(encoding="utf-8"))}
    stale = [f.name for f, t in files.items() if not f.exists() or f.read_text(encoding="utf-8") != t]
    if "--check" in sys.argv:
        for s in stale: print("FAIL", s, "is out of date: run python3 -I tools/prompts.py")
        print("ok" if not (bad or stale) else "SOME CHECKS FAILED"); sys.exit(1 if bad or stale else 0)
    for f, t in files.items(): f.write_text(t, encoding="utf-8")
    n = sum(len(CENAS[e]["missoes"]) for e in ORDEM)
    print(f"PROMPTS.md: {n} prompts em {len(ORDEM)} episódios; SKILL.md: {len(SECOES)} seções geradas" + (f"; {len(bad)} prompt(s) fora da regra" if bad else ""))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
