# CLAUDE.md

Orientações para o Claude Code ao trabalhar neste repositório.

## Visão geral do projeto

**Token Dashboard** — um dashboard local para acompanhar uso de tokens, custos e histórico de sessões do Claude Code. Lê as transcrições JSONL que o Claude Code grava em `~/.claude/projects/` e as transforma em análise de custo por prompt, mapas de calor de ferramentas/arquivos, atribuição de subagentes, análise de cache, comparação entre projetos e um motor de dicas baseado em regras.

Inspirado em [phuryn/claude-usage](https://github.com/phuryn/claude-usage) mas diverge na UI (vanilla JS + ECharts, tema escuro, hash router, refresh via SSE) e no escopo (drill-down de prompts caros, visão de skills, motor de dicas, dedup de snapshots de streaming). Veja `docs/inspiration.md` para o conjunto de features do original e suas limitações conhecidas.

## Status

Codebase funcional. 68 testes unitários em Python (`python3 -m unittest discover tests`). Sete abas de UI plugadas (Overview, Prompts, Sessions, Projects, Skills, Tips, Settings). Roda em macOS, Windows e Linux.

## Arquitetura

- `cli.py` → `token_dashboard/scanner.py` → `~/.claude/token-dashboard.db` (SQLite)
- `token_dashboard/server.py` expõe APIs JSON (`/api/*`) + stream SSE (`/api/stream`) + frontend estático (`web/`)
- `web/` é vanilla JS, sem etapa de build — hash router + ECharts

## Fonte de dados

O Claude Code grava um arquivo JSONL por sessão em `~/.claude/projects/<project-slug>/<session-id>.jsonl`. Cada linha é um registro de mensagem; os campos de uso ficam em `message.usage` e o identificador do modelo em `message.model`. O scanner é incremental — rastreia o mtime e o offset em bytes de cada arquivo na tabela `files` e só lê os bytes novos em scans subsequentes.

## Convenções

- **Totalmente local.** Sem telemetria, sem chamadas remotas com dados do usuário. Os testes rodam offline.
- **Só stdlib.** Sem `pip install`. Se uma nova feature precisar de biblioteca de terceiros, argumente antes — estamos dispostos a pagar custo de ergonomia para manter o atrito de instalação em zero.
- **Sempre usar parameter binding do SQLite.** Qualquer f-string em uma instrução SQL deve interpolar apenas valores internos controlados pelo caller (nomes de coluna, listas de placeholders). Valores que vêm do usuário passam por `?`.
- **Arquivos pequenos com responsabilidades claras.** Se um arquivo passar de ~400 linhas ou acumular três responsabilidades distintas, divida.
- **Dedup de snapshots de streaming.** Ao adicionar lógica no scanner que faça join com a tabela `messages`, lembre que `(session_id, message_id)` é a chave de dedup, não `uuid`. Veja `scanner._evict_prior_snapshots` e a nota de migração em `db._migrate_add_message_id`.

## Customizando

Variáveis de ambiente: `PORT` (padrão 8080), `HOST` (padrão 127.0.0.1), `CLAUDE_PROJECTS_DIR`, `TOKEN_DASHBOARD_DB`. Os preços ficam em `pricing.json`. Veja README.md § Environment variables para detalhes.

## Limitações conhecidas

Veja `docs/KNOWN_LIMITATIONS.md`. Resumo atual: `tokens_per_call` de Skills é populado apenas para skills instaladas sob os três roots varridos (`~/.claude/skills/`, `~/.claude/scheduled-tasks/`, `~/.claude/plugins/`); skills locais do projeto e skills despachadas por subagente mostram contagem de invocações mas contagens de tokens em branco.

## Verificando alterações

```bash
python3 -m unittest discover tests        # todos os testes
python3 cli.py dashboard --no-open        # inicia o servidor
curl http://127.0.0.1:8080/api/overview   # sanity-check de um endpoint
```
