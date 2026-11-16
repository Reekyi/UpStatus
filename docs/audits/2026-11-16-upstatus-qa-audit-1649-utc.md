# Auditoria independente UpStatus — 2026-11-16 16:49 UTC

**Execução:** 2026-11-16T16:50:21.863Z  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** leitura de `docs/RELEASE_READINESS.md` na branch QA, refs/commits/PRs/issues, workflows, arquivos de build e templates Normal/Team Lite, logs de CI existentes, fontes Edge Functions, advisors e catálogo PostgreSQL. Consultas SQL foram SELECT-only. Nenhum teste foi iniciado pela QA nesta execução.

> Esta auditoria não autoriza merge, deploy, release, publicação de userscripts, alteração de secrets/flags, migrations ou mudanças de segurança em produção.

## 1. Documento-base e heads reais

Li `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`: blob `7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c`, 8.422 linhas. O documento-base termina na revalidação de 2026-11-15 06:30 UTC; as revalidações horárias de 16/11 estão em `docs/audits/`. Mantive o documento-base e os relatórios anteriores intactos.

| Ref | HEAD observado | Estado |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | base de produção |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | workflow TEST antigo |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | runtime oficial 3.4.30 |
| QA `qa/release-readiness-2026-11-04-master` | `793ddc86eb3a9f25a42172329212f68ed967be56` | HEAD da PR #82 |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` | aberta / Draft |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | aberta / Draft |
| PR #76 | `00a578e9174e08238a1289a35feb02d171625421` | aberta / Draft |
| PR #82 | `793ddc86eb3a9f25a42172329212f68ed967be56` | aberta / Draft |

Comparações de commits:
- #74: 887 commits à frente e 1 atrás de `master`; 90 arquivos alterados.
- #75: 59 commits à frente de `team-lite-official`; é baseline histórica.
- #76: 389 commits à frente de `team-lite-official`; descendente de #75, 330 commits à frente e 0 atrás; 59 arquivos alterados.
- #82: 371 commits à frente e 1 atrás de `master`; 210 arquivos alterados, todos sob `docs/`.

As quatro PRs continuam abertas/Draft e sem reviews humanas registradas. A API de branches reporta `protected=false` para master, develop, team-lite-official e QA; rulesets não foram consultados, portanto não concluo que inexista proteção por ruleset.

## 2. CI e testes nos HEADs exatos

| PR | Evidência atual | Classificação |
|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Signaling Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS no HEAD `dcaf6a0` | **CI PASS**. Logs: 19/19 checks não autenticados e 136/136 autenticados; Chromium validou WebRTC de chamada, sala de voz e tela, mesh de três membros, concorrência do rate limiter, recibos atômicos e setup enrollment isolado. |
| #75 Team Lite baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS | **PASS histórico** somente para o HEAD da baseline; não valida a continuação #76. |
| #76 Team Lite | [Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAILURE no HEAD `00a578e` | O job offline `signed-upload-contracts` passou. O job `candidate-checks` recebeu HTTP 402 em `/health` e nas 15 verificações seguintes; o corpo informa `exceed_edge_functions_invocations_quota`. Resultado 0/16 checks não autenticados. Playwright, Full-IIFE, testes autenticados, concorrência e cleanup foram ignorados após a falha. |
| #82 QA docs | [Validate 43901587340](https://github.com/Reekyi/UpStatus/actions/runs/43901587340): FAILURE no HEAD `793ddc8` | Falha em `scripts/validate.mjs:26`: `production updateURL mismatch`. A PR é documental e não altera o build/validator. |

