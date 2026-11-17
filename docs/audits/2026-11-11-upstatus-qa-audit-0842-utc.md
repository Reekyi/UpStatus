# Auditoria independente UpStatus — 2026-11-11 08:42 UTC

## Escopo e método

Auditoria read-only do GitHub e dos projetos Supabase produção (dlfvkawaiqduhlazsszm) e laboratório (bfpjtfqlnypisxljoxkb). Foram consultados heads, PRs, reviews, workflows e logs existentes; catálogo PostgreSQL, migrations, advisors, buckets e Edge Functions. Todas as consultas SQL executadas foram SELECT. Não foram executados testes locais, HTTP, browser ou físicos nesta rodada.

## Heads e integridade documental

- master: 9d40461babcec8eb8686c2a04be9c675df7da381.
- QA qa/release-readiness-2026-11-04-master: 4a5d8f76d08cfa015282712aef720abc38cb9b8d.
- Comparação QA contra master: 215 commits à frente, 1 atrás.
- As branches master e QA retornaram protected=false; a consulta de rulesets retornou lista vazia.
- docs/RELEASE_READINESS.md está presente na branch QA, blob 7cfbd70886df42ce790c078c224b19284a632595; o compare informa 8.409 linhas adicionadas. Porém fetch_file por faixas e base64 retornou conteúdo vazio, fetch_blob/raw não puderam ser recuperados. Portanto, a leitura integral do documento principal não foi possível nesta execução e não é declarada como concluída.
- O relatório desta rodada foi criado em arquivo novo nesta branch QA; o documento principal não foi alterado.

## PRs e CI

| PR | HEAD | Estado | Evidência consultada |
|---|---|---|---|
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d | Open / Draft | Validate 42753434411 e Smoke 42753434336 SUCCESS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Open / Draft | Candidate Checks 41674353127 SUCCESS, histórico e escopo limitado |
| #76 Team Lite signaling | 3b1406ddb56aecfa5b5515791ca99aea92c305ab | Open / Draft | Candidate Checks 42753492373 SUCCESS |
| #82 QA | 4a5d8f76d08cfa015282712aef720abc38cb9b8d | Open / Draft | Validate 42982224102 FAILURE |
| #143 Normal dispatcher | 34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa | Open / Draft | Push guard 42984657754 SUCCESS; PR Validate 42984668622 SUCCESS |

### Detalhes de CI

- #74: o smoke automatizado passou por negociação WebRTC e entrega de áudio de chamada, áudio de sala e vídeo de tela; convite dinâmico, malha de três participantes, teardown, limpeza de fixtures, rate limit distribuído, recibos de leitura e setup enrollment. Isso é CI em navegador/ambiente isolado, não aceitação física no Tampermonkey.
- #75: o workflow validou versão 3.4.31, sintaxe, portais convidados, isolamento de sessão e cenários do atualizador. Não equivale à suíte completa da linha #76.
- #76: além dos contratos de signaling, passou por testes de leave/rejoin, retry, recuperação local offline/online, preservação do contexto de sala e limpeza. Não simula perda física real de internet no navegador instalado.
- #82: log do job validate registra build PROD/TEST 3.4.7 e falha em scripts/validate.mjs:26: production updateURL mismatch. A falha é do contrato de build herdado, embora a PR seja documental.
- #143: a revisão atual removeu filtros paths do workflow. O push executou offline_guard e Validate com sucesso; deploy ficou SKIPPED. O Validate da PR executou no merge ref e passou. A PR continua Draft, sem review humana, e está 13 commits à frente e 1 atrás da branch-base atual.

### Dispatcher Normal #143

Avanços confirmados:
- O workflow dispara no push dos refs configurados e em pull_request para master, sem filtros de caminho que permitam pular o guard.
- O guard exige checks obrigatórios offline_guard e validate, sucesso no SHA de release, PR integrada em master, aprovação humana allowlisted no HEAD exato, versão estável superior, atestados SHA-bound e preflight read-only do projeto, branch e migrations.
- O workflow publica beta10 API antes da distribuição upstatus; a execução auditada não publicou nada.

Limitações restantes:
- A configuração efetiva de required reviewers do GitHub Environment production não foi verificada.
- Atestados SHA/timestamp são variáveis do repositório, não assinaturas criptográficas.
- O preflight valida versões/nomes do ledger, não os bytes dos SQLs históricos.
- Não há smoke pós-publicação nem compensação automática se a segunda função falhar.
- release.json em master continua 3.4.7; uma release exige versão estável maior.
- Nenhum review humano foi registrado nas PRs #74, #75, #76, #82 e #143.

## Supabase produção

Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002. A branch gerenciada main é default e acompanha GitHub master, mas seu status é MIGRATIONS_FAILED.

### Migrations

O ledger de produção contém sete versões:
- 20261005160000 upstatus_cloud
- 20261005173000 remote_realtime
- 20261005180000 client_presence
- 20261023154754 create_upstatus_visual_config
- 20261026195855 add_chat_message_file_name
- 20261027154329 allow_chat_document_mime_types
- 20261027155438 set_upstatus_upload_limits_20mb

Os quatro arquivos SQL de outubro retornaram HTTP 404 em master:
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

O ledger confirma que foram aplicadas, mas suas fontes não estão disponíveis em master. Não reconstruir SQL por inferência.

### Realtime

