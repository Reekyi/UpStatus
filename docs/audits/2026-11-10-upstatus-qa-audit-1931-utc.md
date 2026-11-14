# UpStatus — auditoria independente de QA
**Execução:** 2026-11-10T19:38:46.166Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`

## Escopo e limites

Auditoria read-only de GitHub e Supabase. Não houve deploy, merge, migration, publicação de userscript, alteração de secrets/flags, gravação SQL ou teste mutável. Os resultados de CI abaixo foram lidos dos workflows existentes; nenhum workflow ou teste foi disparado pela QA nesta execução. Não houve teste manual em navegador/Sale Smartly.

## Checklist de release e heads

Li integralmente `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master` pela API de conteúdo do GitHub. Blob observado: `7cfbd708`; 8.409 linhas. A última seção datada do documento é de 2026-11-08 15:30 BRT (18:30 UTC), portanto o documento principal não contém as evidências desta rodada de 10/11.

Heads e comparação de ancestralidade consultados:

| Referência | HEAD | Comparação observada |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | Base de referência |
| `qa/release-readiness-2026-11-04-master` / PR #82 | `1a609c2baa1009a7c80817469fd8d55654715963` | 200 à frente, 1 atrás de master |
| PR #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Divergida: 883 à frente, 1 atrás de master |
| PR #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Baseline histórica |
| `team-lite-official` / PR #76 | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | 378 à frente, 0 atrás da base oficial |
| PR #89 AUTH-03 | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` | 37 à frente da base de cutover |
| PR #101 sinalização | `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7` | Candidato separado; sem check PR no HEAD |
| PR #133 Normal | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` | 14 à frente de #74, 0 atrás |
| PR #134 Team Lite | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` | 10 à frente de #76, 0 atrás |
| PR #135 recuperação documental | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` | Validate falha |
| PR #137 cleanup | `73cf0461b8f173277a18e1d2525e8d5ea7aa5526` | Sem check PR no HEAD; mergeable=false |
| PR #139 bootstrap de CI | `be0d10e7c5208f23b4769614c5ac33bba938a91a` | 1 commit à frente da base |

As reviews consultadas para #74, #75, #76, #82, #89, #101, #133 e #134 retornaram vazias. A consulta de rulesets retornou `[]`; a API de branch protection para `master` respondeu 403, então a proteção de branch não pôde ser verificada.

## CI, inspeção e falhas

### Linhas principais

- **#74 Normal:** [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) e [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) passaram no HEAD consultado. O log do Smoke confirma 136/136 verificações autenticadas, WebRTC de chamada/voz/tela em navegador, mesh de três membros, rate limit distribuído (90 aceitas + 1 HTTP 429), recibos de leitura atômicos, AUTH-03 no laboratório e limpeza das fixtures.
- **#75 Team Lite baseline:** [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é PASS histórico. Não trato essa baseline como equivalente à suíte atual de #76.
- **#76 Team Lite:** [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) passou no HEAD consultado. A linha ativa de compatibilidade é #76 e sua filha #134.
- **#82 QA:** [Validate 42877555468](https://github.com/Reekyi/UpStatus/actions/runs/42877555468) falhou. Log: `Built UpStatus 3.4.7 / TEST 3.4.7`, seguido de `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`.
- **#89 AUTH-03/cutover:** [Guard 42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) passou como workflow de candidato. O log termina explicitamente em `PRODUCTION CUTOVER BLOCKED`: versão estável precisa ser maior que 3.4.7 e as migrations AUTH-03 obrigatórias ainda não estão aplicadas em produção.
- **#133 Normal:** [API Target Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) e [Signaling Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) passaram. O Smoke confirma 136/136 autenticadas, WebRTC call/voice/screen, mesh, rate limits e cleanup.
- **#134 Team Lite:** [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298) e [Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252) passaram. Candidate Checks confirma 110/110 autenticadas, 16/16 não autenticadas, 11/11 contratos HTTP e Playwright Full-IIFE. Isso é CI com stubs, não aceitação física.
- **#135:** [Validate 42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) falhou novamente no `production updateURL mismatch`.
- **#101:** não há workflow PR-triggered no HEAD consultado.
- **#139:** [push run 42851899626](https://github.com/Reekyi/UpStatus/actions/runs/42851899626) passou no bootstrap/offline Validate, mas o log emite notice: `Production signaling source is not part of this base yet; parity validation will run when the candidate PR introduces it.` Portanto esse PASS não valida a paridade do código #101 nem cria check PR para #101.
- **#137:** não há workflow PR-triggered no HEAD consultado; o PR permanece `mergeable=false`.

## Achados de arquitetura e publicação

### 1. Contrato Normal incompatível entre #89 e #133

O workflow da #89 é manual, exige `master` e SHA exato, valida projeto/organização, fixa Supabase CLI 2.122.1, verifica o histórico remoto de migrations em modo read-only e exige o guard de cutover. Ele publica, nesta ordem:

1. `upstatus-screen-share-3-1-1-beta10`
2. `upstatus`

Entretanto, o workflow da #89 **não publica `upstatus-signal`**, função nova adicionada pela #101.

