# Auditoria independente QA do UpStatus

**Data da inspeção:** 2026-11-15T21:33:41.708Z  
**Escopo:** GitHub `Reekyi/UpStatus`; produção Supabase `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, workflows, logs de CI, fontes implantadas, catálogo PostgreSQL, migrations e logs disponíveis.  
**Veredito:** **NOT READY**.

Esta auditoria não é autorização para merge, deploy, migration, release, publicação de userscript ou alteração de configuração.

## Vocabulário de evidência

- **AUTOMATED PASS:** workflow existente aprovado no SHA indicado; não significa que a auditoria repetiu o teste.
- **AUTOMATED FAIL:** workflow existente falhou no SHA indicado.
- **CODE INSPECTION:** comportamento observado estaticamente em fonte ou configuração.
- **MANUAL PENDING:** depende de navegador, dispositivo, sessão real ou aceitação humana.
- **BLOCKED / NOT VERIFIED:** há dependência ou falta evidência suficiente.

## 1. Heads reais e integridade da QA

Refs resolvidas diretamente pelo GitHub:

| Branch | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| qa/release-readiness-2026-11-04-master | `71f8ccece4dae3b676c526cc5048f8b71a1d3b78` |

A comparação QA contra master retornou **348 commits à frente e 1 atrás**, com merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. O commit master-only é documental; não fiz rebase nem incorporei mudanças automaticamente.

O documento [docs/RELEASE_READINESS.md](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md) foi lido. Seu último snapshot interno é **2026-11-15 06:30 UTC**, portanto está desatualizado em relação aos heads e checks desta inspeção. A revalidação atual fica registrada neste arquivo separado; o documento-base não foi sobrescrito.

## 2. PRs obrigatórias e CI nos SHAs exatos

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Open / Draft; Validate e Smoke **PASS** | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft; **PASS histórico** | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite signaling | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Open / Draft; Candidate Checks **PASS** | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| #82 QA documental | `71f8ccece4dae3b676c526cc5048f8b71a1d3b78` | Open / Draft; Validate **FAIL** | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43759163267) |

Follow-ups inspecionados:

| PR | HEAD | Resultado |
|---|---|---|
| #161 Normal rate limit/API | `557814dc31bed779b84a2094358dc6b2a7e67689` | Validate e Smoke **PASS**: [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) |
| #168 Retry-After | `c6de3eb29bb419e817a237487185df0df752015d` | Validate **PASS**, sem Smoke: [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) |

As submissões de review consultadas para #74, #75, #76, #82, #161 e #168 retornaram listas vazias. Todas permanecem Draft e sem aprovação humana registrada.

### Falha exata de #82

O log do job `validate` confirma:

- Build: `Built UpStatus 3.4.7 / TEST 3.4.7`.
- Falha: `VALIDATION FAILED: production updateURL mismatch`.
- Local: `scripts/validate.mjs:26`.

A PR #82 altera documentação; o erro vem do contrato de build/validator herdado de master, não do Markdown.

## 3. Build, distribuição e compatibilidade Normal / Team Lite

### Normal: updateURL e API são contratos separados

Em master, `release.json` declara a distribuição em `/functions/v1/upstatus/upstatus.user.js`, mas `scripts/build.mjs` ainda monta o `CLOUD_SERVER` de produção com o endpoint legado `upstatus-screen-share-3-1-1-beta10`. Isso reproduz a falha de #82.

A candidata #74 passa a obter o updateURL de `release.scriptUrl`, mas ainda mantém o API target beta10. A #161 muda o API target para `upstatus` e alinha o tópico Realtime ao tópico usado pelos triggers atuais.

**Bloqueador adicional confirmado na #161:** seu `release.json` continua em **3.4.7** e o artefato `UpStatus.user.js` candidato também declara **3.4.7**, igual à versão instalada. O atualizador compara as versões e desabilita a atualização quando o valor servido é menor ou igual ao instalado. O caminho `--sync-root-artifact` também exige que a versão do manifesto seja maior que a versão do artefato rastreado quando o conteúdo mudou.

Assim, publicar apenas a função nova não garante que os clientes existentes mudem de beta10 para `upstatus`. O workflow candidato #74 ainda contém guard explícito para versão estável 3.4.7. É necessário coordenar bump de versão, manifesto, artefato, guard e API cutover em uma única entrega revisada.

### Team Lite: workflow oficial não corresponde ao produto

Na branch `team-lite-official`:

- `release.json` da raiz está em `3.0.40-beta.22`.
- `team-lite/release.json` declara Team Lite `3.4.30 stable`.
- `.github/workflows/deploy-production.yml` lê o manifesto raiz e rejeita qualquer `preRelease`; portanto o workflow atual falha no guard.
- O passo de deploy publica `upstatus`, não `upstatus-team-lite`.
- Usa Supabase CLI `latest`, secret genérico `SUPABASE_PROJECT_ID` e não valida explicitamente o projeto esperado nem o SHA aprovado.

**Não despachar esse workflow.** A candidata #76 constrói a função Team Lite separadamente, mas isso não corrige o workflow oficial da branch de produção.

### TEST em develop

`.github/workflows/deploy-test.yml` dispara em `push` para develop e em `workflow_dispatch`. Usa `SUPABASE_PROJECT_ID` de secret compartilhado, CLI `latest` e não compara o destino com o ID autorizado do laboratório. O destino efetivo do secret não foi lido nem inferido.

## 4. Supabase: projetos, Edge Functions e migrations

A organização tem dois projetos, sem um terceiro ambiente Full-Product TEST independente.

| Projeto | Estado | PostgreSQL | Migrations | Edge Functions |
|---|---|---|---:|---:|
| Produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 | 38 ACTIVE |
| Laboratório `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 39 | 2 ACTIVE |

