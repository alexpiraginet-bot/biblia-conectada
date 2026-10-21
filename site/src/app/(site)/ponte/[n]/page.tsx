import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeviceNote } from "@/components/community/DeviceNote";
import { PontePlayer } from "@/components/community/PontePlayer";
import styles from "@/components/community/community.module.css";
import { Crumbs } from "@/components/Crumbs";
import { Icon } from "@/components/icons";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { ponteBuilt, verseInfo } from "@/lib/community/data";

export const ensureStatic = "navigation";

// Only the bridges up to the build day get a page: no future bridge is published ahead of its date.
export function generateStaticParams() {
  return ponteBuilt.bridges.length ? ponteBuilt.bridges.map((b) => ({ n: String(b.n) })) : [{ n: "1" }];
}

async function resolve(params: Promise<{ n: string }>) {
  const { n } = await params;
  return /^[1-9]\d{0,2}$/.test(n) ? ponteBuilt.bridges.find((b) => b.n === Number(n)) : undefined;
}

export async function generateMetadata({ params }: PageProps<"/ponte/[n]">): Promise<Metadata> {
  const b = await resolve(params);
  if (!b) return { title: NOT_FOUND_TITLE };
  return shareMetadata({
    title: `Ponte nº ${b.n}`,
    description: `De ${verseInfo(b.start).ref} a ${verseInfo(b.target).ref} pelas referências cruzadas, no mínimo ${b.min} saltos.`,
    path: `/ponte/${b.n}`,
  });
}

export default async function PonteArchivePage({ params }: PageProps<"/ponte/[n]">) {
  const b = await resolve(params);
  if (!b) notFound();
  return (
    <main id="conteudo" className="site-page">
      <header className={styles.head}>
        <Crumbs label="Caminho" className={styles.crumbs} items={[{ label: "Ponte", href: "/ponte" }, { label: `nº ${b.n}` }]} />
        <h1 className="bc-display">Ponte nº {b.n}</h1>
      </header>
      <div className={styles.section}>
        <PontePlayer intro={b} builtThrough={ponteBuilt.builtThrough} />
      </div>
      <p className={`${styles.section} ${styles.back}`}>
        <Link href="/ponte" className="bc-button bc-button--ghost">
          <Icon name="chev-l" />
          Ponte de hoje e arquivo
        </Link>
      </p>
      <DeviceNote />
    </main>
  );
}
