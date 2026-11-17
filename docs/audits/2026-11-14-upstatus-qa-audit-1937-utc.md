# UpStatus — auditoria independente QA
**Data:** 2026-11-14 19:37 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## Resultado executivo

**RELEASE: NOT READY.** Foram confirmados:
1. Três triggers de produção enviam broadcasts Realtime com `private=false`; o trigger de mensagens serializa a linha completa de `public.messages`.
2. Os clientes instalados Normal e Team Lite continuam em canais públicos sem `private:true`, sem `realtime.setAuth()` e sem autenticação verificável do emissor.
3. O backend server-mediated de sinalização não existe nas Edge Functions de produção nem nos templates atuais de servidor.
4. O workflow oficial Team Lite continua publicando a função errada (`upstatus`) e usa CLI `latest`.
5. O Validate da QA falha em `production updateURL mismatch`; os dois Validates da PR #167 falham em uma assertion estática de timestamp incompatível com o markup real.
6. O Smoke da PR #165 foi impedido por quota de invocações Edge Functions no projeto isolado (HTTP 402), antes dos testes autenticados.

Não houve teste manual de navegador, Tampermonkey, microfone, áudio ou compartilhamento de tela nesta execução.

## Classificação de evidências

- **AUTOMATED PASS:** workflow aprovado no HEAD exato indicado.
- **CI FAIL:** workflow executado e falhou; o motivo é descrito separadamente de falha de produto.
- **CODE INSPECTION:** fonte, bundle ou catálogo inspecionado estaticamente; não equivale a teste runtime.
- **MANUAL PENDING:** depende de navegador/dispositivo e aceitação humana.
- **BLOCKED:** dependência concreta impede a validação.
- **NOT VERIFIED:** evidência insuficiente ou limitada a laboratório.

## Heads e divergência

| Ref | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA / PR #82 antes deste relatório | `4aa7d7d7e0cda5e28af7623ee5dee01b015d9b72` |

Comparações atuais:
- QA: 317 commits à frente e 1 atrás de master.
- develop: 114 à frente e 147 atrás de master.
- team-lite-official: 220 à frente e 147 atrás de master.
- PR #74: 887 à frente e 1 atrás de master; HEAD `dcaf6a072546eda0089e0cee4018c3047011f600`.
- PR #75: 59 à frente e 0 atrás de team-lite-official; HEAD `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`.
- PR #76: 386 à frente e 0 atrás de team-lite-official; HEAD `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94`.
- PR #167: 13 à frente e 0 atrás de master; HEAD `53bd0f15391f5a8e563ab56b6e71266a738f2160`.

PRs #74, #75, #76 e #82 permanecem abertas/Draft e sem reviews humanas consultadas. PR #82 tinha 167 arquivos alterados, todos em `docs/`; nenhum caminho de runtime estava alterado. O relatório desta execução também é somente documental.

## PRs obrigatórias e CI

