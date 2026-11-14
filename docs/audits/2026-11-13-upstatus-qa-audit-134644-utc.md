# Auditoria independente de qualidade — UpStatus

**Data da inspeção:** 2026-11-13T13:46:44.332Z  
**Repositório:** Reekyi/UpStatus  
**Projeto Supabase de produção:** dlfvkawaiqduhlazsszm  
**Laboratório:** bfpjtfqlnypisxljoxkb  
**Recomendação:** NOT READY

## 1. Escopo, método e limites

Foram inspecionados os heads reais, metadados e diffs de PRs, runs e logs de CI, workflows de publicação, issues #78/#79, bundles efetivamente servidos pelas Edge Functions e catálogos Supabase. As consultas SQL foram exclusivamente SELECT/catalog.

O arquivo docs/RELEASE_READINESS.md foi recuperado integralmente pelo blob 7cfbd70886df42ce790c078c224b19284a632595 (aproximadamente 1,045 MB; 8410 linhas no conteúdo retornado). O último checkpoint técnico registrado nele permanece em 2026-11-08 18:30 UTC. O arquivo original não foi alterado.

Não foi executado teste manual em navegador/Tampermonkey nesta rodada. Os resultados de CI abaixo são runs já existentes, inspecionados pelos logs. Não foi realizada requisição HTTP de teste contra produção nem contra a função implantada de voz. A configuração do Dashboard que permite/bloqueia acesso público aos canais Realtime não estava disponível para inspeção.

Nenhuma migration, deploy, release, merge, publicação de userscript, alteração de secrets/flags, grant, policy, ACL ou operação destrutiva foi executada.

## 2. Heads e integridade documental

| Referência | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA qa/release-readiness-2026-11-04-master | b94c315b0900ba9a55b323271d53ce03c5ae3513 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

A comparação master...QA indica 279 commits à frente e 1 atrás. Os 137 arquivos divergentes são exclusivamente documentação; não há arquivo fora de docs/. A PR #82 usa esse mesmo HEAD.

O base SHA registrado na #74 e #82 é a9288ccfcb0f308d3a587bfca624418a395be07b, um commit atrás do master atual. A única diferença entre esse base e master é o checkpoint documental docs/checkpoints/2026-11-08-production-migration-history-preflight.md.

## 3. PRs solicitadas e evidência de CI

### PR #74 — Normal

- HEAD dcaf6a072546eda0089e0cee4018c3047011f600; base master a9288ccfcb0f308d3a587bfca624418a395be07b.
- 887 commits e 90 arquivos; aberta, Draft, sem review humana.
- Validate #43376770142: SUCCESS.
- Smoke #43376770200: SUCCESS, 19/19 verificações não autenticadas e 136/136 autenticadas.
- O Smoke ainda marca SKIPPED a verificação de sintaxe do harness de rate limit de setup-invite e o teste distribuído de emissão de convites. Portanto, o resultado da #74 não cobre esse último contrato.

### PR #75 — baseline Team Lite

- HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309; base team-lite-official 9065bc1536fde64f437f6f12b7abb9b072cb8281.
- 59 commits e 10 arquivos; aberta, Draft, sem review.
- Candidate Checks #41674353127: SUCCESS histórico, mas o job atual inspecionado só verifica scripts da candidata e metadados de versão. A #76 é a linha de Team Lite mais completa.

### PR #76 — Team Lite

- HEAD 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94; base team-lite-official 9065bc1536fde64f437f6f12b7abb9b072cb8281.
- 386 commits e 57 arquivos; aberta, Draft, sem review.
- Candidate Checks #43363871881: SUCCESS.
- Logs confirmam 16/16 verificações não autenticadas, 110/110 autenticadas e 11/11 verificações isoladas de contrato HTTP.
- Passaram Playwright/Chromium, negociação WebRTC, áudio remoto, vídeo remoto, singleton de tentativa de voz entre aliases Normal/Team Lite, rate limit distribuído, consumo atômico de convite e recuperação de voz/tela.
- Versão candidata 3.4.31; Team Lite instalado continua 3.4.30.

### PR #82 — QA independente

- HEAD b94c315b0900ba9a55b323271d53ce03c5ae3513; base master a9288ccfcb0f308d3a587bfca624418a395be07b.
- 279 commits e 137 arquivos, todos documentais; aberta, Draft, sem review.
- Validate #43426825454: FAILURE, production updateURL mismatch.
- A falha é herdada do contrato antigo do validator em scripts/validate.mjs. Nenhuma assertion foi removida ou enfraquecida.

## 4. Candidatas Normal recentes

### PR #161

