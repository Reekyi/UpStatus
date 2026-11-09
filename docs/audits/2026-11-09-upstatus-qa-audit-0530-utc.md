# Auditoria independente UpStatus - 2026-11-09 05:30 UTC

## Escopo e método

Projeto: userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Repositório: `Reekyi/UpStatus`  
Produção Supabase: `dlfvkawaiqduhlazsszm`  
Laboratório Supabase: `bfpjtfqlnypisxljoxkb`

Esta rodada revalidou refs GitHub, PRs, workflows e logs existentes; leu o checkpoint `docs/RELEASE_READINESS.md`; inspecionou as candidatas #109, #111, #112, #113, #115 e #117; decodificou os userscripts embutidos nos runtimes implantados; e executou somente consultas SELECT no catálogo Supabase e Advisors.

Nenhum workflow foi despachado manualmente. Nenhum teste com fixtures foi executado. Não houve DDL, DML, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags, grants, policies ou ACLs.

## Leitura do checkpoint principal

O arquivo `docs/RELEASE_READINESS.md` foi obtido integralmente pela URL raw da branch QA após o GitHub Contents endpoint retornar apenas metadados para o arquivo grande.

- Blob SHA: `7cfbd70886df42ce790097c878e41ebec5846d90`.
- 5.746 linhas, aproximadamente 1,05 MB.
- Última seção registrada no documento principal: revalidação de 2026-11-08 15:30 BRT / 18:30 UTC.
- O documento define corretamente os estados AUTOMATED PASS, CODE INSPECTION, MANUAL PENDING, BLOCKED e NOT VERIFIED.
- As tabelas e os heads desse checkpoint são históricos. As revalidações mais recentes estão em notas separadas em `docs/audits/`; este registro não altera o documento principal.

## Heads e integridade da QA

- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA antes desta nota: `493cb93fc8f40d230259ccd9cb40b0e1b3b3957a`.
- QA vs master: 149 commits à frente, 1 atrás.
- Merge-base: `a9288ccfcb0f308d3a587bfca624418a395be07b`.

O único commit master-only é `9d40461`, mensagem `docs: record read-only AUTH-03 migration preflight`. A inspeção do diff confirmou que ele só adiciona `docs/checkpoints/2026-11-08-production-migration-history-preflight.md`. Não houve rebase nem incorporação automática. A branch QA permanece dedicada à documentação.

## PRs e CI

Todas as PRs abaixo continuam abertas e Draft; nenhuma review humana foi registrada nas PRs #74, #75, #76, #82, #109, #111, #112, #113, #115 e #117.

