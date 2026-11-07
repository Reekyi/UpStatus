# Auditoria independente UpStatus — 2026-11-07 20:30 BRT

**Escopo:** GitHub Reekyi/UpStatus; Supabase produção dlfvkawaiqduhlazsszm; laboratório isolado bfpjtfqlnypisxljoxkb.

**Método:** leitura do checkpoint RELEASE_READINESS.md antes da auditoria; revalidação de PRs, commits, checks, logs e issues; inspeção estática dos templates Normal/Team Lite e workflows; inventário Supabase, Security Advisor e consultas SQL exclusivamente SELECT. Nenhum teste mutável foi iniciado pela auditoria.

## Vocabulário de evidência

- **AUTOMATED PASS:** workflow concluído com sucesso no SHA exato indicado.
- **CODE INSPECTION:** comportamento/configuração verificados estaticamente; não equivale a execução.
- **MOCK/VM PASS:** handler/cliente exercitado com mocks ou Node VM; não é HTTP Deno real nem E2E de Storage.
- **MANUAL PENDING:** depende de Tampermonkey, navegador, dispositivo, rede ou aceite humano.
- **BLOCKED:** dependência ou risco confirmado impede o gate.
- **NOT VERIFIED:** não há evidência suficiente ou a evidência pertence apenas ao laboratório.

## 1. Estado GitHub e heads exatos

Repositório default branch: master. PRs abaixo foram consultadas novamente por metadados e comparadas contra suas bases. Todas estão OPEN, Draft e unmerged. As consultas de reviews retornaram zero reviews humanas submetidas.

| PR | HEAD exato | Base | Ahead / behind | Estado |
|---|---|---|---:|---|
| #74 Normal | acf4d8053ac38618e912b2d7957af11ff3a20476 | master | 860 / 0 | OPEN / Draft |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 59 / 0 | OPEN / Draft |
| #76 Team Lite candidato | 544866b17cc797209269036ffb76e4a7edb25cf9 | team-lite-official | 324 / 0 | OPEN / Draft |
| #82 QA | a2b9e5c8e732689b57e8614b6c0539ee043124e2 | master | 110 / 0 | OPEN / Draft |
| #84 TEST guard | 21341f331270e142bdf7584c1cdf16e6011e41b3 | develop | 30 / 0 | OPEN / Draft |
| #85 updater/security | 17554523ef51bafd503e74b3f1271d55f43a6eda | master | 21 / 0 | OPEN / Draft |

Bases observadas: master a9288ccfcb0f308d3a587bfca624418a395be07b; develop 6b33e1e26ad105143f00372ae6d0f2fa52df60d6; team-lite-official 9065bc1536fde64f437f6f12b7abb9b072cb8281.

#76 continua a evolução do baseline #75; não tratar as duas PRs como payloads independentes. #74 tem diff de 84 arquivos e 860 commits à frente de master; #76 altera 42 arquivos e está 324 commits à frente de team-lite-official. A revisão do histórico e do diff completo continua obrigatória. #74 e #85 sobrepõem alterações em server template, userscript, build e regressões de chat; reconciliar antes de qualquer integração.

## 2. CI exato

| Candidato | Run | Resultado no SHA atual |
|---|---|---|
| #74 Validate | [42424257590](https://github.com/Reekyi/UpStatus/actions/runs/42424257590) | **AUTOMATED PASS** |
| #74 Signaling Smoke | [42424257530](https://github.com/Reekyi/UpStatus/actions/runs/42424257530) | **AUTOMATED PASS** |
| #75 baseline | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **AUTOMATED PASS histórico** no baseline inalterado |
| #76 Candidate Checks | [42424260073](https://github.com/Reekyi/UpStatus/actions/runs/42424260073) | **IN PROGRESS**; não declarar PASS |
| #82 Validate | [42421624574](https://github.com/Reekyi/UpStatus/actions/runs/42421624574) | **FAIL** herdado de master |
| #84 Validate | [42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) | **AUTOMATED PASS** |
| #85 Validate | [42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) | **AUTOMATED PASS**, Storage/DB mocks |

### #74 — resultado confirmado