- HEAD ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e; base chore/continuity-foundation em dcaf6a072546eda0089e0cee4018c3047011f600.
- 11 commits e 10 arquivos; aberta, Draft, sem review.
- Smoke #43430030814: SUCCESS, 19/19 não autenticadas e 136/136 autenticadas.
- Diferentemente da #74, os logs desta candidata confirmam o teste distribuído de emissão de setup-invite, além de consumo atômico, isolamento por administrador e cleanup.
- A build passa a usar upstatus como função Normal para distribuição e API, alinhando o destino do cliente ao workflow.
- PROD_TOPIC passa a upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, que corresponde ao tópico dos triggers PostgreSQL.
- O build TEST exige UPSTATUS_TEST_PROJECT_ID e rejeita explicitamente produção e o laboratório de signaling/auth. Sem configuração, gera sentinel inerte e não deployável.
- O servidor candidato exige setupToken hexadecimal de 64 caracteres, consome convite por RPC, aplica rate limit distribuído de cinco emissões por administrador a cada 15 minutos e remove o fallback de role administrativa por nome.
- A limpeza total do chat exige proprietário Ricardo e role implementation_admin.
- Política de senha candidata é consistente entre os dois servidores: primeiro acesso mínimo 6, login mínimo 4.

### PR #162

- HEAD 8dc23905180494feded76f10e9fbdd59ac85feb5; base fix/normal-api-target-aligned-rate-limit-20261113.
- 6 commits e 7 arquivos; aberta, Draft, sem review.
- Validate #43430131864: SUCCESS em pull_request. O log confirma que o merge ref 31ea1738 incorporou o HEAD atualizado ae6a5f3 da #161.
- O helper voice-status.mjs mapeia VOICE_ATTEMPT_ALREADY_ACTIVE para 409; o teste cobre 400/404/410/409/500.
- Limite: o teste cria objetos Response localmente. Não faz request HTTP real à Edge Function implantada.
- O workflow separado Voice Open HTTP Status Contract filtra pull_request para a própria branch de feature, em vez da branch-base da PR. Ele não aparece nos runs da PR #162; o Validate principal inclui o mesmo teste, então o contrato offline foi executado mesmo assim.

A #161 é a melhor linha Normal atual. A #162 complementa a linha com um contrato de status HTTP, mas não comprova a função implantada. A #158 continua sendo uma alternativa de separação updater/API com falha anterior na regressão de anexos staged; não recomendo integrá-la isoladamente.

## 5. Controles candidatos de publicação Team Lite

Foram inspecionadas as PRs relacionadas:

- #125: dispatcher manual na branch master-based. O workflow focado Team Lite Production Dispatcher #42598656306 passou; o Validate geral #42598656421 falhou no updateURL herdado.
- #128: revisão de proveniência do dispatcher, run #42994078899 SUCCESS.
- #129: bloqueio do workflow legado, run #42993962545 SUCCESS.

O dispatcher candidato #125/#128 publica especificamente upstatus-team-lite, usa CLI 2.122.1, exige dispatch manual no master, SHA exato do team-lite-official, PR mergeado que produziu o SHA, review APPROVED no head exato por humano diferente do autor e allowlist UPSTATUS_RELEASE_REVIEWERS, checks do SHA, preflight read-only de projeto/migrations e confirmação explícita de deploy. A variável UPSTATUS_RELEASE_REVIEWERS ainda precisa ser configurada pelo owner; o candidato falha fechado sem ela.

A #129 transforma o workflow legado em bloqueio explícito. Nenhuma dessas PRs foi mergeada. O workflow atualmente presente em team-lite-official ainda usa CLI latest e executa supabase functions deploy upstatus, o destino Normal incorreto. Portanto, o risco permanece no branch oficial.

O workflow de produção no master também continua antigo: dispatch manual, versão 3.4.7 hardcoded, CLI latest e deploy de upstatus, sem o conjunto completo de verificações SHA/review/projeto/migrations do dispatcher candidato Normal.

## 6. Artefatos efetivamente instalados

Os bundles foram extraídos da base64 embutida nos fontes das Edge Functions, não inferidos apenas dos manifests do GitHub.

| Produto | Função/runtime | Versão | Namespace | API | Tópico | Armazenamento GM |
|---|---|---|---|---|---|---|
| Normal | upstatus v480 | 3.4.7 | upseller | upstatus-screen-share-3-1-1-beta10 | upstatus-screen-share-live-3-1-1-beta10 | upstatus_screen_share_beta8_ |
| Team Lite | upstatus-team-lite v15 | 3.4.30 | upseller-team-lite | upstatus-team-lite | upstatus-screen-share-live-3-1-1-beta10 | upstatus_team_lite_ |
| TEST | upstatus-test v281 | 3.3.28 | upseller | upstatus-screen-share-3-1-1-beta10 | upstatus-screen-share-live-3-1-1-beta10 | upstatus_screen_share_beta8_ |

