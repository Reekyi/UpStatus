# Auditoria independente UpStatus QA - 2026-11-09 21:37 UTC

## Resultado executivo

**Recomendação: NOT READY.** Os candidatos Normal e Team Lite têm CI positivo nos HEADs atuais, mas a produção continua com bloqueadores de segurança e de migração. O Validate da própria branch QA permanece vermelho. A aceitação física da Issue #78 continua em 0/8.

Esta rodada confirmou uma correção real na candidata Team Lite: o userscript distribuído agora reconhece os dois códigos de conflito de tentativa de voz, em paridade com o adapter compartilhado, e o Candidate Checks passou no HEAD exato. Isso é CI automatizado, não correção implantada nem teste físico.

## Documento de continuidade

Li integralmente o conteúdo atual de docs/RELEASE_READINESS.md na branch QA:
- Blob SHA: 7cfbd70886df42ce790c078c224b19284a632595.
- Conteúdo: 1.050.184 caracteres e 5.746 linhas.
- Última seção registrada no documento: 2026-11-08 15:30 BRT / 18:30 UTC.
- O documento principal não foi modificado nesta execução.

O arquivo contém snapshots históricos; todos os heads, workflows e dados de produção abaixo foram revalidados separadamente.

## Heads e integridade das branches

| Ref | HEAD atual |
|---|---|
| qa/release-readiness-2026-11-04-master | f136161df9dafbe7d336c0a8a9bb68f877e7e55b |
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

A QA está 170 commits à frente e 1 atrás de master; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. Nenhum rebase foi feito. A branch QA não mudou durante a inspeção; o relatório desta rodada será um novo arquivo, sem substituir documentos existentes.

## PRs e CI nos HEADs exatos

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| #74 Normal | 5939b57027748eb9af08327d2a8c712fd5046484 | Open / Draft | Validate 42689757655 PASS; Signaling Smoke 42689757169 PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Open / Draft | Candidate Checks 41674353127 PASS histórico |
| #76 Team Lite | 86736e3eb70ecb7dd9dce498c03f58e65cee06c3 | Open / Draft | Candidate Checks 42698289332 PASS |
| #82 QA | f136161df9dafbe7d336c0a8a9bb68f877e7e55b | Open / Draft | Validate 42694741324 FAILURE |

### PR #74 Normal

Validate e Signaling Smoke passaram no HEAD atual. O log do Smoke confirma:
- 19/19 verificações não autenticadas.
- 136/136 verificações autenticadas.
- WebRTC de chamada individual, sala de voz e vídeo de compartilhamento de tela com entrega de tracks remotas.
- Mesh de três participantes e teardown.
- Rate-limit distribuído, recibos de leitura atômicos e regressões de recuperação de chamada/sala.

É evidência de navegador automatizado em ambiente isolado. Não comprova uso instalado no Tampermonkey nem recuperação física de rede.

O workflow candidato Normal usa Supabase CLI 2.122.1, mas publica somente a função upstatus. Não coordena a função API separada upstatus-screen-share-3-1-1-beta10, usada pelo cliente para endpoints de API. Um deploy apenas de upstatus não atualizaria os dois runtimes.

### PR #75 Team Lite baseline

Permanece Draft. O Candidate Checks 41674353127 é PASS histórico no HEAD 7bbf9b9. É baseline de continuidade e não substitui a validação da candidata mais recente #76.

### PR #76 Team Lite

O primeiro Candidate Checks desta sequência falhou porque o adapter embutido não tratava VOICE_ATTEMPT_CONFLICT, embora a fonte compartilhada tratasse. A correção está no commit 86736e3: o bundle team-lite/upstatus-team-lite.user.js agora trata VOICE_ATTEMPT_ALREADY_ACTIVE e VOICE_ATTEMPT_CONFLICT, igual ao módulo src/userscript/signaling-transport.mjs.

O Candidate Checks 42698289332 passou no HEAD exato:
- 110/110 verificações autenticadas.
- WebRTC de chamada, sala de voz e compartilhamento de tela.
- Convites e mesh de três participantes.
- Rate-limit distribuído, recibos de leitura atômicos e consumo de convite de uso único.
- Testes de recuperação, logout e paridade do bundle.

A falha anterior foi corrigida e validada pelo CI. A PR continua Draft e não foi integrada nem implantada.

### PR #82 QA

