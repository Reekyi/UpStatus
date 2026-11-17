# UpStatus — auditoria independente QA
**Data:** 2026-11-15 16:30 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`  
**Modo:** inspeção read-only. Nenhum teste foi iniciado, nenhum workflow foi despachado e nenhum ambiente de produção foi alterado.

## Resumo executivo

**Veredito: NOT READY.**

Avanços confirmados:
- A PR #161 passou Validate e Smoke no laboratório. A migration candidata implementa rate limit distribuído de convites de primeiro acesso com RLS, SECURITY INVOKER, `search_path=''` e EXECUTE somente para `service_role`.
- A PR #163 passou Validate e o contrato HTTP 409.
- As PRs #74 e #76 mantêm seus resultados históricos de CI positivos.

Bloqueadores atuais:
- A tabela e a RPC de rate limit da #161 não existem em produção; os runtimes instalados não chamam essa RPC.
- O 429 da emissão de convite na candidata #161 não inclui `Retry-After`.
- O projeto isolado está restringido por quota de invocações de Edge Functions; o Smoke de push da linha #165 falhou antes dos testes autenticados.
- Produção continua com Realtime público, grants amplos, funções SECURITY DEFINER sinalizadas pelo Advisor e buckets Storage públicos sem policies próprias.
- O workflow oficial Team Lite lê o manifesto raiz beta.22 e tenta publicar o slug Normal `upstatus`.
- A #82 continua falhando em `production updateURL mismatch`.
- Quatro SQLs de migrations aplicadas em produção continuam ausentes da branch QA.

## Heads reais e integridade

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `910f2abdd86be66e181ee23cef2af54748e57f24` |

A comparação master → QA indica QA 341 commits à frente e um atrás. A #82 aponta para o mesmo HEAD QA. Nenhuma alteração de engenharia foi sobrescrita.

`docs/RELEASE_READINESS.md` foi lido na branch QA. O último checkpoint append-only dentro dele é **2026-11-15 06:30 UTC**. Este relatório separado registra a revalidação de 16:30 UTC; o documento-base não foi reescrito nesta execução.

## PRs obrigatórias e CI por HEAD exato

| PR | HEAD | Resultado observado |
|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) SUCCESS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS histórico |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) SUCCESS |
| #82 QA | `910f2abdd86be66e181ee23cef2af54748e57f24` | Validate [43730653525](https://github.com/Reekyi/UpStatus/actions/runs/43730653525) FAILURE |

O log da #82 mostra build `3.4.7 / TEST 3.4.7` e falha em `scripts/validate.mjs:26`: `production updateURL mismatch`. Não houve rerun nem alteração do validator.

As PRs #74, #75, #76 e #82 continuam abertas, Draft e não merged. Não foram encontradas reviews submetidas para essas PRs. A #75 é baseline histórica; #76 é a linha Team Lite com sinalização.

## Candidatas relacionadas

| PR | HEAD | CI atual observado |
|---|---|---|
| #161 Normal rate limit | `557814dc31bed779b84a2094358dc6b2a7e67689` | Validate [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e Smoke [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) SUCCESS |
| #163 contrato HTTP 409 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` | Validate [43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) e contrato [43488822237](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) SUCCESS |
| #165 provenance Normal | `434478771dca54505d3ec8b0cea0ada57d8d6dca` | PR head: somente Voice Open HTTP Status Contract [43619801133](https://github.com/Reekyi/UpStatus/actions/runs/43619801133) SUCCESS |
| #166 provenance Team Lite | `e90e0dbbc0c6d89d77ea359dff0f1e82b4428413` | Guard [43624572780](https://github.com/Reekyi/UpStatus/actions/runs/43624572780) SUCCESS |
| #167 updater/anexos | `d100b0820dd7f98e2b78a98e6b6f8c09f13b1867` | Validate [43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) SUCCESS |