No HEAD acf4d805, Validate e Smoke terminaram SUCCESS. O Smoke confirma:
- 19/19 verificações não autenticadas;
- 129/129 verificações autenticadas;
- criação/convite/aceitação/declínio e encerramento de salas;
- chamadas paralelas com bindings independentes;
- voice-room open/leave, late join, handoff de owner, capacidade e corridas;
- cancel-before-open com tombstone e ausência de membership órfã;
- WebRTC de chamada, voz e compartilhamento com faixas remotas;
- mesh de três participantes;
- rate limit de 90 aceitas + 1 HTTP 429, Retry-After 60s;
- concorrência do rate limiter e recibos atômicos;
- enrollment isolado, token malformado/incorreto/expirado/replay, concorrência de um vencedor e cleanup.

O Validate também passou nas regressões de upload assinado de cliente/servidor com mocks, regressão de chat e dispatch Node VM das rotas setup-invite/setup. O log confirma autorização da emissão, token handling e dispatch. **Isso é MOCK/VM PASS**, não HTTP Deno real nem E2E Supabase das rotas.

O commit acf4d805 adiciona timeout de 20s por request ao harness de endpoints não autenticados. O Smoke atual passou; o timeout não deve ser confundido com validação de rede física.

### #76 — estado exato ainda aberto

O HEAD atual 544866b17 está associado ao run 42424260073, ainda IN_PROGRESS na última consulta. Os passos 1–9 passaram: build-target guard, mutation guard, adapter, enrollment contract, recuperação durável de voice-room, recuperação de screen-share e autenticação do endpoint. O passo de integração/browser autenticado continua em execução; concorrência do rate limit, recibos, consumo atômico do invite, migration layout e versão ainda estavam pendentes.

O HEAD anterior 26122c55 passou 103/103 autenticados no run 42414281711, mas esse resultado não deve ser transferido ao novo HEAD 544866b17, que inclui a regressão mais recente de dispatch e timeout. O laboratório está ocupado pelo run atual. Não iniciar outro teste mutável, rerun ou limpeza manual.

### #82 — falha de validação documental

O job 128551083576 do run 42421624574 falhou em scripts/validate.mjs:26 com VALIDATION FAILED: production updateURL mismatch. A falha é da asserção herdada de master; o validador não foi enfraquecido. A PR #82 contém documentação, não alteração de runtime.

## 3. Achado novo — autorização de limpeza de chat no Team Lite

**BLOCKER de segurança para #76. CODE INSPECTION nos arquivos do HEAD exato; nenhuma rota foi chamada.**

Arquivo: src/server/team-lite-index.template.ts  
HEAD: 544866b17cc797209269036ffb76e4a7edb25cf9  
Blob: 099d343d977be8f127bacb6d3988cfe90c4fc412  
Rota: POST /api/chat/clear, linha 759.

O servidor verifica somente name diferente de Ricardo e, se o nome for Ricardo, lê todas as mensagens, exclui todas as mensagens e remove os objetos correspondentes do bucket chat-images. Não chama admin(name) nem valida role === implementation_admin.

O cliente Team Lite também:
- renderiza o botão de limpar chat quando member === Ricardo (userscript blob 0e0660a6abc26052e67b9b1832a75fde7bc0b06e, linha 4233);
- handler clearChatRicardo verifica somente member diferente de Ricardo (linha 4382).

O checker scripts/team-lite-candidate-check.mjs, blob 18a56435370673980118b0a32e01192ec429481c, verifica admin(name) e health endpoint, mas não contém uma asserção para a rota /api/chat/clear. O workflow atual também não possui uma etapa dedicada de chat regression para esse contrato. Isso explica como o CI pode passar sem detectar a divergência.

### Comparação Normal

Normal src/server/index.template.ts, blob c7de6c4b8677fd829f512b224db3157e506cf2ad, linha 784, exige nome Ricardo e await admin(name) antes de limpar o chat. A regressão scripts/chat-regression.test.mjs, blob edcc2a55381110a0b45401f25ba89790f18a9e6e, verifica autorização do servidor por papel e o gate da UI.

