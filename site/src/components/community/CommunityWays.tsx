// The other community pages, at the end of each one: the trail and the table have no place in the navigation, so they
// are found from here (and from links people share). Server component; the step count is the pipeline's.
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { trail } from "@/lib/community/data";
import styles from "./community.module.css";

type Way = { href: string; icon: IconName; name: string; text: string };

const WAYS: Way[] = [
  { href: "/ponte", icon: "bridge", name: "Ponte", text: "Um par de versículos por dia, o mesmo para todo mundo." },
  {
    href: `/trilha/${trail.slug}`,
    icon: "arc",
    name: `Trilha ${trail.title}`,
    text: `${formatInt(trail.steps.length)} passos, do Antigo Testamento ao nascimento de Jesus.`,
  },
  { href: "/mesa", icon: "device", name: "Mesa da semana", text: "Para o grupo, num aparelho só." },
];

export function CommunityWays({ current }: { current: "/ponte" | "/trilha" | "/mesa" }) {
  const ways = WAYS.filter((w) => !w.href.startsWith(current));
  return (
    <section className={styles.section} aria-labelledby="titulo-caminhos">
      <h2 id="titulo-caminhos" className={`bc-title ${styles.h2}`}>
        Outros caminhos
      </h2>
      <ul className={`bc-list ${styles.list} ${styles.ways}`}>
        {ways.map((w) => (
          <li key={w.href}>
            <Link href={w.href}>
              <Icon name={w.icon} />
              <span className={styles.name}>
                <span className="bc-list__name">{w.name}</span>
                <span className={styles.desc}>{w.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