Todas as Edge Functions listadas reportam `verify_jwt=false`. Isso é configuração do gateway, não prova automática de acesso anônimo: os handlers centrais implementam sessão própria por `x-upstatus-token`. Cada rota precisa continuar com autenticação/autorização explícita.

Versões operacionais de produção:
- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- `upstatus-test` v281, SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`.

Laboratório:
- `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`.
- `upstatus-signal-e2e-once` v3.

O código implantado de Normal e Team Lite ainda expõe `/api/account?name=` com `needsSetup` e `POST /api/setup` sem convite único. A produção não tem tabela/RPC de setup-invite. O snapshot atual tem 5 usuários, 0 sem password hash, 0 sem papel e 3 administradores; portanto não foi demonstrada conta atualmente desprotegida, mas o caminho continua inseguro para futuras contas não configuradas. O código também mantém fallback de papel administrativo por nome para Ricardo/Lohan/Guilherme quando o papel está ausente. O endpoint de limpeza do chat compara o nome `Ricardo`, em vez de verificar papel administrativo persistido. Normal exige senha mínima de 6 caracteres; Team Lite aceita 4, uma divergência de política.

A função isolada v32 ainda não contém o mapeamento `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409 que o helper offline da candidata #163 testa. A PR #163 valida o contrato do código candidato, não uma chamada HTTP à função implantada.

## 5. RLS, grants, SECURITY DEFINER e Storage

### Produção

