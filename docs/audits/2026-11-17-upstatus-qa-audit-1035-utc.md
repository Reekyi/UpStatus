# Auditoria independente de QA — UpStatus
**Data da execução:** 17/11/2026, 10:35–11:00 UTC (07:35–08:00 BRT)  
**Recomendação:** NOT READY — não liberar Normal nem Team Lite.

## Escopo e método

Revalidei os heads de GitHub, o documento RELEASE_READINESS, PRs #74, #75, #76, #82, #131 e #176, issues #78 e #79, workflows, resultados e logs de CI, bundles servidos pelas Edge Functions e catálogos PostgreSQL dos dois projetos Supabase conhecidos.

GitHub e Supabase foram usados somente para leitura, exceto pela criação deste relatório nesta branch QA e pela atualização do comentário QA já existente na Issue #79. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets, flags, roles, grants, policies ou ACLs.

Não havia checkout local nem navegador/Tampermonkey/Sale Smartly disponível para executar testes nesta rodada. Os resultados de CI abaixo foram inspecionados nos runs existentes; não foram repetidos pela QA. Não houve teste manual nem tentativa de exploração.

## Documento de prontidão e heads

O arquivo docs/RELEASE_READINESS.md foi lido integralmente. O blob consultado tinha 1.046.356 caracteres e 8.423 linhas; o último checkpoint datado no próprio documento era 15/11/2026 06:30 UTC. O documento, portanto, não refletia esta revalidação de 17/11.

Heads vivos consultados:

- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- develop: 6b33e1e
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA: 4e0d8f89c015c552ba55211c3c94a5d58b94be44

As quatro branches retornaram protected=false na API de branches. Isso confirma ausência de proteção clássica de branch; não equivale a uma auditoria completa de todos os rulesets da organização.

A branch QA e o HEAD da PR #82 apontam para o mesmo commit. A comparação da QA com master mostra 393 commits à frente e um atrás; não fiz rebase nem incorporei o commit concorrente de master.

## PRs, commits e CI

Todas as PRs examinadas continuam abertas, Draft e sem reviews humanas: #74, #75, #76, #82, #131 e #176.

| PR | HEAD | Evidência observada | Limitação |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | Validate 43376770142 PASS; Smoke 43376770200 PASS | Teste de rate limit de emissão de convite foi ignorado |
| #75 Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks 41674353127 PASS histórico | Não substitui os checks mais recentes da #76 |
| #76 Team Lite | 00a578e9174e08238a1289a35feb02d171625421 | Signed-upload contracts PASS | Candidate Checks falhou no endpoint de autenticação por HTTP 402; Playwright, integração autenticada e concorrência foram ignorados |
| #82 QA | 4e0d8f89c015c552ba55211c3c94a5d58b94be44 | Validate 44058201894 FAIL | Falha em scripts/validate.mjs:26, production updateURL mismatch |
| #131 AUTH-03 | 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b | Smoke 42760281798 PASS, incluindo rate limit de emissão | Branch diverge da #74: quatro commits exclusivos da #74 e um exclusivo da #131 |
| #176 Migrations | b50f8567392322b4309468e0fe9e6fc81ca38c1d | Validate 43936811839 FAIL | scripts/validate.mjs:55, client signed upload helper missing |

Evidências:

- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43868863235
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/44058201894
- #131 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42760281798

O Smoke da #74 confirmou 136/136 verificações autenticadas, chamadas WebRTC, áudio remoto, voz, vídeo remoto de compartilhamento de tela, mesh de três participantes, recuperação de sala, rate limit de sinalização com 90 aceitos e o seguinte rejeitado por HTTP 429, concorrência e recibos de leitura. O passo de rate limit de emissão de convites foi ignorado porque o harness não estava presente naquele HEAD.

A #131 passou o teste de rate limit de emissão de convites, mas não pode ser considerada integrada à #74 enquanto as branches permanecerem divergentes.

