import { api, fmt } from '/web/app.js';

export default async function (root) {
  const tips = await api('/api/tips');
  root.innerHTML = `
    <div class="card">
      <h2>Sugestões</h2>
      ${tips.length === 0
        ? '<p class="muted">Sem sugestões no momento. O Token Dashboard detecta padrões semanalmente — volte depois de mais atividade.</p>'
        : `<p class="muted" style="margin:-8px 0 14px">Detecção de padrões por regras nos últimos 7 dias. Dicas dispensadas reaparecem em 14 dias.</p>`}
      ${tips.map(t => `
        <div class="tip">
          <div class="tip-head">
            <span class="badge">${fmt.htmlSafe(t.category)}</span>
            <strong>${fmt.htmlSafe(t.title)}</strong>
            <span class="spacer"></span>
            <button class="ghost" data-key="${fmt.htmlSafe(t.key)}">dispensar</button>
          </div>
          <p class="tip-body">${fmt.htmlSafe(t.body)}</p>
        </div>`).join('')}
    </div>`;
  root.querySelectorAll('button[data-key]').forEach(b => {
    b.addEventListener('click', async () => {
      await fetch('/api/tips/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: b.dataset.key }),
      });
      location.reload();
    });
  });
}