Detalhes relevantes:
- Na #74, o CI é evidência automatizada isolada, não teste físico no Sale Smartly/Tampermonkey. O teste de emissão de rate limit de setup-invite não existe no template Normal, embora a integração de setup enrollment tenha passado.
- Na #76, 11/11 contratos HTTP isolados do helper passaram antes da chamada real ao endpoint. O contrato de upload assinado passou com mocks; não houve PUT real ao Storage.
- O último CI Team Lite disponível continua bloqueado pela quota observada às 12:41 UTC. Não foi feita nova chamada de teste ao laboratório nesta execução, portanto não há evidência de que a quota tenha sido restaurada.
- Nenhum teste foi executado diretamente pela QA; somente os logs de CI existentes foram inspecionados.

## 3. Causa concreta da falha de updateURL na base master

A falha de #82 foi rastreada estaticamente:
- `release.json` aponta `scriptUrl` para `/functions/v1/upstatus/upstatus.user.js`.
- `master/scripts/build.mjs` constrói a URL de atualização a partir de `CLOUD_SERVER`, cujo endpoint de produção é `upstatus-screen-share-3-1-1-beta10`.
- O resultado do build, portanto, aponta o `updateURL` para o endpoint beta10.
- `master/scripts/validate.mjs:26` exige `/upstatus/upstatus.user.js`.

É um contrato contraditório entre build, manifesto e validator. O conteúdo da PR #82 não introduz a divergência. A build da candidata #74 já separa a URL de distribuição (`release.json.scriptUrl`) da API legada beta10, mas o workflow de deploy dessa candidata publica somente a função `upstatus`.

## 4. Workflows, publicação e compatibilidade Normal / Team Lite

### Workflows nas branches oficiais

- `master/.github/workflows/deploy-production.yml`: manual, mas usa secret genérico `SUPABASE_PROJECT_ID`, Supabase CLI `latest`, guard de versão 3.4.7 e publica somente `upstatus`. Não há verificação explícita do SHA/ref aprovado nem comparação do project ref com o ID esperado de produção.
- `develop/.github/workflows/deploy-test.yml`: push em develop e manual; usa `SUPABASE_PROJECT_ID` genérico e CLI `latest`; não tem guard explícito para exigir um projeto Full-Product TEST diferente de produção.
- `team-lite-official/.github/workflows/deploy-production.yml`: usa secret genérico, CLI `latest`, sem guard explícito de projeto/SHA e executa `supabase functions deploy upstatus`. **O slug é do Normal, não `upstatus-team-lite`. Não despachar.**

### Candidatas

- O workflow de produção da #74 é manual-only, faz checkout do SHA dispatchado, exige `refs/heads/master`, confere o SHA e o project ref de produção, fixa CLI 2.122.1 e publica `upstatus`. Ainda não publica/atualiza `upstatus-screen-share-3-1-1-beta10`.
- O build #74 mantém `CLOUD_SERVER` do Normal apontando para beta10, mas usa `release.json.scriptUrl` para distribuir o artefato via `upstatus`. Publicar apenas `upstatus` não atualiza o backend beta10 que o cliente usa para login/chat/status.
- O workflow TEST candidato na #76 é manual-only, usa `vars.SUPABASE_TEST_PROJECT_ID`, rejeita produção e o laboratório de sinalização, confere igualdade entre build/deploy project IDs e fixa CLI 2.122.1. Essa proteção ainda não está em develop.
- `team-lite-candidate.yml` da #76 usa checkout fixado por SHA, `persist-credentials: false`, serializa o uso do projeto de fixtures e valida o projeto isolado. A integração, porém, falhou por quota.

### Compatibilidade e AUTH-03

