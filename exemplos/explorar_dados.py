#!/usr/bin/env python3
"""Explora o pacote de dados abertos da Bíblia Conectada. Só usa a biblioteca padrão (Python 3.8 ou mais novo).

Uso:
    python3 exemplos/explorar_dados.py PASTA_DO_PACOTE [LIVRO_A LIVRO_B]

PASTA_DO_PACOTE é a pasta com ligacoes.csv, versiculos.csv, livros.json e texto/: site/public/dados/v1 depois de
`cd site && npm ci && npm run data`, ou a pasta que sai do zip baixado em /dados. LIVRO_A e LIVRO_B aceitam o nome,
o slug, o código OSIS ou uma abreviação (padrão: Isaías e Mateus).

O que faz: confere os arquivos pelo SHA256SUMS, lista os 10 versículos mais ligados (com os empates do 10º lugar),
mostra o texto BLIVRE do primeiro com o crédito e resume as ligações entre os dois livros. A saída é a mesma do
exemplo em JavaScript (explorar-dados.mjs). Documentação de cada campo: DADOS.md.
"""
import csv
import hashlib
import json
import sys
import unicodedata
from collections import Counter
from pathlib import Path

TOP = 10
TOP_ENTRE_LIVROS = 5
CREDITO_OPENBIBLE = "Referências cruzadas: OpenBible.info (CC BY)"


def numero(n):
    """31102 -> "31.102", como no site."""
    s = str(abs(n))
    grupos = []
    while len(s) > 3:
        grupos.insert(0, s[-3:])
        s = s[:-3]
    grupos.insert(0, s)
    return ("-" if n < 0 else "") + ".".join(grupos)


def chave(s):
    """Sem acento, sem espaço, minúscula: "1 Coríntios" -> "1corintios"."""
    sem = "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.category(c).startswith("M"))
    return "".join(sem.lower().split())


def ler_csv(caminho):
    with open(caminho, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def conferir(pasta):
    linhas = (pasta / "SHA256SUMS").read_text(encoding="utf-8").splitlines()
    ok = 0
    for linha in linhas:
        esperado, nome = linha.split("  ", 1)
        if hashlib.sha256((pasta / nome).read_bytes()).hexdigest() != esperado:
            sys.exit(f"{nome}: SHA-256 diferente do SHA256SUMS")
        ok += 1
    return ok, len(linhas)


def achar_livro(livros, nome):
    por_chave = {}
    for livro in livros:
        nomes = [livro["nome"], livro["slug"], livro["osis"], livro["abreviacao"], *livro["outras_abreviacoes"]]
        for k in {chave(x) for x in nomes}:
            por_chave.setdefault(k, []).append(livro)
    achados = por_chave.get(chave(nome), [])
    if len(achados) != 1:
        opcoes = ", ".join(l["nome"] for l in achados) or "nenhum livro"
        sys.exit(f'"{nome}": {opcoes}. Use o nome completo, o slug ou o código OSIS.')
    return achados[0]


def main():
    if len(sys.argv) not in (2, 4):
        sys.exit(__doc__)
    pasta = Path(sys.argv[1])
    nome_a, nome_b = sys.argv[2:4] if len(sys.argv) == 4 else ("Isaías", "Mateus")

    livros = json.loads((pasta / "livros.json").read_text(encoding="utf-8"))
    a, b = achar_livro(livros, nome_a), achar_livro(livros, nome_b)  # antes de tudo, para errar cedo

    versao = json.loads((pasta / "datapackage.json").read_text(encoding="utf-8"))["version"]
    print(f"Bíblia Conectada: dados abertos {versao} ({sys.argv[1]})")
    ok, total = conferir(pasta)
    print(f"SHA256SUMS: {numero(ok)} de {numero(total)} arquivos conferidos")

    versiculos = ler_csv(pasta / "versiculos.csv")
    ligacoes = ler_csv(pasta / "ligacoes.csv")

    # 1. versículos mais ligados: cada linha de ligacoes.csv é um par distinto, então basta contar as duas pontas
    parceiros = Counter()
    for l in ligacoes:
        parceiros[int(l["indice_a"])] += 1
        parceiros[int(l["indice_b"])] += 1
    for v in versiculos:  # a coluna ligacoes de versiculos.csv já traz a mesma conta
        assert parceiros[int(v["indice"])] == int(v["ligacoes"]), v["referencia"]
    ordem = sorted(parceiros.items(), key=lambda par: (-par[1], par[0]))
    corte = ordem[TOP - 1][1]
    mais = [par for par in ordem if par[1] >= corte]
    print()
    print(f"Os {TOP} versículos mais ligados (parceiros únicos, qualquer voto; empates no {TOP}º lugar entram):")
    largura = max(len(versiculos[i]["referencia"]) for i, _ in mais)
    posicao = 0
    anterior = None
    for k, (indice, n) in enumerate(mais, 1):
        posicao = k if n != anterior else posicao
        anterior = n
        print(f"  {posicao:>2}. {versiculos[indice]['referencia']:<{largura}}  {numero(n):>5}")

    # 2. o texto BLIVRE do primeiro, com o crédito que vem dentro do arquivo
    primeiro = versiculos[mais[0][0]]
    livro = next(l for l in livros if l["osis"] == primeiro["livro_osis"])
    texto = json.loads((pasta / livro["arquivo_texto"]).read_text(encoding="utf-8"))
    print()
    print(f"{primeiro['referencia']} (BLIVRE): \"{texto['capitulos'][int(primeiro['capitulo']) - 1][int(primeiro['versiculo']) - 1]}\"")

    # 3. ligações entre dois livros
    livro_de = {int(v["indice"]): v["livro_osis"] for v in versiculos}
    entre = [
        l for l in ligacoes
        if {livro_de[int(l["indice_a"])], livro_de[int(l["indice_b"])]} == {a["osis"], b["osis"]}
    ]
    votos = sum(int(l["votos"]) for l in entre)
    print()
    print(f"Ligações entre {a['nome']} e {b['nome']}: {numero(len(entre))} pares, {numero(votos)} votos somados")
    if entre:
        entre.sort(key=lambda l: (-int(l["votos"]), int(l["indice_a"]), int(l["indice_b"])))
        print(f"As {min(TOP_ENTRE_LIVROS, len(entre))} mais votadas:")
        for l in entre[:TOP_ENTRE_LIVROS]:
            print(f"  {l['referencia_a']} ↔ {l['referencia_b']}: {numero(int(l['votos']))} votos ({l['direcao']})")

    print()
    print("Créditos:")
    print(f"  {CREDITO_OPENBIBLE}")
    print(f"  {texto['credito']}")


if __name__ == "__main__":
    main()
