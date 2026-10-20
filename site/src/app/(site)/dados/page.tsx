import type { Metadata } from "next";
import manifestJson from "@/data/generated/dados-manifest.json";
import { DownloadIcon, Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { books, credits } from "@/lib/data";
import { DADOS_BASE, formatBytes, type DadosFile, type DadosManifest } from "@/lib/dados";
import styles from "./dados.module.css";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Dados abertos",
  description:
    "Baixe as ligações entre os versículos da Bíblia, o texto da Bíblia Livre e o grafo dos capítulos, em CSV e JSON, com licença livre, para criar os seus próprios projetos.",
  alternates: { canonical: "/dados" },
};

// Every size, record count and total on this page is read from the bundle's manifest, written by
// scripts/data/open-data.ts; scripts/check-dist.ts compares the prerendered page with it after each build (each file's
// element, marked data-file, holds its link, its size and its count).
const manifest = manifestJson as DadosManifest;
const REPO = "https://github.com/alexpiraginet-bot/biblia-conectada";
const c = manifest.contagens;
const n = formatInt;

const file = (caminho: string) => {
  const f = manifest.arquivos.find((x) => x.caminho === caminho);
  if (!f) throw new Error(`${caminho} is not in the open data manifest`);
  return f;
};
const zip = manifest.arquivos.find((f) => f.formato === "zip")!;
const texts = manifest.arquivos.filter((f) => f.caminho.startsWith("texto/"));
const textBytes = texts.reduce((s, f) => s + f.bytes, 0);
const textVerses = texts.reduce((s, f) => s + (f.registros ?? 0), 0);
const bookName = (caminho: string) => books.find((b) => `texto/${b.slug}.json` === caminho)?.name ?? caminho;
const href = (f: DadosFile) => `${DADOS_BASE}${f.caminho}`;
/** tables and the zip are saved; the rest opens in the browser */
const saved = (f: DadosFile) => f.formato === "csv" || f.formato === "zip";

function Size({ f }: { f: DadosFile }) {
  return <data value={f.bytes}>{formatBytes(f.bytes)}</data>;
}
function Records({ f }: { f: DadosFile }) {
  return f.registros === undefined ? null : (
    <>
      {" · "}
      {n(f.registros)} {f.unidade}
    </>
  );
}
function FileRow({ f }: { f: DadosFile }) {
  return (
    <li data-file={f.caminho} className={styles.file}>
      <div className={styles.fileText}>
        <span className={styles.fileName}>{f.caminho}</span>
        <span className={styles.fileDesc}>{f.titulo}</span>
        <span className={styles.fileMeta}>
          <Size f={f} />
          <Records f={f} />
        </span>
      </div>
      <a href={href(f)} download={saved(f) || undefined} className={`bc-button bc-button--secondary ${styles.get}`}>
        {saved(f) ? <DownloadIcon size={20} /> : <Icon name="out" />}
        {saved(f) ? "Baixar" : "Abrir"}
        <span className="visually-hidden"> {f.caminho}</span>
      </a>
    </li>
  );
}

const SECTIONS = [
  ["arquivos", "Arquivos"],
  ["convencoes", "O que conta como ligação"],
  ["licenca", "Licença e créditos"],
  ["usar", "Como usar"],
  ["ideias", "Faça com o nosso"],
  ["citar", "Para citar"],
] as const;

const PYTHON = `import csv
from collections import Counter

ligacoes = Counter()
with open("ligacoes.csv", encoding="utf-8", newline="") as f:
    for linha in csv.DictReader(f):
        ligacoes[linha["referencia_a"]] += 1
        ligacoes[linha["referencia_b"]] += 1

for referencia, total in ligacoes.most_common(5):
    print(referencia, total)`;

const JS = `const livros = await (await fetch("${DADOS_BASE}livros.json")).json();
const isaias = livros.find((livro) => livro.slug === "isaias");
console.log(isaias.nome, isaias.capitulos, "capítulos");`;

