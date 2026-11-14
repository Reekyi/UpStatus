# UpStatus — auditoria independente de QA

**Data da revalidação:** 2026-11-11, 06:35–06:45 UTC  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório isolado:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master

## 1. Método e limites

- GitHub: leitura de refs, PRs, reviews, workflows, logs, patches e arquivos.
- Supabase: Management API e consultas SQL exclusivamente SELECT.
- Não foram iniciados nem repetidos workflows.
- Não foram executados testes locais, testes HTTP, navegador, Tampermonkey, microfone, captura de tela ou queda física de rede nesta rodada.
- Resultados de CI citados abaixo são execuções existentes, não testes executados pela auditoria.
- Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag, grant, policy, ACL, fixture ou dado de produção foi realizada.
- A única escrita é este novo relatório na branch QA e a atualização do comentário QA já existente na Issue #79.

## 2. Documento principal e heads reais

O arquivo docs/RELEASE_READINESS.md foi lido integralmente na branch QA. O blob consultado foi 7cfbd70886df42ce790c078c224b19284a632595; o conteúdo possui 8.410 linhas. O último checkpoint interno do documento é 2026-11-08, 18:30 UTC. O documento principal foi preservado, sem edição.

| Ref | HEAD observado |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA / PR #82 | e1b222cb9a5605eec70aefcf3fe6e236c02b3d22 |
| PR #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d |
| PR #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| PR #76 Team Lite | 3b1406ddb56aecfa5b5515791ca99aea92c305ab |
| PR #141 chat staging | 61d00fb8666f4ca91c5a3c52a415d877b31a10cf |
| PR #142 Normal beta10 parity | 6fa53bd8246862e6fd5613787e5fa9bea4cdaefa |
| PR #143 Normal dispatcher | 8bf9b35cee05b303f51a8cbac691b391d22c41fe |

A comparação master...QA retornou 213 commits à frente e 1 atrás, com status diverged. A PR #82 aponta para o mesmo HEAD e1b222. A branch QA não foi rebased; o commit exclusivo de master não foi incorporado automaticamente.

## 3. PRs, reviews e CI

| PR | Resultado consultado | Evidência |
|---|---|---|
| #74 Normal | Validate e Smoke SUCCESS | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) |
| #75 Team Lite baseline | SUCCESS histórico, escopo limitado | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite | Candidate Checks SUCCESS; todos os steps observados concluídos | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) |
| #82 QA | FAILURE em Validate build | [Validate 42966933871](https://github.com/Reekyi/UpStatus/actions/runs/42966933871) |
| #143 Normal dispatcher | offline_guard SUCCESS; deploy SKIPPED | [Run 42963429737](https://github.com/Reekyi/UpStatus/actions/runs/42963429737) |

### #74, #75 e #76

- #74: Validate executou o guard do build TEST e o build validator; ambos passaram. O workflow de Smoke também está concluído com sucesso no HEAD consultado.
- #75: o PASS disponível é histórico e pertence à baseline; não substitui a linha ativa #76.
- #76: o workflow incluiu guard de isolamento, adapter de sinalização autenticada, contrato de primeiro acesso, recuperação de tentativa de voz, recuperação de screen-share, helper HTTP, autenticação do endpoint, Playwright Full-IIFE, integração autenticada, concorrência de rate limit, recibos de leitura, consumo de convite e isolamento de migrations. O job concluiu SUCCESS. Isso é CI em ambiente isolado, não aceitação física.

### #82

O job validate do run 42966933871 falhou na etapa Validate build. O log confirma:

VALIDATION FAILED: production updateURL mismatch

A falha está em scripts/validate.mjs, linha 26. O build reportou Normal 3.4.7 e TEST 3.4.7 antes da asserção. O PR altera documentação; o validator herdado continua rejeitando a divergência entre updateURL de produção e manifesto. O validator não foi relaxado.

### Reviews humanas

As consultas de reviews para #74, #75, #76, #82 e #143 retornaram listas vazias. As PRs permanecem abertas e Draft; não há aprovação humana registrada nos candidatos consultados.

## 4. PR #143 — dispatcher Normal

A PR #143 permanece Draft, empilhada sobre #142. O workflow é manual-only para produção via workflow_dispatch na master; push e pull_request executam somente validação offline.

Controles presentes no HEAD consultado:
- SHA completo e PR já integrada em master.
- Aprovação humana allowlisted no HEAD da PR.
- Checks obrigatórios offline_guard e validate no SHA exato do release.
- Rejeição de checks ausentes, pendentes, falhos, de SHA diferente ou skipped não permitido.
- Atestados de gates e aceitação física vinculados a SHA e timestamp UTC, com validade máxima de sete dias.
- Versão estável superior à versão Normal atual; rollback exige SHA allowlisted e versão anterior.
- Verificação do projeto e organização Supabase, estado da branch main e sete migrations esperadas.
- Supabase CLI fixada em 2.122.1.
- Publicação da API beta10 antes da distribuição upstatus.

