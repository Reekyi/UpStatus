# Auditoria independente de qualidade do UpStatus — 2026-11-10 09:40 UTC

## Parecer

**Recomendação de release: `not_ready`.** As candidatas limpas #133 (Normal) e #134 (Team Lite) corrigem a origem falsificável dos sinais de chamada fora do payload. A #133, porém, ainda falha no Smoke PR-triggered por uma asserção estática herdada que exige o comportamento público antigo; o Validate de destino API passou. A #134 passou somente no guard offline focado, sem execução da suíte completa Candidate Checks no HEAD atual.

A produção permanece materialmente diferente das candidatas: tópicos Realtime públicos, clientes sem autorização de canal privado, setup sem convite, permissões amplas e migrations de hardening ausentes. Não houve teste físico nem aprovação humana.

## Escopo e segurança da auditoria

- GitHub: leitura de PRs, diffs, branches, commits, checks, logs, reviews e issues; uma escrita documental somente na branch QA dedicada.
- Supabase: consultas SELECT/catalog, lista de migrations, Edge Functions e Security Advisor.
- Não houve INSERT/UPDATE/DELETE/DDL, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags, nem operação destrutiva.
- Não executei chamadas de exploração, upload de prova ou testes físicos em produção.

## Heads e ancestralidade confirmados

- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- Branch QA / PR #82: `fca55f808e3faab6fcf3b7d75b3b644b8a15ea7d`.
- Normal #74 / `chore/continuity-foundation`: `fb878537d95db9097cce6d29a14260b9fd8d2e3d`.
- Team Lite #75: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`.
- Team Lite #76: `3b1406ddb56aecfa5b5515791ca99aea92c305ab`.
- AUTH-03 #131: `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b`.
- API target #132: `74d787ba903fc05be38586b5ad7385c3cbef34cb`.
- Normal combinado #133: `b64b948644b161a5f8a2ccaeddafcac0bda4cce4`.
- Team Lite combinado #134: `05cc7529419cdb5a147b44189983fb0d590aeae9`.

Comparações:
- #74: 883 commits à frente e 1 atrás de `master`; branch divergida, reconciliação necessária antes de merge.
- #76: 378 commits à frente e 0 atrás de `team-lite-official`.
- #133: 10 commits à frente e 0 atrás da base #74.
- #134: 8 commits à frente e 0 atrás da base #76.
- QA: 184 commits à frente e 1 atrás de `master`; não fiz rebase para evitar sobrescrever trabalho concorrente.

As PRs #74, #75, #76, #82, #131, #132, #133, #134 e #129 permanecem abertas e Draft. As reviews consultadas para #74, #75, #76, #82, #131, #132, #133, #134 e #129 retornaram vazias; não há aprovação humana registrada.

## CI, inspeção e falhas

### Candidatos principais

- **#74 Normal, HEAD `fb878537`:**
  - Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411): SUCCESS.
  - Signaling Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336): SUCCESS.
  - O Smoke aprovou checks não autenticados, integração autenticada, WebRTC de chamada/voz/tela, mesh de três participantes, encerramento e limpeza.
  - Limitação exata: o step de rate limit de emissão de convites foi SKIPPED porque o harness não existia nesse HEAD. Não atribuir esse resultado ao #131.

- **#75 Team Lite baseline, HEAD `7bbf9b90`:**
  - Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS histórico. Não representa a candidata Team Lite atual.

- **#76 Team Lite, HEAD `3b1406dd`:**
  - Candidate Checks [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373): SUCCESS.
  - 16/16 checks não autenticados e 110/110 autenticados.
  - Passaram contratos de sinalização, enrollment, recuperação de tentativa de sala/voz/tela, Playwright da IIFE completa, rate limit distribuído, recibos atômicos, convite de uso único, emissão concorrente de convites e limpeza de fixtures.