No Team Lite, a rota deleteRoute de mensagem individual já usa admin(name), mas a UI ainda pode mostrar a opção de excluir para Ricardo apenas pelo nome. O servidor recusa a operação se o papel não for admin; isso é uma divergência de UI, não evidência de bypass da rota individual. O bloqueio confirmado é a operação global /api/chat/clear.

### Produção também mantém o contrato legado

As quatro funções implantadas foram lidas diretamente:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd;
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb;
- upstatus-test v281, SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a;
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.

Todas as quatro ainda verificam apenas o nome Ricardo em /api/chat/clear. As quatro também contêm deleteRoute com name Ricardo OU await admin(name), permitindo que o nome bypass o papel para excluir mensagens de terceiros. A rota de setup antiga também atribui implementation_admin a nomes Ricardo/Lohan/Guilherme quando o papel está ausente.

No snapshot atual, produção possui cinco contas, três papéis implementation_admin, zero password_hash vazio/nulo e zero role vazio/nulo. Não foi encontrada conta atualmente não inicializada; o achado é uma falha latente de autorização para conta rebaixada ou registro futuro/resetado, não evidência de takeover atual.

**Correção exigida antes de integrar #76:** exigir papel administrativo no servidor para /api/chat/clear; alinhar a UI; adicionar teste de não-admin Ricardo com HTTP 403 e nenhuma mutação; adicionar teste admin positivo. Portar a correção para os runtimes de produção somente em um cutover revisado e autorizado.

## 4. Deploy TEST e isolamento

Workflow ativo em develop:
- arquivo .github/workflows/deploy-test.yml;
- blob d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839;
- gatilhos workflow_dispatch e push em develop;
- usa secret compartilhado SUPABASE_PROJECT_ID;
- Supabase CLI latest;
- implanta upstatus-test;
- não valida a identidade do projeto de destino antes do deploy.

Não foi lido nenhum secret. O risco é a ausência de uma garantia técnica de destino, não uma afirmação de que o secret atual aponta para produção.

A candidata #84, blob 1ca0c4ef4f633724280b81691471d8acc777edd2, é manual-only, faz checkout do SHA exato do dispatch, exige refs/heads/develop, compara GITHUB_SHA, usa SUPABASE_TEST_PROJECT_ID dedicado, rejeita produção e o projeto isolado, valida organização/metadata via Management API e fixa Supabase CLI 2.122.1. O teste scripts/test-deploy-workflow-guard.mjs, blob d780fb8bb4c72c2e235eb35a6c417f9f14bfe67d, verifica manual-only, escopo do token e ausência do secret compartilhado.

#84 Validate passou, mas o workflow não foi dispatchado. A correção ainda está Draft e não protege develop.

A organização Supabase tem somente dois projetos:
- produção dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002;
- laboratório bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe terceiro projeto TEST full-product. O workflow #84 deve falhar fechado enquanto não houver projeto dedicado, variável, credencial e preflight aprovados. Não executar o workflow antigo de develop.

## 5. Supabase — migrations, Edge Functions e objetos

### Migrations

- Produção: 7 migrations, última 20261027155438.
- Laboratório: 34 migrations, última 20261107165942.

A produção não contém as migrations candidatas de setup invite, rate limiter, recibos atômicos, recuperação de chamadas/salas ou hardening de broadcast. O laboratório contém as tabelas/RPCs candidatas de setup invite, rate limit de signaling, call/voice attempts e merge de recibos.

Não existe auth-specific rate limiter em nenhum dos dois projetos. Produção também não possui setup invite, signaling rate-limit table/RPC ou merge_chat_read_receipts.

### Edge Functions

Produção: 38 ACTIVE, todas com verify_jwt=false; 36 têm nomes contendo test, beta ou backup. verify_jwt=false não prova ausência de autenticação customizada: os runtimes centrais validam sessão UpStatus em nível de aplicação. A revisão de autorização das 36 variantes antigas ainda é incompleta; não remover funções sem inventariar consumidores e rollback.

Laboratório: duas funções ACTIVE, upstatus-signal-test v32 e upstatus-signal-e2e-once v3, ambas verify_jwt=false e com autenticação customizada no endpoint de teste.

