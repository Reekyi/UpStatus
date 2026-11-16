# Auditoria independente UpStatus — 2026-11-16 17:38 UTC

**Execução:** 2026-11-16T17:38:01.586Z  
**Escopo:** GitHub Reekyi/UpStatus; Supabase produção dlfvkawaiqduhlazsszm; laboratório upstatus-security-test bfpjtfqlnypisxljoxkb.  
**Método:** leitura de RELEASE_READINESS.md, heads e diffs Git, PRs/issues/reviews, workflows e logs CI já existentes, fontes Edge Functions implantadas, logs Edge, advisors e catálogo PostgreSQL. Todas as consultas SQL foram SELECT-only. Nenhum teste ou workflow foi iniciado pela QA.

> Esta auditoria não autoriza merge, deploy, release, publicação de userscripts, migrations, alteração de secrets/flags/permissões ou qualquer escrita em produção.

## 1. Documento-base e heads reais

Li docs/RELEASE_READINESS.md na branch QA. Blob SHA: 7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c; 8.422 linhas. O documento-base termina na revalidação de 2026-11-15 06:30 UTC. Esta rodada foi registrada em arquivo separado para preservar o histórico e evitar sobrescrita concorrente.

| Ref | HEAD atual observado | Estado |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | release metadata 3.4.7 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | Team Lite 3.4.30 |
| QA qa/release-readiness-2026-11-04-master | a9a9e1965d0442b1fe9476b32657ef95c66ff99d | HEAD atual da PR #82 |
| PR #74 | dcaf6a072546eda0089e0cee4018c3047011f600 | aberta / Draft |
| PR #75 | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | aberta / Draft |
| PR #76 | 00a578e9174e08238a1289a35feb02d171625421 | aberta / Draft |
| PR #82 | a9a9e1965d0442b1fe9476b32657ef95c66ff99d | aberta / Draft |

Comparação com as bases atuais:
- #74: 887 commits à frente e 1 atrás de master; 90 arquivos alterados.
- #75: 59 commits à frente e 0 atrás de team-lite-official; baseline histórica.
- #76: 389 commits à frente e 0 atrás de team-lite-official; candidata Team Lite descendente da linha #75.
- #82: 372 commits à frente e 1 atrás de master; 211 arquivos alterados, somente documentação, sem runtime, workflows ou migrations.

As quatro PRs seguem abertas/Draft e as consultas de reviews retornaram zero reviews para cada uma. A PR #82 não deve ser interpretada como branch pronta para merge: além da divergência de um commit, o Validate atual falha.

## 2. CI e testes nos HEADs exatos

| PR | Evidência | Classificação |
|---|---|---|
| #74 Normal | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e Signaling Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS no HEAD dcaf6a0 | **CI PASS.** Smoke: 19/19 verificações não autenticadas e 136/136 autenticadas; Chromium negociou WebRTC de chamada, áudio de sala de voz e vídeo de tela, entregou remote tracks, testou mesh de três membros, teardown, rate limit (90 aceitas + 1 HTTP 429 com Retry-After 60s), recibos atômicos e setup enrollment isolado. Cleanup das fixtures foi verificado. |
| #75 Team Lite baseline | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS | **PASS histórico.** Não valida o HEAD atual da #76. |
| #76 Team Lite | Candidate Checks [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAILURE no HEAD 00a578e | O job offline signed-upload-contracts passou: os contratos de cliente e servidor validaram rota, bucket, token, MIME, tamanho, origem HTTPS e caminho. No job candidate-checks, 11/11 contratos HTTP offline passaram, mas a primeira chamada real ao endpoint /health recebeu 402; 0/16 verificações não autenticadas passaram. Testes autenticados, Playwright, Full-IIFE, concorrência e cleanup foram ignorados após a falha. |
| #82 QA docs | Validate [43911923614](https://github.com/Reekyi/UpStatus/actions/runs/43911923614): FAILURE no HEAD a9a9e19 | Falha em scripts/validate.mjs:26: production updateURL mismatch. O log fez checkout do merge ref 00eeef2, que incorpora a9a9e196 à base master atual. |

**Limite da evidência:** os testes #74 são CI automatizado em Chromium e ambiente isolado, não teste físico no Sale Smartly/Tampermonkey. O teste de upload da #76 é contrato offline com mocks; não houve PUT real ao Storage. Nenhum teste foi executado diretamente pela QA nesta rodada.

## 3. HTTP 402 e disponibilidade das Edge Functions

Janela de logs consultada: 2026-11-16 11:31–17:32 UTC.

**Produção:** 51.771 respostas HTTP 402 em function_edge_logs, de 11:41:55 a 17:31:21 UTC.

| Rota | HTTP 402 |
|---|---:|
| /api/chat | 27.566 |
| /api/status | 12.075 |
| /api/remote-status | 12.045 |
| /api/account | 31 |
| /api/me | 24 |
| /api/members | 24 |
| /upstatus/upstatus.user.js | 6 |

