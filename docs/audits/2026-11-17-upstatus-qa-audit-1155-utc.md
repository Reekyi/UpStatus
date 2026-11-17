# Auditoria independente de qualidade — UpStatus

**Execução:** 2026-11-17T11:55:00Z  
**Resultado:** NOT READY  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA observado antes deste relatório:** `f20bb812318b5e7a8f676a736bc112cf455483dd`

## 1. Método e limites

Inspeção read-only do GitHub e dos dois projetos Supabase conhecidos. A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.

Não houve checkout local, teste manual no Tampermonkey/Sale Smartly, exploração de segurança, replay de migration, alteração de produção, deploy, merge, release, publicação de userscript, mudança de secrets, flags, grants ou policies.

O CI citado abaixo é evidência de workflows já existentes e foi inspecionado por SHA/run; não foi reexecutado pela QA.

## 2. Documento-base e heads

`docs/RELEASE_READINESS.md` está na branch QA, blob SHA `7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c`, com aproximadamente 1.046.356 caracteres e 8.423 linhas. O último checkpoint interno é **2026-11-15 06:30 UTC**. O documento está desatualizado em relação às evidências de 17/11; foi preservado, sem sobrescrita.

| Branch | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `f20bb812318b5e7a8f676a736bc112cf455483dd` |

## 3. PRs, commits, reviews e CI