O Validate 42694741324 falhou no HEAD exato f136161. O log mostra:
- VALIDATION FAILED: production updateURL mismatch
- scripts/validate.mjs:26

Não alterei nem enfraqueci o validator. A falha é do contrato de release herdado, não de um teste manual de produto.

### Reviews humanas

Não foram encontradas reviews formais submetidas nas PRs #74, #75, #76 ou #82. As consultas de threads de review retornaram zero threads para #74, #76 e #82. Todas permanecem Draft.

## Workflows e governança de publicação

O workflow atual em team-lite-official, .github/workflows/deploy-production.yml, blob e95bab7602fd3fcf80ab88ff44ccc9c259593c75:
- aceita workflow_dispatch;
- carrega SUPABASE_ACCESS_TOKEN de secrets;
- instala Supabase CLI latest;
- executa supabase functions deploy upstatus.

Esse slug é o runtime Normal, não upstatus-team-lite. Não despachar esse workflow.

A PR #129 propõe bloquear o dispatcher legado e está Draft. O teste offline do guard passou historicamente no run 42670892535, mas o guard ainda não está na branch oficial. O workflow Normal candidato também não coordena o deploy da função beta10.

O endpoint de rulesets retornou lista vazia. A leitura dos endpoints de branch protection retornou 403; portanto não foi possível confirmar os requisitos de proteção de master e team-lite-official. Não concluir ausência de proteção com base apenas nesse 403.

## Supabase produção - consultas read-only

Projeto dlfvkawaiqduhlazsszm:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- 7 migrations remotas.
- Branch gerenciada main em MIGRATIONS_FAILED.
- 38/38 Edge Functions ACTIVE; todas reportam verify_jwt=false.
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
- Nenhuma função upstatus-signal está listada em produção.

verify_jwt=false, isoladamente, não prova ausência de autenticação: os handlers do produto usam tokens de sessão próprios. O problema relevante é o comportamento específico dos handlers e os canais públicos descritos abaixo.

### Realtime e sinalização - bloqueador crítico

Uma consulta SELECT encontrou 48 linhas em realtime.messages, todas private=false:
- 22 db_change;
- 20 user_status;
- 3 remote_command;
- 3 remote_result.

Todas estão no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.

realtime.messages tem RLS habilitado, FORCE RLS desabilitado, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated. Os clientes implantados Normal e Team Lite continuam no caminho Realtime público legado; a inspeção anterior dos artefatos implantados encontrou tópico de cliente diferente do tópico dos triggers e ausência de private:true/realtime.setAuth(). Os SHAs dos três runtimes permanecem iguais aos da auditoria anterior, portanto não há evidência de corte para um runtime novo.

Os triggers publicam dados de mensagens e metadados de comando. As funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users são SECURITY DEFINER, usam search_path=public e têm EXECUTE para anon/authenticated. O Security Advisor atual emite três WARNs para anon, três WARNs para authenticated e dez INFOs de RLS sem policy. O catálogo indica que as funções retornam trigger; nenhum teste HTTP/RPC ou exploração foi executado nesta auditoria. O achado confirmado é a configuração pública, os grants excessivos e o payload transmitido, não uma exploração reproduzida.

### RLS, grants, Default ACL e Storage

Consultas de catálogo encontraram:
- 10 tabelas public com RLS e sem policies.
- 9 tabelas public com grants diretos para anon e authenticated, incluindo TRUNCATE, DELETE, INSERT, SELECT e UPDATE.
- 24 entradas de Default ACL.
- storage.objects sem policies.
- storage.objects com grants DELETE/INSERT/SELECT/UPDATE para anon e authenticated.
- chat-images e profile-images públicos, com limite de 20 MiB cada.

RLS sem policies não neutraliza privilégios como TRUNCATE. Não executei operações destrutivas nem testei acesso a arquivos.

### AUTH-03 - setup e rate limit

Os runtimes implantados upstatus v480, upstatus-team-lite v15 e beta10 v6 ainda roteiam POST /api/setup para login(req,true). A função de login permite configurar senha de conta sem password_hash, sem convite e sem consumo atômico. Também mantém fallback de implementation_admin por nome quando o papel está vazio. A senha mínima é diferente: seis caracteres no Normal e quatro no Team Lite.

O catálogo de produção encontrou cinco usuários, nenhum password_hash vazio e nenhum role vazio. Isso é risco latente para novas contas/reset, não evidência de conta atual sem senha. Produção não tem colunas setup_token_* nem RPC consume_upstatus_setup_invite.