Normal e TEST compartilham namespace e prefixo GM; TEST também aponta sua API para o backend beta10 de produção. O updateURL do TEST é próprio, mas isso não isola seu backend. Team Lite possui namespace e armazenamento próprios.

Os clientes instalados não contêm private:true nem realtime.setAuth(). O transporte autenticado opcional continua desligado por padrão nos candidatos, pois signalTransportFlag lê GM_getValue(..., false).

## 7. Realtime e triggers PostgreSQL

Consulta read-only dos últimos 14 dias encontrou 128 mensagens, todas private=false:

| Evento | Registros |
|---|---:|
| user_status | 70 |
| db_change | 46 |
| remote_command | 6 |
| remote_result | 6 |

Os triggers publicam em upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Os três bundles instalados assinam somente upstatus-screen-share-live-3-1-1-beta10; não há ocorrência do tópico dos triggers nos clientes instalados. Isso confirma uma divergência de tópico no runtime atual. Os candidatos #161 e #76 alinham o tópico para upstatus-live, mas continuam usando broadcast público sem autenticação privada.

realtime.messages possui oito partições diretas, RLS habilitado, FORCE ROW LEVEL SECURITY desabilitado, zero policies e privilégios SELECT/INSERT/UPDATE para anon e authenticated.

As três funções public.upstatus_broadcast_messages, public.upstatus_broadcast_remote_state e public.upstatus_broadcast_users são SECURITY DEFINER, usam search_path=public e permitem EXECUTE para anon/authenticated. O trigger de mensagens transmite to_jsonb(OLD/NEW) completo com private=false; o trigger de estado transmite campos de comando/resultado; o trigger de usuários transmite nome/status/reason/sync.

Não foi possível verificar a configuração de acesso público no Dashboard nem testar leitura externa. A exposição de broadcast público e a falta de autenticação no cliente estão comprovadas por código e catálogo; a exploração externa não foi reproduzida.

## 8. RLS, grants, Default ACL e Storage

### Produção

- 10 tabelas public com RLS habilitado e sem policies: chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, upstatus_visual_config e users.
- 9 tabelas public com grants para anon/authenticated; 126 linhas de privilégios em information_schema.table_privileges.
- Os grants incluem DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. São 18 grants TRUNCATE (nove tabelas × dois papéis).
- 120 entradas Default ACL para anon/authenticated nos schemas consultados; 48 no schema public.
- Três funções SECURITY DEFINER de broadcast com search_path=public e EXECUTE amplo.
- Buckets chat-images e profile-images são públicos, com 168 e 20 objetos, total 188.
- Zero policies próprias em storage.objects.
- Security Advisor: seis WARN e dez INFO.

RLS sem policy nega acesso direto por esses papéis nas tabelas protegidas, mas não torna os grants adequados. TRUNCATE não é protegido por RLS. Não foi demonstrada execução externa de TRUNCATE.

### Laboratório

- 18 tabelas public com RLS e sem policies.
- Zero privilégios diretos de tabela public para anon/authenticated nas consultas feitas.
- 96 entradas Default ACL para papéis clientes.
- Zero mensagens Realtime e zero objetos Storage.
- As três funções de broadcast continuam SECURITY DEFINER, mas usam search_path vazio e não permitem EXECUTE a anon/authenticated.
- Security Advisor: 18 INFO e nenhum WARN.

O laboratório está mais endurecido que produção, mas não é um ambiente full-product.

## 9. Edge Functions, projetos e autenticação

A organização possui apenas dois projetos ACTIVE_HEALTHY:

- Produção dlfvkawaiqduhlazsszm, PostgreSQL 17.11.0.002, região us-west-2.
- Laboratório upstatus-security-test bfpjtfqlnypisxljoxkb, PostgreSQL 17.11.0.003, região sa-east-1.

Produção possui 38 Edge Functions ACTIVE; 12 slugs têm prefixo upstatus-test. As funções relevantes são upstatus v480, upstatus-team-lite v15, upstatus-test v281 e upstatus-screen-share-3-1-1-beta10 v6. O catálogo lista verify_jwt=false nas funções consultadas; isso não prova ausência de autenticação de aplicação, pois os handlers usam sessão própria. Porém, o fluxo de primeiro acesso é público e não possui convite.

O laboratório possui upstatus-signal-test v32 e upstatus-signal-e2e-once v3. A segunda função é apenas um sentinel que retorna HTTP 404. Não existe função upstatus-signal em produção.

### Primeiro acesso e identidade

Os handlers implantados Normal e Team Lite ainda aceitam POST /api/setup sem setupToken. Para conta sem password_hash, o primeiro chamador que conhece o nome pode definir a senha. A role vazia é preenchida por fallback de nome para Ricardo, Lohan e Guilherme. O endpoint /api/chat/clear instalado verifica somente name === Ricardo, sem exigir admin(name).

