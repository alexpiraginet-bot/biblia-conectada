import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Crumbs";
import { PlanTracker } from "@/components/planos/PlanTracker";
import styles from "@/components/planos/planos.module.css";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { planById, planFigures, planPortions, PLANS, portionLabel } from "@/lib/planos/model";
import type { ReadingCatalog } from "@/lib/reading-progress/model";
import { translationBooks } from "@/lib/translation-reading";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return PLANS.map((p) => ({ plano: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/planos/[plano]">): Promise<Metadata> {
  const plan = planById((await params).plano);
  if (!plan) return { title: NOT_FOUND_TITLE };
  const figures = planFigures(planPortions(plan, books));
  return shareMetadata({
    title: `${plan.title} (plano de leitura)`,
    description: `${plan.summary} ${formatInt(figures.days)} porções diárias, ${formatInt(figures.chapters)} capítulos, cerca de ${formatInt(figures.versesPerDay.median)} versículos por dia.`,
    path: `/planos/${plan.id}`,
  });
}

// The portions are computed here and handed to the tracker, which is rendered to HTML with the page: the list works
// as plain links without JavaScript, and on the device it shows the next portion and the days read.
export default async function PlanPage({ params }: PageProps<"/planos/[plano]">) {
  const plan = planById((await params).plano);
  if (!plan) notFound();
  const portions = planPortions(plan, books);
  const figures = planFigures(portions);
  const slugs = new Set(portions.flatMap((p) => p.chapters.map((c) => c.book)));
  // only the plan's books, each edition with its own verse counts: what "chapter read" is measured against
  const compact = (id: "blivre" | "open-nbv") =>
    translationBooks(id)!
      .filter((b) => slugs.has(b.slug))
      .map(({ slug, name, verses }) => ({ slug, name, verses }));
  const catalog: ReadingCatalog = { blivre: compact("blivre"), "open-nbv": compact("open-nbv") };

  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <Crumbs label="Trilha" items={[{ label: "Planos de leitura", href: "/planos" }, { label: plan.title }]} />
      <h1 className="bc-display">{plan.title}</h1>
      <p className="bc-lede">{plan.summary}</p>
      <p className={`bc-meta ${styles.figures}`} data-plan-figures="">
        {formatInt(figures.days)} porções · {formatInt(figures.chapters)} capítulos de {formatInt(figures.books)} {figures.books === 1 ? "livro" : "livros"} ·{" "}
        {formatInt(figures.verses)} versículos · de {formatInt(figures.versesPerDay.min)} a {formatInt(figures.versesPerDay.max)} versículos por dia, com mediana de{" "}
        {formatInt(figures.versesPerDay.median)}
      </p>
      <PlanTracker
        plan={{ id: plan.id, title: plan.title, days: plan.days }}
        portions={portions.map((p) => ({ day: p.day, verses: p.verses, label: portionLabel(p, books), chapters: p.chapters.map((c) => [c.book, c.chapter] as [string, number]) }))}
        catalog={catalog}
        names={Object.fromEntries(books.filter((b) => slugs.has(b.slug)).map((b) => [b.slug, b.name]))}
      />
      <p className={styles.how}>
        As porções foram calculadas a partir dos versículos de cada capítulo na Bíblia Livre; a divisão é a mesma para as duas edições. O plano não
        guarda progresso próprio: ele lê as suas marcações de leitura, que ficam só neste aparelho e têm backup em{" "}
        <Link href="/jornada#leitura">Minha jornada</Link>.
      </p>
    </main>
  );
}
