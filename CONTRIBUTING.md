# Contribuindo

Obrigado por considerar contribuir! Este é um projeto Python pequeno, só com stdlib — fácil de rodar, fácil de mudar.

## Rodando os testes

```bash
python3 -m unittest discover tests
```

É isso. Sem `pip install`, sem fixtures para baixar. Todos os testes rodam em menos de 5 segundos.

Se você está corrigindo um bug, adicione primeiro um teste que falha. Se está adicionando uma feature, adicione um teste que exercite o caminho feliz.

## Rodando o dashboard localmente

```bash
python3 cli.py dashboard --no-open
```

Abra http://127.0.0.1:8080 no navegador. O servidor re-varre a cada 30 segundos e envia atualizações via Server-Sent Events, então você verá mudanças sem precisar de refresh forçado.

## Estilo de código

- **Só stdlib.** Sem `pip install`. Se você acha que uma feature realmente precisa de dependência de terceiros, abra uma issue antes para discutir — pesamos muito o "vale a pena o atrito de instalação".
- **SQL: sempre parameter binding.** Qualquer f-string em uma instrução SQL interpola apenas valores internos (nomes de coluna hardcoded, listas de placeholders montadas a partir de UUIDs internos). Valores que vêm do usuário passam por `?`.
- **Arquivos pequenos e focados.** Se um arquivo está passando de ~400 linhas e acumulando responsabilidades distintas, divida.
- **Type hints onde ajudarem na legibilidade.** Não é requisito rígido, mas ajuda em assinaturas de função.
- **Docstrings explicam *por quê*, não *o quê*.** O código já mostra o quê.

Layout dos componentes: `cli.py` (pontos de entrada) → `token_dashboard/scanner.py` (JSONL → SQLite) → `token_dashboard/db.py` (helpers de query) → `token_dashboard/server.py` (HTTP + SSE + rotas `/api/*`) → `web/` (UI em vanilla JS). Veja [`CLAUDE.md`](CLAUDE.md) para a visão curta de arquitetura. Para adicionar uma rota nova de API: adicione um branch de handler em `token_dashboard/server.py`, ponha o SQL num helper em `token_dashboard/db.py` e adicione um teste em `tests/`.

## Abrindo um pull request

1. Faça fork do repositório.
2. Crie uma branch: `git checkout -b feat/<short-description>` ou `fix/<short-description>`.
3. Faça a mudança. Adicione ou atualize testes.
4. Rode `python3 -m unittest discover tests` — tem que passar verde.
5. Faça commit com mensagem no estilo conventional commits: `feat: add X`, `fix: handle Y`, `docs: update Z`.
6. Faça push e abra um PR contra `main`. Descreva a mudança visível para o usuário e linke qualquer issue relevante.

## Ideias que ajudariam de verdade

- Ampliar o scan de catálogo de Skills para cobrir diretórios `.claude/skills/` locais ao projeto (fecha a limitação conhecida).
- Export em CSV ou JSON de qualquer rota.
- UI de filtro por sessão (hoje tudo é all-time ou implicitamente "recente").
- Um workflow do GitHub Actions que rode os testes a cada push.

## O que não estamos buscando

- Adicionar um framework de frontend. Vanilla JS é uma feature.
- Adicionar telemetria, analytics ou qualquer HTTP de saída com dados do usuário. Este dashboard é local-only e vai continuar assim.

## Licença

Ao contribuir, você concorda que sua contribuição é licenciada sob a [Licença MIT](LICENSE).