### Autenticação e compatibilidade

Os templates candidatos Normal e Team Lite agora usam mínimo de seis caracteres para criação de senha e quatro para login legado. O setup exige token de 64 hex, envia somente hash à RPC de consumo e usa convite de uso único. Isso está em CODE INSPECTION; Normal tem dispatch Node VM PASS no run 42424257590. Team Lite está com o passo de enrollment contract aprovado no run em andamento, mas a etapa de consumo atômico ainda não começou na última consulta.

A produção continua divergente:
- upstatus v480: mínimo 6 para login/setup;
- upstatus-team-lite v15: mínimo 4;
- upstatus-test v281: mínimo 4;
- beta10 v6: mínimo 6.

Os runtimes implantados ainda usam setup público legado e fallback administrativo por nome. Não há auth rate limiter distribuído.

### RLS, grants, SECURITY DEFINER e default ACLs

Security Advisor de produção, observado 2026-11-07T23:31Z:
- 3 WARN anon para funções SECURITY DEFINER executáveis;
- 3 WARN authenticated para as mesmas funções;
- 10 INFO de RLS habilitado sem policy.

As três funções de broadcast em produção continuam SECURITY DEFINER, search_path=public, EXECUTE efetivo para anon/authenticated/service_role e triggers habilitados:
- upstatus_broadcast_messages;
- upstatus_broadcast_remote_state;
- upstatus_broadcast_users.

Nove tabelas backend-owned em public continuam RLS-enabled, zero policies e grants efetivos a anon/authenticated para SELECT/INSERT/UPDATE/DELETE/TRUNCATE. upstatus_visual_config não tem esses grants. A ausência de policies significa que os grants não provam acesso às linhas; TRUNCATE não é protegido por RLS e o conjunto é privilégio desnecessário.

realtime.messages em ambos os projetos: RLS habilitado, zero policies, grants SELECT/INSERT para anon/authenticated. storage.objects: RLS habilitado, zero policies.

Default ACLs de produção continuam amplos:
- postgres em public e storage;
- supabase_admin em public, graphql e graphql_public.
Incluem grants de tabela, função e sequência para anon/authenticated/service_role. Novos objetos podem herdar permissões excessivas.

No laboratório, postgres/public foi restringido a postgres/service_role, mas postgres/storage e os default ACLs de supabase_admin em public/graphql/graphql_public continuam amplos. ACL-02 segue bloqueado por falta de caminho administrativo autorizado para ajustar defaults de supabase_admin.

Advisor do laboratório: zero WARN SECURITY DEFINER e 17 INFO de RLS sem policy.

## 6. Realtime

Produção:
- três triggers ativos em messages, upstatus_state e users;
- funções SECURITY DEFINER com search_path=public e EXECUTE para anon/authenticated;
- broadcast messages envia OLD/NEW completo via to_jsonb;
- remote-state transmite sender/target/status/reason/error/createdAt;
- user-status transmite name/status/reason/updated_at/sync;
- todos usam private=false.

Laboratório:
- funções com search_path vazio;
- EXECUTE negado a anon/authenticated e permitido a service_role;
- payload minimizado a {op};
- triggers habilitados;
- ainda usam private=false.

Partições de realtime.messages: produção 7 partições/50 linhas; laboratório zero partições/zero linhas. A configuração de funções e grants no laboratório foi inspecionada, mas a entrega real trigger-to-Realtime não foi comprovada. Não criar partições manualmente em schema gerenciado. A migração para canais privados também exige desenho de autorização confiável/JWT Supabase ou substituição server-mediated; não basta mudar private=false para true.

O transporte autenticado continua opt-in em ambos os userscripts:
- signaling_transport_enabled tem default false;
- endpoint começa vazio.
O caminho padrão continua dependendo do Realtime legado. Não habilitar globalmente antes do endpoint de produção, autorização, recuperação, compatibilidade e rollback serem validados.

## 7. Storage

Buckets de produção:
- chat-images: public=true, limite 20 MiB;
- profile-images: public=true, limite 20 MiB.

