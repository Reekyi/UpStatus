# Auditoria independente UpStatus QA

**Data:** 17/11/2026 10:30 BRT / 13:30 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## Escopo e método

Revalidação read-only de `docs/RELEASE_READINESS.md`, refs e proteções de branch, PRs #74/#75/#76/#82 e candidatas relacionadas #131/#161/#176/#177, Issues #78/#79, commits, workflows, runs/jobs/logs de CI, bundles Edge Function implantados, catálogo PostgreSQL, migrations, Realtime, Storage, Security Advisor e logs de Edge Functions.

**Distinção de evidência:**
- **CI PASS/FAIL:** resultado de workflow existente no commit registrado; a QA não repetiu o workflow.
- **Inspeção de código/catálogo:** leitura estática ou consulta SQL SELECT-only; não equivale a teste de runtime.
- **Manual pending:** depende de Tampermonkey/Sale Smartly, dispositivos ou confirmação humana.
- **Blocked:** dependência de infraestrutura, autorização ou incompatibilidade não resolvida.

Nenhum teste manual, teste de navegador ou teste de exploração foi executado nesta rodada. Nenhum workflow foi despachado ou repetido manualmente. Todas as consultas SQL foram SELECT-only.

## Documento de prontidão

O documento principal `docs/RELEASE_READINESS.md` foi recuperado e lido integralmente. Seu último checkpoint interno é **15/11/2026 06:30 UTC**; portanto, é histórico e não representa sozinho o estado de 17/11. As revalidações diárias mais recentes estão em `docs/audits/`.

## Heads reais e proteção de branches

| Branch | HEAD | Protegida |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | Não |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | Não |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Não |
| `qa/release-readiness-2026-11-04-master` antes deste relatório | `5eabb3c046ef315085905ca99cb9fb4aa1572354` | Não |

A PR #82 aponta para o mesmo HEAD da branch QA antes deste novo relatório. A API de branches retornou `protected=false` e nenhum required status check para as quatro refs. Não houve rebase, merge ou atualização de branch de engenharia.

## PRs e evidência de CI

