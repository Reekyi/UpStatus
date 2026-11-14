# Auditoria independente UpStatus QA — 2026-11-11 00:42 UTC

## Escopo e método

Revalidação read-only do repositório Reekyi/UpStatus e dos projetos Supabase de produção dlfvkawaiqduhlazsszm e laboratório bfpjtfqlnypisxljoxkb. Foram consultados heads/PRs/issues, diffs, arquivos, workflows e logs existentes; o documento docs/RELEASE_READINESS.md foi recuperado da branch QA exata. SQL executado somente em formato SELECT/catalog. Nenhum workflow foi disparado ou repetido pela auditoria. Nenhum teste local, HTTP real ou teste manual de navegador foi executado.

Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA já existente na Issue #79.

## Heads reais

| Ref | HEAD | Estado / observação |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | Base atual |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | Base oficial Team Lite |
| QA / PR #82 | 7051f735510ee6adde9b0cd8c30b5ca8f6118c56 | Open, Draft, 205 commits à frente e 1 atrás de master |
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d | Open, Draft, mergeable; 883 commits, 90 arquivos |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Open, Draft; 59 commits, 10 arquivos |
| #76 Team Lite | 3b1406ddb56aecfa5b5515791ca99aea92c305ab | Open, Draft; 378 commits, 56 arquivos; 319 commits à frente de #75 e 0 atrás |
| #89 AUTH-03 Normal | 5c46eea3e4c9f909d3e0992bacfbd2263c2d8024 | Open, Draft |
| #101 signaling runtime | 2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7 | Open, Draft; sem check PR no HEAD consultado |
| #133 Normal runtime único | 8d38036ead5e1c3c9cc00db9791f8c9de093ba62 | Open, Draft; 14 commits à frente de #74 |
| #134 Team Lite | ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5 | Open, Draft; 10 commits à frente de #76 |
| #140 migration parity | 8493ece4f722936a6f084341ef0195dc6766190d | Open, Draft; 7 commits à frente de #133, 0 atrás; 2 arquivos |

Reviews humanas consultadas em #74, #75, #76, #82 e #140: nenhuma submissão retornada. Todas as PRs citadas permanecem sem aprovação humana.

## CI: evidência por HEAD

| PR / linha | Workflow | Resultado | Classificação |
|---|---|---|---|
| #74 Normal | [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336), [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) | Ambos SUCCESS | CI existente; não é teste físico |
| #75 baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | SUCCESS | PASS histórico e limitado; não substitui #76 |
| #76 Team Lite | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | SUCCESS | CI existente; #76 é descendente de #75 |
| #82 QA | [Validate 42924964434](https://github.com/Reekyi/UpStatus/actions/runs/42924964434) | FAILURE | Log exato: build 3.4.7 / TEST 3.4.7; production updateURL mismatch em scripts/validate.mjs:26 |
| #133 Normal | [API Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827), [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | Ambos SUCCESS | 136/136 checks autenticados no Smoke |
| #134 Team Lite | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298), [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) | Ambos SUCCESS | 110/110 autenticados, 16/16 não autenticados e 11/11 contratos HTTP offline |
| #140 migration parity | [Validate 42928939793](https://github.com/Reekyi/UpStatus/actions/runs/42928939793) | SUCCESS | Push-only; sem check PR-triggered e sem execução SQL |

Os resultados #133/#134 cobrem testes automatizados de signaling/WebRTC, áudio, voz, screen-share, mesh, concorrência e teardown conforme os workflows. Não equivalem à aceitação do userscript instalado no Tampermonkey, permissões reais de microfone/tela ou perda real de internet.

### PR #140: mudança verificada

A PR #140 compara o bloco compartilhado DDL/RPC/grants da migration de rate limit de convites entre produção candidata e teste isolado. O commit 8493ece endurece a allowlist exata do bloco DO de assertions de catálogo e acrescenta regressões sintéticas que rejeitam DROP TABLE e EXECUTE dinâmico. O diff contém somente .github/workflows/migration-parity-candidate.yml e scripts/migration-layout.test.mjs.

O YAML declara somente push para a branch candidata. Portanto, o PASS 42928939793 não é um check PR-triggered. O guard é estático e não aplica migration nem comprova o estado real do banco. A PR segue Draft, sem review.

### QA #82: causa do Validate

