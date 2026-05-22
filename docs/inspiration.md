# Inspiração: phuryn/claude-usage

Fonte: https://github.com/phuryn/claude-usage

## O que faz

Um dashboard local que lê as transcrições JSONL de sessão do Claude Code e mostra uso de tokens, estimativas de custo e histórico de sessões. Funciona nos planos API, Pro e Max.

## Stack técnica

- **Python 3.8+**, somente biblioteca padrão (sem pip install, sem venv)
- `sqlite3` — armazenamento persistente em `~/.claude/usage.db`
- `http.server` — serve um dashboard HTML/JS de página única
- Chart.js no frontend para as visualizações

## Arquivos centrais

- `scanner.py` — faz parsing do JSONL para o SQLite, incremental (rastreia mtime do arquivo)
- `dashboard.py` — servidor HTTP, UI de página única
- `cli.py` — despachante de comandos

## Comandos da CLI

- `python cli.py scan` — popula o DB a partir dos arquivos JSONL
- `python cli.py today` — breakdown de hoje por modelo (terminal)
- `python cli.py stats` — estatísticas de todo o período (terminal)
- `python cli.py dashboard` — scan + abre o navegador em `localhost:8080`
- Variáveis de ambiente: `HOST`, `PORT`, `--projects-dir` para caminhos customizados

## O que captura

- Claude Code CLI (`claude` no terminal)
- Extensão do VS Code (sidebar do Claude Code)
- Sessões Code despachadas

## O que NÃO captura

- **Sessões Cowork** — server-side, sem JSONL local
- Cálculo de custo para nomes de modelo não-padrão (só dá match em `opus`/`sonnet`/`haiku` — outros mostram `n/a`)

## Formato dos dados

Cada linha do JSONL é uma mensagem. O uso fica em `message.usage`:
- tokens de input, tokens de output
- tokens de criação de cache, tokens de leitura de cache

Identificador do modelo em `message.model`.

## Limitações que vale endereçar na nossa versão

1. **Custo para usuários Pro/Max é enganoso** — mostra taxas de API, mas esses usuários pagam uma assinatura fixa. O original admite isso no README.
2. **Modelos desconhecidos mostram `n/a`** — sem pricing de fallback, sem jeito de adicionar pricing customizado.
3. **UI é uma página HTML única com Chart.js** — funcional, mas datada.
4. **Sem drill-down de sessão** — não dá pra clicar facilmente em uma sessão e ver o que aconteceu.
5. **Sem comparação por projeto** — os agregados são globais.
6. **Auto-refresh de 30 segundos** apenas; sem tailing ao vivo da sessão ativa.

Esses são candidatos (não compromissos) para o que nossa versão poderia fazer melhor.