export default function Dados() {
  return (
    <main id="conteudo" className="site-page">
      <header className={styles.head}>
        <h1 className="bc-display">Dados abertos</h1>
        <p className="bc-lede">
          Os dados que este site usa estão aqui para baixar e reutilizar: {n(c.paresLigados)} pares de versículos ligados, com os
          votos da OpenBible.info, o texto completo da Bíblia Livre e o grafo dos {n(c.capitulos)} capítulos. Tudo sai de código, a
          partir de fontes livres, e é refeito a cada versão do site.
        </p>
        <p data-file={zip.caminho} className={styles.all}>
          <a href={href(zip)} download className="bc-button bc-button--primary">
            <DownloadIcon size={20} />
            Baixar tudo (.zip)
          </a>
          <span className={styles.fileMeta}>
            <Size f={zip} />
            <Records f={zip} />
          </span>
        </p>
      </header>

      <div className={styles.layout}>
        <nav aria-labelledby="nesta-pagina" className={styles.toc}>
          <h2 id="nesta-pagina" className={styles.tocTitle}>
            Nesta página
          </h2>
          <ol>
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.content}>
          <section aria-labelledby="arquivos" className={styles.section}>
            <h2 id="arquivos" className="bc-title">
              Arquivos
            </h2>
            <p>
              Versão {manifest.versao}. As tabelas vêm em CSV (UTF-8, com cabeçalho) e o resto em JSON. O esquema de cada tabela, com
              campos, tipos e chaves, está no <code>datapackage.json</code>, no padrão Frictionless Data Package v2. Tamanhos em
              unidades decimais: 1 MB = 1.000.000 bytes.
            </p>

            <ul className={styles.files}>
              {["ligacoes.csv", "versiculos.csv", "livros.json", "capitulos.csv", "capitulos-arestas.csv", "estudos/natal.json"].map(
                (p) => (
                  <FileRow key={p} f={file(p)} />
                ),
              )}
              <li data-group="texto" className={`${styles.file} ${styles.group}`}>
                <div className={styles.fileText}>
                  <span className={styles.fileName}>texto/</span>
                  <span className={styles.fileDesc}>
                    Texto da Bíblia Livre, sem alterações: um arquivo por livro ({n(texts.length)} arquivos), com a linha de
                    crédito dentro de cada um.
                  </span>
                  <span className={styles.fileMeta}>
                    <data value={textBytes}>{formatBytes(textBytes)}</data> · {n(textVerses)} versículos
                  </span>
                </div>
                <details className={styles.more}>
                  <summary>
                    <Icon name="chev-r" className={`bc-icon ${styles.chevron}`} />
                    Ver os {n(texts.length)} arquivos
                  </summary>
                  <ul className={styles.textFiles}>
                    {texts.map((f) => (
                      <li key={f.caminho} data-file={f.caminho}>
                        <a href={href(f)}>{bookName(f.caminho)}</a>
                        <span className={styles.fileMeta}>
                          <Size f={f} />
                          <Records f={f} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
              {["datapackage.json", "LEIA-ME.md", "LICENSE.txt"].map((p) => (
                <FileRow key={p} f={file(p)} />
              ))}
            </ul>
            <p className={styles.note}>
              Para conferir o que baixou: <a href={`${DADOS_BASE}SHA256SUMS`}>SHA256SUMS</a> (comando{" "}
              <code>sha256sum -c SHA256SUMS</code>) e <a href={`${DADOS_BASE}manifest.json`}>manifest.json</a>, com o tamanho e o
              número de registros de cada arquivo.
            </p>
          </section>

          <section aria-labelledby="convencoes" className={styles.section}>
            <h2 id="convencoes" className="bc-title">
              O que conta como ligação
            </h2>
            <p>Estas escolhas mudam os números. São as mesmas dos vídeos e do resto do site.</p>
            <ul className={styles.rules}>
              <li>
                <strong>Grade de versículos KJV/OpenBible:</strong> {n(c.livros)} livros, {n(c.capitulos)} capítulos e{" "}
                {n(c.versiculos)} versículos. O índice global começa em 0, em Gênesis 1:1, e liga os arquivos entre si.
              </li>
              <li>
                <strong>Um trecho conta pelo primeiro versículo:</strong> uma referência a Mateus 5:3–12 vira uma ligação com Mateus
                5:3.
              </li>
              <li>
                <strong>Sem auto-pares:</strong> as {n(c.linhasOpenBible)} linhas da OpenBible.info formam {n(c.paresUnicos)} pares
                únicos; {n(c.autoPares)} ligam um versículo a um trecho que começa nele mesmo e ficam de fora. Sobram{" "}
                {n(c.paresLigados)} pares de versículos diferentes.
              </li>
              <li>
                <strong>Os votos somam as duas direções</strong> e podem ser zero ou negativos: vão de {n(c.votosMin)} a{" "}
                {n(c.votosMax)}. A direção e o voto de cada lado têm colunas próprias.
              </li>
              <li>
                <strong>As ligações de um versículo</strong> são os outros versículos ligados a ele, contados uma vez cada, com
                qualquer voto. É o número ao lado de cada versículo nas páginas de leitura.
              </li>
            </ul>
          </section>

          <section aria-labelledby="licenca" className={styles.section}>
            <h2 id="licenca" className="bc-title">
              Licença e créditos
            </h2>
            <p>
              Os dados derivados (ligações, votos, contagens e grafos) saem sob a{" "}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br">CC BY-SA 4.0</a>: dá para copiar, adaptar e usar,
              inclusive em projeto comercial, dando o crédito e compartilhando o que derivar pela mesma licença. O texto bíblico de{" "}
              <code>texto/</code> é a Bíblia Livre sem alterações e segue a licença dela, a CC BY 4.0 Brasil.
            </p>
            <p>Ao usar o texto bíblico, copie este crédito:</p>
            <blockquote className={styles.credit}>{credits.blivreCredit}</blockquote>
            <p>Ao usar as ligações ou os votos, cite a fonte:</p>
            <blockquote className={styles.credit}>
              {credits.openBibleCredit} (<a href="https://www.openbible.info/labs/cross-references/">openbible.info</a>, CC BY)
            </blockquote>
            <p>E, se quiser, este projeto:</p>
            <blockquote className={styles.credit}>
              Dados: Bíblia Conectada ({REPO}), CC BY-SA 4.0. {credits.openBibleCredit} (CC BY).
            </blockquote>
          </section>

          <section aria-labelledby="usar" className={styles.section}>
            <h2 id="usar" className="bc-title">
              Como usar
            </h2>
            <p>
              Em Python, só com a biblioteca padrão, depois de baixar <code>ligacoes.csv</code>: os cinco versículos com mais
              ligações.
            </p>
            <pre className={styles.code}>
              <code>{PYTHON}</code>
            </pre>
            <p>Em JavaScript, numa página deste site (os arquivos também aceitam pedidos de outros sites):</p>
            <pre className={styles.code}>
              <code>{JS}</code>
            </pre>
            <p>
              Exemplos completos, que listam os versículos mais ligados, as ligações entre dois livros e conferem os arquivos, estão em{" "}
              <a href={`${REPO}/tree/main/exemplos`}>exemplos/</a>, em Python e em JavaScript, sem dependências. Cada campo de cada
              arquivo está descrito no <a href={`${REPO}/blob/main/DADOS.md`}>DADOS.md</a>, que também ensina a gerar tudo de novo a
              partir das fontes.
            </p>
          </section>

          <section aria-labelledby="ideias" className={styles.section}>
            <h2 id="ideias" className="bc-title">
              Faça com o nosso
            </h2>
            <p>Ideias que estes arquivos já permitem, sem pedir nada a ninguém:</p>
            <ul className={styles.ideas}>
              <li>
                <strong>Mapa de calor livro × livro.</strong> Some as linhas de <code>ligacoes.csv</code> por par de livros (o começo
                de <code>osis_a</code> e <code>osis_b</code>) e pinte uma grade de {n(c.livros)} por {n(c.livros)}: aparece quais
                livros conversam mais.
              </li>
              <li>
                <strong>Grafo no Gephi ou no Cytoscape.</strong> Importe <code>capitulos.csv</code> como nós e{" "}
                <code>capitulos-arestas.csv</code> como arestas. As posições x e y já vêm calculadas.
              </li>
              <li>
                <strong>Trilhas de leitura.</strong> Comece num versículo e siga sempre a ligação mais votada que ainda não foi lida.
                Os arquivos de <code>texto/</code> dão o texto de cada passo, com o crédito da BLIVRE.
              </li>
              <li>
                <strong>Profecia e cumprimento.</strong> Cruze <code>ligacoes.csv</code> com a coluna testamento de{" "}
                <code>versiculos.csv</code>, fique só com os pares entre o Antigo e o Novo Testamento e ordene pelos votos, como no
                estudo do Natal.
              </li>
              <li>
                <strong>Pôster de arcos.</strong> Desenhe um meio-arco para cada ligação sobre uma linha de Gênesis a Apocalipse, como no
                vídeo “A Bíblia, conectada”, e use os votos na espessura.
              </li>
              <li>
                <strong>Jogo de ligações.</strong> Sorteie dois versículos ligados e peça para adivinhar o que os une; a direção e os
                votos dizem quão forte é a ligação.
              </li>
              <li>
                <strong>Consultas com SQL.</strong> Carregue os CSV no SQLite ou no DuckDB e pergunte o que quiser, por exemplo os
                capítulos de Salmos mais citados pelos evangelhos.
              </li>
              <li>
                <strong>Planilha de estudo.</strong> Abra <code>versiculos.csv</code> no LibreOffice ou no Google Planilhas (importando
                como UTF-8, separado por vírgula) e filtre por livro.
              </li>
            </ul>
          </section>

          <section aria-labelledby="citar" className={styles.section}>
            <h2 id="citar" className="bc-title">
              Para citar
            </h2>
            <p>
              O repositório tem um <a href={`${REPO}/blob/main/CITATION.cff`}>CITATION.cff</a>, que o GitHub mostra como “Cite this
              repository”. Em texto:
            </p>
            <blockquote className={styles.credit}>
              Piragine Teixeira, Alex. Bíblia Conectada: dados abertos, versão {manifest.versao}. {REPO}. Licença CC BY-SA 4.0.
            </blockquote>
          </section>
        </div>
      </div>
    </main>
  );
}
