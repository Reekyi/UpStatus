# UpStatus - auditoria independente QA (2026-11-15 12:43 UTC)

## Veredito

**NOT READY.** Os candidatos #74 Normal e #76 Team Lite mantêm CI positivo nos SHAs avaliados, mas continuam Draft, sem aprovação humana e sem integração aos runtimes oficiais. A #82 falha no Validate. Produção ainda apresenta Realtime público, autorização legada, grants/ACLs excessivos e respostas HTTP 402. O workflow Team Lite de produção está bloqueado por um guard de pre-release, mas seu build e seu comando de deploy continuam apontando para o produto Normal.

## Método e limites

- Li `docs/RELEASE_READINESS.md` na branch QA. O documento tem aproximadamente 1,046,356 caracteres e 8,422 linhas; seu último checkpoint interno é 2026-11-15 06:30 UTC. Também li o relatório anterior de 11:35 UTC para continuidade.
- Revalidei refs, PRs, reviews, workflows, logs de CI, Issues, manifestos e fontes de runtimes implantados.
- Supabase foi consultado por SELECT, catálogo, advisors, lista de funções/migrations/branches e logs. Nenhuma operação de escrita foi executada no banco.
- **AUTOMATED CI** significa resultado de workflow no SHA consultado. **CODE INSPECTION** significa leitura de código/configuração/catálogo. **MANUAL PENDING** exige navegador, Tampermonkey, microfone, tela ou operador. **BLOCKED** indica dependência ou risco que impede o gate.
- Não existe checkout local: `/workspace`, `/workspaces`, `/repo` e `/app` não existem; `/mnt/data` está vazio. Não executei testes locais ou físicos, não fiz rerun de CI e não executei workflow de deploy.
- Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva.

## 1. Heads, governança e PRs

### Heads consultados

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `4edf828795c93f505117fac046ffc1dbf42e0546` |

Os quatro refs consultados retornam `protected=false`; a API de repository rulesets retorna zero rulesets. O commit QA atual tem como pai `fff9c183b0e58253dcfc8e837957689e83abb1ce`. QA está 337 commits à frente e um atrás de master. Não há proteção de branch para conter pushes diretos.

### PRs obrigatórias

