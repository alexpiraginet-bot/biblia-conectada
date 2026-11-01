"use client";
import { useEffect, useState } from "react";
import { campaignStatus, type MarketingReport, type SourceResult } from "@/lib/audience/marketing-core";
import styles from "./audience.module.css";

const integer = (value: number) => value.toLocaleString("pt-BR");
const date = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const shortDate = (value: string) => value.split("-").reverse().join("/");
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function status(source?: SourceResult<unknown>) {
  return !source ? "Consultando…" : source.state === "unconfigured" ? "Conectar ao painel" : source.state === "empty" ? "Aguardando dados" : "Indisponível agora";
}
function SourceNote({ source }: { source?: SourceResult<unknown> }) {
  return <small>{source?.queriedAt ? <>{source.stale ? "Última consulta disponível: " : "Consultado em "}{date(source.queriedAt)}.</> : source?.state === "unconfigured" ? "Falta autorizar a consulta automática no servidor." : "Nenhum número foi substituído por zero."}</small>;
}
export function MarketingMetrics({ days, refreshKey, onSessionExpired }: { days: number; refreshKey: string; onSessionExpired: () => void }) {
  const [report, setReport] = useState<MarketingReport | null>(null), [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/admin/marketing?days=${days}`, { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 401) { onSessionExpired(); return; }
        if (!response.ok) throw new Error("unavailable");
        const body = await response.json(); if (controller.signal.aborted) return;
        setReport(body.report); setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
    })();
    return () => controller.abort();
  }, [days, refreshKey, onSessionExpired]);
  const ga = report?.analytics, campaign = report?.campaign, ads = report?.ads;
  return <section className={styles.marketing} aria-label="Números oficiais do Google">
    <div className={styles.panelHeading}><h2>Google, com a fonte à vista</h2><span>Últimos {days} dias · consulta pelo Windsor</span></div>
    {error && <p className={styles.notice} role="status">Não foi possível atualizar o Google. {report ? "Os valores abaixo são da consulta indicada." : "A contagem própria acima continua independente."}</p>}
    <div className={`${styles.kpis} ${styles.paired}`}>
      <article><span>Usuários ativos · GA4</span><strong>{ga?.data ? integer(ga.data.activeUsers) : error && !report ? "Indisponível agora" : status(ga)}</strong><small>Usuários distintos ativos no período, conforme o Google. Cobertura depende de consentimento, cookies e bloqueadores.</small><SourceNote source={ga} /></article>
      <article><span>Campanha · Google Ads</span><strong>{campaign?.data && report ? campaignStatus(campaign.data, report.to) : error && !report ? "Indisponível agora" : status(campaign)}</strong><small>{campaign?.data ? <>{campaign.data.name}<br />{shortDate(campaign.data.startDate)} a {shortDate(campaign.data.endDate)}</> : "Liturgia diária e Evangelho do dia. Status consultado na conta de anúncios."}</small><SourceNote source={campaign} /></article>
    </div>
    <div className={styles.panel}>
      <dl className={styles.googleFacts}>
        <div><dt>Sessões · GA4</dt><dd>{ga?.data ? integer(ga.data.sessions) : "—"}</dd></div>
        <div><dt>Visualizações · GA4</dt><dd>{ga?.data ? integer(ga.data.pageViews) : "—"}</dd></div>
        <div><dt>Cliques no anúncio</dt><dd>{ads?.data ? integer(ads.data.clicks) : "—"}</dd></div>
        <div><dt>Impressões do anúncio</dt><dd>{ads?.data ? integer(ads.data.impressions) : "—"}</dd></div>
        <div><dt>Investimento informado</dt><dd>{ads?.data ? money(ads.data.spend) : "—"}</dd></div>
        <div><dt>Conversões do Google</dt><dd>{ads?.data ? integer(ads.data.conversions) : "—"}</dd></div>
      </dl>
      <p className={styles.caption}>Google Analytics, Google Ads e a contagem própria usam critérios diferentes; os totais não são somados. A conversão configurada é uma visita, sem valor de receita. O Google e o Windsor têm seus próprios prazos de processamento; estes dados não são em tempo real.</p>
      <p className={styles.caption}><SourceNote source={ads} /></p>
      <div className={styles.googleLinks}><a href="https://analytics.google.com/analytics/web/#/p561809611/reports/intelligenthome" target="_blank" rel="noopener noreferrer">Conferir no Analytics ↗</a><a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer">Conferir no Google Ads ↗</a><a href={`/api/admin/marketing?days=${days}`} download="biblia-conectada-google.json">Baixar consulta Google</a></div>
    </div>
  </section>;
}