Consulta a realtime.messages encontrou 67 registros, todos private=false, no tópico legado:
- db_change: 20
- remote_command: 6
- remote_result: 6
- user_status: 35

Os userscripts decodificados diretamente dos bundles servidos por upstatus v480 e upstatus-team-lite v15 usam o tópico upstatus-screen-share-live-3-1-1-beta10. Ambos criam realtimeClient.channel(UP_REALTIME_TOPIC), sem setAuth() ou private:true encontrados. Os triggers de produção continuam publicando em upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Portanto, há divergência objetiva entre tópico dos clientes e tópico dos triggers.

As funções de broadcast enviam:
- Mensagens: linha OLD/NEW completa via to_jsonb.
- Remote state: metadados de comandos/resultados.
- Usuários: nome, status, motivo, updated_at e sync.

As três funções são SECURITY DEFINER, search_path=public, retornam trigger e estão anexadas a triggers. EXECUTE está concedido a anon e authenticated. O Advisor retorna três WARN para cada papel. Não foi demonstrada invocação HTTP RPC direta; o retorno trigger deve ser considerado na avaliação.

### RLS, grants, ACL e Storage

- Dez tabelas públicas têm RLS habilitado e zero policies.
- Nove tabelas backend-owned concedem a anon e authenticated sete privilégios: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- TRUNCATE não é protegido por RLS.
- Default ACL: 120 privilégios para anon/authenticated.
- realtime.messages tem RLS sem policies e grants SELECT/INSERT/UPDATE para ambos os papéis.
- Buckets chat-images e profile-images são públicos, limite 20 MiB, sem policies próprias em storage.objects.
- Security Advisor: 10 INFO de RLS sem policy, 3 WARN anon e 3 WARN authenticated para SECURITY DEFINER.

## Supabase laboratório

Projeto upstatus-security-test ACTIVE_HEALTHY, PostgreSQL 17.11.0.003:
- 39 migrations.
- Duas Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- Nenhum bucket Storage e nenhuma mensagem Realtime consultada.
- 18 tabelas públicas com RLS e zero policies.
- Zero grants diretos para anon/authenticated nas tabelas de aplicação/fixtures auditadas.
- Default ACL para anon/authenticated: 96.
- As três funções broadcast continuam SECURITY DEFINER, mas search_path vazio e EXECUTE=false para anon/authenticated, true para service_role.
- Os broadcasts do laboratório já minimizam payload para {op: TG_OP}, mas ainda usam private=false e o tópico legado. A mitigação não resolve o canal privado/autorizado.

## Edge Functions, chat e voz

Produção possui 38 Edge Functions:
- upstatus v480, userscript 3.4.7.
- upstatus-team-lite v15, userscript 3.4.30.
- upstatus-screen-share-3-1-1-beta10 v6.
- upstatus-test v281.
- Não existe upstatus-signal de produção.
Os metadados das funções consultadas indicam verify_jwt=false; os handlers precisam manter a validação customizada de sessão. Isso não é, isoladamente, prova de ausência de autenticação.

Chat:
- 279 mensagens; cinco documentos e os cinco sem file_name.
- O backend beta10 servido não contém persistência de file_name.
- A rota /api/chat/clear ainda verifica literalmente name === Ricardo, embora exista helper admin(name) por papel.
- /api/setup continua encaminhando para login(req,true), sem consumo de token AUTH-03.
- Há três contas implementation_admin e duas implementation_user.

Voz:
- upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para 409.
- VOICE_ATTEMPT_ALREADY_ACTIVE não aparece no mapeamento; erros desconhecidos caem no fallback 500.
- Inspeção estática apenas; nenhum HTTP real foi executado.

Team Lite:
- team-lite-official HEAD 9065bc1.
- .github/workflows/deploy-production.yml ainda publica a função upstatus e usa Supabase CLI latest.
- O build oficial define PROD_FUNCTION=upstatus; não é uma cadeia correta de publicação do runtime upstatus-team-lite.
- A candidata #76 trabalha em 3.4.31, mas não substitui a cadeia oficial.

## Issues e aceitação

- Issue #78 permanece OPEN com 0/8 critérios físicos aprovados. Não houve teste manual de queda de internet, recuperação sem F5, reentrada ou interoperabilidade instalada.
- Issue #79 permanece OPEN: 16 itens marcados e 19 pendentes.
- O comentário QA dedicado foi atualizado no comentário existente; o comentário da Engenharia foi preservado, sem duplicatas.

## Veredito

Release recommendation: not_ready.

Bloqueadores prioritários:
1. RT-01: corrigir tópico divergente, tornar Realtime privado/autorizado e minimizar payloads de produção.
2. MIGRATION-PROVENANCE: recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
3. ACL-STORAGE: revogar grants desnecessários, revisar Default ACL e definir política/visibilidade de Storage.
4. AUTH-03: integrar convites, rate limit e signaling autenticado em produção.
5. Chat: persistir file_name e autorizar ações administrativas por papel.
6. Team Lite: corrigir o workflow oficial para publicar upstatus-team-lite.
7. RECONNECT: executar aceitação física Normal e Team Lite sem F5.
8. HUMAN-REVIEW: obter reviews humanas e autorização explícita antes de qualquer release.

Nenhum merge, deploy, migration, release, alteração de secrets/flags, publicação de userscript ou operação destrutiva foi realizado. Nenhuma consulta SQL de escrita foi executada.
