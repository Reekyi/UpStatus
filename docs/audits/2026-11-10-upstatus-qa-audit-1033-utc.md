# Auditoria independente de qualidade do UpStatus - 2026-11-10 10:33 UTC

## Parecer

**Recomendação: `not_ready`.** As duas correções de proveniência avançaram e agora há evidência mais forte: a candidata Normal #133 passou no Smoke PR-triggered e no Validate de destino API; a Team Lite #134 passou na suíte completa Candidate Checks no HEAD exato e no guard PR-triggered. Isso corrige a avaliação da rodada anterior, que estava baseada em resultados intermediários.

A produção continua sem o cutover autenticado, com setup legado, broadcasts públicos, grants/Default ACLs amplos, Storage público e histórico de migrations incompleto. Nenhum teste físico foi executado.

## Escopo e método

- Releitura integral de `docs/RELEASE_READINESS.md` na branch QA: blob `7cfbd70886df42ce790c078c224b19284a632595`, 8.410 linhas. O último checkpoint interno continua em 2026-11-08 18:30 UTC.
- Revalidação dos heads e metadados das PRs #74, #75, #76, #82, #129, #131, #132, #133 e #134; comparação de commits, workflows, jobs, steps, logs, diffs e reviews.
- Supabase: inventário de migrations e Edge Functions, Security/Performance Advisor e consultas SELECT/catalog-only de RLS, policies, grants, Default ACLs, funções, Storage e Realtime.
- Nenhuma escrita SQL, migration, deploy, merge, release, publicação, alteração de secret/flag ou operação destrutiva. A única escrita desta rodada é este arquivo novo na branch QA e a atualização do comentário QA na Issue #79.

## Heads reais e governança

- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA / PR #82 antes deste relatório: `0f6cefd859a227b7888cb825e1d928ebfa0b12a3`.
- Comparação QA vs master antes deste relatório: 185 commits à frente e 1 atrás. Não fiz rebase.
- #74 Normal: `fb878537d95db9097cce6d29a14260b9fd8d2e3d`.
- #75 Team Lite baseline: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`.
- #76 Team Lite: `3b1406ddb56aecfa5b5515791ca99aea92c305ab`.
- #82 QA: `0f6cefd859a227b7888cb825e1d928ebfa0b12a3`.
- #129 Deploy Guard: `886d364d0c43af0d8aed867bf04c407478af5e8f`.
- #131 AUTH-03 Normal: `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b`.
- #132 API Target Normal: `74d787ba903fc05be38586b5ad7385c3cbef34cb`.
- #133 Normal combinado: `ff819b35a7570fc15ed1030907ca533f1947736e`, 13 commits à frente e 0 atrás da base #74.
- #134 Team Lite combinado: `e03d2d7ef9c4d68ab6f1c345beb0c9bf26d4e3dd`, 9 commits à frente e 0 atrás da base #76.

As PRs auditadas continuam abertas, Draft e unmerged. Reviews de #74, #75, #76, #82, #133 e #134 retornaram vazias. As branches `master` e `team-lite-official` reportam `protected=false`; a consulta de rulesets retornou lista vazia. Não há proteção de branch/status checks obrigatórios demonstrada nesta inspeção.

Os corpos das PRs #133 e #134 ainda citam heads intermediários (`b64b948` e `8e0ed094`), não os heads atuais `ff819b35` e `e03d2d7`. Atualizar a descrição de validação é necessário para manter a trilha de revisão coerente.

## CI e inspeção dos candidatos

### Normal #133

