import Image from "next/image";
import { shareMetadata } from "@/lib/share-metadata";
import { SITE_NAME } from "@/lib/site-identity";
import Link from "next/link";
import { ArcIcon, Icon } from "@/components/icons";
import { LivingGraph } from "@/components/explore/LivingGraph";
import { ScriptureText } from "@/components/explore/ScriptureText";
import { DiscoveryQuest } from "@/components/home/DiscoveryQuest";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HomeAtlas } from "@/components/home/HomeAtlas";
import { HomeMotion } from "@/components/home/HomeMotion";
import { HomeGuide } from "@/components/home/HomeGuide";
import { DawnOpening } from "@/components/home/DawnOpening";
import { summary, verseText } from "@/lib/data";
import { formatInt } from "@/lib/canon/text";
import { illustratedAtlasData } from "@/lib/explore/living-graph";
import type { DiscoveryQuestion } from "@/lib/journey";
import { JOURNEY_TARGET_POINTS, JOURNEY_TARGET_ACTIVE_DAYS } from "@/lib/rewards/rules";
import skyPoster from "../../public/sculpture/noite-854.webp";
import styles from "./page.module.css";

export const metadata = shareMetadata({
  title: SITE_NAME,
  description: "Mapa navegável das ligações da Bíblia: livros, capítulos, versículos e referências cruzadas. Em português, só com fontes livres.",
  path: "/",
});

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
      <DawnOpening graph={graph} />
      <section className={styles.hero} aria-label="Busque e explore a Bíblia">
        <section className={`${styles.searchBand} ${styles.heroSearch}`} aria-label="Busque na Bíblia">
          <div className={styles.searchLabel}><Icon name="search" /><span>O que você quer<br /><strong>descobrir hoje?</strong></span></div>
          <div className={styles.searchField}><HeroSearch text="Um versículo, uma palavra, um livro..." /></div>
          <div className={styles.searchIdeas}><span>Que tal...</span>{["amor", "paz", "esperança"].map((word) => <Link key={word} href={`/buscar?q=${encodeURIComponent(word)}`}>{word} <span aria-hidden="true">↗</span></Link>)}</div>
        </section>
        <div className={styles.heroGraph} id="atlas-vivo"><LivingGraph data={graph} immersive /></div>
        <HomeGuide />
        <Link className={styles.scrollHint} href="#descobrir"><span aria-hidden="true">↓</span> Há um mundo para descobrir</Link>
      </section>

      <section className={styles.journeyInvite} aria-labelledby="journey-invite-title">
        <div className={styles.journeySymbol} aria-hidden="true"><ArcIcon /><span>✦</span></div>
        <div className={styles.journeyInviteCopy}>
          <p className={styles.eyebrow}>SUA CONSTÂNCIA TEM VALOR</p>
          <h2 id="journey-invite-title">Um pouco a cada dia.<br /><em>Um caminho que fica.</em></h2>
          <p>Leia, explore e acompanhe suas conquistas. Estamos preparando um presente para essa caminhada: o Mini Jesus da Bentô 3D Labs.</p>
          <div className={styles.journeyInviteActions}><Link href="/jornada" prefetch={false} className={styles.primary}>Começar minha jornada <Icon name="out" /></Link><Link href="/liturgia" prefetch={false} className={styles.textLink}>Ler a liturgia de hoje <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className={styles.journeyMilestone}>
          <span>O próximo horizonte</span><strong>{formatInt(JOURNEY_TARGET_POINTS)} <small>pontos</small></strong>
          <p>e pelo menos {JOURNEY_TARGET_ACTIVE_DAYS} dias de leitura e descobertas.</p>
          <span className={styles.journeyFuture}>Presente em preparação</span>
          <p className={styles.journeyFine}>Comece sem cadastro. O resgate será anunciado com as regras e a disponibilidade; os pontos ainda não garantem um presente.</p>
        </div>
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
            <Image src={skyPoster} alt="" sizes="(max-width: 760px) 100vw, 42vw" className={styles.skyArt} />
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
        <div className={styles.skyVista} role="img" aria-label="Visualização das referências cruzadas da Bíblia como fios de luz." />
        <div className={styles.skyStory} data-reveal="">
          <p className={styles.skyLabel}><ArcIcon /> O céu das conexões</p>
          <h2 id="sky-title">Um universo.<br /><span>Tudo conectado.</span></h2>
          <p>Gire a Bíblia. Toque uma passagem. Veja a história se conectar, de Gênesis a Apocalipse.</p>
          <Link href="/arcos" className={styles.skyEnter}>Explorar em 3D <Icon name="out" /></Link>
        </div>
        <div className={styles.skyFooter}>
          <div className={styles.skyStarts} aria-label="Comece por uma passagem">
            <span>Por onde começar?</span>
            <Link href="/arcos#genesis/1/3">A luz <span>Gn 1:3 ↗</span></Link>
            <Link href="/arcos#joao/3/16">O amor <span>Jo 3:16 ↗</span></Link>
            <Link href="/arcos#daniel/9">A promessa <span>Dn 9 ↗</span></Link>
          </div>
          <span className={styles.skyCaption}>Conexões reais · OpenBible.info</span>
        </div>
      </section>

      <section className={styles.story} aria-labelledby="story-title">
        <div className={styles.storyHeading} data-reveal=""><p className={styles.eyebrow}>SIGA O FIO DA HISTÓRIA</p><h2 id="story-title">Uma promessa.<br /><em>Um encontro.</em></h2><p>Textos escritos em momentos diferentes se aproximam. Leia, siga o fio e descubra o que os conecta.</p><Link href="/conexao/isaias-9/lucas-2" className={styles.textLink}>Explorar essa conexão <Icon name="out" /></Link></div>
        <div className={styles.scriptureTrail}>
          <figure data-reveal=""><figcaption><span>ANTIGO TESTAMENTO</span><Link href="/isaias/9/6">Isaías 9:6 <span aria-hidden="true">↗</span></Link></figcaption><blockquote><ScriptureText text={promise} /></blockquote></figure>
          <div className={styles.threadLabel}><Icon name="explore" /> Referência cruzada</div>
          <figure data-reveal=""><figcaption><span>NOVO TESTAMENTO</span><Link href="/lucas/2/11">Lucas 2:11 <span aria-hidden="true">↗</span></Link></figcaption><blockquote><ScriptureText text={birth} /></blockquote></figure>
        </div>
      </section>

      <section id="sua-jornada" className={styles.questSection} aria-labelledby="quest-title">
        <div className={styles.sectionHead} data-reveal=""><div><p className={styles.eyebrow}>APRENDA. DESCUBRA. FLORESÇA.</p><h2 id="quest-title">Pequenas descobertas.<br /><em>Uma grande jornada.</em></h2></div><p>Leia uma passagem, teste o que aprendeu e veja sua jornada florescer.</p></div>
        <DiscoveryQuest questions={questions} />
      </section>

      <section className={styles.quiet} data-reveal="" aria-labelledby="quiet-title"><Icon name="book" /><p className={styles.eyebrow}>NO SEU TEMPO</p><h2 id="quiet-title">Também há espaço para<br /><em>simplesmente ler.</em></h2><p>Sem pressa. Um versículo de cada vez. Guarde os trechos que tocam você e volte quando quiser.</p><div className={styles.actions}><Link href="/ler" className={styles.primary}>Abrir a Bíblia <Icon name="out" /></Link><Link href="/salvos" className={styles.secondary}><Icon name="bookmark" /> Meus trechos salvos</Link><Link href="/assistente" className={styles.secondary}>Estudo acompanhado <Icon name="out" /></Link></div></section>
      <div className={styles.dataLine}><span>{formatInt(summary.counts.books)} livros. {formatInt(summary.counts.verses)} versículos. Histórias que se encontram.</span><Link href="/sobre">Texto livre. Fontes abertas. <span aria-hidden="true">↗</span></Link></div>
      <details className={styles.fullAtlas}><summary>Quer ir mais fundo? Abra o atlas completo de Isaías 9 <span aria-hidden="true">+</span></summary><HomeAtlas /></details>
      <section className={styles.supportInvite} aria-labelledby="support-invite-title">
        <div><p className={styles.eyebrow}>A PALAVRA TAMBÉM VIRA CUIDADO</p><h2 id="support-invite-title">Um gesto seu pode ir mais longe.</h2><p>Ajude a Bíblia Conectada, a produção dos mini Jesus e a entrega de cestas básicas. Conheça a campanha e acompanhe cada passo.</p></div>
        <Link href="/apoie" prefetch={false} className={styles.textLink}>Conhecer e apoiar <Icon name="out" /></Link>
      </section>
    </main>
  );
}
