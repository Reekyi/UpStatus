# UpStatus - auditoria independente de QA

**Data:** 2026-11-11 20:38 UTC  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb  
**Recomendação:** NOT READY

## Escopo e método

Revalidação read-only de heads, PRs #74, #75, #76, #82, #131, #141, #142 e #143; issues #78 e #79; workflows e logs de CI; fontes dos bundles implantados; migrations, Edge Functions, RLS, grants, Default ACL, SECURITY DEFINER, Realtime e Storage.

O documento docs/RELEASE_READINESS.md foi lido integralmente na branch QA. Blob SHA: 7cfbd70886df42ce790c078c224b19284a632595. O arquivo tem 8.410 linhas e seu último checkpoint é 2026-11-08 18:30 UTC. Está desatualizado em relação às evidências de 11/11; este relatório foi criado separadamente, sem alterar o documento principal.

Não foram executados testes manuais, chamadas HTTP de produção, reruns ou mutations de fixtures. CI citado abaixo é evidência de execuções existentes. Todas as consultas SQL desta auditoria foram SELECT/catalog-only. Não houve alteração de produção, merge, deploy, migration, release, publicação de userscript, secrets, flags, grants, policies, ACL ou objetos.

## Heads e integridade do GitHub

| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA qa/release-readiness-2026-11-04-master | f342c7720c5ed199db9f1775104efa5d5a22013b |
| PR #74 | fb878537d95db9097cce6d29a14260b9fd8d2e3d |
| PR #75 | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| PR #76 | 4edfbf25476c7c751741b2e14c2c88fdc554f618 |
| PR #82 | f342c7720c5ed199db9f1775104efa5d5a22013b |
| PR #131 | 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b |
| PR #141 | 4dba48196a1a605557ac7a853f6ae4adff0ea555 |
| PR #142 | 2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4 |
| PR #143 | c4a04fa755b877bc76b1372170a26e7b974264e6 |

Comparações relevantes:

- #74 versus master: 883 commits à frente e 1 atrás; merge-base a9288ccf.
- #82 versus master: 229 à frente e 1 atrás; mesmo merge-base a9288ccf.
- #76 versus #75: 321 à frente e 0 atrás. #75 é baseline ancestral, não uma entrega independente.
- #131 tem base exatamente no HEAD atual de #74.
- #142 versus HEAD atual de #141: 12 à frente e 1 atrás; merge-base 61d00fb.
- #143 versus HEAD atual de #142: 15 à frente e 2 atrás; merge-base 6fa53bd.

Todas as PRs auditadas permanecem abertas e Draft. Nenhuma review humana foi encontrada nas PRs #74, #75, #76, #82, #131, #141, #142 ou #143.

As branches master, team-lite-official e QA retornam protected=false. A lista de repository rulesets está vazia. Required status checks não são exigidos por proteção de branch.

## CI e workflows

| PR / candidato | Evidência atual | Classificação |
|---|---|---|
| #74 Normal | Validate 42753434411 e Signaling Smoke 42753434336, ambos success no HEAD fb878537 | CI PASS |
| #75 Team Lite baseline | 41674353127 success no HEAD 7bbf9b90 | PASS histórico |
| #76 Team Lite | 42993916169 success no HEAD 4edfbf2; registro de CI indica 110/110 verificações autenticadas | CI PASS |
| #82 QA | 43088982962 failure no HEAD f342c772, etapa Validate build | CI FAIL |
| #131 AUTH-03 Normal | 42760281798 success no HEAD 17169a3; registro de CI indica 136/136 verificações autenticadas | CI PASS |
| #141 updater/chat | 43085700956 success no HEAD 4dba481 | CI PASS |
| #142 API Normal | 43085494740 success no HEAD 2ffb8d9 | CI PASS |
| #143 dispatcher | 43093394788 push success no HEAD c4a04fa; offline_guard success e deploy skipped | CI PASS em push |
| #143 PR | 43093687347 pull_request success no HEAD c4a04fa | CI PASS |

Links:
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42753434336
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42753434411
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/42993916169
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43088982962
- #131 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42760281798
- #141 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43085700956
- #142 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43085494740
- #143 offline_guard push: https://github.com/Reekyi/UpStatus/actions/runs/43093394788
- #143 PR Validate: https://github.com/Reekyi/UpStatus/actions/runs/43093687347

