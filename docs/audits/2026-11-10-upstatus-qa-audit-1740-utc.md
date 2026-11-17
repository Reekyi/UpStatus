# Auditoria independente UpStatus — 2026-11-10 17:40 UTC

## Escopo e método

Revalidação read-only do repositório `Reekyi/UpStatus`, dos projetos Supabase de produção (`dlfvkawaiqduhlazsszm`) e laboratório (`bfpjtfqlnypisxljoxkb), das PRs #74, #75, #76, #82 e candidatas relacionadas, das Issues #78 e #79, dos workflows, fontes implantadas, migrations, catálogo PostgreSQL, Realtime, RLS, grants, Default ACLs, SECURITY DEFINER, Storage e Edge Functions.

O blob completo de `docs/RELEASE_READINESS.md` foi lido por SHA `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.410 linhas. O último checkpoint dentro do documento continua datado de 2026-11-08 18:30 UTC. O arquivo original não foi alterado.

Nenhum workflow foi iniciado ou repetido pela auditoria. Nenhuma fixture foi criada. Não houve teste manual no navegador/Tampermonkey. Todas as consultas SQL foram SELECT-only.

## Heads reais

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `c7f097069863e196d2040d73f957cb39d4c4ef0d` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| #74 / `chore/continuity-foundation` | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| #76 / `team-lite/signaling-transport-candidate` | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` |
| #82 / QA | `c7f097069863e196d2040d73f957cb39d4c4ef0d` |
| #89 AUTH-03 | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` |
| #101 production signaling runtime | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` |
| #133 Normal | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` |
| #134 Team Lite | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` |
| #135 migration recovery | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` |
| #137 fixture cleanup | `73cf0461b8f173277a18e1d2525e8d5ea7aa5526` |
| #139 parity workflow | `be0d10e7c5208f23b4769614c5ac33bba938a91a` |

Comparações atuais:
- QA contra master: 198 commits à frente, 1 atrás; branches divergentes. Não fiz rebase.
- #133 contra a base #74: 14 commits à frente, 0 atrás.
- #134 contra a base #76: 10 commits à frente, 0 atrás.
- #75 contra #76: #76 está 319 commits à frente; #75 é baseline histórica.
- #137 contra o HEAD atual da base #89: 5 commits à frente, 7 atrás; GitHub reporta `mergeable=false`.
- #101 contra o HEAD atual da base #74: 10 commits à frente, 6 atrás; branch divergente.

As PRs principais permanecem abertas e Draft. As reviews consultadas de #74, #75, #76, #82, #89, #101, #133, #134 e #139 retornaram zero reviews.

A API de rulesets retornou lista vazia. A leitura dos endpoints de branch protection para `master` e `team-lite-official` retornou 403 (`Resource not accessible by integration`); portanto, não afirmo que as branches estejam sem proteção. O estado efetivo de branch protection não pôde ser confirmado.

## CI: resultado por candidata

| PR / referência | Evidência | Classificação |
|---|---|---|
| #74 Normal | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | AUTOMATED PASS no HEAD #74 |
| #75 Team Lite baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico, mas cobre sobretudo versão/manifesto/sintaxe/guest portal; não equivale à suíte completa #76 |
| #76 Team Lite | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298), [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) | AUTOMATED PASS: 110/110 autenticadas, 16/16 não autenticadas, 11/11 contratos HTTP; Playwright Full-IIFE e cenários de voz/tela |
| #82 QA | [Validate 42857933764](https://github.com/Reekyi/UpStatus/actions/runs/42857933764) | AUTOMATED FAIL: `production updateURL mismatch` em `scripts/validate.mjs:26` |
| #89 AUTH-03 | [Candidate workflow 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | Guard e testes isolados passaram; não foi um deploy/cutover real |
| #101 production signal | [Push CI 42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464) | Parity estática PASS em evento push; Supabase Preview SKIPPED; não há check-run PR-triggered no HEAD |
| #133 Normal | [API Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827), [Signaling Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | AUTOMATED PASS: 136/136 autenticadas; WebRTC chamada/voz/tela, mesh, rate limits, convites, recibos de leitura e limpeza |
| #134 Team Lite | [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298), [Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) | AUTOMATED PASS no HEAD #134 |
| #135 migrations | [Validate 42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) | AUTOMATED FAIL: `production updateURL mismatch` |
| #125 Team Lite dispatcher | [Validate 42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421), [Dispatcher guard 42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306) | Offline guard PASS; Validate FAIL; job deploy SKIPPED |
| #129 Team Lite legacy guard | [Workflow 42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) | Guard offline PASS; PR continua Draft |
| #139 parity workflow | [Workflow 42851899626](https://github.com/Reekyi/UpStatus/actions/runs/42851899626) | Check overall PASS, mas a etapa de source parity foi SKIPPED porque os arquivos de produção não existem nessa base |

Os logs #133/#134 confirmam testes de browser com WebRTC e limpeza, mas continuam sendo testes automatizados com ambiente controlado/stubs; não substituem aceitação física no Sale Smartly.

## Achado crítico: a proteção de proveniência não é fail-closed por padrão

Inspecionei os arquivos dos HEADs #133 e #134:
- Normal: `src/userscript/upstatus.user.template.js`, blob `8bbfa133`.
- Team Lite: `team-lite/upstatus-team-lite.user.js`, blob `d47b0f19`.
- Teste: `scripts/public-call-discovery-guard.test.mjs`, blob `09df9417`.

Ambos definem:
```js
GM_getValue(key+'signaling_transport_enabled', false) === true
```
e endpoint vazio por padrão:
```js
GM_getValue(key+'signaling_transport_endpoint', '')
```

O guard em `receiveCallSignal` é condicional:
```js
if (signalTransportFlag && !authenticatedSource &&
    !isAllowedPublicCallDiscoverySignal(p)) return;
```

Quando a flag permanece no default `false`, essa rejeição não é aplicada. O listener público `call_signal` chama `receiveCallSignal(..., false)`; os listeners públicos de voz e tela continuam chamando `voiceRoomReceive` e `screenShareReceive` enquanto `!signalTransportFlag`. Esses handlers fazem validação estrutural de campos, mas não recebem prova server-derived de identidade/membership.

O teste atual confirma que o ramo protegido existe e que o listener público passa `false`; não exige que a flag seja habilitada por padrão nem que o caminho legado falhe fechado. Portanto, o CI verde não demonstra que a candidata é segura em sua configuração default.

**Classificação:** CODE INSPECTION; risco de confiança não autenticada no caminho legado. Não fiz exploração externa. A configuração de Dashboard que controla public access do Realtime não é exposta pelo conector; não afirmo que um terceiro externo tenha conseguido ler ou publicar no canal.

## PR #101: existe código de servidor, mas ainda não é o stack liberável

A PR [#101](https://github.com/Reekyi/UpStatus/pull/101) contém o candidato `supabase/functions/upstatus-signal` e a migration `20261108190000_distributed_signaling_rate_limit.sql`. Está aberta, Draft, sem review e 10 commits à frente/6 atrás do HEAD atual da base #74.

Inspeção estática do handler:
- autentica `x-upstatus-token` consultando hash SHA-256 em `upstatus_sessions` e expiração;
- deriva identidade do servidor;
- verifica membership do remetente e destinatário;
- remove claims de identidade/destinatário do payload aninhado;
- aplica rate limit distribuído (90 eventos/min e 240 leituras/min), corpo máximo 20 KiB, TTL de evento de 2 min, TTL de sala de 2 h e limpeza limitada a 100 itens por execução;
- usa service-role apenas dentro da Edge Function;
- `verify_jwt=false` está explícito porque a função usa autenticação customizada, não JWT Supabase.

O teste `production-signal-source-parity.test.mjs` compara as duas fontes no repositório, parser e allowlist e verifica a presença/forma da migration. O push CI [42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464) passou. Isso é prova de paridade estática de arquivos do Git, não prova de deployment nem de equivalência com a fonte que está rodando no laboratório.

O PR #139 adiciona workflow de paridade na base #74, mas seu próprio log diz que a fonte de produção ainda não existe nessa base e pula o teste. O PR #138, tentativa de ajuste na branch feature, foi fechado sem merge. No HEAD de #101 não há check-run PR-triggered; só o push run acima e Supabase Preview SKIPPED.

Os templates de servidor Normal e Team Lite em #133/#134 não contêm rota `/api/signal` nem referência a `upstatus-signal`. Os candidatos #133/#134 também não contêm a função de produção; #133 contém apenas `upstatus-signal-test`. O inventário de produção tem 38 funções e nenhuma com slug `upstatus-signal`. Assim, o endpoint server-mediated ainda não está implantado nem ligado aos clientes.

### Drift entre fonte e runtime do laboratório

O Edge Function `upstatus-signal-test` implantado no laboratório está na versão 32. Comparei sua fonte obtida do Supabase com a fonte `supabase/functions/upstatus-signal-test/index.ts` da branch #101.

O runtime implantado não contém o tratamento:
```js
code === "VOICE_ATTEMPT_ALREADY_ACTIVE"
```
que a fonte candidata inclui na conversão do erro para HTTP 409. O runtime atual converte `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas deixa `VOICE_ATTEMPT_ALREADY_ACTIVE` cair no 500. Os arquivos `body.mjs` e `legacy-envelope.mjs` conferem exatamente; a divergência identificada está no mapeamento de status do handler.

Os testes de integração atuais verificam o payload JSON `VOICE_ATTEMPT_ALREADY_ACTIVE` diretamente via RPC, não o status HTTP do Edge Function. Por isso podem passar sem detectar o contrato HTTP divergente.

**Classificação:** CODE INSPECTION do runtime implantado e dos testes; não executei request de mutação contra o laboratório nesta auditoria.

### Migration de rate limit não exercitada no laboratório em sua forma de produção

A migration de produção da #101 é `20261108190000_distributed_signaling_rate_limit.sql`. Ela implementa limpeza limitada a 100 registros, com `FOR UPDATE SKIP LOCKED`.

O ledger do laboratório contém 39 migrations, mas não contém a versão `20261108190000`. O schema/RPC de rate limit existente veio de uma migration de teste anterior (`20261104154623`), cujo SQL faz DELETE de todos os buckets expirados sem o mesmo limite `LIMIT 100 FOR UPDATE SKIP LOCKED`.

Logo, os testes do laboratório validam um contrato semelhante, mas não executaram a migration exata de produção nem seu comportamento de limpeza concorrente. O teste de parity da #101 é estático e não substitui essa aplicação em ambiente descartável.

## Supabase: fotografia read-only

### Edge Functions e versões implantadas

Produção: 38 funções ACTIVE, todas reportando `verify_jwt=false` no metadata. Isso não prova ausência de autenticação; os runtimes principais inspecionados usam token customizado `x-upstatus-token`.

| Função | Versão | Artefato embutido |
|---|---:|---|
| `upstatus` | v480 | userscript Normal 3.4.7 |
| `upstatus-team-lite` | v15 | userscript Team Lite 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | código identificado como beta8 |
| `upstatus-test` | v281 | userscript TEST 3.3.28 |

O Normal 3.4.7 tem updateURL/downloadURL para `/upstatus/upstatus.user.js`, mas `CLOUD_SERVER` aponta para beta10 e o tópico é `upstatus-screen-share-live-3-1-1-beta10`. Team Lite 3.4.30 chama `upstatus-team-lite`, mas também usa o tópico beta10. Nenhum dos bundles inspecionados usa `private:true` ou `realtime.setAuth()`.

Laboratório: duas funções ACTIVE, `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não existe `upstatus-signal` em produção.

### Realtime e triggers PostgreSQL

Consulta de `realtime.messages`:
- 64 linhas no snapshot;
- 64/64 `private=false`;
- todas no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`;
- 20 `db_change`, 32 `user_status`, 6 `remote_command`, 6 `remote_result`;
- intervalo observado: 2026-11-09 12:02:26 UTC a 2026-11-10 17:04:15 UTC.

Os clientes Normal/Team Lite assinam tópico beta10, diferente do tópico usado pelos triggers. Os três triggers ativos chamam `realtime.send(..., false)`. `upstatus_broadcast_messages` publica `to_jsonb(OLD/NEW)` completo; `upstatus_broadcast_remote_state` publica campos de comando/resultado; `upstatus_broadcast_users` publica presença.

`realtime.messages`: RLS habilitado, zero policies; SELECT/INSERT/UPDATE concedidos a `anon` e `authenticated`. A configuração do Dashboard `Allow public access` não pôde ser consultada, portanto não houve prova de acesso externo real.

### RLS, grants, Default ACLs, SECURITY DEFINER e Storage

Produção:
- 10 tabelas públicas com RLS e sem policies;
- 9 tabelas públicas com grants diretos a papéis clientes, 126 linhas de grants no catálogo; privilégios incluem SELECT/INSERT/UPDATE/DELETE/TRUNCATE;
- 24 registros de Default ACL, 300 itens expandidos; 120 itens destinados a `anon`/`authenticated`;
- Default ACLs amplas de `postgres` em `public` e `storage`, e de `supabase_admin` em `public`, `graphql` e `graphql_public`.

Security Advisor de produção às 17:34:45 UTC:
- 10 INFO `rls_enabled_no_policy`;
- 3 WARN `anon_security_definer_function_executable`;
- 3 WARN `authenticated_security_definer_function_executable`.

As três funções são `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users`; são `SECURITY DEFINER`, `search_path=public`, retornam `trigger` e estão anexadas a triggers. O Advisor afirma EXECUTE via `/rest/v1/rpc/...` e o catálogo confirma os grants. Não fiz chamada RPC direta; a invocabilidade HTTP efetiva de funções que retornam trigger não foi demonstrada nesta auditoria.

Storage de produção:
- buckets `chat-images` e `profile-images`, ambos públicos, limite de 20 MiB;
- zero policies próprias em `storage.objects`;
- RLS habilitado e grants de cliente presentes.

Laboratório:
- 18 tabelas públicas com RLS, zero policies, zero grants diretos de tabela para `anon`/`authenticated`;
- 25 registros de Default ACL, 277 itens expandidos, 96 itens destinados a `anon`/`authenticated`;
- defaults de `postgres` em `storage` e de `supabase_admin` em `public`, `graphql`, `graphql_public` continuam amplos;
- zero buckets e zero objetos Storage;
- Security Advisor: 18 INFO, zero WARN.

O laboratório está isolado e sem fixtures, mas os defaults permissivos ainda podem conceder privilégios a objetos futuros. Zero grants diretos nas tabelas atuais não resolve esse risco de herança.

### AUTH-03 e migrations

Produção:
- 7 migrations remotas;
- branch Supabase `main`: `MIGRATIONS_FAILED`, preview `ACTIVE_HEALTHY`;
- zero colunas `setup_token_*`;
- zero tabela de rate limit de convites;
- zero tabela de rate limit de sinalização;
- zero RPC `consume_upstatus_setup_invite`;
- zero RPC `consume_upstatus_signal_rate_limit`.

Laboratório:
- 39 migrations;
- quatro colunas `setup_token_*`;
- tabela/RPC de rate limit de convites e sinalização presentes;
- zero usuários/fixtures, zero mensagens Realtime, zero buckets/objetos Storage.

A PR #135 recuperou quatro statements do ledger para `docs/migration-recovery/`, não para `supabase/migrations/`. Os quatro arquivos originais continuam ausentes da árvore de master. A recuperação por ledger não comprova bytes originais nem rollback; os registros de origem tinham rollback NULL. A PR #135 continua com Validate FAIL por `production updateURL mismatch`.

## Workflows de publicação

### Normal

O workflow atual de master é manual-only, mas não restringe explicitamente o dispatch a `refs/heads/master`, não confere SHA exato/projeto via Management API, usa CLI `latest` e publica somente `upstatus`.

O workflow candidato da #89 é mais forte: checkout SHA exato, exige master, verifica projeto/organização, migrations aplicadas, CLI 2.122.1 e publica beta10 antes de `upstatus`. Porém o build da #89 mantém dois runtimes (API beta10 + distribuição upstatus).

O workflow candidato da #133 adota runtime único `upstatus`, fixa CLI 2.122.1 e verifica SHA/projeto por variável, mas publica somente `upstatus` e não contém o mesmo preflight de migrations/organização da #89. As duas linhas ainda precisam de decisão arquitetural e contrato de migração de clientes; não combinar por cherry-pick sem reconciliação.

### Team Lite

O workflow atual de `team-lite-official` ainda executa `supabase functions deploy upstatus`, usa CLI `latest` e não valida projeto/SHA/migrations. O alvo correto é `upstatus-team-lite`. **Não despachar o workflow oficial atual.**

A #129 substitui o workflow legado por um bloqueio explícito, mas continua Draft. A #125 propõe dispatcher manual no master, com confirmação explícita, SHA exato de `team-lite-official`, PR merged/reviewed, checks completos, preflight de projeto/migrations e CLI 2.122.1. O teste offline do dispatcher passou, mas o Validate falha em `production updateURL mismatch` e o job deploy ficou SKIPPED. Nenhum dispatcher candidato foi integrado.

## Issues, aceitação manual e governança

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados. Nenhum teste de queda real de internet, retorno sem F5, reentrada, novas chamadas ou interoperabilidade instalada foi executado.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): corpo continua com 16/35 marcados e 19 pendentes; comentários mais recentes são checkpoints, portanto o corpo/checklist não é a fonte de estado mais atual.
- Nenhuma review humana nas PRs auditadas.
- Nenhuma aprovação explícita de release foi dada.

## Próximos passos prioritários

1. Tornar a sinalização autenticada fail-closed por padrão em Normal e Team Lite; não depender de flag manual opt-in.
2. Integrar #101 com #133/#134, rebasear sobre as bases atuais, adicionar check PR obrigatório e deploy controlado do endpoint `upstatus-signal`; não usar o laboratório como endpoint de produção.
3. Atualizar o runtime de teste implantado para o contrato HTTP atual e testar explicitamente HTTP 409 para `VOICE_ATTEMPT_ALREADY_ACTIVE`.
4. Aplicar/testar a migration de produção de rate limit em ambiente descartável, verificando limpeza limitada e concorrência; não assumir equivalência com migration de teste anterior.
5. Escolher uma única topologia Normal e alinhar build, release.json, manifesto, API, deploy e estratégia de compatibilidade.
6. Corrigir dispatcher Team Lite antes de qualquer execução.
7. Recuperar proveniência dos quatro SQLs originais e diagnosticar `MIGRATIONS_FAILED`.
8. Endurecer grants, Default ACLs, SECURITY DEFINER e Storage com revisão do owner; decidir privacidade e limites.
9. Corrigir o validator QA sem relaxar o contrato de updateURL.
10. Após integração e aprovação humana, executar os oito critérios físicos da #78.

## Veredito

**NOT READY / `not_ready`.**

O CI dos candidatos Normal #133 e Team Lite #134 está verde, mas a configuração default ainda deixa sinalização pública ativa, o endpoint server-mediated não está implantado nem ligado aos clientes, a fonte do runtime de laboratório diverge no mapeamento HTTP 409, a migration exata de produção não foi exercitada no laboratório e a produção mantém exposição Realtime/grants/Storage.

Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizada. A única escrita desta auditoria é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79; o comentário da Engenharia foi preservado.
