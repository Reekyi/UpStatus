# Auditoria independente UpStatus — 2026-11-16T22:37:41.914Z

## Veredito

**NOT READY.** A produção UpStatus Normal registrou 77.925 respostas HTTP 402 no intervalo de logs disponível. A causa específica em produção não aparece nos logs. O laboratório de sinalização bloqueou a integração da PR #76 por `exceed_edge_functions_invocations_quota`. Permanecem bloqueadores de Realtime público, grants/default ACLs, funções `SECURITY DEFINER`, Storage, AUTH-03 e cutover. A aceitação física da issue #78 continua pendente.

Esta execução foi de inspeção. Não foram executados testes diretamente pela QA, não houve navegador/Tampermonkey, nem ambiente Full-Product TEST. Não foram feitas escritas SQL, migrations, deploys, merges, releases, publicações de userscript, alterações de secrets/flags/permissões ou operações destrutivas.

## 1. Refs reais e documento de prontidão

Refs confirmados pela metadata atual das PRs e branches:

| Ref | HEAD |
|---|---|
| `master` | `a9288ccfcb0f308d3a587bfca624418a395be07b` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` | `c097730808fc19aafbce01c380714c8ad0033128` |

O arquivo [docs/RELEASE_READINESS.md](../RELEASE_READINESS.md) foi recuperado integralmente via blob SHA `7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c`: aproximadamente 1.046.356 caracteres e 8.423 linhas. O último checkpoint embutido no documento é **2026-11-15 06:30 UTC**. O histórico é extenso e repetido; não foi sobrescrito. Esta execução fica em relatório separado.

A PR #82 está aberta, Draft, sem merge e sem reviews humanas. HEAD `c097730`, base master `a9288cc`, 380 commits ahead / 0 behind, 216 arquivos alterados, todos em `docs/`. Nenhum arquivo fora de documentação apareceu no diff.

## 2. PRs obrigatórias e CI nos HEADs exatos

| PR | HEAD | Comparação com base | Estado | Evidência de CI |
|---|---|---:|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 ahead / 0 behind; 90 arquivos | Open / Draft | [Validate 43376770142 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770142); [Smoke 43376770200 PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 ahead / 0 behind; 10 arquivos | Open / Draft | [Candidate Checks 41674353127 PASS histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | 389 ahead / 0 behind; 59 arquivos | Open / Draft | [Candidate Checks 43868863235 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `c097730808fc19aafbce01c380714c8ad0033128` | 380 ahead / 0 behind; 216 arquivos | Open / Draft | [Validate 43962004557 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43962004557) |

Nenhuma review humana foi encontrada nas quatro PRs.

### #74 Normal — CI PASS com lacuna específica

O Smoke concluiu 136/136 verificações autenticadas, além de testes Chromium para WebRTC de chamada, voz e vídeo de compartilhamento, mesh de três participantes, teardown, concorrência de rate limit de sinalização, recibos atômicos e consumo único de convite. O log também validou recuperação lógica de tentativas de sala, cancelamento antes de abertura e corridas de open/cancel.

**Limitação:** os passos `Syntax-check setup invite rate-limit harness when present` e `Verify distributed setup-invite issuance rate limit` foram ignorados. O candidato Normal não contém a chamada de rate limit distribuído de emissão de convite presente no Team Lite. Consumo único de convite não equivale a rate limit de emissão.

Isso é CI em ambiente isolado, não aceitação física no Sale Smartly/Tampermonkey.

### #75 Team Lite — PASS histórico

O run 41674353127 é de 2026-11-03 e valida o baseline 3.4.31. A linha atual de sinalização Team Lite é a #76. Não tratar #75 e #76 como duas cargas independentes para release.

### #76 Team Lite — bloqueio de infraestrutura confirmado

O job `signed-upload-contracts` passou nos contratos offline do cliente e servidor. O job `candidate-checks` passou pelos testes estáticos de transporte, enrollment e recuperação de voz/tela, mas falhou no teste de autenticação do endpoint isolado.

O log mostra HTTP 402 em vez de 401/405, com a mensagem explícita:

`exceed_edge_functions_invocations_quota`

Resultado observado: **0/16 checks não autenticados passaram**. Playwright, integração autenticada, concorrência, recibos, convites e passos posteriores foram ignorados. É bloqueio de quota do laboratório, não prova de defeito nos contratos offline de upload.

### #82 QA — falha herdada do build

O Validate falhou em `scripts/validate.mjs:26` com `production updateURL mismatch`. O diff da PR é documental; a falha vem do contrato atual do build em master. O commit documental não alterou runtime.

## 3. Logs de produção — HTTP 402

Consulta read-only filtrada por `log_attributes['response.status_code']='402'` em `function_edge_logs`:

- **77.925 respostas 402**.
- Primeira observação: `2026-11-16T11:41:55.514Z`.
- Última observação disponível: `2026-11-16T21:00:47.824Z`.
- Chat: 41.630.
- Status: 18.104.
- Status remoto: 18.086.
- `/api/me`: 33.
- `/api/account`: 33.
- `/api/members`: 33.
- Download `/upstatus/upstatus.user.js`: 6.

A amostra de logs mostra status 402, caminho e execução reportada em 0 ms, mas não inclui o corpo/causa. **A causa específica em produção permanece desconhecida.** Não equiparar automaticamente à quota confirmada no laboratório.

## 4. Supabase produção — projeto dlfvkawaiqduhlazsszm

Projeto `UpStatus`, `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.

