import { api, state, $, fmt } from '/web/app.js';

const INTERVALS = [60, 120, 300, 600, 1800];

function bytesHuman(n) {
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + ' ' + u[i];
}

export default async function (root) {
  const [cur, settings] = await Promise.all([api('/api/plan'), api('/api/settings')]);
  const plans = Object.entries(cur.pricing.plans);
  const mem = settings.claude_mem || { available: false };

  root.innerHTML = `
    <div class="card">
      <h2>Configurações</h2>

      <h3 style="margin-top:16px">Plano</h3>
      <p class="muted" style="margin:0 0 12px">Define como o custo é exibido. Modo API mostra taxas pay-per-token. Modos de assinatura mostram o que você paga por mês de fato.</p>
      <div class="flex">
        <select id="plan">
          ${plans.map(([k,v]) => `<option value="${k}" ${k===cur.plan?'selected':''}>${v.label}${v.monthly?` — $${v.monthly}/mês`:''}</option>`).join('')}
        </select>
        <button class="primary" id="save-plan">Salvar</button>
        <span id="msg-plan" class="muted"></span>
      </div>

      <hr class="divider">

      <h3>Intervalo de atualização (scan)</h3>
      <p class="muted" style="margin:0 0 12px">A cada quantos segundos o dashboard re-varre o disco em busca de novas sessões. Vale só para esta execução do servidor — para tornar permanente, exporte <code>TOKEN_DASHBOARD_SCAN_INTERVAL</code>.</p>
      <div class="flex">
        <select id="interval">
          ${INTERVALS.map(s => `<option value="${s}" ${s==Math.round(settings.scan_interval)?'selected':''}>${s >= 60 ? (s/60) + ' min' : s + ' s'}</option>`).join('')}
        </select>
        <button class="primary" id="save-interval">Aplicar</button>
        <span id="msg-interval" class="muted"></span>
      </div>

      <hr class="divider">

      <h3>Plugin claude-mem</h3>
      ${mem.available ? `
        <p class="muted" style="margin:0 0 12px">Controla quanto contexto o plugin <code>claude-mem</code> injeta no início de cada sessão. Mais contexto = mais input tokens cobrados. Veja <a href="#/help">Ajuda</a> para o caso de uso real.</p>
        <table style="max-width:680px">
          <tbody>
            <tr>
              <td><strong>Observations injetadas</strong><br><span class="muted" style="font-size:12px">Quantas observations passadas o plugin coloca no contexto da próxima sessão (0 = desligado).</span></td>
              <td><input id="mem-obs" type="number" min="0" max="500" value="${mem.context_observations}" style="width:90px"></td>
            </tr>
            <tr>
              <td><strong>Resumos de sessões anteriores</strong><br><span class="muted" style="font-size:12px">Quantos resumos de sessões anteriores injetar (0 = desligado).</span></td>
              <td><input id="mem-sess" type="number" min="0" max="100" value="${mem.context_session_count}" style="width:90px"></td>
            </tr>
            <tr>
              <td><strong>Resumo da última sessão</strong><br><span class="muted" style="font-size:12px">Inclui o resumo completo da última sessão deste projeto.</span></td>
              <td><label><input id="mem-last" type="checkbox" ${mem.context_show_last_summary?'checked':''}> ativado</label></td>
            </tr>
          </tbody>
        </table>
        <div class="flex" style="margin-top:12px">
          <button class="primary" id="save-mem">Salvar claude-mem</button>
          <span id="msg-mem" class="muted"></span>
        </div>
      ` : `<p class="muted">Plugin <code>claude-mem</code> não detectado em <code>~/.claude-mem/settings.json</code>.</p>`}

      <hr class="divider">

      <h3>Cache local</h3>
      <p class="muted" style="margin:0 0 6px">Banco SQLite: <code>${fmt.htmlSafe(settings.env.db_path)}</code> · <strong>${bytesHuman(settings.env.db_size_bytes)}</strong></p>
      <p class="muted" style="margin:0 0 12px">Diretório de projetos: <code>${fmt.htmlSafe(settings.env.projects_dir)}</code></p>
      <div class="flex">
        <button id="rescan">Re-escanear agora</button>
        <button id="clear-cache" style="color:var(--bad);border-color:var(--bad)">Apagar cache e reconstruir</button>
        <span id="msg-cache" class="muted"></span>
      </div>

      <hr class="divider">

      <h3>Servidor</h3>
      <table style="max-width:680px">
        <tbody>
          <tr><td><strong>HOST</strong></td><td class="mono">${fmt.htmlSafe(settings.env.host)}</td></tr>
          <tr><td><strong>PORT</strong></td><td class="mono">${settings.env.port}</td></tr>
        </tbody>
      </table>
      <p class="muted" style="margin-top:8px;font-size:12px">Para mudar HOST/PORT, reinicie o servidor com as variáveis de ambiente correspondentes.</p>

      <hr class="divider">

      <h3>Tabela de preços</h3>
      <p class="muted" style="margin:0 0 12px">Edite <code>pricing.json</code> na raiz do projeto para mudar as taxas. Recarregue a página depois.</p>
      <table>
        <thead><tr><th>modelo</th><th class="num">entrada</th><th class="num">saída</th><th class="num">cache lido</th><th class="num">cache 5m</th><th class="num">cache 1h</th></tr></thead>
        <tbody>
          ${Object.entries(cur.pricing.models).map(([k,v]) => `
            <tr><td><span class="badge ${v.tier}">${k}</span></td>
              <td class="num">$${v.input.toFixed(2)}</td>
              <td class="num">$${v.output.toFixed(2)}</td>
              <td class="num">$${v.cache_read.toFixed(2)}</td>
              <td class="num">$${v.cache_create_5m.toFixed(2)}</td>
              <td class="num">$${v.cache_create_1h.toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="muted" style="margin-top:8px;font-size:11px">Taxas por 1M de tokens, em USD.</p>

      <hr class="divider">

      <h3>Privacidade</h3>
      <p class="muted">Aperte <code>Cmd/Ctrl + B</code> em qualquer tela para borrar texto de prompts e outros conteúdos sensíveis para screenshots.</p>
    </div>`;

  // Plano
  $('#save-plan').addEventListener('click', async () => {
    const plan = $('#plan').value;
    await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    state.plan = plan;
    document.getElementById('plan-pill').textContent = plan;
    flash('msg-plan', 'Salvo.');
  });

  // Intervalo
  $('#save-interval').addEventListener('click', async () => {
    const seconds = Number($('#interval').value);
    const r = await fetch('/api/settings/scan-interval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seconds }) });
    if (r.ok) flash('msg-interval', 'Aplicado.');
    else flash('msg-interval', 'Erro.', true);
  });

  // claude-mem
  if (mem.available) {
    $('#save-mem').addEventListener('click', async () => {
      const payload = {
        context_observations: Number($('#mem-obs').value),
        context_session_count: Number($('#mem-sess').value),
        context_show_last_summary: $('#mem-last').checked,
      };
      const r = await fetch('/api/settings/claude-mem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) flash('msg-mem', 'Salvo. Vale a partir da próxima sessão do Claude Code.');
      else flash('msg-mem', 'Erro ao salvar.', true);
    });
  }

  // Cache
  $('#rescan').addEventListener('click', async () => {
    $('#msg-cache').textContent = 'Re-escaneando…';
    const r = await fetch('/api/settings/rescan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json();
    flash('msg-cache', r.ok ? `OK — ${j.scanned.messages} mensagens novas.` : 'Erro.', !r.ok);
  });
  $('#clear-cache').addEventListener('click', async () => {
    if (!confirm('Isto apaga o banco SQLite local e reconstrói do zero. Pode demorar. Continuar?')) return;
    $('#msg-cache').textContent = 'Apagando e reconstruindo…';
    const r = await fetch('/api/settings/clear-cache', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
    const j = await r.json();
    flash('msg-cache', r.ok ? `Reconstruído — ${j.rescanned.messages} mensagens.` : 'Erro.', !r.ok);
  });
}

function flash(id, text, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? 'var(--bad)' : 'var(--good)';
  setTimeout(() => { el.textContent = ''; }, 4000);
}
