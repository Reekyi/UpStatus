# Auditoria independente UpStatus - 2026-11-12 05:40 UTC

## Resultado executivo

**Recomendação: NOT READY.** A produção continua executando comandos e sinalização recebidos de broadcasts públicos. As correções candidatas existem, mas não estão integradas em uma linha única de publicação. Há também falhas independentes de validação no QA Normal e no Team Lite candidato.

Esta auditoria usou GitHub e Supabase somente para leitura. Não foram executados testes manuais, scripts locais, migrations, deploys, merges, releases, publicação de userscripts ou alterações de secrets, flags, roles, grants, policies, ACLs ou fixtures.

## 1. Heads, proteção e documentação

Snapshot consultado em 2026-11-12 05:40 UTC:

| Referência | HEAD | Protected |
|---|---|---:|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | false |
| QA qa/release-readiness-2026-11-04-master | 85f7f58714a0dc9d104155de8216d5c61407aad4 | false |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | false |

O repositório não possui rulesets ativos. A comparação QA contra master retornou 241 commits à frente e 1 atrás. O HEAD real da QA continua 85f7f587. Um resumo anterior mencionou 59ce7f, mas esse não é o HEAD da branch.

O arquivo docs/RELEASE_READINESS.md foi lido integralmente: 8.410 linhas, blob SHA 7cfbd70886df42ce790c078c224b19284a632595. O último checkpoint interno é 2026-11-08 18:30 UTC. O documento não contém as novas PRs #148 e #149.

## 2. PRs e CI

Os resultados abaixo são evidências de CI no SHA indicado. Não equivalem a testes físicos no navegador do usuário.

| PR | HEAD | Resultado observado |
|---|---|---|
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d | Signaling Smoke #42753434336 PASS |
| #75 baseline Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks #41674353127 PASS histórico |
| #76 Team Lite | c4dee8d2c502499de5f95932ac14a90cffb56196 | Candidate Checks #43124413080 PASS; 110/110 verificações autenticadas |
| #82 QA | 85f7f58714a0dc9d104155de8216d5c61407aad4 | Validate #43156382524 FAIL: production updateURL mismatch |
| #89 AUTH-03 | branch candidata | Guard aprovado, mas não integra o rate limit completo |
| #131 Normal AUTH-03 | 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b | Smoke #42760281798 PASS; 136/136 verificações autenticadas |
| #143 dispatcher | c4a04fa755b877bc76b1372170a26e7b974264e6 | API Candidate Validate #43093687347 PASS; não é o Guard do dispatcher |
| #146 remote-command hints | 71c5ce2f730ade8ee3e8b090498202933809ce5c | Candidate Validate #43108250452 PASS |
| #147 release target | e6c1b740d3f3b2b5c05fcc603f7420e1c131aea3 | Validate #43147344544 FAIL em chat-regression.test.mjs:107 |
| #148 admin-role fallback | 716a41db346de2f7ea1c821e29f02fb0256d09c5 | Validação direcionada #43151989910 PASS; não executa a suíte completa |
| #149 call-source provenance | c6c2d793e62b26c6ae8b986827345f5fd16eb72a | Guard #43159245525 PASS; Candidate Checks #43159245553 FAIL na última asserção estática |

### #149: falha de contrato do workflow, não de WebRTC

No run #43159245553, as etapas funcionais anteriores passaram:
- 110/110 verificações autenticadas.
- Negociação WebRTC de chamada com entrega de áudio remoto.
- Negociação WebRTC de sala de voz com entrega de áudio remoto.
- Negociação WebRTC de compartilhamento de tela com entrega de vídeo remoto.
- Rate limit distribuído: 90 aceitas e 1 rejeitada com HTTP 429 e Retry-After 60s.
- Read receipts, consumo atômico de convite e rate limit de emissão.

A etapa 20 falhou porque scripts/test-team-lite-candidate-workflow-triggers.mjs exige literalmente branches: [team-lite-official]. O workflow da #149 declara team-lite-official e team-lite/signaling-transport-candidate em YAML multilinha para executar checks também no PR filho. A asserção está desatualizada e deve ser atualizada para validar as duas bases, sem remover os guards de push, paths e projeto isolado. A etapa seguinte de verificação de scripts e metadados foi skipped.

