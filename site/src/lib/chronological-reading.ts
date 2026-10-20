/** Editorial reading itinerary, not a harmonized historical chronology. Biblical text is loaded from BLIVRE. */
export const GOSPELS = [
  { id: "mateus", label: "Mateus" },
  { id: "marcos", label: "Marcos" },
  { id: "lucas", label: "Lucas" },
  { id: "joao", label: "João" },
] as const;
export type GospelId = (typeof GOSPELS)[number]["id"];
export type GospelPassage = {
  gospel: GospelId;
  chapter: number;
  from: number;
  to: number;
  relation: "relato" | "relacionado";
  note: string;
};
export type ChronologicalMoment = {
  id: string;
  title: string;
  phase: string;
  place: string;
  intro: string;
  image: string;
  imageAlt: string;
  defaultGospel: GospelId;
  note: string;
  passages: GospelPassage[];
};
export type LoadedGospelPassage = GospelPassage & {
  reference: string;
  href: string;
  verses: { number: number; text: string }[];
};
export type LoadedChronologicalMoment = Omit<ChronologicalMoment, "passages"> & { passages: LoadedGospelPassage[] };

const view = (
  gospel: GospelId, chapter: number, from: number, to: number, note: string,
  relation: GospelPassage["relation"] = "relato",
): GospelPassage => ({ gospel, chapter, from, to, note, relation });