O log de 42924964434 confirma que o job executa o build 3.4.7 / TEST 3.4.7 e falha em production updateURL mismatch, scripts/validate.mjs:26. A fonte master de scripts/build.mjs ainda gera updateURL para o runtime beta10, enquanto release.json aponta para /functions/v1/upstatus/upstatus.user.js e o validator exige esse destino. A PR #82 é documental; a falha é herdada do build/validator da base master, não do conteúdo Markdown.

## Publicação e compatibilidade Normal / Team Lite

### Normal: contratos de publicação incompatíveis

- #89 mantém dois runtimes: distribuição em upstatus e API em upstatus-screen-share-3-1-1-beta10. O workflow é workflow_dispatch, faz checkout do SHA exato, valida master/projeto, executa preflight read-only das migrations, fixa Supabase CLI 2.122.1 e publica beta10 antes de upstatus. release.json continua em 3.4.7 e o guard exige versão estável superior a 3.4.7.
- #133 implementa runtime único: build define PROD_FUNCTION=upstatus e não cria PROD_API_FUNCTION beta10; o workflow publica somente upstatus e aceita somente release.json.version exatamente 3.4.7.
- O artefato UpStatus.user.js da #133 continua com @version 3.4.7, igual à versão Normal atualmente implantada. A candidata não tem incremento de versão que permita ao gerenciador de userscripts distinguir a nova entrega da versão instalada. O workflow da #133 também impede a escolha de uma versão maior, enquanto o guard da #89 exige uma versão maior.

Conclusão: a arquitetura Normal, o versionamento, o manifesto e os workflows não formam um único contrato de release. A decisão runtime único versus dois runtimes precisa ser tomada antes da consolidação; não publicar qualquer uma das linhas no estado atual.

### Team Lite

O workflow de produção em team-lite-official continua executando supabase functions deploy upstatus e usa Supabase CLI latest. O destino correto do backend Team Lite é upstatus-team-lite. A candidata #134 usa userscript 3.4.31, enquanto o runtime implantado é v15 / userscript 3.4.30. O workflow oficial não valida adequadamente SHA/projeto e não foi corrigido pela candidata de CI.

Não despachar o workflow oficial Team Lite atual.

## Supabase: fotografia read-only

### Produção dlfvkawaiqduhlazsszm

- Migrations remotas: 7; última 20261027155438. Nenhuma migration AUTH-03 está aplicada.
- Realtime: 67/67 linhas em realtime.messages têm private=false; eventos: 35 user_status, 20 db_change, 6 remote_command, 6 remote_result. Todas as 67 estão no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- realtime.messages tem RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public, retornam trigger e cada uma está ligada a um trigger. EXECUTE efetivo aparece para anon/authenticated/service_role. Por retornarem trigger e estarem anexadas a triggers, não há evidência de invocação RPC direta; os WARNs do Advisor sobre RPC são imprecisos quanto a essa via. O grant amplo continua desnecessário. O risco concreto é o broadcast público e o payload emitido pelo trigger.
- upstatus_broadcast_messages usa to_jsonb(OLD/NEW) e realtime.send com private=false. Os outros dois broadcasts também publicam eventos no tópico público.
- Dez tabelas públicas estão com RLS e sem policies. Nove tabelas backend-owned concedem 8 privilégios a cada um dos papéis anon e authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. O catálogo retorna 144 entradas explícitas de ACL em 9 tabelas. RLS sem policies não protege TRUNCATE; não foi demonstrada execução de TRUNCATE pela API.
- Default ACL: 120 privilégios expandidos destinados a anon/authenticated em objetos futuros, incluindo defaults amplos de postgres/supabase_admin.
- Storage: chat-images e profile-images são públicos, limite de 20 MiB cada; zero policies em storage.objects.
- Security Advisor: 6 WARN (3 por papel, sobre as três trigger functions) e 10 INFO de RLS sem policy. Performance e Health sem findings.

### Laboratório bfpjtfqlnypisxljoxkb

- Migrations: 39.
- 18 tabelas públicas com RLS e sem policies; zero grants diretos para anon/authenticated nas tabelas públicas consultadas.
- 96 privilégios Default ACL destinados a clientes para objetos futuros.
- realtime.messages sem linhas, RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.
- Sem buckets Storage.
- As três funções broadcast do laboratório têm search_path vazio e não concedem EXECUTE a anon/authenticated.
- Security Advisor: 18 INFO de RLS sem policy, sem WARN de SECURITY DEFINER. Performance Advisor: 5 INFO de índices não utilizados. Health sem findings.

