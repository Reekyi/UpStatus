# UpStatus — auditoria independente de QA
**Data:** 2026-11-10 00:33 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Laboratório:** `bfpjtfqlnypisxljoxkb`  
**Escopo:** userscript/app de presença, chat, voz e compartilhamento de tela integrado ao Sale Smartly.

## Método e classificação

- Inspeção read-only de GitHub (refs, PRs, commits, patches, workflows, check-runs, logs e reviews).
- Inspeção read-only de Supabase (projetos, migrations, Edge Functions, Advisors e consultas SQL somente SELECT).
- Leitura integral de `docs/RELEASE_READINESS.md` via URL raw do GitHub, pois `fetch_file` confirmou o blob, mas retornou conteúdo vazio. O arquivo tem **1.050.184 caracteres e 8.409 linhas**, blob `7cfbd70886df42ce790c078c224b19284a632595`. A última seção do documento termina em 2026-11-08 18:30 UTC; o checkpoint está desatualizado para esta fotografia.
- **CI PASS** significa somente que o workflow terminou com sucesso no SHA indicado.
- **CODE INSPECTION** não é teste de execução.
- **MANUAL PENDING** exige navegador/dispositivo real e confirmação humana.
- **BLOCKED** indica dependência ou risco não resolvido.
- Nenhum teste físico foi executado pela auditoria.

## Heads e integridade das branches

| Referência | SHA observado |
|---|---|
| QA `qa/release-readiness-2026-11-04-master` | `cfe2006a232a5ceffe33f9ab44421620d2276798` |
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 Normal | `5939b57027748eb9af08327d2a8c712fd5046484` |
| PR #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 Team Lite | `86736e3eb70ecb7dd9dce498c03f58e65cee06c3` |
| PR #82 QA | `cfe2006a232a5ceffe33f9ab44421620d2276798` |
| PR #130 AUTH-03 Normal | `606aaff264c081bb19e974c23a48b71ece27cec1` |
| PR #129 Team Lite dispatcher guard | `886d364d0c43af0d8aed867bf04c407478af5e8f` |
| PR #125 default-branch dispatcher | `35c9122d5a07a0890c1fafda86cadd3a842f96b1` |

QA está **174 commits à frente e 1 atrás** de `master`, com merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. O único commit exclusivo de master observado é documental. A branch `team-lite-official` está divergente de master (220 à frente, 147 atrás). Não fiz rebase, merge ou alteração em branches de engenharia.

## CI e PRs

| PR | Evidência no SHA | Classificação |
|---|---|---|
| #74 Normal | Validate [42689757655](https://github.com/Reekyi/UpStatus/actions/runs/42689757655) e Signaling Smoke [42689757169](https://github.com/Reekyi/UpStatus/actions/runs/42689757169), ambos PASS no SHA `5939b570` | **CI PASS** |
| #75 Team Lite | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS no baseline `7bbf9b9` | **PASS histórico**, substituído pela linha #76 |
| #76 Team Lite | Candidate Checks [42698289332](https://github.com/Reekyi/UpStatus/actions/runs/42698289332) PASS no SHA `86736e3` | **CI PASS** |
| #82 QA | Validate [42721318693](https://github.com/Reekyi/UpStatus/actions/runs/42721318693) FAIL no SHA `cfe2006` | **CI FAIL** |
| #130 AUTH-03 | Signaling Smoke [42717934162](https://github.com/Reekyi/UpStatus/actions/runs/42717934162) PASS no SHA `606aaff`, evento `push` | **CI PASS por push; sem check de PR confirmado** |
| #129 Team Lite dispatcher guard | Push [42670881277](https://github.com/Reekyi/UpStatus/actions/runs/42670881277) e PR [42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535), ambos PASS | **CI PASS**, PR ainda Draft |
| #125 dispatcher master | Offline guard PASS; Validate [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) FAIL e deploy SKIPPED | **Bloqueado** |

### Detalhes de CI dos candidatos

