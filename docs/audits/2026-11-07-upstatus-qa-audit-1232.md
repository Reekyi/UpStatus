# UpStatus — auditoria independente de QA (2026-11-07 09:32 BRT)

**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório isolado `bfpjtfqlnypisxljoxkb`.

**Método:** leitura inicial de `docs/RELEASE_READINESS.md` na branch QA; inspeção read-only de PRs, commits, workflows, arquivos candidatos, issues, projetos, migrations, Edge Functions, Advisors e catálogos PostgreSQL. Todos os SQLs desta rodada foram SELECT-only. Nenhum workflow ou script foi executado pela auditoria.

## 1. Resumo executivo

- **Normal #74:** Validate e Signaling Smoke passaram no HEAD exato.
- **Team Lite #76:** Candidate Checks passou no HEAD exato.
- **Baseline #75:** PASS histórico, mas não é o candidato atual; #76 está 251 commits à frente dele.
- **TEST guard #84:** Validate passou, incluindo guard de alvo, pinagem de SHA, escopo de secrets e regressão de upload assinado. Não houve dispatch, chamada real à Management API nem deploy.
- **QA #82:** Validate falhou em `production updateURL mismatch`; a PR é documental e não contém código de runtime.
- **Release:** **BLOCKED**. Ainda não há ambiente TEST full-product, o workflow inseguro da branch develop continua ativo até integração revisada de #84, o Normal mantém divergência API/distribuição, e a produção continua com setup público legado e broadcasts públicos.

Não transferir PASS de commits antigos para HEADs novos. Não confundir CI de signaling isolado com aceitação do backend completo de cada produto.

## 2. Leitura inicial e estado real dos PRs

O arquivo solicitado foi lido primeiro:
- `docs/RELEASE_READINESS.md`
- Blob SHA: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`
- 6.221 linhas na leitura desta rodada.
- O documento principal não foi alterado.

Heads consultados diretamente no GitHub:

| PR | Base | HEAD exato | Ahead / behind | Estado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | master | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | 839 / 0 | Open, Draft |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | team-lite-official | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 | Open, Draft |
| [#76 Team Lite candidato](https://github.com/Reekyi/UpStatus/pull/76) | team-lite-official | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | 310 / 0 | Open, Draft |
| [#82 QA documental](https://github.com/Reekyi/UpStatus/pull/82) | master | `3cf28a9762199b3d7ea7a4d4b12a700900cdae33` | 94 / 0 | Open, Draft |
| [#84 guard TEST](https://github.com/Reekyi/UpStatus/pull/84) | develop | `66ccc65af430dfee55560e90e1f832336fff0212` | 29 / 0 | Open, Draft |

#76 está 251 commits à frente de #75 e zero atrás. Tratar #75 como baseline histórico e #76 como continuação/candidato atual; não mesclar ambos independentemente sem revisão da relação entre as branches.

As cinco PRs consultadas continuam abertas, Draft e sem merge. As consultas de reviews retornaram zero reviews submetidas para #74, #75, #76, #82 e #84. Não foram encontradas review threads em #74, #76, #82 ou #84. A flag `mergeable` não é aprovação técnica nem substitui review humana.

A #82 tem dez arquivos alterados, todos em `docs/`; não contém código de produto. A branch QA foi comparada com master e está 94 commits à frente, zero atrás.

## 3. CI nos HEADs exatos

### Normal #74

- [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089): **SUCCESS**.
- [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038): **SUCCESS**.
- Smoke: 19/19 verificações não autenticadas e 129/129 autenticadas.
- Passaram negociação WebRTC de chamada, sala de voz e screen-share; entrega de áudio/vídeo remoto; mesh autenticado de três participantes; teardown; convites e fanout; ownership/membership de sala; tentativas de voz com cancel-before-open, tombstones, idempotência e corrida open/cancel; rate limit distribuído (90 aceitas, 1 HTTP 429, `Retry-After: 60s`); concorrência de read receipts; enrollment atômico; cleanup das fixtures.

### Team Lite #76

- [Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800): **SUCCESS**.
- 16/16 verificações não autenticadas e 103/103 autenticadas.
- Passaram WebRTC de chamada/voz/tela, mesh de três participantes, recuperação de voice rooms, tentativa/cancelamento durável, rate limit (90 aceitas, 1 HTTP 429, `Retry-After: 60s`), concorrência de rate limit e read receipts, enrollment por convite, regressões de sessão/logout e cleanup.

### Baseline #75

- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico no HEAD inalterado `7bbf9b90...`.
- Não usar esse resultado como substituto do CI de #76.

### Guard TEST #84

- [Validate 42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144): **SUCCESS**.
- Passaram build-target guard, metadata guard, workflow manual-only/SHA-pin/secret-scope, regressão do cliente de upload assinado e Validate geral.
- O log construiu a branch de segurança #84, não o candidato Normal 3.4.7.
- Não houve `workflow_dispatch`, preflight real pela Supabase Management API ou deploy. A validação é automatizada com inputs/mockados, não teste de infraestrutura TEST real.

### QA #82

- [Validate 42368817280](https://github.com/Reekyi/UpStatus/actions/runs/42368817280): **FAILURE**.
- Job `128392473533`, step `Validate build`.
- Erro exato: `VALIDATION FAILED: production updateURL mismatch`.
- A falha está no validador/base master; os dez arquivos alterados por #82 são documentação. Não enfraquecer o validador para obter verde.

## 4. TEST e deploy safety

### Correção candidata confirmada

O builder Normal da #74, blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`, usa `UPSTATUS_TEST_PROJECT_ID`. Sem variável, gera o sentinel inerte `00000000000000000000`; rejeita produção e o projeto isolado de fixtures antes de escrever os artefatos.

