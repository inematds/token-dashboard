# Ajustando o plugin claude-mem (caso de uso real)

Análise feita em 2026-05-22 com base nos dados que o Token Dashboard expôs. Documenta a decisão de desligar a **injeção automática** do plugin `claude-mem@thedotmack` mantendo a **gravação do histórico** intacta.

## Contexto

O plugin claude-mem captura cada `Read`/`Edit`/`Bash` como uma "observation", gera resumos por sessão e auto-injeta ~50 observations relevantes no início de cada nova sessão do Claude Code para "não re-explicar o codebase".

Em troca, infla os input tokens de toda sessão nova.

## O que os dados mostraram

Estado em 2026-05-22 (`~/.claude-mem/claude-mem.db`):

| Métrica | Valor |
|---|---|
| Observations gravadas | 4.778 |
| Sessões cobertas | 802 |
| Projetos distintos | 40 |
| `discovery_tokens` totais (custo original) | 32.442.107 |
| Observations com `relevance_count > 0` (recall explícito) | **0 (0%)** |
| Pico diário recente | 5.4M tokens (2026-05-17) |

A coluna `relevance_count` rastreia recall explícito (via `/mem-search`, `/timeline-report`, `/knowledge-agent`). Estava zerada em 100% das observations — o plugin estava gravando e injetando, mas nada estava sendo buscado de volta de propósito.

Veredito: a função de **injeção passiva** não tinha retorno mensurável para esse usuário (40 projetos espalhados → relevância do contexto injetado dilui), mas o **histórico pesquisável** continua útil para consulta sob demanda.

## A decisão

Desligar injeção automática, manter gravação.

| Flag em `~/.claude-mem/settings.json` | Antes | Depois | Efeito |
|---|---|---|---|
| `CLAUDE_MEM_CONTEXT_OBSERVATIONS` | `"50"` | `"0"` | Não injeta observations no início da sessão |
| `CLAUDE_MEM_CONTEXT_SESSION_COUNT` | `"10"` | `"0"` | Não injeta summaries das últimas N sessões |
| `CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY` | `"true"` | `"false"` | Não injeta resumo da última sessão |

Mantido intacto:

- `CLAUDE_MEM_TRANSCRIPTS_ENABLED = "true"` → continua gravando observations e summaries
- DB `~/.claude-mem/claude-mem.db` → não tocado
- Skills `/mem-search`, `/timeline-report`, `/knowledge-agent` → seguem funcionando, agora consultadas sob demanda

Backup do `settings.json` original em `~/.claude-mem/settings.json.bak.<timestamp>`.

## Como reverter

```bash
cp ~/.claude-mem/settings.json.bak.<timestamp> ~/.claude-mem/settings.json
```

Ou editar manualmente os três valores de volta para `"50"`, `"10"`, `"true"`.

## Como reavaliar daqui a algumas semanas

Reexecute a query abaixo. Se `relevance_count` continuar zerado, o histórico está sendo gravado por nada — considere também desligar `CLAUDE_MEM_TRANSCRIPTS_ENABLED`. Se subir, a função de busca on-demand está pagando seu custo.

```bash
sqlite3 ~/.claude-mem/claude-mem.db \
  "SELECT COUNT(*) total, SUM(CASE WHEN relevance_count>0 THEN 1 ELSE 0 END) recall FROM observations"
```
