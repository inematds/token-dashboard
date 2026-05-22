export default async function (root) {
  root.innerHTML = `
    <div class="card">
      <h2>Ajuda</h2>
      <p class="muted">Tudo o que você precisa para tirar valor deste dashboard.</p>

      <hr class="divider">

      <h3>O que é</h3>
      <p>O Token Dashboard lê os arquivos JSONL que o <strong>Claude Code</strong> grava localmente em <code>~/.claude/projects/</code> e transforma em métricas de uso, custo e padrões. <strong>Nada sai da sua máquina</strong> — sem telemetria, sem login, sem chamadas externas.</p>

      <hr class="divider">

      <h3>As 7 abas</h3>
      <dl>
        <dt><a href="#/overview">Visão geral</a></dt>
        <dd>Totais (sessões, turnos, tokens de entrada/saída/cache), custo estimado no seu plano, gráficos diários, top por projeto, por modelo e por ferramenta.</dd>

        <dt><a href="#/prompts">Prompts</a></dt>
        <dd>Os prompts que mais consumiram tokens (ou os mais recentes). Clique em qualquer linha para ver o conteúdo completo.</dd>

        <dt><a href="#/sessions">Sessões</a></dt>
        <dd>Lista de sessões e drill-down turno a turno. Útil para entender o que aconteceu numa sessão cara.</dd>

        <dt><a href="#/projects">Projetos</a></dt>
        <dd>Comparativo entre projetos — onde seu tempo (e tokens) está indo.</dd>

        <dt><a href="#/skills">Skills</a></dt>
        <dd>Quais skills você invoca, com que frequência, e quanto cada uma carrega no contexto. Veja limitações abaixo.</dd>

        <dt><a href="#/tips">Dicas</a></dt>
        <dd>Sugestões baseadas em regras: cache hit baixo, arquivos lidos repetidas vezes, turnos Opus que caberiam no Sonnet, etc.</dd>

        <dt><a href="#/settings">Configurações</a></dt>
        <dd>Plano de pricing, intervalo de scan, ajuste fino do plugin claude-mem, gestão do cache local.</dd>
      </dl>

      <hr class="divider">

      <h3>Conceitos-chave</h3>
      <dl>
        <dt>Sessão</dt><dd>Uma execução do Claude Code (do <code>claude</code> até sair). Equivale a um arquivo <code>.jsonl</code>.</dd>
        <dt>Turno</dt><dd>Uma mensagem sua → resposta do Claude. Pode envolver várias chamadas de ferramenta no meio.</dd>
        <dt>Tokens faturáveis</dt><dd>Input + Output + Cache criado. <strong>Cache lido</strong> é cobrado à parte e é ~10× mais barato.</dd>
        <dt>Custo estimado</dt><dd>Calculado a partir das taxas em <code>pricing.json</code>. Se você está no Pro/Max, é o equivalente API (não o que você paga de fato — veja limitações).</dd>
      </dl>

      <hr class="divider">

      <h3>Atalhos de teclado</h3>
      <ul>
        <li><code>Cmd/Ctrl + B</code> — borra prompts e textos sensíveis (para screenshots)</li>
      </ul>

      <hr class="divider">

      <h3>Dicas para reduzir custo</h3>
      <ul>
        <li><strong>Mantenha sessões longas em vez de reiniciar.</strong> Cada nova sessão reconstrói o cache (caro). Sessões longas leem do cache (~10× mais barato).</li>
        <li><strong>Documente o que se repete em <code>CLAUDE.md</code>.</strong> Se o Claude está lendo o mesmo arquivo 20 vezes por semana, um resumo no CLAUDE.md elimina as releituras.</li>
        <li><strong>Limite a saída de comandos Bash.</strong> <code>head</code>, <code>tail</code>, <code>grep</code> antes de mandar pro contexto. Resultados de ferramenta acima de 50k tokens são pura sangria.</li>
        <li><strong>Use Sonnet para turnos curtos.</strong> Opus custa ~5× mais. Para perguntas objetivas, Sonnet entrega o mesmo resultado.</li>
        <li><strong>Cuidado com subagentes.</strong> Cada subagente é um novo contexto inflado. Use só quando justifica.</li>
        <li><strong>Audite plugins que injetam contexto.</strong> Plugins como <code>claude-mem</code> inflam input em toda sessão. Ajuste em <a href="#/settings">Configurações</a>.</li>
      </ul>

      <hr class="divider">

      <h3>Limitações conhecidas</h3>
      <ul>
        <li><strong>Skills: tokens por chamada parciais.</strong> Só skills sob <code>~/.claude/skills/</code>, <code>~/.claude/scheduled-tasks/</code> ou <code>~/.claude/plugins/</code> têm a coluna populada. Skills locais do projeto e despachadas por subagente aparecem com invocações mas sem tokens.</li>
        <li><strong>Custo Pro/Max é equivalente-API.</strong> Mostramos o quanto o uso teria custado pay-per-token, não o que você paga de assinatura.</li>
        <li><strong>Sessões Cowork são invisíveis.</strong> Sessões server-side da Anthropic não escrevem JSONL local.</li>
        <li><strong>Modelos não-padrão usam fallback por tier.</strong> Snapshots futuros não listados em <code>pricing.json</code> são estimados pelo substring (<code>opus</code>/<code>sonnet</code>/<code>haiku</code>) no nome.</li>
        <li><strong>Primeiro scan pode ser lento.</strong> Para usuários pesados (centenas de sessões), o scan inicial leva minutos. Os subsequentes são incrementais.</li>
        <li><strong>Só funciona com Claude Code.</strong> Codex, Aider, Cursor e outras plataformas usam formatos diferentes e não são lidos.</li>
        <li><strong>Não rode duas instâncias contra o mesmo DB.</strong> Vão brigar pelo SQLite.</li>
      </ul>

      <hr class="divider">

      <h3>Solução de problemas</h3>
      <dl>
        <dt>Gráficos vazios ou "sem dados"</dt>
        <dd>Em <a href="#/settings">Configurações</a>, clique em <strong>Re-escanear agora</strong>.</dd>

        <dt>Números travados ou estranhos</dt>
        <dd>Em <a href="#/settings">Configurações</a>, use <strong>Apagar cache e reconstruir</strong>. Não apaga seus dados do Claude — só o cache SQLite local.</dd>

        <dt>O dashboard está consumindo muito CPU</dt>
        <dd>Aumente o intervalo de scan em <a href="#/settings">Configurações</a>.</dd>

        <dt>Quero acessar de outro dispositivo na rede</dt>
        <dd>Inicie o servidor com <code>HOST=0.0.0.0 python3 cli.py dashboard</code>. <strong>Cuidado:</strong> isso expõe todo seu histórico de prompts na rede local — use só em redes confiáveis.</dd>
      </dl>

      <hr class="divider">

      <h3>Privacidade</h3>
      <p>Nada sai da sua máquina. O navegador busca JSON de <code>127.0.0.1</code>. Todo JS/CSS é servido localmente (ECharts está vendorizado). Para auditar: <code>grep -r "https://" token_dashboard/ web/</code> — não encontra nada.</p>

      <hr class="divider">

      <h3>Links</h3>
      <ul>
        <li><a href="https://github.com/inematds/token-dashboard" target="_blank">Repositório no GitHub</a></li>
        <li>Documentação adicional: <code>docs/KNOWN_LIMITATIONS.md</code>, <code>docs/claude-mem-tuning.md</code>, <code>CONTRIBUTING.md</code></li>
      </ul>
    </div>`;
}
