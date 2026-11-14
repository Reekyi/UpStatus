# Auditoria independente de QA do UpStatus — 2026-11-09 22:31 UTC

## Escopo e método

Auditoria read-only de GitHub e Supabase para UpStatus integrado ao Sale Smartly. Foram revalidados branches, PRs #74/#75/#76/#82, issues #78/#79, workflows e logs, fontes de Edge Functions implantadas, artefatos userscript, catálogo PostgreSQL, advisors e migrations. Não houve teste manual, rerun de workflow ou mutação de fixtures.

Classificação: CI = workflow executado no SHA indicado; inspeção de código = leitura estática; manual pendente = requer navegador/dispositivo real; bloqueado = dependência ainda não satisfeita.

## Integridade da QA e heads

- QA qa/release-readiness-2026-11-04-master: 80d90a0d05c1efc1b4c461c961a4381624a3d68f.
- master: 9d40461babcec8eb8686c2a04be9c675df7da381.
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281.
- Compare master...QA: 172 commits à frente, 1 atrás; o único commit exclusivo de master é documental. Não foi feito rebase.
- docs/RELEASE_READINESS.md foi lido integralmente pelo blob 7cfbd70886df42ce790c078c224b19284a632595: 1.045.105 caracteres e 8.410 linhas. A leitura por caminho retornou corpo vazio; o blob foi usado como fonte integral. O documento não foi alterado.
- Este relatório é um arquivo novo na branch QA. Não substitui nem reescreve o documento principal.

## PRs e CI

| PR | HEAD | Estado | Evidência atual |
|---|---|---|---|
| #74 Normal | 5939b57027748eb9af08327d2a8c712fd5046484 | Draft, aberta, não mergeada | Validate 42689757655 PASS; Signaling Smoke 42689757169 PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Draft, aberta, não mergeada | Candidate Checks 41674353127 PASS histórico |
| #76 Team Lite candidata | 86736e3eb70ecb7dd9dce498c03f58e65cee06c3 | Draft, aberta, não mergeada | Candidate Checks 42698289332 PASS |
| #82 QA | 80d90a0d05c1efc1b4c461c961a4381624a3d68f | Draft, aberta, não mergeada | Validate 42704406841 FAIL |

Normal #74: logs confirmam 19/19 verificações não autenticadas e 136/136 autenticadas; WebRTC de chamada, voz e vídeo de tela; mesh de três participantes; teardown; rate limit distribuído; recibos atômicos; setup-invite de uso único e limpeza de fixtures no projeto isolado.

Team Lite #76: o commit 86736e3 sincronizou o adapter embutido com a fonte compartilhada para tratar VOICE_ATTEMPT_ALREADY_ACTIVE e VOICE_ATTEMPT_CONFLICT. O Candidate Checks passou com 16/16 verificações não autenticadas e 110/110 autenticadas, incluindo WebRTC de chamada/voz/tela, mesh, recuperação lógica, rate limit, recibos atômicos e setup-invite isolado. A correção foi validada no candidato, não implantada em produção.

#75 é baseline histórica; não substitui a #76. #82 está no HEAD 80d90a0 e o Validate atual falha em scripts/validate.mjs:26 com production updateURL mismatch. O último commit da QA é documental; não alterei o validator para mascarar a incompatibilidade herdada da base master.

Não foram encontradas reviews humanas submetidas nas quatro PRs auditadas. Todas permanecem Draft.

## Realtime e compatibilidade Normal/Team Lite

### Artefatos implantados

- Normal: Edge Function upstatus v480, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd. O userscript servido pelo runtime foi decodificado read-only: versão 3.4.7.
- API Normal: upstatus-screen-share-3-1-1-beta10 v6, source SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
- Team Lite: upstatus-team-lite v15, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb. Artefato oficial team-lite-official versão 3.4.30.

Os dois userscripts implantados assinam o tópico público upstatus-screen-share-live-3-1-1-beta10. Nenhum contém private:true ou realtime.setAuth(). Os handlers recebem remote_command, call_signal, voice_room_signal e screen-share signals diretamente; Normal chama executeRemoteCommand com o payload recebido, e Team Lite mantém o mesmo caminho. A autenticação local do próprio cliente não comprova a identidade do remetente.

Os triggers PostgreSQL publicam no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. O tópico dos triggers não coincide com o tópico dos clientes atuais. A divergência pode impedir entrega dos broadcasts trigger-driven aos clientes; não foi reproduzida em navegador nesta execução.

### Snapshot Realtime e triggers

SELECT-only encontrou 48 mensagens em realtime.messages, todas private=false: 22 db_change, 20 user_status, 3 remote_command e 3 remote_result, todas no tópico dos triggers. realtime.messages tem RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated.

Os três triggers estão habilitados: upstatus_messages_broadcast em public.messages, upstatus_users_broadcast em public.users e upstatus_remote_state_broadcast em public.upstatus_state. As três funções são SECURITY DEFINER, search_path=public, retornam trigger e têm EXECUTE efetivo para anon/authenticated. upstatus_broadcast_messages transmite to_jsonb(OLD/NEW) em db_change; remote_state transmite metadados de comando/resultado; users transmite nome/status/reason e metadados de atualização. O Advisor aponta 6 WARN e 10 INFO. Não houve exploração nem chamada RPC; para funções que retornam trigger não foi demonstrada invocação direta.

### Candidatos

Os templates #74/#76 configuram signaling_transport_enabled=false por padrão e endpoint vazio por padrão. Quando habilitado, receiveCallSignal rejeita sinais públicos sem marcador autenticado, exceto hints de descoberta; handlers de voz e tela deixam de processar eventos públicos. Com a configuração padrão, o caminho legado permanece ativo. A função upstatus-signal-test v32 existe somente no laboratório; não há endpoint server-mediated equivalente implantado em produção. Portanto, o candidato ainda não oferece um cutover autenticado pronto para ativação em produção.

