# Auditoria independente de QA — UpStatus

**Data:** 2026-11-10 12:32 UTC (09:32 BRT)  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## Parecer

**Recomendação: `not_ready`.** As suítes completas de PR das candidatas Normal #133 e Team Lite #134 passaram nos HEADs atuais, incluindo setup por convite, rate limits, chamadas WebRTC, voz, compartilhamento de tela, mesh e recuperação de salas. Isso valida código candidato em CI isolado, não o runtime implantado nem a aceitação física.

A produção continua com broadcasts Realtime públicos, permissões diretas e Default ACLs amplas, buckets públicos, setup antigo e workflows de publicação inseguros ainda presentes nas branches oficiais. O laboratório está isolado e limpo nas tabelas consultadas, mas suas Default ACLs ainda concedem privilégios amplos para objetos futuros e não há buckets Storage para validar o caminho real de upload.

Nenhuma alteração de produção foi realizada. Todas as consultas SQL foram SELECT/catálogo. Não houve migration, deploy, merge, release, alteração de secrets/flags, publicação de userscript ou operação destrutiva.

## 1. Heads reais, ancestralidade e governança

Heads confirmados na API de branches imediatamente antes do relatório:

| Branch | HEAD | Protegida |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | não |
| `qa/release-readiness-2026-11-04-master` | `ea8656a0be63f380cff2771d6d35b3bcb4a11a07` | não |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | não |
| `chore/continuity-foundation` | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | não |

Comparações atuais:

- QA vs master: 188 commits à frente, 1 atrás; branches divergidas.
- `chore/continuity-foundation` vs master: 883 à frente, 1 atrás.
- `team-lite/signaling-transport-candidate` vs team-lite-official: 378 à frente, 0 atrás.
- Normal #133 vs sua base: 14 à frente, 0 atrás.
- Team Lite #134 vs sua base: 10 à frente, 0 atrás.
- Recuperação documental #135 vs master: 1 à frente, 0 atrás.

As branches oficiais e a QA retornam `protected=false`. A listagem de rulesets consultada anteriormente não apresentou rulesets; não inferir outras configurações administrativas além do que a API retornou.

### PRs principais solicitadas

