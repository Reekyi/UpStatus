# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-15T10:37:37.151Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Projeto Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Projeto Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA antes deste relatório:** `5032f989b2feb6c9bb6ce747b68298b8b99b305b`  
**Veredito:** **NOT READY**

## Método e limites

- Inspeção read-only de GitHub, commits, PRs, Actions, issues, workflows, artefatos e arquivos.
- Consultas Supabase exclusivamente SELECT/catalog/advisor/logs; nenhuma escrita SQL.
- Inspeção dos códigos-fonte das Edge Functions implantadas e dos userscripts embutidos.
- Nenhum workflow foi despachado, nenhum teste foi reexecutado e nenhum endpoint foi explorado.
- Não há checkout Git local neste ambiente e não há navegador/Tampermonkey/dispositivos para teste manual. Os resultados CI abaixo são evidências históricas nos SHAs exatos indicados, não execução desta rodada.
- Não foram consultados valores de secrets nem alteradas flags, roles, grants, policies ou ACLs.

Classificação: **CI PASS/FAIL** = resultado de workflow no SHA indicado; **CODE INSPECTION** = leitura estática/catalog; **MANUAL PENDING** = depende de navegador/dispositivo ou aceite humano; **BLOCKED** = dependência técnica/operacional sem resolução.

## 1. Documento de prontidão

O arquivo [docs/RELEASE_READINESS.md](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md) foi lido integralmente via blob GitHub (blob `7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c`, aproximadamente 1,046,356 caracteres). Sua última seção de revalidação é **2026-11-15 06:30 UTC**. A auditoria das 09:41 UTC existe como arquivo separado (`docs/audits/2026-11-15-upstatus-qa-audit-0941-utc.md`), mas não está refletida no fim do documento-base. Este relatório mantém o histórico em arquivo novo, sem substituir conteúdo concorrente.

## 2. Heads reais e governança

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `5032f989b2feb6c9bb6ce747b68298b8b99b305b` |

QA diverge de master em **334 commits à frente e 1 atrás**. Os arquivos divergentes são documentais.

As quatro branches retornam `protected=false`; master/develop também mostram checks obrigatórios desativados. A API de repository rulesets retorna lista vazia. Não há barreira efetiva de aprovação/checks para essas branches.

## 3. PRs, reviews e CI

Todas as PRs #74, #75, #76 e #82 continuam abertas, Draft e sem reviews humanas submetidas.

