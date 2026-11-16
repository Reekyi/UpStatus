# UpStatus — auditoria independente QA
Data: 2026-11-16 19:40 UTC  
Recomendação: NOT READY

## Escopo e método

- Releitura integral de docs/RELEASE_READINESS.md na branch QA. O blob consultado tem 1.046.356 bytes e o último heading registrado é de 2026-11-15 06:30 UTC; portanto, o documento é um snapshot histórico e não contém os eventos desta execução.
- Conferência dos heads reais, PRs #74, #75, #76, #82 e #176, issues #78/#79, workflows e resultados exatos de CI.
- Inspeção read-only dos projetos Supabase de produção e laboratório, Edge Functions, logs, migrations, catálogo, grants, policies, Realtime, Storage e Security Advisor.
- Nenhum teste foi iniciado diretamente pela QA nesta execução. Os resultados de CI abaixo são execuções do GitHub Actions. Nenhum teste físico no Sale Smartly/Tampermonkey foi realizado.
- Nenhuma escrita SQL, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/permissão ou operação destrutiva foi executada.

## Heads reais e PRs obrigatórias

| Ref/PR | HEAD | Comparação com base atual | Situação |
|---|---|---:|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | — | ref oficial |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 | — | ref oficial |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | — | ref oficial |
| QA | 5bd2ab75f3a8d17c7fce63f4ea1aa2c1519b78ba | 377 ahead / 1 behind master | HEAD antes deste relatório |
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | 887 ahead / 1 behind master | Draft |
| #75 Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | 59 ahead / 0 behind team-lite-official | Draft; CI histórico |
| #76 Team Lite | 00a578e9174e08238a1289a35feb02d171625421 | 389 ahead / 0 behind team-lite-official | Draft; Candidate Checks falhou |
| #82 QA | 5bd2ab75f3a8d17c7fce63f4ea1aa2c1519b78ba | 377 ahead / 1 behind master | Draft; Validate falhou |
| #176 recuperação SQL | b50f8567392322b4309468e0fe9e6fc81ca38c1d | 6 ahead / 0 behind develop | Draft; Validate falhou por dependência herdada |

## CI, inspeção e testes manuais

### PRs solicitadas

- #74: Validate 43376770142 e Signaling Smoke 43376770200 passaram no HEAD exato. O Smoke registra 136/136 verificações autenticadas, WebRTC de chamada/voz/tela, mesh de três participantes, rate limit 90 aceitas + 1 HTTP 429, read receipts e cleanup. A etapa de rate limit distribuído para emissão de convites foi SKIPPED; não considerar AUTH-03 completo.
- #75: Candidate Checks 41674353127 passou no HEAD histórico. Não houve nova execução no HEAD atual; #76 é a linha Team Lite mais recente.
- #76: job signed-upload-contracts passou. O job candidate-checks falhou: 0/16 verificações não autenticadas passaram porque o laboratório devolveu HTTP 402 com exceed_edge_functions_invocations_quota. Playwright, integração autenticada, concorrência e etapas posteriores foram ignorados. Isto é bloqueio de infraestrutura, não prova de defeito nos contratos offline.
- #82: Validate 43932318982 falhou em production updateURL mismatch.
- #176: Validate 43936811839 falhou em client signed upload helper missing. A falha é compatibilidade do validador com o helper ainda ausente na base develop; não é uma falha de execução das quatro migrations recuperadas.

### PRs de correção recentes que afetam os bloqueadores

- #158: Validate 43363857861 falhou na regressão de chat porque o teste ainda esperava upload imediato, enquanto o fluxo passou a staged attachments.
- #161 Normal: Validate 43479685384 e Smoke 43479685445 passaram. O Smoke registra 136/136 checks autenticados e o teste de rate limit de convites passou. O build muda CLOUD_SERVER para /upstatus e inclui a migration de rate limit. A PR é Draft e depende de migrations que ainda não existem em produção; seu workflow herdado não aplica migrations.
- #167 Normal: Validate 43784897392 passou com contratos de upload assinado e regressões de chat/anexos staged. Não há Smoke no HEAD atual. O build corrige a separação entre updater e distribuição, mas mantém a API em beta10 e não altera o workflow de produção herdado do master.
- #174: Validate 43802407509 passou para o backport do helper de upload assinado; não há integração/browser no mesmo HEAD.
- #175: teste focado de admin-role 43808590208 passou, mas Validate 43808590131 falhou por client signed upload helper missing.
- #171 Team Lite: teste focado de autorização 43814131143 passou; não há Validate/Smoke completo no mesmo HEAD.
- Todas essas PRs de follow-up permanecem Draft. São evidências de candidatos, não correções implantadas.