Todas as PRs abaixo continuam abertas, Draft e sem merge. As seis PRs consultadas para reviews (#74, #75, #76, #82, #131 e #161) retornaram zero reviews submetidas; #176 também não tem review.

| PR | HEAD | Relação com a base atual | CI observado |
|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 à frente / 1 atrás de master | Validate 43376770142 e Smoke 43376770200 SUCCESS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 | Candidate Checks 41674353127 SUCCESS histórico, escopo limitado |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | 389 / 0 de team-lite-official | Candidate Checks 43868863235 FAILURE por quota do laboratório |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `f20bb812318b5e7a8f676a736bc112cf455483dd` | 395 / 1 de master; 229 arquivos | Validate 44068260473 FAILURE em `scripts/validate.mjs:26`, `production updateURL mismatch` |
| [#131 AUTH-03](https://github.com/Reekyi/UpStatus/pull/131) | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | 1 commit / 6 arquivos | Smoke 42760281798 SUCCESS; candidata separada |
| [#161 Normal consolidada](https://github.com/Reekyi/UpStatus/pull/161) | `557814dc31bed779b84a2094358dc6b2a7e67689` | 12 / 0 da base #74; 10 arquivos | Validate 43479685384 e Smoke 43479685445 SUCCESS no SHA exato |
| [#176 migration recovery](https://github.com/Reekyi/UpStatus/pull/176) | `b50f8567392322b4309468e0fe9e6fc81ca38c1d` | 6 commits / 6 arquivos | Validate 43936811839 FAILURE em `scripts/validate.mjs:55`, `client signed upload helper missing` |

A #76 está 330 commits à frente e zero atrás da #75; é continuação da baseline, não uma entrega independente.

### Evidência relevante da PR #161

O Validate e o Signaling Smoke foram concluídos com sucesso no HEAD exato `557814dc31bed779b84a2094358dc6b2a7e67689`. O log do Smoke confirma 136/136 verificações autenticadas, chamadas WebRTC, voz, vídeo de tela, mesh de três participantes, rate limit de sinalização (90 aceitos e o seguinte HTTP 429), rate limit distribuído de convites, consumo atômico de convite e limpeza das fixtures.

A candidata corrige o alvo da API Normal: `CLOUD_SERVER`, `updateURL`, `downloadURL`, atualizador manual e workflow são validados contra `PROD_FUNCTION=upstatus`; o artefato candidato não pode conter o endpoint beta10.

Também incorpora o setup por token e o rate limit distribuído de emissão: cinco convites por administrador em 15 minutos, HTTP 429 ao exceder e HTTP 503 fail-closed quando a RPC falha. O teste concorrente usa 24 chamadas, com cinco permitidas e 19 negadas. A rota candidata de limpeza de chat exige Ricardo **e** papel persistido de administrador.

**Novo bloqueio de release:** `release.json` da #161 continua em **3.4.7**, igual ao userscript Normal implantado. O workflow candidato só permite `release.json.version === '3.4.7'`. O endpoint de atualização já é o mesmo; portanto, não há incremento de versão nem evidência de que o gerenciador de userscripts entregue automaticamente o novo código. A PR deve resolver a estratégia de versão/guard antes de qualquer release.

A candidata de signaling continua opt-in: a flag começa `false`, o endpoint começa vazio e a origem precisa coincidir com a API. Não existe função `upstatus-signal` implantada em produção.

## 4. Runtimes e compatibilidade Normal / Team Lite

Inventário de Edge Functions:

| Projeto / função | Versão | Estado | Observação |
|---|---:|---|---|
| Produção `upstatus` | 480 | ACTIVE | Userscript embutido 3.4.7 |
| Produção `upstatus-team-lite` | 15 | ACTIVE | Userscript embutido 3.4.30 |
| Produção `upstatus-test` | 281 | ACTIVE | Está dentro do projeto de produção, não é projeto isolado |
| Produção `upstatus-screen-share-3-1-1-beta10` | 6 | ACTIVE | Serve script interno 3.1.1-beta8 |
| Laboratório `upstatus-signal-test` | 32 | ACTIVE | Endpoint de teste |
| Laboratório `upstatus-signal-e2e-once` | 3 | ACTIVE | Endpoint de teste |

Bundles implantados decodificados:

- **Normal 3.4.7:** distribuição `/upstatus/upstatus.user.js`, mas `CLOUD_SERVER` ainda aponta para `upstatus-screen-share-3-1-1-beta10`; tópico Realtime `upstatus-screen-share-live-3-1-1-beta10`.
- **Team Lite 3.4.30:** API própria `upstatus-team-lite`, mas também assina o tópico beta10.
- **beta10 v6:** script embutido beta8 e tópico beta8.
- Os triggers PostgreSQL publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

A #161 corrige o destino da API Normal no candidato, mas não altera o runtime implantado. O corte precisa alinhar cliente, API, tópico, versão e deploy na mesma release.

### Autenticação dos runtimes instalados

As três funções principais inspecionadas usam autenticação própria por `x-upstatus-token`: hash SHA-256, lookup em `public.upstatus_sessions`, expiração e cache de sessão de 30 segundos. A configuração de plataforma `verify_jwt=false` em 38/38 funções não prova, por si só, que todas as rotas estejam sem autenticação. A revisão desta execução cobriu as três funções principais, não todas as 38 rotas.

Ainda assim, os runtimes instalados Normal v480 e Team Lite v15 mantêm gaps concretos:

- `POST /api/setup` chama `login(req,true)` sem exigir/consumir token de convite.
- Se o papel da conta estiver vazio, o setup legado tem fallback nominal para Ricardo, Lohan e Guilherme.
- Normal exige senha mínima de seis caracteres; Team Lite instalado aceita quatro.
- `/api/chat/clear` verifica apenas o nome literal Ricardo, sem exigir o papel persistido `implementation_admin`.

A #161 melhora o fluxo candidato, mas não está implantada. Produção não tem as colunas `setup_token_*`, RPCs de convite ou tabela/RPC de rate limit.

## 5. Disponibilidade e projetos Supabase

A organização está no plano **Free** e lista somente dois projetos:

- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe Full-Product TEST independente. O laboratório tem duas Edge Functions, zero usuários, mensagens, sessões, salas, memberships, eventos, bindings, limites de convite, objetos Storage, mensagens Realtime ou partições Realtime. Não tem buckets de chat/perfil.

### Logs Edge — janela de 24 horas consultada

Produção: **77.945 registros; 77.945 com HTTP 402**. Primeiro registro 2026-11-16T11:41:55.514Z; último 2026-11-17T08:38:43.481Z.

| Rota | HTTP 402 |
|---|---:|
| beta10 `/api/chat` | 41.638 |
| beta10 `/api/status` | 18.110 |
| beta10 `/api/remote-status` | 18.092 |
| beta10 `/api/me` | 33 |
| beta10 `/api/account` | 33 |
| beta10 `/api/members` | 33 |
| distribuição `/upstatus/upstatus.user.js` | 6 |

A causa específica dos 402 em produção não foi determinada. O projeto está ACTIVE_HEALTHY, mas isso não contradiz a falha observada nas chamadas Edge.

Laboratório: 48 respostas 402 na função `upstatus-signal-test`. O corpo da resposta identifica `exceed_edge_functions_invocations_quota`; os testes de endpoint esperavam 401/405, receberam 402 e os testes Playwright/autenticados posteriores foram skipped.

## 6. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Produção

- 106 registros em `realtime.messages`, todos `private=false`: 72 user_status, 26 db_change, 4 remote_command e 4 remote_result.
- Zero policies em `realtime.messages`.
- Os triggers usam o tópico `upstatus-live-...`, diferente do tópico beta10 assinado pelos clientes instalados.
- `upstatus_broadcast_messages` publica a linha completa via `to_jsonb(OLD/NEW)`.
- `upstatus_broadcast_remote_state` publica campos de comando/resultado, incluindo remetente, destino e status.
- `upstatus_broadcast_users` publica nome e estado do usuário.
- As três funções são SECURITY DEFINER, `search_path=public`, EXECUTE para anon e authenticated. O Security Advisor retorna três WARN para anon e três para authenticated. São funções trigger; não foi demonstrada exploração por RPC direta.
- Dez tabelas públicas têm RLS habilitado e nenhuma policy.
- 166 entradas de grants de cliente em public/storage/realtime; 18 grants TRUNCATE em nove tabelas públicas.
- Default ACLs de postgres e supabase_admin continuam amplas em public/storage e outros schemas expostos.
- Buckets públicos: `chat-images` com 168 objetos e `profile-images` com 20; total 188. Zero policies próprias em Storage.

A ausência de policies faz operações de linha sujeitas a RLS falharem; não significa que RLS proteja TRUNCATE, que não é filtrado por policy. Não foi demonstrado que o TRUNCATE esteja exposto por uma rota REST.

### Laboratório

Os três triggers SECURITY DEFINER usam `search_path=''` e não concedem EXECUTE a anon/authenticated; somente service_role tem execução. Os payloads foram minimizados para `{"op":...}`, mas continuam sendo enviados com `private=false`. Não há linhas nem partições Realtime no laboratório. Os grants diretos de tabelas public para anon/authenticated são zero; o Advisor retorna 18 INFO de RLS sem policy, sem WARN SECURITY DEFINER. Ainda há default ACLs amplas em alguns schemas e grants de cliente em Realtime/Storage.

### Voz e compartilhamento de tela

O adapter `src/userscript/signaling-transport.mjs` declara `enabled=false` por padrão. O userscript exige flag explícita, endpoint configurado e mesma origem da API. Como não há `upstatus-signal` em produção, a sinalização server-mediated não pode ser habilitada com segurança no ambiente atual.

Os bundles implantados ainda recebem ofertas/ICE por broadcast público e validam campos do payload, não uma prova de identidade do remetente emitida pelo servidor. A possibilidade de spoofing de ofertas de voz/tela depende da configuração externa “Allow public access”, que não é exposta pelo conector. Não houve exploração, captura de áudio/tela ou teste externo; o risco foi identificado por inspeção estática.

## 7. Workflows de publicação

- `team-lite-official` contém `deploy-production.yml` que publica somente `upstatus` e usa Supabase CLI `latest`. Não existe pipeline próprio e seguro que publique `upstatus-team-lite`; o workflow `team-lite-candidate.yml` da #76 é CI, não deploy. Não despachar o workflow de produção da branch Team Lite.
- `develop` tem `deploy-test.yml` com gatilho push e secret genérico `SUPABASE_PROJECT_ID`, usando CLI `latest`.
- A candidata #76 melhora TEST: workflow manual-only, variável específica `SUPABASE_TEST_PROJECT_ID`, rejeição explícita dos IDs de produção e laboratório, CLI 2.122.1. Ainda não está integrada.
- O workflow Normal da #161 é manual-only, exige master, confere SHA e projeto, fixa CLI 2.122.1 e publica `upstatus`; porém mantém o guard de versão 3.4.7, incompatível com a necessidade de entregar uma versão mais nova ao cliente.

## 8. Migrations e proveniência

Produção tem sete migrations; laboratório tem 39. A branch gerenciada `main` da produção continua `MIGRATIONS_FAILED`.

A PR #176 recupera quatro arquivos SQL a partir do ledger de produção. A comparação read-only desta execução confirmou **4/4 textos de statement exatamente iguais** às quatro entradas do ledger:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_message_file_name.sql` (nome do arquivo no patch: `20261026195855_add_chat_message_file_name.sql`)
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Correção: são **quatro** migrations, nas versões 20261023154754, 20261026195855, 20261027154329 e 20261027155438. Os textos do ledger coincidem com os arquivos recuperados; isso não prova os bytes, comentários ou formatação dos arquivos originais. Não houve replay nem alteração da branch gerenciada. O Validate da #176 continua falhando por `client signed upload helper missing`.

## 9. Issues, gates e aceite físico

- Issue #78 continua OPEN, **0/8 critérios físicos aprovados**. Não houve teste de perda/retorno real de internet, reconexão sem F5, reentrada em sala, nova chamada, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 recebeu atualização no comentário QA existente; não foi criado comentário duplicado e o comentário da Engenharia foi preservado.

Gates QA:

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 106/106 Realtime públicos, zero policies, signaling de produção ausente |
| TEST-ISOLATION | blocked | somente dois projetos; laboratório sem fixtures/buckets/partições |
| MIGRATION-PROVENANCE | in_progress | 4/4 statement texts iguais ao ledger; original byte-for-byte e replay isolado pendentes |
| AUTH-03 | in_progress | #161 passou CI; runtime instalado ainda sem convite/rate limit |
| ACL-STORAGE | blocked | grants/default ACLs, triggers e buckets públicos sem policies |
| RECONNECT | pending | Issue #78 0/8, sem confirmação física |
| HUMAN-REVIEW | pending | PRs abertas/Draft, zero reviews e sem autorização de release |

## 10. Próximas ações recomendadas

1. O Owner da organização deve conferir Usage → Edge Function Invocations, Spend cap e Realtime → Allow public access no Dashboard; apenas informar o estado, sem alterar limites/permissões nesta etapa.
2. Determinar a causa dos 402 de produção e recuperar a quota do laboratório.
3. Resolver o versionamento da #161: a candidata precisa produzir versão superior à instalada e o guard do workflow precisa refletir a release aprovada.
4. Integrar/revalidar a candidata Normal #161 e planejar rollout coordenado da migration AUTH-03 e do runtime.
5. Criar sinalização server-mediated em produção, com membership, destinatário, replay, expiração e rate limit validados no servidor; remover fallback público sensível.
6. Corrigir RLS, grants, default ACLs, SECURITY DEFINER e Storage com migrations revisadas.
7. Criar Full-Product TEST independente e validar migrations sem tocar produção.
8. Criar pipeline próprio Team Lite, com slug, projeto, SHA e CLI fixos.
9. Executar os testes físicos da #78 e obter revisão/aprovação humana.

**Veredito: NOT READY.** A #161 é avanço técnico real, mas não está integrada nem publicada, a versão não permite comprovar atualização automática e produção segue com 402, setup legado, Realtime público e permissões excessivas.
