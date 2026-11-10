# Auditoria independente de QA do UpStatus — 2026-11-10 01:44 UTC

**Repositório:** Reekyi/UpStatus  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Laboratório isolado:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**Recomendação:** NOT READY — não liberar.

## 1. Método e limites

Foram consultados refs, metadados e diffs do GitHub; workflows e logs de jobs; Issues #78/#79; o blob integral de docs/RELEASE_READINESS.md; inventário e conteúdo de Edge Functions; histórico de migrations; Advisors; e consultas SELECT/catálogo no Supabase.

O blob de docs/RELEASE_READINESS.md é 7cfbd70886df42ce790c078c224b19284a632595, com 1.045.105 caracteres e 8.409 linhas. O conteúdo foi lido integralmente. O último checkpoint nele registrado termina em 2026-11-08 18:30 UTC, portanto o documento principal está desatualizado para os heads e estados desta execução. Ele foi preservado; este relatório é um arquivo novo.

Não houve execução local de scripts, teste manual no Tampermonkey, alteração SQL, migration, deploy, merge, release, publicação de userscript, mudança de secret/flag/role/grant/policy/ACL ou operação destrutiva. As consultas SQL foram somente leitura. A escrita GitHub desta execução é somente este arquivo novo na branch QA e a atualização do comentário QA existente na Issue #79.

## 2. Heads e integridade das branches

| Ref | HEAD observado | Comparação |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | referência atual |
| qa/release-readiness-2026-11-04-master | fce8a65d4e768de55578e866fb76d63a081542b4 | 175 à frente, 1 atrás de master |
| chore/continuity-foundation | 5939b57027748eb9af08327d2a8c712fd5046484 | 879 à frente, 1 atrás de master |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | base do candidato Team Lite |
| team-lite/signaling-transport-candidate | e7ed9a6318364a183427fb5d93831d3da8fc0db3 | 375 à frente, 0 atrás de team-lite-official |
| feat/normal-setup-invite-rate-limit-20261109 | 606aaff264c081bb19e974c23a48b71ece27cec1 | 9 à frente de chore/continuity-foundation |

QA e Normal compartilham o merge-base a9288ccfcb0f308d3a587bfca624418a395be07b; ambos estão um commit atrás do master atual. Não fiz rebase nem force update. O relatório foi criado como arquivo novo, sem substituir conteúdo concorrente.

## 3. PRs, workflows e testes

| PR | HEAD / estado | Evidência atual | Classificação |
|---|---|---|---|
| #74 Normal | 5939b570; aberta, Draft | Validate 42689757655 PASS; Signaling Smoke 42689757169 PASS | AUTOMATED PASS |
| #75 Team Lite baseline | 7bbf9b90; aberta, Draft | Candidate Checks 41674353127 PASS histórico | AUTOMATED PASS histórico; não é a linha ativa |
| #76 Team Lite | e7ed9a6; aberta, Draft | Candidate Checks 42734522680 PASS no HEAD exato | AUTOMATED PASS |
| #82 QA | fce8a65; aberta, Draft | Validate 42729420809 FAIL | AUTOMATED FAIL |
| #130 AUTH-03 Normal | 606aaff; aberta, Draft; base é #74 | 42717934162 PASS em evento push; nenhum workflow PR associado ao SHA | PASS por push, não é check de PR |
| #129 guard Team Lite | 886d364; aberta, Draft | Guard offline 42670892535 PASS | PASS candidato, ainda não integrado |

### Normal #74

O log do Smoke confirma 19/19 verificações não autenticadas e 136/136 autenticadas. O Chromium negociou WebRTC e recebeu faixas remotas de áudio em chamada e sala de voz, além de vídeo de compartilhamento de tela. A malha de três participantes e o teardown também passaram.

A candidata Normal ainda está em versão 3.4.7. O userscript implantado servido por upstatus v480 também é 3.4.7 e aponta o API CLOUD_SERVER para a função beta10 separada. O workflow Normal da candidata publica somente upstatus; não coordena a função beta10 usada pelo cliente atual. O corte precisa tratar os dois endpoints e a versão, não presumir que publicar upstatus atualiza o backend efetivamente usado.

### Team Lite #76

O HEAD exato e7ed9a6 passou em 42734522680. O log confirma:

- 16/16 verificações não autenticadas e 110/110 autenticadas.
- WebRTC de chamada, áudio de sala e vídeo de tela com faixas remotas.
- Convite dinâmico de grupo, malha de três participantes e teardown.
- Teste de emissão de convite com 24 chamadas concorrentes: exatamente 5 permitidas e 19 negadas.
- Bucket independente para outro administrador, reset da janela e limpeza das fixtures.

A primeira execução 42733737488 falhou em SHA intermediário 9af4a20 porque o script de teste ainda não existia naquele commit. Ela foi seguida pelo workflow completo no HEAD final, que passou. Não classificar o HEAD final como falho por causa da execução intermediária.