| PR | HEAD exato | CI observado |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate 43376770142 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770142); [Smoke 43376770200 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127 PASS histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | [Candidate Checks 43363871881 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `5032f989b2feb6c9bb6ce747b68298b8b99b305b` | [Validate 43700473872 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43700473872) |

### Detalhes de CI

- **#74:** 136/136 verificações autenticadas passaram; smoke validou call/voice/screen WebRTC, entrega de tracks, mesh de três participantes, teardown, rate limit de sinalização (90 aceitos e próximo HTTP 429 com Retry-After 60s), recibos atômicos e setup enrollment. O passo de rate limit distribuído de emissão de convites foi **SKIPPED**, portanto não está aprovado por esse run.
- **#75:** o run histórico executou somente checagens de scripts/metadata da candidata; é baseline substituída por #76, não uma segunda validação completa.
- **#76:** 110/110 verificações autenticadas passaram. O run inclui Chromium com IIFE completo e stubs Tampermonkey, call/voice/screen WebRTC, mesh de três participantes, rate limit, read receipts, setup invite atomic consumption e rate limit distribuído de emissão de convites. Os testes usaram o projeto isolado, não produção.
- **#82:** no HEAD exato `5032f989`, o job `validate` falhou em `scripts/validate.mjs` com `VALIDATION FAILED: production updateURL mismatch`. O log do job [132770283008](https://github.com/Reekyi/UpStatus/actions/runs/43700473872) confirma o erro. Não houve alteração de código para contornar o validator.

A #76 é continuação de #75; não contar ambas como entregas independentes. Nenhum resultado CI substitui os testes físicos da #78.

## 4. Incidente de disponibilidade: HTTP 402

Na janela consultada de 24h (`2026-11-14T10:30:26Z` a `2026-11-15T10:30:26Z`), os logs registraram **94 respostas HTTP 402 em produção** e **19 no laboratório**.

### Produção — 94 registros

| Rota | 402 |
|---|---:|
| `/functions/v1/upstatus-team-lite/upstatus-team-lite.user.js` | 25 |
| `/functions/v1/upstatus/upstatus.user.js` | 22 |
| `/functions/v1/upstatus-screen-share-3-1-1-beta10/api/chat` | 21 |
| `...beta10/api/remote-status` | 10 |
| `...beta10/api/status` | 10 |
| `/realtime/v1/websocket` | 6 |

Os 88 registros de Edge Function ocorreram entre 14/11 16:32:55 e 20:57:39 UTC; os seis registros do gateway Realtime ocorreram entre 17:57:03 e 17:57:24 UTC. O último 402 observado foi às **20:57:39 UTC**.

### Laboratório — 19 registros

Os 19 ocorreram no `upstatus-signal-test` às 17:10:45 UTC de 14/11, distribuídos entre `signal`, `health`, rotas de sala, broadcast e rotas de teste inválidas.

**Causa não determinada.** Os logs comprovam status HTTP 402 e rotas afetadas, mas não comprovam quota/billing como causa. A ausência de novos 402 depois do último registro também não prova recuperação nem disponibilidade normal; pode simplesmente não ter havido tráfego registrado. É necessário que alguém com acesso a Usage/Billing/limites do Supabase correlacione os horários e confirme a recuperação antes de novos testes integrados.

## 5. Runtimes implantados e compatibilidade

Snapshot read-only dos runtimes principais:

| Função | Versão da Edge Function | Userscript embutido |
|---|---:|---:|
| `upstatus` | v480 | Normal 3.4.7 |
| `upstatus-team-lite` | v15 | Team Lite 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | bundle embutido com header 3.1.1-beta8 |
| `upstatus-test` | v281 | legado 3.3.28 |

### Normal e Team Lite

- Normal é servido por `upstatus`, mas seu `CLOUD_SERVER` ainda aponta para `upstatus-screen-share-3-1-1-beta10`.
- Team Lite usa `upstatus-team-lite` como API e atualiza diretamente de uma URL GitHub mutável em `team-lite-official`.
- Ambos usam o tópico Realtime `upstatus-screen-share-live-3-1-1-beta10`.
- Os dois bundles instalados não contêm `private:true`, `setAuth()` nem o transporte candidato `upstatus-signal`.
- Os dois runtimes mantêm cache de validação de sessão de **30 segundos**. A melhoria candidata de cache mais curto não está nos runtimes implantados.
- A senha mínima no login é 6 caracteres no Normal e 4 no Team Lite.
- `/api/setup` ainda não exige convite único. O fallback de role usa nomes de conta.
- `/api/account?name=...` revela o estado `needsSetup` sem autenticação.
- `/api/chat/clear` ainda autoriza pelo nome `Ricardo`, sem exigir o papel persistido `implementation_admin`.
- `sniffMime()` retorna o MIME declarado quando não reconhece a assinatura dos bytes; isso não é validação robusta de conteúdo.

A função beta10 v6 serve um bundle com header beta8 e updater beta8, apesar do slug beta10. É uma divergência de artefato legado; não foi provado que usuários atuais baixem esse bundle diretamente, mas Normal ainda utiliza essa função como API.

`verify_jwt=false` aparece nas 38 funções ativas. Isso **não** prova que todas estejam sem autenticação: os handlers principais usam autenticação própria por `x-upstatus-token`/sessão. O problema confirmado é a combinação de endpoints legados, setup sem convite e autorização administrativa por nome, não uma conclusão genérica de ausência de autenticação em todas as rotas.

## 6. Workflow Team Lite e cadeia de publicação

[Workflow oficial Team Lite](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml):

- checkout não fixa SHA/ref aprovado;
- usa Supabase CLI `latest`;
- não compara explicitamente o projeto com um ID aprovado;
- valida o `release.json` da raiz;
- publica `upstatus`, não `upstatus-team-lite`.

Na branch `team-lite-official`, o `release.json` da raiz é `3.0.40-beta.22`, enquanto `team-lite/release.json` declara buildVersion `3.4.30` stable. O guard de prerelease da raiz deve bloquear a execução atual antes do deploy. Isso reduz o risco imediato, mas o workflow continua incorreto e, se o guard for satisfeito, o slug de publicação continua errado. **Não despachar.**

## 7. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Produção

- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; grants SELECT/INSERT/UPDATE para anon/authenticated; 106 linhas observadas, todas `private=false`.
- Os triggers publicam no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. Os tópicos não coincidem.
- `upstatus_broadcast_messages()` publica `to_jsonb(OLD/NEW)` completo em `db_change`, com `private=false`. Os triggers de users e remote-state também publicam em canal público.
- As três funções são SECURITY DEFINER, retornam `trigger`, têm `search_path=public` e privilégios EXECUTE efetivos para anon/authenticated/service_role. O Advisor gera 3 WARN para anon e 3 WARN para authenticated. Como retornam `trigger`, a invocação RPC direta não foi demonstrada; não afirmar exploit RPC. Os grants são desnecessários e o payload público é o risco concreto.
- Dez tabelas públicas têm RLS e zero policies. Nove delas (`users`, `messages`, `reactions`, `upstatus_state`, `upstatus_sessions`, `upstatus_profiles`, `upstatus_typing`, `chat_reads`, `status_history`) concedem a anon/authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE efetivos. `upstatus_visual_config` não concede esses privilégios. RLS não bloqueia TRUNCATE.
- Default ACLs de postgres/supabase_admin permanecem amplas em public, storage e schemas GraphQL.
- `storage.objects`: RLS habilitado, zero policies; grants de cliente para SELECT/INSERT/UPDATE/DELETE.
- Buckets `chat-images` e `profile-images` são públicos, limite de 20 MiB cada, sem policies próprias. URLs públicas permitem leitura por quem possui o endereço.

### Laboratório

- 17 tabelas públicas consultadas com RLS, zero policies e sem privilégios diretos para anon/authenticated.
- Três funções de broadcast mantêm SECURITY DEFINER, mas com `search_path` vazio e EXECUTE restrito a service_role.
- `realtime.messages` está sem linhas; continua sem policies e com grants de cliente.
- Default ACL de `supabase_admin` em public/GraphQL e defaults de postgres em storage ainda são amplos.
- Sem buckets nem fixtures de produto.

O laboratório está mais restritivo em tabelas públicas e funções, mas não concluiu RT-01 nem ACL-STORAGE.

## 8. AUTH-03, migrations e ambiente

- Produção: 5 usuários, 319 sessões, 302 mensagens; tabela `users` sem colunas `setup_token_*`; sem tabelas públicas de rate limit ou `upstatus_signal_*`.
- Laboratório: zero usuários/sessões/mensagens; quatro colunas `setup_token_*`; tabelas `upstatus_signal_rate_limits` e `upstatus_setup_invite_rate_limits`, mais tabelas de rooms/members/events/call attempts.
- Produção: 7 migrations no ledger.
- Laboratório: 39 migrations.
- Produção está `ACTIVE_HEALTHY`, mas a branch gerenciada Supabase `main` permanece `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Laboratório está `ACTIVE_HEALTHY`, mas não é Full-Product TEST: zero usuários, mensagens, sessões, perfis e buckets.
- Os quatro arquivos abaixo continuam ausentes tanto em master quanto na QA, embora as versões constem no ledger de produção (404 em ambos os refs):
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

## 9. Issues e testes manuais

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, **0/8** critérios físicos marcados. A regra funcional de sala aberta sem convite permanece explícita.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, **16/35** itens marcados.
- Reconexão Normal/Team Lite sem F5, reentrada em sala, nova chamada, microfone/áudio reais, captura de tela real e interoperabilidade instalada permanecem MANUAL PENDING.
- Nenhum teste manual foi executado; não há checkout local nem navegador/Tampermonkey neste ambiente.

## 10. Gates e recomendação

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | Produção: 106/106 broadcasts públicos; bundles sem private/auth transport |
| TEST-ISOLATION | BLOCKED | Laboratório isolado, mas vazio; main gerenciada MIGRATIONS_FAILED |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs 404 em master e QA |
| AUTH-03 | BLOCKED | Setup token/rate-limit só no laboratório; runtimes oficiais sem convite |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, buckets públicos e zero policies |
| RECONNECT | MANUAL PENDING | Issue #78 0/8; sem navegador físico |
| HUMAN-REVIEW | PENDING | PRs abertas/Draft e sem reviews |

**Recomendação: NOT READY.** Prioridades:
1. Diagnosticar causa dos 402 e comprovar recuperação com tráfego normal.
2. Corrigir o workflow Team Lite e congelar distribuição por branch mutável.
3. Coordenar o cutover Normal: userscript servido por `upstatus`, API ainda apontada para beta10.
4. Migrar ambos os produtos para sinalização autenticada como padrão; remover payloads completos de broadcasts públicos e alinhar tópicos.
5. Integrar AUTH-03 nos dois runtimes; remover autorização baseada em nome.
6. Restringir grants/Default ACL/Storage e revisar funções SECURITY DEFINER.
7. Recuperar os quatro SQLs originais e resolver `MIGRATIONS_FAILED`.
8. Provisionar Full-Product TEST.
9. Executar os oito critérios físicos da #78 e obter aprovação humana.

## Integridade

Nenhuma produção foi modificada. Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva foi realizada. Todas as consultas SQL foram SELECT/catalog-only. A única escrita desta execução é este arquivo novo na branch QA e a atualização do comentário QA dedicado na Issue #79.