## Distribuição, API e Edge Functions implantadas

Produção lista 38 Edge Functions ativas e todas aparecem com verify_jwt=false. Isso não prova que todas as rotas aceitam acesso anônimo, pois os runtimes usam sessão própria; exige, porém, revisão de autenticação por rota.

Versões principais observadas:
- upstatus: Edge version 480, runtime 3.4.7.
- upstatus-team-lite: Edge version 15, runtime 3.4.30.
- upstatus-screen-share-3-1-1-beta10: Edge version 6, mas VERSION interno 3.1.1-beta8 e userscript embarcado beta8.
- upstatus-test: Edge version 281, runtime 3.3.28.
- Não há função de signaling server-mediated implantada em produção. O laboratório tem upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

Decodificação read-only dos userscripts embarcados:
- Normal 3.4.7: updateURL/downloadURL em /functions/v1/upstatus/upstatus.user.js; CLOUD_SERVER em upstatus-screen-share-3-1-1-beta10; tópico Realtime antigo upstatus-screen-share-live-3-1-1-beta10.
- Team Lite 3.4.30: updater no GitHub team-lite-official; CLOUD_SERVER em upstatus-team-lite; tópico Realtime antigo upstatus-screen-share-live-3-1-1-beta10.
- Nenhum dos dois clientes contém private:true ou chamada setAuth no canal Realtime.
- A função com slug beta10 declara e serve artefato beta8. Há desalinhamento entre slug, versão interna e endpoint embarcado.

A candidata #74 adiciona guards de branch/SHA/projeto e fixa Supabase CLI 2.122.1, mas publica somente upstatus. Seu build ainda mantém API beta10. A #161 muda API para upstatus, o que alinha o cliente com a função publicada, mas depende de migrations de convite/rate limit ausentes em produção. A #167 corrige updater metadata, porém mantém API beta10 e herda o workflow de master.

## Workflows

- master deploy-production: workflow_dispatch, secret genérico SUPABASE_PROJECT_ID, CLI latest, deploy do slug upstatus; sem guard de SHA/projeto equivalente ao candidato #74.
- team-lite-official deploy-production: mesmo desenho inseguro e também executa deploy upstatus, não upstatus-team-lite. Não despachar.
- develop deploy-test: push em develop, secret genérico SUPABASE_PROJECT_ID e CLI latest; risco de apontamento incorreto de projeto.
- #76 deploy-test candidato: UPSTATUS_TEST_PROJECT_ID, verificação de projeto/branch e CLI 2.122.1; mais seguro, mas o ambiente de laboratório ficou bloqueado por quota no Candidate Checks.
- #167 não modifica deploy-production e herda o workflow de master. #161 herda o workflow guardado da #74. Nenhum workflow examinado executa preflight/aplicação das migrations necessárias ao AUTH-03.

## Disponibilidade e logs

Projeto de produção dlfvkawaiqduhlazsszm:
- Projeto ACTIVE_HEALTHY, mas 46.185 respostas HTTP 402 nas rotas Edge consultadas entre 13:29:00 e 19:29:48 UTC.
- Distribuição: /api/chat 24.615; /api/status 10.778; /api/remote-status 10.758; /api/members 14; /api/me 14; /api/account 2; distribuição userscript 4.
- Último 402 observado às 19:29:45 UTC.
- Os logs de produção não expõem a causa específica. Não atribuir automaticamente à quota do laboratório.

Laboratório bfpjtfqlnypisxljoxkb:
- O Candidate Checks da #76 recebeu HTTP 402 nas rotas de upstatus-signal-test às 12:40–12:41 UTC. A resposta do CI identifica explicitamente exceed_edge_functions_invocations_quota e orienta o proprietário a atualizar o plano ou remover spend caps.
- A consulta posterior 13:29–19:29 não encontrou novos eventos 402 no laboratório, mas também não há evidência de chamadas de teste posteriores; isso não comprova recuperação.

## Realtime, RLS, grants e SECURITY DEFINER

