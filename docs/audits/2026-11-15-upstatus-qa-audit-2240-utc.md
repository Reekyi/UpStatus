# Auditoria independente UpStatus — 2026-11-15 22:40 UTC

## Escopo e classificação

Repositório Reekyi/UpStatus; Supabase produção dlfvkawaiqduhlazsszm; laboratório bfpjtfqlnypisxljoxkb. Foram revalidados heads, PRs #74/#75/#76/#82, candidatas #161/#167/#168/#170, issues #78/#79, workflows, bundles/runtime Edge Functions, catálogo PostgreSQL, Advisors, migrations e logs.

- AUTOMATED PASS: workflow concluído com sucesso no SHA exato indicado.
- CODE INSPECTION: leitura estática de código, metadados ou catálogo; não é teste de execução.
- MANUAL PENDING: exige navegador Tampermonkey, dispositivos ou operador.
- BLOCKED: dependência ou risco confirmado impede o gate.
- NOT VERIFIED: evidência insuficiente.

Nenhum teste foi iniciado ou repetido manualmente nesta execução. Os resultados de CI citados são execuções existentes. Todas as consultas SQL foram SELECT-only.

## 1. Heads e integridade do GitHub

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA antes deste relatório | c5da9af483aa78bb401287c51c37310374fb1d1d |

A QA estava 349 commits à frente e 1 atrás de master, com merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. O HEAD QA coincide com o HEAD da PR #82. Master, develop e team-lite-official aparecem sem proteção clássica; a proteção da QA não foi confirmada.

| PR | HEAD | Base | Estado |
|---|---|---|---|
| #74 | dcaf6a072546eda0089e0cee4018c3047011f600 | master | OPEN / Draft |
| #75 | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | OPEN / Draft |
| #76 | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | team-lite-official | OPEN / Draft |
| #82 | c5da9af483aa78bb401287c51c37310374fb1d1d | master | OPEN / Draft |
| #161 | 557814dc31bed779b84a2094358dc6b2a7e67689 | chore/continuity-foundation | OPEN / Draft |
| #167 | d100b0820dd7f98e2b78a98e6b6f8c09f13b1867 | master | OPEN / Draft |
| #168 | c6de3eb29bb419e817a237487185df0df752015d | #161 | OPEN / Draft |
| #170 | 693039eddbd01e210fd1344b0196703ca067f374 | master | OPEN / Draft |

#76 está 327 commits à frente de #75 e 0 atrás. As duas PRs compartilham a mesma base; #75 é baseline histórica e #76 é a continuação. Não tratar como merges independentes.

As consultas de reviews não retornaram aprovações humanas para #74, #75, #76, #82, #161, #168 ou #170.

## 2. CI e candidatas

| Item | Evidência | Resultado |
|---|---|---|
| #74 Validate | [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | AUTOMATED PASS |
| #74 Signaling Smoke | [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | AUTOMATED PASS |
| #75 Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico no HEAD inalterado |
| #76 Candidate Checks | [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | AUTOMATED PASS |
| #82 Validate | [43764374378](https://github.com/Reekyi/UpStatus/actions/runs/43764374378) | FAIL |
| #161 Validate / Smoke | [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) / [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | AUTOMATED PASS |
| #167 Validate | [43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) | PASS no HEAD consultado |
| #168 Validate | [43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) | AUTOMATED PASS |
| #170 Validate | [43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686) | FAIL |

### Falha atual de #82

O log de 43764374378 mostra build Normal 3.4.7 / TEST 3.4.7 e falha em scripts/validate.mjs:26: production updateURL mismatch. Em master, scripts/build.mjs ainda deriva updateURL do endpoint legado; release.json exige /functions/v1/upstatus/upstatus.user.js.

### Nova candidata #170

A #170 corrige a geração de @updateURL/@downloadURL usando release.json.scriptUrl, falha fechada se o manifesto não apontar para o endpoint estável e desabilita o feed de produção no build TEST sem manifesto próprio. Seu Validate passa pelo antigo bloqueio updateURL, constrói Normal/TEST e falha depois em scripts/chat-regression.test.mjs:110: “files are staged instead of uploaded immediately”.

