// app.js — router, state, fetch helpers

export const $  = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const fmt = {
  int:   n => (n ?? 0).toLocaleString(),
  compact: n => COMPACT.format(n ?? 0),
  usd:   n => n == null ? '—' : '$' + Number(n).toFixed(2),
  usd4:  n => n == null ? '—' : '$' + Number(n).toFixed(4),
  pct:   n => n == null ? '—' : (n * 100).toFixed(0) + '%',
  short: (s, n=80) => s == null ? '' : (s.length > n ? s.slice(0, n - 1) + '…' : s),
  htmlSafe: s => (s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  modelClass: m => {
    const s = (m || '').toLowerCase();
    if (s.includes('opus'))   return 'opus';
    if (s.includes('sonnet')) return 'sonnet';
    if (s.includes('haiku'))  return 'haiku';
    return '';
  },
  modelShort: m => (m || '').replace('claude-', ''),
  ts: t => (t || '').slice(0, 16).replace('T', ' '),
};

export async function api(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

export const state = { plan: 'api', pricing: null };

const ROUTES = {
  '/overview': { label: 'visão geral', load: () => import('/web/routes/overview.js') },
  '/prompts':  { label: 'prompts',     load: () => import('/web/routes/prompts.js') },
  '/sessions': { label: 'sessões',     load: () => import('/web/routes/sessions.js') },
  '/projects': { label: 'projetos',    load: () => import('/web/routes/projects.js') },
  '/skills':   { label: 'skills',      load: () => import('/web/routes/skills.js') },
  '/tips':     { label: 'dicas',       load: () => import('/web/routes/tips.js') },
  '/settings': { label: 'configurações', load: () => import('/web/routes/settings.js') },
  '/help':     { label: 'ajuda',         load: () => import('/web/routes/help.js') },
};

function buildTopbar() {
  const wrap = document.createElement('header');
  wrap.className = 'topbar';
  wrap.innerHTML = `
    <div class="brand">Token Dashboard</div>
    <nav>
      ${Object.entries(ROUTES).map(([p, r]) => `<a href="#${p}" data-route="${p}">${r.label}</a>`).join('')}
    </nav>
    <div class="spacer"></div>
    <span class="pill" id="plan-pill">api</span>
    <span class="pill muted" title="Cmd/Ctrl+B borra textos sensíveis">⌘B borrar</span>
  `;
  document.body.prepend(wrap);
}

function setActiveTab(routeKey) {
  $$('header.topbar nav a').forEach(a => a.classList.toggle('active', a.dataset.route === routeKey));
}

async function render() {
  const hash = location.hash.replace(/^#/, '') || '/overview';
  const path = hash.split('?')[0];
  let key = path;
  if (path.startsWith('/sessions/')) key = '/sessions';
  setActiveTab(key);
  const route = ROUTES[key] || ROUTES['/overview'];
  const mod = await route.load();
  $('#app').innerHTML = '';
  try {
    await mod.default($('#app'));
  } catch (e) {
    $('#app').innerHTML = `<div class="card"><h2>Erro</h2><pre>${fmt.htmlSafe(String(e.stack || e))}</pre></div>`;
  }
}

async function firstRun() {
  if (localStorage.getItem('td.plan-set')) return;
  const plans = Object.entries(state.pricing.plans);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Bem-vindo — escolha seu plano</h2>
      <p>Isso define como os custos são exibidos. Você muda depois em Configurações.</p>
      <select id="firstplan" style="width:100%">
        ${plans.map(([k,v]) => `<option value="${k}">${v.label}${v.monthly ? ` — $${v.monthly}/mês` : ''}</option>`).join('')}
      </select>
      <div class="actions">
        <div class="spacer"></div>
        <button class="primary" id="firstsave">Continuar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  await new Promise(res => $('#firstsave', overlay).addEventListener('click', async () => {
    const plan = $('#firstplan', overlay).value;
    await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    localStorage.setItem('td.plan-set', '1');
    overlay.remove();
    res();
  }));
  state.plan = (await api('/api/plan')).plan;
}

async function boot() {
  buildTopbar();
  const planResp = await api('/api/plan');
  state.plan = planResp.plan;
  state.pricing = planResp.pricing;
  $('#plan-pill').textContent = state.plan;

  await firstRun();

  window.addEventListener('hashchange', render);
  await render();

  // Privacy blur (Cmd+B / Ctrl+B)
  window.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.body.classList.toggle('privacy-on');
    }
  });

  // SSE diff stream
  try {
    const es = new EventSource('/api/stream');
    es.onmessage = ev => {
      try {
        const evt = JSON.parse(ev.data);
        if (evt.type === 'scan') render();
      } catch {}
    };
  } catch {}
}

boot();