A #76 passou os contratos offline de upload assinado. O endpoint isolado retornou HTTP 402 em vez de 401, com mensagem explícita de quota excedida. Os testes subsequentes de navegador, integração autenticada e concorrência foram skipped; isso é bloqueio de infraestrutura, não prova de falha funcional nesses testes.

A #82 contém 228 arquivos alterados e a comparação não encontrou arquivos fora de docs/. O erro de Validate é herdado do validator de master. A candidata #74 tem uma implementação diferente do build/validator e passou no seu próprio Validate. Não atribuo a falha da #82 ao conteúdo Markdown.

A #76 contém a #75 como ancestral: 330 commits adicionais e zero commits atrás. Não tratar #75 e #76 como duas entregas independentes.

## Publicação, build e compatibilidade Normal/Team Lite

Bundles e funções implantados consultados via Management API:

- Normal delivery: função upstatus v480, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd, verify_jwt=false. Userscript embutido 3.4.7.
- Team Lite: função upstatus-team-lite v15, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb, verify_jwt=false. Userscript embutido 3.4.30.
- API legada Normal: upstatus-screen-share-3-1-1-beta10 v6, source SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29, verify_jwt=false; o código declara VERSION 3.1.1-beta8.
- upstatus-test v281 também está no projeto de produção, portanto não é ambiente isolado.

Os clientes implantados Normal e Team Lite ainda apontam CLOUD_SERVER para a função beta10 e assinam o tópico Realtime legado upstatus-screen-share-live-3-1-1-beta10. O banco publica no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.

A build candidata Normal em chore/continuity-foundation muda PROD_TOPIC para upstatus-live e mantém o endereço de distribuição em /upstatus/upstatus.user.js, mas ainda define CLOUD_SERVER para a API beta10. O deploy-production candidato publica somente a função upstatus. Isso não demonstra um cutover completo da API: o script candidato ainda encaminha chamadas de API para beta10, enquanto a função upstatus recebe o artefato de distribuição. O plano docs/RELEASE_CUTOVER_PLAN.md exige coordenar CLOUD_SERVER, URL de distribuição, backend e versão.

Há também uma inconsistência de versionamento a resolver antes do corte:
- release.json e o artefato raiz atual são 3.4.7.
- O deploy-production candidato permite somente a versão estável exatamente 3.4.7.
- O build exige que a versão seja maior que a do artefato atual quando o artefato raiz é sincronizado e o plano de corte exige incremento de versão.
Essas condições não formam um caminho de release coerente sem revisão explícita dos guards e da versão.

Correção de uma conclusão anterior sobre Team Lite: a branch team-lite-official não contém workflow próprio de deploy Team Lite. A lista contém deploy-production.yml, deploy-test.yml, lucca-pages.yml e validate.yml. O deploy-production publica somente upstatus (Normal); o workflow team-lite-candidate.yml da #76 é CI, não deploy. Portanto, não há evidência de um workflow Team Lite que publique o slug Normal errado; a lacuna real é não existir pipeline próprio de publicação Team Lite na branch oficial.

O deploy-test atual em develop dispara por push e usa o secret genérico SUPABASE_PROJECT_ID, sem guard explícito que rejeite produção e o projeto de fixtures. A versão candidata na #76 é manual-only, usa vars.SUPABASE_TEST_PROJECT_ID, rejeita os IDs de produção e do laboratório e fixa Supabase CLI 2.122.1. Essa melhoria ainda não está integrada.

## Segurança de voz, tela, comandos remotos e Realtime

A inspeção estática dos bundles implantados confirmou:

- Normal recebe remote_command por broadcast e chama executeRemoteCommand quando o target corresponde ao membro local.
- Team Lite também chama executeRemoteCommand; acrescenta verificações de sessão local e geração de autenticação, mas o payload ainda fornece os campos de remetente/destinatário.
- Os handlers implantados de voz e compartilhamento de tela recebem payloads de broadcast e validam estrutura/campos, não uma prova de identidade do remetente emitida pelo servidor.
- voiceRoomMakePeer adiciona as tracks locais do microfone quando a sala está ativa.
- screenShareMakePeer adiciona tracks locais de vídeo somente quando screenShare.active e o usuário já iniciou o compartilhamento.

