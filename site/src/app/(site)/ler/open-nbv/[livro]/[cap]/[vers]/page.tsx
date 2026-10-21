import { TranslationReader, translationMetadata } from "@/components/reader/TranslationReader";

type Props = { params: Promise<{ livro: string; cap: string; vers: string }> };
export const ensureStatic = "navigation";
export function generateStaticParams() {
  return [{ livro: "joao", cap: "3", vers: "16" }, { livro: "3-joao", cap: "1", vers: "15" }];
}
export async function generateMetadata({ params }: Props) { return translationMetadata(await params); }
export default async function Page({ params }: Props) { return <TranslationReader params={await params} />; }