- Edge Functions implantadas: `upstatus` v480 / Normal 3.4.7; `upstatus-screen-share-3-1-1-beta10` v6 / backend 3.1.1-beta8; `upstatus-team-lite` v15 / Team Lite 3.4.30. Todas reportam `verify_jwt=false`; isso não prova ausência de autenticação por si só, pois os handlers usam sessão/token customizado.
- As três fontes implantadas ainda expõem `needsSetup` e aceitam `POST /api/setup` sem token de convite. O fallback de papel vazio ainda atribui `implementation_admin` aos nomes literais Ricardo, Lohan e Guilherme. Normal exige senha mínima de 6 caracteres; Team Lite exige 4.
- Os templates candidatos Normal e Team Lite exigem token de primeiro acesso e RPC de consumo atômico. O template Team Lite também aplica rate limit de emissão de convite (5 por 15 minutos); o template Normal não chama essa RPC. A paridade de AUTH-03/rate limit ainda não está fechada.
- O catálogo de produção não contém colunas `setup_token_*` nem as RPCs de convite, rate limit de convite, rate limit de sinalização ou merge atômico de recibos. Os templates candidatos não estão implantados.

## 5. Disponibilidade e Edge Functions

Os projetos produção e laboratório reportam `ACTIVE_HEALTHY`, mas isso não garante que as invocações Edge estejam liberadas.

Inventário:
- Produção: 38 Edge Functions ACTIVE, todas com `verify_jwt=false`; versões principais acima.
- Laboratório: duas Edge Functions de teste, incluindo `upstatus-signal-test` v32.
- A organização consultada tem somente dois projetos: produção e `upstatus-security-test`. Não existe um terceiro projeto Full-Product TEST.
- A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

### HTTP 402 em produção

Consulta de `function_edge_logs` na janela 2026-11-15 16:47:30 UTC a 2026-11-16 16:47:30 UTC. Os registros disponíveis começam em 11:41:55 UTC, portanto os totais são observações no recorte, não garantia de cobertura contínua de 24 horas.

| Rota | HTTP 402 observados |
|---|---:|
| beta10 `/api/chat` | 26.090 |
| beta10 `/api/status` | 11.384 |
| beta10 `/api/remote-status` | 11.358 |
| beta10 `/api/account` | 31 |
| beta10 `/api/members` | 21 |
| beta10 `/api/me` | 21 |
| distribuição `/upstatus/upstatus.user.js` | 6 |
| **Total observado** | **48.911** |

As três rotas centrais beta10 continuavam recebendo 402 até 16:47:21 UTC. No último intervalo de uma hora consultado, foram 8.548 respostas 402 nas rotas chat/status/remote-status.

**A causa específica dos 402 em produção não foi exposta nos logs.** Não atribuir automaticamente produção à mesma causa do laboratório.

No laboratório, o CI #76 recebeu explicitamente `exceed_edge_functions_invocations_quota`; a mensagem informa que o proprietário precisa atualizar o plano ou remover spend caps. Nenhuma alteração de plano/spend cap foi feita pela QA.

## 6. Segurança: RLS, grants, SECURITY DEFINER, Realtime e Storage

### PostgreSQL e grants

- Dez tabelas públicas de aplicação têm RLS habilitado e zero policies.
- Nove delas concedem a `anon` e `authenticated` SELECT/INSERT/UPDATE/DELETE/TRUNCATE; `upstatus_visual_config` não concede esses privilégios.
- RLS não restringe TRUNCATE. O grant é uma superfície de privilégio desnecessária; a auditoria não executou DML destrutivo nem demonstrou exploração por HTTP.
- Três funções de trigger (`upstatus_broadcast_messages`, `upstatus_broadcast_remote_state`, `upstatus_broadcast_users`) são SECURITY DEFINER, usam `search_path=public`, têm um trigger cada e EXECUTE para anon/authenticated/service_role. As funções retornam `trigger`; não foi demonstrada invocação RPC direta. O grant amplo continua desnecessário e o search_path deve ser endurecido.
- Default ACLs continuam amplas para objetos criados por `postgres` em `public`/`storage` e por `supabase_admin` em `public`, `graphql` e `graphql_public`.
- Security Advisor: 10 INFO de RLS sem policies; 3 WARN para anon e 3 WARN para authenticated nas três funções SECURITY DEFINER.

### Realtime