O run 42963429737 confirmou offline_guard SUCCESS e deploy SKIPPED porque o evento era push. O Validate completo foi executado dentro do guard.

Limitações ainda abertas:
1. Os atestados são variáveis de repositório vinculadas a SHA/tempo, não assinaturas criptográficas.
2. A configuração efetiva de revisores obrigatórios do GitHub Environment production não foi acessível/verificada.
3. Não há smoke pós-deploy nem compensação automática caso beta10 seja publicado e a segunda função falhe.
4. O preflight confere versões e nomes do ledger, não bytes dos SQLs históricos.
5. A função de sinalização autenticada ainda não está integrada à produção.
6. release.json no HEAD da PR continua em 3.4.7. O dispatcher exige versão estável superior à versão atual; o manifesto atual não representa um novo release se a versão implantada continuar 3.4.7.
7. O preflight exige branch Supabase main em ACTIVE_HEALTHY, mas o status observado é MIGRATIONS_FAILED.

A PR não foi aprovada nem despachada pela auditoria.

## 5. Team Lite — workflow oficial

O arquivo .github/workflows/deploy-production.yml na branch team-lite-official possui blob e95bab7602fd3fcf80ab88ff44ccc9c259593c75. O workflow:
- usa Supabase CLI latest;
- executa supabase functions deploy upstatus;
- não aponta para upstatus-team-lite.

O mesmo arquivo foi encontrado na branch candidata de #76, portanto a candidata não corrige o workflow oficial. O destino esperado para Team Lite é upstatus-team-lite. Não despachar o workflow atual.

## 6. Supabase — produção

Projeto dlfvkawaiqduhlazsszm reporta ACTIVE_HEALTHY e Postgres 17.11.0.002. A branch gerenciada main reporta MIGRATIONS_FAILED; seu updated_at é 2026-10-02 e a integração não expôs a causa. O estado será suficiente para o preflight #143 recusar publicação, mas não prova por si só qual migration causou a falha.

### Migrations

O ledger de produção lista sete versões aplicadas:
- 20261005160000 upstatus_cloud
- 20261005173000 remote_realtime
- 20261005180000 client_presence
- 20261023154754 create_upstatus_visual_config
- 20261026195855 add_chat_message_file_name
- 20261027154329 allow_chat_document_mime_types
- 20261027155438 set_upstatus_upload_limits_20mb

Os quatro arquivos SQL das últimas versões retornam 404 no caminho supabase/migrations da master. Portanto, a distinção correta é: as sete versões constam no ledger, mas quatro fontes SQL não estão presentes em master. Isso bloqueia proveniência/reprodução e impede afirmar que os arquivos históricos foram recuperados. Nenhuma migration foi aplicada pela auditoria.

### Realtime

A consulta de realtime.messages retornou 67 eventos no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, todos private=false:
- 35 user_status
- 20 db_change
- 6 remote_command
- 6 remote_result

realtime.messages possui RLS=true, FORCE RLS=false, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated.

As três funções de produção:
- upstatus_broadcast_messages
- upstatus_broadcast_remote_state
- upstatus_broadcast_users

continuam SECURITY DEFINER, search_path=public, retorno trigger e EXECUTE efetivo para anon/authenticated segundo catálogo e Advisor. A função de mensagens transmite to_jsonb(OLD/NEW) completo. A função de remote state transmite campos de comando/resultado; a de users transmite nome/status/reason/update. Todas usam realtime.send com private=false no tópico legado.

O Security Advisor atual retorna três WARN para anon, três WARN para authenticated e dez INFO de RLS sem policies. As funções retornam trigger e são funções de trigger; a auditoria não afirma que demonstrou exploração RPC direta. Os grants EXECUTE continuam desnecessários e os broadcasts públicos são o risco concreto.

A última inspeção exata dos bundles implantados, registrada no documento principal em 08/11, apontou que Normal e Team Lite assinam o tópico beta10 upstatus-screen-share-live-3-1-1-beta10, diferente do tópico dos triggers. Os runtimes continuam nas versões Normal v480 e Team Lite v15; esta rodada não realizou uma assinatura real no navegador.

### RLS, grants e Default ACL

Dez tabelas públicas estão com RLS e zero policies:
chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, upstatus_visual_config e users.

Nove delas concedem a anon e authenticated sete privilégios diretos: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Isso totaliza 126 combinações de grants. RLS não protege TRUNCATE.

