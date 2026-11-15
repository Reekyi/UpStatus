# Auditoria independente de qualidade do UpStatus

**Data:** 2026-11-15 18:39 UTC  
**Escopo:** GitHub Reekyi/UpStatus; Supabase produção dlfvkawaiqduhlazsszm; laboratório bfpjtfqlnypisxljoxkb.  
**Recomendação:** **NOT READY**.

## 1. Método e limites

- Releitura de docs/RELEASE_READINESS.md na branch qa/release-readiness-2026-11-04-master. O arquivo tem aproximadamente 1,05 MB, 709 headings e a última seção histórica encontrada é de 15/11 às 06:30 UTC. É um histórico append-only volumoso e já não representa sozinho o estado atual.
- Conferi refs/heads, comparação de branches, PRs, arquivos alterados, reviews, Issues #78/#79, Actions e logs dos jobs.
- Supabase foi consultado somente por inventário, Advisors, fontes de Edge Functions, catálogos PostgreSQL e logs. Todas as queries SQL desta rodada foram SELECT-only.
- Não executei testes de produto. Os resultados de CI citados são runs existentes, inspecionados por SHA exato, não reexecuções desta auditoria.
- Não havia checkout local em /workspace, /workspaces, /repo ou /app. Não havia navegador Tampermonkey nem dispositivos para teste físico. Nenhuma alegação de teste manual foi feita.
- Nenhum secret foi lido. Nenhuma migration, deploy, merge, release, flag, role, grant, policy, ACL ou publicação foi alterada.

## 2. Heads reais e integridade da QA

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA qa/release-readiness-2026-11-04-master | 9e728d4d75031ef0c54f5ca16e7cfad7c7c896c4 |

A comparação master → QA informa 343 commits à frente e 1 atrás. O HEAD da QA é também o HEAD da PR #82. O novo relatório foi criado como arquivo novo, sem editar RELEASE_READINESS.md nem sobrescrever arquivo existente.

A API de branches informa protected=false para master, develop e team-lite-official. A consulta de repository rulesets retornou lista vazia. A proteção clássica da QA não foi confirmada.

A PR #82 contém 190 arquivos alterados e a listagem de nomes confirma que todos estão sob docs/. É uma alteração documental, não uma mudança de runtime. Ainda assim, o Validate obrigatório continua vermelho.

## 3. PRs obrigatórias e CI nos SHAs exatos

| PR | HEAD | Evidência | Resultado |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS |
| #82 QA | 9e728d4d75031ef0c54f5ca16e7cfad7c7c896c4 | [Validate 43742647071](https://github.com/Reekyi/UpStatus/actions/runs/43742647071) | FAIL |

### Detalhe dos testes

- #74: Validate e Smoke passaram no HEAD exato. O Smoke registrou 19/19 checks não autenticados e 136/136 autenticados, além de browser WebRTC para chamada, voz e tela, mesh de três participantes, rate limit de sinalização e cleanup. O passo “Verify distributed setup-invite issuance rate limit” foi SKIPPED nesse HEAD.
- #75: PASS histórico; não substitui a candidata mais nova #76.
- #76: Candidate Checks passou integralmente. O log confirma 16/16 checks não autenticados, 11/11 contratos HTTP, 110/110 autenticados, Chromium/WebRTC para chamada, voz e tela, rate limit distribuído de setup-invite, concorrência e cleanup.
- #82: o run 43742647071 fez checkout do merge ref 1648d833219aeb4b8e46b306017c4c841480e012, construiu UpStatus 3.4.7 / TEST 3.4.7 e falhou em scripts/validate.mjs:26 com “VALIDATION FAILED: production updateURL mismatch”. O erro não foi causado pelo texto do relatório; é um contrato de build já quebrado no master.

Reviews: as PRs obrigatórias #74, #75, #76 e #82 não têm reviews submetidas. CI verde não equivale a review humana nem autorização de release.

## 4. Candidatas auxiliares relevantes