- 10 tabelas em `public` com RLS; FORCE RLS não está habilitado nessas tabelas.
- Nove tabelas backend-owned (`chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `users`) mantêm SELECT/INSERT/UPDATE/DELETE/REFERENCES/TRIGGER/TRUNCATE para `anon` e `authenticated`: 126 entradas efetivas de privilégio no total; 18 grants TRUNCATE.
- 24 entradas de default ACL; 15 contêm privilégios de cliente.
- Três funções de broadcast são SECURITY DEFINER, `search_path=public` e EXECUTE efetivo para anon/authenticated/service_role.
- `realtime.messages`: RLS ligado, FORCE RLS desligado, zero policies; anon/authenticated têm SELECT/INSERT/UPDATE.

RLS sem policies não prova, isoladamente, acesso às linhas; porém os grants são desnecessários, e TRUNCATE não é protegido por RLS.

### Laboratório

- 18 tabelas public com RLS; zero grants diretos de tabela para anon/authenticated.
- 25 entradas de default ACL, 12 ainda contêm privilégios de cliente.
- As três funções de broadcast continuam SECURITY DEFINER, mas usam `search_path` vazio e EXECUTE é negado a anon/authenticated e permitido a service_role.
- `realtime.messages` tem zero linhas no período consultado, zero policies e ainda mantém grants SELECT/INSERT/UPDATE para anon/authenticated.
- Não existem buckets Storage.

A tabela `upstatus_setup_invite_rate_limits` e a RPC `consume_upstatus_setup_invite_rate_limit` existem no laboratório, com RLS ligado, sem SELECT para anon/authenticated, RPC SECURITY INVOKER, `search_path` vazio e EXECUTE apenas para service_role. Ambas estão ausentes em produção.

### Realtime e Storage

Produção tem **106/106** registros em `realtime.messages` nos últimos 14 dias com `private=false`. Os triggers continuam publicando em tópico público; o trigger de mensagens envia OLD/NEW completos. O tópico dos triggers é diferente do tópico usado pelos clientes instalados. A mitigação de payload mínimo observada no laboratório não foi aplicada em produção.

Storage de produção:
- `chat-images`: público, limite 20 MiB.
- `profile-images`: público, limite 20 MiB.
- Zero policies próprias em `storage.objects`.

Não houve exploração externa nem teste de leitura de objetos. A exposição é inferida da configuração pública e da ausência de policies próprias, não de acesso indevido reproduzido.

## 6. Proveniência de migrations

A produção lista 7 migrations; a branch gerenciada `main` reporta `MIGRATIONS_FAILED`, apesar de o projeto/preview estarem ACTIVE_HEALTHY.

Os quatro SQLs originais abaixo retornaram HTTP 404 tanto em master quanto na QA, embora as quatro versões constem no ledger de migrations de produção:

1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruí SQL por inferência e não apliquei migrations.

## 7. Logs, issues e testes manuais

Na janela consultada de 24 horas, o stream de logs retornou somente `pgbouncer_logs` e `postgres_logs` nos dois projetos; não retornou fontes Edge/Function. Portanto, não há evidência suficiente para contar HTTP 402 de Edge Functions nessa janela nem para declarar recuperação. Não reutilizar contagens antigas como se fossem atuais.

- Issue #78 permanece aberta com **0/8** critérios físicos concluídos. A queda real de rede por ~10 segundos e recuperação sem F5 em Normal e Team Lite continuam MANUAL PENDING.
- Issue #79 permanece aberta com **16/35** itens marcados.
- Não há ambiente local de checkout nesta execução (`/workspace`, `/workspaces`, `/repo` e `/app` ausentes; `/mnt/data` vazio). Nenhum script local, teste manual, navegador Tampermonkey, microfone ou captura de tela foi executado.
- Os resultados de CI acima são execuções históricas inspecionadas nos SHAs indicados; não foram disparados reruns.

## 8. Gates e recomendação

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime de produção continua público, sem policies e com payloads completos. |
| TEST-ISOLATION | BLOCKED | O laboratório existe, mas não é Full-Product TEST; workflow develop não fixa o destino. |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais ausentes em master e QA; branch gerenciada main em MIGRATIONS_FAILED. |
| AUTH-03 | BLOCKED | Rate limit candidato existe no laboratório, mas tabela/RPC e fluxo com convite estão ausentes em produção. |
| ACL-STORAGE | BLOCKED | Grants/default ACLs amplos, SECURITY DEFINER de broadcast e buckets públicos permanecem. |
| RECONNECT | PENDING | Exige teste físico sem F5 em ambos os clientes; nenhum foi realizado. |
| HUMAN-REVIEW | PENDING | PRs seguem Draft e sem reviews humanas; não há autorização de release. |

**Recomendação: NOT READY.** Prioridades:
1. Resolver o bump de versão e cutover Normal com artefato, updater, API e rollback coordenados.
2. Corrigir o workflow Team Lite para manifesto próprio, slug `upstatus-team-lite`, projeto fixo, SHA aprovado e CLI pinada.
3. Integrar AUTH-03 em ambos os produtos e planejar migration/rollout antes de publicar o handler.
4. Tornar Realtime privado/autorizado, alinhar tópicos e reduzir payloads.
5. Revisar grants, default ACLs, SECURITY DEFINER e política de Storage com plano de rollback.
6. Recuperar os SQLs originais e diagnosticar MIGRATIONS_FAILED.
7. Provisionar Full-Product TEST, concluir testes físicos e obter aprovação humana.

## Registro de segurança

Nenhuma alteração de produção foi realizada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva. A única escrita documental desta execução é este arquivo novo na branch QA; o documento-base e as branches de engenharia foram preservados.