| PR | HEAD | Evidência atual | Classificação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | [Validate 42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) e [Signaling Smoke 42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729), ambos SUCCESS no HEAD exato | AUTOMATED PASS para essa candidata; não inclui o stack novo #109/#112/#117 |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | PASS histórico, superado por #76 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | [Candidate Checks 42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS no HEAD exato | AUTOMATED PASS para essa candidata; não inclui o stack novo de idempotência/readiness |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `493cb93fc8f40d230259ccd9cb40b0e1b3b3957a` | [Validate 42563170486](https://github.com/Reekyi/UpStatus/actions/runs/42563170486) FAILURE | BLOCKED por `production updateURL mismatch` em `scripts/validate.mjs:26` |
| [#109 capacidade](https://github.com/Reekyi/UpStatus/pull/109) | `9294f47a9dbea7038d34b74fdc53e958804e2d51` | [Validate 42554593978](https://github.com/Reekyi/UpStatus/actions/runs/42554593978) SUCCESS | AUTOMATED PASS do contrato; HTTP concorrente real pendente |
| [#111 Team Lite idempotency adapter](https://github.com/Reekyi/UpStatus/pull/111) | `d65c3a6e42b5adba4303fcd510747839eca25b20` | [Source Guard 42554841729](https://github.com/Reekyi/UpStatus/actions/runs/42554841729) SUCCESS | AUTOMATED PASS offline; Candidate Checks com fixtures não executado |
| [#112 idempotência server-side](https://github.com/Reekyi/UpStatus/pull/112) | `a7d6950fa0835e2c296318b2f431256f0fca3ab5` | [Validate 42555495928](https://github.com/Reekyi/UpStatus/actions/runs/42555495928) SUCCESS | AUTOMATED PASS do contrato; runtime não atualizado |
| [#113 readiness base](https://github.com/Reekyi/UpStatus/pull/113) | `6a86d5c6b4285fe5cde6e46ffb4a70c070a96c90` | [Validate 42559889611](https://github.com/Reekyi/UpStatus/actions/runs/42559889611) SUCCESS | Superada pela v2 de #117 |
| [#115 schema usage](https://github.com/Reekyi/UpStatus/pull/115) | `bd26747c7bfd576f93f09e38c8d4a79eb8dd36ba` | [Validate 42559930958](https://github.com/Reekyi/UpStatus/actions/runs/42559930958) SUCCESS | Superada por #117 |
| [#117 readiness integrity v2](https://github.com/Reekyi/UpStatus/pull/117) | `4889111a6f1e59015785792f53e3132141044227` | [Validate 42565884714](https://github.com/Reekyi/UpStatus/actions/runs/42565884714) SUCCESS no HEAD atual | AUTOMATED PASS do código candidato e checkpoint documental |

Para #117, o código validado está no commit `206e19df0d9c896b22e50eb16864a4ba80be9f16`; o HEAD atual `4889111` é um checkpoint documental posterior. Os runs [42565786660](https://github.com/Reekyi/UpStatus/actions/runs/42565786660) e [42565813869](https://github.com/Reekyi/UpStatus/actions/runs/42565813869) passaram no code HEAD. O log de 42565884714 confirma os contratos de capacidade, idempotência, readiness integrity, paridade do runtime, signed upload, chat e updater Team Lite.

A falha da #82 é herdada do master e não é causada pelo Markdown: o build gera PROD 3.4.7 / TEST 3.4.7 e falha em `production updateURL mismatch`. Não houve rerun manual.

## Readiness integrity v2 - avanço e limites

A #117 consolida os fixes anteriores de schema usage, constraints e segurança do harness.

Arquivos inspecionados:
- Migration `supabase/migrations/20261109050000_signal_database_readiness_integrity.sql`, blob `4edc11adafee0dc9664871cd8fe34ec1e1f028f1`.
- Helper `supabase/functions/upstatus-signal/readiness.mjs`, blob `75b075934ae19cb13c2484d335258e366423e47f`.
- Harness `scripts/test-signal-room-capacity.mjs`, blob `af3f7a7b81afcfa7897ba2227c57f0bdae5b9858`.

A readiness RPC agora verifica:
- tabelas requeridas com RLS;
- colunas requeridas;
- privilégios de tabela e USAGE de schema para service_role;
- existência e propriedades das RPCs usadas pelo handler: VOLATILE, SECURITY INVOKER, `search_path` vazio, EXECUTE para service_role e ausência de EXECUTE para anon/authenticated;
- primary/unique constraints e foreign keys requeridas, incluindo tabela/colunas referenciadas e ação ON DELETE;
- oito índices requeridos, comparando definição exata e `indisvalid`, `indisready` e `indislive`.

A resposta candidata exige `ready=true`, `schemaVersion=signal-v2` e lista `missing` vazia. `GET /ready` usa cache single-flight de cinco segundos por isolate aquecido e só emite `X-UpStatus-Signal-Readiness: database-v2` com HTTP 200. O próprio código reconhece que isso não é rate limit global; ainda é necessário controle no gateway.

O achado anterior de falso-green por ausência de constraints/índices está **resolvido na candidata #117**, não no runtime implantado. A verificação de constraints cobre P/U/F; CHECK constraints não fazem parte da lista atual. Se CHECKs de status, limites e formato forem requisito de readiness, ampliar o contrato explicitamente.

O harness agora exige os marcadores de health e o header `database-v2` de `/ready` antes de qualquer escrita; verifica que as tabelas relevantes estão vazias; tenta cada DELETE de cleanup individualmente; e usa `Promise.allSettled` nas verificações postflight, acumulando falhas em `AggregateError`. Isso resolve as duas fragilidades documentadas na auditoria anterior em nível de código.

**Limite:** nenhum teste HTTP ou harness com fixtures foi executado nesta rodada. CI é contrato automatizado/offline, não prova de runtime.

## Capacidade de salas

A #109 usa RPCs transacionais para convite e aceitação, bloqueando a sala antes das memberships e impondo o máximo de 32 participantes aceitos. A #112 mantém a cadeia baseada no HEAD atual da #109. Os contratos CI passaram.

Ainda falta executar no laboratório:
- duas aceitações concorrentes na última vaga, esperando exatamente um sucesso e um HTTP 409;
- convite com sala cheia;
- consulta/fanout com todos os 32 participantes;
- limpeza e postflight vazio.

Quotas específicas de convites pendentes continuam sem política definida. A regra de open join de voz da issue #78 é distinta das rotas genéricas de convite/aceitação e não foi alterada pela #109.

## Idempotência e replay

A #112 cria `upstatus_signal_event_idempotency`, chave primária `(room_id, sender, idempotency_key)`, hash do request e RPC `enqueue_upstatus_signal_events` VOLATILE SECURITY INVOKER, `search_path` vazio e EXECUTE restrito a service_role. O servidor aplica o contrato a `/room/request-invite`, `/signal` e `/broadcast`.

- Mesma chave + mesmo request: deduplicação.
- Mesma chave + request diferente: HTTP 409.
- Chave nova + mesmo SDP/ICE: continua podendo ser aceito como novo evento.

Logo, a implementação resolve retries com a mesma chave, mas não equivale a anti-replay completo contra um emissor autenticado que escolhe uma chave nova. Falta nonce emitido pelo servidor, sequência por remetente ou outra janela/fingerprint de operação que não dependa apenas da chave escolhida pelo cliente.

O adapter Normal e o adapter Team Lite geram chaves aleatórias seguras de 128 bits e anexam a chave ao erro. A inspeção dos call sites registrada no comentário mais recente da issue #79 confirmou que ambos não persistem/reutilizam `error.idempotencyKey` ao repetir a mesma operação lógica. Sem isso, um retry do chamador pode gerar nova chave e perder a deduplicação.

A #111 é apenas o contraparte de adapter/bundle Team Lite e Source Guard offline. Não executou Candidate Checks completos porque eles mutam o laboratório compartilhado. A integração Team Lite com o stack de backend #109/#112/#117 ainda precisa de reconciliação e validação completa.

## Supabase - estado read-only atual

### Projetos e migrations

Produção `dlfvkawaiqduhlazsszm`:
- `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.
- 7 migrations, última `20261027155438 / set_upstatus_upload_limits_20mb`.
- Branch gerenciada `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`. Causa raiz não identificada.
- 38 Edge Functions ACTIVE; todas retornam `verify_jwt=false`. Isso exige inventário de autenticação por função e não prova, isoladamente, que todas sejam anônimas.
- `upstatus` v480, userscript embutido 3.4.7, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite` v15, userscript embutido 3.4.30, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10` v6, source SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- Não existe função server-mediated `upstatus-signal` em produção.

Laboratório `bfpjtfqlnypisxljoxkb`:
- `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003.
- 38 migrations, última `20261108050802`.
- `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`.
- `upstatus-signal-e2e-once` v3, SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`.
- Não há branches Supabase adicionais.
- As migrations candidatas de capacidade, idempotência, readiness e readiness integrity não estão aplicadas. A tabela do ledger e as RPCs candidatas não aparecem no catálogo. O runtime permanece v32 e não apresenta o marcador `database-v2`.
- Catálogo consultado sem fixtures de sinalização e sem linhas em `realtime.messages`.

A engenharia registrou na issue #79 que executou o corpo SQL da readiness v2 como SELECT no laboratório e obteve `ready=false` somente pelas dependências candidatas ainda ausentes. O catálogo atual confirma que o ledger e as RPCs ainda não foram aplicados. Isso não substitui uma requisição HTTP real depois de uma janela de integração autorizada.

### RLS, grants e SECURITY DEFINER

Security Advisor observado em 2026-11-09:
- Produção: 6 WARN e 10 INFO.
- Laboratório: 0 WARN e 17 INFO.
- Performance Advisor: nenhum achado em produção; 4 INFO de índices não utilizados no laboratório.
- Health Advisor: sem achados nos dois projetos.

Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 dessas tabelas concedem a anon/authenticated privilégios amplos, inclusive TRUNCATE; `upstatus_visual_config` não concede esses privilégios.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, e têm EXECUTE efetivo para anon/authenticated. O Advisor conta 6 WARN (3 funções x 2 papéis). As funções retornam `trigger` e estão ligadas a triggers; não foi demonstrada chamada direta como RPC comum. Os grants continuam desnecessários e o search_path deve ser endurecido.
- Default ACLs de postgres permanecem amplas em public/storage; defaults de supabase_admin permanecem amplas em public/graphql/graphql_public.

Laboratório:
- 17 tabelas públicas com RLS e zero policies; as tabelas públicas consultadas não concedem privilégios diretos aos papéis clientes.
- Funções de broadcast usam search_path vazio, EXECUTE restrito a service_role e payload mínimo.
- Default ACLs de postgres em public estão restritas a postgres/service_role, mas storage e defaults de supabase_admin em public/GraphQL continuam amplos.

### Realtime

Produção:
- Snapshot: 50 linhas em um único grupo tópico/private, todas `private=false`.
- 42 eventos `user_status` e 8 `db_change`.
- Triggers publicam no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os userscripts implantados Normal 3.4.7 e Team Lite 3.4.30 assinam `upstatus-screen-share-live-3-1-1-beta10`. Os tópicos não coincidem.
- O trigger de mensagens publica `to_jsonb(OLD/NEW)` completo em `db_change`; o trigger remote-state envia metadados de comando/resultado; o trigger de usuários envia status.
- `realtime.messages`: RLS true, zero policies, SELECT/INSERT/UPDATE efetivos para anon/authenticated.
- Os userscripts decodificados não usam `private:true`, não chamam `realtime.setAuth()` e não contêm o adapter de sinalização autenticada/idempotência.

Laboratório:
- `realtime.messages` sem linhas.
- Triggers usam payload mínimo `{"op": TG_OP}` e search_path vazio, mas ainda chamam `realtime.send(..., false)`; canal privado/autorizado ainda não foi implementado.

O acesso público efetivo do Dashboard não foi consultado e nenhum broadcast/ataque foi reproduzido. O caminho de confiança não autenticada permanece bloqueador por inspeção estática e configuração do canal, não por exploração demonstrada.

### Storage

- Produção: `chat-images` e `profile-images` públicos, 20 MiB cada.
- `storage.objects`: RLS true, zero policies e SELECT/INSERT/UPDATE/DELETE efetivos para anon/authenticated nos catálogos consultados.
- Laboratório: nenhum bucket de chat/perfil.
- A política de privacidade e os limites divergentes entre config, handler e buckets continuam pendentes.

## Workflows de produção

### Normal em master

Workflow blob SHA `8252c6c6e7005c98625603b5b02b14cb1e50a519`:
- Manual.
- `release.json` exige exatamente versão estável 3.4.7.
- Usa Supabase CLI `latest`.
- Publica somente `upstatus`.
- Não executa o preflight de migrations/projeto/SHA existente em candidatas mais recentes.

[Workflow Normal](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml)

### Team Lite em team-lite-official

Workflow blob SHA `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`:
- Lê o `release.json` raiz, 3.0.40 beta.22, e rejeita pré-release.
- O manifesto próprio `team-lite/release.json` declara buildVersion 3.4.30.
- `scripts/build.mjs` lê o manifesto raiz e define `PROD_FUNCTION="upstatus"`.
- O workflow executa `supabase functions deploy upstatus`, não `upstatus-team-lite`.
- Usa Supabase CLI `latest` e não tem preflight equivalente de identidade do projeto/SHA/migrations.

**Não despachar o workflow Team Lite oficial.** Se a proteção de pré-release fosse contornada, o build/deploy apontaria para a função Normal.

A última consulta de proteção de branches registrada na auditoria anterior reportou master e team-lite-official sem proteção/required checks. Este ponto não foi reconsultado nesta rodada por ausência de leitor de branch-protection no conector disponível; tratar como evidência anterior, não como nova medição.

## Issues e aceitação

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos. Sem Tampermonkey instalado, queda real de rede, recuperação sem F5, microfone/display reais ou interoperabilidade física Normal <-> Team Lite.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16/35 checkboxes marcados e 19 pendentes. O comentário mais recente registra #117 e confirma que os call sites não persistem/reutilizam a chave de idempotência em retry.
- Não houve teste manual nesta rodada.

## Classificação consolidada

- **AUTOMATED PASS:** #74 Validate/Smoke no HEAD #74; #76 Candidate Checks no HEAD #76; #109 capacidade contratual; #111 adapter Source Guard offline; #112 idempotência contratual; #113 readiness base; #115 schema usage (histórico); #117 readiness integrity v2 no HEAD atual.
- **CODE INSPECTION:** migrations e RPCs candidatas, cache de readiness, harness, adapter Normal/Team Lite, runtimes implantados, workflows, RLS/grants/SECURITY DEFINER, Realtime e Storage.
- **MANUAL PENDING:** 8 critérios da #78, permissões reais, reconexão sem F5, cross-version instalada e reviews humanas.
- **BLOCKED:** runtime/lab ainda v32 sem migrations/headers; transporte autenticado ausente em produção; replay com chave nova; Team Lite cutover; workflow Team Lite errado; Realtime público/tópico divergente; MIGRATIONS_FAILED; Validate da QA falha por updateURL.
- **NOT VERIFIED:** HTTP real de readiness/capacidade/replay; acesso público efetivo via configuração Dashboard; exploração Realtime; resultado de smoke combinado da pilha nova Normal/Team Lite.

## Próximos gates

1. Adicionar persistência/reuso da mesma chave de idempotência nos call sites Normal e Team Lite.
2. Projetar anti-replay além da chave fornecida pelo cliente: nonce/sequence ou janela de evento vinculada ao emissor/sala/operação; testar mesmo SDP/ICE com chave nova.
3. Reconciliar Team Lite #111 com o backend compartilhado #109/#112/#117 e executar Candidate Checks completos em janela de laboratório autorizada.
4. Coordenar explicitamente a janela de mutação do laboratório; aplicar somente migrations candidatas revisadas e deployar somente o runtime de teste autorizado.
5. Executar HTTP real: readiness 200/503, capacidade concorrente 1x200 + 1x409, mesma chave/same request, mesma chave/different request, fresh-key replay, limpeza e postflight vazio.
6. Corrigir o tópico Realtime e remover broadcasts públicos de conteúdo/controle; decidir canal privado com identidade Supabase apropriada ou transporte server-mediated.
7. Tornar o transporte autenticado default em ambos os clientes e remover listeners públicos sensíveis antes do cutover.
8. Corrigir workflow Team Lite, manifestos, slug de função, pin da CLI, verificação de projeto/SHA, preflight e rollback.
9. Revisar grants, SECURITY DEFINER, Default ACLs, Realtime e Storage com owner autorizado.
10. Resolver AUTH-03 e diagnosticar `MIGRATIONS_FAILED` com logs da branch gerenciada.
11. Completar 8/8 testes físicos da #78, atualizar #79 e obter reviews humanas.
12. Reconciliar a QA com o commit master-only documental somente após revisão; não fazer rebase automático.

## Segurança desta rodada

Todas as consultas SQL foram SELECT-only. Nenhuma migration foi aplicada. Nenhum runtime foi implantado. Nenhuma fixture foi criada ou removida. Nenhum workflow foi iniciado manualmente. Nenhum merge, deploy, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL foi realizado. A única escrita desta rodada é este arquivo novo na branch QA.
