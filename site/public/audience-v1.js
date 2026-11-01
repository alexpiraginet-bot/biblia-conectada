/* Aggregate measurement only. No query, verse, question, cookie or visitor identifier is sent. */
(() => {
  'use strict';
  const config = window.bcAudience || {};
  if (!config.enabled || navigator.webdriver) return;
  const blocked = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  let preference = ''; try { preference = localStorage.getItem('bc-audience-preference') || ''; } catch {}
  let path = '', pageId = '', area = '', visibleSince = 0, activeMs = 0, timer = 0, viewAccepted = false, engaged = false;
  let googleReady = false;
  const googleSent = new Set();
  const categories = { '/': 'home', ler: 'reading', interlinear: 'reading', liturgia: 'liturgy', dia: 'liturgy', arcos: 'connections', explorar: 'connections', conexao: 'connections', encontro: 'connections', ponte: 'connections', trilha: 'connections', cronologia: 'timeline', 'linha-do-tempo': 'timeline', caminhos: 'map', coracao: 'heart', assistente: 'heart', buscar: 'search', palavra: 'search', tema: 'search', jornada: 'journey', salvos: 'journey', sobre: 'other', dados: 'other' };
  const labels = { home: 'Início', reading: 'Leitura', liturgy: 'Liturgia', connections: 'Conexões', timeline: 'Cronologia', map: 'Mapas', heart: 'Estudo', search: 'Busca', journey: 'Jornada', other: 'Outras seções' };
  function classify(value) {
    if (/^\/(admin|api|instalar|qr|go|auth|login|logout|_next)(\/|$)/.test(value)) return '';
    const first = value.split('/')[1];
    return categories[value] || categories[first] || (Array.isArray(config.bookSlugs) && config.bookSlugs.includes(first) && /^\/[a-z0-9-]+(?:\/\d+(?:\/\d+)?)?\/?$/.test(value) ? 'reading' : '');
  }
  let channel = 'direct', campaign = 'none';
  try {
    const query = new URL(location.href).searchParams;
    const source = (query.get('utm_source') || '').toLowerCase(), medium = (query.get('utm_medium') || '').toLowerCase();
    const ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
    if ((source === 'google' && /^(cpc|ppc|paidsearch)$/.test(medium)) || query.has('gclid')) channel = 'google_ads';
    else if (source === 'google' || /(^|\.)google\.[a-z.]+$/.test(ref)) channel = 'google';
    else if (source === 'instagram' || /(^|\.)instagram\.com$/.test(ref)) channel = 'instagram';
    else if (source === 'whatsapp') channel = 'whatsapp';
    else if (ref && ref !== location.hostname) channel = 'other';
    const named = query.get('utm_campaign');
    if (['bible_search', 'liturgy_search', 'social'].includes(named)) campaign = named;
  } catch {}
  function google(event) {
    const key = pageId + ':' + event;
    if (blocked || !area || !pageId || preference !== 'google' || !/^G-[A-Z0-9]{6,20}$/.test(config.measurementId || '')) return;
    window.dataLayer = window.dataLayer || [];
    const tag = function () { window.dataLayer.push(arguments); };
    if (!googleReady) {
      googleReady = true;
      window['ga-disable-' + config.measurementId] = false;
      tag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      tag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      tag('js', new Date());
      if (!document.getElementById('bc-google-tag')) { const script = document.createElement('script'); script.id = 'bc-google-tag'; script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + config.measurementId; document.head.append(script); }
    }
    if (googleSent.has(key)) return;
    const context = { page_location: location.origin + '/area/' + area, page_title: labels[area], page_referrer: '', ignore_referrer: true, content_group: area, traffic_channel: channel, campaign_name: campaign };
    tag('config', config.measurementId, { ...context, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    tag('event', event === 'view' ? 'page_view' : 'visible_30_seconds', context);
    googleSent.add(key);
  }
  async function send(event, id, currentArea) {
    if (blocked || preference === 'off' || !currentArea) return false;
    try {
      const response = await fetch('/api/audience', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, event, area: currentArea, channel, campaign }), keepalive: true });
      const body = await response.json(); return response.ok && (body.accepted || body.duplicate);
    } catch { return false; }
  }
  function schedule() {
    clearTimeout(timer);
    if (blocked || engaged || !area || preference === 'off' || document.hidden) return;
    visibleSince = performance.now();
    timer = setTimeout(async () => {
      activeMs += performance.now() - visibleSince; visibleSince = 0;
      if (activeMs < 30000) { schedule(); return; }
      if (!viewAccepted) return;
      const id = pageId, selectedArea = area;
      engaged = true; await send('engaged', id, selectedArea);
      if (id === pageId) google('engaged');
    }, Math.max(1, 30100 - activeMs));
  }
  function page() {
    const next = location.pathname; if (next === path) return;
    path = next; area = classify(next); clearTimeout(timer); activeMs = 0; engaged = false; viewAccepted = false; visibleSince = 0; pageId = ''; googleSent.clear();
    if (blocked || !area || preference === 'off') return;
    pageId = Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
    const id = pageId, selectedArea = area;
    void send('view', id, selectedArea).then(ok => { if (pageId === id) { viewAccepted = ok; if (ok && activeMs >= 30000) schedule(); } });
    google('view'); schedule();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (visibleSince) activeMs += performance.now() - visibleSince; visibleSince = 0; clearTimeout(timer); }
    else schedule();
  });
  window.addEventListener('bc:navigation', page);
  function applyPreference(next, persist) {
    if (!['basic', 'google', 'off'].includes(next)) return;
    const previous = preference; preference = next;
    if (persist) try { localStorage.setItem('bc-audience-preference', preference); } catch {}
    if (preference !== 'google' && config.measurementId) {
      window['ga-disable-' + config.measurementId] = true;
      (function () { (window.dataLayer || []).push(arguments); })('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      for (const cookie of document.cookie.split(';')) { const name = cookie.split('=')[0].trim(); if (/^_ga(?:_|$)/.test(name)) for (const domain of ['', ';domain=' + location.hostname, ';domain=.' + location.hostname.replace(/^www\./, '')]) document.cookie = name + '=;max-age=0;path=/' + domain; }
      googleReady = false;
    }
    const status = document.querySelector('[data-audience-status]'); if (status) status.textContent = blocked ? 'A preferência de privacidade do navegador está ativa. Nenhuma medição é enviada.' : preference === 'off' ? 'Medição desativada neste navegador.' : preference === 'google' ? (config.measurementId ? 'Google Analytics permitido. Sem personalização de anúncios.' : 'Preferência salva. O Google Analytics ainda não foi conectado.') : 'Somente contagem agregada própria, sem identificador de visitante.';
    if (preference === 'off') { clearTimeout(timer); visibleSince = 0; activeMs = 0; }
    else if (previous === 'off') { path = ''; page(); }
    else { if (preference === 'google') google('view'); if (!visibleSince) schedule(); }
  }
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('[data-audience-preference]') : null;
    if (button) applyPreference(button.getAttribute('data-audience-preference'), true);
  });
  window.addEventListener('storage', event => {
    if (event.key !== 'bc-audience-preference' && event.key !== null) return;
    try { if (event.storageArea !== localStorage) return; } catch { return; }
    applyPreference(event.newValue || 'basic', false);
  });
  page();
})();