| PR | HEAD | Evidência observada | Limite |
|---|---|---|---|
| #161 Normal rate limit | 557814dc31bed779b84a2094358dc6b2a7e67689 | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) PASS | Migration/RPC ainda ausentes em produção |
| #163 HTTP 409 | 00f357b0f5921d1995bb52c7b50f53ef8276e334 | [Validate 43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) e contrato 43488822237 PASS | Contrato offline; runtime de laboratório não foi atualizado |
| #164 upload/avatar | a27ced56564f3d18948c70138f6d6b2a1f2d0907 | [Validate 43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) PASS | Upload/Storage em mocks; nenhum upload real |
| #165 origem autenticada Normal | 434478771dca54505d3ec8b0cea0ada57d8d6dca | [Guard 43619801133](https://github.com/Reekyi/UpStatus/actions/runs/43619801133) PASS | Smoke [43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747) falhou por quota; 19/19 checks não autenticados falharam e os testes autenticados foram skipped |
| #166 origem autenticada Team Lite | e90e0dbbc0c6d89d77ea359dff0f1e82b4428413 | [Guard 43624572780](https://github.com/Reekyi/UpStatus/actions/runs/43624572780) PASS | Guard offline; não é validação física nem cutover |
| #167 updater/anexos | d100b0820dd7f98e2b78a98e6b6f8c09f13b1867 | [Validate 43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) PASS | Candidata ainda não integrada |

### #161: rate limit Normal

O Smoke exato da #161 confirmou 19/19 não autenticados, 136/136 autenticados, browser WebRTC e teste concorrente de emissão de setup-invite. A candidata limita emissão a cinco por administrador em 900 segundos, usa bucket derivado de hash, falha fechada com 503 se a RPC falhar e retorna 429 quando o limite é atingido.

Inspeção do handler candidato encontrou uma lacuna menor, mas real: a resposta 429 de setup-invite não envia Retry-After. O Retry-After de 60 segundos existente nos testes de sinalização é outro endpoint e não cobre esse limiter.

A migration candidata é supabase/migrations/20261109230000_setup_invite_rate_limit.sql. A tabela e RPC existem no laboratório, mas não em produção. Publicar o handler sem migration coordenada fará o caminho fail-closed responder 503.

## 5. Causa exata do Validate #82 e workflows

### Build Normal

- master/release.json está em 3.4.7 estável e declara scriptUrl para /functions/v1/upstatus/upstatus.user.js.
- master/scripts/build.mjs ignora release.scriptUrl para o userscript Normal e constrói o updateURL usando o endpoint legado upstatus-screen-share-3-1-1-beta10.
- master/scripts/validate.mjs exige /upstatus/upstatus.user.js.
- A candidata #74 altera o build para ler release.scriptUrl e validar igualdade com o endpoint esperado. A correção ainda não está em master.

### Deploy Normal

O workflow de master é manual (workflow_dispatch), usa environment production, exige release estável 3.4.7 e instala Supabase CLI latest. O destino do deploy é upstatus, mas o project-ref vem de SUPABASE_PROJECT_ID sem comparação explícita com o ID autorizado de produção.

### Deploy Team Lite

O workflow de team-lite-official lê o release.json da raiz, que declara 3.0.40 com preRelease beta.22. O manifesto próprio team-lite/release.json declara buildVersion 3.4.30 estável. O guard atual interrompe a publicação pelo manifesto raiz. Se esse guard fosse removido isoladamente, o comando ainda publicaria upstatus, não upstatus-team-lite. A CLI é latest.

O deploy-test existente em team-lite-official é o workflow Normal: dispara em push para develop, usa SUPABASE_PROJECT_ID genérico, CLI latest e publica upstatus-test. Não há nesse arquivo um alvo de teste Team Lite independente.

### Deploy TEST de develop

O workflow dispara automaticamente em push para develop e também por workflow_dispatch. Usa SUPABASE_PROJECT_ID, sem validar o valor contra uma allowlist do projeto TEST, e instala CLI latest. O valor do secret não foi lido; o destino efetivo não foi afirmado.

Nenhum workflow foi executado nesta auditoria.

## 6. Runtimes realmente instalados

Fontes implantadas e userscripts embutidos foram lidos via Management API:

| Produto | Distribuição | Userscript | API usada pelo cliente |
|---|---|---|---|
| Normal | upstatus v480 | 3.4.7 | upstatus-screen-share-3-1-1-beta10 v6; código interno 3.1.1-beta8 |
| Team Lite | upstatus-team-lite v15 | 3.4.30 | upstatus-team-lite v15 |

