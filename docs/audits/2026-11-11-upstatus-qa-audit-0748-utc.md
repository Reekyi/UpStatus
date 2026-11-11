# UpStatus — auditoria independente de QA

**Revalidação:** 2026-11-11T07:48:35.189Z  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório isolado:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master

## 1. Método e limites

- GitHub: leitura de branches, PRs, reviews, commits, checks, workflows, arquivos e diffs.
- Supabase: Management API, Edge Function source e consultas SQL exclusivamente SELECT/catálogo.
- Os resultados de CI abaixo são workflows existentes consultados nesta auditoria; não foram iniciados nem repetidos.
- Não foram executados testes locais, HTTP, navegador, Tampermonkey, microfone, captura de tela ou queda física de rede.
- Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag, grant, policy, ACL, bucket ou dado de produção foi realizada.
- A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.

## 2. Heads reais e documento principal

| Ref | HEAD observado |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA / PR #82, antes deste relatório | 9699b1fd076c644a2fa50615ee309b4f9bd36d65 |
| PR #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d |
| PR #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| PR #76 Team Lite | 3b1406ddb56aecfa5b5515791ca99aea92c305ab |
| PR #143 Normal dispatcher | bd1c1925edd3a1b7704d31a1b3cf4f86b7d703e4 |

A comparação master...QA retornou 214 commits à frente e 1 atrás; status diverged. Master está em 9d40461. A branch QA não foi rebased. O endpoint de branches reportou protected=false para master; regras organizacionais/rulesets não foram verificadas.

O blob de docs/RELEASE_READINESS.md continua 7cfbd70886df42ce790c078c224b19284a632595. O compare reporta 8.409 linhas adicionadas. Nesta execução, fetch_file retornou conteúdo vazio na leitura integral, por faixas de linha e em base64; o fetch do arquivo raw também foi recusado por tamanho. Portanto, não afirmo uma nova leitura integral nesta rodada. Para continuidade, consultei a auditoria anterior de 06:35 UTC, que registrou leitura integral do mesmo blob e checkpoint interno do documento em 08/11 às 18:30 UTC: [auditoria anterior](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/audits/2026-11-11-upstatus-qa-audit-0635-utc.md). O documento principal não foi alterado.

## 3. PRs, reviews e CI

| PR | Estado e evidência consultada |
|---|---|
| #74 Normal | Open/Draft; Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS |
| #75 Team Lite baseline | Open/Draft; PASS histórico limitado em [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), não substitui a linha ativa #76 |
| #76 Team Lite | Open/Draft; Candidate Checks [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) SUCCESS |
| #82 QA | Open/Draft; Validate [42974347820](https://github.com/Reekyi/UpStatus/actions/runs/42974347820) FAILURE no step Validate build |
| #143 dispatcher | Open/Draft; push run [42977464223](https://github.com/Reekyi/UpStatus/actions/runs/42977464223) com offline_guard SUCCESS e deploy SKIPPED; PR run [42977476810](https://github.com/Reekyi/UpStatus/actions/runs/42977476810) com Validate SUCCESS |

As consultas de reviews para #74, #75, #76, #82 e #143 retornaram listas vazias. Não há aprovação humana registrada nesses PRs.

#76 está 319 commits à frente e zero atrás de #75; é uma continuação da baseline, não um payload independente. O workflow de publicação Team Lite em #76 é idêntico ao da branch oficial.

A #82 continua falhando no Validate build. O erro detalhado em uma execução anterior do mesmo validator foi production updateURL mismatch; nesta consulta do run atual confirmei a falha do step, mas não recuperei seu log textual completo. Não relaxei o validator.

## 4. PR #143 — dispatcher Normal

HEAD bd1c1925, base fix/normal-beta10-api-parity-20261111, Open/Draft.

Controles inspecionados:
- workflow_dispatch manual na master, com confirmação explícita da ação de produção;
- aprovação humana allowlisted no HEAD exato;
- PR já integrada em master e SHA de merge exato;
- checks obrigatórios offline_guard e validate no SHA de release;
- rejeição de checks pendentes, falhos, ausentes, de SHA diferente ou skipped não permitido;
- atestados de gates e aceitação física vinculados ao SHA e timestamp UTC, com janela de sete dias;
- verificação do projeto/organização Supabase, branch main e sete migrations esperadas;
- Supabase CLI fixada em 2.122.1;
- publicação beta10 antes de upstatus.

O run 42977464223 foi evento push: offline_guard SUCCESS e deploy SKIPPED. O run 42977476810 foi evento pull_request da workflow Normal Beta10 API Candidate Validate, com job validate SUCCESS. Esse Validate executa scripts/validate.mjs, que chama test-normal-production-dispatcher.mjs. Portanto, há validação de PR do contrato via esse workflow; não confundir esse check com a execução do job offline_guard do dispatcher.

### Nova lacuna nos filtros do dispatcher

