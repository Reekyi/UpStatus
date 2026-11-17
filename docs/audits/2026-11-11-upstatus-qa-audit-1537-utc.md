# UpStatus - auditoria independente de qualidade
**Data:** 2026-11-11 15:37 UTC  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**HEAD QA antes deste relatório:** 79cafb28facc831e94a7e07e1ab9a4432937590f

## Resumo executivo

**Recomendação: NOT READY.** A produção não foi modificada. A auditoria usou inspeções GitHub e consultas SQL SELECT-only. Não houve rerun de workflow, teste HTTP manual, navegador manual, publicação, merge, deploy ou migration.

Novas confirmações:
1. Produção contém **88 broadcasts persistidos com private=false**, todos no tópico legado. O trigger de mensagens transmite a linha OLD/NEW completa.
2. A linha API Normal #142 não contém o fluxo de convite com token existente nos candidatos #74/#131 e #76. O runtime de produção também permanece no primeiro acesso sem token.
3. A organização Supabase lista somente produção e laboratório de fixtures. **Não existe projeto full-product TEST** nesta organização.
4. O preflight #143 compara somente versão/nome no ledger remoto. Não verifica arquivos SQL locais/hashes e não exige a migration de rate limit da #131.
5. O workflow oficial Team Lite ainda pode publicar o slug Normal upstatus com CLI latest. O guard #129 passou, mas permanece Draft e não foi incorporado.

## 1. Heads e integridade documental

| Referência | SHA |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA / PR #82 | 79cafb28facc831e94a7e07e1ab9a4432937590f |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d |
| #75 Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| #76 Team Lite | 4edfbf25476c7c751741b2e14c2c88fdc554f618 |
| #131 AUTH-03 | 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b |
| #141 updater/chat | 61d00fb8666f4ca91c5a3c52a415d877b31a10cf |
| #142 API Normal | f4b1a6dbccecf63152bf353fcaaadfcd41357e11 |
| #143 dispatcher | 34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa |

QA está 222 commits à frente e 1 atrás de master. Não fiz rebase. #74 está 883 à frente e 1 atrás de master. #75 está 59 à frente de team-lite-official; #76 está 380 à frente e 321 à frente de #75, sem commits atrás. #131 está 1 commit à frente de #74. #142 está 11 commits à frente de #141. A base registrada de #143 é 6fa53bd, um commit atrás do HEAD #142 f4b1a6d.

O blob de docs/RELEASE_READINESS.md é 7cfbd70886df42ce790c078c224b19284a632595: 8.410 linhas e 1.045.105 caracteres. Último checkpoint interno: 08/11/2026 18:30 UTC. O documento principal foi preservado; este relatório é um arquivo novo.

A lista de rulesets retornou vazia. A consulta à branch protection retornou HTTP 403 Resource not accessible by integration. Portanto, o estado efetivo de proteção das branches não pôde ser confirmado.

## 2. CI, por HEAD exato

| PR / run | Resultado | Limite |
|---|---|---|
| #74 Validate 42753434411 | SUCCESS | CI |
| #74 Smoke 42753434336 | SUCCESS | teste de rate limit de emissão foi SKIPPED |
| #75 41674353127 | SUCCESS | histórico de 03/11, baseline antiga |
| #76 Candidate Checks 42993916169 | SUCCESS | 110/110 autenticados, 16/16 não autenticados, 11/11 contratos HTTP isolados |
| #82 Validate 43041581525 | FAILURE | production updateURL mismatch em scripts/validate.mjs:26 |
| #131 Smoke 42760281798 | SUCCESS | 136/136 autenticados; rate limit concorrente executado |
| #135 Validate 42805693777 | FAILURE | updateURL mismatch herdado |
| #141 Validate 42936993580 | SUCCESS | candidato, não implantado |
| #142 Validate 42977043722 | SUCCESS por push | sem run pull_request no HEAD atual |
| #143 Guard 42984657754 | SUCCESS | deploy SKIPPED |
| #143 API Candidate Validate 42984668622 | SUCCESS | check de PR |
| #128 review provenance 42994078899 | SUCCESS | guard offline, não aprovação real |
| #129 legacy deploy guard 42993962545 | SUCCESS | guard offline, nenhum deploy |

