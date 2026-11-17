# Auditoria independente de QA - UpStatus
Data: 2026-11-09 02:26 UTC

## 1. Fonte e refs verificados

A primeira leitura desta rodada foi docs/RELEASE_READINESS.md na branch qa/release-readiness-2026-11-04-master. Blob SHA preservado: 7cfbd70886df42ce790c078c224b19284a632595.

Heads consultados:
- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA: 627e1831bbf47386e67025826781217eb70d7bb1

QA está 145 commits à frente e 1 atrás de master, merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. A comparação retornou 33 arquivos alterados, todos em docs/. Não há alteração de código de produto na diferença QA/master.

Commits recentes:
- master 9d40461: somente inclusão de docs/checkpoints/2026-11-08-production-migration-history-preflight.md.
- team-lite-official 9065bc1: alteração de uma linha em team-lite/upstatus-team-lite.user.js para usar filtro de sessão autoritativo do servidor após reload.
- QA 627e183: ajuste documental de três linhas na nota de auditoria anterior.
- master e team-lite-official aparecem com protected=false na API de branches. Não foi possível confirmar enforcement por rulesets organizacionais.

## 2. PRs e CI nos HEADs exatos

| PR | HEAD | Evidência atual |
|---|---|---|
| #74 Normal | 9c0133e8cf6bd85ac8993888718a408db2f24a3e | Validate 42451736696 PASS; Signaling Smoke 42451736729 PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks 41674353127 PASS histórico |
| #76 Team Lite | eb28e88325d7e8a6236d9050bebabf794d64a8c4 | Candidate Checks 42450476433 PASS |
| #82 QA | 627e1831bbf47386e67025826781217eb70d7bb1 | Validate 42546530794 FAIL |
| #109 capacidade | eb7a53048c5f4e1a06b74c269bbed477f18f2b91 | Validate 42549243742 PASS |

Links:
- https://github.com/Reekyi/UpStatus/actions/runs/42451736696
- https://github.com/Reekyi/UpStatus/actions/runs/42451736729
- https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- https://github.com/Reekyi/UpStatus/actions/runs/42450476433
- https://github.com/Reekyi/UpStatus/actions/runs/42546530794
- https://github.com/Reekyi/UpStatus/actions/runs/42549243742

#74: logs do Smoke registram 19/19 verificações não autenticadas e 136/136 autenticadas, WebRTC de chamada/voz/tela, mesh de três participantes, singleton de tentativa, concorrência open/cancel, rate limit, recibos/invites e cleanup. #76: logs registram 16/16 não autenticadas, 110/110 autenticadas, 11/11 casos do mapper HTTP offline, Playwright do IIFE com endpoints inertes, WebRTC e cleanup. Isso é aprovação automatizada isolada, não aceitação física no Tampermonkey.

#75 é baseline histórico; #76 está 364 commits à frente de team-lite-official e é a linha candidata atual. Não somar #75 e #76 como dois payloads independentes.

#82 falha em scripts/validate.mjs:26 com “production updateURL mismatch”, após gerar PROD 3.4.7 / TEST 3.4.7. O HEAD da QA é documental e a falha vem do contrato herdado de master, não da nova nota.

As PRs consultadas permanecem abertas/Draft e sem reviews humanas registradas, inclusive #109.

## 3. PR #109 - capacidade genérica transacional

PR: https://github.com/Reekyi/UpStatus/pull/109
HEAD atual: eb7a53048c5f4e1a06b74c269bbed477f18f2b91
Base: fix/normal-signal-http-error-code-shape-20261108-v2, SHA 59f8650a1c18e0c94eaf80eda8775d5418ed3fd9
Comparação com a base: 26 commits à frente, zero atrás. A PR continua Draft.

O HEAD atual passou no Validate 42549243742, evento pull_request. O log confirma o contrato estático de capacidade genérica, build e Validate. Não há execução do harness HTTP concorrente no run. A descrição da PR ainda cita o HEAD anterior 94d43feca3ca4632862e24f7cdf5ecc4c4c9ac39 e o run 42544535436; a descrição precisa ser atualizada para o HEAD eb7a530 e o run 42549243742.

Arquivos principais:
- supabase/migrations/20261109010000_enforce_signal_room_member_capacity.sql
- supabase/test-migrations/20261109010000_enforce_signal_room_member_capacity_test.sql
- supabase/functions/upstatus-signal/index.ts
- supabase/functions/upstatus-signal-test/index.ts
- scripts/room-capacity-contract.test.mjs
- scripts/test-signal-room-capacity.mjs

