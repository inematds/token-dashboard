import { api, state, $ } from '/web/app.js';

export default async function (root) {
  const cur = await api('/api/plan');
  const plans = Object.entries(cur.pricing.plans);
  root.innerHTML = `
    <div class="card">
      <h2>Configurações</h2>
      <h3 style="margin-top:16px">Plano</h3>
      <p class="muted" style="margin:0 0 12px">Define como o custo é exibido. Modo API mostra taxas pay-per-token. Modos de assinatura mostram o que você paga por mês de fato.</p>
      <div class="flex">
        <select id="plan">
          ${plans.map(([k,v]) => `<option value="${k}" ${k===cur.plan?'selected':''}>${v.label}${v.monthly?` — $${v.monthly}/mês`:''}</option>`).join('')}
        </select>
        <button class="primary" id="save">Salvar</button>
        <span id="msg" class="muted"></span>
      </div>

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

  $('#save').addEventListener('click', async () => {
    const plan = $('#plan').value;
    await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    state.plan = plan;
    document.getElementById('plan-pill').textContent = plan;
    $('#msg').textContent = 'Salvo.';
    $('#msg').style.color = 'var(--good)';
  });
}
