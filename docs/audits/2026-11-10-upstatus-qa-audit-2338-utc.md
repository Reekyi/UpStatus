# Auditoria independente de qualidade — UpStatus

**Coleta:** 2026-11-10 23:38 UTC  
**Recomendação:** `not_ready`  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`

## Segurança e método

- GitHub e Supabase foram usados para inspeção read-only.
- Todas as consultas SQL executadas nesta rodada foram SELECT/catálogo.
- Foram lidos logs de workflows já existentes; nenhum workflow foi disparado pela auditoria.
- Nenhum teste local, HTTP contra Edge Function, browser físico ou teste manual foi executado.
- Não houve escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/grant/ACL/policy ou operação destrutiva.
- A única escrita foi este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79. Nenhum comentário da Engenharia foi alterado.

## Branches e documentação

- QA `qa/release-readiness-2026-11-04-master`: HEAD `d354081a9120db5d3d36621fa08b3122a2866a2d`, sem proteção de branch.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`, sem proteção.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`, sem proteção.
- Compare QA vs master: 204 commits à frente e 1 atrás; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não fiz rebase nem incorporei o commit master-only.
- PR #82 segue aberta/Draft, head exato igual ao QA `d354081`, mergeable segundo o GitHub.
- `docs/RELEASE_READINESS.md` foi lido integralmente pelo blob `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.410 linhas. O último checkpoint dentro do documento é 2026-11-08 15:30 BRT / 18:30 UTC. Portanto, o documento principal está desatualizado em relação às candidatas e evidências de 10/11; este relatório é um apêndice independente, não uma alteração do checklist principal.

## PRs, heads e CI

Todas as PRs abaixo permanecem abertas e Draft. A consulta de reviews retornou zero reviews em #74, #75, #76, #82, #89, #101, #133, #134 e #140.

| PR | HEAD atual | Evidência exata | Classificação |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS. Smoke: 19/19 não autenticadas e 136/136 autenticadas; etapa de rate limit de emissão de convite foi ignorada porque ainda não existia nessa linha. |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS limitado: somente scripts/metadados. Não é a candidata funcional ativa. |
| #76 Team Lite | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | PASS. 16/16 não autenticadas, 110/110 autenticadas, 11/11 contratos HTTP offline, Playwright Full-IIFE, WebRTC call/voice/screen, mesh, rate limit e setup-invite. |
| #82 QA | `d354081a9120db5d3d36621fa08b3122a2866a2d` | [Validate 42915996569](https://github.com/Reekyi/UpStatus/actions/runs/42915996569) | FAIL em `scripts/validate.mjs:26`: `production updateURL mismatch`. O log confirma build 3.4.7/TEST 3.4.7 antes da falha. |
| #89 AUTH-03 Normal | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` | [Guard 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | PASS de Validate offline, integração AUTH-03 no laboratório e regressões do guard. O log termina com cutover bloqueado: release estável precisa ser superior a 3.4.7. Não foi deploy. |
| #101 sinalização server-mediated | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` | Workflow [production-signal-source-parity.yml](https://github.com/Reekyi/UpStatus/blob/feat/production-authenticated-signaling-runtime-20261108/.github/workflows/production-signal-source-parity.yml) | Sem run no HEAD atual. O workflow declara apenas `push`, não `pull_request`; PR Draft e sem review. |
| #133 Normal provenance | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` | [API Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) e [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | PASS. Smoke: 19/19 não autenticadas, 136/136 autenticadas, browser WebRTC call/voice/screen, mesh, 90+1/429, concorrência e cleanup. |
| #134 Team Lite provenance | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) | PASS. 16/16 não autenticadas, 110/110 autenticadas, 11/11 contratos HTTP offline, Playwright, WebRTC, mesh, rate limits e cleanup. |
| #140 migration parity | `19fc6c0e234697f7d56eb8016b4414af899978a4` | [Validate offline 42920327901](https://github.com/Reekyi/UpStatus/actions/runs/42920327901) | PASS somente em push. Sem check PR-triggered e sem review. O guard compara estaticamente o bloco DDL/RPC/grants de uma migration AUTH-03 de produção com a contraparte de teste; não aplica SQL nem prova estado do banco. |

