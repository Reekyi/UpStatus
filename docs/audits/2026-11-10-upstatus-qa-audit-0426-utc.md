# Auditoria independente de QA do UpStatus — 10/11/2026 04:26 UTC

## Resultado executivo

**Recomendação: `not_ready`.** A Engenharia corrigiu a paridade do tópico Realtime nos dois candidatos: o build Normal, o bundle Team Lite e os triggers SQL candidatos agora usam o mesmo tópico, e os workflows PR-triggered dos dois HEADs passaram. Isso resolve a divergência entre os candidatos, mas **não corrige a produção**: os runtimes implantados ainda escutam tópicos antigos, os broadcasts continuam públicos (`private=false`) e o transporte autenticado continua opt-in/desligado por padrão.

Também permanecem o primeiro setup legado sem convite nos runtimes implantados, grants/Default ACLs amplos, Storage público, quatro migrations originais ausentes, workflow Team Lite apontando para o slug Normal e aceitação física 0/8.

Esta rodada usou inspeção read-only do GitHub e Supabase, leitura de logs de Actions já concluídos e consultas SQL SELECT-only. Não executei testes locais, navegador manual ou Tampermonkey. Não houve escrita no Supabase, deploy, merge, release, publicação, alteração de secrets/flags ou operação destrutiva.

## 1. Documento de referência

Li o conteúdo integral de `docs/RELEASE_READINESS.md` na branch QA:
- Blob: `7cfbd70886df42ce790c078c224b19284a632595`.
- 1.045.105 caracteres e 8.410 linhas.
- O último checkpoint registrado no documento principal é de 08/11/2026 às 18:30 UTC; portanto, o arquivo está desatualizado em relação aos heads e workflows desta rodada.
- O documento principal foi preservado. Este relatório é um arquivo novo.

## 2. Heads e ancestralidade

| Escopo | Branch / HEAD observado | Comparação |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | referência |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | referência |
| QA | `qa/release-readiness-2026-11-04-master` / `9bbe60360387faa21e45a4c7386c8482a6cb249a` | 178 commits à frente, 1 atrás de master |
| PR #74 Normal | `chore/continuity-foundation` / `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | 883 à frente, 1 atrás de master |
| PR #75 Team Lite baseline | `team-lite/3.4.31-guest-fixes` / `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 à frente, 0 atrás de team-lite-official |
| PR #76 Team Lite candidate | `team-lite/signaling-transport-candidate` / `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | 378 à frente, 0 atrás de team-lite-official |
| PR #82 QA | `qa/release-readiness-2026-11-04-master` / `9bbe60360387faa21e45a4c7386c8482a6cb249a` | 178 à frente, 1 atrás de master |
| PR #130 AUTH-03 Normal | `feat/normal-setup-invite-rate-limit-20261109` / `a6c32324e6fe17a0783bad09637131d7893285fd` | 12 à frente, 2 atrás da base `afc69bc41c283ff34cb87bfc5b9a1ab94cffe0bf` |

Não fiz rebase. A #130 está divergida da base e precisa de reconciliação e nova validação no resultado integrado. A #74 também é uma branch longa e divergida; revisar a ancestralidade antes de integrar. #75 é baseline histórica; #76 é a linha Team Lite ativa.

## 3. CI, inspeção e revisão humana

| PR | Evidência no HEAD exato | Classificação |
|---|---|---|
| #74 Normal | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Signaling Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336), evento `pull_request`, ambos SUCCESS | **PR CI PASS** |
| #75 Team Lite | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico**, não substitui #76 |
| #76 Team Lite | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373), evento `pull_request`, SUCCESS | **PR CI PASS** |
| #82 QA | [Validate 42750584972](https://github.com/Reekyi/UpStatus/actions/runs/42750584972), evento `pull_request`, FAILURE | **PR CI FAIL** |
| #130 AUTH-03 Normal | [Signaling Smoke 42741601731](https://github.com/Reekyi/UpStatus/actions/runs/42741601731), evento `pull_request`, SUCCESS | **PR workflow PASS**, mas SHA divergido da base |

### Resultados relevantes

**Normal #74 — HEAD `fb878537`**
- Validate passou, incluindo build-target guard e as assertions novas de paridade do tópico.
- Smoke passou: 136/136 verificações autenticadas; negociação WebRTC e entrega de faixa remota para chamada, voz e tela; mesh autenticada de três participantes e teardown; rate limit de sinalização; recibos de leitura atômicos; setup enrollment e cleanup.
- A etapa específica de emissão/rate limit de convites foi **SKIPPED** neste workflow porque o script de emissão pertence à PR empilhada #130. Não contar esse passo como testado pela #74.

**Team Lite #76 — HEAD `3b1406dd`**
- 16/16 verificações não autenticadas e 110/110 autenticadas.
- Chromium/Playwright executou o IIFE completo com endpoints inertes e stubs de Tampermonkey/Supabase; isso é teste automatizado, não instalação física.
- WebRTC de chamada, voz e tela, entrega de faixas, mesh de três participantes e teardown passaram.
- O teste de emissão de convites passou no laboratório: 24 chamadas no primeiro bucket (5 permitidas, 19 bloqueadas), 6 no segundo (5 permitidas, 1 bloqueada), isolamento dos buckets e cleanup.
- Os contratos de recuperação de voz, logout, rejoin e updater passaram.