Esses resultados são checks focados, não um Smoke completo para cada PR. O Smoke de push relacionado à linha #165, run [43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747), falhou nas verificações de endpoint não autenticado: o projeto respondeu HTTP 402 por `exceed_edge_functions_invocations_quota`. Os passos autenticados, concorrência e recibos foram skipped. Esse push run não deve ser confundido com o único check PR-triggered da HEAD #165.

### PR #161 — rate limit de setup-invite

A migration candidata `supabase/migrations/20261109230000_setup_invite_rate_limit.sql` foi inspecionada:
- Cria `public.upstatus_setup_invite_rate_limits` com RLS.
- Revoga privilégios de PUBLIC, anon e authenticated; concede DML somente a service_role.
- RPC `consume_upstatus_setup_invite_rate_limit(text, integer, integer)` usa SECURITY INVOKER e `search_path=''`.
- EXECUTE é revogado de PUBLIC/anon/authenticated e concedido somente a service_role.
- A aplicação limita a cinco emissões por administrador por janela de 900 segundos e falha fechado se a RPC falhar.

O handler chama o limiter antes de ler o corpo. Contudo, a resposta 429 não inclui `Retry-After`. O contrato 409 de #163 é outro fluxo e não supre essa lacuna.

**Correção de precisão em relação ao checkpoint anterior:** o `release.json` da #161 declara 3.4.7 estável e o workflow candidato exige exatamente 3.4.7; esses dois valores estão alinhados. Não há evidência nesta execução de conflito de versão dentro da #161.

## Supabase — disponibilidade e isolamento

Ambos os projetos reportam `ACTIVE_HEALTHY`, mas isso não comprova disponibilidade das Edge Functions.

Janela de logs consultada: 2026-11-14 16:30 UTC a 2026-11-15 16:30 UTC.

| Projeto | Edge log 402 | Gateway 402 | Último registro |
|---|---:|---:|---|
| Produção | 88 | 6 | 2026-11-14 20:57:39.868 UTC |
| Laboratório | 19 | 0 | 2026-11-14 17:10:45.867 UTC |

**Laboratório:** o log do workflow [43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) contém a resposta explícita `exceed_edge_functions_invocations_quota` e informa que o projeto foi restringido por excesso de invocações de Edge Functions. A causa do bloqueio de laboratório está confirmada.

**Produção:** os 94 HTTP 402 estão confirmados nos logs, mas os registros não incluem o marcador de quota e não comprovam a causa. Não atribuir a falha de produção ao mesmo motivo do laboratório. Não há requisições posteriores no recorte consultado que comprovem recuperação.

## Runtimes implantados e Edge Functions

Produção:
- 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false` no nível da plataforma. Isso, isoladamente, não prova ausência de autenticação: os handlers principais implementam sessão própria por token.
- `upstatus` v480, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite` v15, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10` v6.
- `upstatus-test` v281 permanece ACTIVE em produção.

Os userscripts embutidos são Normal 3.4.7 e Team Lite 3.4.30. Normal aponta update/download para `upstatus` e ainda contém endpoint beta10; Team Lite usa `upstatus-team-lite` e atualizador raw da branch oficial. Nenhum dos dois bundles contém `private:true` ou `realtime.setAuth()`. Nenhum contém referência ao RPC de rate limit de setup-invite.

Laboratório:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.
- Não existe função de sinalização server-mediated equivalente implantada em produção.

O runtime de sinalização v32 inclui `Retry-After` para seu rate limit e mapeia `VOICE_ATTEMPT_CONFLICT`/ `ROOM_FULL` para 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`, esperado pelo contrato candidato #163.

## Realtime, RLS, grants, SECURITY DEFINER e Storage

Produção:
- Snapshot recente de `realtime.messages`: 106 eventos, todos `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; tipos `db_change`, `remote_command`, `remote_result` e `user_status`.
- Dez tabelas public com RLS e sem policies.
- 126 grants diretos de tabela para anon/authenticated; 18 privilégios TRUNCATE.
- 24 registros de default ACL.
- Security Advisor: 10 INFO de RLS sem policy e três funções SECURITY DEFINER sinalizadas para anon e authenticated: `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, `upstatus_broadcast_users()`. As três ainda usam `search_path=public`.
- Buckets `chat-images` e `profile-images` públicos, com 168 e 20 objetos; ambos têm limite de 20 MiB e `storage.objects` não tem policies próprias.