A falha decorre de dependência: a #170 espera setPendingAttachment, implementação que está na #167 e não existe na base master da #170. A #167 permanece Draft. Não remover a asserção para forçar CI verde. A #170 não tem Smoke no HEAD atual.

A #170 também troca a autorização de limpar chat: cliente e servidor exigem conta Ricardo e papel implementation_admin persistido. Isso é CODE INSPECTION; não está implantado.

### Versão e distribuição Normal

release.json de master e da #170 continua 3.4.7. A candidata altera o endereço de atualização, mas não aumenta a versão. Portanto, a entrega precisa coordenar bump estável, manifesto, guard do workflow, artefato e migração do backend. Sem versão superior, clientes já em 3.4.7 podem não receber a mudança automaticamente.

A #168 acrescenta Retry-After: 900 e Access-Control-Expose-Headers para setup-invite. Validate passou, mas não há Smoke/HTTP real. O intervalo de 900 segundos é conservador, não o tempo restante exato.

## 3. Workflows de publicação

- Master deploy-production é manual-only, exige exatamente versão 3.4.7, usa Supabase CLI latest e SUPABASE_PROJECT_ID vindo de secret genérico; publica somente upstatus. Não coordena beta10 nem valida o project ref contra o projeto esperado.
- Team Lite deploy-production também é manual-only, usa CLI latest e secret genérico, mas publica o slug upstatus em vez de upstatus-team-lite. Não valida projeto/SHA. NÃO DESPACHAR.
- Develop deploy-test dispara em push para develop, usa secret genérico SUPABASE_PROJECT_ID e CLI latest, sem validar explicitamente que o destino é o laboratório autorizado.
- #170 melhora o build/validator do updater, mas permanece Draft e seu Validate falha pela dependência de anexos da #167.

## 4. Runtime e AUTH-03

Supabase produção: projeto ACTIVE_HEALTHY, Postgres 17.11.0.002, 38 Edge Functions ACTIVE. Runtimes principais: upstatus v480, upstatus-team-lite v15, beta10 Normal v6 e upstatus-test v281. Todos reportam verify_jwt=false na plataforma; isso não prova ausência de autenticação, pois os handlers principais usam sessão/token próprio.

Laboratório: ACTIVE_HEALTHY, Postgres 17.11.0.003, duas Edge Functions ACTIVE: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

CODE INSPECTION das funções implantadas Normal e Team Lite:
- /api/setup continua sem convite obrigatório; não há rota setup-invite nem chamada a consume_upstatus_setup_invite_rate_limit.
- Produção tem 5 usuários, zero password hashes vazios, zero roles vazios, zero colunas setup_token_* e zero RPCs de convite/rate-limit.
- Laboratório tem zero usuários, quatro colunas setup_token_* e duas RPCs de convite.
- Senha mínima diverge: Normal 6 caracteres; Team Lite 4.
- Limpeza de chat em ambos os runtimes ainda autoriza por name === Ricardo, sem exigir papel persistido implementation_admin.
- #170 corrige o caminho de limpeza por papel persistido, mas não foi implantada.

AUTH-03 permanece BLOCKED em produção. A candidata #161 tem rate limit distribuído no laboratório, mas a tabela/RPC não existem em produção.

## 5. Realtime, RLS, grants e SECURITY DEFINER

Produção:
- 10 tabelas public com RLS e sem policies.
- 126 linhas de grants diretos para anon/authenticated em public; 18 grants TRUNCATE.
- Default ACLs expandidas: 120 entradas de privilégios para anon/authenticated em public, graphql, graphql_public e storage.
- Security Advisor: 6 WARN e 10 INFO. Os 6 WARN correspondem a EXECUTE para anon/authenticated nas três funções SECURITY DEFINER de broadcast.
- As três funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users usam SECURITY DEFINER e search_path=public; ACL inclui anon/authenticated/service_role.
- Trigger upstatus_messages_broadcast chama upstatus_broadcast_messages após INSERT/UPDATE/DELETE em public.messages. A função envia to_jsonb(OLD/NEW) para realtime.send com private=false. Remote-state e user-status também são broadcasts públicos.
- realtime.messages contém 106 eventos, todos private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Zero policies em realtime.messages; anon/authenticated têm SELECT/INSERT/UPDATE. Ambos os runtimes não incluem private:true nem setAuth().
- Storage: chat-images e profile-images públicos, 168 + 20 objetos, zero policies em storage.objects.

