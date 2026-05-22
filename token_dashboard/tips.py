"""Rule-based tips engine — produces actionable suggestions from SQLite."""
from __future__ import annotations

import time
from datetime import datetime, timedelta
from typing import List, Optional

from .db import connect


def _iso_days_ago(today_iso: str, n: int) -> str:
    d = datetime.fromisoformat(today_iso.replace("Z", ""))
    return (d - timedelta(days=n)).isoformat()


def _key(category: str, scope: str) -> str:
    return f"{category}:{scope}"


def _is_dismissed(db_path, key: str) -> bool:
    with connect(db_path) as c:
        r = c.execute("SELECT dismissed_at FROM dismissed_tips WHERE tip_key=?", (key,)).fetchone()
    if not r:
        return False
    return (time.time() - r["dismissed_at"]) < 14 * 86400


def dismiss_tip(db_path, key: str) -> None:
    with connect(db_path) as c:
        c.execute(
            "INSERT OR REPLACE INTO dismissed_tips (tip_key, dismissed_at) VALUES (?, ?)",
            (key, time.time()),
        )
        c.commit()


def cache_discipline_tips(db_path, today_iso: Optional[str] = None) -> List[dict]:
    today_iso = today_iso or datetime.utcnow().isoformat()
    since = _iso_days_ago(today_iso, 7)
    sql = """
      SELECT project_slug,
             SUM(cache_read_tokens) AS cr,
             SUM(input_tokens + cache_create_5m_tokens + cache_create_1h_tokens) AS rebuild
        FROM messages
       WHERE type='assistant' AND timestamp >= ?
       GROUP BY project_slug
       HAVING (cr + rebuild) > 100000
    """
    out = []
    with connect(db_path) as c:
        for row in c.execute(sql, (since,)):
            total = (row["cr"] or 0) + (row["rebuild"] or 0)
            hit = (row["cr"] or 0) / total if total else 0
            if hit < 0.40:
                key = _key("cache", row["project_slug"])
                if _is_dismissed(db_path, key):
                    continue
                out.append({
                    "key": key,
                    "category": "cache",
                    "title": f"Taxa de cache hit baixa em {row['project_slug']}",
                    "body": f"A taxa de cache hit é {hit*100:.0f}% nos últimos 7 dias. Sessões que reiniciam contexto com frequência reconstroem o cache. Considere sessões mais longas ou menos resets de contexto.",
                    "scope": row["project_slug"],
                })
    return out


def repeated_target_tips(db_path, today_iso: Optional[str] = None) -> List[dict]:
    today_iso = today_iso or datetime.utcnow().isoformat()
    since = _iso_days_ago(today_iso, 7)
    out = []
    with connect(db_path) as c:
        for row in c.execute("""
          SELECT target, COUNT(*) AS n, COUNT(DISTINCT session_id) AS sessions
            FROM tool_calls
           WHERE tool_name IN ('Read','Edit','Write') AND timestamp >= ?
           GROUP BY target HAVING n > 10
           ORDER BY n DESC LIMIT 10
        """, (since,)):
            key = _key("repeat-file", row["target"] or "?")
            if _is_dismissed(db_path, key):
                continue
            out.append({
                "key": key, "category": "repeat-file",
                "title": f"{row['target']} lido {row['n']} vezes",
                "body": f"Este arquivo foi aberto {row['n']} vezes em {row['sessions']} sessões nos últimos 7 dias. Um resumo no CLAUDE.md ou uma leitura por sessão evitaria as repetições.",
                "scope": row["target"],
            })
        for row in c.execute("""
          SELECT target, COUNT(*) AS n
            FROM tool_calls
           WHERE tool_name='Bash' AND timestamp >= ?
           GROUP BY target HAVING n > 15
           ORDER BY n DESC LIMIT 10
        """, (since,)):
            key = _key("repeat-bash", row["target"] or "?")
            if _is_dismissed(db_path, key):
                continue
            out.append({
                "key": key, "category": "repeat-bash",
                "title": f"`{row['target']}` rodou {row['n']} vezes",
                "body": f"Este comando bash rodou {row['n']} vezes nos últimos 7 dias. Considere usar uma flag de watch ou um alias de shell.",
                "scope": row["target"],
            })
    return out