- `realtime.messages`: RLS habilitado, zero policies; grants SELECT/INSERT para anon e authenticated.
- Snapshot: 106 mensagens, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; última linha em 2026-11-13.
- O trigger `upstatus_broadcast_messages()` publica a linha OLD/NEW completa via `to_jsonb` no broadcast público `db_change`. Os triggers de remote-state e user-status também publicam metadados em broadcast público.
- O build master e Team Lite oficial ainda usam o tópico `upstatus-screen-share-live-3-1-1-beta10`, enquanto os triggers publicam em `upstatus-live-...`. As candidatas #74/#76 mudam para o tópico dos triggers, mas continuam sem canal privado/autorizado.
- Nas candidatas Normal e Team Lite, `signaling_transport_enabled` é false por padrão e o endpoint de transporte começa vazio. Os clientes criam `channel(UP_REALTIME_TOPIC)` sem `private:true`/JWT Realtime; voice-room e screen-share continuam com fallback público enquanto a flag não é habilitada. RT-01 segue bloqueado.

### Storage

- `chat-images` e `profile-images` são públicos, limite de 20 MiB, zero policies próprias em `storage.objects`.
- O catálogo retorna 188 objetos. Não foi tentado acesso a objetos nem alteração de buckets.
- A política de privacidade/isolamento por objeto continua sem resolução.

## 7. Migrations e proveniência

- Produção: 7 migrations, última `20261027155438`.
- Laboratório: 39 migrations.
- Os quatro SQLs originais abaixo retornam 404 tanto em master quanto na branch QA, embora as versões constem no ledger remoto de produção:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruir esses SQLs por inferência do schema remoto e não aplicar migrations em produção.

## 8. Aceite manual, issues e aprovação

- Issue #78 permanece OPEN com os oito critérios físicos desmarcados (0/8): perda real de internet, retorno sem F5, reentrada em sala, novas chamadas, áudio bidirecional, participantes remanescentes, ausência de peers/pollers órfãos e teste manual no navegador.
- CI Chromium/WebRTC não substitui Tampermonkey instalado, permissões reais de microfone/tela nem teste físico Normal ↔ Team Lite.
- PRs #74, #75, #76 e #82 permanecem Draft, abertas e sem reviews humanas.
- Issue #79: comentário dedicado QA atualizado no lugar, sem duplicata; comentário da Engenharia preservado.

## 9. Veredito e próximos passos

**NOT READY.** Gates reavaliados:
- RT-01: BLOCKED.
- TEST-ISOLATION: BLOCKED.
- MIGRATION-PROVENANCE: BLOCKED.
- AUTH-03: BLOCKED.
- ACL-STORAGE: BLOCKED.
- RECONNECT: PENDING.
- HUMAN-REVIEW: PENDING.

Prioridades:
1. Confirmar e restaurar a causa dos 402 no projeto de produção; não assumir que a quota do laboratório é a mesma causa.
2. O proprietário do laboratório deve resolver a restrição de invocações Edge e repetir o CI integrado #76 no HEAD exato.
3. Planejar cutover coordenado do Normal: distribuição `upstatus` e API beta10, com versão, rollback e validação; publicar apenas `upstatus` não atualiza o backend que atende as chamadas atuais.
4. Corrigir o workflow Team Lite oficial para o slug `upstatus-team-lite`, projeto/SHA explícitos e CLI pinada.
5. Completar AUTH-03 e rate limit de emissão de convites no Normal, depois validar em TEST oficial.
6. Projetar Realtime privado/server-mediated, reduzir payloads, revisar grants/default ACLs e decidir Storage privado.
7. Recuperar os quatro SQLs originais, diagnosticar `MIGRATIONS_FAILED`, concluir os testes físicos da #78 e obter aprovação humana.

Nenhum teste foi iniciado pela QA. Nenhuma consulta SQL escreveu dados. Não houve deploy, merge, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. A única escrita desta execução é este relatório documental na branch QA e a atualização do comentário QA existente na Issue #79.