export const CHRONOLOGICAL_MOMENTS: readonly ChronologicalMoment[] = [
  {
    id: "nascimento", title: "Um começo em Belém", phase: "Nascimento", place: "Belém",
    intro: "A história se abre em uma cidade pequena. Mateus e Lucas aproximam o leitor desse começo por caminhos próprios.",
    image: "/journey/nativity.webp", imageAlt: "Recriação artística de Maria e José junto ao menino envolto em panos, em uma construção de pedra de Belém.",
    defaultGospel: "lucas",
    note: "Mateus e Lucas trazem narrativas distintas da infância. Marcos começa na vida pública; o prólogo de João não é um relato de nascimento.",
    passages: [
      view("mateus", 2, 1, 2, "Mateus situa o nascimento em Belém e introduz os visitantes do Oriente."),
      view("lucas", 2, 6, 7, "Lucas se detém no nascimento e nos cuidados com o recém-nascido."),
    ],
  },
  {
    id: "batismo", title: "Às águas do Jordão", phase: "Início da vida pública", place: "Jordão",
    intro: "À margem do rio, o batismo abre uma nova etapa. Observe como cada relato descreve a cena e a voz que a acompanha.",
    image: "/journey/jordan-baptism.webp", imageAlt: "Recriação artística do batismo: dois homens de túnica nas águas rasas do Jordão, entre juncos e oliveiras.",
    defaultGospel: "marcos",
    note: "João apresenta o testemunho de João Batista sobre o Espírito; esse trecho relacionado não narra diretamente o ato do batismo.",
    passages: [
      view("mateus", 3, 16, 17, "Mateus destaca o Espírito e a voz que identifica o Filho."),
      view("marcos", 1, 9, 11, "Marcos narra a chegada de Jesus, o batismo e a voz dos céus."),
      view("lucas", 3, 21, 22, "Lucas menciona Jesus em oração durante a cena."),
      view("joao", 1, 32, 34, "O Batista testemunha o que viu; é uma perspectiva associada.", "relacionado"),
    ],
  },
  {
    id: "cana", title: "A água, o vinho e o sinal", phase: "Início do ministério", place: "Caná da Galileia",
    intro: "Uma festa de casamento se torna, em João, o cenário de um sinal. Acompanhe o gesto antes de seguir suas conexões.",
    image: "/journey/cana-wedding.webp", imageAlt: "Recriação artística das bodas de Caná, com Jesus, jarros de pedra e convidados à mesa.",
    defaultGospel: "joao",
    note: "Este episódio é narrado em João. A posição no percurso acompanha o início do ministério nesse evangelho, sem fixar sua relação exata com todos os episódios dos demais.",
    passages: [view("joao", 2, 7, 9, "João acompanha a água levada ao responsável pela festa; leia o capítulo para completar a cena.")],
  },
  {
    id: "ensino", title: "Palavras que mudam o olhar", phase: "Ministério e ensino", place: "Galileia",
    intro: "O reino aparece nas palavras dirigidas às pessoas. Leia as bem-aventuranças preservando a voz de cada evangelho.",
    image: "/journey/galilee-teaching.webp", imageAlt: "Recriação artística de Jesus sentado ensinando a um grupo junto ao mar da Galileia.",
    defaultGospel: "mateus",
    note: "Mateus apresenta o discurso no monte; Lucas, em uma planície. São ensinamentos relacionados em enquadramentos diferentes, não uma afirmação de que os cenários sejam o mesmo acontecimento.",
    passages: [
      view("mateus", 5, 3, 5, "Mateus reúne estas palavras no Sermão do Monte."),
      view("lucas", 6, 20, 21, "Lucas dirige as bem-aventuranças aos discípulos em outro enquadramento narrativo.", "relacionado"),
    ],
  },
  {
    id: "paes", title: "Há lugar à mesa", phase: "Ministério na Galileia", place: "Galileia",
    intro: "A multidão, os pães e o gesto de repartir atravessam os quatro evangelhos. Compare onde cada um põe o foco.",
    image: "/journey/bread-sharing.webp", imageAlt: "Recriação artística da partilha dos pães e de dois peixes, com pessoas reunidas numa colina da Galileia.",
    defaultGospel: "joao",
    note: "Os textos abaixo pertencem ao episódio dos cinco mil. Cada evangelho mantém sua própria sequência e seus detalhes.",
    passages: [
      view("mateus", 14, 19, 20, "Mateus acompanha a distribuição pelos discípulos e a satisfação de todos."),
      view("marcos", 6, 41, 42, "Marcos descreve os pães, os peixes e o gesto de repartir."),
      view("lucas", 9, 16, 17, "Lucas destaca a bênção, a distribuição e o que sobra."),
      view("joao", 6, 10, 11, "João destaca Jesus dando graças e distribuindo o alimento."),
    ],
  },
  {
    id: "entrada", title: "O caminho chega a Jerusalém", phase: "Chegada a Jerusalém", place: "Jerusalém",
    intro: "A cidade ocupa o horizonte. Ramos, aclamações e expectativas acompanham a entrada narrada nos evangelhos.",
    image: "/journey/jerusalem.webp", imageAlt: "Recriação panorâmica de Jerusalém antiga sobre as colinas.",
    defaultGospel: "mateus",
    note: "Este é um ponto compartilhado do percurso para a paixão. As viagens anteriores e a distribuição dos episódios variam entre os evangelhos.",
    passages: [
      view("mateus", 21, 8, 9, "Mateus registra os gestos e as aclamações da multidão."),
      view("marcos", 11, 8, 10, "Marcos associa a aclamação à expectativa do reino."),
      view("lucas", 19, 37, 38, "Lucas ressalta o louvor dos discípulos na descida do monte."),
      view("joao", 12, 12, 13, "João menciona os ramos de palmeiras e a multidão que sai ao encontro."),
    ],
  },
  {
    id: "refeicao", title: "Perto, à mesma mesa", phase: "Antes da prisão", place: "Jerusalém",
    intro: "A última refeição oferece perspectivas íntimas. Pão e cálice, serviço e despedida aparecem com ênfases diferentes.",
    image: "/journey/jerusalem.webp", imageAlt: "Recriação de Jerusalém antiga à luz suave do fim do dia.",
    defaultGospel: "lucas",
    note: "Os sinóticos situam a refeição no contexto da Páscoa; João organiza de outra forma a relação entre a ceia e a festa. O lava-pés é uma cena relacionada, não outra versão das palavras sobre o pão.",
    passages: [
      view("mateus", 26, 26, 28, "Mateus registra o pão e o cálice durante a refeição."),
      view("marcos", 14, 22, 24, "Marcos preserva as palavras sobre o pão e o cálice."),
      view("lucas", 22, 19, 20, "Lucas associa o gesto à memória e à nova aliança."),
      view("joao", 13, 4, 5, "João apresenta o lava-pés no contexto da ceia.", "relacionado"),
    ],
  },
  {
    id: "cruz", title: "Diante da cruz", phase: "Paixão", place: "Jerusalém",
    intro: "Os relatos chegam à crucificação. O silêncio da leitura permite perceber as palavras que cada evangelho preserva.",
    image: "/journey/jerusalem.webp", imageAlt: "Recriação das colinas e muralhas de Jerusalém antiga.",
    defaultGospel: "joao",
    note: "As últimas palavras e os detalhes narrativos não são idênticos. Leia cada testemunho sem transformá-los em uma fala única.",
    passages: [
      view("mateus", 27, 45, 46, "Mateus registra a escuridão e o clamor de Jesus."),
      view("marcos", 15, 33, 34, "Marcos também preserva o clamor na cruz."),
      view("lucas", 23, 44, 46, "Lucas termina a cena com uma oração ao Pai."),
      view("joao", 19, 28, 30, "João ressalta o cumprimento e as palavras finais de Jesus."),
    ],
  },
  {
    id: "tumulo", title: "O primeiro dia, uma descoberta", phase: "Relatos da ressurreição", place: "Jerusalém",
    intro: "O movimento recomeça junto ao túmulo. Compare quem chega, o que encontra e como a notícia começa a circular.",
    image: "/journey/empty-tomb.webp", imageAlt: "Recriação artística de um túmulo aberto na rocha, com a pedra circular afastada e oliveiras ao amanhecer.",
    defaultGospel: "marcos",
    note: "Os evangelhos diferem nos participantes e nos detalhes da visita. Este percurso aproxima as narrativas sem apagar essas diferenças.",
    passages: [
      view("mateus", 28, 5, 7, "Mateus apresenta a mensagem dirigida às mulheres."),
      view("marcos", 16, 5, 7, "Marcos registra a mensagem no túmulo e a indicação da Galileia."),
      view("lucas", 24, 5, 7, "Lucas destaca o convite a lembrar as palavras de Jesus."),
      view("joao", 20, 1, 2, "João acompanha Maria Madalena e sua notícia aos discípulos."),
    ],
  },
  {
    id: "reencontros", title: "A história continua", phase: "Encontros e envio", place: "Galileia e Jerusalém",
    intro: "Os encontros após a ressurreição abrem caminhos de missão. Cada evangelho conduz seu final de uma maneira.",
    image: "/journey/galilee-dawn.webp", imageAlt: "Recriação da Galileia ao amanhecer, com o lago aberto ao horizonte.",
    defaultGospel: "mateus",
    note: "Os encontros selecionados acontecem em lugares e situações diferentes. Marcos 16:7 anuncia um encontro; não o narra. O final longo de Marcos possui uma história textual própria e não é usado aqui como paralelo direto.",
    passages: [
      view("mateus", 28, 18, 20, "Mateus apresenta o envio na Galileia."),
      view("marcos", 16, 7, 7, "A mensagem anuncia a ida à Galileia; é uma ligação para o tema do reencontro.", "relacionado"),
      view("lucas", 24, 46, 49, "Lucas associa a missão a Jerusalém e à promessa do Pai.", "relacionado"),
      view("joao", 20, 21, 22, "João preserva a saudação de paz e o envio dos discípulos.", "relacionado"),
    ],
  },
];