O workflow deploy-production.yml filtra push e pull_request somente para:
- .github/workflows/deploy-production.yml
- scripts/normal-production-dispatcher.mjs
- scripts/test-normal-production-dispatcher.mjs

Não inclui release.json, templates do userscript ou fontes do runtime em src/server. Entretanto, o helper exige offline_guard e validate no SHA exato. Uma futura alteração apenas no runtime/manifesto pode disparar Validate genérico, mas não o offline_guard nomeado exigido pelo preflight; a publicação será recusada por check obrigatório ausente. O filtro precisa cobrir os artefatos de release ou o guard deve ser disparado sem esse filtro restritivo.

### Versionamento e rollout

release.json na branch #143 e em master continua em 3.4.7; a versão do userscript Normal servido em produção também é 3.4.7. O helper exige versão estável superior à versão atual, então este manifesto não representa uma nova versão publicável.

O deploy executa beta10 e depois upstatus. Não há smoke pós-deploy nem compensação automática caso o primeiro runtime seja atualizado e o segundo falhe. A configuração efetiva de revisores obrigatórios do environment production não foi verificada. Os atestados SHA/tempo são variáveis do repositório, não assinaturas criptográficas.

O preflight verifica nomes/versões no ledger, não bytes dos SQLs históricos. A branch Supabase main está MIGRATIONS_FAILED, embora o projeto principal esteja ACTIVE_HEALTHY; o preflight exige ACTIVE_HEALTHY e, portanto, recusaria o estado atual.

## 5. Team Lite — workflow oficial

O arquivo .github/workflows/deploy-production.yml na branch team-lite-official e na branch da #76 possui o mesmo blob e95bab7602fd3fcf80ab88ff44ccc9c259593c75. Ele:
- usa Supabase CLI latest;
- executa supabase functions deploy upstatus;
- não publica upstatus-team-lite.

A produção está em upstatus-team-lite v15 e o userscript servido contém versão 3.4.30. A candidata #76 contém versão 3.4.31, mas não corrige o workflow oficial. Não despachar o workflow atual.

## 6. Supabase — projetos e migrations

A listagem de projetos retornou somente dois projetos:
- produção dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002;
- laboratório bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe projeto TEST independente e full-product. O upstatus-test v281 está implantado dentro do projeto de produção, não em um terceiro projeto isolado.

Ledger de produção: sete versões aplicadas:
- 20261005160000 upstatus_cloud
- 20261005173000 remote_realtime
- 20261005180000 client_presence
- 20261023154754 create_upstatus_visual_config
- 20261026195855 add_chat_message_file_name
- 20261027154329 allow_chat_document_mime_types
- 20261027155438 set_upstatus_upload_limits_20mb

A pasta supabase/migrations em master contém somente os três primeiros arquivos. Os quatro SQLs históricos de 23–27/10 não estão versionados em master. A PR #74 contém 22 migrations candidatas mais novas, mas não recupera esses quatro arquivos históricos. A branch gerenciada main reporta MIGRATIONS_FAILED, com metadata antiga de 02/10; isso não prova que o projeto esteja indisponível, pois o projeto principal está ACTIVE_HEALTHY. Nenhuma migration foi aplicada.

## 7. Realtime — divergência confirmada em código implantado e banco

A consulta de realtime.messages retornou 67 linhas, todas private=false, no tópico:
upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0

Distribuição: 35 user_status, 20 db_change, 6 remote_command e 6 remote_result.

Os três triggers de produção:
- upstatus_broadcast_messages
- upstatus_broadcast_remote_state
- upstatus_broadcast_users

continuam SECURITY DEFINER, search_path=public e EXECUTE efetivo para anon/authenticated. Todos chamam realtime.send com private=false. O trigger de mensagens envia o registro completo com to_jsonb(OLD/NEW); remote state envia campos de comando/resultado; users envia nome/status/reason. realtime.messages tem RLS habilitado, zero policies e SELECT/INSERT/UPDATE concedidos a anon e authenticated.

Decodifiquei os userscripts atualmente servidos pelas Edge Functions de produção:
- Normal v480 serve userscript 3.4.7.
- Team Lite v15 serve userscript 3.4.30.

Ambos definem UP_REALTIME_TOPIC como upstatus-screen-share-live-3-1-1-beta10 e criam realtimeClient.channel(UP_REALTIME_TOPIC). Não encontrei setAuth ou private:true nos bundles. O tópico não corresponde ao usado pelos triggers de banco. Isso confirma a divergência entre os clientes implantados e os broadcasts de produção.

No laboratório, os três triggers usam search_path vazio e payload mínimo {op: TG_OP}, sem EXECUTE direto para anon/authenticated; porém continuam chamando realtime.send com private=false e o mesmo tópico legado. O laboratório não tem eventos Realtime persistidos.