O builder Team Lite, blob `41fe447508ac3e48cdbf3a7b85446bf7291be004`, também usa sentinel e rejeita os dois project IDs existentes.

A PR #84 contém:
- `workflow_dispatch` apenas;
- checkout de `${{ github.sha }}`;
- verificação de `GITHUB_REF=refs/heads/develop` e igualdade entre checkout SHA e `GITHUB_SHA`;
- variável `vars.SUPABASE_TEST_PROJECT_ID` obrigatória;
- rejeição explícita de produção e do projeto isolado;
- verificação de metadata do projeto;
- token restrito aos steps que precisam dele;
- deploy somente de `upstatus-test`.

Arquivos candidatos:
- [workflow #84](https://github.com/Reekyi/UpStatus/blob/safety/test-deploy-target-guard-20261107/.github/workflows/deploy-test.yml), blob `1ca0c4ef4f633724280b81691471d8acc777edd2`;
- [builder #84](https://github.com/Reekyi/UpStatus/blob/safety/test-deploy-target-guard-20261107/scripts/build.mjs), blob `9a2c19dd685c109cc435e64cc6dc02742feed1e1`;
- [verify-test-project](https://github.com/Reekyi/UpStatus/blob/safety/test-deploy-target-guard-20261107/scripts/verify-test-project.mjs), blob `4c917c007cf7230aae966507f8e68d2f2867afbe`.

### Bloqueio permanece na branch develop

O arquivo atual de develop, blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`, ainda contém:
- gatilho `push` em develop além de `workflow_dispatch`;
- secret compartilhado `SUPABASE_PROJECT_ID`;
- ausência do guard de project ID/metadata/SHA presente em #84;
- deploy de `upstatus-test` para o project ID do secret.

O valor do secret não foi lido. Portanto, o destino efetivo do workflow de develop não foi confirmado. Como #84 continua Draft e não mesclada, a correção candidata ainda não protege o workflow ativo em develop. **Não executar esse workflow até que a integração segura seja revisada e o ambiente dedicado exista.**

### Não existe ambiente TEST full-product

O inventário Supabase retornou somente dois projetos:

| Projeto | ID | Região | Estado |
|---|---|---|---|
| UpStatus produção | `dlfvkawaiqduhlazsszm` | us-west-2 | ACTIVE_HEALTHY |
| upstatus-security-test | `bfpjtfqlnypisxljoxkb` | sa-east-1 | ACTIVE_HEALTHY |

Não existe terceiro projeto TEST completo.

O laboratório tem 33 migrations até `20261107061242`, duas Edge Functions (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3) e schemas/RPCs de signaling/auth/read receipts. Não é backend full-product para Normal e Team Lite.

O builder Team Lite gera `upstatus`, `upstatus-test` e `upstatus-team-lite`, mas `renderTeamLiteFunction()` não recebe variante TEST e não gera `upstatus-team-lite-test`. O workflow #84 implanta somente `upstatus-test`. Criar runtime e pipeline TEST próprios para Team Lite é gate separado.

## 5. Divergência Normal: API e distribuição

No builder Normal #74:
- `release.json`, blob `93caf1701ea508575c90d002c0b8c3037b34d82a`, aponta UpdateURL para `/functions/v1/upstatus/upstatus.user.js`.
- `scripts/build.mjs` monta o `CLOUD_SERVER` de produção em `/functions/v1/upstatus-screen-share-3-1-1-beta10`.

Runtime Supabase:
- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`, versão interna 3.4.7.
- `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`, versão interna 3.1.1-beta8.

Assim, o userscript pode ser atualizado por `upstatus` e continuar enviando as chamadas de API para o runtime legado beta10. A distribuição e a API não estão alinhadas para um cutover único. O release.json Normal continua 3.4.7, igual à versão interna da função `upstatus`; o backend efetivo beta10 é 3.1.1-beta8.

Team Lite:
- `team-lite/release.json`, blob `2b4216bc056dfd6ad60b051b29916ec2bfc6cc01`, buildVersion 3.4.31.
- função de produção `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`, versão interna 3.4.30.

## 6. AUTH-03 e AUTH-02

### Candidatos Normal e Team Lite

Inspeção de código dos templates:
- Normal `src/server/index.template.ts`, blob `d2291a9927983ba40fa53b45bc61fb86c3093ffb`.
- Team Lite `src/server/team-lite-index.template.ts`, blob `6696ba618a4080d6073e9264dd8fc621a6f8bb0f`.

Ambos implementam:
- convite aleatório de 32 bytes/64 hex;
- somente hash SHA-256 persistido;
- expiração de 15 minutos;
- emissão condicionada a sessão/admin;
- consumo pela RPC `consume_upstatus_setup_invite`;
- consumo atômico, replay/expiração bloqueados;
- papel vazio recebe `implementation_user`;
- papéis não vazios são preservados literalmente, impedindo que ` implementation_admin ` seja promovido.

A função `issueSetupInvite` usa filtro para password_hash NULL ou vazio e exige admin. A rota HTTP existe, mas a suíte de runtime `scripts/test-auth-enrollment.mjs` usa service_role para criar fixtures e chamar diretamente a RPC; não percorre a rota real de emissão/entrega.

O CI atual cobre tokens malformados, errados, expirados, replay, um único vencedor concorrente, NULL/empty/whitespace, papel admin explícito e não escalada do papel com espaços. Ainda falta teste HTTP de:
1. emissão real por administrador;
2. HTTP 403 para não-admin;
3. entrega privada e consumo pela rota real;
4. ausência de token em logs;
5. fluxo completo `/api/setup-invite` → entrega → `/api/setup`.

Não há UI administrativa dedicada para emissão; o fluxo exige cliente administrativo autenticado e entrega privada.

### Política de senha inconsistente

- Normal candidato: setup mínimo 6; login mínimo 4.
- Team Lite candidato: setup/login mínimo 4.

A autenticação existente é compatível para senhas de quatro caracteres, mas novos enrollments podem criar contas com políticas diferentes. Unificar ou documentar explicitamente a política compartilhada.

### AUTH-02 ausente

Não existe rate limiter distribuído específico para login/setup/invite nos candidatos, produção ou laboratório. O rate limit de signaling não protege essas rotas.

## 7. Produção: autenticação legada continua implantada

Inventário de produção:
- 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso não prova ausência de autenticação customizada, mas a revisão de autorização das 38 funções não foi concluída.
- `upstatus` v480;
- `upstatus-test` v281, SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`, versão interna 3.3.28;
- `upstatus-team-lite` v15;
- beta10 v6.
- `upstatus-test` está implantada dentro do projeto de produção, não em projeto TEST separado.
- `upstatus-backup-327-pre328` v1 está ACTIVE, mas o source retornado está vazio (0 bytes). Não foi identificada a existência/ausência de consumidores; não desativar sem inventário de dependências.

Inspeção dos quatro runtimes principais (upstatus, upstatus-team-lite, beta10 e upstatus-test) confirmou:
- nenhum endpoint `/api/setup-invite`;
- `GET /api/account?name` informa se a conta precisa de setup;
- `POST /api/setup` chama o setup antigo sem token de convite;
- login/setup antigo aceita primeiro provisionamento de conta sem password_hash;
- quando o papel está ausente, nomes Ricardo/Lohan/Guilherme recebem fallback `implementation_admin`;
- nenhum auth rate limiter está integrado.

Consulta agregada SELECT em produção:
- 5 contas;
- 0 password_hash NULL/vazio;
- 0 papéis NULL/vazios;
- 3 papéis `implementation_admin`.

Não foi encontrada conta atualmente reivindicável no snapshot. O risco é latente: a rota pública antiga continua disponível para futuras contas não inicializadas e mantém fallback administrativo por nome.

Produção tem 7 migrations até `20261027155438`. Não contém setup-invite RPC, signaling rate-limit table/RPC, auth rate-limit table/RPC ou atomic read-receipt RPC.

## 8. RLS, grants, SECURITY DEFINER e Realtime

### Produção

Security Advisor observado em 2026-11-07 12:32:52 UTC:
- 3 WARN: SECURITY DEFINER executável por anon;
- 3 WARN: mesmas funções executáveis por authenticated;
- 10 INFO: RLS habilitado sem policy.
- Performance Advisor: sem findings.
- Health Advisor: sem findings.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users`:
- SECURITY DEFINER;
- `search_path=public`;
- EXECUTE efetivo para PUBLIC, anon, authenticated e service_role;
- triggers habilitados.

A função de mensagens usa `to_jsonb(OLD/NEW)` e transmite o registro completo em `realtime.send(..., private=false)`. Remote-state transmite metadados de comandos/resultados; user-status transmite status e metadados de usuário. São broadcasts públicos. RLS da tabela de origem não impede um trigger SECURITY DEFINER de publicar o payload.

Nove tabelas backend-owned public (chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, users) têm RLS=true, zero policies e oito privilégios efetivos para anon/authenticated, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN. Isso é superfície de privilégio desnecessária; zero policies não prova acesso às linhas, mas TRUNCATE não é protegido por RLS.

`realtime.messages` é particionada, RLS=true, zero policies e mantém SELECT/INSERT/UPDATE para anon/authenticated.

Default ACLs:
- postgres mantém defaults amplos em public e storage, incluindo grants de tabela para anon/authenticated;
- supabase_admin mantém defaults amplos em public/graphql/graphql_public e outros schemas gerenciados.
- postgres não é superuser e não é membro de supabase_admin; supabase_admin é superuser. ACL-02 permanece bloqueado até caminho administrativo autorizado.

### Laboratório isolado

Security Advisor:
- zero WARN;
- 17 INFO de RLS sem policy.

Catálogo:
- tabelas `upstatus_signal_*` com RLS=true e sem grants diretos para anon/authenticated;
- `consume_upstatus_setup_invite`, `consume_upstatus_signal_rate_limit` e `merge_chat_read_receipts` são SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role;
- funções de broadcast são SECURITY DEFINER, `search_path=pg_catalog, public`, EXECUTE sem anon/authenticated e payload reduzido a `{op}`;
- ainda usam `private=false`;
- `realtime.messages` mantém RLS=true, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

O projeto isolado não resolve a autorização de canais privados. Realtime privado exige desenho de identidade/JWT confiável ou transporte mediado; não basta alternar `private=false` sem políticas e JWT compatíveis com os clientes atuais.

### Fixtures

A consulta atual de tabelas do projeto isolado retornou zero linhas em users, sessions, rooms, memberships, events, call attempts, voice attempts, rate-limit buckets, chat reads e messages. É fotografia pontual; não houve limpeza manual.

## 9. Issues

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 26 comentários, 0/8 critérios marcados. Não há evidência de teste físico atual no Tampermonkey com perda real de internet/retorno sem F5, reload/fechamento offline, microfone/display permissions ou interoperabilidade instalada Normal ↔ Team Lite. **MANUAL PENDING**.
- [#79 release](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 92 comentários. Correção em relação a relatórios anteriores: o corpo agora tem seção `Revalidação ao vivo — 2026-11-07 08:59 BRT`, com heads e CI atuais; o snapshot histórico antigo está explicitamente identificado como histórico. Não classificar mais o corpo inteiro como desatualizado. Ainda faltam reviews humanas e conclusão dos gates de segurança/aceitação.

## 10. Próximos gates

1. Manter #74/#75/#76/#82/#84 em Draft; obter reviews humanas.
2. Provisionar projeto Supabase TEST full-product independente; não reutilizar produção nem o laboratório de fixtures.
3. Integrar o guard de #84 somente após revisão; até lá, o workflow atual de develop tem push trigger e destino baseado em secret compartilhado sem allowlist.
4. Criar runtime e workflow TEST específicos para Team Lite.
5. Alinhar Normal CLOUD_SERVER/API, UpdateURL, Storage, Realtime, função implantada e rollback; comparar os destinos renderizados em teste.
6. Executar preflight Management API e deploy TEST apenas após ambiente provisionado e autorização explícita.
7. Completar testes HTTP de enrollment e fluxo de entrega do token.
8. Implementar rate limit fail-closed de login/setup/invite, com concorrência, 429/Retry-After e recuperação.
9. Planejar cutover de autenticação antiga em todas as funções relevantes, incluindo remoção do fallback administrativo por nome e rollback testado em TEST.
10. Remover broadcasts completos em produção; desenhar JWT confiável/transporte mediado antes de migrar para Realtime privado.
11. Revogar grants desnecessários e resolver default ACL/ACL-02 por caminho administrativo autorizado.
12. Completar os oito critérios físicos de #78 e manter #79 como checklist central atualizado.

## Registro de segurança

- Todas as queries SQL desta rodada foram SELECT-only.
- Nenhuma migration aplicada.
- Nenhuma Edge Function implantada ou alterada.
- Nenhum secret, flag, role, grant, policy ou ACL alterado.
- Nenhuma fixture criada, modificada ou removida pela auditoria.
- Nenhum workflow dispatch, rerun, cancelamento ou execução manual iniciado pela auditoria.
- Nenhum merge, release ou publicação de userscript.
- Nenhuma branch de engenharia alterada.
- Única escrita: criação deste relatório novo na branch QA dedicada, sem sobrescrever arquivos existentes.

Não declarar percentual de conclusão. CI automatizado, inspeção de código, runtime isolado, catálogo de produção, aceitação física e release readiness permanecem estados distintos.

## Links de evidência

- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74)
- [PR #75 baseline](https://github.com/Reekyi/UpStatus/pull/75)
- [PR #76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76)
- [PR #82 QA](https://github.com/Reekyi/UpStatus/pull/82)
- [PR #84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84)
- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78)
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79)
- [Normal Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089)
- [Normal Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038)
- [Team Lite Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800)
- [QA Validate 42368817280](https://github.com/Reekyi/UpStatus/actions/runs/42368817280)
- [TEST guard Validate 42366213144](https://github.com/Reekyi/UpStatus/actions/runs/42366213144)
- [Normal build.mjs](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/scripts/build.mjs)
- [Normal server template](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/src/server/index.template.ts)
- [Team Lite build.mjs](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/scripts/build.mjs)
- [Team Lite server template](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/src/server/team-lite-index.template.ts)
- [develop deploy-test.yml atual](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml)
- [#84 deploy-test.yml candidato](https://github.com/Reekyi/UpStatus/blob/safety/test-deploy-target-guard-20261107/.github/workflows/deploy-test.yml)
- [Supabase lint: SECURITY DEFINER callable by anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase lint: SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase lint: RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