Isso cria um caminho de confiança não autenticada de alto impacto, condicionado à possibilidade de publicação no canal público: uma oferta forjada poderia negociar peer com usuário que já está em uma sala de voz ou compartilhando tela. Não realizei exploração, não injetei ofertas/ICE e não capturei áudio ou tela. A configuração Dashboard Allow public access não é exposta pelo conector; portanto, acesso externo efetivo não foi reproduzido.

As candidatas #74/#76 reduzem remote_command a wake-up para polling autenticado, uma melhoria real. Entretanto, voz/tela ainda mantêm fallback público quando a flag de transporte autenticado está desligada. A flag começa false e o endpoint começa vazio. O endpoint de signaling disponível existe apenas no projeto de laboratório; não existe função equivalente implantada em produção. Não é seguro apontar o cliente de produção para outro projeto.

No PostgreSQL de produção:
- 106 mensagens em realtime.messages, todas private=false, no tópico upstatus-live.
- 72 user_status, 26 db_change, 4 remote_command e 4 remote_result.
- realtime.messages tem RLS=true, FORCE RLS=false e zero policies.
- anon e authenticated possuem SELECT, INSERT e UPDATE em realtime.messages.
- upstatus_broadcast_messages publica to_jsonb(OLD/NEW), ou seja, a linha completa.
- upstatus_broadcast_remote_state publica campos de comando e resultado.
- upstatus_broadcast_users publica estado do usuário.
- Os três triggers são SECURITY DEFINER, retornam trigger, usam search_path=public e têm EXECUTE para anon/authenticated. Não demonstrei chamada direta por RPC; o risco comprovado é o payload público e as permissões desnecessárias, não uma exploração de RPC.

## RLS, grants, SECURITY DEFINER e Storage

Produção:
- Dez tabelas públicas com RLS habilitado e zero policies.
- 126 entradas de grants para anon/authenticated em nove tabelas públicas.
- 18 entradas TRUNCATE entre os dois papéis.
- Três funções SECURITY DEFINER de broadcast com search_path=public e EXECUTE para os dois papéis de cliente.
- storage.objects tem RLS=true, FORCE RLS=false e zero policies.
- Buckets chat-images e profile-images são públicos, com 168 e 20 objetos respectivamente; total 188.
- Default ACLs de postgres e supabase_admin continuam amplas em public; supabase_admin também tem defaults amplos em storage e schemas GraphQL.

A presença de RLS sem policies bloqueia operações comuns por papéis sujeitos a RLS, mas não torna TRUNCATE uma operação filtrada por RLS. Não afirmo que TRUNCATE esteja exposto por uma rota REST sem evidência adicional.

Laboratório:
- 18 tabelas públicas, zero policies e nenhuma entrada de grants diretos de tabela para anon/authenticated em public.
- realtime.messages sem linhas, RLS=true, zero policies e grants de cliente ainda presentes.
- Três funções SECURITY DEFINER de trigger usam search_path vazio e não têm EXECUTE para anon/authenticated.
- Não há buckets Storage no projeto de laboratório.
- Default ACLs de postgres em public estão restritas a postgres/service_role, mas defaults de postgres em storage e de supabase_admin em public/GraphQL continuam amplos.

## Supabase, Edge Functions, migrations e disponibilidade

A lista de projetos retornou somente:
- UpStatus produção: dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY.
- upstatus-security-test: bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY.

Não existe terceiro projeto Full-Product TEST independente.

Migrations:
- Produção: sete migrations.
- Laboratório: 39 migrations.
- Branch gerenciada main da produção: MIGRATIONS_FAILED; preview_project_status ACTIVE_HEALTHY.
- A PR #176 continua falhando no Validate por ausência do helper de upload assinado. Não houve replay de migrations nesta execução.