### #147 e #148: setup e anexos

A #148 remove o fallback de promoção administrativa por nome no servidor candidato Normal, usando o papel persistido ou implementation_user. Entretanto, /api/setup continua sem token obrigatório. Se uma conta já possuir role=implementation_admin e ainda não tiver password_hash, o setup mantém esse papel e permite reivindicação por primeiro acesso. A remoção do fallback nominal não substitui convite obrigatório.

A validação completa da #147 falha porque scripts/chat-regression.test.mjs exige function setPendingAttachment(file), mas o template QA não contém essa função e mantém upload direto por uploadFileDirect. Isso é uma divergência real entre o contrato de regressão e a implementação candidata. Não foi classificada como falso negativo. A validação direcionada da #148 não executa essa suíte.

### #143 e #146: Guard não integrado

#143 e #146 estão divergidas: comparação entre os HEADs retornou 10 commits à frente e 15 atrás em direções opostas. O template Normal de #143 ainda executa executeRemoteCommand(c) com o payload de remote_command público. #146 transforma remote_command e remote_result em avisos e busca dados pela API autenticada.

O run #43093687347 é o workflow Normal Beta10 API Candidate Validate, não o Guard do dispatcher. O deploy-production.yml existente na branch-base da #143 é manual-only; o Guard novo presente na branch candidata não tem evidência de execução como check da própria PR. O push/Validate da API não substitui o check do dispatcher.

## 3. Código efetivamente implantado

Management API e conteúdo dos bundles implantados:

| Runtime | Versão Edge Function | Userscript embutido | Source SHA |
|---|---:|---:|---|
| upstatus | v480 | 3.4.7 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd |
| upstatus-team-lite | v15 | 3.4.30 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb |
| upstatus-screen-share-3-1-1-beta10 | v6 | API auxiliar | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 |
| upstatus-test | v281 | runtime de teste antigo | 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a |

Os quatro runtimes acima pertencem ao projeto de produção. O inventário contém 38 Edge Functions ativas e todas reportam verify_jwt=false. Isso não prova ausência de autenticação: os endpoints principais usam sessões customizadas, que precisam ser revisadas individualmente.

Decodifiquei os userscripts embutidos de Normal e Team Lite:
- Ambos executam executeRemoteCommand(c) diretamente quando recebem remote_command em broadcast público.
- Ambos encaminham call_signal, voice-room e screen-share recebidos pelo broadcast para handlers locais.
- Team Lite verifica sua própria sessão e geração de autenticação, mas isso não comprova a identidade do remetente do broadcast.
- Os dois clientes usam o tópico upstatus-screen-share-live-3-1-1-beta10.

Os servidores Normal e Team Lite implantados ainda usam o primeiro setup sem convite e o fallback nominal de implementation_admin para Ricardo, Lohan e Guilherme quando o papel está vazio. As cinco contas atuais estão configuradas: três implementation_admin e duas implementation_user; nenhuma possui password_hash ou role vazio. Não foi identificada conta atual desconfigurada.

## 4. Realtime, voz e compartilhamento de tela

Snapshot SQL somente leitura em produção:
- 109 registros em realtime.messages, todos private=false.
- 57 user_status, 40 db_change, 6 remote_command e 6 remote_result.
- Os triggers SQL publicam no tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- Os clientes instalados assinam upstatus-screen-share-live-3-1-1-beta10. O tópico dos triggers não coincide com o tópico dos clientes.

Triggers e SECURITY DEFINER:
- upstatus_broadcast_messages transmite to_jsonb(OLD/NEW) completo em db_change.
- upstatus_broadcast_remote_state transmite metadados de comandos e resultados.
- upstatus_broadcast_users transmite campos de presença.
- As três funções são SECURITY DEFINER, retornam trigger, têm search_path=public e estão ligadas a triggers.
- O Security Advisor registra 3 WARN para anon e 3 WARN para authenticated, total de 6. O Advisor as classifica como executáveis via REST RPC. Não foi feita chamada HTTP para reproduzir invocação direta.