Os templates candidatos Normal #74 e Team Lite #76 implementam convite emitido por administrador, token de 64 caracteres com expiração de 15 minutos e consumo atômico por RPC. No laboratório, consume_upstatus_setup_invite é SECURITY INVOKER, usa search_path vazio e EXECUTE apenas para service_role. Porém, a inspeção dos dois templates não encontrou rate limit específico para emissão/consumo de convite ou setup. O candidato ainda não foi implantado em produção; AUTH-03 permanece bloqueado.

### Upload

Os runtimes implantados mantêm sniffMime(bytes, declared) com fallback para o MIME declarado quando a assinatura não é reconhecida. signedUploadRoute valida MIME/tamanho declarados e emite signed URL/publicUrl, mas não inspeciona os bytes que serão enviados antes de liberar a URL. É inspeção de código, não upload malicioso reproduzido.

## Migrations e ambiente isolado

Produção lista sete migrations remotas. Quatro arquivos correspondentes continuam ausentes de master; os quatro caminhos exatos retornaram 404:
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

Não reconstruí SQL por inferência do schema atual.

A conta Supabase lista somente dois projetos: produção e upstatus-security-test (bfpjtfqlnypisxljoxkb). O laboratório está ACTIVE_HEALTHY, tem 38 migrations e as tabelas da aplicação, Storage objects e realtime.messages consultadas estão vazias. É laboratório isolado de segurança/sinalização, não um ambiente full-product TEST independente. upstatus-test v281 é uma função dentro do projeto de produção, não um terceiro projeto. TEST-ISOLATION permanece em andamento.

## Issues e aceitação manual

Issue #78 permanece OPEN, com 0 critérios marcados e 8 desmarcados. Não foi realizado teste manual instalado no Tampermonkey nesta execução. Permanecem pendentes: queda real de internet, recuperação sem F5 em Normal e Team Lite, reentrada em sala, novas chamadas, microfone/tela reais, ausência de peers/pollers duplicados e interoperabilidade instalada.

Issue #79 continua sendo o Control Center. O comentário dedicado QA foi atualizado no mesmo ID, sem criar duplicata e sem alterar o comentário da Engenharia.

## Gates após esta execução

| Gate | Status | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 48 mensagens Realtime, todas private=false; zero policies e grants de cliente |
| TEST-ISOLATION | IN_PROGRESS | Laboratório isolado e vazio, mas sem projeto full-product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs remotos ausentes de master |
| AUTH-03 | BLOCKED | Runtime implantado sem convite; candidato com RPC ainda não implantado e sem rate limit específico encontrado |
| ACL-STORAGE | BLOCKED | RLS/policies, grants, Default ACL e Storage públicos |
| RECONNECT | PENDING | 8 critérios físicos desmarcados na Issue #78 |
| HUMAN-REVIEW | PENDING | PRs principais Draft, sem reviews formais e sem autorização explícita de release |

## Segurança e limites desta execução

Foram usados apenas leituras do GitHub e consultas SELECT/catalog/Management API no Supabase. Não houve produção writes, migrations, DDL, alteração de secrets/flags/roles/grants/policies/ACL, deploy, dispatch de workflow, merge, release, publicação de userscript, mutação de fixtures ou exploração externa. Não executei testes locais nem teste físico; os resultados automatizados são os workflows existentes do GitHub Actions.

A única escrita documental desta rodada é este novo relatório na branch QA, além da atualização do comentário QA já existente na Issue #79. Nenhuma branch de Engenharia ou documento existente foi sobrescrito.

## Próximos passos

1. Corrigir e tornar default o transporte server-mediated autenticado para voz/tela em Normal e Team Lite; remover o caminho público sensível antes do cutover.
2. Corrigir o Validate herdado da QA sem enfraquecer assertions.
3. Integrar e revisar a proteção do workflow Team Lite; nunca despachar o workflow oficial atual.
4. Recuperar os quatro SQLs originais ou aprovar uma reconciliação formal revisada.
5. Planejar correção de grants, Default ACL, policies e privacidade de Storage.
6. Completar autorização e rate limit de AUTH-03 e validar o fluxo por HTTP no ambiente isolado.
7. Criar ambiente full-product TEST independente.
8. Executar os oito critérios físicos da Issue #78 e obter review humana explícita antes de qualquer release.
