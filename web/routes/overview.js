import { api, fmt, state } from '/web/app.js';
import { barChart, donutChart, groupedBarChart, stackedBarChart } from '/web/charts.js';

const RANGES = [
  { key: '7d',  label: '7d',  days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'all', label: 'Tudo', days: null },
];

function readRange() {
  const q = (location.hash.split('?')[1] || '');
  const m = /(?:^|&)range=([^&]+)/.exec(q);
  const k = m && decodeURIComponent(m[1]);
  return RANGES.find(r => r.key === k) || RANGES[1];
}

function writeRange(key) {
  const base = (location.hash.replace(/^#/, '').split('?')[0]) || '/overview';
  location.hash = '#' + base + '?range=' + encodeURIComponent(key);
}

function sinceIso(range) {
  if (!range.days) return null;
  return new Date(Date.now() - range.days * 86400 * 1000).toISOString();
}

function withSince(url, since) {
  if (!since) return url;
  return url + (url.includes('?') ? '&' : '?') + 'since=' + encodeURIComponent(since);
}

export default async function (root) {
  const range = readRange();
  const since = sinceIso(range);

  const [totals, projects, sessions, tools, daily, byModel] = await Promise.all([
    api(withSince('/api/overview', since)),
    api(withSince('/api/projects', since)),
    api(withSince('/api/sessions?limit=10', since)),
    api(withSince('/api/tools', since)),
    api(withSince('/api/daily', since)),
    api(withSince('/api/by-model', since)),
  ]);

  const cacheCreate =
    (totals.cache_create_5m_tokens || 0) +
    (totals.cache_create_1h_tokens || 0);

  const kpi = (label, compactVal, fullVal, cls = '') => `
    <div class="card kpi ${cls}">
      <div class="label">${label}</div>
      <div class="value" title="${fullVal}">${compactVal}</div>
    </div>`;

  const rangeTabs = `
    <div class="range-tabs" role="tablist">
      ${RANGES.map(r => `<button data-range="${r.key}" class="${r.key === range.key ? 'active' : ''}">${r.label}</button>`).join('')}
    </div>`;

  root.innerHTML = `
    <div class="flex" style="margin-bottom:14px">
      <h2 style="margin:0;font-size:16px;letter-spacing:-0.01em">Visão geral</h2>
      <span class="muted" style="font-size:12px">${range.days ? `últimos ${range.days} dias` : 'todo o período'}</span>
      <div class="spacer"></div>
      ${rangeTabs}
    </div>

    <div class="row cols-7">
      ${kpi('Sessões',      fmt.int(totals.sessions),       fmt.int(totals.sessions))}
      ${kpi('Turnos',       fmt.int(totals.turns),          fmt.int(totals.turns))}
      ${kpi('Entrada',      fmt.compact(totals.input_tokens),       fmt.int(totals.input_tokens) + ' tokens')}
      ${kpi('Saída',        fmt.compact(totals.output_tokens),      fmt.int(totals.output_tokens) + ' tokens')}
      ${kpi('Cache lido',   fmt.compact(totals.cache_read_tokens),  fmt.int(totals.cache_read_tokens) + ' tokens')}
      ${kpi('Cache criado', fmt.compact(cacheCreate),               fmt.int(cacheCreate) + ' tokens')}
      <div class="card kpi cost">
        <div class="label">Custo estimado</div>
        <div class="value" title="${fmt.usd(totals.cost_usd)}">${fmt.usd(totals.cost_usd)}</div>
        ${planSubtitle()}
      </div>
    </div>

    <details class="card glossary" style="margin-top:16px">
      <summary><h3 style="display:inline-block;margin:0">O que esses números significam?</h3><span class="muted" style="font-size:12px">— clique para expandir</span></summary>
      <dl>
        <dt>Sessão</dt><dd>Uma execução do Claude Code (do <code>claude</code> até sair). Cada sessão é um único arquivo <code>.jsonl</code>.</dd>
        <dt>Turno</dt><dd>Uma mensagem que você enviou ao Claude. Cada turno dispara uma resposta (possivelmente com chamadas de ferramenta no meio).</dd>
        <dt>Tokens de entrada</dt><dd>O texto novo que você (e resultados de ferramenta) enviou ao Claude neste turno. Cobrado na taxa cheia de input.</dd>
        <dt>Tokens de saída</dt><dd>O texto que o Claude escreveu de volta. Cobrado na taxa mais alta — geralmente o maior driver de custo por turno.</dd>
        <dt>Cache lido</dt><dd>Tokens que o Claude reusou de um cache (seu CLAUDE.md, arquivos lidos antes, a conversa até aqui). ~10× mais barato que input novo. Cache lido alto = boa higiene de custo.</dd>
        <dt>Cache criado</dt><dd>Gravar algo no cache pela primeira vez. Custo único; compensa no próximo turno.</dd>
        <dt>Tokens faturáveis</dt><dd>Entrada + Saída + Cache criado. Cache lido é cobrado à parte (e bem mais barato).</dd>
      </dl>
    </details>

    <div class="row cols-2" style="margin-top:16px">
      <div class="card">
        <h3>Seu trabalho diário</h3>
        <p class="muted" style="margin:-4px 0 10px;font-size:12px">Tokens que você pagou: o que você enviou (<b>entrada</b>), o que o Claude escreveu (<b>saída</b>) e o que foi guardado para reuso (<b>cache criado</b>).</p>
        <div id="ch-daily-billable" style="height:260px"></div>
      </div>
      <div class="card">
        <h3>Cache lido por dia</h3>
        <p class="muted" style="margin:-4px 0 10px;font-size:12px"><b>Cache lido</b> é o reuso barato de coisas que o Claude já viu (como seu CLAUDE.md). Custa ~10× menos que tokens de input normais — números altos aqui são bons.</p>
        <div id="ch-daily-cache" style="height:260px"></div>
      </div>
    </div>

    <div class="row cols-2" style="margin-top:16px">
      <div class="card"><h3>Tokens por projeto</h3><div id="ch-projects" style="height:320px"></div></div>
      <div class="card">
        <h3>Uso de tokens por modelo</h3>
        <p class="muted" style="margin:-4px 0 4px;font-size:12px">Participação de tokens faturáveis por modelo do Claude.</p>
        <div id="ch-model" style="height:300px"></div>
      </div>
    </div>

    <div class="row cols-2" style="margin-top:16px">
      <div class="card"><h3>Top de ferramentas (por número de chamadas)</h3><div id="ch-tools" style="height:320px"></div></div>
      <div class="card">
        <h3 style="display:flex;align-items:center"><span>Sessões recentes</span><span class="spacer"></span><a href="#/sessions" style="font-weight:400;font-size:12px">todas →</a></h3>
        <table>
          <thead><tr><th>início</th><th>projeto</th><th class="num">tokens</th></tr></thead>
          <tbody>
            ${sessions.map(s => `
              <tr>
                <td class="mono">${fmt.ts(s.started)}</td>
                <td><a href="#/sessions/${encodeURIComponent(s.session_id)}">${fmt.htmlSafe(s.project_name || s.project_slug)}</a></td>
                <td class="num">${fmt.compact(s.tokens)}</td>
              </tr>`).join('') || '<tr><td colspan="3" class="muted">sem sessões neste período</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // botões de range
  root.querySelectorAll('.range-tabs button').forEach(btn => {
    btn.addEventListener('click', () => writeRange(btn.dataset.range));
  });

  stackedBarChart(document.getElementById('ch-daily-billable'), {
    categories: daily.map(d => d.day),
    series: [
      { name: 'entrada',     values: daily.map(d => d.input_tokens),        color: '#4A9EFF' },
      { name: 'saída',       values: daily.map(d => d.output_tokens),       color: '#7C5CFF' },
      { name: 'cache criado', values: daily.map(d => d.cache_create_tokens), color: '#E8A23B' },
    ],
  });

  stackedBarChart(document.getElementById('ch-daily-cache'), {
    categories: daily.map(d => d.day),
    series: [
      { name: 'cache lido', values: daily.map(d => d.cache_read_tokens), color: '#3FB68B' },
    ],
  });

  donutChart(document.getElementById('ch-model'),
    byModel.map(m => ({
      name: fmt.modelShort(m.model) || 'desconhecido',
      value: (m.input_tokens || 0) + (m.output_tokens || 0)
           + (m.cache_create_5m_tokens || 0) + (m.cache_create_1h_tokens || 0),
    })).filter(d => d.value > 0),
  );

  const topProjects = projects.slice(0, 8);
  groupedBarChart(document.getElementById('ch-projects'), {
    categories: topProjects.map(p => {
      const name = p.project_name || p.project_slug;
      return name.length > 20 ? name.slice(0, 19) + '…' : name;
    }),
    series: [
      { name: 'entrada', values: topProjects.map(p => p.input_tokens  || 0), color: '#4A9EFF' },
      { name: 'saída',   values: topProjects.map(p => p.output_tokens || 0), color: '#7C5CFF' },
    ],
  });

  const topTools = tools.slice(0, 8);
  barChart(document.getElementById('ch-tools'), {
    categories: topTools.map(t => t.tool_name),
    values: topTools.map(t => t.calls),
    color: '#7C5CFF',
  });
}

function planSubtitle() {
  if (!state.pricing || state.plan === 'api') return '';
  const p = state.pricing.plans[state.plan];
  if (!p || !p.monthly) return '';
  return `<div class="sub">paga $${p.monthly}/mês no ${fmt.htmlSafe(p.label)}</div>`;
}