| PR | HEAD | Estado | Evidência observada |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | Open / Draft | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) PASS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | Open / Draft | Candidate Checks [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) FAIL por quota |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `5eabb3c046ef315085905ca99cb9fb4aa1572354` | Open / Draft | Validate [44085436247](https://github.com/Reekyi/UpStatus/actions/runs/44085436247) FAIL em `production updateURL mismatch` |
| [#131 AUTH-03](https://github.com/Reekyi/UpStatus/pull/131) | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | Open / Draft | Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) PASS, mas baseado em base antiga |
| [#161 Normal consolidada](https://github.com/Reekyi/UpStatus/pull/161) | `557814dc31bed779b84a2094358dc6b2a7e67689` | Open / Draft | Validate [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) PASS; Smoke [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) PASS |
| [#176 Migration recovery](https://github.com/Reekyi/UpStatus/pull/176) | `b50f8567392322b4309468e0fe9e6fc81ca38c1d` | Open / Draft | Validate [43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) FAIL em `client signed upload helper missing` |
| [#177 Normal 3.4.8 metadata](https://github.com/Reekyi/UpStatus/pull/177) | `58c709ca351a345897df6e7fae9ad34542593fcf` | Open / Draft | Validate [44080068698](https://github.com/Reekyi/UpStatus/actions/runs/44080068698) PASS |

As reviews de #74, #75, #76, #82, #161 e #177 foram consultadas e retornaram zero reviews submetidas. Todas as PRs permanecem Draft e sem aprovação humana.

### O que os resultados realmente demonstram

- **#74:** Validate e Signaling Smoke passaram no HEAD exato. O Smoke inclui testes autenticados e WebRTC de voz/tela. O rate limit de emissão de convites não faz parte do resultado desta branch.
- **#75:** PASS histórico da baseline; não substitui a candidata atual #76.
- **#76:** o job independente de contratos de upload assinado passou. No job principal, os contratos offline passaram, mas a etapa de autenticação do endpoint isolado recebeu HTTP 402 em vez de 401/405. Foram **0/16 checks não autenticados**; Playwright, integração autenticada, concorrência e testes seguintes foram ignorados. O log atribui o 402 a `exceed_edge_functions_invocations_quota`.
- **#82:** o log do run 44085436247 mostra checkout do merge ref e falha em `scripts/validate.mjs:26`: `production updateURL mismatch`. É falha herdada do build/validator, não uma falha de conteúdo Markdown.
- **#161:** o Smoke exato passou 19/19 checks não autenticados e 136/136 autenticados. Os logs confirmam WebRTC de chamada, áudio de sala e vídeo de compartilhamento de tela, mesh de três participantes, 90 sinais aceitos + 1 HTTP 429 com Retry-After, concorrência de rate limit, recibos atômicos, consumo de convite e rate limit de emissão. Isso é CI histórico executado em laboratório antes da pausa atual; não foi repetido.
- **#131:** Smoke passou, mas a branch não é a integração atual da #74/#161.
- **#176:** falha em `scripts/validate.mjs:55`, `client signed upload helper missing`.
- **#177:** Validate passou, mas o diff contém somente uma alteração de `release.json` de 3.4.7 para 3.4.8.

## Bloqueio de versão e workflows

### Normal

O workflow de produção na base da #161:
- é `workflow_dispatch` apenas;
- verifica `GITHUB_REF=refs/heads/master`, SHA de checkout e project ID `dlfvkawaiqduhlazsszm`;
- fixa Supabase CLI 2.122.1;
- exige `release.json.version === 3.4.7`;
- publica somente a função `upstatus`;
- não aplica migrations e não coordena a API beta10.

A #177 muda apenas `release.json` para 3.4.8. O workflow permanece travado em 3.4.7. Portanto, a #177 isolada não permite publicar 3.4.8; o cutover continua bloqueado.

### Team Lite

O workflow `.github/workflows/deploy-production.yml` de `team-lite-official`:
- usa Supabase CLI `latest`;
- recebe project ID de secret genérico;
- não verifica ref/SHA/projeto aprovado;
- executa `supabase functions deploy upstatus`, que é o slug Normal, não `upstatus-team-lite`.

**Não despachar esse workflow.** A branch oficial não tem um pipeline de produção Team Lite correto e comprovado. `team-lite-candidate.yml` da #76 é CI, não deploy.

### TEST

O workflow `.github/workflows/deploy-test.yml` de `develop` tem `workflow_dispatch` e também gatilho `push` para develop. Usa `SUPABASE_PROJECT_ID` genérico, CLI `latest` e não contém guarda explícita contra o project ID de produção. Se o secret apontar para produção, o workflow pode publicar `upstatus-test` no projeto errado. A candidata #76 tem guardas de alvo para o laboratório, mas esse laboratório está pausado.

## Supabase: projetos, migrations e Edge Functions

- Organização conectada: `UpStatus`, plano `free`.
- Produção `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002, sete migrations.
- Laboratório `upstatus-security-test` / `bfpjtfqlnypisxljoxkb`: **INACTIVE**. A listagem de migrations expirou por timeout. A lista de projetos da organização conectada mostra somente produção ativa e esse laboratório pausado. Não existe Full-Product TEST ativo e independente.
- Produção tem 38 Edge Functions na inventory; todas reportam `verify_jwt=false`. Isso não prova, isoladamente, que cada rota seja explorável: a autenticação customizada precisa ser validada por rota. Os runtimes centrais estão ativos:
  - `upstatus` v480, produto Normal 3.4.7;
  - `upstatus-team-lite` v15, produto Team Lite 3.4.30;
  - `upstatus-screen-share-3-1-1-beta10` v6, API interna 3.1.1-beta8.
- Não existe função `upstatus-signal` na produção. A função `upstatus-signal-test` está somente no laboratório pausado.
- A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview apareça `ACTIVE_HEALTHY`.

## Disponibilidade de produção

Consulta read-only de `function_edge_logs` entre **12:30 e 13:30 UTC de 17/11**:

| Rota | HTTP 402 |
|---|---:|
| `/api/chat` | 2.277 |
| `/api/status` | 1.097 |
| `/api/remote-status` | 1.094 |
| `/api/account` | 3 |
| **Total** | **4.471** |

Primeiro registro: 12:30:00.393 UTC. Último: 13:29:16.488 UTC. Todos os 4.471 registros agregados nesta janela foram HTTP 402. A causa específica em produção **não foi determinada**. Não atribuir esses 402 à quota do laboratório sem evidência adicional.

O log do CI #76 e o estado anterior do laboratório confirmam quota `exceed_edge_functions_invocations_quota`. Agora o projeto de laboratório aparece INACTIVE; não é possível repetir integração autenticada nele.

## AUTH-03 e autorização dos runtimes instalados

Consulta de catálogo em produção:
- nenhuma coluna `setup_token_*` em `public.users`;
- RPCs `consume_upstatus_setup_invite`, `consume_upstatus_setup_invite_rate_limit` e `consume_upstatus_signal_rate_limit` ausentes.

Inspeção das fontes implantadas de Normal e Team Lite:
- `GET /api/account` retorna `needsSetup` com base na conta;
- `POST /api/setup` chama `login(req,true)`;
- não há `setup_token` nem chamada a `consume_upstatus_setup_invite` no runtime;
- `/api/chat/clear` autoriza por `name === "Ricardo"`, não pelo papel administrativo persistido.

A candidata #161 adiciona convite e rate limit, mas depende de colunas/RPCs que não existem em produção e seu workflow não aplica migrations. Não fazer cutover.

## Realtime, bundles, RLS e grants

### Realtime e bundles

Consulta de `realtime.messages`:
- 106 registros, todos `private=false`;
- tópico dos triggers: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`;
- eventos: 72 `user_status`, 26 `db_change`, 4 `remote_command`, 4 `remote_result`;
- zero policies em `realtime.messages`; RLS está habilitado, mas anon/authenticated têm SELECT e INSERT efetivos.

Os bundles foram decodificados diretamente das Edge Functions implantadas:
- Normal 3.4.7 usa API `upstatus-screen-share-3-1-1-beta10` e tópico `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite 3.4.30 usa API `upstatus-team-lite`, mas assina o mesmo tópico beta10.
- Os clientes não definem `private:true` nem configuram JWT Realtime.
- Normal recebe `remote_command` e executa o comando do payload diretamente.
- Team Lite confere a sessão local/generation antes de executar, mas isso não autentica o remetente do broadcast.
- Handlers de voz e tela validam campos estruturais e identidade declarada no payload; não comprovam membership do remetente por um servidor autenticado.

Os candidatos #74/#76 reduzem `remote_command` a wake-up e fazem polling autenticado. Porém o transporte autenticado de voz/tela continua opt-in, com flag default false e endpoint vazio; o fallback público permanece. O backend server-mediated está somente no laboratório pausado.

**Risco de segurança por inspeção estática:** ofertas/ICE públicas podem alcançar handlers que criam peers e anexar tracks locais quando voz/tela estão ativas. Não houve exploração, injeção de oferta/ICE ou captura de áudio/tela. O setting Dashboard `Allow public access` não está exposto pelo conector; portanto, exploração externa não foi reproduzida.

### PostgreSQL, SECURITY DEFINER e Storage

Produção:
- 10 tabelas públicas com RLS e zero policies;
- nove tabelas têm grants efetivos amplos para anon/authenticated, incluindo CRUD e TRUNCATE; 18 grants TRUNCATE;
- três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, com EXECUTE para PUBLIC/anon/authenticated/service_role; Security Advisor retorna três WARN para anon e três para authenticated;
- essas funções são usadas por triggers; a auditoria não demonstrou exploração direta por RPC;
- default ACLs amplas persistem em public, storage e schemas GraphQL;
- buckets `chat-images` e `profile-images` são públicos, limite 20 MiB, 168 e 20 objetos respectivamente; zero policies em `storage.objects`.

Performance e Health Advisors não retornaram findings. A ausência de findings não elimina os problemas de grants, default ACLs ou privacidade de Storage.

## Proveniência de migrations

Produção tem sete migrations, até `20261027155438`. PR #176 recupera quatro statements do ledger:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Nesta rodada comparei os quatro arquivos da #176 com `supabase_migrations.schema_migrations` em produção. O texto de cada statement corresponde exatamente ao SQL recuperado após remover apenas a quebra de linha terminal dos arquivos. Isso confirma a recuperação do statement executado, mas **não** comprova bytes, comentários ou formatação dos arquivos originais. Não houve replay nem alteração de produção. A proveniência permanece em andamento.

## Issues

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, **0/8** critérios marcados. Última atualização 08/11. Nenhum teste físico de perda real de internet/reconexão sem F5 foi confirmado.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados, 19 pendentes. O comentário QA dedicado foi atualizado no mesmo ID; o comentário da Engenharia foi preservado.

## Gates reavaliados

| Gate | Estado QA | Evidência |
|---|---|---|
| RT-01 | **blocked** | 106 mensagens públicas, zero policies, tópico incompatível e backend server-mediated ausente em produção |
| TEST-ISOLATION | **blocked** | laboratório INACTIVE; somente produção ativa na organização conectada; sem Full-Product TEST |
| MIGRATION-PROVENANCE | **in_progress** | quatro statements conferidos contra ledger; bytes originais e replay isolado ainda pendentes |
| AUTH-03 | **blocked** | produção sem colunas/RPCs exigidas pela candidata; runtime implantado ainda usa setup legado |
| ACL-STORAGE | **blocked** | grants/default ACLs amplas e buckets públicos sem policies próprias |
| RECONNECT | **pending** | Issue #78 continua 0/8 físico |
| HUMAN-REVIEW | **pending** | zero reviews nas PRs obrigatórias/candidatas verificadas e nenhuma autorização explícita |

## Próximas ações

1. **Ação do proprietário/admin:** disponibilizar um projeto Full-Product TEST ativo e isolado e compartilhar o project ref. A organização conectada está no plano Free e só lista produção e o laboratório INACTIVE.
2. Diagnosticar os 402 de produção separadamente da quota do laboratório.
3. Revisar e aprovar migrations AUTH-03; validar HTTP real em TEST antes de qualquer cutover.
4. Tornar a sinalização server-mediated o padrão e remover listeners públicos sensíveis em Normal e Team Lite.
5. Coordenar versão Normal 3.4.8 com o guard do workflow, API, artefato e migration; não despachar workflow enquanto a inconsistência existir.
6. Criar deploy Team Lite próprio com slug correto, projeto/SHA verificados e CLI pinada; corrigir o workflow TEST de develop para alvo explicitamente allowlisted e sem push automático inseguro.
7. Corrigir grants/default ACLs/Storage com owner autorizado e política de privacidade explícita.
8. Diagnosticar `MIGRATIONS_FAILED`, concluir os oito testes físicos da #78 e obter review/aprovação humana.

## Limites e segurança

Nenhum teste manual, teste de navegador ou exploração foi realizado. CI existente foi inspecionado, não repetido. Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL/billing ou operação destrutiva foi executada. O único write no repositório é este relatório novo na branch QA; nenhum arquivo existente foi sobrescrito.
