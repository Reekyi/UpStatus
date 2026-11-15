# Auditoria independente de QA — UpStatus
**Data:** 2026-11-15T03:41:41.316Z  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Decisão:** **NOT READY — não liberar**

## Método e limites
Leitura integral de `docs/RELEASE_READINESS.md` na branch QA via conteúdo bruto do GitHub: **1.050.184 caracteres / 5.746 linhas**. O último checkpoint interno do documento é **2026-11-08 18:30 UTC**; os heads e resultados nele registrados estão defasados. O arquivo histórico não foi sobrescrito. Esta auditoria foi salva em um arquivo novo na branch QA.

Foram usados GitHub e Supabase em modo de inspeção: refs/PRs, reviews, workflows/logs, fontes de Edge Functions, catálogos PostgreSQL, migrations, advisors e logs. **Não houve checkout local, execução de testes pela QA, navegador/Tampermonkey ou teste físico.** Os resultados de CI abaixo são execuções preexistentes nos heads exatos. SQL executado pela auditoria foi SELECT-only.

## 1. Refs e governança
| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `3f1d80d82b8f3d11bc674635998781d59db9d853` |

A API de branches retornou `protected=false` para as quatro branches; `protection.enabled=false`. O endpoint de repository rulesets retornou `[]`. Não há proteção de branch nem rulesets configurados. A verificação de regras de ambiente/reviewers de deployment não foi feita.

