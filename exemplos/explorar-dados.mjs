#!/usr/bin/env node
// Explora o pacote de dados abertos da Bíblia Conectada. Sem dependências (Node 18 ou mais novo).
//
// Uso:
//   node exemplos/explorar-dados.mjs PASTA_DO_PACOTE [LIVRO_A LIVRO_B]
//
// PASTA_DO_PACOTE é a pasta com ligacoes.csv, versiculos.csv, livros.json e texto/: site/public/dados/v1 depois de
// `cd site && npm ci && npm run data`, ou a pasta que sai do zip baixado em /dados. LIVRO_A e LIVRO_B aceitam o nome,
// o slug, o código OSIS ou uma abreviação (padrão: Isaías e Mateus).
//
// O que faz: confere os arquivos pelo SHA256SUMS, lista os 10 versículos mais ligados (com os empates do 10º lugar),
// mostra o texto BLIVRE do primeiro com o crédito e resume as ligações entre os dois livros. A saída é a mesma do
// exemplo em Python (explorar_dados.py). Documentação de cada campo: DADOS.md.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TOP = 10;
const TOP_ENTRE_LIVROS = 5;
const CREDITO_OPENBIBLE = "Referências cruzadas: OpenBible.info (CC BY)";

/** 31102 -> "31.102", como no site. */
const numero = (n) => (n < 0 ? "-" : "") + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Sem acento, sem espaço, minúscula: "1 Coríntios" -> "1corintios". */
const chave = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, "");

/** Lê um CSV (RFC 4180: campos entre aspas podem ter vírgula, aspas dobradas e quebra de linha) como objetos. */
function lerCsv(caminho) {
  const s = readFileSync(caminho, "utf8");
  const linhas = [];
  let linha = [];
  let i = 0;
  while (i < s.length) {
    let campo = "";
    if (s[i] === '"') {
      i++;
      for (;;) {
        const q = s.indexOf('"', i);
        campo += s.slice(i, q);
        if (s[q + 1] === '"') {
          campo += '"';
          i = q + 2;
        } else {
          i = q + 1;
          break;
        }
      }
    } else {
      let j = i;
      while (j < s.length && s[j] !== "," && s[j] !== "\n" && s[j] !== "\r") j++;
      campo = s.slice(i, j);
      i = j;
    }
    linha.push(campo);
    if (s[i] === ",") i++;
    else {
      linhas.push(linha);
      linha = [];
      if (s[i] === "\r") i++;
      if (s[i] === "\n") i++;
    }
  }
  const [cabecalho, ...resto] = linhas;
  return resto.map((l) => Object.fromEntries(cabecalho.map((nome, k) => [nome, l[k]])));
}

function conferir(pasta) {
  const linhas = readFileSync(join(pasta, "SHA256SUMS"), "utf8").trimEnd().split("\n");
  let ok = 0;
  for (const linha of linhas) {
    const [esperado, nome] = [linha.slice(0, 64), linha.slice(66)];
    if (createHash("sha256").update(readFileSync(join(pasta, nome))).digest("hex") !== esperado) {
      console.error(`${nome}: SHA-256 diferente do SHA256SUMS`);
      process.exit(1);
    }
    ok++;
  }
  return [ok, linhas.length];
}

function acharLivro(livros, nome) {
  const porChave = new Map();
  for (const livro of livros) {
    const nomes = [livro.nome, livro.slug, livro.osis, livro.abreviacao, ...livro.outras_abreviacoes];
    for (const k of new Set(nomes.map(chave))) porChave.set(k, [...(porChave.get(k) ?? []), livro]);
  }
  const achados = porChave.get(chave(nome)) ?? [];
  if (achados.length !== 1) {
    const opcoes = achados.map((l) => l.nome).join(", ") || "nenhum livro";
    console.error(`"${nome}": ${opcoes}. Use o nome completo, o slug ou o código OSIS.`);
    process.exit(1);
  }
  return achados[0];
}

