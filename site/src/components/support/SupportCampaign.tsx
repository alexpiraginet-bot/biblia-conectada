"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CAMPAIGN, money, parseAmount, SUPPORT_CATEGORIES } from "@/lib/support/campaign";
import { campaignPix } from "@/lib/support/pix";
import type { PublicSupport } from "@/lib/support/ledger";
import { SITE_URL } from "@/lib/site-identity";
import styles from "./support.module.css";

export function SupportCampaign() {
  const [data, setData] = useState<PublicSupport | null>(null), [error, setError] = useState("");
  const [amount, setAmount] = useState("20"), [selected, setSelected] = useState<number | null>(null), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [shareNotice, setShareNotice] = useState("");
  const pixHeading = useRef<HTMLHeadingElement>(null);
  const pixDetails = useRef<HTMLDetailsElement>(null), pixCode = useRef<HTMLTextAreaElement>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    try { const response = await fetch("/api/support", { cache: "no-store", signal }); if (!response.ok) throw new Error(); const body: PublicSupport = await response.json(); if (!signal?.aborted) { setData(body); setError(""); } }
    catch { if (!signal?.aborted) setError("Não foi possível atualizar o andamento agora. Tente novamente em instantes."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => void refresh(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [refresh]);
  useEffect(() => { if (selected !== null) pixHeading.current?.focus({ preventScroll: false }); }, [selected]);
  const cents = parseAmount(amount), progress = data ? Math.min(100, data.raisedCents / data.goalCents * 100) : 0;
  function choose(value: string) { setAmount(value); setSelected(null); setNotice(""); }
  function generate(event: FormEvent) { event.preventDefault(); if (cents === null) { setNotice("Digite um valor em reais, como 12,50, sem separador de milhar."); return; } setNotice(""); setSelected(cents); }
  async function copyPix() { if (selected === null) return; try { await navigator.clipboard.writeText(campaignPix(selected)); setNotice("Pix copiado. Abra seu banco, escolha Pix Copia e Cola e confira o valor e o recebedor."); } catch { if (pixDetails.current) pixDetails.current.open = true; pixCode.current?.focus(); pixCode.current?.select(); setNotice("O código está selecionado. Use a opção Copiar do seu aparelho."); } }
  async function share() {
    const url = SITE_URL + "/apoie";
    try { if (navigator.share) await navigator.share({ title: "A Palavra vira cuidado · Bíblia Conectada", text: "Ajude a Bíblia Conectada, a produção dos mini Jesus e a entrega de cestas básicas. Acompanhe a campanha.", url }); else { await navigator.clipboard.writeText(url); setShareNotice("Link da campanha copiado."); } }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setShareNotice(`Compartilhe: ${url}`); }
  }
  return <>
    <section className={styles.intro} aria-labelledby="support-title">
      <p className={styles.eyebrow}>JUNTOS, A PALAVRA CHEGA MAIS LONGE</p>
      <h1 id="support-title">A Palavra<br /><em>vira cuidado.</em></h1>
      <p className={styles.lead}>Um gesto seu ajuda a Bíblia Conectada a crescer, leva mini Jesus a novos lares e alimento à mesa de quem precisa.</p>
      <a className={styles.textLink} href="#destino">Conheça a nossa ação <span aria-hidden="true">↓</span></a>
    </section>
    <div className={styles.opening}>
      <section className={styles.contribute} aria-labelledby="contribution-title">
        <p className={styles.eyebrow}>UMA CAMPANHA. MUITAS FORMAS DE CUIDAR.</p>
        <h2 id="contribution-title">Faça parte.</h2><p>Escolha o valor que cabe no seu momento. A contribuição é única, pelo Pix.</p>
        <p className={styles.giftNote}>Qualquer valor dá direito a um mini Jesus da Bentô 3D Labs. Um presente por apoiador. Retirada gratuita ou envio com frete pago por você, combinado à parte. <a href="#presente">Veja como receber ↓</a></p>
        <form onSubmit={generate}>
          <fieldset className={styles.presets}><legend>Valores sugeridos</legend>{CAMPAIGN.presets.map(value => <button type="button" key={value} aria-pressed={cents === value} onClick={() => choose(String(value / 100))}>{money(value).replace(",00", "")}</button>)}</fieldset>
          <label htmlFor="support-amount">Ou escolha outro valor (R$)</label><input id="support-amount" inputMode="decimal" value={amount} maxLength={12} onChange={event => choose(event.target.value)} aria-describedby="amount-help" required autoComplete="off" />
          <p id="amount-help" className={styles.small}>Use vírgula para os centavos. Você não precisa criar uma conta.</p>
          <button className={styles.primary} type="submit">{cents !== null ? `Gerar Pix de ${money(cents)}` : "Gerar meu Pix"}<span aria-hidden="true">↗</span></button>
        </form>
        {selected !== null && <section className={styles.pix} aria-labelledby="pix-title"><h3 id="pix-title" ref={pixHeading} tabIndex={-1}>Seu Pix de {money(selected)}</h3>
          <Image className={styles.qr} src={`/api/support/pix?cents=${selected}`} alt={`QR Code Pix de ${money(selected)} para ${CAMPAIGN.receiver}`} width={256} height={256} unoptimized />
          <p>Recebedor: <strong>{CAMPAIGN.receiver}</strong><br />Conta informada: {CAMPAIGN.provider}</p>
          <button className={styles.primary} type="button" onClick={copyPix}>Copiar código Pix</button>
          <details ref={pixDetails}><summary>Ver o código para copiar</summary><textarea ref={pixCode} aria-label="Código Pix Copia e Cola" readOnly rows={4} value={campaignPix(selected)} onFocus={event => event.target.select()} /></details>
          <p className={styles.small}>Cole no aplicativo do seu banco e confira o recebedor antes de confirmar. O pagamento é concluído no banco. A arrecadação será atualizada após nossa conferência no extrato.</p>
          <a className={styles.textLink} href={`mailto:${CAMPAIGN.contact}?subject=Meu%20mini%20Jesus%20%C2%B7%20B%C3%ADblia%20Conectada&body=Ol%C3%A1!%20Contribu%C3%AD%20com%20a%20campanha%20e%20quero%20combinar%20a%20entrega%20do%20mini%20Jesus.%0AValor%3A%20${encodeURIComponent(money(selected))}%0AData%20do%20Pix%3A%20%0APrefiro%20retirada%20ou%20envio%3A%20`}>Já contribuí · combinar meu presente ↗</a>
        </section>}
        <p className={styles.status} role="status" aria-live="polite">{notice}</p>
      </section>
      <aside className={styles.progressPanel} aria-labelledby="progress-title">
        <div className={styles.panelTop}><h2 id="progress-title">Cada gesto conta.</h2><span className={styles.badge}>Meta inicial</span></div>
        <p className={styles.total}>{data ? money(data.raisedCents) : "—"}<span>confirmados de {money(CAMPAIGN.goalCents)}</span></p>
        <progress aria-label="Arrecadação confirmada em relação à meta" max={100} value={progress} />
        <p>{data ? `${data.contributions} ${data.contributions === 1 ? "contribuição confirmada" : "contribuições confirmadas"}` : error ? "Consulta temporariamente indisponível" : "Consultando as contribuições…"}</p>
        {data?.environment === "preview" && <p className={styles.notice}>Prévia de teste. Estes registros não são a arrecadação pública.</p>}
        {error && <p className={styles.notice} role="status">{error}</p>}
        <p className={styles.small}>Entram no total apenas valores conferidos pela organização no PicPay. Gerar ou copiar um Pix não conta como pagamento. Uma atualização pode levar até 30 segundos para aparecer aqui.</p>
        <div className={styles.progressFoot}><button type="button" className={styles.quiet} onClick={() => void refresh()} disabled={busy}>{busy ? "Consultando…" : "Atualizar andamento"}</button><a href="#prestacao">Ver prestação de contas ↓</a></div>
        {data && <p className={styles.small}>Consulta em {new Date(data.checkedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Brasília</p>}
      </aside>
    </div>
    <section className={styles.purpose} id="destino" aria-labelledby="purpose-title"><p className={styles.eyebrow}>ONDE SEU APOIO CHEGA</p><h2 id="purpose-title">Da leitura ao gesto.<br /><em>Do gesto à vida.</em></h2>
      <div className={styles.pillars}>
        <article><span aria-hidden="true">01</span><h3>Mais Palavra.</h3><p>Manter e desenvolver a Bíblia Conectada, aprimorar a leitura e suas conexões e apresentar o projeto a mais pessoas.</p></article>
        <article><span aria-hidden="true">02</span><h3>Fé que se leva.</h3><p>Produzir mini Jesus da Bentô 3D Labs e presentear quem contribui, com qualquer valor.</p><a className={styles.textLink} href="#presente">Como receber seu mini Jesus ↓</a></article>
        <article><span aria-hidden="true">03</span><h3>Cuidado à mesa.</h3><p>Comprar e entregar cestas básicas a pessoas e famílias em situação de necessidade.</p></article>
      </div>
      <blockquote className={styles.history}><p>Há {CAMPAIGN.historyYears} anos, realizamos ações de entrega de cestas básicas. Queremos ampliar esse cuidado com você.</p><footer>Alex Piragine · organização da campanha</footer></blockquote>
      <p className={styles.small}>Os recursos apoiam essas três frentes, conforme as necessidades da ação. O uso será registrado abaixo. A história anterior da iniciativa não integra os totais desta campanha.</p>
    </section>
    <section id="presente" className={styles.gift} aria-labelledby="gift-title"><p className={styles.eyebrow}>UM AGRADECIMENTO PARA LEVAR COM VOCÊ</p><h2 id="gift-title">Seu mini Jesus.</h2><p>Quem contribui com qualquer valor pode receber um mini Jesus produzido pela Bentô 3D Labs.</p><ol><li>Contribua pelo Pix e guarde o comprovante.</li><li>Entre em contato com a organização para conferirmos a contribuição e combinarmos a produção e a entrega.</li><li>Escolha retirada gratuita ou envio com frete pago por você. O local, o prazo de produção e o custo do frete serão combinados antes do envio.</li></ol><p className={styles.small}>Um presente por apoiador nesta campanha. Contribuições adicionais ajudam a ação a crescer. O frete é separado da contribuição; não envie um valor de frete sem combinar antes. A confirmação e a entrega são organizadas pela equipe, pelo contato abaixo.</p><a className={styles.textLink} href={`mailto:${CAMPAIGN.contact}?subject=Meu%20mini%20Jesus%20%C2%B7%20B%C3%ADblia%20Conectada`}>Combinar meu mini Jesus ↗</a></section>
    <section id="prestacao" className={styles.accountability} aria-labelledby="accountability-title"><div className={styles.panelTop}><div><p className={styles.eyebrow}>TRANSPARÊNCIA, PASSO A PASSO</p><h2 id="accountability-title">Acompanhe o que acontece.</h2></div><button type="button" className={styles.quiet} disabled={busy} onClick={() => void refresh()}>Atualizar</button></div>
      <div className={styles.impact}>{[["Mini Jesus produzidos", data?.miniProduced], ["Mini Jesus entregues", data?.miniDelivered], ["Cestas básicas entregues", data?.basketsDelivered]].map(([label, value]) => <article key={label}><strong>{value ?? "—"}</strong><span>{label}</span></article>)}</div>
      <div className={styles.accounts}><h3>Recursos da campanha</h3><dl>{Object.entries(SUPPORT_CATEGORIES).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{data ? money(data.expenses[key as keyof typeof SUPPORT_CATEGORIES]) : "—"}</dd></div>)}<div><dt>Total utilizado</dt><dd>{data ? money(data.spentCents) : "—"}</dd></div><div><dt>Saldo registrado</dt><dd>{data ? money(data.availableCents) : "—"}</dd></div></dl><p className={styles.small}>Prestação de contas da organização, baseada em lançamentos conferidos. Não é um extrato bancário em tempo real. Contribuições não dão pontos na Jornada.</p></div>
      <div className={styles.timeline}>{data?.updates.length ? data.updates.map(update => <article key={update.id}><time dateTime={update.date}>{update.date.split("-").reverse().join("/")}</time><h3>{update.title}</h3><p>{update.text}</p>{update.quantity !== undefined && <p className={styles.small}>Quantidade registrada: {update.quantity}</p>}{update.amountCents !== undefined && <p className={styles.small}>{money(update.amountCents)} · {update.category && SUPPORT_CATEGORIES[update.category]}</p>}</article>) : <p className={styles.empty}>{data ? "A campanha está começando. As primeiras compras, produções e entregas aparecerão aqui conforme forem registradas." : "As atualizações aparecerão após a consulta ao andamento."}</p>}</div>
    </section>
    <section className={styles.social}><p className={styles.eyebrow}>CONHEÇA QUEM ESTÁ POR AQUI</p><h2>O trabalho tem história.<br /><em>E gente de verdade.</em></h2><p>Acompanhe nossas ações, a produção da Bentô 3D Labs e o dia a dia dos nossos projetos.</p><div>{CAMPAIGN.social.map(profile => <a key={profile.handle} href={`https://www.instagram.com/${profile.handle}/`} target="_blank" rel="noopener noreferrer"><strong>@{profile.handle} <span aria-hidden="true">↗</span></strong><span>{profile.label}</span></a>)}</div></section>
    <section className={styles.share}><p className={styles.eyebrow}>COMPARTILHAR TAMBÉM É APOIAR</p><h2>Leve esse convite<br /><em>a mais alguém.</em></h2><p>Uma mensagem sua pode fazer essa corrente de cuidado crescer.</p><div className={styles.shareActions}><button type="button" className={styles.primary} onClick={share}>Compartilhar campanha ↗</button><a href="/og?path=%2Fapoie&format=story&download=1" download="biblia-conectada-apoie-story.png">Baixar imagem para stories</a><a href="/og?path=%2Fapoie&format=post&download=1" download="biblia-conectada-apoie-post.png">Baixar imagem para post</a></div><p role="status">{shareNotice}</p><p className={styles.small}>Organização e recebimento: Alex Piragine Teixeira · <a href={`mailto:${CAMPAIGN.contact}`}>{CAMPAIGN.contact}</a></p></section>
  </>;
}