- HEAD exato: `ff819b35a7570fc15ed1030907ca533f1947736e`.
- [Signaling Smoke PR run 42795748236](https://github.com/Reekyi/UpStatus/actions/runs/42795748236): **SUCCESS**, evento `pull_request`, no HEAD exato.
- [API Target Validate PR run 42795748308](https://github.com/Reekyi/UpStatus/actions/runs/42795748308): **SUCCESS**, evento `pull_request`, no HEAD exato.
- O Smoke passou por 136/136 verificações autenticadas, checks estáticos de proveniência/descoberta pública, integração autenticada e WebRTC real de navegador para chamada, voz e vídeo de tela; mesh de três participantes e teardown passaram.
- A regressão antiga em `scripts/signaling-static.test.mjs` foi corrigida: a allowlist pública agora exige `presence` ou `ended`; `join_declined` deve usar transporte autenticado. O teste atualizado passou no Smoke atual.
- **Limitação:** os steps `Syntax-check setup invite rate-limit harness when present` e `Verify distributed setup-invite issuance rate limit` foram SKIPPED. O limiter Normal da #131 passou em branch separada ([run 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798)), mas não está combinado e validado neste HEAD #133.

### Team Lite #134

- HEAD exato: `e03d2d7ef9c4d68ab6f1c345beb0c9bf26d4e3dd`.
- [Candidate Checks run 42795427112](https://github.com/Reekyi/UpStatus/actions/runs/42795427112): **SUCCESS**, evento `push`, no HEAD exato.
- [Authenticated Call Source Guard PR run 42795443953](https://github.com/Reekyi/UpStatus/actions/runs/42795443953): **SUCCESS**, evento `pull_request`, no HEAD exato.
- Candidate Checks: 16/16 verificações não autenticadas, 110/110 autenticadas e 11/11 contratos HTTP offline passaram.
- Também passaram Playwright Full-IIFE com GM/Tampermonkey stubs, integração isolada autenticada, WebRTC de chamada/voz/tela, mesh de três participantes, teardown, rate limit de sinalização (90 aceitas e 1 HTTP 429 com Retry-After 60s), consumo único de convite, rate limit distribuído de emissão de convites, isolamento de buckets por administrador e limpeza das fixtures.
- **Limitação de governança:** a suíte completa Candidate Checks foi executada em evento `push`. O workflow de Candidate Checks filtra PRs com base `team-lite-official`, mas a #134 tem base intermediária `team-lite/signaling-transport-candidate`. O PR check executa o guard focado, não a suíte completa. O PASS de push é evidência real do SHA, mas não equivale a um check obrigatório da PR.

### PRs-base e QA

- #74: [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS no head atual da branch-base. Esses testes não contêm as correções adicionais #133.
- #76: [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) SUCCESS no head atual da branch-base. O head não contém o port de proveniência #134.
- #75: PASS histórico no baseline, sem substituir #76.
- #82: [Validate 42792636708](https://github.com/Reekyi/UpStatus/actions/runs/42792636708) **FAIL** no HEAD exato `0f6cefd`: `production updateURL mismatch` em `scripts/validate.mjs:26`.

A causa do validator foi reproduzida por inspeção de código no master: `release.json` aponta `scriptUrl` para `/functions/v1/upstatus/upstatus.user.js`, mas `scripts/build.mjs` ainda gera o `CLOUD_SERVER` de produção apontando para `upstatus-screen-share-3-1-1-beta10`. O validator exige que o `@updateURL` gerado inclua `/upstatus/upstatus.user.js`. A #133 corrige o build candidato derivando o destino de `PROD_FUNCTION`; essa correção ainda não está integrada no master/#74.

## Proveniência de sinais e compatibilidade Normal/Team Lite

A inspeção dos diffs atuais confirma que #133 e #134:
- removem `_authenticatedTransport` do payload controlado pelo remetente;
- passam a origem autenticada fora de banda para `receiveCallSignal(payload, authenticatedSource)`;
- fazem o listener público passar explicitamente `false`;
- aceitam como hints públicos somente propriedades próprias `presence` e `ended`, com `discoveryOnly: true`;
- não aceitam publicamente `join_declined`, offer, answer ou ICE;
- limitam `ended` público à remoção da entrada do diretório, sem encerrar uma chamada ativa.

A correção agora tem evidência de CI completa em Normal e Team Lite nos respectivos candidatos. Isso é uma melhoria concreta. Ainda não fecha RT-01: `signaling_transport_enabled` continua default `false`, o transporte autenticado permanece opt-in e o caminho legado público continua necessário enquanto o cutover não for coordenado. Não houve teste de spoofing externo nem teste físico.

## Produção Supabase: Edge Functions e bundles

Projeto de produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 38 Edge Functions ACTIVE. Todas reportam `verify_jwt=false`; isso, isoladamente, não prova ausência de autenticação, pois os runtimes principais usam autenticação customizada. Não auditei individualmente todos os 38 handlers.

Runtimes operacionais inspecionados:
- `upstatus` v480: userscript embutido 3.4.7. O `CLOUD_SERVER` ainda aponta para `upstatus-screen-share-3-1-1-beta10`, enquanto `@updateURL` e `@downloadURL` apontam para `/functions/v1/upstatus/upstatus.user.js`.
- `upstatus-team-lite` v15: userscript embutido 3.4.30; API aponta para `upstatus-team-lite`, mas o tópico Realtime continua beta10.
- `upstatus-screen-share-3-1-1-beta10` v6: embute userscript 3.1.1-beta8; API e tópico embutidos apontam para beta8.
- `upstatus-test` v281 continua dentro do próprio projeto de produção, não em um terceiro projeto full-product TEST.
- Não existe Edge Function `upstatus-signal` de produção. O projeto isolado contém `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

Os três runtimes operacionais ainda roteiam `POST /api/setup` para `login(req,true)`. O catálogo de produção não contém colunas `setup_token_*`, tabela de rate limit de convites, RPC de consumo ou rotinas de convite. AUTH-03 ainda não foi implantado.

## Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

- SELECT-only em `realtime.messages`: 39 mensagens UpStatus nas últimas 24h, 39/39 com `private=false`, em um único tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Eventos: 20 `db_change`, 13 `user_status`, 3 `remote_command`, 3 `remote_result`.
- Triggers publicam nesse tópico; Normal/Team Lite implantados continuam no tópico beta10 e o beta10 embutido assina beta8. Há incompatibilidade de tópico e transporte público.
- Os clientes implantados não usam `private:true` nem `realtime.setAuth()`.

### PostgreSQL

- Dez tabelas públicas com RLS habilitado e zero policies.
- Nove tabelas backend-owned concedem privilégios diretos amplos a `anon` e `authenticated`, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE. `upstatus_visual_config` é a exceção sem esses grants.
- Seis Default ACL entries no schema public, criadas por `postgres` e `supabase_admin`, abrangem tabelas, funções e sequências; incluem grants para `anon` e `authenticated` (tabelas com `arwdDxtm`, funções EXECUTE, sequências SELECT/UPDATE/USAGE).
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` continuam SECURITY DEFINER com `search_path=public` e EXECUTE efetivo para anon/authenticated. Todas retornam `trigger`; não alego que sejam RPCs comuns diretamente invocáveis. O Advisor aponta 3 WARN por papel, total 6.

### Storage

- `storage.objects`: RLS habilitado, zero policies; anon/authenticated têm SELECT/INSERT/UPDATE/DELETE efetivos no catálogo.
- Buckets `chat-images` e `profile-images` são públicos, limite 20 MiB cada.
- O upload assinado ainda precisa de revisão de validação de bytes/MIME e política de privacidade. Não fiz upload de teste.

Security Advisor de produção observado em 2026-11-10 10:33 UTC: 10 INFO de RLS sem policy, 3 WARN de SECURITY DEFINER para anon e 3 WARN para authenticated. Performance Advisor retornou zero findings.

## Migrations e isolamento

- Produção: 7 migrations remotas.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations e duas Edge Functions de teste.
- No laboratório, SELECT-only confirmou zero linhas em `realtime.messages`, `public.users`, `public.messages` e `public.upstatus_sessions`.
- Quatro SQLs ainda retornam 404 em master:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- O laboratório é isolado e útil para integração, mas não é um terceiro ambiente full-product TEST independente.

## Issues e aceitação manual

- Issue #78 continua aberta; os oito critérios físicos permanecem sem aprovação (0/8). O último comentário de engenharia é de 2026-11-08. Não houve teste real de Tampermonkey, queda de internet, recuperação sem F5, microfone/display-capture físicos ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 permanece aberta. O comentário dedicado QA foi atualizado sem criar duplicata e o comentário da Engenharia foi preservado.

## Próximos gates

1. Portar o rate limit de emissão de convites da #131 para o candidato Normal #133 e executar o Smoke completo no HEAD combinado.
2. Ajustar o workflow Candidate Checks Team Lite para produzir check PR-triggered também quando a base for a branch intermediária da #134; manter o PASS de push como evidência adicional.
3. Integrar #133/#134 somente após review de código e validação de ancestralidade; atualizar os corpos das PRs para os heads atuais.
4. Tornar o transporte autenticado default seguro, alinhar tópico e implantação server-mediated, remover controles públicos sensíveis e planejar cutover/rollback.
5. Recuperar os quatro SQLs originais e reconciliar o histórico de migrations antes de qualquer rollout.
6. Corrigir grants e Default ACLs, endurecer funções trigger e definir Storage privado/policies/limites.
7. Corrigir o validator no fluxo QA sem relaxar a proteção de updateURL.
8. Obter review humana e só então planejar aceitação física dos oito critérios da Issue #78.

**Conclusão: não liberar.** Os candidatos #133/#134 avançaram de verdade; a produção e a governança de release ainda não satisfazem os gates. Nenhuma alteração de produção foi feita.
