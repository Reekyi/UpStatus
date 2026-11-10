# Auditoria independente UpStatus QA — 10/11/2026 16:41 UTC

## Resultado executivo

**Release recommendation: NOT READY.**

As candidatas Normal #133 e Team Lite #134 têm checks PR-triggered completos aprovados nos HEADs consultados. AUTH-03 #89 também passou pela integração isolada e pelo guard de cutover, que bloqueou corretamente a produção. Isso é evidência de CI, não de deploy nem de aceitação física.

A rodada identificou três bloqueadores de integração/publicação:
1. As linhas Normal #89 e #133 definem topologias de API/deploy diferentes.
2. O workflow de produção da branch oficial Team Lite ainda publica a função Normal `upstatus`, não `upstatus-team-lite`.
3. A PR #137 de cleanup AUTH-03 está divergida da base atual da #89 e não tem check PR-triggered.

A produção continua com Realtime público, permissões excessivas, setup antigo e migrations AUTH-03 ausentes.

## Heads e governança

Heads conferidos diretamente:
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- QA `qa/release-readiness-2026-11-04-master`: `ae171ea0f6ecf4b9a227c702f5557f6b0007c854`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.

QA está 193 commits à frente e 1 atrás de master. #74 está 883 à frente e 1 atrás de master. #76 está 378 à frente e 0 atrás de team-lite-official. As branches master, QA e team-lite-official retornam `protected=false`; a API de rulesets retornou lista vazia.

As reviews consultadas para #74, #75, #76, #82, #89, #133, #134, #135 e #137 estão vazias. Todas permanecem Draft. Não há aprovação humana registrada.

## PRs, commits e CI