def right_size_tips(db_path, today_iso: Optional[str] = None) -> List[dict]:
    today_iso = today_iso or datetime.utcnow().isoformat()
    since = _iso_days_ago(today_iso, 7)
    sql = """
      SELECT COUNT(*) AS n,
             SUM(input_tokens+cache_create_5m_tokens+cache_create_1h_tokens) AS in_tok,
             SUM(output_tokens) AS out_tok
        FROM messages
       WHERE type='assistant' AND model LIKE '%opus%'
         AND output_tokens < 500 AND is_sidechain = 0
         AND timestamp >= ?
    """
    with connect(db_path) as c:
        row = c.execute(sql, (since,)).fetchone()
    if not row or (row["n"] or 0) < 10:
        return []
    api_opus   = ((row["in_tok"] or 0) * 15 + (row["out_tok"] or 0) * 75) / 1_000_000
    api_sonnet = ((row["in_tok"] or 0) *  3 + (row["out_tok"] or 0) * 15) / 1_000_000
    savings = api_opus - api_sonnet
    if savings < 1.0:
        return []
    key = _key("right-size", "opus-short-turns-7d")
    if _is_dismissed(db_path, key):
        return []
    return [{
        "key": key, "category": "right-size",
        "title": f"{row['n']} turnos curtos no Opus caberiam no Sonnet",
        "body": f"Turnos do Opus com menos de 500 tokens de saída custaram ~${api_opus:.2f} nos últimos 7 dias. No Sonnet teriam custado ~${api_sonnet:.2f} (economia ~${savings:.2f}).",
        "scope": "opus-short-turns-7d",
    }]


def outlier_tips(db_path, today_iso: Optional[str] = None) -> List[dict]:
    today_iso = today_iso or datetime.utcnow().isoformat()
    since = _iso_days_ago(today_iso, 7)
    out = []
    with connect(db_path) as c:
        big = c.execute("""
          SELECT COUNT(*) AS n, AVG(result_tokens) AS avg_t
            FROM tool_calls
           WHERE tool_name='_tool_result' AND result_tokens > 50000 AND timestamp >= ?
        """, (since,)).fetchone()
        if big and (big["n"] or 0) >= 5:
            key = _key("tool-bloat", "result-50k+")
            if not _is_dismissed(db_path, key):
                out.append({
                    "key": key, "category": "tool-bloat",
                    "title": f"{big['n']} resultados de ferramenta acima de 50k tokens nesta semana",
                    "body": f"Tamanho médio: {int(big['avg_t']):,} tokens. Mande saídas longas de Bash para head/tail e peça leituras de arquivo mais estreitas.",
                    "scope": "result-50k+",
                })
        for row in c.execute("""
          SELECT agent_id, COUNT(*) AS n,
                 AVG(input_tokens+output_tokens) AS mean_t,
                 MAX(input_tokens+output_tokens) AS max_t
            FROM messages
           WHERE is_sidechain=1 AND agent_id IS NOT NULL AND timestamp >= ?
           GROUP BY agent_id HAVING n >= 10
        """, (since,)):
            if (row["max_t"] or 0) > 6 * (row["mean_t"] or 1) and (row["max_t"] or 0) > 50_000:
                key = _key("subagent-outlier", row["agent_id"])
                if _is_dismissed(db_path, key):
                    continue
                out.append({
                    "key": key, "category": "subagent-outlier",
                    "title": f"Subagente {row['agent_id']} tem outliers de custo",
                    "body": f"Maior invocação usou {int(row['max_t']):,} tokens vs média de {int(row['mean_t']):,}. Vale checar o que essas fizeram de diferente.",
                    "scope": row["agent_id"],
                })
    return out


def all_tips(db_path, today_iso: Optional[str] = None) -> List[dict]:
    return [
        *cache_discipline_tips(db_path, today_iso),
        *repeated_target_tips(db_path, today_iso),
        *right_size_tips(db_path, today_iso),
        *outlier_tips(db_path, today_iso),
    ]