A política instalada também diverge: Normal exige senha mínima de seis caracteres; Team Lite exige quatro. Os templates candidatos #161 e #76 alinham setup=6/login=4, exigem token de 64 hexadecimais e consumo por RPC, removem o fallback administrativo por nome e exigem owner + role para limpar o chat.

A fotografia atual tem cinco usuários, cinco nomes distintos, zero senhas vazias e zero roles vazias. Isso não elimina o risco estrutural para novas contas.

users.name não possui constraint UNIQUE. upstatus_sessions e upstatus_profiles continuam identificados por user_name, sem user_id. A correção de identidade imutável permanece pendente.

## 10. AUTH-03 e migrations

Produção possui sete migrations no ledger. O laboratório possui 39.

O schema de produção não contém setup_token_hash, setup_token_expires_at, setup_token_issued_at, setup_token_issued_by, tabela de rate limit de convites ou RPCs correspondentes. O laboratório possui as quatro colunas de token e tabelas de rate limit de setup-invite e signaling.

Os quatro arquivos abaixo constam do ledger de produção, mas retornam 404 no diretório supabase/migrations do master e também na base #74:

- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

A branch gerenciada Supabase main permanece MIGRATIONS_FAILED; o preview está ACTIVE_HEALTHY.

A PR #140 propõe guard de paridade, mas seu workflow é push-only, não possui trigger pull_request e não há run registrado no HEAD atual. A proveniência dos quatro SQLs continua não resolvida.

## 11. Issues e aceitação física

- Issue #78: 0/8 critérios físicos aprovados. Permanecem pendentes reconexão Normal/Team Lite sem F5, nova chamada após queda, microfone/permissões reais, captura real de tela e interoperabilidade instalada.
- Issue #79: 16/35 itens marcados; 19 permanecem sem marcação. Os itens de Realtime privado, migração, ACL/Storage, reconexão física e aprovação humana continuam abertos.

CI Chromium/WebRTC não substitui a aceitação física no Tampermonkey.

## 12. Gates QA

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcasts públicos, tópico instalado divergente e transporte privado não habilitado |
| TEST-ISOLATION | blocked | TEST instalado usa produção; não existe terceiro projeto full-product |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs ausentes; branch main MIGRATIONS_FAILED |
| AUTH-03 | blocked | Setup sem token e rate limit ausentes em produção |
| ACL-STORAGE | blocked | Grants, Default ACL, SECURITY DEFINER e Storage sem policies próprias |
| RECONNECT | pending | Nenhum teste físico sem F5 confirmado por Ricardo |
| HUMAN-REVIEW | pending | PRs principais Draft, sem review humana e sem autorização de release |

## 13. Próximas ações recomendadas

1. Consolidar #161/#162 sobre a linha #74, preservando convite único e rate limit; revisar o contrato HTTP 409 com request real à função.
2. Incrementar a versão Normal antes de qualquer release; a versão instalada e release.json continuam 3.4.7.
3. Criar ambiente full-product TEST independente; só então substituir o runtime v281 que aponta para produção.
4. Implantar e validar sinalização autenticada em produção antes de habilitar a flag; manter broadcasts públicos apenas durante uma transição controlada e documentada.
5. Integrar os controles #125/#128/#129 na branch correta, configurar allowlist humana e impedir que Team Lite publique em upstatus.
6. Vincular sessões/perfis a users.id, remover fallback de role por nome e exigir role para operações administrativas.
7. Recuperar os quatro SQLs originais, validar proveniência e resolver MIGRATIONS_FAILED.
8. Revisar RLS, grants, Default ACL, SECURITY DEFINER e Storage com plano de rollout/rollback.
9. Executar os oito critérios físicos da Issue #78 e obter aprovação humana vinculada ao SHA final.

**Conclusão:** NOT READY. A #161 é a melhor candidata Normal, a #76 é a candidata Team Lite mais completa e a #162 melhora o contrato de voz. Ainda assim, os runtimes instalados, a infraestrutura de produção e os workflows oficiais não representam a arquitetura candidata. Nenhuma publicação deve ocorrer nesta condição.

**Ação que depende do owner:** autorizar ou negar o terceiro projeto Supabase full-product TEST. O custo/billing não foi verificado nesta auditoria.


## Atualização após o commit documental

- O relatório foi criado no commit f4933528bba6d1becb7ef4aadf61839fddc23baf; o HEAD da QA e da PR #82 passou a esse SHA.
- O GitHub disparou Validate #43436652756 no novo HEAD. O job terminou FAILURE com o mesmo erro: production updateURL mismatch.
- O commit que disparou esse run acrescentou somente este relatório Markdown; não alterou código de produto nem o validator. A falha permanece reproduzível na branch QA atual.
- O relatório original docs/RELEASE_READINESS.md permaneceu intacto.
