import { TranslationReader, translationMetadata } from "@/components/reader/TranslationReader";
import { translationBooks } from "@/lib/translation-reading";

type Props = { params: Promise<{ livro: string; cap: string }> };
export const ensureStatic = "navigation";
export function generateStaticParams() {
  return translationBooks("open-nbv")!.flatMap((book) => book.verses.map((_, i) => ({ livro: book.slug, cap: String(i + 1) })));
}
export async function generateMetadata({ params }: Props) { return translationMetadata(await params); }
export default async function Page({ params }: Props) { return <TranslationReader params={await params} />; }