## 2. PRs e CI exato
| PR | HEAD | Base | Divergência | Estado / evidência |
|---|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | master `a9288cc` | 887 ahead / 1 behind; 90 arquivos | Open/Draft; Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) PASS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official `9065bc1` | 59 ahead / 0 behind; 10 arquivos | Open/Draft; Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | team-lite-official `9065bc1` | 386 ahead / 0 behind; 57 arquivos | Open/Draft; Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `3f1d80d82b8f3d11bc674635998781d59db9d853` | master `a9288cc` | 326 ahead / 1 behind; 175 arquivos | Open/Draft; Validate [43669063503](https://github.com/Reekyi/UpStatus/actions/runs/43669063503) FAIL |

#76 é descendente de #75: 327 commits à frente e zero atrás. Não tratar #75 e #76 como payloads independentes. #74 e #82 também estão baseadas em um SHA de master anterior ao HEAD atual. Reviews submetidas: **nenhuma** em #74, #75, #76 e #82.

### Detalhe dos jobs
- **#74 Validate:** build guard TEST e `scripts/validate.mjs` passaram.
- **#74 Smoke:** 19/19 checks não autenticados; 136/136 autenticados; endpoint autenticado, WebRTC/voz/tela, rate limit distribuído (90 aceitos + 1 HTTP 429, Retry-After 60s), recibos atômicos e setup enrollment passaram. A etapa de sintaxe do harness de rate limit de emissão de convites e a verificação distribuída desse rate limit ficaram **SKIPPED**. Não declarar o rate limit de emissão validado neste head.
- **#76 Candidate Checks:** 16/16 não autenticados; 110/110 autenticados; 11/11 contratos HTTP; IIFE completo no Chromium com stubs de Tampermonkey; recuperação de voz/tela, rate limit, convite único e rate limit de emissão de convites passaram. É CI isolado, não teste físico.
- **#82:** falha no passo `Validate build`: `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`. É falha real do Validate no HEAD atual, ainda que a PR seja documental. A correção candidata #167 passou em seu próprio Validate, mas não está integrada a master nem substituiu a falha da #82.

## 3. Workflows de publicação — bloqueador
Arquivo oficial Team Lite [`.github/workflows/deploy-production.yml`](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml), blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`:
- `workflow_dispatch`, environment `production`;
- Supabase CLI `latest`;
- usa `secrets.SUPABASE_PROJECT_ID`;
- executa `supabase functions deploy upstatus`.

**Slug errado:** esse workflow publica a função Normal, não `upstatus-team-lite`. Não foi despachado.

O workflow `deploy-test.yml` em develop e team-lite-official é o mesmo blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`. Tem `workflow_dispatch` e push em develop, usa `secrets.SUPABASE_PROJECT_ID`, CLI `latest`, e publica `upstatus-test`. Não contém guard explícito que valide o project-ref isolado. O valor do secret não foi lido; o destino efetivo não foi afirmado. Não foi executado.

## 4. Supabase — estado e Edge Functions
- Produção: `ACTIVE_HEALTHY`, PostgreSQL 17.11, **7 migrations**, **38 Edge Functions ACTIVE**.
- Laboratório: `ACTIVE_HEALTHY`, PostgreSQL 17.11, **39 migrations**, duas funções ACTIVE.
- Branch gerenciada `main` da produção: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Produção contém `upstatus` v480 (userscript 3.4.7), `upstatus-team-lite` v15 (3.4.30), `upstatus-test` v281 (3.3.28) e o runtime legado `upstatus-screen-share-3-1-1-beta10` v6. O slug `upstatus-test` está no projeto de produção, não no projeto isolado.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não há `upstatus-signal` server-mediated em produção.

## 5. Realtime — P0 de release
Definições de produção confirmadas por `pg_get_functiondef`:
- `upstatus_broadcast_messages()` é SECURITY DEFINER, `search_path=public`, serializa OLD/NEW completos com `to_jsonb` e chama `realtime.send(..., false)`.
- `upstatus_broadcast_remote_state()` publica metadados de comandos/resultados.
- `upstatus_broadcast_users()` publica nome/status/reason/timestamp/sync.
- Todas usam o tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

Snapshot de `realtime.messages` nos últimos 14 dias: **106 linhas, todas `private=false`**:
- 72 `user_status`;
- 26 `db_change`;
- 4 `remote_result`;
- 4 `remote_command`.
Última linha observada: 2026-11-13 20:52 UTC.

Também decodifiquei o userscript embutido nos runtimes implantados:
- Normal 3.4.7 e Team Lite 3.4.30 assinam `upstatus-screen-share-live-3-1-1-beta10`, não o tópico dos triggers.
- Nenhum contém `private:true` ou `realtime.setAuth()`.
- Normal executa `remote_command` quando `command.target===member`, sem autenticação do emissor no listener.
- Team Lite verifica sessão/generation local, mas não prova identidade do publicador.
- `call_signal`, voice-room e screen-share entregam payloads recebidos aos handlers; a identidade/origem do emissor não é autenticada pelo Realtime.

O tópico divergente impede afirmar que os 106 eventos foram entregues aos clientes instalados. A configuração Dashboard “Allow public access” não foi observada e não houve exploração externa. Classificação: **caminho de divulgação/confiança não autenticada confirmado por código e catálogo; acesso externo efetivo não reproduzido**.

No laboratório, os três triggers enviam somente `{op: TG_OP}`, usam `search_path=''` e EXECUTE somente para postgres/service_role. Contudo continuam com `private=false`; `realtime.messages` não tem policies e ainda concede SELECT/INSERT/UPDATE a anon/authenticated. O laboratório tem zero linhas Realtime.

## 6. RLS, grants, SECURITY DEFINER e Storage
### Produção
- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas backend-owned concedem a anon e authenticated 7 privilégios cada: SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER e TRUNCATE (**63 entradas por papel; 126 no total**). `upstatus_visual_config` não concede esses grants aos clientes.
- `realtime.messages`: grants SELECT/INSERT/UPDATE a anon/authenticated, sem policies.
- Três funções SECURITY DEFINER de broadcast têm EXECUTE efetivo para PUBLIC, anon, authenticated e service_role; `search_path=public`. O Advisor retorna 3 WARN para anon e 3 WARN para authenticated, citando RPCs. As funções retornam `trigger`; a auditoria não tentou invocá-las por HTTP/RPC.
- Security Advisor: 10 INFO RLS/no-policy + 6 WARN SECURITY DEFINER.

### Laboratório
- 18 tabelas públicas com RLS e zero policies; grants diretos nas tabelas públicas somente para service_role.
- Storage e Realtime ainda têm grants de cliente (anon/authenticated); zero policies em `storage.objects` e `realtime.messages`.
- Security Advisor: 18 INFO RLS/no-policy e zero WARN.
- Default ACLs de postgres em public estão mais restritas; defaults de postgres em storage e de supabase_admin em GraphQL ainda mantêm privilégios amplos.

### Storage de produção
- `chat-images`: público, 168 objetos, limite 20 MiB; allowlist inclui imagens, áudio, vídeo e documentos.
- `profile-images`: público, 20 objetos, limite 20 MiB.
- Zero policies próprias em `storage.objects`. Buckets públicos permitem leitura por URL pública; não foi testado acesso a objetos.

## 7. Código implantado: AUTH, chat e upload
Inspeção estática das Edge Functions Normal v480 e Team Lite v15:
- Normal exige senha mínima de **6** caracteres; Team Lite exige **4**, apesar de compartilharem contas.
- Ambos expõem `POST /api/setup` chamando `login(req,true)`; o fluxo não valida token de convite. Se a conta existente ainda não tiver hash, o primeiro setup aceita a definição de senha e usa fallback de papel por nome (Ricardo/Lohan/Guilherme => implementation_admin).
- Ambos autorizam `POST /api/chat/clear` somente por `name === "Ricardo"`, sem exigir o papel persistido `implementation_admin`. A candidata #167 melhora esse caminho, mas não está implantada.
- `sniffMime(bytes, declared)` reconhece algumas assinaturas e termina com `return declared` quando não reconhece os bytes. A rota legacy permite PDF/Office/CSV/text/RTF e usa esse resultado para gravar no bucket público.
- `signedUploadRoute` valida MIME e tamanho declarados pelo cliente e cria URL assinada; não inspeciona os bytes antes da publicação. O bucket continua público. Isso é **inspeção de código**, não upload/exploit reproduzido.

## 8. AUTH-03, migrations e ambiente
- Produção: 5 usuários, 302 mensagens, 319 sessões, 526 status_history; sem colunas de setup token ou RPC `consume_upstatus_setup_invite`.
- Laboratório: tabelas de sinalização e convite existem, mas as 18 tabelas públicas estão vazias; zero usuários, mensagens, sessões, perfis, buckets e objetos. Não é Full-Product TEST.
- Inventário remoto: produção 7 migrations; laboratório 39.
- Os quatro arquivos SQL aplicados em produção retornam 404 no caminho `supabase/migrations/` de master: `20261023154754_create_upstatus_visual_config.sql`, `20261026195855_add_chat_message_file_name.sql`, `20261027154329_allow_chat_document_mime_types.sql`, `20261027155438_set_upstatus_upload_limits_20mb.sql`. Esta rodada verificou os caminhos exatos em master; não repetiu a busca em todos os refs de backup.
- Logs do laboratório nas últimas 24h: 19 chamadas a `upstatus-signal-test` em 2026-11-14 17:10:45 UTC, todas HTTP 402 (quota excedida), cobrindo health, create/open/cancel/poll/signal/invite e preflight. Não houve function_edge_logs posteriores na janela. Não foi feito novo Smoke.

## 9. Issues e aceitação
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, **0/8** critérios marcados. Os oito itens continuam físicos/pendentes: reconexão Normal e Team Lite sem F5, reentrada, nova chamada, ausência de peers/áudio/polling duplicados, participantes estáveis, regressão automatizada e aceite manual.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, corpo atual com 11 checkboxes marcados e 19 desmarcados. Esse contador é estado documental, não percentual de release.
- Nenhum teste manual foi executado nesta rodada. CI de Chromium/VM não substitui Tampermonkey real, permissões de microfone/tela ou perda de rede.

## 10. Gates
| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcasts de produção públicos e full-row; laboratório ainda private=false |
| TEST-ISOLATION | BLOCKED | Laboratório vazio, sem buckets e quota HTTP 402 |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs aplicados ausentes no caminho de migrations em master |
| AUTH-03 | BLOCKED | Setup sem convite, fallback nominal, sem rate limit de convite em produção |
| ACL-STORAGE | BLOCKED | Grants, Default ACL, SECURITY DEFINER e buckets públicos sem policies |
| RECONNECT | PENDING | Issue #78 continua 0/8; exige confirmação física sem F5 |
| HUMAN-REVIEW | PENDING | Nenhuma review submetida nas PRs obrigatórias; nenhuma autorização de release |

## Próximas ações
1. Corrigir o slug do workflow Team Lite e colocar guard de projeto/SHA/CLI pinada antes de qualquer execução.
2. Reduzir/remover payload sensível dos broadcasts e migrar para transporte autenticado server-mediated em Normal e Team Lite; alinhar tópico somente após minimizar o payload.
3. Rever grants/Default ACL/SECURITY DEFINER, RLS, Storage e política de anexos.
4. Integrar AUTH-03 e autorização administrativa por papel persistido.
5. Unificar política de senha e corrigir validação de bytes/MIME antes de tornar uploads públicos.
6. Restaurar quota e provisionar ambiente Full-Product TEST com buckets/fixtures isolados.
7. Recuperar os quatro SQLs originais de backup/artefato; não reconstruir a partir do schema atual.
8. Corrigir updateURL na base master e revalidar #82 no HEAD exato.
9. Executar os oito testes físicos e obter review humana.

## Segurança da execução
Nenhuma produção foi modificada. Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL, upload, workflow dispatch ou operação destrutiva ocorreu. Todas as consultas SQL foram SELECT-only. A única escrita é este novo relatório na branch QA; `docs/RELEASE_READINESS.md` e comentários da Engenharia foram preservados.
