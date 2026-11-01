import styles from "./measurement-choice.module.css";
import Link from "next/link";

/** Visible only to visitors who have not made a measurement choice; controlled by the deferred script. */
export function MeasurementChoice() {
  return <aside hidden data-audience-prompt="" className={styles.prompt} aria-label="Preferências de medição">
    <p>Podemos melhorar sua experiência?</p>
    <span>Permita estatísticas do Google e, se quiser, medição de campanhas. Sem anúncios personalizados. A leitura continua livre.</span>
    <div><button type="button" data-audience-preference="basic">Só contagem básica</button><button type="button" data-audience-preference="google">Permitir Analytics</button><button type="button" data-audience-preference="campaigns">Analytics e campanhas</button></div>
    <Link href="/sobre#audiencia" prefetch={false}>Privacidade e preferências</Link>
  </aside>;
}