A falha da #82 é a divergência production updateURL mismatch. A causa estática foi confirmada: release.json aponta para /upstatus/upstatus.user.js, mas o build em master monta o updateURL usando o endpoint beta10. A #141 corrige a separação entre URL de distribuição e endpoint da API, usando release.scriptUrl para o updater e mantendo a API em função separada. A correção ainda não chegou a master; não enfraquecer o validator.

O workflow da #142 agora explica corretamente que pull_request.branches filtra a branch-base e inclui as bases #141 e #142, cobrindo a PR empilhada #143. Esta correção foi confirmada no arquivo do workflow. O PR #143 teve Validate em evento pull_request, mas seu offline_guard próprio foi observado em push; deploy ficou skipped.

O workflow oficial Team Lite em team-lite-official continua manual, mas executa supabase functions deploy upstatus e usa CLI latest. O alvo de Team Lite deveria ser upstatus-team-lite. A candidata de guard #129 não foi integrada à branch oficial. Não despachar o workflow oficial atual.

## Achado crítico: comandos remotos recebidos por broadcast público

Inspeção dos userscripts embutidos nos runtimes implantados:

- Normal upstatus v480 contém userscript 3.4.7. O listener remote_command lê payload.command e chama executeRemoteCommand quando target corresponde ao usuário. O handler não verifica a geração/autenticação local antes de confiar no payload.
- Team Lite upstatus-team-lite v15 contém userscript 3.4.30. O handler exige isAuthenticated, geração de sessão atual e membro correspondente, mas ainda executa executeRemoteCommand com base no payload recebido pelo broadcast. Não autentica criptograficamente o remetente nem consulta o comando antes de executá-lo.
- executeRemoteCommand sincroniza o status no Sale Smartly e chama POST /api/status usando a sessão local da vítima. Assim, a autenticação da requisição posterior não autentica a origem do comando recebido.

O canal usa publishable key e não configura private=true nem realtime.setAuth(). O payload do broadcast é, portanto, uma entrada não confiável. Não foi feita exploração ou publicação de broadcast. O achado é inspeção estática de um caminho de confiança inseguro, com potencial para alteração remota de status.

A comparação dos candidatos revelou regressão:

- #74 e #76 reduzem remote_command a wake-up para polling autenticado. É uma melhoria.
- #141 e #142 voltam a executar diretamente o comando recebido pelo broadcast e não incluem o adapter server-mediated de sinalização.
- #74 e #76 mantêm signaling_transport_enabled false por padrão e endpoint vazio; sem ativação explícita, call_signal, sala de voz e screen-share continuam usando broadcasts públicos.
- #141 e #142 não contêm signaling_transport_enabled, setAuth ou transporte server-mediated.

Não considerar o transporte de voz/tela privado ou pronto para produção.

## Divergência de tópicos Realtime

| Origem | Tópico |
|---|---|
| Bundles Normal v480 e Team Lite v15 implantados | upstatus-screen-share-live-3-1-1-beta10 |
| Candidato #141/#142 | upstatus-screen-share-live-3-1-1-beta10 |
| Candidato #74 | upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0 |
| Candidato #76 | upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0 |
| Triggers de produção | upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0 |

Os clientes implantados e o stack #141/#142 escutam screen-share beta10, enquanto os triggers do banco publicam no tópico legado. #74/#76 coincidem com os triggers, mas não com os clientes atualmente instalados. A integração deve escolher um tópico canônico e coordenar cliente, API e migrations.

Snapshot atual de realtime.messages: 107 registros, todos private=false:
- user_status: 55
- db_change: 40
- remote_command: 6
- remote_result: 6

As três funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users são SECURITY DEFINER, SET search_path=public, retornam trigger e têm EXECUTE para anon e authenticated. O trigger de mensagens envia to_jsonb(OLD/NEW) completo. O trigger remote_state envia campos de comando/resultado. Todos chamam realtime.send com private=false.

O Security Advisor identifica as três funções como executáveis via /rest/v1/rpc para anon e authenticated: 3 WARN por papel. O catálogo confirma EXECUTE. Não foi feita chamada HTTP RPC nesta auditoria; a concessão ampla e os avisos do Advisor estão confirmados e devem ser tratados como risco.

realtime.messages tem RLS habilitado, FORCE RLS desabilitado, zero policies e grants SELECT, INSERT e UPDATE para anon/authenticated.