Laboratório:
- 18 tabelas public com RLS e sem policies, mas zero grants diretos de clientes nas tabelas public.
- Default ACLs expandidas: 96 entradas de privilégios em public, graphql, graphql_public e storage.
- Security Advisor: 0 WARN e 18 INFO.
- Funções de broadcast equivalentes usam search_path vazio e EXECUTE restrito a postgres/service_role.
- realtime.messages e storage.objects sem fixtures.

As funções de broadcast retornam trigger; não foi demonstrada exploração RPC. O Advisor sinaliza os EXECUTE como WARN, e os grants permanecem desnecessários. O risco concreto confirmado é o broadcast público com payload completo. Nenhum acesso externo indevido foi reproduzido.

## 6. Migrations, ambiente e logs

- Produção tem 7 migrations; branch gerenciada main continua MIGRATIONS_FAILED, com preview ACTIVE_HEALTHY.
- Laboratório tem 39 migrations e nenhuma branch gerenciada.
- Quatro SQLs originais retornam 404 tanto em master quanto na QA: 20261023154754_create_upstatus_visual_config.sql; 20261026195855_add_chat_message_file_name.sql; 20261027154329_add_chat_message_file_name.sql; 20261027155438_set_upstatus_upload_limits_20mb.sql. (O segundo arquivo é add_chat_message_file_name; o terceiro é allow_chat_document_mime_types.)
- Laboratório tem zero usuários, mensagens, chat_reads, sessões, salas, memberships, eventos, bindings, call attempts, voice attempts, rate-limit rows, mensagens Realtime e objetos Storage. Não é Full-Product TEST.
- Nos logs das últimas 24h consultadas havia apenas pgbouncer_logs e postgres_logs; não havia edge_logs/function_edge_logs suficientes para contar HTTP 402 ou provar recuperação. Não inferir zero 402.
- Issue #78 permanece 0/8 critérios físicos. Issue #79 permanece 16/35 itens marcados.
- Nenhum navegador Tampermonkey autenticado, sessão Sale Smartly ou dispositivo real estava disponível. Reconexão sem F5, voz/microfone, screen share e interoperabilidade instalada seguem MANUAL PENDING.

## 7. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcast público, payload completo, sem autorização privada |
| TEST-ISOLATION | BLOCKED | Projeto isolado sem fixtures/full-product |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs 404; main MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Produção sem convite/token/rate-limit e chat-clear por nome |
| ACL-STORAGE | BLOCKED | Grants/default ACLs, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8; depende de teste físico sem F5 |
| HUMAN-REVIEW | PENDING | PRs Draft sem aprovação e sem autorização de release |

## 8. Próximas ações

1. Integrar/revisar #167 e depois revalidar #170 no mesmo conjunto; exigir Validate e Smoke no HEAD exato.
2. Escolher versão Normal estável superior a 3.4.7 e alinhar build, updater, manifesto e workflow antes de cutover.
3. Corrigir Team Lite deploy para upstatus-team-lite, projeto fixo/validado, SHA aprovado e CLI pinada.
4. Aplicar AUTH-03 somente após migration revisada e autorização de release.
5. Tornar Realtime privado/autorizado, alinhar tópicos, minimizar payload e remover grants desnecessários.
6. Corrigir grants/default ACLs, SECURITY DEFINER e política de Storage; decidir se buckets devem ser privados.
7. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
8. Provisionar Full-Product TEST, executar os oito testes físicos e obter aprovação humana.

## Integridade

Nenhuma alteração em produção, secrets, flags, permissões, migrations ou fixtures. Nenhum merge, deploy, release ou publicação de userscript. Nenhum teste manual foi alegado. Esta execução apenas inspecionou GitHub/Supabase e adiciona este relatório em arquivo novo na branch QA, usando update_ref com expected SHA para rejeitar alterações concorrentes.