Produção:
- 106 registros em realtime.messages, todos private=false e no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0: 72 user_status, 26 db_change, 4 remote_command e 4 remote_result.
- Os clientes Normal e Team Lite implantados assinam o tópico legado upstatus-screen-share-live-3-1-1-beta10; não foi observado registro no tópico legado nesta amostra. O tópico de trigger e o tópico dos clientes não coincidem.
- Zero policies em realtime.messages.
- upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users são SECURITY DEFINER, search_path=public e executáveis por anon/authenticated. upstatus_broadcast_messages transmite a linha completa via to_jsonb.
- Security Advisor: 10 INFO RLS enabled/no policy; 3 WARN para EXECUTE anon e 3 WARN para EXECUTE authenticated nas funções SECURITY DEFINER.
- Dez tabelas públicas têm RLS e nenhuma policy; nove também concedem privilégios amplos a anon e authenticated, incluindo TRUNCATE.
- 24 default ACL entries no catálogo; seis associadas ao schema public, mantendo grants padrão amplos a revisar.

Storage:
- chat-images e profile-images continuam públicos, file_size_limit de 20.971.520 bytes (20 MiB), zero policies em storage.objects.
- Contagem read-only: 168 objetos em chat-images e 20 em profile-images.

Laboratório:
- 18 tabelas aparecem no advisor como RLS sem policy, mas as tabelas de signaling consultadas não concedem SELECT/INSERT direto a anon/authenticated.
- As funções de broadcast do laboratório são SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role.
- O laboratório é um projeto separado, mas não há branches Supabase nem Full-Product TEST isolado.

## AUTH-03 e migrations

Runtimes implantados Normal/Team Lite:
- /api/setup aceita primeiro setup sem token de convite.
- Se a conta existe sem password_hash, o setup atribui implementation_admin por fallback de nome para Ricardo, Lohan ou Guilherme quando role está ausente.
- Normal exige senha mínima de 6 caracteres; Team Lite exige 4.
- Produção não possui upstatus_setup_invites, upstatus_setup_invite_rate_limits nem as RPCs consume_upstatus_setup_invite e consume_upstatus_setup_invite_rate_limit.

Migrations:
- Produção: 7 migrations.
- Laboratório: 38 migrations.
- Branch gerenciada main de produção: MIGRATIONS_FAILED.
- Laboratório: zero branches Supabase.
- PR #176 recupera quatro statements do ledger de produção. Comparação independente confirmou que cada arquivo da PR é exatamente o statement correspondente com um newline final. Todos os quatro registros do ledger têm rollback null.
- Isto recupera o SQL executado, mas não prova byte-identidade dos arquivos originais, comentários ou formatação anterior. Não houve replay nem migration preflight em Full-Product TEST. Gate permanece in_progress, não done.

## Issues e aceitação física

- Issue #78 permanece aberta; os oito critérios estão desmarcados. Não houve teste físico de queda/retorno de internet, reentrada em sala, novas chamadas, microfone/tela reais ou interoperabilidade Normal ↔ Team Lite sem F5.
- Issue #79 mantém um comentário QA dedicado e separado do comentário da Engenharia. O comentário QA foi atualizado no lugar, sem duplicatas.

## Gates e recomendação

| Gate | Estado QA | Evidência/resumo |
|---|---|---|
| RT-01 | blocked | Realtime público, zero policies, tópicos divergentes |
| TEST-ISOLATION | blocked | Sem Full-Product TEST; laboratório não tem branches |
| MIGRATION-PROVENANCE | in_progress | Quatro statements recuperados e comparados ao ledger; falta preflight isolado e comparação de arquivo original se disponível |
| AUTH-03 | blocked | Setup sem convite e fallback por nome ainda implantados; migrations/RPCs ausentes |
| ACL-STORAGE | blocked | Grants amplos, SECURITY DEFINER públicos, buckets públicos e zero policies |
| RECONNECT | pending | Issue #78 com 0/8 critérios físicos |
| HUMAN-REVIEW | pending | PRs Draft e sem aprovação humana |

## Recomendação final

NOT READY. Não publicar nem executar workflow Team Lite oficial. A prioridade é identificar a causa dos 402 em produção, restaurar/validar o laboratório, consolidar uma candidata Normal única com updater/API/migrations alinhados, corrigir o workflow Team Lite, fechar os bloqueadores de segurança e somente então executar aceitação física e revisão humana.