Upload assinado #85 passou em regressões de cliente/servidor com mocks. Não houve upload real. Bucket público protege a escrita assinada, mas não torna a leitura privada. storage.objects tem RLS e zero policies. Definir se anexos de chat podem continuar acessíveis por URL pública ou migrar para buckets privados e downloads assinados.

Áudio continua em rota separada data URL; o limite de servidor é 5 MiB enquanto o limite do cliente é maior. O contrato de áudio precisa de teste/alinhamento separado.

## 8. Issues e aceite manual

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN, 0/8 critérios físicos. Sem Tampermonkey real, perda de internet por ~10s, recuperação sem F5, microfone/display físicos ou interoperabilidade instalada Normal ↔ Team Lite.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece OPEN com 98 comentários. O corpo ainda reflete o checkpoint 17:04 BRT; o comentário mais recente de engenharia às 20:13 BRT registra #74 Validate PASS, #74 Smoke pendente, #76 Candidate Checks pendente e #82 validator failure. Agora #74 Smoke terminou PASS e #76 ainda está IN_PROGRESS. O corpo precisa ser reconciliado pelo responsável; não foi editado pela auditoria.

## 9. Estado do laboratório durante o run #76

Uma consulta SELECT-only às 23:31 UTC, enquanto o Candidate Checks 42424260073 estava IN_PROGRESS, observou quatro linhas em public.users, todas com password_hash vazio e zero role implementation_admin. Não foram consultados nomes nem removidas linhas. A origem/ownership dessas linhas não foi atribuída com certeza, embora o workflow de teste esteja ativo. Não declarar o laboratório limpo e não executar outra suíte mutável ou limpeza manual. A etapa de cleanup do run atual ainda não foi concluída na última consulta.

## 10. Próximos gates

1. Corrigir /api/chat/clear no Team Lite: exigir role implementation_admin, alinhar UI e adicionar regressões admin/não-admin.
2. Portar a correção de autorização para os runtimes de produção somente em cutover revisado; remover também os fallbacks de nome em deleteRoute/setup.
3. Aguardar #76 42424260073 terminar e confirmar cleanup pelo próprio workflow/SELECT autorizado; não rerun enquanto o laboratório estiver ocupado.
4. Provisionar TEST full-product independente com Storage e Realtime corretos; criar runtime/workflow TEST Team Lite.
5. Integrar a proteção manual-only #84 antes de qualquer uso do workflow TEST ativo em develop.
6. Completar AUTH-03 por HTTP Deno/E2E e implementar rate limit distribuído separado para login/setup.
7. Planejar migração de Realtime sem full-row payloads e com autorização privada comprovada.
8. Revisar grants, realtime.messages e default ACLs em TEST com plano de rollback e caminho administrativo autorizado.
9. Definir privacidade dos buckets e executar upload/download real em TEST; alinhar áudio.
10. Completar aceite físico #78, reconciliar #79 e obter reviews humanas.
11. Revisar o diff amplo #74/#76 e reconciliar arquivos sobrepostos #74/#85 antes de qualquer integração.

## Registro de segurança

- Todas as consultas SQL desta auditoria foram SELECT-only.
- Nenhuma migration, DDL, deploy, Edge Function, secret, role, grant, policy, ACL, flag ou dado foi alterado.
- Nenhum teste mutável foi iniciado pela auditoria; nenhum workflow foi dispatchado ou rerun manualmente.
- Nenhuma fixture foi limpa; as quatro linhas observadas no laboratório foram preservadas.
- Nenhum merge, release ou publicação de userscript.
- Nenhuma branch de engenharia foi alterada.
- Única escrita desta rodada: este novo relatório na branch QA dedicada.

Não reportar percentual de conclusão. CI verde, inspeção de código, runtime isolado, teste físico e release readiness são estados distintos.

## Evidências

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA](https://github.com/Reekyi/UpStatus/pull/82)
- [PR #84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84)
- [PR #85 updater/security](https://github.com/Reekyi/UpStatus/pull/85)
- [Issue #78 reconnect](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79 release checklist](https://github.com/Reekyi/UpStatus/issues/79)
- [Supabase Advisor: SECURITY DEFINER callable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase Advisor: SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase Advisor: RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