No Normal, o updater/download aponta para /functions/v1/upstatus/upstatus.user.js, mas o CLOUD_SERVER embutido continua apontando para upstatus-screen-share-3-1-1-beta10. O usuário pode receber o script pelo endpoint novo e continuar usando uma API antiga. A #161 propõe o cutover do CLOUD_SERVER para upstatus, mas ainda não foi integrada.

Team Lite usa o manifesto GitHub da branch team-lite-official e a API upstatus-team-lite.

Ambos os userscripts instalados assinam o tópico público upstatus-screen-share-live-3-1-1-beta10, sem private:true e sem realtime.setAuth().

As funções principais reportam verify_jwt=false no gateway. Isso não prova que cada rota seja anônima: os handlers principais usam autenticação própria por x-upstatus-token. Ainda assim, há 38 funções ACTIVE em produção, incluindo vários slugs test/beta/backup; a revisão de autenticação rota a rota de todas as funções legadas não foi concluída.

## 7. Supabase: projetos, migrations e Edge Functions

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Projeto | UpStatus | upstatus-security-test |
| Região | us-west-2 | sa-east-1 |
| Estado do projeto | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| Migrations no ledger | 7 | 39 |
| Edge Functions ACTIVE | 38 | 2 |
| Branch gerenciada | main: MIGRATIONS_FAILED | nenhuma |

A branch gerenciada main de produção continua MIGRATIONS_FAILED, enquanto o preview aparece ACTIVE_HEALTHY.

A função upstatus-signal-test v32 está no laboratório. Ela expõe Retry-After e mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE. A candidata #163 espera esse código específico; portanto, o contrato aprovado offline ainda não coincide com o runtime implantado.

### AUTH-03

- Produção: public.upstatus_setup_invite_rate_limits não existe; public.consume_upstatus_setup_invite_rate_limit(...) não existe.
- Laboratório: tabela e RPC existem. A RPC é SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role.
- O handler candidato Normal #161 usa a RPC, mas o runtime Normal instalado continua na API beta10.
- O primeiro setup sem convite de uso único continua no runtime instalado. A proteção candidata não está implantada.

### Migrations originais ausentes

Os quatro arquivos abaixo retornam 404 na branch QA, embora as versões correspondentes constem no ledger de produção:

1. 20261023154754_create_upstatus_visual_config.sql
2. 20261026195855_add_chat_message_file_name.sql
3. 20261027154329_allow_chat_document_mime_types.sql
4. 20261027155438_set_upstatus_upload_limits_20mb.sql

Não reconstruí SQL ausente por inferência.

## 8. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- 10 tabelas public com RLS habilitado e sem policies.
- 9 tabelas public com grants diretos para anon/authenticated: 126 linhas de privilégios.
- 18 grants TRUNCATE nessas nove tabelas. RLS não bloqueia TRUNCATE.
- 24 registros de default ACL; 15 incluem anon/authenticated em public, graphql, graphql_public e storage.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, usam search_path=public e têm EXECUTE para anon/authenticated/service_role. O Security Advisor aponta três WARN para anon e três para authenticated.
- As funções são triggers que retornam trigger; não foi demonstrada invocação RPC direta. Os grants são desnecessários e o risco concreto está nos broadcasts públicos.

### Laboratório

- 18 tabelas public com RLS e sem policies; zero grants diretos anon/authenticated nas tabelas public.
- Default ACLs ainda incluem anon/authenticated em public, graphql, graphql_public e storage.
- As três funções de broadcast continuam SECURITY DEFINER, mas usam search_path vazio e EXECUTE somente para service_role.
- Os grants de cliente em realtime.messages e storage.objects continuam presentes.

RLS sem policy não prova automaticamente que cada SELECT/INSERT concedido seja efetivo; os grants continuam sendo uma superfície desnecessária e TRUNCATE não é bloqueado por RLS.

### Realtime

Snapshot de produção: 106 linhas em realtime.messages, todas private=false, em um único tópico de trigger: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.

Os clientes instalados assinam outro tópico: upstatus-screen-share-live-3-1-1-beta10. Há divergência entre trigger e cliente.

A função upstatus_broadcast_messages envia to_jsonb(OLD/NEW), ou seja, o registro completo. A função de remote-state envia campos de comando/resultado. As três chamadas realtime.send usam private=false.

No laboratório, os payloads dos triggers foram reduzidos para {op: TG_OP}, search_path está vazio e EXECUTE está restrito a service_role, mas os broadcasts continuam private=false e no tópico upstatus-live-....