const args = process.argv.slice(2);
if (args.length !== 1 && args.length !== 3) {
  console.error("Uso: node exemplos/explorar-dados.mjs PASTA_DO_PACOTE [LIVRO_A LIVRO_B]");
  process.exit(2);
}
const pasta = args[0];
const [nomeA, nomeB] = args.length === 3 ? args.slice(1) : ["Isaías", "Mateus"];
const lerJson = (p) => JSON.parse(readFileSync(join(pasta, p), "utf8"));

const livros = lerJson("livros.json");
const a = acharLivro(livros, nomeA); // antes de tudo, para errar cedo
const b = acharLivro(livros, nomeB);

console.log(`Bíblia Conectada: dados abertos ${lerJson("datapackage.json").version} (${pasta})`);
const [ok, total] = conferir(pasta);
console.log(`SHA256SUMS: ${numero(ok)} de ${numero(total)} arquivos conferidos`);

const versiculos = lerCsv(join(pasta, "versiculos.csv"));
const ligacoes = lerCsv(join(pasta, "ligacoes.csv"));

// 1. versículos mais ligados: cada linha de ligacoes.csv é um par distinto, então basta contar as duas pontas
const parceiros = new Map();
for (const l of ligacoes) {
  for (const i of [Number(l.indice_a), Number(l.indice_b)]) parceiros.set(i, (parceiros.get(i) ?? 0) + 1);
}
for (const v of versiculos) {
  // a coluna ligacoes de versiculos.csv já traz a mesma conta
  if ((parceiros.get(Number(v.indice)) ?? 0) !== Number(v.ligacoes)) throw new Error(v.referencia);
}
const ordem = [...parceiros].sort((x, y) => y[1] - x[1] || x[0] - y[0]);
const corte = ordem[TOP - 1][1];
const mais = ordem.filter(([, n]) => n >= corte);
console.log();
console.log(`Os ${TOP} versículos mais ligados (parceiros únicos, qualquer voto; empates no ${TOP}º lugar entram):`);
const largura = Math.max(...mais.map(([i]) => versiculos[i].referencia.length));
let posicao = 0;
let anterior = null;
mais.forEach(([indice, n], k) => {
  posicao = n !== anterior ? k + 1 : posicao;
  anterior = n;
  console.log(`  ${String(posicao).padStart(2)}. ${versiculos[indice].referencia.padEnd(largura)}  ${numero(n).padStart(5)}`);
});

// 2. o texto BLIVRE do primeiro, com o crédito que vem dentro do arquivo
const primeiro = versiculos[mais[0][0]];
const livro = livros.find((l) => l.osis === primeiro.livro_osis);
const texto = lerJson(livro.arquivo_texto);
console.log();
console.log(`${primeiro.referencia} (BLIVRE): "${texto.capitulos[Number(primeiro.capitulo) - 1][Number(primeiro.versiculo) - 1]}"`);

// 3. ligações entre dois livros
const livroDe = new Map(versiculos.map((v) => [Number(v.indice), v.livro_osis]));
// os livros das duas pontas, como conjunto, são exatamente {A, B} (se A = B, as duas pontas ficam no mesmo livro)
const par = new Set([a.osis, b.osis]);
const entre = ligacoes.filter((l) => {
  const pontas = new Set([livroDe.get(Number(l.indice_a)), livroDe.get(Number(l.indice_b))]);
  return pontas.size === par.size && [...pontas].every((osis) => par.has(osis));
});
const votos = entre.reduce((s, l) => s + Number(l.votos), 0);
console.log();
console.log(`Ligações entre ${a.nome} e ${b.nome}: ${numero(entre.length)} pares, ${numero(votos)} votos somados`);
if (entre.length) {
  entre.sort((x, y) => Number(y.votos) - Number(x.votos) || Number(x.indice_a) - Number(y.indice_a) || Number(x.indice_b) - Number(y.indice_b));
  console.log(`As ${Math.min(TOP_ENTRE_LIVROS, entre.length)} mais votadas:`);
  for (const l of entre.slice(0, TOP_ENTRE_LIVROS)) {
    console.log(`  ${l.referencia_a} ↔ ${l.referencia_b}: ${numero(Number(l.votos))} votos (${l.direcao})`);
  }
}

console.log();
console.log("Créditos:");
console.log(`  ${CREDITO_OPENBIBLE}`);
console.log(`  ${texto.credito}`);
