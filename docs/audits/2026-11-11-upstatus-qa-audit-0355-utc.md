# Auditoria independente UpStatus — 2026-11-11 03:55 UTC

## Escopo e limites

Auditoria read-only do GitHub `Reekyi/UpStatus` e dos projetos Supabase de produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`. Nenhum teste local, navegador real ou requisição externa de exploração foi executado nesta rodada. Os resultados de CI abaixo são workflows já existentes.

A única escrita foi este relatório novo na branch QA e a atualização do comentário QA já existente na Issue #79. Não houve alteração de produção, SQL, migration, secret, flag, função implantada, merge, deploy, release ou publicação de userscript.

## Heads e integridade documental

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `9de76df757f2ae8631fa08346e41d3c6038b2fd6` |
| PR #74 | `fb878537` |
| PR #75 | `7bbf9b90` |
| PR #76 | `3b1406dd` |
| PR #82 | `9de76df` |
| PR #101 | `2ef7c332` |
| PR #140 | `8493ece` |
| PR #141 | `61d00fb` |
| PR #142 | `6fa53bd` |
| PR #143 | `6a5127b` |

A QA está 209 commits à frente e 1 atrás de master; merge-base `a9288cc`. Não fiz rebase nem force-push. A branch foi atualizada apenas com um arquivo de auditoria novo.

`docs/RELEASE_READINESS.md` foi lido pelo blob `7cfbd70886df42ce790c078c224b19284a632595`: 8.410 linhas. O último bloco de revalidação dentro do documento é de 2026-11-08 18:30 UTC. Portanto, o documento principal está desatualizado em relação aos achados desta execução; os relatórios mais recentes estão em `docs/audits/`.

## PRs e CI

| PR | HEAD | Estado / evidência |
|---|---|---|
| #74 Normal | `fb878537` | Smoke e Validate passaram. O smoke executou endpoints, integração autenticada, concorrência de signaling e read receipts; a etapa de rate limit de emissão de convite foi skipped porque o harness não estava presente nessa linha. [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) · [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) |
| #75 Team Lite | `7bbf9b90` | PASS limitado: apenas scripts e metadados de versão. Não é suíte funcional completa. [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite | `3b1406dd` | Candidate Checks passou, incluindo guards de build/ambiente, adaptador de signaling, recuperação de voz/tela, contrato HTTP offline, autenticação do endpoint, Playwright com stubs Tampermonkey e integração isolada. [Checks](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) |
| #82 QA | `9de76df` | FAIL em `scripts/validate.mjs:26`: `production updateURL mismatch`. O build reportou PROD/TEST 3.4.7 antes da falha. [Validate e log](https://github.com/Reekyi/UpStatus/actions/runs/42948618148) |
| #101 Signaling | `2ef7c332` | Draft, sem review. O candidato mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409; o runtime de laboratório v32 não. O workflow de paridade foi executado em push, não há evidência de cutover/implantação. [PR](https://github.com/Reekyi/UpStatus/pull/101) |
| #140 Migration Parity | `8493ece` | Guard estático offline passou, mas workflow push-only; não executa SQL nem recupera os quatro arquivos históricos. Draft, sem review. [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42928939793) |
| #141 Staged Chat | `61d00fb` | Validate PR passou; sem review. [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42936993580) |
| #142 API parity | `6fa53bd` | Guard push passou; sem check PR-triggered comprovado e sem review. [Workflow](https://github.com/Reekyi/UpStatus/actions/runs/42943564821) |
| #143 Normal dispatcher | `6a5127b` | Guard offline e Validate passaram; o job de deploy foi skipped por ser evento de PR. Draft, sem review. [Guard](https://github.com/Reekyi/UpStatus/actions/runs/42951880410) · [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42951880413) |

As PRs #74, #75, #76, #82, #101, #140, #141, #142 e #143 não apresentam review humana registrada nesta inspeção. CI verde não equivale a aprovação humana nem a teste manual.

## Achado crítico — tópico Realtime divergente

Decodifiquei os userscripts efetivamente servidos por Normal v480 e Team Lite v15. Ambos usam:

`UP_REALTIME_TOPIC = upstatus-screen-share-live-3-1-1-beta10`

Ambos criam o canal sem `private:true`, sem `realtime.setAuth()` e usam a chave publishable. Os listeners incluem `db_change` e eventos de signaling.

No PostgreSQL de produção, os três triggers ativos publicam em outro tópico:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

As definições de `upstatus_broadcast_messages`, `upstatus_broadcast_users` e `upstatus_broadcast_remote_state` confirmam esse destino e usam `private=false`. O catálogo de `realtime.messages` contém 67 registros, todos públicos, todos nesse tópico legado: 35 `user_status`, 20 `db_change`, 6 `remote_command` e 6 `remote_result`.

**Impacto funcional:** os listeners dos clientes atuais não estão no mesmo tópico dos triggers de banco. As notificações de mudança geradas por esses triggers não chegam ao canal que os clientes assinam; polling pode mascarar parte do efeito, mas não foi feito teste de navegador nesta rodada.

**Impacto de segurança:** o broadcast legado está configurado como público e a trigger de mensagens envia o registro inteiro via `to_jsonb(OLD/NEW)`, podendo incluir conteúdo e metadados da mensagem. A exposição foi confirmada pela configuração e pelos registros persistidos; não foi feita exploração externa.

## RLS, grants, SECURITY DEFINER e Storage

Produção:

- 10 tabelas públicas com RLS habilitado e zero policies.
- 9 tabelas (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) concedem SELECT, INSERT, UPDATE, DELETE e TRUNCATE a `anon` e `authenticated`.
- RLS sem policies bloqueia operações normais por linha, mas não é proteção para TRUNCATE. Nenhuma operação destrutiva foi tentada.
- Default ACL: 60 entradas para `anon` e 60 para `authenticated`, total 120.
- `realtime.messages`: RLS ativo, zero policies, SELECT concedido a ambos os papéis.
- Três funções broadcast são SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated e retornam `trigger`, estando anexadas a triggers. O Advisor emite WARN; o tipo de retorno trigger não demonstra que sejam RPCs comuns diretamente invocáveis. Não foi tentada chamada RPC.
- Buckets `chat-images` e `profile-images` são públicos, ambos com limite real de 20 MiB; `storage.objects` tem zero policies próprias.

Laboratório:

- Projeto separado e ACTIVE_HEALTHY, 39 migrations.
- Contagens exatas por SELECT: zero linhas em users, messages, sessions, rooms, room_members, events, bindings, signaling rate limits, call attempts, voice attempts e invite rate limits.
- Zero mensagens Realtime e zero buckets Storage.
- 18 tabelas públicas com RLS e zero policies; zero grants diretos de tabela para anon/authenticated.
- Default ACL ainda contém 48 entradas para anon e 48 para authenticated, total 96.
- As três funções broadcast do laboratório usam search_path vazio e não concedem EXECUTE a anon/authenticated.

## Chat, anexos e autorização

A tabela de produção tem 279 mensagens: 5 do tipo `document`, 6 audio, 16 image, 22 system, 227 text e 3 video. As cinco mensagens document estão sem `file_name`. A coluna existe, mas os três runtimes implantados não contêm referências a `file_name`.

A API candidata da #142 já lê/grava `file_name` e usa o helper de papel administrativo, mas não está implantada. Nos três runtimes implantados (Normal v480, beta10 v6 e Team Lite v15), a rota de limpeza global do chat ainda compara o nome literalmente com Ricardo. A tabela users tem 5 contas, todas com senha e papel preenchidos, três com papel administrativo; portanto, os outros administradores não recebem a mesma autorização no endpoint implantado.

O primeiro acesso continua exposto por `POST /api/setup` → `login(req,true)`, sem token de convite. O handler permite configurar qualquer conta existente sem password_hash e aplica fallback nominal para os três administradores iniciais. O snapshot atual tem zero contas sem senha, então não há conta existente desconfigurada observada; o risco permanece para novas contas. Team Lite exige senha mínima de 4 caracteres, enquanto Normal exige 6.

Na candidata #142, `sniffMime` valida bytes no caminho legado de upload por data URL. O endpoint de signed upload verifica MIME e tamanho declarados e emite URL/token, mas não foi encontrado pós-processamento que inspecione os bytes efetivamente enviados. Tratar isso como hardening pendente, não como exploração comprovada.

Há drift de limites: os buckets implantados aceitam 20 MiB; a configuração candidata define chat-images em 25 MB e profile-images em 2 MB. O mediaRoute permite até 25 MiB para imagem/vídeo, acima do limite atual do bucket; uploads nessa faixa podem passar pelo handler e falhar no Storage. O dispatcher #143 não aplica configuração de Storage.

## Voz e signaling

O runtime isolado `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE`, que cai no fallback HTTP 500. A fonte candidata da #101 inclui o mapeamento para 409. A função `upstatus-signal` não existe na produção.

Os userscripts implantados não contêm `signaling_transport_enabled`, `private:true` ou `setAuth()`; o caminho público legado de call/voice/screen signaling permanece. A Issue #78 continua aberta com os oito critérios de aceite desmarcados. Não houve teste físico de queda de internet, recuperação sem F5, reentrada em sala ou interoperabilidade instalada Normal ↔ Team Lite.

## Publicação e PR #143

A branch master ainda contém o workflow antigo: exige exatamente 3.4.7, usa Supabase CLI `latest` e publica somente `upstatus`. O `release.json` de master continua 3.4.7.

A branch `team-lite-official` está em `9065bc1`; seu workflow `deploy-production.yml` também publica `upstatus`, usa CLI `latest` e o manifesto é 3.0.40-beta.22, enquanto a função Team Lite implantada está em 3.4.30. Essa branch não representa a candidata #76.

A #143 melhora a cadeia Normal: manual dispatch em master, confirmação explícita, SHA exato, PR merged, aprovação humana allowlisted no head, preflight de projeto/organização/branch/migrations, CLI 2.122.1 e deploy do API beta10 antes do userscript. O deploy não foi executado; o job ficou skipped no evento de PR.

Limitações encontradas no guard:

1. `assertSuccessfulReleaseChecks` aceita `skipped` para qualquer check e não fixa uma allowlist de nomes de checks obrigatórios.
2. A API de checks é consultada para o SHA do head da PR, não para o merge/release SHA.
3. `UPSTATUS_CURRENT_NORMAL_VERSION`, `UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED` e `UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE` são repository variables não vinculadas a um release SHA/data; podem ficar obsoletas.
4. A configuração efetiva de required reviewers do environment `production` não foi verificada.
5. O preflight confere versão/nome no ledger, não presença/hash dos SQLs originais.
6. Não há smoke test pós-deploy nem compensação automática caso o deploy do API funcione e o deploy da distribuição falhe.
7. O dispatcher não implanta `upstatus-signal`; portanto não fecha o gate de signaling privado/autorizado.

A produção Supabase está ACTIVE_HEALTHY como projeto, mas a branch default `main` (tracking master) está `MIGRATIONS_FAILED`; o preflight da #143 exige ACTIVE_HEALTHY e falhará. O release manifest continua 3.4.7, sem nova versão estável acima da versão atualmente servida.

## Migrations e proveniência

O ledger de produção contém 7 versões/nome. A branch gerenciada `main` está MIGRATIONS_FAILED. Os quatro arquivos originais abaixo retornam 404 em master:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #140 compara estaticamente o bloco de migration AUTH-03 e tem auto-regressões offline, mas é push-only e não recupera nem valida os bytes dos quatro arquivos históricos. O preflight #143 compara somente version/name no ledger.

## Veredito e gates

**Release recommendation: `not_ready`.**

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 67/67 registros públicos no tópico legado; clientes no tópico beta10 |
| TEST-ISOLATION | in_progress | Projeto separado, 39 migrations, tabelas de fixtures zeradas; sem buckets/Realtime de produto e Default ACL ainda amplo |
| MIGRATION-PROVENANCE | blocked | quatro SQLs 404; branch main MIGRATIONS_FAILED |
| AUTH-03 | blocked | primeiro acesso sem token de convite; rate limit/invite schema ausente em produção |
| ACL-STORAGE | blocked | 9 tabelas com grants amplos incluindo TRUNCATE; 120 Default ACL; buckets públicos sem policies |
| RECONNECT | pending | Issue #78 com 0/8 critérios físicos |
| HUMAN-REVIEW | pending | PRs relevantes Draft/sem reviews; sem autorização explícita de release |

## Próximas ações recomendadas

1. Alinhar o tópico dos triggers com o dos clientes e migrar Realtime para canais privados/autorizados.
2. Integrar e validar o signaling server-mediated nos dois clientes; não habilitar fallback público como padrão.
3. Corrigir AUTH-03 e eliminar primeiro acesso sem convite.
4. Unificar autorização de chat por papel nos runtimes efetivamente implantados.
5. Completar a persistência de file_name e adicionar teste de browser/API/Storage; validar bytes no caminho de signed upload.
6. Alinhar limites de bucket, handlers e configuração.
7. Revogar grants/Default ACL excessivos, criar policies mínimas de Storage e reavaliar funções SECURITY DEFINER.
8. Recuperar os SQLs originais e resolver MIGRATIONS_FAILED antes do preflight.
9. Fortalecer o guard #143 com checks obrigatórios nomeados no SHA de release, aprovações vinculadas ao SHA e evidência humana não obsoleta.
10. Corrigir o workflow Team Lite e executar os oito testes físicos da Issue #78; obter revisão e autorização humana antes de qualquer release.

**Nenhuma produção foi modificada.** Todas as consultas SQL foram SELECT-only. Nenhum teste manual, HTTP externo ou navegador real foi executado nesta rodada.