## 8. RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas públicas com RLS e sem policies, incluindo upstatus_visual_config;
- 9 tabelas concedem a anon e authenticated sete privilégios diretos: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE; 126 combinações no total;
- Default ACL: 120 privilégios expandidos, distribuídos entre schemas public, storage, graphql e graphql_public e owners postgres/supabase_admin; incluem EXECUTE, privilégios de sequência e grants amplos de tabela, inclusive MAINTAIN/TRUNCATE;
- chat-images e profile-images são públicos, limite 20 MiB;
- zero policies próprias em storage.objects.

Security Advisor: três WARN para anon, três WARN para authenticated e dez INFO de RLS sem policy.

Laboratório:
- zero grants diretos para anon/authenticated nas tabelas públicas de aplicação;
- 96 privilégios em Default ACL nos schemas public/storage/graphql/graphql_public;
- 18 tabelas públicas com RLS e sem policies, gerando 18 INFO;
- zero WARN de SECURITY DEFINER;
- zero buckets Storage e zero policies Storage.

RLS sem policy bloqueia operações normais por linha, mas não protege TRUNCATE. Os avisos de SECURITY DEFINER foram confirmados por catálogo e Advisor; as funções retornam trigger e estão anexadas a triggers. Não foi demonstrada exploração RPC direta.

## 9. Edge Functions, AUTH-03, chat e voz

Produção lista 38 Edge Functions ativas:
- upstatus v480;
- upstatus-team-lite v15;
- upstatus-screen-share-3-1-1-beta10 v6;
- upstatus-test v281.

Não existe upstatus-signal em produção. As funções reportam verify_jwt=false no metadata; isso isoladamente não prova ausência de autenticação, pois os handlers usam validação customizada de sessão.

### AUTH-03 e onboarding

A tabela users de produção não possui setup_token_hash, setup_token_expires_at ou colunas relacionadas. Não há tabela/RPC de convite ou rate limit de setup no schema de produção. Os bundles ainda chamam POST /api/setup para contas que precisam de configuração. Normal exige senha mínima de seis caracteres; Team Lite aceita quatro, uma divergência de contrato.

### Chat

A tabela messages possui 279 linhas, cinco do tipo document e as cinco com file_name NULL. Os bundles implantados não contêm file_name. O botão cliente de limpeza e a rota backend continuam verificando o nome literal Ricardo, apesar de existir helper de papel implementation_admin no servidor. Signed upload existe, mas não foi executado upload real.

### Voz

O laboratório possui upstatus-signal-test v32 e upstatus-signal-e2e-once v3. A função de teste mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE; esse código cai no fallback HTTP 500. Foi inspeção estática, sem requisição HTTP real.

## 10. Issues e aceitação

- Issue #78 permanece OPEN, 0/8 critérios físicos marcados. Não houve queda real de internet, retorno sem F5, reentrada em sala, nova chamada ou teste físico de microfone/tela nesta execução.
- Issue #79 permanece OPEN, com 16 itens marcados e 19 pendentes no corpo.
- Comentário QA existente atualizado; comentário da Engenharia preservado; sem duplicatas.
- Reviews humanas dos PRs prioritários permanecem vazias.

## 11. Gates reavaliados

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 67 eventos private=false, tópico divergente, payload completo em produção |
| TEST-ISOLATION | blocked | só há produção e laboratório; laboratório sem Storage e sem aceitação full-product |
| MIGRATION-PROVENANCE | blocked | sete versões no ledger, quatro SQLs históricos ausentes de master, branch main MIGRATIONS_FAILED |
| AUTH-03 | blocked | produção sem setup_token, convite/rate limit e signaling server-mediated |
| ACL-STORAGE | blocked | grants amplos, 120 Default ACL, dois buckets públicos e zero policies |
| RECONNECT | pending | Issue #78 0/8, sem confirmação física |
| HUMAN-REVIEW | pending | PRs sem reviews humanas e sem autorização explícita de release |

## 12. Veredito

**NOT READY.**

Prioridades:
1. Corrigir Realtime: tópico único, privado/autorizado, membership validada e payload mínimo.
2. Recuperar os quatro SQLs históricos e esclarecer MIGRATIONS_FAILED antes do preflight.
3. Revisar grants diretos e Default ACL, incluindo TRUNCATE/MAINTAIN, com plano para postgres e supabase_admin.
4. Projetar Storage privado com policies deliberadas e ambiente de teste que tenha buckets.
5. Integrar AUTH-03 e signaling server-mediated em Normal e Team Lite.
6. Corrigir persistência file_name e autorização administrativa do chat.
7. Corrigir o mapeamento HTTP de voz e testar o endpoint real no laboratório.
8. Corrigir filtros do dispatcher Normal para que os checks obrigatórios existam em releases de runtime-only; definir versão nova e smoke/compensação pós-deploy.
9. Corrigir workflow Team Lite.
10. Executar os testes físicos da Issue #78 e obter aprovação humana explícita.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve deploy, merge, migration, release, publicação de userscript, alteração de secret/flag ou operação destrutiva.
