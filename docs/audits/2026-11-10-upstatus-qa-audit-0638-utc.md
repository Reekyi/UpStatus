# Auditoria independente de QA — UpStatus
**Data:** 2026-11-10 06:38 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** `not_ready`

## Escopo e método

Revalidação read-only de branches, PRs, workflows, logs de CI, issues, artefatos servidos pelas Edge Functions, catálogo PostgreSQL, migrations, Security Advisor e Storage. Nenhum teste físico foi executado. Não houve escrita SQL, migration, deploy, merge, release, alteração de secrets/flags ou publicação de userscript.

## Heads reais

| Ref | SHA | Observação |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | Atual; branch API informa `protected=false` |
| `qa/release-readiness-2026-11-04-master` | `8b08614c2ab7836afa91e7c8b340028be7e17e47` | HEAD da PR #82; 180 commits à frente e 1 atrás de master |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Atual; branch API informa `protected=false` |
| `chore/continuity-foundation` | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Base dos candidatos Normal e AUTH-03 |
| `fix/normal-api-runtime-target-20261110` | `5c4862309894358b47c0fba7fbd98e7b4efed4cc` | Candidata da PR #132 |

O master avançou para `9d40461`, cujo pai é `a9288cc`. A base registrada nas PRs #74 e #82 ainda é `a9288cc`, portanto esses candidatos estão um commit atrás do master atual. Não fiz rebase. A comparação QA ↔ master retorna 180 à frente e 1 atrás.

## PRs e CI