Laboratório isolado não equivale a ambiente full-product TEST endurecido.

## AUTH-03 e Edge Functions

Produção lista 38 Edge Functions ACTIVE; todas reportam verify_jwt=false no metadata. Isso não prova ausência de autenticação: os handlers centrais usam validação customizada de sessão. As versões relevantes são upstatus v480 (SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd), upstatus-team-lite v15 (SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb), upstatus-screen-share-3-1-1-beta10 v6 (SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29) e upstatus-test v281 (SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a).

Não existe função upstatus-signal em produção. Os bundles de produção Normal e Team Lite continuam com o endpoint antigo POST /api/setup chamando login(req,true); não foi encontrada referência às rotas/RPCs de setup invite ou ao rate limiter AUTH-03 nesses runtimes. Produção não tem tabelas/rpcs de invite/signal rate limit nem colunas de token de setup.

O laboratório contém upstatus-signal-test v32 (SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712) e upstatus-signal-e2e-once v3. O catálogo mostra tabelas de signaling, setup-invite rate limit e RPCs de consumo/rate limit no projeto isolado.

### Divergência HTTP de voz no laboratório

A fonte implantada de upstatus-signal-test v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409. Não contém VOICE_ATTEMPT_ALREADY_ACTIVE nesse mapeamento; esse erro cai no fallback 500 do handler. A fonte candidata #101 inclui o mapeamento, mas não há teste HTTP real contra o runtime implantado nesta rodada. Classificação: inspeção de código, não reprodução HTTP.

## Issues, teste manual e aceitação

- Issue #78 permanece OPEN; os oito critérios físicos continuam desmarcados. Nenhum teste manual foi executado nesta rodada: perda real de internet por 10 segundos, reconexão sem F5, reentrada em sala, novas chamadas, microfone/tela reais e interoperabilidade instalada Normal ↔ Team Lite permanecem pendentes.
- Issue #79: comentário dedicado UPCONTROL:QA existente atualizado; comentário da Engenharia preservado.
- Reviews humanas: nenhuma submissão retornada para #74, #75, #76, #82 e #140.

## Documento de prontidão

docs/RELEASE_READINESS.md foi recuperado do raw da branch QA exata. Blob SHA 7cfbd70886df42ce790c078c224b19284a632595; GitHub informa 8.409 linhas / 5.746 linhas de código. A última seção do documento é a revalidação de 2026-11-08 18:30 UTC. Este documento é um checkpoint histórico e foi confrontado com os heads e snapshots atuais acima; não foi sobrescrito nesta rodada.

## Classificação final

- CI aprovado: #74, #75 (histórico limitado), #76, #133, #134 e o guard offline #140 nos runs exatos citados.
- CI falhou: #82 Validate no HEAD 7051f73.
- Inspeção de código: topologia de deploy Normal, workflow Team Lite, fontes Edge Functions, guard de migrations, trigger functions e contrato HTTP de voz.
- Teste manual: nenhum nesta rodada.
- Pendente: HTTP real 409, migração em ambiente oficial TEST, testes físicos #78, reviews humanas e decisão de arquitetura Normal.
- Bloqueado: RT-01, AUTH-03 em produção, ACL/Storage, proveniência dos quatro SQLs originais e publicação coerente Normal/Team Lite.

## Veredito

NOT READY. Não autorizar merge, deploy, migration, release ou publicação de userscripts.

Próximas ações: (1) decidir runtime único ou duplo Normal; (2) alinhar incremento de versão e workflow de cutover; (3) integrar sinalização server-mediated nos dois clientes e torná-la obrigatória com identidade/membership verificadas; (4) corrigir o contrato HTTP de voz no runtime isolado e adicionar teste HTTP real; (5) corrigir o workflow Team Lite; (6) planejar migrations/ACL/Storage/Realtime no laboratório oficial antes de qualquer produção; (7) recuperar os quatro SQLs originais sem sintetizá-los; (8) executar aceitação física #78 e obter revisão humana.

## Segurança

Todas as consultas Supabase desta rodada foram SELECT-only. Não houve teste de exploração, envio de broadcast, upload, chamada RPC de escrita, alteração de fixture, migration, deploy, merge, release, alteração de secrets/flags/roles/grants/policies/ACLs ou publicação de userscript. Nenhum teste local ou manual foi executado. A escrita foi restrita a este novo relatório na branch QA e à atualização do comentário QA existente na Issue #79.