**Normal #130 — HEAD `a6c3232`**
- O Smoke passou, incluindo o teste distribuído de emissão de convites e cleanup no laboratório.
- A PR continua Draft e está 12 commits à frente / 2 atrás da base declarada. O PASS pertence ao SHA candidato, não substitui a validação após reconciliar a divergência.

**QA #82 — HEAD `9bbe603`**
- Validate falhou em `scripts/validate.mjs:26`: `VALIDATION FAILED: production updateURL mismatch`.
- Não alterei o validator e não iniciei rerun.
- O novo HEAD documental da QA não possui check separado além do Validate da #82 que falhou nesse mesmo SHA.

**Revisão humana**
- A consulta de reviews retornou zero reviews para #74, #75, #76, #82 e #130.
- CI verde não equivale a aprovação humana.

## 4. Paridade Realtime nos candidatos: correção validada

A divergência que existia entre o Normal e o Team Lite candidato foi corrigida pela Engenharia e verificada independentemente:

- `scripts/build.mjs` na linha Normal declara `PROD_TOPIC="upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0"`.
- O bundle `team-lite/upstatus-team-lite.user.js` no HEAD #76 declara o mesmo valor em `UP_REALTIME_TOPIC`.
- As migrations candidatas de chat, status e remote-state usam o mesmo tópico.
- O commit [fb878537](https://github.com/Reekyi/UpStatus/commit/fb878537d95db9097cce6d29a14260b9fd8d2e3d) adiciona assertions no Validate Normal para comparar build, userscript gerado e migrations SQL.
- O commit [3b1406dd](https://github.com/Reekyi/UpStatus/commit/3b1406ddb56aecfa5b5515791ca99aea92c305ab) adiciona assertion no Candidate Check Team Lite para comparar o bundle com `PROD_TOPIC`.
- Os dois workflows PR-triggered passaram nos respectivos HEADs.

**Limite:** as migrations candidatas ainda chamam `realtime.send(..., false)`. Os payloads candidatos de chat/status/remote-state foram reduzidos a hints de operação, mas o canal continua público. Além disso, `signaling_transport_enabled` é `false` por padrão e o endpoint começa vazio nos dois clientes. O caminho autenticado continua opt-in; a paridade de tópico não fecha RT-01.

## 5. Produção: runtimes, Realtime e Edge Functions

Management API e fonte implantada foram inspecionadas:

| Função implantada | Versão da função | Userscript embutido |
|---|---:|---|
| `upstatus` | v480 | 3.4.7 |
| `upstatus-team-lite` | v15 | 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | 3.1.1-beta8 |

Os userscripts Normal e Team Lite implantados ainda assinam `upstatus-screen-share-live-3-1-1-beta10`; o userscript embutido na função Screen Share beta10 ainda assina `upstatus-screen-share-live-3-1-1-beta8`. Nenhum dos três usa `private:true` ou `realtime.setAuth()`.

Os triggers PostgreSQL de produção publicam no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Portanto, **o candidato está alinhado, mas os runtimes implantados continuam divergentes do tópico dos triggers**. Isso indica risco de perda de atualização entre banco e clientes; não fiz teste de entrega em navegador nem exploração externa.

Consulta SELECT-only de `realtime.messages`, janela de 24 horas:
- 20 `db_change`
- 13 `user_status`
- 3 `remote_command`
- 3 `remote_result`
- **39/39 com `private=false`**, todos no tópico `upstatus-live-6f5e7b31-...`.

As três funções de trigger `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam `SECURITY DEFINER`, `search_path=public` e EXECUTE efetivo para `anon`, `authenticated` e `service_role`. A função de mensagens serializa OLD/NEW com `to_jsonb`, incluindo a linha completa; a função remote-state transmite metadados de comando/resultado. O Security Advisor observou 3 WARN para `anon`, 3 WARN para `authenticated` e 10 INFO de RLS sem policy.

A função beta10 v6 embute userscript beta8. A lista de produção contém 38 Edge Functions ACTIVE, todas reportando `verify_jwt=false`; isso isoladamente não prova ausência de autenticação. Os três runtimes principais usam autenticação própria por token, mas esta rodada não auditou individualmente todos os 38 handlers. Não há função `upstatus-signal` na produção; `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 existem apenas no laboratório.

## 6. AUTH-03 e upload

Nos três runtimes implantados, `POST /api/setup` continua encaminhando para `login(req,true)`. O primeiro setup legado permanece sem consumo de convite. Produção não possui as colunas `setup_token_*`, RPC de consumo de convite nem tabela de rate limit de emissão.

Nos candidatos:
- O consumo de convite de uso único e o rate limit distribuído de emissão passaram em testes isolados.
- A #130 cobre emissão de convites, não demonstra proteção equivalente para tentativas de login.
- A #130 continua divergida da base e Draft; a implementação não foi implantada.

Inspeção estática do Normal v480:
- `signedUploadRoute` valida MIME e tamanho declarados pelo cliente e cria URL assinada sem inspecionar os bytes do arquivo.
- O helper legado `sniffMime` reconhece algumas assinaturas, mas termina com `return declared`; tipos de documento/texto podem ser aceitos pelo MIME declarado.
- Não reproduzi upload malicioso. Trata-se de inspeção de código.

## 7. RLS, grants, Default ACLs e Storage

SELECT-only em produção confirmou:
- 10 tabelas públicas com RLS habilitado e zero policies.
- 9 dessas tabelas têm grants efetivos amplos para `anon` e `authenticated`, incluindo SELECT/INSERT/UPDATE/DELETE e TRUNCATE; `upstatus_visual_config` é a exceção sem esses grants.
- 24 registros de Default ACL, contendo 75 itens de ACL. Defaults de `postgres` em `public` e `storage` concedem privilégios a `anon` e `authenticated`; defaults de `supabase_admin` também incluem `public`, `graphql` e `graphql_public`.
- `realtime.messages`: RLS habilitado, zero policies; `anon` e `authenticated` têm SELECT/INSERT/UPDATE efetivos.
- `storage.objects`: zero policies; grants de SELECT/INSERT/UPDATE/DELETE para `anon` e `authenticated`.
- Buckets `chat-images` e `profile-images` públicos, cada um com limite de 20 MiB.

A ausência de policy RLS limita operações de linha, mas os grants/defaults continuam excessivos e os buckets públicos permitem leitura por URL pública. Não alterei policies, grants, ACLs ou buckets.

## 8. Migrations e isolamento

Produção:
- Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY.
- 7 migrations remotas; a mais recente é `20261027155438`.
- A branch gerenciada `main` continua `MIGRATIONS_FAILED`.
- Os quatro arquivos SQL originais abaixo retornam 404 em `master`:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

Laboratório:
- Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, 39 migrations.
- Contém `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- A migration de contrato isolado de rate limit `20261110000612` está no ledger do laboratório; a migration candidata de produção `20261109230000` não consta como migration remota aplicada.
- Após os workflows, SELECT-only confirmou zero linhas em 12 tabelas de fixtures (users, messages, sessions, rooms, memberships, bindings, events, signaling rate limits, setup-invite rate limits, call attempts, voice attempts e chat reads) e zero linhas em `realtime.messages`.
- A organização possui somente os projetos Produção e laboratório. Não existe ambiente full-product TEST independente.

## 9. Workflows, branches e issues

O workflow oficial `.github/workflows/deploy-production.yml` em `team-lite-official` continua com `workflow_dispatch`, environment `production`, secrets de produção, Supabase CLI `latest` e comando `supabase functions deploy upstatus`. O slug `upstatus` é o Normal, não `upstatus-team-lite`. **Não despachar.** A PR #129 propõe um guard fail-closed, mas continua Draft e não foi integrada.

A API de branch retornou `protected=false` para `master` e `team-lite-official`. Não inferi estado de rulesets além do que foi consultado.

- Issue #78 continua OPEN, 0/8 critérios físicos. Última atualização: 08/11/2026 07:04 UTC. Nenhum teste físico Tampermonkey foi realizado nesta rodada.
- Issue #79 continua OPEN; o corpo ainda mostra 16/35 itens e está desatualizado em relação aos comentários recentes.
- O comentário QA dedicado é o comentário existente #6744331652. O comentário da Engenharia #6744711778 foi preservado. Não criei comentários duplicados.
- Reviews humanas nas PRs #74, #75, #76, #82 e #130: zero.

## 10. Gates desta rodada

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | **blocked** | Produção continua com broadcasts públicos, tópico dos clientes implantados divergente dos triggers e transporte autenticado opt-in. |
| TEST-ISOLATION | **in_progress** | Laboratório limpo e isolado, mas não há projeto full-product TEST. |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes de master; branch gerenciada main MIGRATIONS_FAILED. |
| AUTH-03 | **in_progress** | Rate limit de emissão passou nos candidatos; runtimes implantados continuam no setup legado. |
| ACL-STORAGE | **blocked** | RLS sem policies, grants/default ACLs amplos, Storage público e sem policies. |
| RECONNECT | **pending** | Issue #78 permanece 0/8; exige teste físico sem F5 confirmado por Ricardo. |
| HUMAN-REVIEW | **pending** | Nenhuma review humana nem autorização explícita de release. |

## Veredito

**NÃO LIBERAR.** A paridade de tópico foi corrigida e validada nos candidatos Normal e Team Lite. Isso é progresso real. Porém, a produção ainda executa bundles antigos, os broadcasts continuam públicos, o setup permanece legado, as permissões/Storage não foram endurecidos, a proveniência das migrations está incompleta e não há aceitação física nem revisão humana.

Nenhuma escrita SQL, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag, policy, grant, ACL ou bucket foi realizada. As consultas Supabase foram SELECT-only. A única escrita técnica desta rodada é este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.