Edge Functions:
- Produção: 38 funções ACTIVE; todas retornaram verify_jwt=false na listagem. Isso não prova ausência de autenticação de aplicação, mas exige revisão rota a rota da autenticação customizada.
- Não existe endpoint de sinalização server-mediated implantado em produção.
- O projeto de laboratório contém apenas funções de teste de signaling/auth, não um produto completo.

Logs de produção:
- 77.945 linhas de function_edge_logs na janela consultada, e 77.945 com response.status_code=402.
- Primeiro registro: 2026-11-16T11:41:55.514Z.
- Último registro: 2026-11-17T08:38:43.481Z.
- /api/chat: 41.638.
- /api/status: 18.110.
- /api/remote-status: 18.092.
- /api/me: 33.
- /api/account: 33.
- /api/members: 33.
- Distribuição /upstatus/upstatus.user.js: 6.

Os registros são do endpoint beta10. A causa específica da restrição em produção não foi determinada; não infiro que seja a mesma causa do laboratório.

No laboratório, o CI da #76 recebeu HTTP 402 com a mensagem exceed_edge_functions_invocations_quota. O proprietário do projeto precisa revisar Usage/Billing e spend cap para restaurar a capacidade de teste.

AUTH-03:
- Produção: cinco usuários; nenhum password_hash vazio; nenhum role vazio; zero colunas setup_token_* e zero RPCs de setup invite.
- Laboratório: zero usuários; quatro colunas setup_token_*; RPC consume_upstatus_setup_invite e consume_upstatus_setup_invite_rate_limit, ambas SECURITY INVOKER e sem EXECUTE para anon/authenticated.
- Normal #74 ainda não executa rate limit de emissão de convite.
- Normal #131 tem teste de rate limit aprovado, mas precisa ser reconciliada com #74.
- Team Lite #76 tem implementação candidata, mas o CI de integração foi bloqueado por quota.

## Issues e aceitação manual

- Issue #78 permanece OPEN, com 0/8 critérios físicos aprovados. Não há confirmação de reconexão sem F5, chamada após reconexão, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 permanece OPEN, com 16 itens marcados e 19 pendentes. O comentário QA existente foi atualizado; não foi criado comentário duplicado e o comentário da Engenharia foi preservado.

## Gates QA desta execução

- RT-01: blocked — Realtime público e transporte autenticado ausente em produção.
- TEST-ISOLATION: blocked — somente dois projetos; o laboratório não é Full-Product TEST.
- MIGRATION-PROVENANCE: in_progress — inventário e CI revisados, mas sem recuperação byte a byte dos SQLs originais ou replay isolado.
- AUTH-03: in_progress — laboratório tem RPCs e #131 passou, mas produção não tem colunas/RPCs e #74 não integra rate limit.
- ACL-STORAGE: blocked — policies ausentes, grants/default ACLs amplas e buckets públicos sem policies próprias.
- RECONNECT: pending — sem confirmação física de Ricardo; Issue #78 segue 0/8.
- HUMAN-REVIEW: pending — PRs sem reviews e sem autorização explícita de release.

## Próximas prioridades

1. Identificar a causa dos 402 de produção e recuperar quota do laboratório.
2. Criar Full-Product TEST independente.
3. Implementar sinalização autenticada no projeto de produção, validar membership/destinatário/replay/expiry/rate limit no servidor e remover o fallback público sensível.
4. Corrigir o cutover Normal: CLOUD_SERVER, distribuição, versão, backend e workflow precisam apontar para a mesma release aprovada.
5. Criar workflow próprio de deploy Team Lite com projeto, SHA e CLI fixos; manter a branch oficial sem publicação até revisão.
6. Reconciliar #131 com #74 e repetir o Smoke no head final.
7. Revisar RLS, grants, default ACLs, SECURITY DEFINER e Storage com migrations aprovadas.
8. Recuperar proveniência dos SQLs, diagnosticar MIGRATIONS_FAILED, executar testes físicos da #78 e obter aprovação humana.

**Veredito final: NOT READY.** Nenhum teste manual foi executado nesta rodada. Nenhuma exploração, alteração de produção, deploy, merge, migration, release ou publicação de userscript foi realizada.
