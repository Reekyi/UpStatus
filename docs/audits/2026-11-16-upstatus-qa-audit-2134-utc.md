# Auditoria independente UpStatus — 2026-11-16 21:34 UTC

## Veredito

**NOT READY.** O Normal continua com respostas HTTP 402 nas rotas centrais; a causa específica em produção não está nos logs. O laboratório teve 48 respostas 402 com a causa explícita `exceed_edge_functions_invocations_quota`. Os bloqueadores de Realtime, grants/ACL, Storage e AUTH-03 permanecem. Não houve teste físico de reconexão sem F5.

Esta rodada foi read-only para GitHub e Supabase. A única escrita foi este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.

## 1. Refs reais e documentação

Branches consultadas diretamente:

| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `4730c2bf05cafb4635ff5754258076a15a75fd22` |

O HEAD da branch QA coincide com o HEAD da PR #82. O arquivo `docs/RELEASE_READINESS.md` foi lido integralmente pela API de conteúdo; seu último checkpoint registrado é **2026-11-15 06:30 UTC**, portanto o resumo embutido está defasado em relação aos refs e aos logs atuais. O documento tem histórico extenso e repetido; não foi sobrescrito. Esta rodada fica registrada em arquivo separado.

A comparação da PR #82 contra master mostra 215 arquivos alterados, todos documentais; nenhum arquivo fora de documentação foi encontrado no diff. A PR continua aberta, Draft e não mesclada.

## 2. PRs obrigatórias e CI nos HEADs exatos