## Edge Functions e AUTH-03

Produção tem 38/38 Edge Functions ACTIVE e todas reportam verify_jwt=false. Esse campo, sozinho, não prova ausência de autenticação: os runtimes principais implementam autenticação própria por token de sessão. Esta auditoria inspecionou os três runtimes principais, não todos os 38 handlers.

Nos runtimes implantados Normal v480, API beta10 v6 e Team Lite v15, POST /api/setup encaminha para login(req,true). O fluxo permite primeiro chamador de conta sem password_hash configurar senha sem convite, usa atualização não atômica e mantém fallback nominal de papel administrativo para nomes específicos. A RPC consume_upstatus_setup_invite e as colunas de convite não existem em produção.

Os templates candidatos #74/#76 exigem token de 64 caracteres e consomem convite pela RPC atômica. Os testes de CI validam tokens inválidos/expirados/reutilizados, concorrência de consumo e preservação de papel no laboratório. Porém, issueSetupInvite nos templates só verifica admin e emite token com validade de 15 minutos; não foi encontrado rate limit explícito nessa rota. O AUTH-03 de produção permanece bloqueado.

## RLS, grants, SECURITY DEFINER e Storage

- 10 tabelas public com RLS e sem policies.
- 9 tabelas public com grants diretos para anon/authenticated, incluindo TRUNCATE.
- 24 entradas em pg_default_acl.
- storage.objects: zero policies; anon/authenticated têm SELECT, INSERT, UPDATE e DELETE.
- Buckets chat-images e profile-images públicos, limite de 20 MiB cada.
- Três funções SECURITY DEFINER de trigger com EXECUTE para anon/authenticated e search_path=public.

Signed Upload nos runtimes recebe MIME, tamanho e nome declarados pelo cliente, cria Signed Upload URL e retorna URL pública; não recebe os bytes para inspeção server-side. O helper legado sniffMime também retorna o MIME declarado quando a assinatura não é reconhecida. Nenhum teste de upload com bytes reais foi executado.

## Migrations e isolamento

Produção está ACTIVE_HEALTHY, mas a branch gerenciada main permanece MIGRATIONS_FAILED. O inventário remoto contém sete migrations. Quatro fontes originais continuam ausentes em master (os caminhos retornaram 404): 20261023154754_create_upstatus_visual_config.sql, 20261026195855_add_chat_message_file_name.sql, 20261027154329_allow_chat_document_mime_types.sql e 20261027155438_set_upstatus_upload_limits_20mb.sql. Não foram reconstruídas a partir do schema.

O laboratório bfpjtfqlnypisxljoxkb está ACTIVE_HEALTHY, com 38 migrations e duas Edge Functions de teste. SELECT-only encontrou zero usuários, mensagens, salas, mensagens Realtime e buckets Storage. É um laboratório isolado, mas não um ambiente full-product TEST independente.

## Issues

- Issue #78 permanece aberta com 0/8 critérios físicos marcados. Não foi realizado teste manual no Tampermonkey, nem queda real de internet, recuperação sem F5, permissões reais de microfone/tela ou interoperabilidade instalada.
- Issue #79 permanece aberta; o corpo ainda mostra 16/35 itens marcados e 19 pendentes, portanto está desatualizado em relação aos comentários de checkpoint. Há um comentário QA e um comentário ENGINEERING; o comentário QA existente foi atualizado, sem duplicata e sem alterar o comentário da Engenharia.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime público, sem policies/grants restritivos, tópico divergente e cutover autenticado default-off/inexistente em produção. |
| TEST-ISOLATION | in_progress | Laboratório isolado limpo e ativo; ainda não é ambiente full-product TEST independente. |
| MIGRATION-PROVENANCE | blocked | Quatro fontes SQL remotas ausentes de master; branch main MIGRATIONS_FAILED. |
| AUTH-03 | blocked | First-caller setup nos runtimes implantados; RPC ausente em produção; sem rate limit explícito de emissão de convite nos candidatos. |
| ACL-STORAGE | blocked | Grants, Default ACLs e Storage público sem policies. |
| RECONNECT | pending | 0/8 critérios físicos; exige teste instalado sem F5. |
| HUMAN-REVIEW | pending | Nenhuma review humana submetida; autorização explícita de release ausente. |

## Próximos passos

1. Corrigir RT-01 com cutover server-mediated/autenticado coordenado, tornar o transporte seguro default e remover handlers públicos sensíveis; testar entrega, autorização e rollback em ambiente independente.
2. Recuperar os quatro SQLs originais de artefatos/backup revisados; não sintetizar migrations.
3. Completar AUTH-03 com rate limit explícito de emissão/consumo e validar o fluxo HTTP integral no laboratório antes de qualquer plano de cutover.
4. Restringir grants/Default ACLs e Storage por migrations revisadas e owner autorizado; validar upload por bytes reais em quarentena privada.
5. Criar ambiente full-product TEST independente e corrigir o caminho oficial de deploy Team Lite antes de qualquer dispatch.
6. Executar os oito critérios físicos da Issue #78 em Normal e Team Lite, especialmente queda de internet por 10 segundos e recuperação sem F5.
7. Obter revisão humana e autorização explícita antes de merge, deploy, release ou publicação.

## Limites e segurança

Somente leituras GitHub/Supabase e SELECT foram executadas. Não houve escrita SQL, migration, deploy, workflow dispatch/rerun, merge, release, publicação de userscript, alteração de secrets/flags/grants/policies/ACLs, limpeza de fixtures ou teste destrutivo. Nenhum teste manual foi realizado. A única escrita desta execução é este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.