// Public destinations live here so the rail and complete menu cannot drift apart.
import booksJson from "@/data/generated/books.json";
import type { IconName } from "@/components/icons";
import { isLiturgyDate } from "@/lib/liturgy/dates";

export type NavGroup = "Ler e rezar" | "Explorar as conexões" | "Minha jornada" | "Sobre o app";
export type NavItem = { href: string; label: string; icon: IconName; rail?: boolean; group: NavGroup; description: string; nested?: boolean; pages?: readonly string[] };

export const NAV: readonly NavItem[] = [
  { href: "/liturgia", label: "Liturgia diária", icon: "calendar", rail: true, group: "Ler e rezar", description: "As leituras de cada dia" },
  { href: "/ler", label: "Ler a Bíblia", icon: "book", rail: true, group: "Ler e rezar", description: "Livros, capítulos e versículos" },
  { href: "/ler/open-nbv", label: "Open Nova Bíblia Viva", icon: "book", group: "Ler e rezar", description: "Ler nesta edição", nested: true },
  { href: "/interlinear", label: "Interlinear", icon: "text", rail: true, group: "Ler e rezar", description: "Hebraico e grego, palavra por palavra", nested: true },
  { href: "/coracao", label: "No seu coração", icon: "heart", rail: true, group: "Ler e rezar", description: "Encontre palavras para o que sente" },
  { href: "/assistente", label: "Estudar com IA", icon: "both", group: "Ler e rezar", description: "Perguntas com referências bíblicas" },
  { href: "/buscar", label: "Buscar", icon: "search", group: "Explorar as conexões", description: "Passagens, palavras e temas" },
  { href: "/explorar", label: "Constelação", icon: "explore", rail: true, group: "Explorar as conexões", description: "Veja as ligações de um capítulo", nested: true },
  { href: "/arcos", label: "Céu em 3D", icon: "arc", rail: true, group: "Explorar as conexões", description: "Navegue pelos fios da Bíblia" },
  { href: "/arcos/plano", label: "Arcos em 2D", icon: "arc", group: "Explorar as conexões", description: "Outra vista das mesmas ligações" },
  { href: "/caminhos", label: "Mapa de Jesus", icon: "map", rail: true, group: "Explorar as conexões", description: "Siga os lugares e caminhos" },
  { href: "/cronologia", label: "Cronologia", icon: "clock", rail: true, group: "Explorar as conexões", description: "Leia a história em sequência" },
  { href: "/linha-do-tempo", label: "Linha do tempo", icon: "time", group: "Explorar as conexões", description: "Eventos e suas referências", nested: true },
  { href: "/tema", label: "Temas", icon: "explore", group: "Explorar as conexões", description: "Caminhos por assunto", nested: true },
  { href: "/palavra", label: "Palavras", icon: "text", group: "Explorar as conexões", description: "Veja onde cada palavra aparece", nested: true },
  { href: "/conexao/isaias-9/lucas-2", label: "Ler lado a lado", icon: "side", group: "Explorar as conexões", description: "Compare Isaías 9 e Lucas 2" },
  { href: "/jornada", label: "Minha jornada", icon: "check", group: "Minha jornada", description: "Seu ritmo de leitura e descobertas" },
  { href: "/ponte", label: "Ponte", icon: "bridge", rail: true, group: "Minha jornada", description: "Descubra a ligação do dia", nested: true },
  { href: "/trilha", label: "Trilhas", icon: "map", group: "Minha jornada", description: "Percursos guiados de leitura", nested: true },
  { href: "/mesa", label: "Mesa", icon: "both", group: "Minha jornada", description: "Reúna e compare passagens" },
  { href: "/salvos", label: "Salvos", icon: "bookmark", rail: true, group: "Minha jornada", description: "Reencontre suas passagens" },
  { href: "/#sua-jornada", label: "Descobertas", icon: "check", group: "Minha jornada", description: "Aprenda com os desafios" },
  { href: "/", label: "Início", icon: "home", group: "Sobre o app", description: "Voltar à página inicial" },
  { href: "/apoie", label: "Apoie esta missão", icon: "heart", group: "Sobre o app", description: "Mini Jesus, cestas básicas e mais Palavra" },
  { href: "/#como-funciona", label: "Como funciona", icon: "book", group: "Sobre o app", description: "Um guia para começar" },
  { href: "/instalar", label: "Instalar no celular", icon: "device", group: "Sobre o app", description: "Leve a Bíblia à tela inicial" },
  { href: "/qr", label: "QR Code desta página", icon: "share", group: "Sobre o app", description: "Abra esta leitura em outro celular" },
  { href: "/dados", label: "Dados e fontes", icon: "data", group: "Sobre o app", description: "Os números e as bases do projeto" },
  { href: "/sobre", label: "Sobre e créditos", icon: "book", group: "Sobre o app", description: "Conheça as fontes e os direitos" },
];

export const MENU_GROUPS: readonly NavGroup[] = ["Ler e rezar", "Explorar as conexões", "Minha jornada", "Sobre o app"];
export const MOBILE_MENU = NAV;

const GRID = new Map((booksJson as { slug: string; verses: number[] }[]).map((b) => [b.slug, b.verses]));
const NUMBER = /^[1-9]\d{0,2}$/;
function isReadingPath(pathname: string): boolean {
  const [slug, cap, vers, ...more] = pathname.split("/").filter(Boolean);
  const verses = slug ? GRID.get(slug) : undefined;
  if (!verses || more.length > 0) return false;
  if (cap === undefined) return true;
  if (!NUMBER.test(cap) || Number(cap) > verses.length) return false;
  return vers === undefined || (NUMBER.test(vers) && Number(vers) <= verses[Number(cap) - 1]);
}

export function currentItem(pathname: string): string | null {
  if (pathname.startsWith("/dia/") && isLiturgyDate(pathname.slice(5))) return "/liturgia";
  const own = NAV.find((n) => pathname === n.href || n.pages?.includes(pathname) || (n.nested && pathname.startsWith(`${n.href}/`)));
  return own?.href ?? (isReadingPath(pathname) ? "/ler" : null);
}