O workflow da #133 segue outro desenho: runtime único `upstatus`, sem o guard de cutover da #89. Além disso, seu workflow aceita somente `release.json.version === 3.4.7`, enquanto o guard da #89 exige versão estável semanticamente superior a 3.4.7. A #133 mantém `release.json` em 3.4.7 e aponta o updateURL para `/functions/v1/upstatus/upstatus.user.js`. Essa condição não permite um cutover coerente com o guard de versão da #89 e arrisca distribuir código alterado com o mesmo número de versão.

A topologia também diverge: produção ainda usa API beta10 separada, enquanto #133 gera API e distribuição no runtime `upstatus`. É necessária uma única arquitetura aprovada, com plano de compatibilidade para clientes já instalados.

### 2. Team Lite oficial ainda aponta para o runtime errado

O workflow em `team-lite-official` faz `supabase functions deploy upstatus`, usa CLI `latest`, não fixa o checkout no SHA exato e não valida o project ref esperado. O runtime Team Lite correto é `upstatus-team-lite`. Não executar esse dispatcher atual.

### 3. Transporte autenticado ainda não é default e não está no cutover

Na #133, `src/userscript/signaling-transport.mjs` declara `enabled = false`. O userscript lê `GM_getValue(key+'signaling_transport_enabled', false) === true` e o endpoint começa vazio. Quando a flag permanece desligada, o código conserva o caminho Realtime legado para eventos de chamada, voz e compartilhamento de tela. Portanto o CI prova os caminhos autenticados quando habilitados, mas não prova um produto seguro por padrão.

A #101 adiciona `supabase/functions/upstatus-signal/index.ts` com autenticação por token, membership, rate limit e validação server-side. Porém:
- a função não existe entre as 38 Edge Functions de produção;
- o workflow #89 não a publica;
- o workflow #133 também não a publica como função separada;
- o cliente #133/#134 continua default-off;
- #101 não tem check PR no HEAD atual.

### 4. Drift entre fonte candidata e runtime de laboratório

A fonte #101 mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409 em `/room/open`. A Edge Function implantada `upstatus-signal-test` v32 no laboratório não contém esse mapeamento. O teste de helper não valida o contrato HTTP da função já implantada. É necessário alinhar o runtime do laboratório e adicionar teste HTTP contra o handler implantado, incluindo esse código de erro.

A PR #139 é somente o bootstrap do workflow na base: seu próprio log pula a verificação de paridade porque o código de produção ainda não está nessa base. Isso é esperado pelo desenho descrito no PR, mas não pode ser contabilizado como validação de #101.

## Supabase — produção

Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`. A branch gerenciada `main` está em `MIGRATIONS_FAILED`, com 7 migrations remotas; a última é `20261027155438`.

### Edge Functions e artefatos implantados

Há 38 Edge Functions ativas, todas com metadata `verify_jwt=false`. Isso não prova ausência de autenticação: os handlers principais fazem validação customizada. As funções relevantes são:
- `upstatus` v480, userscript embutido 3.4.7;
- `upstatus-team-lite` v15, userscript embutido 3.4.30;
- `upstatus-screen-share-3-1-1-beta10` v6, código de servidor declara versão embutida 3.1.1-beta8;
- `upstatus-test` v281, dentro do próprio projeto de produção.

Extraí os userscripts embutidos das duas funções principais:
- Normal 3.4.7: updateURL em `/upstatus/upstatus.user.js`, API em `upstatus-screen-share-3-1-1-beta10`, tópico `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite 3.4.30: updateURL no artefato raw de `team-lite-official`, API em `upstatus-team-lite`, tópico também `upstatus-screen-share-live-3-1-1-beta10`.

Nenhum dos dois usa `private: true` ou `realtime.setAuth()`; ambos mantêm listeners públicos para `call_signal` e eventos de comando/voz/tela. Não houve teste de exploração nem confirmação de entrega a um assinante externo.

### Realtime

Consulta read-only em `realtime.messages`: **66 linhas, 66 com `private=false`**, todas no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 34 `user_status`
- 20 `db_change`
- 6 `remote_command`
- 6 `remote_result`

`realtime.messages` concede SELECT/INSERT/UPDATE a `anon` e `authenticated` e não tem policies próprias. Isso é evidência de configuração e persistência, não demonstração de exploração externa.

### RLS, grants, SECURITY DEFINER e Storage

- 10 tabelas públicas têm RLS habilitado e zero policies.
- 9 tabelas públicas têm grants diretos para `anon` e/ou `authenticated`, incluindo DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- Três funções públicas `SECURITY DEFINER`: `upstatus_broadcast_messages`, `upstatus_broadcast_users`, `upstatus_broadcast_remote_state`. Todas retornam `trigger`, têm `search_path=public` e EXECUTE efetivo para `anon` e `authenticated`. O Advisor reporta três warnings para cada papel; não foi demonstrada invocação RPC direta.
- 24 registros de Default ACL incluem **120 privilégios** destinados a `anon`/`authenticated`, em defaults de `postgres` nos schemas `public` e `storage`, e de `supabase_admin` nos schemas `graphql`, `graphql_public` e `public`.
- Buckets `chat-images` e `profile-images` são públicos, cada um com limite de 20 MiB; zero policies no schema `storage`.