| PR | HEAD atual | Estado | Evidência atual |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | aberta, Draft, não merged | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) PASS; Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | aberta, Draft, não merged | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | aberta, Draft, não merged | Candidate Checks [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `ea8656a0be63f380cff2771d6d35b3bcb4a11a07` | aberta, Draft, não merged | Validate [42809247236](https://github.com/Reekyi/UpStatus/actions/runs/42809247236) FAIL |

PR #74 e #76 têm evidência de CI aprovada em seus HEADs. #75 é uma aprovação histórica do baseline, não uma nova execução desta rodada. Nenhuma dessas aprovações substitui a validação das candidatas combinadas #133/#134.

### Candidatas complementares

- [#133 Normal](https://github.com/Reekyi/UpStatus/pull/133), HEAD `8d38036ead5e1c3c9cc00db9791f8c9de093ba62`, aberta/Draft:
  - API Target Validate [42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) PASS.
  - Signaling Smoke [42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) PASS.
- [#134 Team Lite](https://github.com/Reekyi/UpStatus/pull/134), HEAD `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5`, aberta/Draft:
  - Candidate Checks [42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) PASS.
  - Call Source Guard [42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) PASS.
- [#135 recuperação de migrations](https://github.com/Reekyi/UpStatus/pull/135), HEAD `98e96cfe59b0db585fd4a322736cbfdd12484ba0`, aberta/Draft:
  - Validate [42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) FAIL no validator herdado.
  - Supabase Preview não foi executado; nenhum SQL foi aplicado.

As PRs #74, #75, #76, #82, #133, #134 e #135 não têm reviews humanas registradas na consulta desta rodada.

## 2. CI: o que foi realmente aprovado

### Normal #133

Os logs do Smoke PR-triggered confirmam:

- 136/136 verificações de integração autenticadas.
- WebRTC de chamada, entrega de áudio remoto e encerramento dos peers.
- Voz e compartilhamento de tela em navegador Chromium.
- Mesh de três participantes e teardown.
- Testes de sala de voz, handoff de proprietário, aliases Normal/Team Lite e tentativas concorrentes.
- Rate limit do endpoint de sinalização: 90 aceitas e uma rejeitada com HTTP 429 e Retry-After.
- Concorrência de recibos de leitura do chat.
- Setup por convite: tokens inválidos, expirados, reutilizados, concorrência com um único vencedor, normalização de papel e limpeza.
- Rate limit distribuído de emissão de convites e isolamento de buckets por administrador.
- Fixtures temporárias limpas ao final.

O Validate da #133 também passou no mesmo HEAD. O build candidato alinha o endpoint Normal ao slug `upstatus` e valida `release.json.scriptUrl`.

### Team Lite #134

Os logs do Candidate Checks PR-triggered confirmam:

- 110/110 verificações de integração autenticadas.
- Playwright Full-IIFE com browser offline e stubs de Tampermonkey.
- WebRTC de chamada, voz e compartilhamento de tela.
- Mesh de três participantes e teardown.
- Rate limit de sinalização e de convites.
- Setup por convite e limpeza.
- Recuperação de salas, tentativas de voz, serialização de saída, retry, pagehide/reload e preservação de contexto offline/online.

O guard de proveniência de chamada também passou. O evento PR-triggered executou a suíte completa; não depende apenas do push da branch.

### Limite da evidência de teste

Esses resultados são CI remoto, com o projeto isolado de sinalização/autenticação. Playwright e stubs de Tampermonkey não equivalem a instalação física no Sale Smartly/Tampermonkey nem a uma queda real de internet. Não executei testes locais nesta rodada.

## 3. Proveniência dos sinais e transporte autenticado

As candidatas #133/#134 removem a confiança em um marcador controlável pelo remetente dentro do payload. A origem autenticada é passada fora da mensagem; o listener público é tratado como não confiável; a allowlist pública fica limitada a hints de presença/encerramento. Offer, answer, ICE e `join_declined` precisam do caminho autenticado.

Há uma limitação ainda aberta: nos templates candidatos, `signaling_transport_enabled` continua com default `false`, e `signaling_transport_endpoint` começa vazio. O caminho autenticado não é o padrão do cliente; o caminho legado de descoberta pública continua ativo até existir endpoint server-mediated implantado e um cutover aprovado.

Assim, os testes de origem autenticada aprovados não concluem RT-01. O cliente candidato está preparado para opt-in, mas produção não foi migrada.

## 4. Falha atual da QA #82

O workflow [42809247236](https://github.com/Reekyi/UpStatus/actions/runs/42809247236) falhou no HEAD exato `ea8656a0`:

`VALIDATION FAILED: production updateURL mismatch`

Origem: `scripts/validate.mjs:26`.

A inspeção de `master` confirmou que `scripts/build.mjs` ainda define o destino API Normal legado beta10, enquanto `release.json` aponta para `/functions/v1/upstatus/upstatus.user.js`. A validação da candidata #133 contém o alinhamento, mas essa correção não está integrada em master/QA. Não relaxar o validator; alinhar build, manifest e função publicada.

A branch QA está 188 commits à frente e 1 atrás de master. Não fiz rebase nem sobrescrevi commits concorrentes.

## 5. Workflows de publicação e isolamento

### Normal

O workflow de produção em master continua com `workflow_dispatch`, secrets de produção, environment `production`, Supabase CLI `latest` e deploy de `upstatus`, sem guard equivalente de ref/SHA/projeto.

A candidata Normal #133 adiciona:
- checkout do SHA exato;
- exigência de `refs/heads/master`;
- comparação entre checkout e `GITHUB_SHA`;
- comparação do project ID com o projeto de produção esperado;
- CLI Supabase pinada em 2.122.1;
- validação do release estável.

A candidata é Draft e não foi integrada. Nenhum dispatcher foi executado.

### Team Lite

A branch `team-lite-official` ainda contém workflow manual que:
- carrega secrets de produção;
- usa CLI `latest`;
- não valida adequadamente a ref/projeto;
- executa `supabase functions deploy upstatus`, slug do Normal, não `upstatus-team-lite`.

A [PR #129](https://github.com/Reekyi/UpStatus/pull/129), HEAD `886d364d0c43af0d8aed867bf04c407478af5e8f`, substitui esse dispatcher por um guard fail-closed sem secrets nem capacidade de deploy. O CI PR [42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) passou, mas a PR continua Draft e não integrada. O workflow inseguro permanece na branch oficial até a correção ser integrada.

### TEST

O workflow `deploy-test.yml` em master continua manual, usa `SUPABASE_PROJECT_ID` genérico, CLI `latest` e deploy de `upstatus-test`, sem exigir um projeto TEST dedicado. O projeto de produção atualmente contém uma Edge Function `upstatus-test` v281.

A branch Team Lite oficial ainda tem uma variante do workflow TEST com gatilho push em `develop` e o mesmo project ID genérico.

A [PR #84](https://github.com/Reekyi/UpStatus/pull/84), Draft, propõe exigir `vars.SUPABASE_TEST_PROJECT_ID`, ref `develop`, SHA exato, project ID diferente de produção e do projeto fixture, CLI pinada e verificação pela Management API. Não foi integrada.

## 6. Fotografia read-only do Supabase

### Projetos e migrations

| Projeto | Estado | Migrations | Edge Functions |
|---|---|---:|---:|
| Produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 7 | 38 |
| Laboratório `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 39 | 2 |

A branch Supabase `main` da produção permanece `MIGRATIONS_FAILED`. O laboratório não tem branches gerenciadas adicionais. A organização tem apenas esses dois projetos; não há projeto full-product TEST independente.

### Edge Functions implantadas

Produção:
- `upstatus` v480.
- `upstatus-team-lite` v15.
- `upstatus-screen-share-3-1-1-beta10` v6.
- `upstatus-test` v281.
- 38 funções ativas no inventário; `verify_jwt=false` no metadata de todas. Isso não prova, isoladamente, ausência de autenticação: os runtimes principais têm autenticação customizada por token. Não auditei individualmente todos os 38 handlers.

Laboratório:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.

Não há `upstatus-signal` implantada em produção.

Os quatro runtimes de produção inspecionados (`upstatus`, `upstatus-team-lite`, Screen Share beta10 e `upstatus-test`) ainda encaminham `POST /api/setup` para `login(req,true)`. Consulta de catálogo confirmou que produção não possui a tabela `upstatus_setup_invite_rate_limits`, RPCs de consumo de convite/rate limit nem colunas de token de setup em `public.users`.

O Screen Share beta10 v6 embute um userscript identificado como beta8 e com updateURL apontando para o slug beta8, divergência de artefato que permanece no runtime implantado.

## 7. Realtime e triggers

A consulta em `realtime.messages` encontrou 39 mensagens nas últimas 24 horas, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:

| Evento | Mensagens |
|---|---:|
| db_change | 20 |
| user_status | 13 |
| remote_command | 3 |
| remote_result | 3 |

As definições atuais dos triggers confirmam:
- `upstatus_broadcast_messages` publica `to_jsonb(NEW/OLD)`, isto é, a linha inteira, como `db_change`, com argumento `private=false`.
- `upstatus_broadcast_remote_state` publica campos de comando/resultado como broadcasts públicos.
- `upstatus_broadcast_users` publica os campos de presença/status como broadcast público.

Os três triggers são funções `SECURITY DEFINER`, com `search_path=public`. O catálogo confirma EXECUTE para `anon` e `authenticated`; o Security Advisor retornou três WARN para anon e três para authenticated. As funções retornam `trigger`; não alego uma execução RPC direta demonstrada.

Nenhum dos bundles de produção inspecionados usa `private:true` ou `realtime.setAuth()`. O transporte server-mediated ainda não está implantado como padrão.

## 8. RLS, grants, Default ACL e Storage

### Produção

- 10 tabelas de `public` com RLS habilitado e zero policies.
- 9 dessas tabelas concedem privilégios diretos amplos a `anon` e `authenticated`, incluindo SELECT, INSERT, UPDATE, DELETE e TRUNCATE.
- `upstatus_visual_config` é a exceção sem esses grants diretos.
- `storage.objects` tem RLS habilitado, zero policies e grants diretos de SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
- `realtime.messages` concede SELECT/INSERT/UPDATE a anon/authenticated.
- Security Advisor: 10 INFO de RLS sem policy; 3 WARN para anon e 3 WARN para authenticated em funções SECURITY DEFINER.
- Os Default ACLs de `postgres` em `public` e `storage`, e de `supabase_admin` em `public`, concedem privilégios padrão amplos a anon/authenticated para tabelas, funções e sequências futuras.

Buckets:
- `chat-images`: público, 20 MiB.
- `profile-images`: público, 20 MiB.

### Laboratório

- 18 tabelas públicas com RLS e sem policies, refletidas como INFO pelo Advisor.
- As tabelas de produto consultadas não concedem privilégios diretos a anon/authenticated.
- RPCs de convite/sinalização consultadas usam `SECURITY INVOKER`, `search_path=""` e EXECUTE somente para `service_role`.
- Funções de trigger de broadcast no laboratório permanecem SECURITY DEFINER, mas com `search_path=""` e EXECUTE negado a anon/authenticated.
- **Novo achado:** Default ACLs do laboratório ainda são amplas para objetos futuros: `postgres` em `storage` e `supabase_admin` em `public` concedem privilégios a anon/authenticated para tabelas, funções e sequências. A ausência de grants diretos nas tabelas atuais não resolve a herança para objetos futuros.
- Zero linhas nas 11 tabelas de fixtures consultadas; `realtime.messages` tem zero linhas.
- `storage.buckets` tem zero buckets.

O laboratório está limpo para os testes de sinalização/autenticação, mas não cobre upload real em Storage e ainda precisa corrigir Default ACLs antes de ser considerado totalmente endurecido para novos objetos.

## 9. Recuperação das quatro migrations

A PR #135 arquiva os quatro statements em `docs/migration-recovery/`, fora de `supabase/migrations/`.

Comparei cada arquivo com o statement correspondente em `supabase_migrations.schema_migrations` de produção. Os quatro textos são iguais após trim:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Cada registro do ledger contém um statement e `rollback IS NULL`. O README da PR documenta corretamente que os arquivos são recuperações dos statements executados, não os originais byte a byte; comentários, formatação e commit/blob original não são provados. A PR continua Draft e seu Validate falhou no validator herdado. Nenhum arquivo foi copiado para a pasta de migrations e nenhum SQL foi executado.

## 10. Aceitação física e issues

[Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta com 0/8 critérios marcados. Os oito critérios incluem recuperação Normal/Team Lite sem F5, reentrada em sala, novas chamadas, ausência de peers/áudio/polling duplicados e teste manual no navegador. CI de offline/online e pagehide/reload não substitui a queda física de internet.

[Issue #79](https://github.com/Reekyi/UpStatus/issues/79) mantém corpo histórico com 16/35 checkboxes marcados. Atualizei somente o comentário QA dedicado identificado por `<!-- UPCONTROL:QA -->`; o comentário da Engenharia foi preservado. A consulta final encontrou um comentário QA e um comentário da Engenharia, sem duplicatas.

## 11. Documento de prontidão

O blob de `docs/RELEASE_READINESS.md` na branch QA continua `7cfbd70886df42ce790c078c224b19284a632595`, tamanho 1.055.655 bytes. Nesta execução, o GitHub connector retornou conteúdo vazio para as faixas solicitadas (linhas 1–180, 8100–8410 e 1–30 em base64). Portanto, não afirmo ter relido o arquivo integralmente nesta rodada. O relatório QA anterior registra a leitura integral de 1.045.105 caracteres/8.410 linhas e continua sendo a referência disponível. Também li o relatório QA anterior de 11:34 UTC e o README de recuperação de migrations.

## 12. Gates e próximos passos

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcasts públicos em produção; transporte autenticado desligado por padrão e sem cutover. |
| TEST-ISOLATION | in_progress | Laboratório limpo e isolado, mas sem Storage e com Default ACLs amplas para objetos futuros; não há full-product TEST. |
| MIGRATION-PROVENANCE | in_progress | Statements recuperados e comparados com ledger, mas não são originais byte a byte e rollback é NULL. |
| AUTH-03 | in_progress | CI de convite/rate limit aprovado nas candidatas; produção ainda não tem schema/RPC/fluxo novo. |
| ACL-STORAGE | blocked | Grants, Default ACLs, RLS sem policies e buckets públicos persistem em produção. |
| RECONNECT | pending | Falta teste físico de Ricardo sem F5. |
| HUMAN-REVIEW | pending | PRs seguem Draft/sem review e não há autorização explícita de release. |

Prioridades:
1. Integrar e revisar #133/#134, mantendo a suíte completa como check obrigatório de PR.
2. Corrigir o validator QA sem enfraquecer a comparação entre release manifest, build e endpoint.
3. Corrigir Default ACLs no laboratório e criar/provisionar um full-product TEST antes de qualquer deploy TEST.
4. Planejar cutover Realtime server-mediated, com remoção do broadcast público de dados de mensagens/comandos e autorização explícita.
5. Integrar AUTH-03 e migrations somente após revisão de proveniência e plano de rollout/rollback.
6. Revogar grants/default privileges excessivos, definir policies ou manter tabelas fora do schema exposto, e revisar Storage/buckets.
7. Integrar guards #129 e #84; não executar dispatchers legados.
8. Depois dos bloqueadores de integração/segurança, executar os oito critérios físicos da Issue #78 e obter aprovação humana.

**Veredito final: `not_ready`.** O CI das candidatas melhorou de forma verificável; produção, segurança, publicação, aceitação física e aprovação humana ainda não estão prontas.