| PR | HEAD | Resultado observado | Limitação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS; 136/136 verificações autenticadas; WebRTC de chamada/voz/tela, mesh de 3, teardown e rate limit de sinalização aprovados. | A etapa de rate limit distribuído de emissão de convites foi SKIPPED. O teste de consumo único de convite passou. |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS. | O job do HEAD atual executou apenas o check de scripts/metadata de candidato. Não equivale à suíte completa de integração. Manifesto candidato 3.4.31; branch oficial permanece 3.4.30. |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | Candidate Checks [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) PASS; 110/110 autenticadas; browser WebRTC de chamada/voz/tela, mesh, teardown, rate limit de sinalização e convites aprovados. | Candidata ainda opt-in; não contém o guard de origem de sinais portado posteriormente para #134. |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `ae171ea0f6ecf4b9a227c702f5557f6b0007c854` | Validate [42846013471](https://github.com/Reekyi/UpStatus/actions/runs/42846013471) FAIL. | Log confirma `production updateURL mismatch` em `scripts/validate.mjs:26`. A branch documental não altera runtime; o validator herdado continua incompatível com o build de master. |
| [#89 AUTH-03 Normal](https://github.com/Reekyi/UpStatus/pull/89) | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` | Guard PR-triggered [42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) SUCCESS; Validate offline, consumo atômico no laboratório, cleanup e regressões de cutover passaram. | O guard reportou PRODUCTION CUTOVER BLOCKED: release continua 3.4.7 e as três migrations AUTH-03 não estão aplicadas. CI verde não significa cutover autorizado. |
| [#133 Normal combinado](https://github.com/Reekyi/UpStatus/pull/133) | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` | API Target Validate [42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) e Signaling Smoke [42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) PASS; 136/136 autenticadas. Rate limit de emissão de convites também passou nesta execução. | Candidata Draft; não resolve o cutover de produção nem possui o mesmo preflight de migrations da #89. |
| [#134 Team Lite combinado](https://github.com/Reekyi/UpStatus/pull/134) | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` | Candidate Checks [42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e Call Source Guard [42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) PASS; 110/110 autenticadas, 16/16 não autenticadas, 11/11 contratos HTTP; Playwright e rate limit de convites aprovados. | Não prova publicação nem teste físico Tampermonkey. |
| [#135 migration recovery](https://github.com/Reekyi/UpStatus/pull/135) | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` | Validate [42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) FAIL no validator herdado. | Arquiva statements do ledger; não recupera arquivos originais byte a byte. |
| [#137 fixture cleanup](https://github.com/Reekyi/UpStatus/pull/137) | `73cf0461b8f173277a18e1d2525e8d5ea7aa5526` | Push workflow [42821890896](https://github.com/Reekyi/UpStatus/actions/runs/42821890896) PASS. | Nenhum check PR-triggered no HEAD. PR mergeable=false; está 5 commits à frente e 7 atrás da base atual da #89. Precisa ser portada e validada sobre o HEAD atual. |

### Diferença entre CI e teste manual

- Os resultados acima são GitHub Actions/CI, incluindo Playwright com navegador offline e stubs de Tampermonkey.
- A integração AUTH-03 usa o projeto Supabase isolado e fixtures temporárias.
- Não houve teste manual no Sale Smartly, Tampermonkey real, microfone/dispositivo de captura real ou queda física de internet nesta rodada.
- Não executei build/teste local: não havia checkout local do repositório disponível nesta execução.

## Divergência de arquitetura Normal

A comparação de `scripts/build.mjs` e `.github/workflows/deploy-production.yml` nas duas candidatas revelou contratos diferentes.

**#89 — dual runtime**
- `PROD_FUNCTION=upstatus` serve a distribuição do userscript.
- `PROD_API_FUNCTION=upstatus-screen-share-3-1-1-beta10` continua como API do cliente.
- Build gera as duas Edge Functions.
- Deploy protegido verifica ref/SHA, projeto, cutover e migrations; publica beta10 primeiro e depois upstatus.
- CLI fixada em 2.122.1.

**#133 — runtime único**
- `CLOUD_SERVER` e distribuição apontam para `upstatus`.
- Build gera somente `upstatus` e `upstatus-test`.
- Deploy publica somente `upstatus`; não contém o mesmo cutover guard e preflight read-only de migrations da #89.
- `release.json` ainda está em 3.4.7. O guard de sincronização do artefato raiz exige incremento de versão antes de substituir um artefato diferente.

A produção atual ainda corresponde ao modelo dual runtime: o userscript entregue por `upstatus` chama API beta10. Não integrar as duas linhas sem decisão explícita sobre compatibilidade de clientes antigos, ordem de deploy, versão e preflight de migrations.

## Team Lite: workflow oficial incompatível

O arquivo `.github/workflows/deploy-production.yml` em `team-lite-official`:
- executa `supabase functions deploy upstatus`, que é a função Normal;
- usa Supabase CLI `latest`;
- não verifica checkout SHA exato nem project ref esperado.

O userscript Team Lite oficial 3.4.30 e a candidata 3.4.31 usam API `upstatus-team-lite`. A PR #134 atualiza os checks de candidato, mas não corrige o workflow oficial de deploy. Não executar esse dispatcher.

## Produção Supabase — projeto dlfvkawaiqduhlazsszm

Projeto ACTIVE_HEALTHY; branch gerenciada `main` reporta `MIGRATIONS_FAILED`. O inventário tem 7 migrations.

### Edge Functions e artefatos implantados

O inventário tem 38 Edge Functions; todas retornam `verify_jwt=false` no metadata. Isso, isoladamente, não prova ausência de autenticação: os handlers principais implementam validação própria e precisam ser avaliados individualmente.

| Função | Versão da função | Backend/Userscript extraído | API do userscript | Tópico |
|---|---:|---|---|---|
| `upstatus` | v480 | 3.4.7 / 3.4.7 | beta10 | beta10 |
| `upstatus-team-lite` | v15 | 3.4.30 / 3.4.30 | upstatus-team-lite | beta10 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | 3.1.1-beta8 / beta8 | beta8 | beta8 |
| `upstatus-test` | v281 | 3.3.28 / 3.3.28 | beta10 | beta10 |

Os três runtimes principais e o TEST extraído usam o setup legado `POST /api/setup -> login(req,true)`. Nenhum dos userscripts implantados contém `private:true` ou `realtime.setAuth()`. A função `upstatus-test` está no mesmo projeto de produção; não é um terceiro projeto TEST isolado.

### Realtime

Consulta somente leitura em `realtime.messages` encontrou **62 registros**, todos `private=false`, todos no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. O intervalo observado foi 2026-11-09 12:02:26 a 2026-11-10 16:03:26 UTC; não tratar a contagem como janela de 24 horas.

Os três triggers de broadcast estão ativos. As funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, têm `search_path=public` e ACL com EXECUTE para PUBLIC, anon, authenticated e service_role. `upstatus_broadcast_messages` envia a linha OLD/NEW completa por `to_jsonb`. O Advisor mostra três avisos para anon e três para authenticated. Não foi tentada exploração RPC direta.

### RLS, grants, ACL e Storage

- Security Advisor: 10 tabelas públicas com RLS habilitado e sem policies (INFO).
- Nove tabelas backend-owned concedem a anon e authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE: `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`.
- `realtime.messages` concede INSERT, SELECT e UPDATE a anon/authenticated; nenhuma policy foi encontrada.
- `storage.objects` concede CRUD a anon/authenticated e nenhuma policy foi encontrada.
- Buckets `chat-images` e `profile-images` estão públicos, com limite de 20 MiB. Bucket público torna os objetos endereçáveis publicamente; isso não prova que qualquer usuário possa executar upload.
- As três funções trigger-only SECURITY DEFINER mantêm EXECUTE amplo; não se demonstrou chamada RPC bem-sucedida.

Contagem atual de `pg_default_acl` para schemas public/storage:
- Produção: 9 registros, 144 ACL entries expandidas, 72 entradas destinadas a anon/authenticated.
- Laboratório: 9 registros, 120 ACL entries expandidas, 48 entradas destinadas a anon/authenticated.

As Default ACLs continuam concedendo privilégios a papéis clientes para objetos futuros, inclusive tabelas, sequências e funções criadas por postgres/supabase_admin. Não foram alteradas.

### AUTH-03 em produção

A consulta de colunas não encontrou colunas de setup/invite token em public. O inventário de migrations continua em sete versões, sem as três migrations AUTH-03 exigidas pelo guard #89. As estruturas/RPCs correspondentes existem no laboratório, não na produção. O setup implantado continua legado.

## Laboratório Supabase — bfpjtfqlnypisxljoxkb

Projeto `upstatus-security-test`, ACTIVE_HEALTHY, 39 migrations, 18 tabelas públicas com RLS e sem policies. Não há grants diretos para anon/authenticated nas tabelas públicas atuais. Consultas de fixtures encontraram zero usuários, sessões, mensagens, rate-limit rows e eventos; `realtime.messages` está vazia e não há buckets Storage.

O laboratório tem duas Edge Functions de teste: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Security Advisor reporta 18 INFO de RLS sem policy, sem os avisos SECURITY DEFINER encontrados em produção. Performance Advisor lista cinco índices não utilizados (INFO).

Apesar do isolamento atual, as Default ACLs ainda incluem 48 privilégios destinados a anon/authenticated para objetos futuros. O projeto é um laboratório de signaling/AUTH-03, não um ambiente full-product TEST com Storage e todos os runtimes.

## Proveniência das migrations

Os quatro arquivos originais continuam 404 em master:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_message_file_name.sql` (verificar o nome exato no histórico antes de qualquer restauração)
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A PR #135 arquiva statements recuperados de `supabase_migrations.schema_migrations`. São statements executados do ledger, não arquivos originais byte a byte; rollback é NULL. Permanecem fora de `supabase/migrations/` e não foram executados.

## Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta com 0/8 critérios físicos marcados. Reconexão sem F5 em Normal e Team Lite não foi confirmada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) recebeu atualização no comentário QA existente. Comentário da Engenharia foi preservado; não foi criado comentário QA duplicado.

## Leitura de RELEASE_READINESS.md — limitação desta rodada

O blob de `docs/RELEASE_READINESS.md` continua `7cfbd70886df42ce790c078c224b19284a632595`. A leitura por faixa (linhas 1–60 e 8380–8410) retornou conteúdo vazio; a tentativa raw foi rejeitada pelo GitHub Fetch com HTTP 400 por tamanho/limitação do endpoint. Portanto, **não afirmo ter relido integralmente o documento nesta execução**. A leitura integral anterior de 8.410 linhas permanece como referência; o conteúdo não foi alterado.

## Gates QA

| Gate | Status | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime público, clientes em tópicos antigos, sem private channel autenticado implantado. |
| TEST-ISOLATION | in_progress | Laboratório isolado e limpo; não é full-product TEST e Default ACL ainda permissiva. |
| MIGRATION-PROVENANCE | blocked | Quatro arquivos originais ausentes; #135 contém statements de ledger, não originais byte a byte. |
| AUTH-03 | in_progress | CI/integração no laboratório passou; schema e runtime de produção continuam antigos. |
| ACL-STORAGE | blocked | Grants, Default ACLs, SECURITY DEFINER e buckets públicos sem policies continuam pendentes. |
| RECONNECT | pending | Sem confirmação manual física dos dois clientes sem F5. |
| HUMAN-REVIEW | pending | Nenhuma review humana ou autorização explícita de release. |

## Próximas ações recomendadas

1. Escolher e documentar a topologia Normal final; reconciliar build, manifesto, endpoint API, cutover guard e ordem de deploy.
2. Preservar o guard de migrations/projeto/SHA da #89 ao integrar qualquer solução Normal.
3. Portar #137 sobre o HEAD atual da #89 e exigir check PR-triggered.
4. Corrigir o workflow Team Lite oficial para deploy de `upstatus-team-lite`, CLI pinada e validação de SHA/projeto.
5. Corrigir o validator QA sem enfraquecer a asserção de updateURL.
6. Implementar transporte server-mediated privado e cutover coordenado no laboratório antes de alterar qualquer runtime de produção.
7. Endurecer grants, Default ACLs, funções SECURITY DEFINER e Storage; testar também objetos futuros no laboratório.
8. Resolver proveniência/migration drift, obter review humana e só então preparar os oito testes físicos da Issue #78.

## Segurança da execução

Todas as consultas Supabase foram SELECT-only e todas as inspeções GitHub foram GET/read-only, exceto a criação deste relatório na branch QA e a atualização do comentário QA existente na Issue #79. Não houve escrita SQL, migration, deploy, merge, release, alteração de secrets/flags/roles/grants/ACL/policies ou publicação de userscript.