O Security Advisor retorna 10 INFO de RLS sem policy, 3 WARN de SECURITY DEFINER para `anon` e 3 WARN para `authenticated`.

### AUTH-03 ausente em produção

As consultas ao catálogo não encontraram tabelas/RPCs de setup-invite ou rate limit de sinalização em produção. Os três runtimes principais continuam com o caminho antigo de primeiro setup. A #89 passou nos testes isolados e no guard, mas o guard bloqueou o cutover porque as três migrations AUTH-03 não estão aplicadas e a versão ainda não avançou.

## Supabase — laboratório

Projeto `bfpjtfqlnypisxljoxkb`, nome `upstatus-security-test`, `ACTIVE_HEALTHY`, 39 migrations e nenhuma branch de desenvolvimento Supabase listada. A conta consultada mostra somente os dois projetos (produção e laboratório); não há um terceiro projeto full-product TEST.

- 18 tabelas públicas com RLS e sem policies.
- Zero grants diretos para `anon`/`authenticated` nas tabelas públicas atuais.
- 24 privilégios de cliente em Default ACLs para objetos futuros (defaults de `postgres` em `storage` e `supabase_admin` em `graphql`, `graphql_public` e `public`).
- Zero linhas em `realtime.messages`, zero buckets Storage.
- Duas Edge Functions: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Tabelas/RPCs de setup-invite e rate limit existem no laboratório; as RPCs de consumo consultadas são `SECURITY INVOKER`, com `search_path` vazio e execução restrita ao papel de serviço.
- Security Advisor: 18 INFO de RLS sem policy, sem warnings SECURITY DEFINER equivalentes.

O laboratório é isolado e útil para testes de sinalização/AUTH-03, mas não é um ambiente full-product TEST e ainda precisa de hardening das Default ACLs e de paridade do runtime HTTP.

## Migrations e proveniência

Produção tem 7 migrations remotas; laboratório tem 39, última `20261110000612`. Quatro SQLs aplicados em produção continuam sem fonte original byte a byte no histórico local:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #135 recupera statements do ledger para documentação, mas isso não prova recuperação dos arquivos originais. Não reconstruir SQL a partir do schema vivo e não aplicar os statements recuperados como se fossem originais.

## Aceitação manual e revisão

A [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta com 0/8 critérios físicos aprovados. Não foi executada queda real de internet, retorno sem F5, reentrada em sala, novas chamadas instaladas ou interoperabilidade física Normal ↔ Team Lite.

A [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta. O corpo tem 16 checkboxes marcados e 19 pendentes. Não há reviews humanas nas PRs principais consultadas.

## Gates desta execução

| Gate | Estado | Evidência resumida |
|---|---|---|
| RT-01 | blocked | 66/66 mensagens persistidas com `private=false`; nenhum cliente implantado usa Realtime privado |
| TEST-ISOLATION | in_progress | Projeto isolado ativo, mas sem Storage/full-product TEST e com Default ACLs abertas |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs originais ausentes; ledger não prova os bytes originais |
| AUTH-03 | blocked | CI isolado passou, mas produção não tem as migrations e o cutover guard bloqueou |
| ACL-STORAGE | blocked | Grants amplos, 120 Default ACL privileges e dois buckets públicos sem policies |
| RECONNECT | pending | 0/8 critérios físicos; nenhum teste sem F5 |
| HUMAN-REVIEW | pending | Nenhuma review humana e nenhuma autorização de release |

## Veredito

**`not_ready`.** CI dos candidatos #133 e #134 está verde, mas o release continua bloqueado por divergência de topologia/versão, transporte autenticado não integrado nem obrigatório, workflow Team Lite incorreto, Realtime público, grants/Default ACLs/Storage, migrations sem proveniência completa e ausência de aceitação física/revisão humana.

**Próximas prioridades:**
1. Decidir uma única topologia Normal e reconciliar versão, manifesto, build e deploy.
2. Integrar `upstatus-signal` ao contrato de publicação e aos dois clientes; habilitar somente após teste HTTP/Realtime autenticado e plano de compatibilidade.
3. Corrigir o runtime do laboratório e adicionar teste de contrato HTTP contra a função implantada.
4. Corrigir o dispatcher Team Lite para `upstatus-team-lite`, SHA exato, project ref validado e CLI fixada.
5. Hardening das Default ACLs, grants, funções broadcast, Realtime e Storage.
6. Recuperar os quatro SQLs originais de fonte confiável; não sintetizar.
7. Depois de integração e revisão humana, executar os oito critérios físicos da Issue #78.

---
**Integridade da execução:** todas as consultas Supabase foram SELECT-only. Nenhum teste mutável foi executado pela QA; os resultados de teste citados são logs de CI existentes. Nenhuma produção, configuração, secret, flag, migration, função implantada ou userscript foi alterado.