## AUTH-03: candidatos bons, integração incompleta

#131 Normal e #76 Team Lite usam exatamente o mesmo blob para a migration 20261109230000_setup_invite_rate_limit.sql: ab73b5cd8200147a449327d21798eef588834d50. O teste scripts/test-setup-invite-rate-limit.mjs também é idêntico nos dois candidatos: blob ba22efb520cc0c23078a1395b207b62a96078231.

O servidor candidato aplica cinco emissões por administrador em janela de 900 segundos. Excesso retorna HTTP 429; falha do limitador retorna HTTP 503. A RPC usa SECURITY INVOKER, search_path vazio e EXECUTE exclusivo de service_role. O teste de concorrência executa 24 chamadas, valida limite e isolamento de buckets e limpa as fixtures no laboratório.

#131 passou 136/136; #76 passou 110/110 conforme evidência de CI.

Produção ainda não tem:
- Colunas setup_token_* na tabela users.
- Tabela upstatus_setup_invite_rate_limits.
- RPC consume_upstatus_setup_invite.
- RPC consume_upstatus_setup_invite_rate_limit.

O laboratório tem as colunas setup_token_hash, setup_token_expires_at, setup_token_issued_by e setup_token_issued_at, a tabela de rate limit e RPCs de convite/rate limit. As três RPCs consultadas são SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role.

A API candidata #142 não contém setup_token nem consume_upstatus_setup_invite_rate_limit. Portanto, o stack #141/#142/#143 não incorpora AUTH-03. Não foi encontrado rate limit de tentativas de login. AUTH-03 permanece em andamento, não concluído.

## RLS, grants, Default ACL e Storage

Produção:
- Dez tabelas públicas com RLS e zero policies: chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, upstatus_visual_config e users.
- Nove tabelas concedem a anon e authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE: 126 grants diretos no total.
- RLS não protege TRUNCATE.
- 120 entradas de privilégio Default ACL expandidas para papéis clientes, distribuídas entre public, storage, graphql e graphql_public, com owners postgres e supabase_admin.
- Buckets chat-images e profile-images são públicos, 20 MiB cada, zero policies próprias em storage.objects.
- 188 objetos Storage.

Storage/chat:
- public.messages tem 296 linhas: 241 text, 22 system, 17 image, 7 audio, 5 document e 4 video.
- Os cinco registros type=document têm file_name NULL.
- A candidata #142 adiciona signed upload e limite de 20 MiB, mas valida MIME e tamanho declarados antes de emitir URL assinada; não inspeciona os bytes antes do upload.
- O helper sniffMime retorna o MIME declarado quando a assinatura não é reconhecida.
- O caminho legado mediaRoute permite imagem de até 25 MiB, enquanto o bucket chat-images limita 20 MiB. Isso pode causar rejeição no Storage após a validação do backend. Achado estático, sem upload real.

## Edge Functions e ambiente

Inventário:
- Produção: 38 Edge Functions ativas.
- Laboratório: 2 Edge Functions ativas.
- Todas as funções listadas reportam verify_jwt=false. Os handlers principais inspecionados usam autenticação customizada por token de sessão; verify_jwt=false não foi classificado isoladamente como falha.
- Produção: upstatus v480, upstatus-team-lite v15, upstatus-screen-share-3-1-1-beta10 v6 e upstatus-test v281. upstatus-test está no próprio projeto de produção, não em projeto separado.
- Laboratório: upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não existe função upstatus-signal implantada em produção.
- A função de laboratório v32 não contém tratamento específico para VOICE_ATTEMPT_ALREADY_ACTIVE como HTTP 409. Não foi executada requisição HTTP real.

A organização possui apenas dois projetos Supabase. O laboratório é isolado e sem fixtures de produto, mas não é um ambiente full-product TEST: não tem buckets de chat/perfil, objetos Storage nem tráfego Realtime. O workflow de TEST exige um terceiro projeto separado.

Laboratório:
- 39 migrations, duas Edge Functions.
- Zero linhas em realtime.messages, zero buckets e zero objetos Storage.
- Zero grants diretos para anon/authenticated nas tabelas públicas auditadas.
- 18 tabelas públicas com RLS e sem policies.
- realtime.messages ainda concede SELECT/INSERT/UPDATE a anon/authenticated e não tem policies.
- Security Advisor: 18 INFO de RLS sem policy, zero WARN.