Laboratório:
- 18 tabelas public com RLS sem policies; zero grants diretos de cliente nas tabelas public.
- Oito grants de cliente no schema realtime e 32 no schema storage.
- 25 registros de default ACL.
- A tabela de rate limit e a RPC existem; a tabela não tem policies nem grants de cliente. A RPC tem ACL para postgres/service_role e search_path vazio.
- Zero buckets Storage.

Não foi reproduzido acesso externo nem exploração de broadcast. O risco de Realtime é confirmado na configuração e nos bundles instalados, não por uma demonstração de exploit.

## Workflows de publicação

### Team Lite produção

Arquivo em `team-lite-official`: `.github/workflows/deploy-production.yml`, blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`.

- Lê o `release.json` da raiz: versão 3.0.40, preRelease beta.22.
- O guard rejeita pre-release; portanto o workflow atual falha fechado antes do deploy.
- Usa Supabase CLI `latest`.
- Usa `SUPABASE_PROJECT_ID` de secret sem comparação com ID esperado.
- Publica `upstatus`, não `upstatus-team-lite`.

**Não despachar.** Retirar somente o guard não tornaria o workflow correto.

### Team Lite TEST

Arquivo em `develop`: `.github/workflows/deploy-test.yml`, blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`.

- Dispara em push para develop e manualmente.
- Usa o secret `SUPABASE_PROJECT_ID` sem validação contra o ID do projeto isolado.
- Usa CLI `latest`.
- Publica `upstatus-test`.

O destino efetivo do secret não foi lido nem confirmado.

### Normal

O workflow candidato na linha #161 mantém checkout por SHA, exige master, compara o projeto com `dlfvkawaiqduhlazsszm`, fixa CLI 2.122.1 e exige release estável 3.4.7. Ele publica `upstatus`. A candidata continua Draft; não foi despachada.

## Migrations e issues

Produção tem sete migrations aplicadas; a branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, com preview `ACTIVE_HEALTHY`.

Os quatro SQLs abaixo retornaram 404 na branch QA:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

O laboratório tem 39 migrations. Seu ledger contém `20261110000612_setup_invite_rate_limit_contract_test`, mas não registra a versão candidata `20261109230000`; a existência atual da tabela/RPC no catálogo não prova, por si só, a proveniência do SQL aplicado.

- Issue #78 permanece aberta, com 0/8 critérios físicos marcados.
- Issue #79 permanece aberta, com 16/35 itens marcados.
- Não foi possível executar testes manuais: sem checkout local, navegador com Tampermonkey ou dispositivos reais disponíveis.

## Gates reavaliados

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 106 eventos públicos e bundles instalados sem autenticação privada |
| TEST-ISOLATION | BLOCKED | quota Edge Functions bloqueia o Smoke do laboratório |
| MIGRATION-PROVENANCE | BLOCKED | quatro SQLs originais ausentes; ledger de produção com sete versões |
| AUTH-03 | BLOCKED | #161 passa em candidato, mas RPC ausente em produção e 429 sem Retry-After |
| ACL-STORAGE | BLOCKED | grants/ACL, SECURITY DEFINER e buckets públicos permanecem |
| RECONNECT | PENDING | testes físicos da #78 não executados |
| HUMAN-REVIEW | PENDING | PRs Draft sem review e sem autorização de Ricardo |

## Limites e integridade

- CI reportado acima é evidência de workflows já existentes; nenhum teste foi reexecutado nesta auditoria.
- Nenhum teste manual foi realizado.
- Não foram lidos secrets.
- Todas as consultas SQL foram SELECT-only.
- Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizado.
- A única escrita de repositório prevista nesta execução é este relatório novo na branch QA. O comentário QA existente da Issue #79 será atualizado sem criar duplicata e sem tocar no comentário da Engenharia.