| PR | HEAD | Estado | Resultado observado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | Open / Draft / unmerged | Validate e Smoke SUCCESS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft / unmerged | Candidate Checks SUCCESS histórico |
| [#76 Team Lite continuation](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Open / Draft / unmerged | Candidate Checks SUCCESS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `4edf828795c93f505117fac046ffc1dbf42e0546` | Open / Draft / unmerged | Validate FAILURE |

Nenhuma das quatro PRs tem review submetida. #76 é continuação de #75, 327 commits à frente e zero atrás; não contar ambas como entregas independentes. #74 está 887 commits à frente e um atrás de master. #82 é documental: 184 arquivos alterados, todos em `docs/`.

### CI nos SHAs consultados

**#74 Normal**
- [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): SUCCESS.
- [Signaling Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS.
- 136/136 verificações autenticadas. Chromium validou WebRTC de chamada, voz e tela, entrega de tracks remotas, malha de três participantes e teardown. Rate limit de sinalização: 90 aceitos e um HTTP 429 com Retry-After. Recibos atômicos e setup enrollment passaram.
- **Limite:** as duas etapas de verificação do rate limit distribuído de emissão de setup invites foram SKIPPED. O CI não validou essa proteção para Normal.

**#75 Team Lite baseline**
- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS histórico. Baseline substituída pela continuação #76.

**#76 Team Lite**
- [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881): SUCCESS.
- 110/110 verificações autenticadas. Chromium validou WebRTC de chamada, voz e tela, malha de três participantes e teardown. Passaram rate limit distribuído, recibos atômicos, consumo único de setup invite, rate limit distribuído de emissão de invites, recuperação de voz/tela e testes de fluxo de saída/reentrada.
- **Limite:** Chromium usa stubs/offline para Tampermonkey; não é instalação real com permissões e conectividade do navegador do usuário.

**#82 QA**
- [Validate 43709760340](https://github.com/Reekyi/UpStatus/actions/runs/43709760340): FAILURE no merge ref `a08e6d1`, que incorpora o HEAD QA `4edf828` em master.
- Log: build 3.4.7 / TEST 3.4.7 seguido de `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`.
- A PR contém somente documentação; nenhum validator ou código de produto foi alterado para contornar a falha.

## 2. Workflows, manifests e cadeia de publicação

### Team Lite produção: guard bloqueia, mas o workflow está errado

[Workflow em team-lite-official](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml):
- É manual (`workflow_dispatch`) e usa environment `production`.
- Lê `./release.json` e rejeita qualquer `preRelease` preenchido.
- O manifesto raiz **desta branch** é `3.0.40` com `preRelease=beta.22`; portanto, o guard atual deve interromper o workflow antes do deploy.
- O manifesto real do produto Team Lite é `team-lite/release.json`: buildVersion `3.4.30`, canal stable, URL de distribuição em branch GitHub.
- O workflow ignora esse manifesto Team Lite. Seu `scripts/build.mjs` lê `src/server/index.template.ts`, define `PROD_FUNCTION=upstatus` e `TEST_FUNCTION=upstatus-test`, ou seja, constrói Normal.
- O comando final é `supabase functions deploy upstatus`, não `upstatus-team-lite`.
- CLI está em `latest`; não há guard explícito de branch/SHA/projeto.

**Conclusão:** o guard beta.22 bloqueia a execução atual. Se alguém limpar/bypassar esse guard sem corrigir o workflow, o build/validator continua sendo Normal e o slug de deploy continua incorreto. Não executei o workflow.

### Team Lite TEST oficial

[Workflow em develop](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml):
- Tem `push` para `develop` e `workflow_dispatch`.
- Usa `secrets.SUPABASE_PROJECT_ID` sem comparar com um ref fixo do projeto TEST.
- Usa CLI `latest`.
- Publica `upstatus-test`, não um runtime Team Lite independente.

A mesma configuração aparece em `team-lite-official`. O valor do secret não foi lido; o destino efetivo não foi comprovado.

### Candidatas

- O deploy TEST candidato em #74/#76 é manual, usa `vars.SUPABASE_TEST_PROJECT_ID`, recusa o projeto de produção e o projeto isolado de sinalização, fixa CLI 2.122.1 e exige que build/deploy usem o mesmo ref. É uma melhoria real de isolamento, mas ainda constrói/publica `upstatus-test` a partir de develop, não um backend Full-Product Team Lite.
- O workflow `team-lite-candidate.yml` testa sinalização no projeto isolado `bfpjtfqlnypisxljoxkb`; ele não provisiona o backend e o Storage completos do Team Lite.
- O deploy Normal candidato #74 exige branch master, checkout SHA igual a GITHUB_SHA, project ref de produção fixo e CLI 2.122.1. Porém publica somente `upstatus`.

### Normal: URL de atualização e API continuam separados

- `master/release.json`: versão 3.4.7, preRelease vazio, scriptUrl `/functions/v1/upstatus/upstatus.user.js`.
- O build atual de master define `CLOUD_SERVER` de produção para `upstatus-screen-share-3-1-1-beta10` e deriva updateURL desse endereço beta10; o validator exige `/upstatus/upstatus.user.js`. Isso explica a falha #82.
- O build candidato #74 corrige o updateURL usando `release.scriptUrl`, mas ainda deixa `CLOUD_SERVER` apontando para beta10. O workflow candidato publica somente `upstatus`.
- Portanto, o artefato pode atualizar pelo endpoint `upstatus`, mas as chamadas de API do userscript Normal continuam no runtime beta10. O cutover do backend API não está coordenado.

### Atualizador Team Lite

O userscript instalado tem updateURL/downloadURL para o arquivo raw da branch `team-lite-official`, não para artefato imutável de release. Como a branch não é protegida, a cadeia de atualização não exige aprovação por SHA/release.

## 3. Runtimes instalados e compatibilidade Normal / Team Lite

Fontes implantadas consultadas no projeto de produção:

| Edge Function | Versão | Userscript embutido |
|---|---:|---|
| `upstatus` | v480 | Normal 3.4.7 |
| `upstatus-team-lite` | v15 | Team Lite 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | legado beta8 |
| `upstatus-test` | v281 | runtime legado |

Os bundles foram extraídos e inspecionados:
- Normal 3.4.7: updateURL/downloadURL em `/functions/v1/upstatus/upstatus.user.js`; API `CLOUD_SERVER` em `/functions/v1/upstatus-screen-share-3-1-1-beta10`.
- Team Lite 3.4.30: updateURL/downloadURL em raw GitHub `team-lite-official`; API `CLOUD_SERVER` em `/functions/v1/upstatus-team-lite`.
- Ambos assinam `upstatus-screen-share-live-3-1-1-beta10` com `realtimeClient.channel(topic)`, sem `private:true`, sem `realtime.setAuth()` e sem transporte autenticado. Team Lite também valida sessão local antes de processar certos handlers; isso não autentica o publicador do broadcast.

### Autenticação instalada

- Normal exige senha mínima de 6 caracteres tanto no setup legado quanto no login.
- Team Lite exige 4 caracteres tanto no setup legado quanto no login.
- `GET /api/account?name=` revela `needsSetup` sem autenticação.
- `POST /api/setup` chama `login(req,true)`; o runtime instalado não exige token/convite. Se a conta não tiver senha, o primeiro setup define senha e atribui papel por fallback de nome (Ricardo/Lohan/Guilherme podem receber `implementation_admin`).
- `POST /api/chat/clear` exige sessão válida, mas a autorização da operação verifica `name === "Ricardo"`, não o papel persistido `implementation_admin`.
- Snapshot atual: cinco usuários em produção, zero sem senha e zero sem papel. O risco de primeiro setup é condicional a uma conta futura/desconfigurada; não foi encontrada conta atual nessa condição.

### Candidatas AUTH-03: paridade incompleta

- O laboratório possui colunas `setup_token_hash`, `setup_token_expires_at`, `setup_token_issued_by`, `setup_token_issued_at`; RPC `consume_upstatus_setup_invite`; RPC `consume_upstatus_setup_invite_rate_limit`; tabela `upstatus_setup_invite_rate_limits`; e rate limiter de sinalização.
- Produção não possui essas colunas, RPCs ou tabelas.
- O template candidato Normal #74 usa token de convite e consumo atômico, mas `issueSetupInvite` não chama `consume_upstatus_setup_invite_rate_limit`. As etapas correspondentes no Smoke #74 foram SKIPPED.
- O template Team Lite #76 chama o rate limiter com limite de 5 por 900 segundos; a etapa de concorrência passou no CI.
- A candidata Normal e a Team Lite ainda precisam de testes de autorização admin/não-admin e rate limit no mesmo backend isolado antes de cutover.

### Upload

CODE INSPECTION nos runtimes implantados e nos dois templates candidatos: `sniffMime(bytes, declared)` retorna o MIME declarado quando a assinatura não é reconhecida; a allowlist posterior pode aceitar esse valor. Isso significa que PDF/Office/texto e outros tipos sem assinatura coberta pelo helper continuam dependendo do MIME informado pelo cliente. É uma validação de conteúdo incompleta, não um exploit reproduzido. Nenhum upload real foi executado.

## 4. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

Snapshot de `realtime.messages` em produção: 106 linhas, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 72 `user_status`
- 26 `db_change`
- 4 `remote_command`
- 4 `remote_result`

As linhas observadas datam de 10/11 a 13/11. Os clientes instalados usam outro tópico (`upstatus-screen-share-live-3-1-1-beta10`), portanto essas linhas não provam entrega aos clientes atuais.

O trigger `upstatus_broadcast_messages` usa `to_jsonb(OLD/NEW)` e envia a linha completa em `record` com `private=false`. Os triggers de remote-state e user-status também publicam em canal público.

No laboratório, `realtime.messages` está vazio. As três funções SECURITY DEFINER de broadcast usam search_path vazio e EXECUTE restrito a service_role; o payload de chat foi reduzido a `{op: TG_OP}`. Ainda assim, os broadcasts continuam com `private=false`.

Não houve teste de spoofing, exploração ou prova de vazamento externo.

### RLS, grants e ACLs

**Produção**
- 10 tabelas no schema public com RLS; as 10 sem policies.
- 9 tabelas public concedem privilégios a anon/authenticated: 126 grant rows no total.
- 18 grants TRUNCATE a papéis cliente. RLS não protege TRUNCATE.
- `realtime.messages`: RLS habilitado, zero policies e grants de cliente.
- 24 default ACLs, incluindo defaults amplos para postgres/supabase_admin em public, storage e schemas GraphQL.
- Três funções SECURITY DEFINER de broadcast: `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state`, `upstatus_broadcast_users`. Todas com `search_path=public` e EXECUTE para anon/authenticated/service_role. Todas retornam trigger; não foi demonstrada invocação RPC direta. O problema confirmado é o privilégio desnecessário e o broadcast público.
- Security Advisor: 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated.

**Laboratório**
- 18 tabelas public com RLS e sem policies.
- Nenhum grant direto de anon/authenticated nas tabelas public consultadas.
- Ainda existem 8 grants em realtime e 32 em storage para papéis cliente.
- `realtime.messages`: RLS habilitado, zero policies e grants de cliente.
- 25 default ACLs; defaults de postgres em public estão restritos, mas defaults de supabase_admin em public/storage continuam amplos.
- Três funções SECURITY DEFINER de broadcast com search_path vazio e EXECUTE negado a anon/authenticated, permitido a service_role.
- Security Advisor: 18 INFO de RLS sem policy, sem WARN de SECURITY DEFINER.

RLS sem policies em tabelas backend-owned não prova, isoladamente, acesso efetivo via API. Os grants continuam sendo superfície de privilégio desnecessária; TRUNCATE não é bloqueado por RLS.

### Storage

Produção:
| Bucket | Público | Limite | Objetos |
|---|---|---:|---:|
| chat-images | Sim | 20 MiB | 168 |
| profile-images | Sim | 20 MiB | 20 |

Não há policies próprias em `storage.objects`. Laboratório: zero buckets e zero objetos.

## 5. Edge Functions, migrations e ambientes

- Produção: 38 Edge Functions ACTIVE; laboratório: duas (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3).
- As 38 funções de produção reportam `verify_jwt=false` na configuração de plataforma. Isso não prova ausência de autenticação: os handlers principais usam token próprio; não foi feita auditoria rota-a-rota de todas as 38.
- `upstatus-test` v281 continua ACTIVE em produção. Há 36 funções adicionais com nomes test/beta/backup/legacy além dos dois endpoints de produto; requerem inventário de uso e retirada controlada.
- Migrations: produção 7; laboratório 39.
- Branch gerenciada `main` da produção: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`. Laboratório sem branch gerenciada.
- Quatro SQLs aplicados em produção retornam 404 em master e QA:
  1. `20261023154754_create_upstatus_visual_config.sql`
  2. `20261026195855_add_chat_message_file_name.sql`
  3. `20261027154329_allow_chat_document_mime_types.sql`
  4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruir esses arquivos a partir do schema/ledger atual. Proveniência original precisa ser recuperada.

### Isolamento de TEST

O laboratório `bfpjtfqlnypisxljoxkb` está saudável para sinalização/contratos, mas tem zero usuários, sessões, mensagens, perfis, salas, memberships, eventos e buckets/objetos Storage. Não é Full-Product TEST.

## 6. Disponibilidade: HTTP 402

Janela consultada: `2026-11-14T12:32:41Z` a `2026-11-15T12:32:41Z`.

**Produção: 94 respostas HTTP 402**
- beta10 `/api/chat`: 21 GET
- beta10 `/api/status`: 10 GET
- beta10 `/api/remote-status`: 10 GET
- download Team Lite: 24 GET + 1 HEAD
- download Normal: 21 GET + 1 HEAD
- gateway `edge_logs`: 6 registros 402 sem pathname disponível na linha consultada

Última ocorrência de função/download: 2026-11-14 20:57:39 UTC.

**Laboratório: 19 respostas HTTP 402** no endpoint `upstatus-signal-test`, em bloco concentrado por volta de 2026-11-14 17:10:45 UTC, distribuídas por health, broadcast, poll e rotas de sala/sinalização. Os registros usam user-agent `node`, compatível com execução de harness, mas isso não prova a causa.

Os logs comprovam HTTP 402, não a causa. Não atribuir a quota/billing sem evidência. A ausência de logs posteriores não prova recuperação nem disponibilidade normal; também pode refletir ausência de tráfego. Não iniciar Smoke integrado até comprovar disponibilidade.

## 7. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios marcados. Reconexão física Normal e Team Lite sem F5, reentrada, nova chamada, áudio, peers/polling e teste manual continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 checkboxes marcados; 19 permanecem desmarcados.
- Nenhum teste manual foi realizado nesta execução. Não há navegador com Tampermonkey, microfone ou captura de tela disponível.

## 8. Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | Userscripts e triggers ainda públicos; nenhum cutover autenticado nos runtimes instalados. |
| TEST-ISOLATION | BLOCKED | Laboratório sem fixtures/buckets full-product; workflow TEST oficial sem guard explícito de projeto. |
| MIGRATION-PROVENANCE | BLOCKED | Quatro arquivos 404 em master e QA; produção main em MIGRATIONS_FAILED. |
| AUTH-03 | BLOCKED | Produção sem convite/rate limit; candidata Normal sem rate limit de emissão; Team Lite candidata melhor, ainda não implantada. |
| ACL-STORAGE | BLOCKED | Grants/default ACLs amplos, SECURITY DEFINER com search_path=public, buckets públicos sem policies. |
| RECONNECT | PENDING | Issue #78 permanece 0/8; exige teste físico sem F5. |
| HUMAN-REVIEW | PENDING | PRs obrigatórias abertas/Draft e zero reviews submetidas; sem autorização explícita de release. |

## 9. Próximas ações recomendadas

1. Investigar os HTTP 402 no Usage/Billing e comprovar recuperação por tráfego funcional controlado antes de novos Smokes.
2. Corrigir workflow Team Lite: manifesto `team-lite/release.json`, build do produto correto, slug `upstatus-team-lite`, branch/SHA/projeto explícitos e CLI pinada.
3. Substituir o deploy-test automático com secret compartilhado por workflow manual com projeto TEST fixo e guard contra produção.
4. Coordenar o cutover Normal: updateURL e API precisam apontar para runtimes que recebam o código candidato; não deixar API beta10 fora do deploy.
5. Implementar Realtime privado/autenticado em ambos os produtos, alinhar tópicos e remover payloads completos de mensagens.
6. Completar AUTH-03 em Normal e Team Lite, incluindo rate limit de emissão de convite também no Normal; testar admin/não-admin.
7. Corrigir upload para validar conteúdo real, revisar MIME declarado, decidir buckets privados e criar policies Storage.
8. Endurecer grants, default ACLs e SECURITY DEFINER com plano revisado e rollback.
9. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
10. Provisionar Full-Product TEST isolado; executar os oito testes físicos da #78 e obter review/aprovação humana.

## Integridade da execução

A única escrita desta rodada é este relatório novo na branch QA. O documento-base de aproximadamente 1 MB foi lido, mas não regravado; o histórico foi preservado. O comentário QA dedicado da Issue #79 foi atualizado separadamente; o comentário da Engenharia não foi alterado.

Todas as consultas SQL foram SELECT-only. Não houve alteração de produção, deploy, merge, migration, release, publicação de userscript, leitura de secrets, alteração de flags/roles/grants/policies/ACLs ou operação destrutiva.