A candidata adiciona invite_upstatus_signal_room_member e accept_upstatus_signal_room_invitation como RPCs VOLATILE SECURITY INVOKER, search_path vazio e EXECUTE restrito a service_role. As rotas derivam o emissor da sessão autenticada e passam esse valor às RPCs. O desenho bloqueia a sala primeiro, depois membership, conta membros accepted e retorna ROOM_FULL para HTTP 409 quando a capacidade 32 foi atingida. Os testes estáticos verificam rota, uso das RPCs, ordem textual dos locks, segurança e shape das respostas.

### Limite da evidência e segurança do harness

O harness scripts/test-signal-room-capacity.mjs exige:
- SUPABASE_URL exatamente https://bfpjtfqlnypisxljoxkb.supabase.co;
- SUPABASE_SERVICE_ROLE_KEY;
- UPSTATUS_SIGNAL_ALLOW_MUTATION=1;
- preflight vazio das tabelas de fixtures;
- marcador X-UpStatus-Signal-Capacity: room-capacity-v1 antes de qualquer escrita.

O guard scripts/assert-isolated-supabase.mjs usa allowlist exata do projeto bfpjtfqlnypisxljoxkb. Não executei o harness: ele cria usuários/sessões e grava fixtures, e não houve autorização explícita para mutação nesta rodada.

O runtime implantado no laboratório continua upstatus-signal-test v32, SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712. A fonte implantada não contém o marcador de capacidade. A migration candidata não aparece no histórico do laboratório, cujo último version é 20261108050802. As duas RPCs de capacidade também não existem no catálogo do laboratório. Produção não possui a função upstatus-signal nem a migration.

Portanto, a #109 tem aprovação automatizada de contrato/código, mas não tem teste concorrente HTTP nem validação do runtime implantado.

### Defeito de robustez do cleanup

Na revisão estática do harness, o bloco finally executa vários DELETEs e assertTableEmpty sequencialmente sem captura individual de erros. Se um DELETE falhar, a execução do finally é interrompida e as exclusões seguintes e verificações finais não rodam. Isso pode deixar fixtures residuais e mascarar a falha original. Antes de executar o harness, transformar a limpeza em best-effort por etapa, acumular erros e sempre tentar todas as exclusões/verificações.

A quota geral de escrita não substitui quota específica de convites pendentes. O candidato limita membros accepted, mas não define limite por remetente/destinatário ou por sala para convites pendentes.

## 4. Compatibilidade e issue #78

A issue #78 permanece aberta com 0/8 critérios físicos aprovados. O último comentário de engenharia consultado, 2026-11-08 04:19 UTC, reafirma que os testes automatizados não substituem perda real de internet, retorno sem F5, microfone/tela reais e interoperabilidade instalada.

Distinção funcional importante: a própria issue define sala de voz como canal aberto, sem convite nem aceitação. A PR #109 corrige endpoints genéricos /room/invite e /room/accept. Não é correção do open-join de voz, nem fecha #78. Não contar a #109 como progresso de aceite físico da issue.

O issue #79 está aberto. O corpo atual, atualizado em 2026-11-09 02:10 UTC, contém 30 linhas de checkbox: 11 marcadas e 19 desmarcadas. As marcadas incluem evidências históricas de 2026-11-03 e testes legados; não representam conclusão atual do release. O checklist precisa de revalidação, mas não foi alterado nesta auditoria.

## 5. Supabase - inventário atual, somente leitura

Produção dlfvkawaiqduhlazsszm:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- 7 migrations e 38 Edge Functions ativas.
- upstatus v480, upstatus-test v281, upstatus-screen-share-3-1-1-beta10 v6 e upstatus-team-lite v15.
- Não existe upstatus-signal.
- A branch gerenciada main está MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.
- Nenhuma coluna setup-token em public.users e nenhuma RPC consume_upstatus_setup_invite.

Laboratório bfpjtfqlnypisxljoxkb:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- 38 migrations e duas Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- Tabelas de sinalização sem fixtures nas contagens consultadas.
- A migration de capacidade da #109 não está aplicada.
- AUTH-03 está no laboratório: public.users possui setup_token_hash, setup_token_expires_at, setup_token_issued_by e setup_token_issued_at. consume_upstatus_setup_invite(p_user_name text, p_setup_token_hash text, p_password_hash text) é SECURITY INVOKER, search_path vazio, EXECUTE para service_role e não para anon/authenticated. Esses campos pertencem a public.users, não a upstatus_sessions.

Não existe terceiro projeto TEST full-product independente. Os inventários das Edge Functions retornam verify_jwt=false; isso exige validação de autenticação da aplicação em cada handler, mas não prova isoladamente ausência de autenticação.

### RLS, grants e SECURITY DEFINER

