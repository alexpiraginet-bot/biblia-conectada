import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { LivingGraph } from "@/components/explore/LivingGraph";
import { ScriptureText } from "@/components/explore/ScriptureText";
import { DiscoveryQuest } from "@/components/home/DiscoveryQuest";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HomeAtlas } from "@/components/home/HomeAtlas";
import { HomeMotion } from "@/components/home/HomeMotion";
import { summary, verseText } from "@/lib/data";
import { formatInt } from "@/lib/canon/text";
import { illustratedAtlasData } from "@/lib/explore/living-graph";
import type { DiscoveryQuestion } from "@/lib/journey";
import styles from "./page.module.css";

export default async function Home() {
  const [graph, promise, birth, light, love, peace] = await Promise.all([
    illustratedAtlasData(),
    verseText("isaias", 9, 6),
    verseText("lucas", 2, 11),
    verseText("genesis", 1, 3),
    verseText("joao", 3, 16),
    verseText("joao", 14, 27),
  ]);
  const questions: DiscoveryQuestion[] = [
    {
      id: "genesis-1-3-light-v1", reference: "Gênesis 1:3", passage: light,
      prompt: "O que Deus chama à existência nesta passagem?",
      answers: ["A luz", "As estrelas", "Os mares"], correctIndex: 0,
      explanation: "É a luz. Gênesis começa com a criação e nos convida a acompanhar cada parte dessa história.",
      href: "/genesis/1/3",
    },
    {
      id: "joao-3-16-love-v1", reference: "João 3:16", passage: love,
      prompt: "Qual é a motivação apresentada para Deus dar seu Filho?",
      answers: ["O poder", "O amor", "A riqueza"], correctIndex: 1,
      explanation: "O texto começa pelo amor de Deus pelo mundo. É esse amor que dá sentido ao que vem depois.",
      href: "/joao/3/16",
    },
    {
      id: "joao-14-27-peace-v1", reference: "João 14:27", passage: peace,
      prompt: "O que Jesus deixa aos seus discípulos neste versículo?",
      answers: ["Uma cidade", "Um tesouro", "A paz"], correctIndex: 2,
      explanation: "Jesus fala da sua paz e encoraja os discípulos a não deixarem o coração perturbado ou com medo.",
      href: "/joao/14/27",
    },
  ];
  return (
    <main id="conteudo" className={styles.home} data-home="">
      <HomeMotion />
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span className={styles.liveDot} /> BÍBLIA CONECTADA · UM ATLAS VIVO</p>
          <h1 id="home-title">Uma história. <em>Tudo se conecta.</em></h1>
          <div className={styles.heroBottom}><p className={styles.intro}>Uma passagem leva à outra. Toque em um ponto e siga a sua curiosidade.</p>
            <nav className={styles.experienceTabs} aria-label="Escolha uma experiência"><a href="#atlas-vivo" aria-current="true"><Icon name="explore" /> Constelação</a><Link href="/arcos">Céu em 3D <span aria-hidden="true">↗</span></Link><Link href="/caminhos">Mapa de Jesus <span aria-hidden="true">↗</span></Link></nav>
          </div>
        </div>
        <div className={styles.heroGraph} id="atlas-vivo"><LivingGraph data={graph} immersive /></div>
        <a className={styles.scrollHint} href="#descobrir"><span aria-hidden="true">↓</span> Há um mundo para descobrir</a>
      </section>

      <section className={styles.searchBand} aria-label="Busque na Bíblia">
        <div className={styles.searchLabel}><Icon name="search" /><span>O que você quer<br /><strong>descobrir hoje?</strong></span></div>
        <div className={styles.searchField}><HeroSearch text="Um versículo, uma palavra, um livro..." /></div>
        <div className={styles.searchIdeas}><span>Que tal...</span>{["amor", "paz", "esperança"].map((word) => <Link key={word} href={`/buscar?q=${encodeURIComponent(word)}`}>{word} <span aria-hidden="true">↗</span></Link>)}</div>
      </section>

      <section id="descobrir" className={styles.discover} aria-labelledby="discover-title">
        <div className={styles.sectionHead} data-reveal="">
          <div><p className={styles.eyebrow}>MUITOS CAMINHOS. UMA MESMA HISTÓRIA.</p><h2 id="discover-title">Siga a sua <em>curiosidade.</em></h2></div>
          <p>Há mais de um jeito de se aproximar da Palavra. Escolha o seu.</p>
        </div>
        <div className={styles.cardGrid}>
          <Link href="/caminhos" className={`${styles.discoveryCard} ${styles.landscapeCard}`} data-reveal="" data-spotlight="">
            <Image src="/journey/galilee-dawn.webp" alt="Recriação artística do mar da Galileia ao amanhecer, com um pequeno barco e montanhas ao fundo." fill sizes="(max-width: 760px) 100vw, 52vw" className={styles.landscape} />
            <span className={styles.recreation}>Recriação</span>
            <div className={styles.cardCopy}><span className={styles.cardCategory}>LUGARES QUE CONTAM HISTÓRIAS</span><h3>Pelos caminhos<br />de Jesus.</h3><p>Um mapa, muitas descobertas. Siga os lugares, leia as passagens e encontre as conexões.</p><span className={styles.cardAction}>Explorar o mapa <Icon name="out" /></span></div>
          </Link>
          <Link href="/arcos" className={`${styles.discoveryCard} ${styles.skyCard}`} data-reveal="" data-spotlight="">
            <Image src="/sculpture/noite-854.webp" alt="" width={854} height={480} sizes="(max-width: 760px) 100vw, 42vw" className={styles.skyArt} />
            <div className={styles.cardCopy}><span className={styles.cardCategory}>O CÉU DAS CONEXÕES</span><h3>Cada linha,<br />uma descoberta.</h3><span className={styles.cardAction}>Acender o céu <Icon name="out" /></span></div>
          </Link>
          <Link href="/cronologia" className={`${styles.discoveryCard} ${styles.chronologyCard}`} data-reveal="" data-spotlight="">
            <div className={styles.timeTrail} aria-hidden="true"><span>Belém</span><i /><span>Galileia</span><i /><span>Jerusalém</span></div>
            <div className={styles.cardCopy}><span className={styles.cardCategory}>A HISTÓRIA, PASSO A PASSO</span><h3>Outros olhares.<br />A mesma jornada.</h3><span className={styles.cardAction}>Ler em ordem cronológica <Icon name="out" /></span></div>
          </Link>
        </div>
        <Link href="/ponte" className={styles.playStrip} data-reveal=""><span className={styles.playIcon}><Icon name="bridge" /></span><span><strong>Você encontra a conexão?</strong><span>Uma passagem leva à outra. Entre no jogo da Ponte.</span></span><span className={styles.playCta}>Vamos jogar <Icon name="out" /></span></Link>
      </section>

      <section className={styles.skyInterlude} aria-labelledby="sky-title">
        <div className={styles.skyVista}><Image src="/sculpture/noite-854.webp" alt="Visualização das referências cruzadas da Bíblia como fios de luz." fill sizes="100vw" /></div>
        <div className={styles.skyStory} data-reveal=""><p className={styles.eyebrow}>VEJA A HISTÓRIA INTEIRA</p><h2 id="sky-title">E se cada conexão<br /><em>acendesse uma estrela?</em></h2><p>Da criação ao Apocalipse, as referências cruzadas formam um céu de histórias. Entre, gire e encontre seu próximo versículo.</p><Link href="/arcos">Entrar no céu em 3D <Icon name="out" /></Link><Link href="/arcos#daniel/9" className={styles.skyExample}>Começar por Daniel 9 <span aria-hidden="true">↗</span></Link></div>
        <span className={styles.skyCaption}>Cada fio é uma ligação entre versículos · OpenBible.info</span>
      </section>

      <section className={styles.story} aria-labelledby="story-title">
        <div className={styles.storyHeading} data-reveal=""><p className={styles.eyebrow}>SIGA O FIO DA HISTÓRIA</p><h2 id="story-title">Uma promessa.<br /><em>Um encontro.</em></h2><p>Textos escritos em momentos diferentes se aproximam. Leia, siga o fio e descubra o que os conecta.</p><Link href="/conexao/isaias-9/lucas-2" className={styles.textLink}>Explorar essa conexão <Icon name="out" /></Link></div>
        <div className={styles.scriptureTrail}>
          <figure data-reveal=""><figcaption><span>ANTIGO TESTAMENTO</span><Link href="/isaias/9/6">Isaías 9:6 <span aria-hidden="true">↗</span></Link></figcaption><blockquote><ScriptureText text={promise} /></blockquote></figure>
          <div className={styles.threadLabel}><Icon name="explore" /> Referência cruzada</div>
          <figure data-reveal=""><figcaption><span>NOVO TESTAMENTO</span><Link href="/lucas/2/11">Lucas 2:11 <span aria-hidden="true">↗</span></Link></figcaption><blockquote><ScriptureText text={birth} /></blockquote></figure>
        </div>
      </section>

      <section className={styles.questSection} aria-labelledby="quest-title">
        <div className={styles.sectionHead} data-reveal=""><div><p className={styles.eyebrow}>APRENDA. DESCUBRA. FLORESÇA.</p><h2 id="quest-title">Pequenas descobertas.<br /><em>Uma grande jornada.</em></h2></div><p>Leia uma passagem, teste o que aprendeu e veja sua jornada florescer.</p></div>
        <DiscoveryQuest questions={questions} />
      </section>

      <section className={styles.quiet} data-reveal="" aria-labelledby="quiet-title"><Icon name="book" /><p className={styles.eyebrow}>NO SEU TEMPO</p><h2 id="quiet-title">Também há espaço para<br /><em>simplesmente ler.</em></h2><p>Sem pressa. Um versículo de cada vez. Guarde os trechos que tocam você e volte quando quiser.</p><div className={styles.actions}><Link href="/ler" className={styles.primary}>Abrir a Bíblia <Icon name="out" /></Link><Link href="/salvos" className={styles.secondary}><Icon name="bookmark" /> Meus trechos salvos</Link></div></section>
      <div className={styles.dataLine}><span>{formatInt(summary.counts.books)} livros. {formatInt(summary.counts.verses)} versículos. Histórias que se encontram.</span><Link href="/sobre">Texto livre. Fontes abertas. <span aria-hidden="true">↗</span></Link></div>
      <details className={styles.fullAtlas}><summary>Quer ir mais fundo? Abra o atlas completo de Isaías 9 <span aria-hidden="true">+</span></summary><HomeAtlas /></details>
    </main>
  );
}