Links:
- [#74 Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42753434336)
- [#75 histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127)
- [#76 Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/42993916169)
- [#82 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43041581525)
- [#131 Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42760281798)
- [#135 Validate](https://github.com/Reekyi/UpStatus/actions/runs/42805693777)
- [#141 Validate](https://github.com/Reekyi/UpStatus/actions/runs/42936993580)
- [#142 push Validate](https://github.com/Reekyi/UpStatus/actions/runs/42977043722)
- [#143 Guard](https://github.com/Reekyi/UpStatus/actions/runs/42984657754)
- [#143 Validate](https://github.com/Reekyi/UpStatus/actions/runs/42984668622)
- [#128 guard](https://github.com/Reekyi/UpStatus/actions/runs/42994078899)
- [#129 guard](https://github.com/Reekyi/UpStatus/actions/runs/42993962545)

#74 passou no smoke, mas pulou a emissão de convite com rate limit. #131 executou essa cobertura: 24 chamadas concorrentes, cinco permitidas e 19 bloqueadas. #76 validou voz/WebRTC, tela, leave/rejoin, rate limits e contratos HTTP no laboratório. Isso é CI automatizado, não teste físico. Não encontrei reviews humanas nas PRs prioritárias #74, #75, #76, #82, #131, #135, #141, #142 e #143.

### Gatilhos e stack

- O workflow normal-beta10-api-candidate.yml limita pull_request.branches à própria branch candidata, mas a base da #142 é fix/master-staged-chat-attachments-20261111. Por isso o HEAD f4b1 teve run de push, não check pull_request.
- #143 está empilhada sobre a linha API e recebeu o Validate da workflow da base #142. O offline_guard próprio passou em push; deploy foi SKIPPED.
- #76 Candidate Checks foi executado como pull_request, não como push em team-lite-official. Não é evidência de release no SHA oficial.
- #143 exige versão estável maior que 3.4.7; release.json atual continua 3.4.7.

## 3. AUTH-03 e compatibilidade Normal / Team Lite

#74 contém emissão de convite administrativa e consumo único por consume_upstatus_setup_invite. #131 adiciona consume_upstatus_setup_invite_rate_limit, limite de cinco emissões por administrador em 15 minutos, HTTP 429 ao exceder e HTTP 503 se o limitador falhar. #76 Team Lite já possui o mesmo fluxo. As migrations #131 e #76 têm o mesmo blob SHA ab73b5cd8200147a449327d21798eef588834d50.

A migration candidata usa SECURITY INVOKER, search_path vazio e EXECUTE exclusivo de service_role.

**Divergência bloqueadora:** o template API Normal #142 não contém issueSetupInvite, consume_upstatus_setup_invite, setup_token_* ou consume_upstatus_setup_invite_rate_limit. Portanto, #131 precisa ser reconciliada com #141/#142; não basta integrar a migration. É necessário preservar file_name, upload assinado, autorização administrativa por papel e o fluxo AUTH-03 no runtime que será realmente publicado.

### Runtime implantado

| Runtime | Edge | Userscript |
|---|---:|---:|
| Normal upstatus | v480 | 3.4.7 |
| Team Lite upstatus-team-lite | v15 | 3.4.30 |
| beta10 legado | v6 | 3.1.1-beta8 |

O endpoint chamado beta10 v6 serve um bundle beta8. Os bundles atuais Normal/Team Lite assinam upstatus-screen-share-live-3-1-1-beta10, não configuram private:true e não chamam realtime.setAuth().

Produção ainda usa POST /api/setup -> login(req,true), sem token de convite. GET /api/account?name= expõe needsSetup sem autenticação. O setup não tem rate limit. Hoje há cinco contas e todas têm password_hash e role preenchidos; o risco é condicional a uma conta futura/pré-provisionada sem senha. As colunas setup_token_* e as tabelas/RPCs de convite não existem em produção.

O template #141/#142 tem suporte candidato a file_name e autorização administrativa para limpeza do chat, mas #142 não contém AUTH-03.

## 4. Realtime e PostgreSQL

Consulta read-only em produção encontrou **88 registros private=false**:

| Evento | Registros |
|---|---:|
| user_status | 41 |
| db_change | 35 |
| remote_command | 6 |
| remote_result | 6 |

Todos usam o tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Os clientes assinam upstatus-screen-share-live-3-1-1-beta10.

O trigger de messages envia to_jsonb(OLD/NEW) completo. O trigger remoto envia metadados de comando/resultado. O trigger de usuários envia nome/status/reason/sync.

As três funções são SECURITY DEFINER, search_path=public, retornam trigger, estão anexadas aos triggers e têm EXECUTE para anon/authenticated. O Advisor retornou três WARN para anon e três para authenticated. Não foi demonstrada invocação RPC direta dessas funções trigger.

realtime.messages: RLS true, FORCE RLS false, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated. O acesso externo efetivo não foi reproduzido; o setting público do Dashboard não é exposto pela integração.

No laboratório, as funções usam search_path vazio, payload mínimo {op: TG_OP} e EXECUTE revogado para clientes, mas ainda enviam private=false no tópico legado. realtime.messages permanece com grants SELECT/INSERT/UPDATE e zero policies, embora esteja vazio.

## 5. RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas públicas com RLS e zero policies.
- Nove tabelas concedem a anon e authenticated sete privilégios cada: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER. Total: 126 grant rows.
- Default ACL: 120 privilege entries para anon/authenticated, incluindo privilégios de tabelas, sequences e funções; MAINTAIN aparece nos defaults.
- chat-images e profile-images são públicos, 20 MiB cada.
- Zero policies próprias em storage.objects.

RLS não protege TRUNCATE.

Laboratório:
- 18 tabelas públicas com RLS e zero policies.
- Zero grants diretos de tabela para clientes nas tabelas públicas auditadas.
- Default ACL: 96 privilege entries; defaults de postgres/supabase_admin ainda concedem privilégios amplos para objetos futuros.
- Zero buckets Storage.

## 6. Edge Functions e mensagens

Produção lista 38 Edge Functions ACTIVE, todas com verify_jwt=false. Isso não prova ausência de autenticação: os handlers principais inspecionados usam token customizado, hash de sessão e expiração. Não foi feita revisão individual de todas as 38 funções.

O laboratório possui upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não há upstatus-signal equivalente em produção. A função v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE; esse caso cai no 500 padrão. Não houve requisição HTTP real.

Produção possui 292 mensagens; cinco são documentos e todas as cinco estão sem file_name. O runtime implantado não persiste esse campo. #141/#142 têm correção candidata, ainda não implantada.

O runtime de produção restringe /api/chat/clear literalmente ao nome Ricardo. #141 contém autorização por papel administrativo, ainda candidata.

A rota de imagem legada permite 25 MiB, enquanto chat-images limita 20 MiB; uploads entre esses limites podem passar pela validação da rota e falhar no Storage. A rota signed-upload candidata limita 20 MiB.

## 7. Migrations e preflight

Produção tem sete versões no ledger. O projeto está ACTIVE_HEALTHY, mas a branch Supabase main permanece MIGRATIONS_FAILED; o preview está ACTIVE_HEALTHY. A causa específica não foi retornada.

A PR #135 recuperou os quatro statements do ledger e os comparou por versão/nome. Os arquivos são documentação em docs/migration-recovery/, não os originais byte-a-byte. O manifest os classifica como executed_statement_recovered_not_original_file; comentários, formatação e blob Git original não foram recuperados.

**Lacuna #143:** assertRequiredNormalProductionMigrations compara apenas versão/nome no ledger remoto. Não exige arquivos SQL locais nem seus hashes. Também não inclui 20261109230000_setup_invite_rate_limit. Se #131 for integrada sem atualizar a allowlist, o preflight não exigirá a migration chamada pelo runtime.

O preflight exige main.status ACTIVE_HEALTHY; o estado atual MIGRATIONS_FAILED bloqueia o despacho.

## 8. Ambiente de testes e Team Lite

A organização lista somente dois projetos:
1. UpStatus produção dlfvkawaiqduhlazsszm.
2. upstatus-security-test bfpjtfqlnypisxljoxkb.

O laboratório está ACTIVE_HEALTHY, tem 39 migrations e duas Edge Functions. Consultas agregadas confirmaram zero usuários, sessões, mensagens, salas, membros, tentativas, rate-limit rows, mensagens Realtime e buckets. É um ambiente isolado de fixtures/contratos, não full-product TEST.

O workflow deploy-test.yml exige SUPABASE_TEST_PROJECT_ID e rejeita produção e o laboratório de fixtures. Não há terceiro projeto na organização para esse destino. Não despachei o workflow e não inspecionei valores de secrets/variables.

O workflow oficial em team-lite-official usa CLI latest, secrets de produção e executa supabase functions deploy upstatus, embora o alvo correto seja upstatus-team-lite. **Não despachar.** #129 propõe desativar o caminho e passou no guard, mas continua Draft. #128 também está Draft.

## 9. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos aprovados. Não houve teste de queda real de internet, recuperação sem F5 ou interoperabilidade instalada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): corpo com 16/35 itens marcados. Comentário QA dedicado atualizado; comentário da Engenharia preservado.

## 10. Gates desta execução

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | 88 broadcasts públicos, tópico divergente, payload completo |
| TEST-ISOLATION | in_progress | laboratório isolado e vazio; não existe full-product TEST |
| MIGRATION-PROVENANCE | in_progress | statements recuperados, não arquivos originais; preflight não valida fontes locais |
| AUTH-03 | in_progress | #131/#76 passam no laboratório; produção e stack #142 ainda sem fluxo |
| ACL-STORAGE | blocked | grants/Default ACL amplos e buckets públicos sem policies próprias |
| RECONNECT | pending | exige teste físico sem F5 |
| HUMAN-REVIEW | pending | sem reviews humanas e sem autorização explícita de release |

## 11. Limites

- Consultas SQL: SELECT-only.
- GitHub: leitura de branches, PRs, workflows, logs, commits, arquivos e comentários; somente um arquivo documental novo na branch QA e atualização do comentário QA existente.
- Nenhum teste HTTP manual, browser manual ou rerun de CI.
- Nenhuma fixture foi alterada.
- Nenhuma migration, grant, policy, ACL, secret, flag, variável, environment reviewer ou configuração Supabase foi alterada.
- Nenhum merge, deploy, release ou publicação de userscript.
- Rulesets vazio; branch protection não confirmada porque o endpoint retornou 403.

## Veredito

**NOT READY.** Prioridades:
1. Tornar Realtime privado/autorizado, alinhar tópicos e minimizar payloads.
2. Reconciliar #74/#131 com #141/#142, preservando AUTH-03 e file_name.
3. Atualizar #143 para exigir proveniência local dos SQLs e a migration de rate limit quando integrada.
4. Recuperar proveniência original e diagnosticar MIGRATIONS_FAILED.
5. Provisionar full-product TEST separado do laboratório de fixtures.
6. Endurecer grants, Default ACL e Storage.
7. Substituir o workflow Team Lite legado por guard/review aprovados.
8. Resolver Validate da QA, executar testes físicos sem F5 e obter aprovação humana.

Nenhuma ação de Ricardo é necessária nesta rodada. Os testes físicos devem aguardar uma candidata integrada e segura.


## Adendo de validação - 2026-11-11T15:40:37.825Z

### Limitação adicional de AUTH-03

A rotina `login(req, setup)` implantada em Normal/Team Lite e também nos templates candidatos #74/#76 não chama um limitador de tentativas de login. A #131 limita **emissão de convites**, não tentativas de autenticação. Portanto, mesmo após integrar o rate limit de convites, o requisito de rate limit de login permanece pendente. A enumeração `GET /api/account?name=` também permanece no runtime implantado e no stack #142, enquanto #74/#76 substituem essa resposta por `needsSetup:false`.

A produção atualmente tem cinco contas, todas com hash e role preenchidos; isso reduz o risco imediato de takeover por setup aberto, mas não remove a falha de desenho para novas contas sem senha.

### Escopo do TEST e função de teste na produção

A listagem de Edge Functions confirma também `upstatus-test` v281 dentro do **mesmo projeto de produção**. Ela não constitui isolamento de banco. A organização lista apenas produção e `upstatus-security-test`; o segundo é o laboratório de fixtures, que o workflow full-product TEST rejeita explicitamente. Assim, não existe projeto full-product TEST separado disponível.

### Publicação parcial e atestados

O workflow #143 publica beta10 e depois upstatus em sequência. Não há smoke pós-deploy nem compensação automática/rollback transacional se a segunda publicação falhar; pode ocorrer estado parcial entre os dois runtimes. O rollback existente é uma operação separada e allowlisted, não uma compensação automática.

Os atestados de release/aceitação física são SHA + timestamps passados por variáveis de ambiente e limitados a sete dias. Eles não são assinaturas criptográficas; a configuração efetiva de revisores obrigatórios do environment production não pôde ser verificada nesta conexão.

### Versionamento

`release.json` em master continua em 3.4.7, igual ao Normal atualmente servido. O dispatcher exige versão estável superior à atual. Team Lite oficial continua em 3.4.30; #76 candidata 3.4.31 ainda não foi integrada à branch oficial.