Os registros de produção mostram método, URL e status, sem corpo/motivo da restrição. Não apareceu registro edge_logs que explique o motivo. Portanto, a causa específica dos 402 em produção **não está confirmada**. Não atribuir automaticamente o erro à quota do laboratório.

**Laboratório:** 48 respostas 402 em 14 rotas de upstatus-signal-test entre 12:37:25 e 12:41:42 UTC. O log do CI #76 expõe a mensagem exata: exceed_edge_functions_invocations_quota; o proprietário precisa atualizar o plano ou remover spend caps para restaurar o serviço. A organização Supabase consultada está no plano Free. Ambos os projetos reportam ACTIVE_HEALTHY, o que não significa que as invocações Edge estejam liberadas.

Ação operacional necessária: o proprietário deve verificar Usage/Billing e spend cap do laboratório e investigar separadamente a origem dos 402 em produção. Não alterar plano ou limites sem avaliar o custo.

## 4. Edge Functions e divergência de versão/endpoint

Inventário de produção: 38/38 Edge Functions listadas como ACTIVE. As funções relevantes estão com verify_jwt=false e dependem da autenticação própria do UpStatus:

| Slug | Versão da função | Versão interna observada |
|---|---:|---|
| upstatus | 480 | 3.4.7 |
| upstatus-screen-share-3-1-1-beta10 | 6 | 3.1.1-beta8 |
| upstatus-team-lite | 15 | 3.4.30 |

O slug beta10 contém código que declara VERSION 3.1.1-beta8 e embute userscript beta8: há divergência entre nome do endpoint e versão interna. A função upstatus-signal-test v32 existe no laboratório, mas não existe na lista de funções de produção.

### Cutover Normal incompleto

- master/scripts/build.mjs mantém o CLOUD_SERVER de produção apontando para upstatus-screen-share-3-1-1-beta10 e deriva o updateURL desse endpoint.
- release.json aponta scriptUrl para /functions/v1/upstatus/upstatus.user.js.
- master/scripts/validate.mjs exige updateURL em /upstatus/upstatus.user.js. A divergência explica a falha atual da #82.
- A candidata #74 separa corretamente o updateURL usando release.scriptUrl, mas seu build ainda deixa CLOUD_SERVER de API apontando para beta10. O workflow de produção da #74 publica somente a função upstatus. Assim, o novo backend compilado em upstatus não passa a ser o backend de API usado pelo cliente; as chamadas continuam indo para beta10. O corte de API e distribuição não está coordenado.
- A candidata Normal ainda declara release version 3.4.7, igual à versão estável atual. O build guard exige incremento deliberado antes de sincronizar o artefato distribuído.

### Team Lite

- O userscript oficial e a função implantada permanecem em 3.4.30; a candidata #76 está em 3.4.31.
- O workflow oficial team-lite-official/.github/workflows/deploy-production.yml executa supabase functions deploy upstatus, que é o slug Normal, não upstatus-team-lite. Também usa CLI latest e secret genérico SUPABASE_PROJECT_ID, sem verificação explícita de project ref e SHA. **Não despachar esse workflow.**
- O deploy-test candidato da #76 é mais seguro: manual-only, exige SUPABASE_TEST_PROJECT_ID, rejeita produção e o projeto de sinalização isolado e fixa Supabase CLI 2.122.1. Porém não há projeto Full-Product TEST disponível para satisfazer esse guard.

## 5. Compatibilidade Normal/Team Lite e Realtime

O catálogo de produção mostra 106 mensagens em realtime.messages, todas private=false:
- 72 user_status
- 26 db_change
- 4 remote_command
- 4 remote_result

A tabela tem RLS habilitado, FORCE RLS desabilitado, zero policies e privilégios SELECT/INSERT/UPDATE para anon e authenticated.

As funções de trigger foram lidas por pg_get_functiondef:
- upstatus_broadcast_messages serializa a linha completa com to_jsonb e envia op/record para db_change com private=false.
- upstatus_broadcast_remote_state publica metadados de remote_command e remote_result em tópicos públicos.
- upstatus_broadcast_users publica metadados de presença em user_status.
As três funções são SECURITY DEFINER, SET search_path TO public e têm EXECUTE efetivo para anon/authenticated; o Security Advisor registra 3 WARN para anon e 3 WARN para authenticated.

**Divergência de tópico:** os triggers atuais publicam no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. O build master e o Team Lite oficial 3.4.30 ainda assinam upstatus-screen-share-live-3-1-1-beta10. As candidatas Normal #74 e Team Lite #76 mudam o tópico para upstatus-live-..., alinhando o cliente candidato ao trigger, mas as candidatas ainda não foram publicadas.

O transporte server-mediated autenticado permanece opt-in, default false, nas candidatas. Sem configuração explícita no Tampermonkey, o caminho legado de Realtime público continua ativo. Mudar o tópico não torna o canal privado. RT-01 continua bloqueado.

## 6. RLS, grants, SECURITY DEFINER e Storage