O release.json candidato Team Lite indica buildVersion 3.4.31; a Edge Function oficial implantada ainda embute userscript 3.4.30. A correção não está em produção.

### AUTH-03 e PR #130

A PR #130 adiciona rate limit distribuído de emissão de convites no Normal, 5 por administrador a cada 15 minutos. O workflow 42717934162 passou no evento push, incluindo teste concorrente no projeto isolado. Entretanto, o PR tem base chore/continuity-foundation, enquanto o workflow pull_request filtra a base master. Não há check de PR associado ao SHA 606aaff. O resultado por push é evidência de execução, não substitui o check da PR.

A PR #76 agora contém a implementação equivalente para Team Lite e passou no check de PR correto. Nos dois candidatos, o rate limit é da emissão de convites; esta mudança não demonstra rate limit geral de tentativas de login.

### QA #82

O HEAD fce8a65 falhou no Validate 42729420809. O log confirma erro em scripts/validate.mjs:26: production updateURL mismatch. O novo HEAD documental não tem check separado; não afirmar que um check ausente é sucesso ou falha.

Nenhuma das PRs revisadas (#74, #75, #76, #82, #129 e #130) tem review humana registrada. Todas permanecem Draft.

## 4. Setup e rate limit: candidato versus produção

O código candidato Team Lite agora exige setupToken de 64 caracteres hexadecimais e consome o convite pela RPC consume_upstatus_setup_invite. A rota de emissão valida o papel implementation_admin e chama consume_upstatus_setup_invite_rate_limit; erro da RPC falha fechado com HTTP 503 e limite excedido retorna HTTP 429.

A migration candidata cria upstatus_setup_invite_rate_limits com RLS habilitado, revoga privilégios de PUBLIC/anon/authenticated, concede DML somente a service_role e cria RPC SECURITY INVOKER com search_path vazio e EXECUTE somente para service_role. A rotina de limpeza é limitada a 100 registros por execução. O teste de contrato foi aplicado somente ao laboratório pelo fluxo de CI. A consulta posterior encontrou zero linhas na tabela e zero fixtures restantes.

Em produção, a inspeção direta de upstatus v480, upstatus-team-lite v15 e upstatus-screen-share-3-1-1-beta10 v6 encontrou o fluxo antigo: /api/setup chama login(req,true), que define a senha da conta ainda sem password_hash sem exigir token de convite. Nenhum desses runtimes contém a rota de emissão de convite ou a RPC de rate limit. A consulta ao catálogo confirmou ausência de colunas setup_token_*, da tabela upstatus_setup_invite_rate_limits e das RPCs de convite/rate limit.

Portanto AUTH-03 está em andamento no código candidato, mas continua sem correção implantada. Não aplicar migrations nem fazer cutover sem plano revisado e autorização explícita.

## 5. Supabase: Realtime, RLS, grants e Storage

### Realtime — bloqueador crítico

A consulta encontrou 48 linhas em realtime.messages, todas private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0:

- 22 db_change
- 20 user_status
- 3 remote_command
- 3 remote_result

O RLS de realtime.messages está habilitado, sem policies; anon e authenticated mantêm SELECT, INSERT e UPDATE. Os clientes Normal e Team Lite implantados assinam upstatus-screen-share-live-3-1-1-beta10. A função beta10 v6 embute um userscript beta8 que assina upstatus-screen-share-live-3-1-1-beta8. Nenhum dos scripts implantados usa private:true ou realtime.setAuth(). Os três tópicos não coincidem com o tópico publicado pelos triggers.

Os triggers de produção estão associados a três funções SECURITY DEFINER com search_path=public:

- upstatus_broadcast_messages envia to_jsonb(OLD/NEW), ou seja, a linha completa da mensagem, via realtime.send(..., false).
- upstatus_broadcast_remote_state publica campos de comando e resultado remoto via realtime.send(..., false).
- upstatus_broadcast_users publica estado e motivo do usuário via realtime.send(..., false).

As três funções retornam trigger e estão anexadas a triggers. O Advisor reporta 3 WARN para anon e 3 WARN para authenticated por EXECUTE amplo. O catálogo confirma EXECUTE para PUBLIC, anon e authenticated. Não foi demonstrada chamada RPC direta; o risco concreto confirmado nesta inspeção é o broadcast público, payload e ausência de identidade verificável do remetente, não uma exploração RPC reproduzida.

### RLS, grants e Default ACLs

- 10 tabelas public do Advisor têm RLS habilitado e zero policies.
- 9 tabelas backend-owned têm grants diretos para anon/authenticated, incluindo TRUNCATE.
- realtime.messages mantém grants SELECT/INSERT/UPDATE para ambos.
- storage.objects mantém grants SELECT/INSERT/UPDATE/DELETE para ambos e não tem policies.
- Foram observadas 24 entradas de Default ACL em vários schemas. As ACLs de public e storage, além de GraphQL/GraphQL Public, incluem privilégios amplos para anon/authenticated. O plano de correção deve revisar owners postgres e supabase_admin sem criar policies públicas genéricas.

O Security Advisor retornou 3 WARN anon, 3 WARN authenticated e 10 INFO de RLS sem policy.

### Storage

Os buckets chat-images e profile-images continuam públicos, com limite de 20 MiB cada. Não existem policies em storage.objects. O backend signed-upload ainda precisa de revisão da validação dos bytes reais, não apenas do MIME declarado. Não houve upload real nesta rodada.

## 6. Edge Functions, ambientes e migrations

A produção tem 38 Edge Functions ACTIVE, todas reportando verify_jwt=false. O inventário inclui funções atuais, múltiplas variantes upstatus-test-*, screen-share beta e backups. Os três runtimes principais implementam autenticação própria por sessão; não se deve concluir que todos os 38 handlers são anônimos sem revisão individual. A quantidade de funções legadas/test/backup na produção é dívida de inventário e superfície operacional.

Somente dois projetos Supabase existem:
- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, 7 migrations remotas.
- Laboratório bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, 39 migrations; rate-limit testado e sem fixtures remanescentes.

Não existe projeto full-product TEST independente. A branch gerenciada main de produção continua MIGRATIONS_FAILED.

Os quatro SQLs originais abaixo retornaram 404 em master:
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

### Workflows de deploy

O workflow .github/workflows/deploy-production.yml em team-lite-official ainda é workflow_dispatch, carrega SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_ID de secrets, usa Supabase CLI latest e executa supabase functions deploy upstatus. Não verifica branch, SHA ou projeto esperado e aponta para o slug Normal, não Team Lite. A PR #129 substitui o workflow por bloqueio fail-closed; o guard offline passou, mas a PR continua Draft. Não despachar o workflow oficial.

O deploy-test.yml candidato da #76 é manual-only, exige SUPABASE_TEST_PROJECT_ID, rejeita produção e o laboratório de sinalização, verifica o alvo do build e fixa a versão da CLI. Como não há full-product TEST, o workflow deve continuar sem dispatch.

## 7. Issues e aceitação manual

- Issue #78 permanece aberta com 0/8 critérios físicos marcados. Nenhum teste real no Tampermonkey, queda de internet por aproximadamente 10 segundos, recuperação sem F5, permissões reais de microfone/tela ou interoperabilidade instalada Normal ↔ Team Lite foi executado nesta rodada.
- Issue #79 permanece aberta. O corpo tem 16 itens marcados e 19 pendentes, mas contém snapshots históricos; o comentário dedicado QA é o feed corrente. Há exatamente um comentário UPCONTROL:QA e um UPCONTROL:ENGINEERING. O comentário da Engenharia foi preservado.

## 8. Gates desta execução

| Gate | Estado QA | Justificativa |
|---|---|---|
| RT-01 | blocked | Broadcasts públicos, tópico divergente, sem private/auth |
| TEST-ISOLATION | in_progress | Laboratório isolado e limpo, mas sem full-product TEST |
| MIGRATION-PROVENANCE | blocked | 4 SQLs originais ausentes; produção 7 migrations; main MIGRATIONS_FAILED |
| AUTH-03 | in_progress | Convite e rate limit passaram no candidato Normal/Team Lite, mas produção continua no setup legado |
| ACL-STORAGE | blocked | Grants, Default ACLs, buckets públicos e ausência de policies persistem |
| RECONNECT | pending | Issue #78 0/8; requer teste físico confirmado por Ricardo |
| HUMAN-REVIEW | pending | PRs permanecem Draft e sem reviews; não há autorização de release |

## 9. Ações necessárias

1. Corrigir e validar Realtime privado/server-mediated em ambos os clientes, alinhar o tópico e minimizar payloads; planejar rollout e rollback.
2. Completar AUTH-03 em Normal e Team Lite, incluindo teste de PR válido para #130, revisão do fluxo de login e cutover coordenado. Produção não foi alterada.
3. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED antes de qualquer migration.
4. Revisar grants, Default ACLs, SECURITY DEFINER e Storage com owners e plano de rollback.
5. Provisionar ambiente full-product TEST independente antes de qualquer deploy TEST.
6. Corrigir o dispatcher Team Lite oficial e obter review humana antes de qualquer publicação.
7. Ricardo deve executar os oito critérios físicos da Issue #78, especialmente reconexão sem F5 em Normal e Team Lite.

**Veredito final: NOT READY.** O CI exato do Team Lite avançou e agora cobre o rate limit de convites, mas a produção continua com setup sem convite, Realtime público, permissões excessivas, migrations ausentes e workflow Team Lite incorreto. Nenhuma alteração de produção foi realizada.