export const CHRONOLOGY_SOURCES = [
  { id: "synoptics", title: "BYU · The Synoptic Gospels", href: "https://rsc.byu.edu/new-testament-history-culture-society/synoptic-gospels", note: "Estudo universitário sobre perspectivas distintas e propostas de datação dos sinóticos." },
  { id: "yale-mark", title: "Yale · The Gospel of Mark", href: "https://oyc.yale.edu/religious-studies/rlst-152/lecture-6", note: "Discussão literária de Marcos, sua datação aproximada e a história textual do final." },
  { id: "yale-matthew", title: "Yale · The Gospel of Matthew", href: "https://oyc.yale.edu/religious-studies/rlst-152/lecture-7", note: "Dale B. Martin apresenta uma proposta de composição de Mateus e seu contexto." },
  { id: "yale-luke", title: "Yale · The Gospel of Luke", href: "https://oyc.yale.edu/religious-studies/rlst-152/lecture-9", note: "Análise de como Lucas organiza geografia, temas e episódios em sua narrativa." },
  { id: "john", title: "PBS FRONTLINE · The Gospel of John", href: "https://www.pbs.org/wgbh/frontline/shows/religion/story/mmjohn.html", note: "Apresentação acadêmica da formação do evangelho de João e de uma faixa de composição." },
  { id: "birth", title: "Biblical Archaeology Society · When Was Jesus Born?", href: "https://www.biblicalarchaeology.org/daily/people-cultures-in-the-bible/jesus-historical-jesus/when-was-jesus-born-bc-or-ad/", note: "Contexto da datação do nascimento em relação ao reinado de Herodes." },
  { id: "death", title: "BYU Studies · Dating the Death of Jesus Christ", href: "https://byustudies.byu.edu/article/dating-the-death-of-jesus-christ", note: "Discussão das propostas para a crucificação; o autor defende uma das alternativas." },
] as const;

/** These intervals describe composition, never the order or dates of narrated events. */
export const GOSPEL_COMPOSITION = [
  { gospel: "marcos", from: 65, to: 74, source: "synoptics" },
  { gospel: "mateus", from: 80, to: 90, source: "yale-matthew" },
  { gospel: "lucas", from: 80, to: 90, source: "synoptics" },
  { gospel: "joao", from: 90, to: 110, source: "john" },
] as const;
export const EVENT_DATE_CONTEXT = { birthBeforeOrInBce: 4, crucifixionAlternativesCe: [30, 33] } as const;
export const CHRONOLOGY_FALLBACK_IMAGE = "/journey/galilee-dawn.webp";

export function passageReference(passage: GospelPassage): string {
  const name = GOSPELS.find((gospel) => gospel.id === passage.gospel)!.label;
  return `${name} ${passage.chapter}:${passage.from}${passage.to === passage.from ? "" : `–${passage.to}`}`;
}

export async function loadChronologicalReading(
  readVerse: (slug: string, chapter: number, verse: number) => Promise<string>,
): Promise<LoadedChronologicalMoment[]> {
  return Promise.all(CHRONOLOGICAL_MOMENTS.map(async (moment) => ({
    ...moment,
    passages: await Promise.all(moment.passages.map(async (passage) => ({
      ...passage,
      reference: passageReference(passage),
      href: `/${passage.gospel}/${passage.chapter}/${passage.from}`,
      verses: await Promise.all(Array.from({ length: passage.to - passage.from + 1 }, async (_, index) => {
        const number = passage.from + index;
        const text = await readVerse(passage.gospel, passage.chapter, number);
        if (!text) throw new Error(`Missing BLIVRE text: ${passageReference(passage)}, verse ${number}`);
        return { number, text };
      })),
    }))),
  })));
}