Não foi realizada exploração nem publicação de mensagens. O achado é de configuração/código implantado.

### Storage

Produção:
- chat-images: público, 168 objetos, limite 20 MiB.
- profile-images: público, 20 objetos, limite 20 MiB.
- Zero policies próprias em storage.objects.

Laboratório: zero buckets e zero objetos. Isso impede aceitar o fluxo de anexos como Full-Product TEST.

## 9. HTTP 402: correção da contagem anterior

Janela móvel consultada: 2026-11-14 18:34:00 UTC até 2026-11-15 18:34:00 UTC.

A consulta correta por source e response.status_code retornou:
- Produção: 2 respostas HTTP 402, ambas em function_edge_logs.
  - 20:55:03.083 UTC: GET do download Team Lite.
  - 20:57:39.868 UTC: GET do download Normal.
- Produção também teve 72 pgbouncer_logs e 34 postgres_logs, sem HTTP 402 nesses sources.
- Laboratório: 72 pgbouncer_logs, 22 postgres_logs e zero function_edge_logs na janela; nenhum HTTP 402 observado.

**Correção de integridade:** a contagem anterior de 64 respostas 402 não se sustenta nesta reconsulta. A agregação anterior estava incorreta; não deve ser usada como contagem atual.

O run histórico [43619663747](https://github.com/Reekyi/UpStatus/actions/runs/43619663747), de 14/11 17:10 UTC, falhou com a mensagem explícita exceed_edge_functions_invocations_quota. Nesse run, 19/19 checks não autenticados falharam com HTTP 402 e as etapas autenticadas/concurrency/cleanup foram skipped. Na janela atual não houve function_edge_logs no laboratório; portanto, não há prova de que a quota foi recuperada nem de que continua restringindo o projeto. ACTIVE_HEALTHY não comprova que as Edge Functions estão recebendo tráfego.

## 10. Issues e aceitação física

- Issue #78 permanece OPEN, 0/8 critérios físicos marcados. Reconexão sem F5, reentrada, novas chamadas, microfone/tela reais e interoperabilidade instalada Normal ↔ Team Lite continuam pendentes.
- Issue #79 permanece OPEN, 16/35 checkboxes marcadas. Isso é checklist, não percentual de prontidão.
- Não havia ambiente de execução local nem navegador/dispositivos; nenhum teste manual foi realizado nesta rodada.

## 11. Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 106 eventos públicos; tópico de trigger difere do tópico dos clientes |
| TEST-ISOLATION | BLOCKED | Laboratório não tem buckets nem fixtures completos de produto |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs ausentes; produção main em MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | RPC/tabela só no laboratório; não existem em produção |
| ACL-STORAGE | BLOCKED | Grants/ACL amplos, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | Issue #78 continua 0/8; sem teste físico sem F5 |
| HUMAN-REVIEW | PENDING | PRs obrigatórias sem reviews; nenhuma autorização explícita de release |

## 12. Veredito e próximos passos

**NOT READY.** Prioridades:

1. Corrigir master/scripts/build.mjs para consumir release.json.scriptUrl e fechar o Validate #82.
2. Coordenar cutover Normal: versão estável nova, updater/API, migration AUTH-03, rollout e rollback revisados; não publicar o handler isoladamente.
3. Completar Retry-After no 429 de setup-invite.
4. Corrigir o workflow Team Lite para manifesto próprio, slug upstatus-team-lite, projeto/SHA explícitos e CLI pinada.
5. Restringir deploy TEST a projeto explicitamente allowlisted e criar alvo Team Lite TEST separado.
6. Implementar Realtime privado/autorizado nos dois produtos e alinhar tópicos dos triggers/clientes.
7. Revisar grants/default ACLs, SECURITY DEFINER, Storage e validação de bytes de anexos.
8. Recuperar os quatro SQLs originais, reconciliar ledger e resolver MIGRATIONS_FAILED.
9. Provisionar Full-Product TEST e executar os oito critérios físicos.
10. Obter review humana e autorização explícita antes de qualquer release.

**Integridade:** nenhuma produção foi modificada. Todas as queries SQL foram SELECT-only. Nenhum secret foi lido; nenhum merge, deploy, migration, release, publicação de userscript, alteração de flag/permissão ou operação destrutiva foi realizada. A única escrita no repositório é este arquivo novo na branch QA.