- **#82 QA, HEAD `fca55f80`:**
  - Validate [42784887499](https://github.com/Reekyi/UpStatus/actions/runs/42784887499): FAILURE.
  - Log: `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`.
  - O commit documental seguinte ainda não possui check próprio.

### Candidatas combinadas recém-abertas pela Engenharia

- **#131 AUTH-03 Normal**, HEAD `17169a30`: Signaling Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) SUCCESS. Testou 24 solicitações concorrentes (5 permitidas/19 bloqueadas), bucket de segundo administrador (5/1), isolamento entre buckets, reset da janela, consumo atômico de convite e cleanup. Não cobre rate limit de tentativas de login nem implantação.

- **#132 API target Normal**, HEAD `74d787ba`: Validate [42773004553](https://github.com/Reekyi/UpStatus/actions/runs/42773004553) SUCCESS. O build deriva `CLOUD_SERVER` de `PROD_FUNCTION` e o validator compara o destino do userscript com o slug publicado pelo workflow. PR Draft separada.

- **#133 Normal combinado**, HEAD `b64b9486`: incorpora as correções de destino API da #132 e proveniência fora do payload da #102.
  - API Target Candidate Validation [42789826026](https://github.com/Reekyi/UpStatus/actions/runs/42789826026): SUCCESS.
  - Signaling Smoke [42789826037](https://github.com/Reekyi/UpStatus/actions/runs/42789826037): FAILURE antes dos testes autenticados.
  - Job [129740140859](https://github.com/Reekyi/UpStatus/actions/runs/42789826037) falhou em `scripts/signaling-static.test.mjs:368`, com a asserção “legacy public group decisions remain isolated behind the disabled-by-default transport flag”.
  - Inspeção do teste na branch #133 confirmou que ele ainda exige `join_declined` dentro da allowlist pública e o antigo ramo público como parte do contrato. O código candidato, corretamente, limita hints públicos a `presence` e `ended`; quando o transporte autenticado está habilitado, group decline usa `callSendTo` e falha fechado sem room mapping. Portanto, a evidência aponta para teste estático desatualizado em relação à política nova, não para prova de falha de runtime. A falha continua sendo falha de CI e precisa ser corrigida no teste antes de aprovar a PR.
  - Próxima regressão esperada: afirmar que `join_declined` não é allowlisted publicamente e que o caminho autenticado entrega o decline por `callSendTo`; manter explícito que o fallback público só existe com o transporte autenticado desabilitado.

- **#134 Team Lite combinado**, HEAD `05cc7529`:
  - Authenticated Call Source Guard [42789331083](https://github.com/Reekyi/UpStatus/actions/runs/42789331083): SUCCESS.
  - Passaram política do adapter, guard de origem e contratos estáticos Team Lite.
  - Este run é offline/focado. Não encontrei Candidate Checks completos nem Playwright/integração autenticada no HEAD exato #134. A suíte completa do parent #76 não substitui uma execução no child HEAD.

- **#102 Normal source guard** [42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669), **#103 Team Lite source guard** [42554766818](https://github.com/Reekyi/UpStatus/actions/runs/42554766818) e **#104 RT-01 release guard** [42524476674](https://github.com/Reekyi/UpStatus/actions/runs/42524476674) passaram seus testes offline. Permanecem PRs separadas; #133/#134 são as candidatas combinadas atuais.

## Proveniência dos sinais e compatibilidade

A correção em #133/#134 remove `_authenticatedTransport` do payload e passa a proveniência fora de banda como segundo argumento de `receiveCallSignal(payload, authenticatedSource)`. Polling/invites autenticados passam `true`; o listener Realtime público passa `false`.

A allowlist pública fica restrita a propriedades próprias `presence` e `ended` com `discoveryOnly: true`. O evento público `ended` só remove entrada do diretório; não encerra chamada ativa. `join_declined`, offer, answer e ICE não são hints públicos autorizados.

Limitações explícitas nas PRs:
- Isso não habilita transporte autenticado por padrão.
- `presence` e `ended` continuam hints de descoberta não confiáveis e podem enganar/ocultar entradas do diretório.
- A substituição da descoberta pública e o cutover server-mediated continuam pendentes.
- Não há mudança correspondente em produção.

## Supabase — produção `dlfvkawaiqduhlazsszm`

Projeto ACTIVE_HEALTHY. A lista retornou 38 Edge Functions ACTIVE; as 38 reportam `verify_jwt=false`. Isso não prova que todas estejam sem autenticação: os runtimes principais possuem autenticação própria por token. Não auditei individualmente todos os 38 handlers.

Runtimes lidos diretamente:
- `upstatus`: v480, userscript embutido 3.4.7; API ainda aponta para `upstatus-screen-share-3-1-1-beta10`; tópico `upstatus-screen-share-live-3-1-1-beta10`.
- `upstatus-team-lite`: v15, userscript embutido 3.4.30; API aponta para `upstatus-team-lite`; tópico ainda beta10.
- `upstatus-screen-share-3-1-1-beta10`: v6, userscript embutido 3.1.1-beta8; API aponta para o endpoint beta8; tópico beta8.
- Os três bundles lidos não usam `private: true` nem `realtime.setAuth()`.
- Os três handlers mantêm `POST /api/setup` encaminhado para `login(req,true)`.
- Não há colunas `setup_token_*`, RPC de consumo de convite nem tabela de rate limit de convites em produção.
- Não existe Edge Function de produção `upstatus-signal`.

### Realtime

Consulta SELECT ao histórico de `realtime.messages`, recorte de 24 horas:
- 39 mensagens; todas `private=false`.
- `db_change`: 20.
- `user_status`: 13.
- `remote_command`: 3.
- `remote_result`: 3.

Os triggers continuam publicando no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. A função de mensagens serializa a linha completa com `to_jsonb`; remote-state publica metadados de comando/resultado; users publica campos de status.

As três funções `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` são `SECURITY DEFINER`, têm `search_path=public` e EXECUTE efetivo para `anon`, `authenticated` e `service_role`. O Security Advisor observou 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. As funções retornam `trigger`; não executei nem demonstrei chamada RPC bem-sucedida.

`realtime.messages`: RLS habilitado, zero policies e SELECT concedido a anon/authenticated. O transporte continua público.

### RLS, grants e Default ACL

Consulta de catálogo encontrou 10 tabelas públicas com RLS e sem policies:
`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `upstatus_visual_config`, `users`.

Nove tabelas backend-owned mantêm grants diretos para anon/authenticated de SELECT, INSERT, UPDATE, DELETE e TRUNCATE. `upstatus_visual_config` é a exceção sem esses grants. RLS sem policies nega operações de linha via RLS; TRUNCATE não é filtrado por RLS, portanto o privilégio continua desnecessário e precisa de revisão.

Default ACL: seis registros (dois owners × três tipos de objeto) e 24 itens ACL. Para owners postgres e supabase_admin, defaults no schema public incluem anon/authenticated:
- sequences: `rwU`;
- functions: `X` (EXECUTE);
- tables: `arwdDxtm` (inclui TRUNCATE).
Isso propaga privilégios amplos para objetos futuros.

### Storage

- `storage.objects`: RLS habilitado, zero policies; SELECT/INSERT/UPDATE/DELETE concedidos a anon e authenticated.
- Buckets `chat-images` e `profile-images` continuam públicos, limite de 20 MiB.
- O upload assinado inspecionado anteriormente confia em MIME/tamanho declarados pelo cliente e não inspeciona os bytes reais antes de emitir URL; nenhum upload de teste foi executado nesta rodada.

## Projeto isolado `bfpjtfqlnypisxljoxkb`

- ACTIVE_HEALTHY; 39 migrations.
- Edge Functions de teste: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- 18 tabelas públicas consultadas retornaram zero linhas: users, sessions, messages, chat_reads, reactions, status_history, profiles, state, typing, setup invite rate limits, signal call attempts/events/rate limits/room bindings/room members/rooms/voice attempts e visual config.
- Security Advisor: 18 INFO de RLS habilitado sem policy; nenhum WARN de SECURITY DEFINER foi retornado.
- O laboratório não é um ambiente full-product TEST independente; há apenas dois projetos Supabase cadastrados (produção e laboratório).

## Migrations e proveniência

- Produção: 7 migrations remotas.
- Branch gerenciada Supabase `main`: `MIGRATIONS_FAILED`.
- Laboratório: 39 migrations.
- A migration de contrato isolado de rate limit `20261110000612_setup_invite_rate_limit_contract_test_20261109` está no laboratório; a migration candidata original de produção `20261109230000` não foi aplicada em produção.
- Os quatro arquivos SQL históricos abaixo retornam 404 em `master`:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- Não reconstruí SQL nem apliquei migrations.

## Issues e aceitação manual

- Issue #78 permanece aberta; todos os oito checkboxes físicos seguem desmarcados. Últimos comentários de engenharia consultados são de 08/11. Nenhum teste Tampermonkey de queda real de internet, reconexão sem F5, microfone/tela reais ou interoperabilidade instalada foi apresentado.
- Issue #79 mantém um comentário dedicado QA e um comentário separado da Engenharia. O comentário da Engenharia foi preservado.
- Sem teste manual físico nesta execução.

## Leitura de docs/RELEASE_READINESS.md

O blob atual na branch QA é `7cfbd70886df42ce790c078224b19284a632595`; a comparação confirma 8.409 linhas. Nesta execução, `fetch_file` retornou conteúdo vazio tanto para intervalos iniciais/finais quanto para base64; a leitura raw foi rejeitada pelo tamanho. Portanto, não afirmo uma nova leitura integral nesta rodada. O checkpoint anterior com leitura integral continua como referência; a limitação de recuperação atual foi registrada.

## Próximos passos recomendados

1. Atualizar `scripts/signaling-static.test.mjs:368` para refletir a nova allowlist: somente `presence`/`ended` públicos; validar decline autenticado e fallback somente com transporte desabilitado.
2. Reexecutar o Smoke completo da #133 no HEAD final; exigir Candidate Checks completos e Playwright no HEAD #134.
3. Reconciliar #74 (883 ahead/1 behind master) e #76 (378 ahead/0 behind official) sem sobrescrever trabalho concorrente; manter PRs Draft até revisão.
4. Fazer cutover coordenado de API/Edge Function e transporte Realtime privado/server-mediated, com autenticação de origem por canal/evento, plano de rollback e validação cruzada.
5. Fechar AUTH-03 em produção somente após autorização, migration provenance e implantação coordenada; adicionar rate limit de login/setup.
6. Recuperar os quatro SQLs originais e validar histórico exato antes de qualquer migração.
7. Revisar grants de tabelas, Default ACL, SECURITY DEFINER e Storage em ambiente isolado; não adicionar policies amplas só para silenciar Advisor.
8. Manter Issue #78 aberta até confirmação física dos oito critérios; obter revisão humana explícita antes de qualquer release.

## Veredito final

**`not_ready`.** As correções #133/#134 melhoram a fronteira de confiança no código candidato, mas a #133 ainda tem Smoke vermelho por regressão estática incompatível com a nova política e a #134 ainda não tem suíte completa no HEAD exato. Produção segue pública/legada nos pontos críticos. Nenhuma alteração de produção foi realizada.
