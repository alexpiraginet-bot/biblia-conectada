import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { FollowingMark } from "@/components/planos/FollowedPlans";
import styles from "@/components/planos/planos.module.css";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import { planFigures, planPortions, PLANS, portionLabel } from "@/lib/planos/model";

export const ensureStatic = "navigation";

export const metadata: Metadata = shareMetadata({
  title: "Planos de leitura",
  description: "A Bíblia em porções diárias, calculadas a partir dos versículos de cada capítulo. O progresso fica só no seu aparelho.",
  path: "/planos",
});

// Every number on this page is counted from the portions (lib/planos/model.ts), which are cut from the canon grid.
export default function PlansPage() {
  const plans = PLANS.map((plan) => {
    const portions = planPortions(plan, books);
    return { plan, figures: planFigures(portions), first: portionLabel(portions[0], books) };
  });
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <h1 className="bc-display">Planos de leitura</h1>
      <p className="bc-lede">
        A Bíblia em porções diárias, do tamanho mais parecido que os capítulos permitem. O plano avança com o que você marca como lido, em
        qualquer página de leitura. Tudo fica só neste aparelho.
      </p>
      <ul className={`bc-list ${styles.plans}`} data-plans="">
        {plans.map(({ plan, figures, first }) => (
          <li key={plan.id}>
            <Link href={`/planos/${plan.id}`} data-plan={plan.id}>
              <span className={styles.planName}>
                <span>
                  <span className="bc-list__name">{plan.title}</span>
                  <FollowingMark id={plan.id} />
                </span>
                <span className={styles.planSays}>
                  {plan.summary} Começa em {first}.
                </span>
              </span>
              <span className={styles.planCount}>
                {formatInt(figures.days)} dias · {formatInt(figures.chapters)} capítulos · cerca de {formatInt(figures.versesPerDay.median)} versículos por dia
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.how}>
        As porções saem de uma conta só: os capítulos do plano, na ordem, divididos pelo número de dias de modo que cada dia tenha perto da mesma
        quantidade de versículos. Capítulo nenhum é partido. Para ler os evangelhos pela ordem dos acontecimentos, há a{" "}
        <Link href="/cronologia">Cronologia</Link>; para as leituras de cada dia, a <Link href="/liturgia">Liturgia diária</Link>.
      </p>
    </main>
  );
}