Produção:
- 10 tabelas public com RLS, zero policies; FORCE RLS false.
- 9 tabelas public com grants efetivos para anon/authenticated, incluindo TRUNCATE e demais privilégios amplos.
- Security Advisor: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public, retornam trigger, têm trigger_count=1 e EXECUTE efetivo para anon/authenticated/service_role. O Advisor as aponta como acessíveis por PostgREST RPC. Não foi feita chamada HTTP de prova; manter como achado pendente, não descartar como falso positivo.
- realtime.messages tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

Laboratório:
- 17 tabelas public com RLS e zero policies; 17 INFO e zero WARN no Security Advisor.
- Tabelas de sinalização sem grants diretos para anon/authenticated nos privilégios consultados.
- Eventos de sinalização têm event_id, room_id, sender, recipient, event_type, payload, created_at e expires_at. Índices cobrem event_id, recipient/expiry, room e sender. Não há nonce, idempotency key, sequência ou constraint de deduplicação. Replay/idempotência continua pendente e não é resolvido pela #109.

### Realtime

Produção tem 50 linhas em realtime.messages, todas private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.

Os userscripts embutidos nas funções instaladas Normal 3.4.7 e Team Lite 3.4.30 assinam upstatus-screen-share-live-3-1-1-beta10 via channel(UP_REALTIME_TOPIC), sem private:true e sem realtime.setAuth. Os tópicos não coincidem. Assim, broadcasts emitidos pelos triggers no tópico upstatus-live não chegam a essas assinaturas. Isso não prova que todos os sinais de cliente falhem: call_signal, voz e tela também são publicados diretamente no tópico público usado pelos clientes.

O trigger de messages envia to_jsonb(OLD/NEW) completo como db_change e private=false. Os triggers de remote-state e users também publicam no tópico legado com private=false. Normal executa remote_command recebido sem validação de emissor no callback local; Team Lite verifica estado/sessão local, mas a origem continua sendo broadcast público. Não foi reproduzido acesso externo.

Storage:
- chat-images e profile-images públicos, 20 MiB cada.
- Zero policies em storage.objects.
- Privacidade dos anexos e grants continuam pendentes.

## 6. Workflows e publicação

Master:
- .github/workflows/deploy-production.yml SHA 8252c6c6e7005c98625603b5b02b14cb1e50a519.
- Manual-only, release 3.4.7 stable, Supabase CLI latest, deploy somente de upstatus.
- Não vi preflight de identidade do projeto ou preflight completo de migrations nesse workflow oficial.

Team Lite:
- Workflow SHA e95bab7602fd3fcf80ab88ff44ccc9c259593c75.
- Lê o release.json raiz da branch team-lite-official, que declara 3.0.40 beta.22, e rejeita preRelease antes de prosseguir.
- O manifesto correto team-lite/release.json declara core 3.4.7, build 3.4.30 stable, mas o workflow não o utiliza.
- Se o bloqueio de prerelease fosse contornado, scripts/build.mjs da branch Team Lite lê o release.json raiz e o template servidor Normal, define PROD_FUNCTION=upstatus e TEST_FUNCTION=upstatus-test; o workflow também executa deploy upstatus, não upstatus-team-lite. Isso pode publicar o artefato errado no slug Normal se o project secret apontar para produção.
- Usa Supabase CLI latest e não tem a sequência coordenada de deploy do backend de sinalização, API e userscript.

Não despachar nenhum desses workflows.

## 7. Bloqueios e próximos gates

1. Corrigir o Validate herdado de master na linha QA sem enfraquecer scripts/validate.mjs.
2. Atualizar o runtime isolado e aplicar a migration candidata somente após autorização específica; então executar o harness de capacidade no projeto allowlisted.
3. Tornar o cleanup do harness resiliente a falhas parciais.
4. Adicionar quotas de convites e proteção de replay/idempotência no servidor.
5. Preservar a semântica de open join de voz e testar aliases Normal/Team Lite; não confundir com convites genéricos.
6. Integrar as pilhas #101/#102/#105/#106/#108/#109 em uma candidata coerente Normal e portar a implementação equivalente para Team Lite.
7. Corrigir o tópico Realtime, migrar para canal privado/autorizado e minimizar payloads de trigger.
8. Revisar grants, SECURITY DEFINER, Default ACLs, Storage e AUTH-03 em plano coordenado.
9. Diagnosticar MIGRATIONS_FAILED.
10. Corrigir os workflows de publicação, fixar CLI, validar projeto/SHA e slug correto; habilitar proteção e checks obrigatórios nas branches oficiais.
11. Executar os oito critérios físicos da #78 e atualizar #79 com evidências atuais.
12. Obter revisão humana e autorização explícita antes de merge, migration, deploy ou publicação.

## 8. Limites desta rodada

Consultas GitHub e Supabase foram somente leitura. Não executei o harness de capacidade nem qualquer script que crie/mute fixtures. Não fiz SQL write, migration, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL ou publicação de userscript. A única escrita desta rodada é esta nota nova na branch QA.
