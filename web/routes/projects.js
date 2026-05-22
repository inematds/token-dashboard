import { api, fmt } from '/web/app.js';

export default async function (root) {
  const rows = await api('/api/projects');
  root.innerHTML = `
    <div class="card">
      <h2>Projetos</h2>
      <p class="muted" style="margin:-8px 0 14px">Ordenado pelo gasto em tokens faturáveis. Cache lido é cobrado mais barato, então colunas altas de cache são boas.</p>
      <table>
        <thead><tr><th>projeto</th><th class="num">sessões</th><th class="num">turnos</th><th class="num">tokens faturáveis</th><th class="num">cache lido</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td title="${fmt.htmlSafe(r.project_slug)}">${fmt.htmlSafe(r.project_name || r.project_slug)}</td>
              <td class="num">${fmt.int(r.sessions)}</td>
              <td class="num">${fmt.int(r.turns)}</td>
              <td class="num">${fmt.int(r.billable_tokens)}</td>
              <td class="num">${fmt.int(r.cache_read_tokens)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