Produção:
- 7 migrations, 38 Edge Functions.
- 5 usuários.
- 296 mensagens.
- 107 eventos Realtime.
- Security Advisor: 3 WARN anon, 3 WARN authenticated e 10 INFO de RLS sem policy.
- Performance Advisor e Health Advisor sem findings.

## Migrations e dispatcher #143

A branch gerenciada Supabase main está MIGRATIONS_FAILED; preview_project_status está ACTIVE_HEALTHY. A branch main é default e acompanha GitHub master. O preflight #143 exige main ACTIVE_HEALTHY, portanto a situação atual bloqueia publicação.

O dispatcher avançou desde a auditoria anterior: agora exige os arquivos SQL no checkout exato e compara Git blob SHA-1. Três fontes têm proveniência git-blob-verified. Quatro continuam ledger-recovered-only e sem SHA original. O preflight falha fechado para essas quatro entradas. Não tratar statements recuperados do ledger como arquivos originais.

O preflight lista sete migrations históricas e não inclui a migration AUTH-03 de rate limit, pois a linha #142 usada como base do dispatcher não contém #131. A integração AUTH-03 deve preceder a seleção da migration de release.

release.json permanece em 3.4.7. O dispatcher exige uma versão estável superior à versão atual, portanto falta escolher e validar a próxima versão. O workflow não aplica migrations: apenas executa preflight read-only e publica primeiro beta10, depois upstatus. Não há smoke pós-deploy nem compensação automática caso o segundo deploy falhe.

O dispatcher exige aprovação humana allowlisted e atestados de release-gates e aceitação física vinculados ao SHA exato, com validade máxima de sete dias. São controles positivos, mas ainda sem aprovação e sem evidência física.

## Issues

Issue #78 permanece aberta. Os oito critérios físicos estão desmarcados. O último comentário de engenharia consultado é de 2026-11-08 e não registra aceitação física sem F5. Nenhum teste físico foi executado nesta auditoria.

Issue #79 permanece aberta; o corpo ainda indica 16/35 itens. O comentário QA dedicado foi atualizado sem criar duplicata e sem alterar o comentário da Engenharia.

## Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 107 broadcasts private=false, tópicos divergentes, zero policies e grants de cliente em realtime.messages |
| TEST-ISOLATION | blocked | Existe laboratório isolado, mas não existe projeto full-product TEST separado |
| MIGRATION-PROVENANCE | blocked | Três blobs originais verificados; quatro migrations somente recuperadas do ledger; main MIGRATIONS_FAILED |
| AUTH-03 | in_progress | #131 e #76 passam em CI, mas #142 e produção não incluem o fluxo |
| ACL-STORAGE | blocked | 126 grants diretos, 120 Default ACL, dois buckets públicos, zero policies Storage |
| RECONNECT | pending | Issue #78 continua 0/8 e não houve teste físico |
| HUMAN-REVIEW | pending | Nenhuma review humana nas PRs auditadas e nenhuma autorização explícita |

## Próximas ações recomendadas

1. Remover confiança em remote_command recebido por broadcast público; preservar polling autenticado da #74/#76 ao reconciliar #141/#142.
2. Escolher tópico Realtime canônico e coordenar clientes, API e triggers. Tornar voz e tela privadas/autorizadas por servidor por padrão.
3. Integrar AUTH-03 na cadeia Normal #141/#142/#143 e manter paridade Team Lite. Adicionar rate limit de tentativas de login.
4. Recuperar os quatro arquivos SQL originais de fonte confiável e registrar seus Git blob SHAs. Não reconstruir a partir do schema vivo.
5. Diagnosticar MIGRATIONS_FAILED antes de qualquer cutover.
6. Endurecer grants, Default ACL, RLS e Storage com plano revisado e rollback.
7. Corrigir workflow Team Lite e manter o dispatcher Normal fail-closed.
8. Provisionar ambiente full-product TEST separado.
9. Corrigir o contrato de MIME/assinatura e os limites de upload.
10. Executar os oito critérios físicos da Issue #78 e obter review/autorização humana.

**Veredito final: NOT READY.** Nenhum teste manual foi executado. CI aprovado em candidatos isolados não prova que os runtimes implantados estejam corrigidos nem autoriza release.