- Inventário: **7 migrations**, última `20261027155438 / set_upstatus_upload_limits_20mb`.
- Branch gerenciada `main`: `MIGRATIONS_FAILED`; preview project status `ACTIVE_HEALTHY`.
- **38 Edge Functions ativas**, todas listadas com `verify_jwt=false`. Isso não prova ausência de autenticação interna; exige revisão de cada rota. A lista inclui funções históricas de teste, betas e backups.
- Funções principais: `upstatus` Edge v480; `upstatus-team-lite` Edge v15; `upstatus-screen-share-3-1-1-beta10` Edge v6.

### Bundles realmente implantados

| Função | Versão interna | API do userscript embutido | Updater |
|---|---|---|---|
| `upstatus` | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` | `/upstatus/upstatus.user.js` |
| `upstatus-team-lite` | 3.4.30 | `upstatus-team-lite` | raw GitHub `team-lite-official` |
| beta10 | 3.1.1-beta8 | beta8 | updater e API apontam para beta8 |

Normal 3.4.7 distribui pelo slug `upstatus`, mas seu `CLOUD_SERVER` continua apontando para beta10. A função beta10 implantada contém código e userscript beta8. Team Lite 3.4.30 usa sua própria API, mas continua assinando o tópico Realtime legado beta10. Isso é divergência real de versão/endpoint; não prova, isoladamente, a causa dos 402.

## 5. Realtime, RLS, grants e SECURITY DEFINER

Consulta atual em `realtime.messages`:

- 106 registros.
- Todos `private=false`.
- Todos no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Zero policies em `realtime.messages`.
- `anon` e `authenticated` têm SELECT, INSERT e UPDATE na tabela.

Três funções públicas continuam SECURITY DEFINER:

- `upstatus_broadcast_messages()`
- `upstatus_broadcast_remote_state()`
- `upstatus_broadcast_users()`

Todas têm `search_path=public`, e EXECUTE para `anon`, `authenticated` e `service_role`. O trigger de mensagens serializa a linha OLD/NEW inteira com `to_jsonb` e envia broadcast público. Não foi feita tentativa de RPC direta nem exploração de canal.

Tabelas públicas: 10 com RLS habilitado, FORCE RLS desabilitado e zero policies. Nove mantêm grants amplos a papéis de cliente, incluindo privilégios como DELETE/INSERT/SELECT/UPDATE e TRUNCATE; `upstatus_visual_config` é a exceção sem grants de cliente no snapshot consultado.

Há 24 entradas em `pg_default_acl`. A inspeção detalhada ainda mostra privilégios default para `anon` e `authenticated` em schemas/tipos de objeto públicos e Storage, associados a owners como `postgres` e `supabase_admin`.

## 6. Storage

Buckets `chat-images` e `profile-images` continuam públicos, com limite de 20 MiB cada. Contagem atual:

- `chat-images`: 168 objetos.
- `profile-images`: 20 objetos.
- Policies em `storage.objects`: nenhuma.

A candidata signed-upload melhora validação de origem, bucket, caminho, token, MIME e tamanho declarado, mas os contratos offline não provam transferência real ao Storage nem inspeção dos bytes efetivos. O PR #174 declara explicitamente que o servidor valida MIME/tamanho declarados, não os bytes reais.

## 7. AUTH-03 e compatibilidade Normal / Team Lite

Nos runtimes implantados Normal e Team Lite:

- `/api/setup` continua aceitando primeiro setup sem convite.
- O fallback de papel atribui `implementation_admin` a nomes fixos `Ricardo`, `Lohan` e `Guilherme` quando a conta não tem papel.
- `/api/chat/clear` autoriza pela comparação `name === "Ricardo"`, não pelo papel armazenado.
- Produção não tem `upstatus_setup_invites`, colunas `setup_token_*` nem RPC `consume_upstatus_setup_invite`.
- A migration/RPC `consume_upstatus_setup_invite_rate_limit` usada pela candidata Team Lite também não está no inventário de produção.

A candidata Team Lite 3.4.31 chama `consume_upstatus_setup_invite_rate_limit`; a Normal #74 não contém a chamada equivalente e ignora o step de teste correspondente. As melhorias candidatas não estão implantadas.

## 8. Workflows de publicação

### Normal candidato #74

[deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/.github/workflows/deploy-production.yml):

- Manual-only (`workflow_dispatch`).
- Confere `SUPABASE_PROJECT_ID` contra `dlfvkawaiqduhlazsszm`.
- CLI fixada em 2.122.1.
- Exige `preRelease=false` e versão exatamente 3.4.7.
- Publica somente `supabase functions deploy upstatus`.

O build [scripts/build.mjs](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/scripts/build.mjs) mantém o cliente Normal apontando a API para beta10. Além disso, o guard exige que a versão seja estritamente maior que o artefato rastreado para sincronizar um userscript alterado, enquanto o workflow de produção fixa a versão em 3.4.7. O corte de release precisa alinhar versão, distribuição e API; não despachar como está.

### Team Lite oficial

[deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml):

- Manual-only.
- Usa CLI `latest`.
- Não verifica explicitamente project ref esperado nem SHA aprovado.
- Publica o slug `upstatus`, não `upstatus-team-lite`.

Não despachar esse workflow. O workflow `team-lite-candidate.yml` da #76 é CI; o `deploy-test.yml` da candidata é manual e publica `upstatus-test` (Normal TEST), não o runtime Team Lite de produção.

## 9. Migrations relacionadas

PR [#176](https://github.com/Reekyi/UpStatus/pull/176), HEAD `b50f8567392322b4309468e0fe9e6fc81ca38c1d`, está aberta/Draft, 6 commits ahead / 0 behind develop. Recupera quatro SQLs a partir de `supabase_migrations.schema_migrations.statements`, com newline final. Isso valida o texto registrado no ledger, não os bytes originais, comentários ou formatação dos arquivos históricos.

O Validate [43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) falhou em `client signed upload helper missing`, uma dependência do baseline develop sem o helper de #174. Nenhum SQL foi replayed; não houve teste de migration. A PR #176 não corrige o estado `MIGRATIONS_FAILED`.

PR [#174](https://github.com/Reekyi/UpStatus/pull/174) tem Validate [43802407509](https://github.com/Reekyi/UpStatus/actions/runs/43802407509) PASS no helper de signed upload, mas não comprova upload real.

O laboratório `bfpjtfqlnypisxljoxkb` é o projeto `upstatus-security-test`, ACTIVE_HEALTHY, com 38 migrations, duas funções de teste e nenhuma branch Supabase. É um ambiente de sinalização/segurança isolado, não um Full-Product TEST separado.

## 10. Issues, aceitação física e aprovação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta com 0/8 critérios físicos marcados. Não houve teste físico de queda/retorno de rede sem F5, reentrada em sala, novas chamadas, microfone/tela reais ou interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta. O comentário QA dedicado foi atualizado no mesmo ID, sem duplicatas e sem alterar o comentário da Engenharia.
- As PRs #74, #75, #76 e #82 continuam sem reviews humanas.

## 11. Gates reavaliados nesta execução

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | 106 broadcasts públicos, zero policies, grants cliente e payload de mensagem completo |
| TEST-ISOLATION | BLOCKED | Laboratório é projeto de sinalização; não há Full-Product TEST independente |
| MIGRATION-PROVENANCE | IN_PROGRESS | Quatro statements recuperados do ledger; origem byte-idêntica e replay ainda não verificados |
| AUTH-03 | BLOCKED | Setup sem convite e RPCs/migrations ausentes em produção |
| ACL-STORAGE | BLOCKED | Grants/default ACLs amplos, buckets públicos e zero policies em Storage |
| RECONNECT | PENDING | Exige confirmação física sem F5; não foi executado |
| HUMAN-REVIEW | PENDING | Sem reviews humanas e sem autorização explícita de release |

## 12. Próximas ações recomendadas

1. Diagnosticar separadamente os 402 de produção; verificar quota/uso do projeto sem presumir que a causa seja a mesma do laboratório.
2. Restaurar a quota do laboratório antes de repetir a integração da #76.
3. Definir um único corte Normal que alinhe userscript, API, updater, versão e Realtime.
4. Corrigir o workflow Team Lite para project ref/SHA/CLI fixos e slug `upstatus-team-lite`.
5. Integrar AUTH-03 e rate limit de convites em ambas as variantes, validar as migrations em Full-Product TEST e não reconstruir históricos por inferência.
6. Tornar Realtime privado/autorizado, minimizar payloads, restringir EXECUTE/ACLs e definir policies/privacidade de Storage.
7. Executar os oito critérios físicos da #78 e obter reviews/aprovação humana.

**Nenhum teste foi executado diretamente pela QA nesta rodada.** Foram inspecionados resultados de CI existentes, fontes implantadas, workflows, logs, migrations, catálogos e Advisors. Todas as consultas SQL foram SELECT-only. Nenhuma alteração de produção foi realizada.