- **#74:** log confirma 136/136 verificações autenticadas, WebRTC de chamada, voz e tela com entrega de tracks, mesh de três participantes, rate limit (90 aceitas e 1 rejeitada com HTTP 429), recibos de leitura e setup por convite com consumo único. O teardown das fixtures foi confirmado pelo próprio job.
- **#76:** log confirma 110/110 verificações autenticadas, WebRTC de chamada, voz e tela, mesh de três participantes, rate limit, recibos atômicos, setup por convite e regressões de saída/reentrada de sala, logout e recuperação de contexto offline/online. A divergência de `VOICE_ATTEMPT_CONFLICT` foi corrigida no bundle candidato e o Candidate Checks passou.
- Esses testes são automatizados e executados em ambiente isolado. Não substituem Tampermonkey instalado, rede física, permissões reais de microfone/tela ou aceitação manual.

### PR #82

O Validate falhou no HEAD exato `cfe2006` com `production updateURL mismatch`, em `scripts/validate.mjs:26`. Não iniciei rerun nem alterei o validator.

### PR #130 — avanço parcial de AUTH-03

A PR é empilhada sobre a linha Normal (#74), com base `chore/continuity-foundation`, e continua Draft. O workflow `signaling-smoke.yml` limita o evento `pull_request` à base `master`; como #130 usa outra base, o resultado disponível é o evento **push**, não um check de PR.

O run [42717934162](https://github.com/Reekyi/UpStatus/actions/runs/42717934162) passou em todas as etapas. O log confirma 136/136 checks autenticados, testes de navegador WebRTC para chamada/voz/tela, mesh de três participantes, rate limit de sinalização, recibos atômicos, consumo único de convite e o novo teste concorrente de emissão de convites.

A nova proteção Normal:
- limita a emissão a 5 convites por administrador em 15 minutos;
- usa chave derivada por hash do administrador;
- consome contador via upsert atômico no PostgreSQL;
- falha fechado com HTTP 503 quando o RPC falha e responde HTTP 429 ao exceder o limite;
- usa RPC `SECURITY INVOKER`, `search_path` vazio e EXECUTE apenas para `service_role`;
- faz limpeza oportunista limitada a 100 registros antigos.

O teste envia 24 chamadas concorrentes, exige 5 permitidas e 19 negadas, verifica reset de janela e remove a fixture. O run passou. Isso valida o contrato no laboratório, mas não valida HTTP de produção.

**Limites:** o patch cobre a emissão de convites no Normal; não comprova rate limit para tentativas de login/consumo de setup e não inclui o runtime Team Lite. A migration de produção não foi aplicada. AUTH-03 permanece parcial.

## Workflows e compatibilidade de publicação

- O workflow oficial `.github/workflows/deploy-production.yml` em `team-lite-official` (blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`) ainda carrega secrets de produção, instala Supabase CLI `latest` e executa `supabase functions deploy upstatus`. O alvo é incorreto: deveria ser `upstatus-team-lite`. **Não despachar.**
- #129 remove essas credenciais/comandos do workflow legado e falha fechado, mas continua Draft; a branch oficial ainda contém o fluxo antigo.
- #125 propõe um dispatcher na branch master, mas o Validate falha com o mesmo `production updateURL mismatch`; o job de deploy foi SKIPPED.
- O workflow `develop/.github/workflows/deploy-test.yml` (blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`) tem gatilho push em `develop`, usa o secret genérico `SUPABASE_PROJECT_ID` e publica `upstatus-test`. A função `upstatus-test` v281 está no próprio projeto Supabase de produção. Isso não comprova um ambiente full-product TEST independente; o valor do secret não foi lido.
- O workflow Normal de produção publica somente `upstatus`. O build injeta o backend API `upstatus-screen-share-3-1-1-beta10`, enquanto `release.json` 3.4.7 aponta o updateURL para `/upstatus/upstatus.user.js`. O cutover precisa coordenar delivery e API; o workflow atual não publica ambos.
- O build Normal define `PROD_TOPIC=upstatus-screen-share-live-3-1-1-beta10`, o tópico legado.
- O artefato Team Lite oficial é 3.4.30; o candidato #76 é 3.4.31, mas o updateURL do candidato aponta para o artefato da branch oficial que ainda contém 3.4.30. Isso precisa ser resolvido antes de distribuir a candidata.

## Realtime — bloqueador crítico RT-01

### Código implantado e configuração

- Normal implantado: `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; userscript embutido 3.4.7.
- API Normal: `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- Team Lite implantado: `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; artefato oficial 3.4.30.
- Normal e Team Lite implantados assinam `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` e sem `realtime.setAuth()`.
- Os templates candidatos também mantêm o transporte server-mediated opt-in: `signaling_transport_enabled=false` por padrão e endpoint vazio. Não há função `upstatus-signal` em produção.
- O laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3; isso não é um endpoint implantado em produção.

### PostgreSQL e broadcasts

Consulta SELECT atual:
- 48 mensagens em `realtime.messages`, todas `private=false`: 22 `db_change`, 20 `user_status`, 3 `remote_command`, 3 `remote_result`.
- Todas estão no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os clientes continuam no tópico legado `upstatus-screen-share-live-3-1-1-beta10`; o tópico dos triggers não coincide com o tópico dos clientes.
- `upstatus_broadcast_messages()` envia `to_jsonb(OLD/NEW)` completo em `db_change`.
- `upstatus_broadcast_remote_state()` envia metadados de comando/resultado (`sender`, `target`, `status`, `reason`, timestamps e resultado).
- `upstatus_broadcast_users()` envia nome, status, motivo, atualização e sync.
- As três funções são `SECURITY DEFINER`, `search_path=public`, retornam `trigger` e estão associadas a triggers. O Advisor aponta EXECUTE para anon e authenticated (3 WARN por papel). Não executei RPC nem demonstrei exploração direta; o risco confirmado é o broadcast público e a falta de autenticação do remetente nos clientes.

A tabela `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado, zero policies, sete partições diretas e privilégios SELECT/INSERT/UPDATE para `anon` e `authenticated`.

## Supabase produção: RLS, grants, Storage e Edge Functions

Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.

- 10 tabelas em `public` com RLS e sem policies.
- 9 tabelas públicas com grants diretos para `anon`/`authenticated`, incluindo `TRUNCATE`.
- 24 entradas de Default ACL: postgres em public/storage; supabase_admin em extensions/graphql/graphql_public/public/realtime; supabase_auth_admin em auth.
- `storage.objects`: RLS true, zero policies; grants SELECT/INSERT/UPDATE/DELETE para anon e authenticated.
- Buckets `chat-images` e `profile-images` são públicos, cada um com limite de 20 MiB.
- O `signedUploadRoute` implantado valida MIME, tamanho e nome declarados, gera signed upload URL e URL pública, mas não inspeciona os bytes enviados. O helper `sniffMime` do caminho de upload direto retorna o MIME declarado quando não reconhece a assinatura.
- Security Advisor: 10 INFO por RLS sem policy, 3 WARN de SECURITY DEFINER executável por anon e 3 WARN por authenticated. O tipo de retorno `trigger` foi confirmado; não foi feita tentativa de invocação direta.
- 38/38 Edge Functions estão ACTIVE e reportam `verify_jwt=false`. Isso, isoladamente, não prova falta de autenticação: os três runtimes principais usam token de sessão próprio. Não auditei individualmente os 38 handlers.
- Runtimes principais: Normal v480, Team Lite v15, API beta10 v6 e `upstatus-test` v281. Não existe `upstatus-signal` em produção.

### AUTH-03 implantado

Nos três runtimes implantados, `POST /api/setup` encaminha para `login(req,true)`. Se a conta não tem password_hash, o fluxo antigo permite definir a senha sem convite. Quando o papel está vazio, o setup atribui `implementation_admin` aos nomes Ricardo/Lohan/Guilherme; isso é uma allowlist nominal no setup, não uma validação de convite. Normal exige senha mínima de 6 caracteres; Team Lite, 4.

Produção não tem colunas `setup_token_*`, RPC `consume_upstatus_setup_invite`, tabela ou RPC de rate limit da #130. A candidata de convite/consumo atômico e a proteção de emissão #130 ainda não estão implantadas.

## Migrations e isolamento de teste

Produção:
- 7 migrations remotas, até `20261027155438`.
- Quatro arquivos SQL originais retornam 404 em `master`:
  1. `20261023154754_create_upstatus_visual_config.sql`
  2. `20261026195855_add_chat_message_file_name.sql`
  3. `20261027154329_allow_chat_document_mime_types.sql`
  4. `20261027155438_set_upstatus_upload_limits_20mb.sql`
- Branch Supabase gerenciada `main`: `MIGRATIONS_FAILED`; projeto principal continua ACTIVE_HEALTHY.
- Não reconstruí SQL a partir do schema atual.

Laboratório `bfpjtfqlnypisxljoxkb`:
- Projeto ativo separado, região sa-east-1, 39 migrations e duas Edge Functions de teste.
- A migration de contrato de rate limit da #130 aparece no histórico como `20261110000612_setup_invite_rate_limit_contract_test_20261109`.
- A tabela e a RPC de rate limit existem; tabela com RLS; RPC SECURITY INVOKER, search_path vazio, EXECUTE apenas para service_role; nenhum grant direto a anon/authenticated.
- Consulta read-only encontrou zero linhas na tabela de rate limit, zero usuários e zero mensagens.
- A conta Supabase lista apenas dois projetos: produção e laboratório. O laboratório é de segurança/sinalização, não um ambiente full-product TEST independente. `upstatus-test` v281 continua sendo uma função dentro do projeto de produção.

## Issues, reviews e testes manuais

- Issue #78 está OPEN, **0/8 critérios físicos marcados**. Não houve teste real de Tampermonkey, queda de internet, recuperação sem F5, permissões reais de microfone/tela ou interoperabilidade instalada.
- Issue #79 está OPEN; o corpo tem 16 itens marcados e 19 pendentes. O comentário de QA é separado do comentário da Engenharia.
- Reviews humanas: nenhuma review registrada em #74, #75, #76, #82 ou #130. #129 e #125 continuam Draft.
- Rulesets retornaram lista vazia; endpoints de branch protection responderam 403. Portanto, proteção de branch não pôde ser confirmada nem descartada.

## Gates atuais

| Gate | Status | Motivo |
|---|---|---|
| RT-01 | **blocked** | Broadcast público, tópico divergente e transporte autenticado desativado por padrão |
| TEST-ISOLATION | **in_progress** | Laboratório limpo e isolado, mas não existe full-product TEST independente |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes; produção main em MIGRATIONS_FAILED |
| AUTH-03 | **in_progress** | Convite e rate limit candidato Normal avançaram; sem paridade Team Lite e sem implantação |
| ACL-STORAGE | **blocked** | RLS sem policies, grants amplos, Default ACLs e Storage público |
| RECONNECT | **pending** | Oito critérios físicos da #78 ainda sem confirmação |
| HUMAN-REVIEW | **pending** | Sem reviews humanas e sem autorização explícita de release |

## Ação manual necessária

Ricardo precisa executar e registrar os oito critérios físicos da Issue #78, especialmente:
1. Instalar Normal e Team Lite no Tampermonkey.
2. Derrubar a internet por aproximadamente 10 segundos durante uso real.
3. Confirmar recuperação sem F5.
4. Testar reentrada em sala e novas chamadas.
5. Verificar microfone e compartilhamento de tela com permissões reais.
6. Confirmar ausência de peers/pollers órfãos ou duplicados.
7. Testar interoperabilidade Normal ↔ Team Lite.
8. Registrar evidências e resultado na Issue #78.

## Veredito

**NÃO LIBERAR — `not_ready`.** O CI dos candidatos Normal e Team Lite passou nos SHAs auditados; a PR #130 passou no Smoke isolado por push. A PR #82 falha no HEAD atual. O rate limit novo é progresso parcial e ainda não cobre Team Lite nem produção. Realtime público, AUTH-03 legado, ACL/Storage, migrations, workflow Team Lite e aceitação física continuam bloqueando o release.

Nenhuma migration, SQL write, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL, publicação de userscript ou teste físico foi executado pela auditoria. A execução de CI da #130 foi disparada por push anterior da Engenharia e foi apenas inspecionada; ela usou explicitamente o laboratório e limpou suas fixtures. A única escrita desta auditoria é este documento novo na branch QA e a atualização do comentário dedicado de QA na Issue #79.