O catálogo retorna 120 entradas Default ACL para anon/authenticated/PUBLIC, distribuídas entre public, storage, graphql e graphql_public; há privilégios padrão amplos, incluindo MAINTAIN. Nenhuma ACL foi alterada.

### Storage

- chat-images: público, limite 20 MiB.
- profile-images: público, limite 20 MiB.
- storage.objects: zero policies.

### Edge Functions e AUTH-03

Produção lista 38 funções ACTIVE:
- upstatus v480;
- upstatus-team-lite v15;
- upstatus-screen-share-3-1-1-beta10 v6;
- upstatus-test v281.
Não existe upstatus-signal em produção. Todas reportam verify_jwt=false no metadata; isso isoladamente não prova ausência de autenticação, pois os handlers podem validar token próprio.

A consulta de schema não encontrou tabelas/colunas de convite, rate limit ou setup_token. O runtime Normal mantém POST /api/setup delegando para login(req,true). O helper admin(name) verifica implementation_admin, mas /api/chat/clear ainda compara o nome literal Ricardo.

A tabela messages possui 279 linhas: 6 audio, 5 document, 16 image, 22 system, 227 text e 3 video. As cinco mensagens documentais têm file_name NULL. O runtime Normal consultado não referencia file_name. Signed upload existe; não foi executado upload real.

## 7. Laboratório isolado

Projeto bfpjtfqlnypisxljoxkb reporta ACTIVE_HEALTHY, sem branches de desenvolvimento. A lista de migrations possui 39 entradas. Há duas Edge Functions:
- upstatus-signal-test v32;
- upstatus-signal-e2e-once v3.

As 18 tabelas de aplicação/fixtures consultadas retornaram zero linhas. realtime.messages não possui eventos e Storage não possui buckets. Não há grants diretos para anon/authenticated nas tabelas públicas, mas existem 96 entradas Default ACL em public, storage, graphql e graphql_public. As 18 tabelas públicas com RLS estão sem policies; o Advisor retorna 18 INFO e zero WARN SECURITY DEFINER.

No laboratório, as três funções de broadcast usam search_path vazio e payload mínimo {op: TG_OP}; ainda enviam com private=false. Essa melhoria está no laboratório, não em produção.

A função upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409. Não contém VOICE_ATTEMPT_ALREADY_ACTIVE, que cai no fallback HTTP 500. Isso é inspeção estática; nenhuma requisição HTTP real foi executada.

## 8. Issues e aceitação

- Issue #78 permanece aberta com 0/8 critérios físicos aprovados. Não houve queda real de internet, retorno sem F5, reentrada, nova chamada, permissão física de microfone/tela ou interoperabilidade instalada nesta rodada.
- Issue #79 permanece aberta; o corpo tem 16 itens marcados e 19 pendentes.
- O comentário QA existente foi atualizado; o comentário da Engenharia não foi alterado.

## 9. Gates desta execução

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 67 eventos private=false, payload completo em produção, tópico divergente |
| TEST-ISOLATION | in_progress | 18 tabelas zeradas, sem Realtime e sem Storage; ainda não é full-product acceptance |
| MIGRATION-PROVENANCE | blocked | ledger tem sete versões, quatro SQLs ausentes de master, branch main MIGRATIONS_FAILED |
| AUTH-03 | blocked | schema/runtime de produção sem convites/rate limit/setup_token e sem signaling server-mediated |
| ACL-STORAGE | blocked | grants amplos, 120 Default ACL, dois buckets públicos e zero policies |
| RECONNECT | pending | Issue #78 0/8, sem confirmação física de Ricardo |
| HUMAN-REVIEW | pending | reviews vazias nos PRs consultados; sem autorização explícita de release |

## 10. Veredito

**NOT READY.** Prioridades:
1. Corrigir o Realtime de produção: payload mínimo, canal privado/autorizado, tópico consistente e membership verificada.
2. Recuperar e validar os quatro SQLs históricos; diagnosticar MIGRATIONS_FAILED sem aplicar mudanças durante a auditoria.
3. Preparar revogações de grants e Default ACL, incluindo TRUNCATE/MAINTAIN, e definir Storage privado com policies deliberadas.
4. Integrar AUTH-03 e signaling server-mediated em Normal e Team Lite.
5. Corrigir persistência file_name e autorização administrativa do chat.
6. Corrigir o mapeamento HTTP de voz e testar endpoint real no laboratório.
7. Corrigir o workflow Team Lite e completar smoke/compensação do dispatcher Normal.
8. Executar os oito critérios físicos da Issue #78 e obter aprovação humana.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Nenhum workflow foi iniciado ou repetido. Nenhum teste manual/local/HTTP foi executado.