Tabela realtime.messages:
- RLS habilitado, FORCE RLS desabilitado, zero policies.
- anon e authenticated possuem SELECT, INSERT e UPDATE efetivos.
- O conteúdo persistido continua private=false; não foi possível reproduzir assinatura externa porque o estado do Dashboard Allow public access não é exposto pelo conector.

A #149 melhora a proveniência de call_signal: receiveCallSignal recebe authenticatedSource fora do payload e o modo autenticado permite somente presence/ended como discovery público. Porém signaling_transport_enabled continua false por padrão e o endpoint começa vazio. Com a flag desligada, os listeners públicos de call_signal, voice-room e screen-share permanecem ativos. A proteção não está pronta como default de produção.

A função upstatus-signal-test v32 existe apenas no laboratório. Não existe função server-mediated equivalente implantada em produção. O cliente não deve apontar para o laboratório como solução de produção.

## 5. RLS, grants, ACL e Storage

Produção:
- 10 tabelas public com RLS habilitado e zero policies.
- 9 tabelas public concedem 7 privilégios efetivos a cada papel anon/authenticated: 126 grants no total. Incluem TRUNCATE; RLS não protege TRUNCATE.
- public.upstatus_visual_config também tem RLS sem policy, mas não possui esses grants diretos.
- storage: 32 grants efetivos no schema; storage.objects concede SELECT, INSERT, UPDATE e DELETE a anon/authenticated.
- realtime: 8 grants efetivos no schema; realtime.messages concede SELECT, INSERT e UPDATE a cada papel.
- Total efetivo nas três schemas: 166 grants.
- Default ACL: 120 itens expandidos para anon/authenticated, em public, storage, graphql e graphql_public, pertencentes a postgres e supabase_admin. Incluem privilégios de tabela, sequência e função, inclusive MAINTAIN.
- Dois buckets públicos: chat-images e profile-images, limite de 20 MiB cada.
- Zero policies próprias em storage.objects.
- 188 objetos Storage.
- 296 mensagens; 296 com file_name nulo.

Security Advisor:
- Produção: 6 WARN e 10 INFO.
- Laboratório: 0 WARN e 18 INFO.
- Performance Advisor de produção: zero achados.

A presença de RLS sem policies não significa leitura pública por si só: políticas ausentes bloqueiam operações por linha para papéis comuns. Entretanto, os grants TRUNCATE/TRIGGER e as permissões Storage precisam de revisão separada, pois não são substituídos por RLS.

## 6. AUTH-03, migrations e ambientes

AUTH-03:
- Produção tem cinco usuários, todos configurados.
- Nenhuma coluna setup_token_*.
- Tabela upstatus_setup_invite_rate_limits ausente.
- RPC consume_upstatus_setup_invite ausente.
- RPC consume_upstatus_setup_invite_rate_limit ausente.
- #131 Normal e #76 Team Lite têm a mesma migration e teste de rate limit por Git blob SHA.
- #131 passou 136/136; #76 passou 110/110.
- #148 remove o fallback nominal no servidor candidato, mas não exige convite obrigatório.
- Rate limit de tentativas normais de login não foi confirmado.

Migrations:
- Produção: 7 migrations no ledger.
- master: somente 3 arquivos SQL em supabase/migrations.
- Quatro originais ausentes: create_upstatus_visual_config, add_chat_message_file_name, allow_chat_document_mime_types e set_upstatus_upload_limits_20mb.
- O dispatcher #143 falha fechado quando a proveniência não é verificável; três fontes têm blob SHA e quatro continuam ledger-only.
- O manifesto #143 ainda precisa incluir a migration de rate limit AUTH-03.
- Branch Supabase main: MIGRATIONS_FAILED. Preview: ACTIVE_HEALTHY.