Produção:
- Dez tabelas públicas têm RLS habilitado e nenhuma policy.
- Nove dessas tabelas concedem a anon e authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE. RLS sem policies bloqueia acesso por linha, mas não remove privilégios desnecessários e não protege TRUNCATE.
- Três funções SECURITY DEFINER têm search_path=public e EXECUTE para anon/authenticated. O Security Advisor reporta 6 WARN e 10 INFO.
- O catálogo contém 24 entradas de default ACL. Defaults de postgres em public/storage e de supabase_admin em public/GraphQL incluem privilégios amplos para papéis de cliente.
- Buckets chat-images e profile-images são públicos, limite de 20 MiB, zero policies próprias em storage.objects e 188 objetos (168 chat-images, 20 profile-images).

Laboratório:
- Dezoito tabelas públicas com RLS e sem policies; a consulta não encontrou grants diretos de tabela para anon/authenticated.
- As três funções SECURITY DEFINER usam search_path vazio e EXECUTE somente para service_role.
- realtime.messages tem zero linhas e zero policies, mas anon/authenticated ainda têm SELECT/INSERT. Não há buckets de Storage.
- Security Advisor: zero WARN e 18 INFO.

O hardening de grants/SECURITY DEFINER foi validado no laboratório, não em produção. Não usar o estado do laboratório como prova de que produção está corrigida.

## 7. AUTH-03 e migrations

- Produção tem 7 migrations e não possui as quatro colunas setup_token_* em public.users nem a RPC consume_upstatus_setup_invite.
- Laboratório tem 39 migrations, as quatro colunas setup_token_* e a RPC consume_upstatus_setup_invite com SECURITY INVOKER.
- As Edge Functions implantadas de Normal e Team Lite ainda expõem needsSetup e POST /api/setup no caminho legado de primeiro setup; o fallback de papel administrativo usa nomes fixos. O caminho /api/chat/clear do runtime implantado autoriza pelo nome literal Ricardo; deleteRoute também contém bypass nominal para Ricardo. AUTH-03 ainda não está implantado em produção.
- O documento-base registra quatro SQLs originais de migrations como indisponíveis nos refs pesquisados. Esta execução não recuperou nem sintetizou esses arquivos.
- A branch gerenciada Supabase main continua MIGRATIONS_FAILED, embora o projeto/preview reporte ACTIVE_HEALTHY.

## 8. Issues e aceitação manual

- Issue #78 permanece OPEN, com 0/8 critérios físicos marcados e 28 comentários. Os oito critérios incluem recuperação Normal e Team Lite sem F5, reentrada, novas chamadas, ausência de peers/polling órfãos e teste manual. Nenhum teste físico foi realizado nesta execução.
- Issue #79 permanece OPEN, com 150 comentários. O corpo ainda contém snapshots antigos de heads e checks das PRs; use os refs/CI atuais e o comentário dedicado QA como fonte atual. Contagens históricas como 16/35 não são percentual de prontidão.
- As quatro PRs não têm reviews humanas. HUMAN-REVIEW permanece pendente.

## 9. Gates reavaliados

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | blocked | 106 mensagens públicas, zero policies, tópico legado e transporte autenticado opt-in |
| TEST-ISOLATION | blocked | apenas produção e laboratório de sinalização; nenhum Full-Product TEST |
| MIGRATION-PROVENANCE | blocked | 7 migrations de produção, 39 no laboratório e quatro SQLs originais ainda indisponíveis segundo o documento-base |
| AUTH-03 | blocked | colunas/RPC ausentes em produção; runtimes implantados mantêm setup legado |
| ACL-STORAGE | blocked | grants/default ACLs amplos, SECURITY DEFINER expostas e Storage público sem policies próprias |
| RECONNECT | pending | Issue #78 permanece 0/8; não houve teste físico sem F5 |
| HUMAN-REVIEW | pending | zero reviews humanas e nenhuma autorização explícita de release |

**Recomendação de release: NOT READY.**

## 10. Próximos passos prioritários

1. O proprietário Supabase deve revisar Usage/Billing e spend cap do laboratório e descobrir separadamente a causa dos 402 em produção.
2. Restaurar a quota do laboratório e repetir o CI completo da #76 no HEAD exato.
3. Corrigir o cutover Normal: alinhar API, distribuição, updateURL e tópico Realtime; não publicar somente uma função se o cliente continuar usando outro endpoint.
4. Corrigir o workflow Team Lite para upstatus-team-lite, CLI pinada, project ref e SHA exatos, preflight e rollback.
5. Revisar e planejar AUTH-03, grants/default ACLs, Realtime privado/autorizado e Storage antes de qualquer mudança de produção.
6. Recuperar os quatro SQLs originais de fonte confiável; não reconstruir migrations por inferência.
7. Provisionar Full-Product TEST separado do laboratório de sinalização.
8. Executar os oito testes físicos da #78 e obter reviews humanas antes de considerar release.

## 11. Segurança da execução

Consultas SQL somente SELECT/catálogo/Management API read-only. Nenhum teste foi iniciado pela QA; apenas logs de CI existentes foram inspecionados. Não houve alteração em produção, migration, DDL, grants, policies, ACL, secrets, flags, deploy, merge, release, userscript ou fixture. A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.
