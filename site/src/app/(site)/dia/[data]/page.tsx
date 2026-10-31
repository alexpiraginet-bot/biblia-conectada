import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { LiturgyPageContent } from "@/components/liturgy/LiturgyPageContent";
import { isLiturgyDate, MIN_LITURGY_DATE } from "@/lib/liturgy/dates";
import { shareMetadata } from "@/lib/share-metadata";
import { resolveShareCard } from "@/lib/share-card";

type Props = { params: Promise<{ data: string }> };
// A real, deterministic sample lets Cache Components validate the shared shell.
// Other dates remain request-time routes; this sample never defines "today".
export function generateStaticParams() { return [{ data: MIN_LITURGY_DATE }]; }
export async function generateMetadata({ params }: Props) {
  const { data } = await params;
  if (!isLiturgyDate(data)) notFound();
  await connection();
  const card = await resolveShareCard(`/dia/${data}`);
  if (!card) notFound();
  return shareMetadata({ title: `Liturgia · ${card.title}`, description: `${card.readings?.map((reading) => reading.reference).join(" · ") ?? ""} ${card.description}`.trim(), path: card.path });
}
async function SelectedDay({ params }: Props) {
  await connection();
  const { data } = await params;
  if (!isLiturgyDate(data)) notFound();
  return <LiturgyPageContent searchParams={Promise.resolve({ date: data })} />;
}
export default function DayPage(props: Props) {
  return <Suspense fallback={<main id="conteudo" className="site-page"><h1>Liturgia diária</h1><p role="status" data-daily-link-loading>Abrindo as leituras deste dia…</p><noscript><style>{"[data-daily-link-loading] { display: none; }"}</style><p>A consulta deste dia precisa de JavaScript. Consulte a mesma data na <a href="https://liturgiadiaria.edicoescnbb.com.br/">liturgia oficial da CNBB</a> ou <Link href="/ler" prefetch={false}>continue lendo a Bíblia</Link>.</p></noscript></main>}><SelectedDay {...props} /></Suspense>;
}