| PR | Base / HEAD | Evidência desta rodada | Resultado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | master / `fb878537` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS / PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | team-lite-official / `7bbf9b90` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | team-lite-official / `3b1406dd` | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | master / `8b08614` | [Validate 42763010808](https://github.com/Reekyi/UpStatus/actions/runs/42763010808) | FAIL |
| [#129 Deploy Guard](https://github.com/Reekyi/UpStatus/pull/129) | team-lite-official / `886d364d` | [Guard 42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) | PASS, Draft |
| [#130 AUTH-03 antigo](https://github.com/Reekyi/UpStatus/pull/130) | chore / `a6c3232` | [Smoke 42741601731](https://github.com/Reekyi/UpStatus/actions/runs/42741601731) | PASS no SHA anterior |
| [#131 AUTH-03 reconciliado](https://github.com/Reekyi/UpStatus/pull/131) | chore / `17169a30` | [Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | PASS |
| [#132 API target Normal](https://github.com/Reekyi/UpStatus/pull/132) | chore / `5c486230` | [Push validation 42766631808](https://github.com/Reekyi/UpStatus/actions/runs/42766631808) | FAIL no harness |

### Detalhes de CI

**Normal #74:** Validate e Smoke passaram no HEAD exato. O Smoke registrou 19/19 verificações não autenticadas e 136/136 autenticadas, WebRTC de chamada/voz/tela com faixas remotas, mesh de três participantes, teardown, rate limit de sinalização 90 aceitas + 1 HTTP 429, convite de uso único e limpeza. A etapa de rate limit de emissão de convites foi *skipped* nesse branch porque o harness está na PR empilhada #131; não contar como teste executado na #74.

**Team Lite #76:** Candidate Checks passou com 16/16 verificações não autenticadas, 110/110 autenticadas e 11/11 contratos HTTP. O workflow também executou o IIFE completo com Playwright, stubs offline de Tampermonkey/GM, WebRTC call/voice/screen, mesh de três participantes, rate limits, recibos atômicos, convite de uso único, rate limit de emissão de convites, isolamento de buckets e cleanup. Isso é CI isolado, não teste físico.

**AUTH-03 #131:** Smoke PR-triggered passou no SHA `17169a30`. Inclui teste concorrente de emissão de convites, buckets independentes, reset e cleanup. A migration e a implementação permanecem candidatas e não foram aplicadas à produção.

**QA #82:** Validate falhou no HEAD `8b08614` com `production updateURL mismatch`, em `scripts/validate.mjs:26`. O novo relatório documental não altera esse resultado; a branch ainda precisa de um Validate próprio depois de corrigida a asserção herdada.

**API target #132:** o patch de `scripts/build.mjs` troca o endpoint hardcoded beta10 por uma URL derivada de `PROJECT` e `PROD_FUNCTION`. `scripts/validate.mjs` agora verifica que o `CLOUD_SERVER` do userscript coincide com a função definida no build e com o slug do workflow de deploy. No run 42766631808, o guard de isolamento passou e o build gerou Normal 3.4.7 / TEST 3.4.7; a validação parou depois em `scripts/team-lite-updater.test.mjs`, que executa `git show origin/team-lite-official:team-lite/upstatus-team-lite.user.js`. O log registra `fatal: invalid object name 'origin/team-lite-official'`. O workflow usa checkout sem buscar explicitamente essa ref e só tem gatilho `push`, não um check PR-triggered. É falha do harness/checkout, não prova de defeito no novo alvo; a validação completa continua pendente. Recomenda-se buscar explicitamente `team-lite-official` (ou usar checkout com histórico/ref adequado) e adicionar gatilho `pull_request` para a base da PR.

### Tamanho e revisão

As PRs #74 e #76 são grandes: 883 commits/90 arquivos e 378 commits/56 arquivos, respectivamente. A #82 contém 180 commits/58 arquivos. PR #131 está 1 commit à frente e 0 atrás da base; #132 está 3 à frente e 0 atrás. Não encontrei reviews humanas nas PRs #74, #75, #76, #82, #129, #130, #131 ou #132. As branches `master` e `team-lite-official` retornam `protected=false`.

## Compatibilidade Normal / Team Lite

### Candidatos

- O build Normal define `PROD_FUNCTION="upstatus"` e o tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- O build Team Lite candidato verifica que o tópico literal do userscript coincide com `PROD_TOPIC`, que o cliente usa `/functions/v1/upstatus-team-lite` e que o build gera a função `upstatus-team-lite`.
- O template Team Lite candidato implementa setup por token de 64 caracteres, consumo atômico via `consume_upstatus_setup_invite` e rate limit de emissão via `consume_upstatus_setup_invite_rate_limit` (5 por administrador / 900 segundos).
- Os candidatos Normal e Team Lite passaram seus workflows isolados, mas o transporte autenticado continua opt-in e não houve publicação coordenada.

### Produção implantada

| Edge Function | Versão da função | Userscript embutido | CLOUD_SERVER embutido | Tópico Realtime |
|---|---:|---|---|---|
| `upstatus` | v480 | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` | `upstatus-screen-share-live-3-1-1-beta10` |
| `upstatus-team-lite` | v15 | 3.4.30 | `upstatus-team-lite` | `upstatus-screen-share-live-3-1-1-beta10` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | 3.1.1-beta8 | `upstatus-screen-share-3-1-1-beta8` | `upstatus-screen-share-live-3-1-1-beta8` |

Os três bundles implantados não usam `private:true` nem `realtime.setAuth()`. Os triggers PostgreSQL publicam no tópico novo `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Portanto, os clientes instalados ainda não estão no mesmo contrato de tópico do banco. A correção de tópico dos candidatos não foi publicada.

## Supabase — produção

Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, Postgres 17.11. Inventário: 38 Edge Functions ativas; as funções listadas reportam `verify_jwt=false`. Isso, isoladamente, não prova ausência de autenticação: os três runtimes principais inspecionados implementam sessão/token próprios. Não auditei individualmente todos os 38 handlers.

### AUTH-03 e setup

Os runtimes implantados Normal v480, Team Lite v15 e Screen Share beta10 v6 encaminham `POST /api/setup` para `login(req,true)`. O código atual não contém token de convite, RPC de consumo ou rate limit de convite/setup. SELECT no catálogo confirmou:
- `upstatus_setup_invite_rate_limits` não existe em produção;
- nenhuma coluna `setup_token_*` existe em `public.users`;
- nenhuma RPC pública com nome de setup-invite foi encontrada.

No Normal implantado, setup aceita conta sem `password_hash` e atribui `implementation_admin` por fallback nominal para Ricardo, Lohan e Guilherme. A senha mínima é seis caracteres no Normal e quatro no Team Lite implantado. Isso é risco latente do fluxo de primeiro acesso; não é evidência de conta atual sem senha.

### Realtime e SECURITY DEFINER

SELECT em `realtime.messages` encontrou **39 mensagens nas últimas 24 horas, todas `private=false`**, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

Os três triggers atuais são:
- `public.messages` → `upstatus_broadcast_messages`;
- `public.users` → `upstatus_broadcast_users`;
- `public.upstatus_state` → `upstatus_broadcast_remote_state`.

As três funções são `SECURITY DEFINER`, com `search_path=public`; `has_function_privilege` retorna EXECUTE para `anon` e `authenticated`. `upstatus_broadcast_messages` transmite `to_jsonb(NEW/OLD)` como payload `record`; remote state transmite metadados de comandos/resultados; users transmite status. As funções retornam `trigger`; não executei tentativa RPC nem exploração externa. O Security Advisor reporta três WARN para anon e três WARN para authenticated sobre essas funções.

### RLS, grants e Storage

SELECT de catálogo confirmou:
- 10 tabelas em `public` com RLS habilitado e sem policies;
- 9 tabelas com grants para `anon` e `authenticated`, incluindo `DELETE, INSERT, SELECT, TRUNCATE, UPDATE` e outros privilégios;
- `pg_default_acl`: 6 entradas e 24 itens;
- `storage.objects`: RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE/DELETE para anon e authenticated;
- buckets `chat-images` e `profile-images` públicos, cada um com limite de 20 MiB.

RLS sem policies nega acesso de linha via policies, mas não torna os grants excessivos necessários. Buckets públicos permitem leitura pública dos objetos. O upload assinado confia no MIME e tamanho declarados pelo cliente e gera URL assinada sem inspecionar bytes. O helper legado `sniffMime` retorna o MIME declarado quando não reconhece a assinatura. A rota de mídia antiga aceita até 25 MiB, enquanto os buckets estão limitados a 20 MiB.

### Migrations e branch gerenciada

Produção lista 7 migrations remotas. A branch gerenciada `main` está `MIGRATIONS_FAILED`. A listagem de `master/supabase/migrations` contém somente três SQLs:
- `20261005160000_upstatus_cloud.sql`
- `20261005173000_remote_realtime.sql`
- `20261005180000_client_presence.sql`

Os quatro SQLs remotos seguintes não estão no diretório de `master`:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruí SQL e não apliquei migration.

## Laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb`: `ACTIVE_HEALTHY`, 39 migrations, sem branches de desenvolvimento Supabase. SELECT confirmou zero linhas em 18 tabelas públicas do app e zero em `realtime.messages`; `storage.buckets` está vazio.

No laboratório, `upstatus_setup_invite_rate_limits` tem RLS, sem grants para anon/authenticated; EXECUTE da tabela fica com service_role. As RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` são `SECURITY INVOKER`, `search_path=""`, sem EXECUTE para anon/authenticated e com EXECUTE para service_role.

O laboratório está limpo e isolado, mas a conta possui apenas produção e esse laboratório de segurança; não há projeto full-product TEST independente.

## Issues e aceitação física

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, **0/8** critérios físicos marcados. Não houve teste instalado no Tampermonkey, queda física de internet, permissão real de microfone/tela ou teste físico Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): o corpo do checklist continua em 16/35; o comentário QA dedicado é a fonte mais recente do feed. A Engenharia tem comentário separado e foi preservado.

Playwright/Chromium e stubs GM do CI não substituem a aceitação física sem F5.

## Gates desta execução

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Triggers publicam tópico novo e clientes implantados assinam tópicos antigos; broadcasts observados são públicos |
| TEST-ISOLATION | in_progress | Laboratório separado e limpo, mas não existe full-product TEST |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs remotos ausentes do master; managed main em MIGRATIONS_FAILED |
| AUTH-03 | blocked | Rate limit de convite passa em candidato, mas schema/runtime de produção continuam legados; #132 ainda sem CI completo |
| ACL-STORAGE | blocked | Grants amplos, SECURITY DEFINER executável por papéis clientes e Storage sem policies |
| RECONNECT | pending | Nenhum teste físico; Issue #78 0/8 |
| HUMAN-REVIEW | pending | Nenhuma review humana ou autorização explícita de release |

## Próximas ações recomendadas

1. Corrigir o checkout/teste de updater no workflow #132 e adicionar gatilho PR; revalidar o SHA exato.
2. Manter Normal e Team Lite em Draft até cliente, função, tópico e workflow de publicação coincidirem no artefato final.
3. Planejar cutover Realtime autenticado/server-mediated, com teste trigger-to-client e remoção do broadcast público autoritativo.
4. Preparar hardening de grants/RLS/Storage e revisão das três funções SECURITY DEFINER em migration versionada, primeiro no laboratório.
5. Recuperar os quatro SQLs originais da fonte histórica; não reconstruir pelo schema.
6. Integrar setup por convite/rate limit no runtime efetivamente chamado pelos dois clientes e cobrir também throttling de login.
7. Depois de build integrado validado, executar os oito critérios físicos da Issue #78 e obter revisão humana explícita.

**Segurança desta rodada:** somente leituras no GitHub/Supabase. A única escrita foi este relatório novo na branch QA e a atualização do comentário QA dedicado na Issue #79.