### Compatibilidade Normal / Team Lite

- #133 e #134 são candidatas empilhadas sobre #74 e #76, respectivamente. Os testes de laboratório confirmam compatibilidade de aliases de tentativa de voz entre Normal e Team Lite e cobertura de chamadas/voz/tela.
- Isso é CI isolado, não teste de versões instaladas no Sale Smartly.
- Nos templates Normal e Team Lite, `signaling_transport_enabled` continua default `false`; a própria validação Normal exige esse default-off. Portanto, a sinalização server-mediated ainda não é o caminho seguro obrigatório.
- #101 contém a função server-mediated, mas seu workflow é push-only e nenhum workflow de publicação Normal/Team Lite inspecionado inclui o deploy de `upstatus-signal`.

## Bloqueadores de publicação

### Normal: dois contratos incompatíveis

- Workflow da #89: manual-only; checkout do SHA dispatchado; exige ref master; valida organização/projeto; CLI 2.122.1; preflight read-only de migrations; deploy da API beta10 antes de `upstatus`; guard exige versão estável superior a 3.4.7.
- Workflow da #133: manual-only; deploya somente `upstatus`; exige `release.json.version === 3.4.7`; não contém o mesmo preflight/guard da #89.
- Ambos os `release.json` lidos nesta rodada estão em 3.4.7 e apontam para `/functions/v1/upstatus/upstatus.user.js`.
- A produção já serve Normal 3.4.7. Republicar código diferente sob a mesma versão não garante atualização do userscript; o guard da #89 corretamente rejeita cutover sem incremento de versão.
- Não combinar as duas linhas sem escolher runtime único ou dois runtimes e portar para a linha escolhida as proteções de SHA, projeto, migrations, ordem de deploy e versionamento.

### Team Lite

O workflow oficial em `team-lite-official` ainda executa `supabase functions deploy upstatus`, não `upstatus-team-lite`; usa CLI `latest`, não fixa checkout SHA/ref de master e não valida o projeto esperado nem o histórico de migrations. **Não despachar esse workflow.**

### HTTP de voz: helper offline não equivale ao runtime

