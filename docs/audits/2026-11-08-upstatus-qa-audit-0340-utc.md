# UpStatus — auditoria independente de QA
**Data da verificação:** 2026-11-08 03:40 UTC (00:40 BRT)  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## 1. Escopo e método

Antes da inspeção, foi lido `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`. Blob SHA confirmado: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0` (797.831 caracteres no momento da leitura).

Foram consultados os metadados e diffs das PRs #74, #75, #76, #82, #84 e #85; os workflows e logs dos HEADs; issues #78 e #79; fontes dos userscripts e Edge Functions; migrations, catálogos PostgreSQL, grants, RLS, default ACLs, Realtime, Storage e Security/Performance/Health Advisors.

Todas as consultas SQL desta rodada foram SELECT-only. Não foram executados workflows manualmente nem testes que alterassem fixtures. O laboratório foi consultado depois do CI e apresentou zero registros nas tabelas de fixtures verificadas.

## 2. Resultado executivo

- **Normal #74:** aprovação automatizada confirmada no HEAD `d8914dd8e5867e87107fe3886b2346826122a6d4`: Validate e Signaling Smoke SUCCESS, 19/19 verificações não autenticadas e 134/134 autenticadas.
- **Team Lite #76:** aprovação automatizada confirmada no HEAD `0fdf3e487cee2dacd77cc2f569212bf9d930827c`: Candidate Checks SUCCESS, 16/16 verificações não autenticadas e 108/108 autenticadas.
- **Novo bloqueador no Team Lite:** o userscript candidato não declara `CLOUD_SERVER`, `server`, `UP_REALTIME_URL`, `UP_REALTIME_KEY`, `UP_REALTIME_TOPIC` nem `realtimeClient`, embora os use. O userscript oficial anterior declara essas variáveis. O CI não executa o userscript completo e não detecta essa falha de inicialização.
- **Normal — cutover incompleto:** o build candidato entrega o userscript pelo endpoint `upstatus`, mas configura as chamadas de API de produção para o runtime legado `upstatus-screen-share-3-1-1-beta10`. O workflow de produção candidato #85 implanta somente `upstatus`. Assim, o novo backend embutido em `upstatus` não é o endpoint configurado pelo cliente.
- **Autorização de limpeza de chat:** corrigida nos candidatos Normal e Team Lite, mas ainda baseada somente no nome Ricardo nos quatro runtimes centrais implantados em produção.
- **Voz:** a singleton de tentativas está aplicada no laboratório e passa pelos testes de RPC; a Edge Function implantada v32 ainda não traduz `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. O teste atual verifica a RPC diretamente, não o contrato HTTP desse conflito.
- **Infraestrutura de release:** não existe projeto TEST full-product. O workflow TEST ativo em develop continua com push automático, secret compartilhado e sem preflight de identidade do destino.
- **Produção:** permanecem broadcasts públicos, SECURITY DEFINER executáveis por papéis clientes, grants amplos, default ACLs amplos e setup legado.

**Decisão QA:** NÃO LIBERAR. O PASS automatizado dos candidatos não elimina os bloqueios de inicialização do userscript Team Lite, cutover Normal, autorização implantada e infraestrutura/segurança de produção.

## 3. PRs, heads, ancestry e reviews

HEADs confirmados nesta rodada:

| PR | Branch | HEAD completo | Base | Relação com a base |
|---|---|---|---|---:|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` | `d8914dd8e5867e87107fe3886b2346826122a6d4` | master | 870 ahead / 0 behind |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 commits |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` | `0fdf3e487cee2dacd77cc2f569212bf9d930827c` | team-lite-official | 342 commits na PR; 283 ahead de #75 |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` | `4d323ec20a5f848c41c1b0ba30b3e74fdf03d41d` | master | 116 ahead / 0 behind antes deste relatório |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `safety/test-deploy-target-guard-20261107` | `21341f331270e142bdf7584c1cdf16e6011e41b3` | develop | 30 ahead / 0 behind |
| [#85 updater/deploy security](https://github.com/Reekyi/UpStatus/pull/85) | `fix/master-release-script-url-20261107` | `36c19ab87d883fe5252715fcbbc0fbef2e35ec9f` | master | 25 ahead / 0 behind |

Master estava em `a9288ccfcb0f308d3a587bfca624418a395be07b`. Todas as seis PRs consultadas permanecem OPEN/Draft, sem merge e com zero reviews humanas registradas.

#76 é continuação de #75, não um payload independente. #74 e #85 são divergentes: o compare entre seus heads retorna 870 commits exclusivos de #74 e 25 exclusivos de #85, com merge-base em master. Os dois diffs se sobrepõem em `.github/workflows/deploy-production.yml`, `scripts/build.mjs`, `scripts/validate.mjs` e `src/server/index.template.ts`, entre outros. Não integrar #74 e #85 como se fossem uma sequência linear; reconciliar os diffs e escolher uma única versão do workflow de produção.

## 4. CI e classificação da evidência

| Alvo | Execução | Resultado | Classificação |
|---|---|---|---|
| #74 Normal | [Validate 42437136152](https://github.com/Reekyi/UpStatus/actions/runs/42437136152) | SUCCESS, 19/19 não autenticados | Automatizado |
| #74 Normal | [Signaling Smoke 42437136129](https://github.com/Reekyi/UpStatus/actions/runs/42437136129) | SUCCESS, 134/134 autenticados | Automatizado |
| #76 Team Lite | [Candidate Checks 42441170718](https://github.com/Reekyi/UpStatus/actions/runs/42441170718) | SUCCESS, 16/16 não autenticados e 108/108 autenticados | Automatizado |
| #75 baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico | Automatizado histórico; não substitui #76 |
| #82 QA | [Validate 42439623507](https://github.com/Reekyi/UpStatus/actions/runs/42439623507) | FAILURE em `production updateURL mismatch`, assertion herdada de master | Automatizado FAIL; não atribuível ao novo relatório |
| #84 TEST guard | [Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) | SUCCESS | Automatizado; workflow não foi dispatchado |
| #85 updater/deploy guard | [Validate 42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791) | SUCCESS | Automatizado; workflow de produção não foi dispatchado |

Os logs Normal/Team Lite confirmam WebRTC de chamadas, voz e screen-share, áudio/vídeo remoto, mesh de três participantes, recuperação de salas, concorrência, setup-invite, rate limit e recibos atômicos. Normal confirma 90 requisições aceitas e a 91ª limitada com HTTP 429 e `Retry-After: 60s`.

**Não houve teste manual** no Tampermonkey/Sale Smartly nesta rodada. CI de API/Chromium e testes VM não substituem instalação real, permissões GM, microfone, captura de tela e reconexão física.

## 5. Novo bloqueador: Team Lite userscript sem configuração de backend

Comparação direta do artefato candidato com o oficial:

| Arquivo | Blob SHA | Tamanho |
|---|---|---:|
| [Candidato #76](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/team-lite/upstatus-team-lite.user.js) | `6fb2a9dac44142ff1adafad1aa3a23f3f0d43983` | 701.550 caracteres |
| [Oficial team-lite-official](https://github.com/Reekyi/UpStatus/blob/team-lite-official/team-lite/upstatus-team-lite.user.js) | `582c8b5906751fd92ce60bdb532a294a29cab011` | 632.207 caracteres |

O candidato não contém declaração local `var`, `let` ou `const` para:
- `CLOUD_SERVER` (primeira referência na linha 891, em `GM_setValue(key+'server',CLOUD_SERVER)`);
- `server` (linha 314);
- `realtimeClient` (linha 731);
- `UP_REALTIME_KEY` (linha 1848);
- `UP_REALTIME_URL` (linha 3733);
- `UP_REALTIME_TOPIC` (linha 3734).

O userscript oficial declara essas configurações no início, linhas 27–32. O candidato está em strict mode e referencia `CLOUD_SERVER` antes de iniciar o aplicativo. Na ausência de um global externo não documentado, a primeira leitura causa ReferenceError e interrompe a inicialização. Não foi encontrada etapa de build/injeção que forneça essas variáveis no diretório `team-lite/` ou no workflow.

O workflow [team-lite-candidate.yml](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/.github/workflows/team-lite-candidate.yml), blob `f6c944af6da611e05c5aa125b7b8ac6a0daf96bf`, roda os testes de adapter, RPC, Chromium e checker. Porém, [screen-share-recovery.test.mjs](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/scripts/screen-share-recovery.test.mjs), blob `622856c2bd794ac55ce77b98ac54a496e08f043a`, lê o userscript e extrai somente o trecho entre `screenShareClearRecoveryTimer` e `screenShareStart` para executar em VM. Não executa o IIFE completo. O checker `team-lite-candidate-check.mjs`, blob `9fad2380a7d1cfec8265501285e03416e006085b`, verifica o guard de chat e a igualdade do adapter, mas não exige as declarações de configuração.

**Classificação:** inspeção de código, não reprodução física. É um provável bloqueador de inicialização do userscript e precisa ser corrigido antes de qualquer distribuição. Restaurar/injetar o bloco de configuração de forma explícita e adicionar smoke test que execute o IIFE completo com stubs controlados. Não copiar automaticamente o endpoint de produção do userscript oficial: o build de teste deve apontar para um backend TEST dedicado, que ainda não existe.

## 6. Autorização de limpeza de chat: candidato corrigido, produção não

O candidato Normal exige nome Ricardo e `admin(name)`; o candidato Team Lite agora também exige o papel armazenado `implementation_admin` antes de ler mensagens, excluir mensagens ou remover anexos.

- Normal server template: blob `c7de6c4b8677fd829f512b224db3157e506cf2ad`.
- Team Lite server template: blob `c2367c8bd5ebdd2d2149803f7dc62c1c5aa6fcac`.
- Team Lite checker: blob `9fad2380a7d1cfec8265501285e03416e006085b`.

O checker Team Lite cobre Ricardo rebaixado, papel com espaços, outro admin e admin válido. Nos casos negados, os contadores de leitura, delete e Storage permanecem em zero. Isso é regressão de autorização em Node VM, não E2E HTTP destrutivo.

**Produção ainda não recebeu a correção.** As fontes implantadas continuam verificando apenas `name === "Ricardo"` em `/api/chat/clear` e ainda usam fallback `name === "Ricardo" || await admin(name)` no delete individual:

| Runtime | Versão | SHA da fonte implantada |
|---|---:|---|
| `upstatus` | 480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-test` (no projeto de produção) | 281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |
| `upstatus-team-lite` | 15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | 6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

Não é bypass anônimo: requer sessão válida da conta Ricardo. O defeito é manter autorização administrativa depois de eventual rebaixamento/revogação do papel. Produção tinha 5 contas, 3 com papel `implementation_admin`, zero hashes de senha nulos/vazios e zero papéis nulos/vazios na consulta agregada. Isso não remove o risco futuro da rota pública de setup legado.

## 7. Normal: mismatch entre endpoint de script e endpoint de API

O build Normal candidato, `scripts/build.mjs`, blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`, define:
- `updateUrl` para `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js`;
- `cloud` de produção para `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10`.

O `release.json` candidato e master têm o mesmo blob `93caf1701ea508575c90d002c0b8c3037b34d82a`, versão estável `3.4.7`, e scriptUrl para `/upstatus/upstatus.user.js`.

O workflow de produção candidato #85 deploya somente `upstatus`. Assim, o novo userscript seria servido por `upstatus`, mas suas chamadas de API continuariam indo para `beta10` v6, cujo código implantado ainda possui setup e autorização legados. O backend candidato embutido no runtime `upstatus` não é o endpoint configurado pelo cliente. É necessário decidir se o API base será migrado para `upstatus` ou se o runtime efetivamente usado pelos clientes será atualizado; o plano deve cobrir ambos os produtos e rollback.

A versão Normal candidata permanece 3.4.7, igual ao manifesto master. Sem incremento de versão, instalações existentes na mesma versão podem não receber a atualização pelo mecanismo de userscript. O guard #85 também exige explicitamente 3.4.7; a versão final aprovada e o guard precisam ser coordenados.

Team Lite candidata declara buildVersion 3.4.31, mas seu manifesto ainda aponta o update URL para a branch oficial `team-lite-official`; a PR permanece Draft, portanto não houve publicação.

## 8. Voice attempt singleton e contrato HTTP

A migration `20261108010000_voice_attempt_singleton.sql` está aplicada no laboratório; o catálogo confirma a função `open_upstatus_signal_voice_room_attempt` com search_path vazio. A função toma:
1. lock por attempt ID (`upstatus-voice-attempt:`);
2. lock global pelo par de aliases (`upstatus-open-voice:<alias-pair>`).

O segundo lock não inclui o usuário. Ele serializa aberturas concorrentes de todas as contas para o par Normal/Team Lite. Isso pode causar contenção; não há teste de carga multi-conta que demonstre impacto observado. Revisar se a verificação singleton pode usar lock por usuário, preservando a serialização necessária da sala compartilhada.

A Edge Function de laboratório `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`, mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não conhece `VOICE_ATTEMPT_ALREADY_ACTIVE`; o caso cai no fallback HTTP 500. A fonte candidata Normal contém o novo mapeamento 409, ainda não implantado.

`scripts/test-signaling-authenticated.mjs`, blob `d67adb59f8e37328578c0a5f5370c65d530231e5`, testa a concorrência via `serviceRpc("open_upstatus_signal_voice_room_attempt")`. `scripts/test-signaling-endpoint.mjs`, blob `1b704810ed1a869ed2c051f56de06d8d2f3f4f79`, não testa `VOICE_ATTEMPT_ALREADY_ACTIVE`/HTTP 409. Adicionar teste de endpoint: primeira aba sucesso; segunda aba HTTP 409 com body correto; retry bloqueado até cancelamento; retry permitido após cancelamento.

## 9. Workflows e proteção de deploy

### TEST em develop

Workflow ativo [deploy-test.yml](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml), blob `d4d44fd3ae78bc1ebe885bd1d5d91fe5b8607839`:
- `push` automático em develop e `workflow_dispatch`;
- secret compartilhado `SUPABASE_PROJECT_ID`;
- CLI `latest`;
- sem validação independente de project ref, organização e database host.

#84 implementa manual-only, checkout do SHA do dispatch, `SUPABASE_TEST_PROJECT_ID`, rejeição de produção/laboratório, preflight e CLI fixada em 2.122.1. Validate passou, mas PR segue Draft e o workflow não foi dispatchado. #74 também contém variante manual-only; a versão a integrar deve ser reconciliada com #84.

### Produção em master

Workflow ativo [deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml), blob `8252c6c6e7005c98625603b5b02b14cb1e50a519`: manual-only e exige release estável 3.4.7, mas usa CLI `latest`, secret compartilhado `SUPABASE_PROJECT_ID` e não valida explicitamente branch/SHA exato nem identidade do projeto pela Management API.

#85 traz guard mais forte: master obrigatório, checkout do SHA exato, versão estável, preflight Management API (project ref, organização, ACTIVE_HEALTHY e database host), CLI 2.122.1, concurrency e timeout. Validate passou em [42440947791](https://github.com/Reekyi/UpStatus/actions/runs/42440947791). Está apenas na PR Draft; nenhum dispatch/deploy foi realizado. #85 e #74 divergem e alteram os mesmos arquivos, portanto reconciliar antes de merge.

A API de branch protection retornou HTTP 403 por falta de permissão administrativa da integração. O endpoint de repository rulesets retornou lista vazia. **Não é possível concluir o estado de proteção clássica das branches** com a permissão atual.

## 10. Supabase — snapshot read-only

### Projetos e runtimes

A organização tem somente dois projetos:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 36 migrations, 2 Edge Functions.

Não existe TEST full-product independente. O laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3; não tem os backends completos Normal/Team Lite nem buckets chat/profile.

Produção tem 38/38 funções com `verify_jwt=false`; 36 nomes incluem test/beta/backup. Isso não prova ausência de autenticação: os runtimes centrais validam sessão UpStatus própria. A superfície antiga precisa de inventário individual de rotas e consumidores antes de remoção.

### Auth e setup

Produção ainda tem `/api/account` público com `needsSetup`, `/api/setup` legado e fallback de papel por nomes Ricardo/Lohan/Guilherme quando o papel está vazio. Não há `/api/setup-invite` nem RPC de consumo de convite nos quatro runtimes implantados. O laboratório/candidatos têm setup-invite com token aleatório de 256 bits, hash SHA-256, expiração de 15 minutos e consumo atômico; CI cobre replay/concorrência em VM e RPC, não E2E Deno HTTP completo.

A consulta de catálogo não encontrou `upstatus_auth_rate_limits` nem `consume_upstatus_auth_rate_limit` em produção ou laboratório. Rate limit de signaling não substitui throttle de login/setup.

Senha mínima nas fontes implantadas:
- Normal v480: 6 caracteres;
- upstatus-test v281: 4;
- Team Lite v15: 4;
- beta10 v6: 6.

Os dois templates candidatos usam `setup ? 6 : 4`; rollout precisa coordenar a compatibilidade entre produtos e sessões existentes.

### RLS, grants, SECURITY DEFINER e advisors

Security Advisor observado em 2026-11-08 03:36:58 UTC:
- Produção: 3 WARN para SECURITY DEFINER executáveis por anon, 3 WARN para authenticated e 10 INFO de RLS habilitado sem policy.
- Laboratório: zero WARN de SECURITY DEFINER e 17 INFO de RLS sem policy.
- Performance: produção sem findings; laboratório com 4 INFO de índices não utilizados.
- Health: sem findings nos dois projetos.

Produção:
- `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` são SECURITY DEFINER, `search_path=public`, executáveis por anon/authenticated.
- Broadcast de mensagens publica OLD/NEW completo via `to_jsonb`; os canais continuam `private=false`.
- Nove tabelas backend-owned em public têm RLS, zero policies e grants efetivos para anon/authenticated incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE. `upstatus_visual_config` é exceção sem grants clientes.
- `realtime.messages` tem RLS, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated. Isso é superfície de privilégio excessiva, mas zero policies não prova leitura direta das linhas; TRUNCATE não é protegido por RLS.
- Default ACLs amplos continuam para postgres em public/storage e supabase_admin em public/graphql/graphql_public.

Laboratório:
- As três funções broadcast têm `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role; payload reduzido a `{op}`.
- Ainda usam `private=false`; a entrega real de broadcast não foi comprovada.
- Default ACLs amplos ainda persistem em objetos de supabase_admin/public e postgres/storage; corrigir grants atuais sem revisar defaults não evita privilégios herdados por objetos futuros.

Realtime:
- Produção: 7 partições e 50 linhas em `realtime.messages`.
- Laboratório: 0 partições e 0 linhas.
- Ambos: zero policies em `realtime.messages`, grants clientes SELECT/INSERT/UPDATE.
- Os clientes Normal/Team Lite mantêm `signaling_transport_enabled=false` por padrão e endpoint vazio; o caminho legado continua ativo. Não ativar o transporte autenticado antes de validar endpoint, autorização, WebSocket/Realtime e rollback em TEST completo.

### Storage

Produção tem buckets `chat-images` e `profile-images` públicos, limite de 20 MiB; não há policies em `storage.objects`. O laboratório não possui esses buckets. Upload assinado #85 passou com mocks, mas não houve upload/download real. Upload assinado protege escrita, não leitura; decidir leitura pública versus bucket privado/URLs assinadas. Áudio ainda usa fluxo legado data URL com contrato de tamanho diferente do caminho assinado.

## 11. Issues e escopo de release

- [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN com **0/8 critérios físicos**. Faltam perda real de internet durante sala/chamada, recuperação sem F5, reentrada, novas chamadas, microfone/display reais e interoperabilidade instalada Normal ↔ Team Lite. Nenhum teste manual foi realizado nesta rodada.
- [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece OPEN, 16/35 checkboxes marcados e 19 pendentes. O corpo ainda aponta heads antigos (#74 `a79ec9`, #76 `c025ae`) e não reflete o HEAD #76 `0fdf3e` nem o run 42441170718 SUCCESS.
- O checklist #79 também mantém decisões de escopo pendentes: [#24](https://github.com/Reekyi/UpStatus/issues/24) (unread/chat opening, sete tentativas beta), [#16](https://github.com/Reekyi/UpStatus/issues/16) (Ycaro; depende de decisão/configuração separada) e [#14](https://github.com/Reekyi/UpStatus/issues/14)/[PR #15](https://github.com/Reekyi/UpStatus/pull/15). PR #15 continua OPEN e mergeable=false. Não foram alteradas.

## 12. Próximos gates priorizados

1. **P0 — Team Lite:** restaurar/injetar configuração completa do userscript; adicionar smoke de execução do IIFE inteiro com globals/browser/Tampermonkey stubs; confirmar que nenhum global de configuração fica implícito.
2. **P0 — Normal cutover:** alinhar o endpoint de API do userscript com o runtime que recebe o deploy; definir plano de migração e rollback para beta10/upstatus; incrementar versão de userscript e ajustar guard de release.
3. **P0 — Produção:** migrar autorização de chat clear e delete individual para papel armazenado; remover setup público/name-based admin fallback em rollout coordenado.
4. **P1 — Voz:** mapear `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409 no runtime TEST e testar endpoint real; revisar contenção do advisory lock com teste multi-conta.
5. **P1 — TEST:** integrar o guard manual-only em develop; provisionar TEST full-product e runtime independente Team Lite; provisionar Realtime e Storage compatíveis.
6. **P1 — Auth:** completar E2E HTTP de setup-invite e implementar rate limit distribuído/fail-closed de login/setup com 429/Retry-After.
7. **P1 — Realtime:** remover broadcasts públicos/full-row; implementar autorização privada com policies e JWT compatível; comprovar entrega por WebSocket.
8. **P1 — Banco:** reduzir grants, revisar SECURITY DEFINER/search_path e corrigir default ACLs por caminho administrativo autorizado.
9. **P2 — Storage:** decidir privacidade de anexos, alinhar áudio e executar upload/download real em TEST.
10. **P2 — Aceitação:** completar testes físicos #78; atualizar #79 com heads/CI atuais e decidir escopo de #24/#16/#14/#15; obter reviews humanas.
11. Reconciliar #74/#85 e #76/#75 antes de qualquer integração; não mesclar branches divergentes cegamente.

## 13. Registro de segurança da auditoria

- Todas as consultas SQL foram SELECT-only.
- Nenhuma migration/DDL foi executada pela auditoria.
- Nenhum deploy, merge, release, publicação de userscript ou dispatch de workflow.
- Nenhum secret/token foi lido.
- Nenhuma flag, role, grant, policy, ACL ou configuração de produção foi alterada.
- Nenhuma fixture foi modificada; a consulta pós-CI no laboratório retornou zero em users, sessions, rooms, memberships, events, bindings, call attempts, voice attempts, rate limits, chat reads, messages e realtime.messages.
- Nenhuma branch de engenharia ou issue foi alterada.
- Única escrita desta rodada: este novo relatório na branch QA dedicada, sem sobrescrever `docs/RELEASE_READINESS.md` ou arquivos anteriores.

Não há percentual de conclusão nesta auditoria. Os resultados automatizados, inspeção de código, catálogo de produção, testes físicos, bloqueios de infraestrutura e autorização de release permanecem categorias separadas.
