"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./translations.module.css";

type NavigationBook = { slug: string; name: string; verses: number[] };

export function TranslationNavigator({ books, slug, chapter = 1 }: { books: NavigationBook[]; slug: string; chapter?: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState(slug);
  const [chosenChapter, setChapter] = useState(String(chapter));
  const [verse, setVerse] = useState("");
  const book = books.find((item) => item.slug === selected) ?? books[0];
  const limit = book.verses[Number(chosenChapter) - 1];
  return <form className={styles.navigator} aria-label="Ir para uma passagem na Open Nova Bíblia Viva" onSubmit={(event) => {
    event.preventDefault();
    const c = Number(chosenChapter), v = verse === "" ? undefined : Number(verse);
    if (!Number.isSafeInteger(c) || c < 1 || c > book.verses.length ||
      (v !== undefined && (!Number.isSafeInteger(v) || v < 1 || v > book.verses[c - 1]))) return;
    router.push(`/ler/open-nbv/${book.slug}/${c}${v === undefined ? "" : `/${v}`}`);
  }}>
    <label className={styles.bookField}>Livro<select value={selected} onChange={(event) => {
      setSelected(event.target.value); setChapter("1"); setVerse("");
    }}>{books.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
    <label>Capítulo<input type="number" inputMode="numeric" required min={1} max={book.verses.length}
      value={chosenChapter} onChange={(event) => { setChapter(event.target.value); setVerse(""); }} /></label>
    <label>Versículo <small>(opcional)</small><input type="number" inputMode="numeric" min={1} max={limit ?? 1}
      value={verse} onChange={(event) => setVerse(event.target.value)} /></label>
    <button className="bc-button bc-button--primary" type="submit">Ir para o texto <span aria-hidden="true">→</span></button>
  </form>;
}