Ambientes:
- Laboratório separado: bfpjtfqlnypisxljoxkb.
- Laboratório: 39 migrations, duas Edge Functions, 18 tabelas public com RLS sem policies e zero grants diretos de tabela para anon/authenticated.
- Após a execução Candidate Checks #149, consultas SELECT-only encontraram zero linhas nas 14 categorias de fixtures consultadas. A Engenharia havia registrado fixtures de origem não correlacionada antes da execução; QA não fez limpeza.
- O workflow Team Lite direciona mutações ao project ref isolado e usa guard explícito.
- O slug upstatus-test v281 está no projeto de produção. Não existe um terceiro runtime full-product TEST separado.

A função implantada upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não VOICE_ATTEMPT_ALREADY_ACTIVE. O contrato offline candidato inclui ambos; o helper implantado não foi atualizado nesta auditoria. O cliente aceita os dois códigos, mas a versão implantada e o contrato candidato continuam divergentes.

## 7. Workflows, issues e testes físicos

Workflow oficial Team Lite na branch team-lite-official:
- Usa Supabase CLI latest.
- Executa supabase functions deploy upstatus.
- O slug correto do Team Lite é upstatus-team-lite.
- A PR #129 propõe um guard que bloqueia o workflow legado; o guard passou em #42993962545, mas a PR continua Draft e não foi incorporada. Não despachar o workflow atual.

Issue #78:
- Oito critérios de aceitação física continuam sem aprovação.
- Não houve queda física de internet, reconexão sem F5, reentrada em sala, chamada com microfone real, captura de tela real ou interoperabilidade instalada Normal/Team Lite nesta execução.
- CI de navegador/WebRTC não substitui a aceitação física.

Issue #79:
- Corpo principal continua baseado no checkpoint antigo de 07/11.
- 150 comentários.
- Um comentário QA dedicado e um comentário de Engenharia foram preservados.
- O comentário QA existente foi atualizado; nenhum comentário duplicado foi criado.

## 8. Gates

| Gate | Estado | Evidência resumida |
|---|---|---|
| RT-01 | blocked | 109 eventos private=false, tópico divergente, sinalização pública por padrão |
| TEST-ISOLATION | done | Projeto de laboratório separado, workflows apontam para ele e snapshot atual sem fixtures nas categorias consultadas |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs originais ausentes; dispatcher falha fechado |
| AUTH-03 | in_progress | Candidatos #131/#76 passam, produção sem token/RPC/rate limit; #148 ainda não exige convite |
| ACL-STORAGE | blocked | Grants amplos, Default ACL, buckets públicos e zero policies Storage |
| RECONNECT | pending | Nenhum teste físico sem F5 confirmado por Ricardo |
| HUMAN-REVIEW | pending | Sem reviews humanas e sem autorização explícita de release |

## 9. Próximas prioridades

1. Corrigir a asserção do workflow Team Lite para aceitar as duas bases esperadas sem enfraquecer os guards.
2. Reconciliar o contrato de anexos pendentes com o template Normal.
3. Fazer o Guard do dispatcher executar como check de PR no base correto.
4. Integrar #146 ao dispatcher e preservar o polling autenticado.
5. Tornar voz e tela autenticadas por padrão e alinhar tópicos Realtime.
6. Integrar AUTH-03 completo nas duas APIs, incluindo convite obrigatório e rate limit.
7. Corrigir workflow Team Lite para slug correto, projeto fixo e CLI pinada.
8. Recuperar os quatro SQLs originais e atualizar o manifesto.
9. Revisar grants, Default ACL, SECURITY DEFINER e Storage com owner autorizado.
10. Executar aceitação física e obter aprovação humana.

## 10. Limites e ações desta auditoria

Nenhum teste manual foi executado pela QA. Resultados de CI foram inspecionados nos logs dos respectivos runs. As consultas SQL foram SELECT-only. Nenhuma produção foi modificada. Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, role, grants, policy, ACL ou fixture foi executada.

A única escrita desta execução é este relatório novo na branch QA dedicada e a atualização do comentário QA existente na Issue #79. O arquivo docs/RELEASE_READINESS.md foi preservado.