| PR | HEAD | Relação com a base | Estado | CI consultado |
|---|---|---:|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 ahead / 1 behind | Open, Draft, unmerged | [Validate 43376770142 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770142); [Smoke 43376770200 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead / 0 behind | Open, Draft, unmerged | [Candidate Checks 41674353127 PASS histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | 389 ahead / 0 behind | Open, Draft, unmerged | [Candidate Checks 43868863235 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `4730c2bf05cafb4635ff5754258076a15a75fd22` | 379 ahead / 1 behind | Open, Draft, unmerged | [Validate 43951709708 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43951709708) |

Nenhuma review humana foi encontrada nas quatro PRs.

### #74 Normal

Validate e Smoke passaram no HEAD exato. O log do Smoke confirma 136/136 verificações autenticadas; chamadas WebRTC, áudio de chamada, áudio de sala, vídeo de compartilhamento, mesh autenticado de três participantes, teardown, concorrência do rate limit de sinalização, recibos atômicos e consumo único de convite.

**Limitação de cobertura:** os steps `Syntax-check setup invite rate-limit harness when present` e `Verify distributed setup-invite issuance rate limit` foram ignorados. O candidato Normal não contém a chamada correspondente ao RPC de rate limit de emissão que existe no candidato Team Lite. O teste de consumo único de convite passou, mas isso não cobre limitação distribuída de emissão.

Os testes foram executados pelo CI contra o projeto isolado; não são aceitação física no Tampermonkey/Sale Smartly.

### #75 Team Lite baseline

O PASS é histórico e cobre o baseline 3.4.31. A linha Team Lite de sinalização atual é a #76. Não tratar #75 e #76 como duas cargas independentes para release.

### #76 Team Lite

O job `signed-upload-contracts` passou: os contratos offline do servidor e do cliente foram aprovados. O job `candidate-checks` falhou em `Test isolated signaling endpoint authentication`: as verificações esperavam 401/405, mas receberam HTTP 402 com a mensagem explícita:

`exceed_edge_functions_invocations_quota`

Resultado observado: **0/16 verificações não autenticadas passaram**. Playwright, integração autenticada, rate limits, recibos, convites e verificações posteriores foram ignorados após a falha. Isto é bloqueio de infraestrutura, não evidência de defeito funcional no contrato offline de upload.

### #82 QA

O Validate falhou em `scripts/validate.mjs:26` com `production updateURL mismatch`. A PR é documental; a falha é herdada do contrato de build em master. O commit de auditoria não alterou runtime.

## 3. Candidatas relacionadas

- [#174 signed-upload backport](https://github.com/Reekyi/UpStatus/pull/174), HEAD `277dd7bbfe87a4e40c0ca62395a83c3fe01c7849`: Validate [43802407509 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43802407509). Adiciona helper de upload assinado ao cliente develop e testes de contrato cliente/servidor. A própria PR declara que o servidor valida MIME/tamanho declarados, não os bytes reais, e que não houve transferência real ao Storage nem aceitação de navegador.
- [#176 migration recovery](https://github.com/Reekyi/UpStatus/pull/176), HEAD `b50f8567392322b4309468e0fe9e6fc81ca38c1d`: Validate [43936811839 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) em `client signed upload helper missing` na linha 55. A falha vem do baseline develop sem o helper de #174; não demonstra erro nos quatro SQLs recuperados. A PR não executou replay nem preflight de migration.

A #176 recupera os quatro statements SQL do ledger de produção por SELECT, com newline final. Isso comprova o texto registrado no ledger, mas não os bytes originais dos arquivos, comentários ou formatação externa. A PR permanece Draft, sem review e sem teste de migration em Full-Product TEST.

## 4. Logs de disponibilidade

Consulta read-only em `function_edge_logs`, janela solicitada de 24 horas terminando em 2026-11-16 21:31:08 UTC. A cobertura efetivamente retornada começa em 11:41:55.514 UTC e termina em 21:00:47.824 UTC.

**77.925 respostas HTTP 402** foram agregadas:

| Rota beta10 | 402 |
|---|---:|
| `/api/chat` | 41.630 |
| `/api/status` | 18.104 |
| `/api/remote-status` | 18.086 |
| `/api/me` | 33 |
| `/api/account` | 33 |
| `/api/members` | 33 |
| distribuição `/upstatus/upstatus.user.js` | 6 |

O último evento retornado foi às 21:00:47.824 UTC. O corpo da resposta não aparece nos logs. Portanto, **a causa específica dos 402 em produção permanece não identificada**; não atribuir automaticamente à quota do laboratório.

No laboratório, foram observadas 48 respostas 402 em 14 rotas de `upstatus-signal-test`, entre 12:37:25.477 e 12:41:42.781 UTC. O log do job #76 identifica explicitamente `exceed_edge_functions_invocations_quota`; a resposta diz que o proprietário deve rever o plano ou remover o spend cap para restaurar o serviço. Nenhum plano ou limite foi alterado.

## 5. Projetos, migrations e Edge Functions

A organização consultada lista somente dois projetos:

| Projeto | Estado | PostgreSQL | Migrations | Edge Functions |
|---|---|---|---:|---:|
| Produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 | 38 |
| Laboratório `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 38 | 2 |

- Produção tem uma branch gerenciada `main` em `MIGRATIONS_FAILED`, embora o preview apareça ACTIVE_HEALTHY.
- Laboratório não tem branches Supabase.
- Laboratório possui `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3, mas zero buckets Storage e zero linhas Realtime no snapshot. Não é Full-Product TEST.
- A função `upstatus-test` v281 existe **dentro do projeto de produção**; isso não cria um ambiente de teste independente.
- As 38 Edge Functions de produção reportam `verify_jwt=false`. Isso não prova, por si só, que cada rota seja anônima, pois alguns runtimes fazem autenticação própria; exige revisão individual por rota.
- Não existe slug de função server-mediated `upstatus-signal` em produção.

### Bundles efetivamente implantados

| Função | Versão Edge | `VERSION` interno | API usada pelo bundle |
|---|---:|---|---|
| `upstatus` | 480 | 3.4.7 | beta10 |
| `upstatus-team-lite` | 15 | 3.4.30 | upstatus-team-lite |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | beta8 |

O userscript Normal 3.4.7 distribuído por `upstatus` aponta `CLOUD_SERVER` para beta10 e assina o tópico Realtime beta10. Team Lite 3.4.30 usa sua própria API, mas também assina o tópico beta10. A função cujo slug é beta10 (Edge v6) declara código beta8 e o userscript embutido aponta para endpoint/tópico beta8. É uma divergência de linhagem/artefato; **não há evidência ligando-a diretamente aos 402**.

## 6. AUTH-03 e compatibilidade Normal / Team Lite

Inspeção dos bundles implantados:

- Normal 3.4.7 e Team Lite 3.4.30 ainda expõem `GET /api/account` e `POST /api/setup` no caminho legado.
- O setup não exige token de convite. Para contas sem senha, o runtime atribui `implementation_admin` por fallback nominal quando o papel está vazio e o nome é Ricardo, Lohan ou Guilherme.
- A senha mínima implantada diverge: Normal 6 caracteres; Team Lite 4.
- A produção não tem `consume_upstatus_setup_invite` nem o schema de convite exigido pelos candidatos.
- Os candidatos #74/#76 exigem setup token e RPC de consumo. Team Lite #76 também chama RPC distribuído de rate limit para emissão de convite: 5 por administrador a cada 15 minutos. A candidata Normal #74 não contém essa mesma chamada.

Logo, AUTH-03 melhorou em código candidato, mas **não está nos runtimes implantados**. O laboratório possui as RPCs de convite e rate limit, mas não a tabela `upstatus_setup_invites`; o modelo candidato usa as colunas de token existentes no schema de usuários.

## 7. Realtime, RLS, grants, SECURITY DEFINER e Storage

Snapshot read-only de produção:

- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; anon/authenticated têm SELECT e INSERT.
- 106/106 mensagens retidas são `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os três triggers chamam funções `SECURITY DEFINER` com `search_path=public`: `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()`, `upstatus_broadcast_users()`. Todas retornam `trigger`; os grants EXECUTE para anon/authenticated estão presentes e o Advisor emite três WARN para cada papel. Não foi tentada chamada RPC direta nem exploração.
- `upstatus_broadcast_messages` serializa a linha OLD/NEW completa com `to_jsonb` e envia por `realtime.send(..., false)`. Remote state envia campos de comando/resultado; user status envia metadados de presença.
- Dez tabelas públicas têm RLS habilitado e zero policies. Nove mantêm grants amplos para anon/authenticated, incluindo TRUNCATE. Foram contadas 126 linhas de grants de cliente e 18 grants TRUNCATE. RLS não protege TRUNCATE.
- Há 24 entradas em `pg_default_acl`.
- Buckets `chat-images` e `profile-images` são públicos, limite 20 MiB, com 168 e 20 objetos respectivamente; `storage.objects` tem zero policies.
- Security Advisor de produção: 10 INFO de RLS sem policy, 3 WARN para SECURITY DEFINER executável por anon e 3 WARN para authenticated.

O laboratório está melhor restrito quanto a grants de tabelas: 18 tabelas públicas, zero policies e zero grants de tabela para anon/authenticated; possui zero buckets e zero mensagens Realtime. Isso é evidência do laboratório, não de produção.

## 8. Issues, gates e aceite manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN, atualizada em 2026-11-08, com **0/8 critérios físicos aprovados**. Não houve teste real de queda/retorno de internet sem F5, reentrada em sala, nova chamada, microfone/display capture reais ou interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) permanece OPEN; o corpo tem 16 itens marcados e 19 pendentes. O comentário QA dedicado foi atualizado no lugar, sem duplicatas e sem alterar o comentário da Engenharia.
- Nenhuma review humana foi encontrada nas PRs #74, #75, #76, #82, #174 e #176.

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | blocked | 106 mensagens públicas; zero policies; transporte autenticado não está em produção |
| TEST-ISOLATION | blocked | Só há produção e laboratório de sinalização; laboratório restrito por quota |
| MIGRATION-PROVENANCE | in_progress | Quatro SQLs recuperados do ledger em #176; sem preflight Full-Product TEST |
| AUTH-03 | blocked | Runtimes implantados mantêm setup legado e fallback nominal |
| ACL-STORAGE | blocked | Grants/ACL amplos, SECURITY DEFINER e buckets públicos sem policies |
| RECONNECT | pending | Aguarda confirmação física de Ricardo; Issue #78 em 0/8 |
| HUMAN-REVIEW | pending | Nenhuma review/autorizações humanas registradas |

## 9. Ações necessárias

1. O proprietário deve revisar Usage/Billing e spend cap do laboratório e investigar separadamente a causa dos 402 em produção. Não alterar plano/limites sem avaliar consumo e custo.
2. Provisionar um Full-Product TEST isolado, com schema, Storage e Edge Functions coerentes, antes de preflight ou integração autenticada.
3. Consolidar uma candidata Normal que alinhe distribuição/API, AUTH-03 e rate limit de convites; não publicar somente `upstatus` enquanto o cliente continua chamando beta10.
4. Corrigir o workflow Team Lite para publicar `upstatus-team-lite`, fixar CLI, validar projeto/SHA e fazer preflight; **não despachar o workflow oficial atual**, que publica o slug `upstatus`.
5. Planejar rollout/rollback de Realtime privado, grants, SECURITY DEFINER, default ACL e Storage. Não adicionar policies públicas apenas para silenciar Advisor.
6. Validar os SQLs recuperados em Full-Product TEST e comparar com qualquer arquivo original externo disponível.
7. Só depois executar os oito critérios físicos da #78 e obter revisão/aprovação humana.

## 10. Limites e segurança desta rodada

- Nenhum teste de produto foi executado diretamente pela QA. Foram inspecionados resultados de CI existentes e seus logs.
- Não havia checkout/ambiente local para combinar #174/#176, executar build/preflight ou testar navegador.
- Supabase: somente SELECT/catálogo, listagem de projetos/funções/migrations, Advisors e logs.
- Não houve escrita SQL, migration, deploy, merge, release, publicação de userscript, alteração de secrets, flags, roles, grants, ACLs, policies, buckets ou fixtures.
- A única alteração documental desta rodada foi este arquivo novo na branch QA. O comentário QA existente da Issue #79 foi atualizado conforme o protocolo.

**Recomendação de release: NOT READY.**