| PR | HEAD | Evidência | Resultado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a0` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | AUTOMATED PASS; o Smoke tem uma etapa de rate limit de emissão de convite ignorada |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b9` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico da baseline, não substitui #76 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | AUTOMATED PASS no candidato; não é aprovação física |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `4aa7d7d` | [Validate 43627228044](https://github.com/Reekyi/UpStatus/actions/runs/43627228044) | CI FAIL: `production updateURL mismatch` |
| [#165 Normal provenance](https://github.com/Reekyi/UpStatus/pull/165) | `4344787` | [Guard 43619663713](https://github.com/Reekyi/UpStatus/actions/runs/43619663713), [Smoke 43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) | Guard PASS offline; Smoke BLOCKED por HTTP 402 |
| [#166 Team Lite provenance](https://github.com/Reekyi/UpStatus/pull/166) | `e90e0db` | [Guard 43624572780](https://github.com/Reekyi/UpStatus/actions/runs/43624572780) | PASS offline; sem Smoke Supabase |
| [#167 updater/chat](https://github.com/Reekyi/UpStatus/pull/167) | `53bd0f1` | [Validate 43630541376](https://github.com/Reekyi/UpStatus/actions/runs/43630541376), [Validate 43630712950](https://github.com/Reekyi/UpStatus/actions/runs/43630712950) | CI FAIL nos dois runs |

### PR #82: causa do Validate

O builder de master usa `updateUrl=cloud+"/upstatus.user.js"`; `cloud` ainda aponta para a API beta10. Já o validator exige `/functions/v1/upstatus/upstatus.user.js`, que é o endereço estável em `release.json`. O userscript Normal efetivamente instalado já tem o `@updateURL` estável correto; o defeito está na geração do próximo artefato, não no header instalado.

A #167 propõe usar `release.scriptUrl` para a distribuição e manter o endpoint beta10 separado como API. A direção é correta, mas a PR ainda não passou no Validate.

### PR #167: nova falha de contrato de teste

Os dois runs falham em `scripts/chat-regression.test.mjs` com:
`CHAT REGRESSION FAILED: sent time appears with ticks`.

A assertion procura um wrapper `<span class="up-chat-own-meta">`; o template atual usa `<div class="up-chat-own-meta">` e contém `<span class="up-chat-own-time">` com `fmtTime(...)`, seguido do elemento de ticks. Isso é um mismatch estático do teste, não evidência de que o horário/ticks estejam ausentes em runtime. Corrigir a assertion para verificar a estrutura/semântica real; não alterar a UI apenas para satisfazer um seletor obsoleto.

A #167 também muda a UX de anexos: arquivos selecionados/colados ficam pendentes até o usuário enviar; em falha, arquivo, legenda e resposta são restaurados. A PR atualiza o contrato de teste para esse comportamento. Isso exige teste manual de seleção, envio, cancelamento e retry. O upload ainda usa URL assinada e `x-upsert:true`; não resolve os achados de Storage/ownership.

## Workflows

### Normal
O workflow candidato de #74 é manual-only, exige `master`, confere `github.sha` e o projeto de produção esperado, fixa Supabase CLI `2.122.1` e publica somente `upstatus`. É mais seguro que o workflow de master, mas não faz cutover coordenado do endpoint beta10/API.

### Team Lite
O workflow oficial `.github/workflows/deploy-production.yml` em `team-lite-official` (blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`) usa `SUPABASE_PROJECT_ID` genérico, Supabase CLI `latest` e executa:
`supabase functions deploy upstatus`.
O alvo de Team Lite deveria ser `upstatus-team-lite`. **Não despachar esse workflow.** O workflow de Candidate Checks da #76 é de teste isolado, não substitui um workflow de release seguro.

## Artefatos efetivamente servidos em produção

Inspeção das Edge Functions implantadas e decodificação dos userscripts embutidos:

| Função | Versão da função | Versão do userscript |
|---|---:|---:|
| `upstatus` | 480 | 3.4.7 |
| `upstatus-team-lite` | 15 | 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 |

- Normal `@updateURL`: `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js`.
- Team Lite `@updateURL`: URL raw da branch `team-lite-official`.
- Ambos assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Nenhum usa `private:true` ou `realtime.setAuth()`.
- Normal recebe `remote_command` e chama `executeRemoteCommand`; Team Lite faz o mesmo após verificar a sessão local. Essa verificação não autentica o emissor.
- Os handlers de `call_signal` também recebem payload público sem prova de origem autenticada.
- As funções core aceitam `x-upstatus-token` e validam sessão própria; portanto `verify_jwt=false` na plataforma não prova, isoladamente, ausência de autenticação.

Não existe função de sinalização server-mediated em produção. `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 existem somente no projeto isolado. Os templates Normal e Team Lite não contêm rotas `/api/signal` ou `/api/room`.

## Realtime e confidencialidade

Snapshot de produção observado em 2026-11-14 19:32 UTC:
- 106 eventos em 14 dias, todos `private=false`.
- 72 `user_status`, 26 `db_change`, 4 `remote_command`, 4 `remote_result`.
- Tópico dos triggers: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Tópico dos clientes: `upstatus-screen-share-live-3-1-1-beta10`; os tópicos não coincidem.

Triggers confirmados:
1. `upstatus_broadcast_messages()`: AFTER INSERT/UPDATE/DELETE em `public.messages`; usa `to_jsonb(OLD/NEW)` e `realtime.send(..., false)`. Envia a linha completa, não apenas uma dica de invalidação.
2. `upstatus_broadcast_remote_state()`: emite metadados de comandos/resultados em broadcast público.
3. `upstatus_broadcast_users()`: emite nome, status, motivo, updated_at e sync em broadcast público.

A configuração Dashboard “Allow public access” não está exposta pelo conector e nenhum acesso externo foi reproduzido. O caminho de divulgação potencial está confirmado no trigger/catálogo; não declarar incidente externo comprovado. Prioridade: minimizar payload de mensagens e substituir o transporte público sensível antes de alinhar os tópicos.

## PostgreSQL, RLS, grants, SECURITY DEFINER e Storage

Snapshot read-only:
- 10 tabelas em `public` com RLS habilitado e zero policies.
- 9 tabelas backend-owned concedem a anon e authenticated os mesmos 7 privilégios: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER. Total: 126 grants diretos.
- `public.upstatus_visual_config` não tem grants diretos para anon/authenticated.
- TRUNCATE não é protegido por RLS; nenhum uso destrutivo foi tentado.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; anon/authenticated têm SELECT, INSERT e UPDATE.
- 24 registros Default ACL, expandidos em 300 entradas ACL distribuídas entre public, storage, extensions, graphql, graphql_public, realtime e auth. **Essas 300 entradas não são 300 grants diretos de clientes.**
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE em ACL para PUBLIC, anon, authenticated e service_role. O Advisor sinaliza EXECUTE amplo; não foi demonstrada invocação direta como RPC comum.
- Buckets `chat-images` e `profile-images` são públicos, limite de 20 MiB cada, com 168 e 20 objetos respectivamente. Zero policies próprias em `storage.objects`.

Security Advisor retornou três categorias: INFO `rls_enabled_no_policy` e WARN para SECURITY DEFINER executável por anon e authenticated. Performance e Health Advisors não retornaram achados.

## AUTH-03, Edge Functions e migrations

Produção:
- Projeto `ACTIVE_HEALTHY`, região `us-west-2`, PostgreSQL 17.11.0.002.
- 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Os handlers core usam token próprio, mas é necessária inventariação de autorização por rota para todas as funções.
- 7 migrations; última `20261027155438`.
- Zero colunas `setup_token_*`; zero RPC `consume_upstatus_setup_invite`; zero tabela/RPC de rate limit de sinalização.
- `upstatus_sessions` e `upstatus_profiles` têm `user_name`, sem `user_id`; `users` usa `name`.

Laboratório `bfpjtfqlnypisxljoxkb`:
- Projeto ACTIVE_HEALTHY, 39 migrations, duas funções de teste.
- `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Zero users, sessions, profiles, buckets, objetos e mensagens Realtime; não é Full-Product TEST.
- Smoke #165 recebeu HTTP 402 `exceed_edge_functions_invocations_quota` em 19/19 checks não autenticados (0/19 passaram); os checks autenticados não foram alcançados. O estado ACTIVE_HEALTHY do projeto não remove o bloqueio de quota.
- A branch Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview esteja saudável.

AUTH-03 permanece bloqueado em produção. A recuperação dos quatro SQLs históricos foi validada em auditoria anterior, mas a comparação de proveniência não foi repetida nesta execução; o gate MIGRATION-PROVENANCE não foi atualizado.

## Issues e testes manuais

- [#78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos concluídos. Reconexão sem F5, reentrada em sala, novas chamadas, áudio, peers e polling duplicado continuam MANUAL PENDING.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 checkboxes concluídos; 19 pendentes.
- Nenhum teste manual foi executado. Não havia checkout local/browser Tampermonkey disponível nesta execução.
- CI de Chromium/candidato não substitui teste físico em perfis Tampermonkey e rede real.

## Gates

| Gate | Estado |
|---|---|
| RT-01 | BLOCKED |
| TEST-ISOLATION | BLOCKED |
| AUTH-03 | BLOCKED |
| ACL-STORAGE | BLOCKED |
| RECONNECT | PENDING |
| HUMAN-REVIEW | PENDING |
| MIGRATION-PROVENANCE | não reavaliado nesta execução |

## Segurança da auditoria

Todas as consultas SQL desta execução foram SELECT-only. Nenhuma alteração em produção, migration, deploy, merge, release, publicação de userscript, secret, flag, role, grant, policy, ACL ou fixture foi realizada. A única escrita de código-fonte desta execução é este arquivo Markdown novo na branch QA; o comentário QA existente na Issue #79 foi atualizado sem criar duplicata e sem alterar o comentário da Engenharia.