- Fonte candidata #101 mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409.
- Helper offline `http-contract.mjs` da linha Team Lite também mapeia esse código para 409 e seus 11 testes passam.
- Edge Function isolada implantada `upstatus-signal-test` v32 (SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`) ainda mapeia apenas `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409 no caminho de abertura de voz. `VOICE_ATTEMPT_ALREADY_ACTIVE` cai no fallback 500 se a camada RPC retornar esse código.
- Não fiz requisição HTTP real; a divergência é inspeção estática entre a fonte implantada e os candidatos. Criar regressão HTTP contra o runtime isolado é necessário.

## Supabase — produção

Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002. A branch Supabase default `main` reporta `MIGRATIONS_FAILED`, enquanto `preview_project_status` é `ACTIVE_HEALTHY`; a causa da falha da branch não foi obtida. Produção tem 7 migrations.

### Realtime

- SELECT em `realtime.messages`: 67 registros; 67 com `private=false`, 0 privados, todos no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- `realtime.messages`: RLS habilitado, zero policies; `anon` e `authenticated` têm SELECT/INSERT/UPDATE efetivos.
- Três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são `SECURITY DEFINER`, `search_path=public`, EXECUTE efetivo para anon/authenticated e estão associadas a triggers. A função de mensagens envia `to_jsonb(OLD/NEW)` completo; as outras enviam campos de estado/comando/resultado.
- Security Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policies. O Advisor descreve as funções broadcast como executáveis via RPC; não fiz chamada RPC nem exploração. O acesso externo efetivo a canais públicos depende também da configuração de Dashboard, que não é exposta pelo conector.

### RLS, grants, Default ACL e Storage

- 10 tabelas públicas com RLS e zero policies.
- 9 dessas 10 tabelas concedem a anon e authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE efetivos; `upstatus_visual_config` não tem esses grants diretos. RLS não restringe TRUNCATE.
- 120 entradas ACL expandidas para anon/authenticated em Default ACLs de objetos futuros, distribuídas entre `postgres` em public/storage e `supabase_admin` em public/graphql/graphql_public.
- Buckets `chat-images` e `profile-images` são públicos, limite 20 MiB cada; zero policies em `storage.objects`.
- Não alterei grants, ACLs, policies ou buckets.

### Edge Functions e AUTH-03

- 38/38 Edge Functions de produção estão ACTIVE e reportam `verify_jwt=false` no metadata. Isso não prova ausência de autenticação customizada; os handlers principais têm validação própria.
- `upstatus` v480 (userscript 3.4.7), `upstatus-team-lite` v15 (3.4.30), `upstatus-screen-share-3-1-1-beta10` v6 e `upstatus-test` v281. Não existe função `upstatus-signal` na lista de produção.
- Os bundles implantados Normal/Team Lite continuam no setup legado `POST /api/setup -> login(req,true)`; AUTH-03 não foi implantado.
- Produção não tem colunas/tabelas/RPC de setup-invite/rate-limit presentes no laboratório.

## Supabase — laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`): `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, 39 migrations, duas Edge Functions: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

- 18 tabelas públicas com RLS, zero policies e nenhum grant direto de tabela para anon/authenticated.
- `realtime.messages`: zero linhas, RLS habilitado, zero policies; anon/authenticated ainda têm SELECT/INSERT.
- Zero buckets Storage e zero policies Storage.
- 96 entradas ACL expandidas para clientes em Default ACLs de objetos futuros nos schemas public/storage/graphql/graphql_public. O laboratório está isolado e limpo, mas não é full-product TEST totalmente endurecido.
- AUTH-03 e signaling existem no schema isolado; isso não significa que estejam implantados em produção.

## Issues e aceitação

- Issue #78 permanece aberta. Os comentários de engenharia mais recentes consultados mantêm 0/8 critérios físicos aprovados. Não há evidência de teste manual Tampermonkey com queda real de internet, recuperação sem F5, reentrada, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 permanece aberta, com 150 comentários. O comentário de Engenharia dedicado informa a atualização da #140 às 23:07 UTC e foi preservado.
- Nenhuma review humana foi encontrada nas nove PRs examinadas.

## Gates desta rodada

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 67/67 mensagens públicas e broadcast de produção |
| TEST-ISOLATION | in_progress | laboratório isolado, mas Default ACLs ainda amplas e sem full-product TEST |
| MIGRATION-PROVENANCE | blocked | produção 7 migrations; laboratório 39; quatro SQLs históricos originais continuam sem recuperação byte a byte; #140 é guard estático de uma migration |
| AUTH-03 | blocked | schema/convite/rate-limit ausentes em produção; candidato integrado apenas em laboratório |
| ACL-STORAGE | blocked | grants/Default ACLs amplos e dois buckets públicos sem policies |
| RECONNECT | pending | Issue #78 continua 0/8 |
| HUMAN-REVIEW | pending | zero reviews e sem autorização explícita de release |

## Próximos passos recomendados

1. Definir uma única topologia Normal e reconciliar versionamento, build, manifesto e deploy.
2. Integrar sinalização server-mediated aos dois clientes, tornando-a default segura e implantando o runtime correspondente no ambiente isolado antes de qualquer plano de produção.
3. Adicionar teste HTTP real para `VOICE_ATTEMPT_ALREADY_ACTIVE` contra a Edge Function implantada no laboratório.
4. Fazer #140 receber check PR-triggered e revisão; depois validar migrations no laboratório, sem produção.
5. Corrigir o workflow Team Lite para o slug correto, SHA/ref exato, projeto esperado e CLI fixada.
6. Endurecer grants/Default ACLs, Realtime e Storage com migrations revisadas.
7. Recuperar os quatro SQLs originais, diagnosticar `MIGRATIONS_FAILED`, obter revisão humana e só então planejar aceitação física #78.

**Veredito: NÃO LIBERAR.** CI aprovado em candidatos não equivale a runtime integrado, produção segura ou aceitação física.
