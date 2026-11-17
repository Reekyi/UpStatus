# UpStatus — auditoria independente QA

**Data:** 2026-11-17 02:45 UTC  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Veredito:** **NOT READY**.

## Método e limites

Inspeção read-only de GitHub, commits, branches, PRs, workflows e logs de CI; leitura dos bundles Edge implantados; consultas PostgreSQL exclusivamente `SELECT`; leitura dos logs e Security Advisors Supabase. Nenhum teste novo foi executado pela QA. Resultados de CI abaixo são resultados históricos dos workflows nos HEADs indicados, não uma execução desta auditoria.

Não houve escrita SQL, deploy, merge, migration, release, publicação de userscript, alteração de secrets, flags, roles, grants, ACLs, policies ou configuração de produção.

## Documento de prontidão

Li o conteúdo completo de `docs/RELEASE_READINESS.md` na branch QA. Blob SHA `7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c`, 1.046.356 caracteres e 8.423 linhas. O último checkpoint registrado no documento é **2026-11-15 06:30 UTC**, anterior às evidências de CI e às inspeções desta rodada. O documento precisa de novo checkpoint; não foi sobrescrito. Esta auditoria foi registrada em arquivo separado.

## Heads e topologia

Heads verificados por PR refs, comparações de commits e merge ref do CI:

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `2de80f5d3a73f81d6322aade27b2d4414896cd8e` |

O commit de master `9d40461` é idêntico ao HEAD resolvido da branch master. O PR #82 reporta `a9288cc` como base SHA, mas seu merge ref de CI foi criado sobre `9d40461`; a comparação atual confirma a branch master em `9d40461`. Não usar o base SHA antigo do snapshot do PR como fonte de verdade.

| PR | HEAD | Base | Comparação com base atual | CI / revisão |
|---|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | master | 887 commits à frente, 1 atrás; 90 arquivos alterados | Validate e Smoke PASS; sem review |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 à frente, 0 atrás | PASS histórico somente de scripts/metadata; sem review |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | team-lite-official | 389 à frente, 0 atrás | Contratos offline PASS; integração bloqueada por quota; sem review |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `2de80f5d3a73f81d6322aade27b2d4414896cd8e` | master | 384 à frente, 1 atrás; 220 arquivos alterados | Validate FAIL em updateURL; sem review |
| [#176 migrations](https://github.com/Reekyi/UpStatus/pull/176) | `b50f8567392322b4309468e0fe9e6fc81ca38c1d` | develop | Draft | Validate FAIL; sem review |

A branch de #76 é descendente da branch de #75: **330 commits à frente e 0 atrás**. #76 contém a linha de trabalho de #75; não tratar as duas como entregas independentes para merge. #74 e #82 estão muito divergentes da master atual e 1 commit atrás. #82 é uma PR documental de grande porte, não um pequeno patch: 384 commits à frente e 220 arquivos no diff.

## CI: resultados inspecionados

### PR #74 — Normal

- [Validate run 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): PASS.
- [Smoke run 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): PASS.
- Logs mostram **136/136 verificações autenticadas**, WebRTC de chamada/voz/tela com entrega de tracks, mesh de três participantes, teardown, rate limit de sinalização (90 aceitos e o seguinte HTTP 429), recibos de leitura atômicos e consumo concorrente de convite.
- O passo **“Verify distributed setup-invite issuance rate limit” foi skipped**. Isso é coerente com a inspeção do código: o handler Normal de emissão de convite não chama `consume_upstatus_setup_invite_rate_limit`.

### PR #75 — Team Lite

- [Candidate Checks run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico.
- O job executou somente **“Check candidate scripts and version metadata”**. Não é teste de integração, navegador, voz ou screen-share.

### PR #76 — Team Lite

- [Candidate Checks run 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAIL.
- O job de contratos de upload assinado passou. Os 11/11 checks do mapeador HTTP isolado passaram.
- O endpoint real do laboratório devolveu HTTP 402 em health e nas rotas não autenticadas, com mensagem explícita `exceed_edge_functions_invocations_quota`.
- Resultado: **0/16 verificações não autenticadas**. Playwright, integração autenticada, concorrência e passos seguintes foram skipped. Isso é bloqueio de infraestrutura, não prova de defeito nos contratos offline.

### PR #82 — QA

- [Validate run 43997532813](https://github.com/Reekyi/UpStatus/actions/runs/43997532813): FAIL.
- O log confirma build `UpStatus 3.4.7 / TEST 3.4.7` e falha `VALIDATION FAILED: production updateURL mismatch`.
- O workflow foi disparado pelo update da PR após commit documental; não há filtro suficiente para evitar repetir Validate quando apenas Markdown muda.

### PR #176 — migrations

- [Validate run 43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839): FAIL.
- O log confirma build `3.0.40 / TEST 3.0.40-beta.22` e falha `client signed upload helper missing`. É falha do baseline/build da branch, não prova de erro nos quatro statements recuperados.

## Código candidato, workflows e compatibilidade

### Normal

A candidata #74:
- `release.json` mantém versão estável 3.4.7 e URL de distribuição em `/upstatus/upstatus.user.js`.
- `scripts/build.mjs` ainda configura `CLOUD_SERVER` para `upstatus-screen-share-3-1-1-beta10`, enquanto a distribuição é servida por `upstatus`.
- O tópico candidato passa a `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, que coincide com o tópico dos triggers atuais.
- O workflow de produção da candidata tem guards melhores: manual-only, branch master, SHA/identidade do projeto, CLI 2.122.1 e versão estável explicitamente travada em 3.4.7. Porém, publica **somente** a função `upstatus`; o cliente continua chamando beta10. A versão travada também precisa de decisão humana e incremento coordenado antes de atualizar o artefato instalado.

O código Normal candidato consome o convite no primeiro setup, mas não chama a RPC de rate limit de emissão. A implementação Team Lite candidata chama essa RPC com limite de 5 por 900 segundos. Há divergência funcional entre os produtos.

### Team Lite

- A candidata #76 usa buildVersion 3.4.31, API `upstatus-team-lite` e tópico `upstatus-live-...`.
- O `signalTransportFlag` é lido com default `false`; o transporte autenticado não fica ativo por padrão.
- O workflow TEST candidato é manual-only, fixa CLI 2.122.1, exige projeto TEST separado e rejeita produção/laboratório de fixtures. Não há projeto Full-Product TEST disponível.
- O workflow oficial em `team-lite-official/.github/workflows/deploy-production.yml` usa CLI `latest`, não verifica branch/SHA/project ref de forma equivalente e executa `supabase functions deploy upstatus`, em vez de `upstatus-team-lite`. **Não despachar esse workflow.**

## Bundles e Edge Functions realmente implantados

Os bundles embutidos foram inspecionados e os userscripts Base64 decodificados:

| Função | Versão Edge | Versão interna / script | API chamada pelo cliente | Tópico Realtime |
|---|---:|---|---|---|
| `upstatus` | 480 | 3.4.7 | beta10 | `upstatus-screen-share-live-3-1-1-beta10` |
| `upstatus-team-lite` | 15 | 3.4.30 | `upstatus-team-lite` | `upstatus-screen-share-live-3-1-1-beta10` |
| `upstatus-screen-share-3-1-1-beta10` | 6 | 3.1.1-beta8 | endpoint beta8 no bundle servido | tópico beta8 |

Os clientes Normal e Team Lite instalados ainda usam o tópico legado beta10. O banco publica no tópico `upstatus-live-6f5e7b31-...`. Os candidatos mudam para o tópico novo, mas continuam sem autenticação privada habilitada por padrão. Não há `private:true` nem `setAuth()` nos bundles implantados inspecionados.

Produção tem 38 Edge Functions ativas, todas com `verify_jwt=false`; o laboratório tem 2. Isso não prova que todas as rotas aceitam anônimos, pois o UpStatus usa token próprio, mas exige autorização interna validada rota por rota. O endpoint `upstatus-signal-test` existe apenas no laboratório.

## Logs e disponibilidade

Consulta read-only de `function_edge_logs` na janela 2026-11-16 02:29:45 UTC a 2026-11-17 02:29:45 UTC:

- **77.925 eventos, todos HTTP 402**, entre 11:41:55.514 e 21:00:47.824 UTC de 16/11.
- Chat: 41.630; status: 18.104; remote-status: 18.086; me: 33; account: 33; members: 33; download do userscript: 6.
- Não há eventos de Edge Functions posteriores a 21:00:47.824 UTC na janela consultada. Isso não prova recuperação nem continuidade de falha; a telemetria não permite distinguir serviço recuperado de ausência de tráfego.

No laboratório, os 48 eventos HTTP 402 ocorreram entre 12:37:25.477 e 12:41:42.781 UTC de 16/11. O CI retornou a mensagem explícita `exceed_edge_functions_invocations_quota`. A organização está no plano Free e possui dois projetos; não há terceiro projeto Full-Product TEST.

## Supabase: migrations, AUTH-03, RLS, grants, Realtime e Storage

### Migrations e AUTH-03

- Produção: 7 migrations; laboratório: 39.
- A branch gerenciada `main` da produção está `MIGRATIONS_FAILED`; preview project status aparece `ACTIVE_HEALTHY`.
- Produção não tem colunas `setup_token_*`, tabela `upstatus_setup_invite_rate_limits`, RPC `consume_upstatus_setup_invite` nem RPC de rate limit.
- Laboratório tem as quatro colunas de setup token, tabela de rate limit e as duas RPCs.
- Os runtimes implantados Normal/Team Lite ainda mantêm setup legado e fallback de papel administrativo por nomes fixos. As candidatas retiram o fallback e exigem token; essa mudança não está em produção.
- PR #176 documenta a recuperação de quatro SQLs do ledger. Os arquivos existem na branch candidata e o documento ressalta que a recuperação do texto executado não prova os bytes originais, comentários ou formatação. Nesta rodada confirmei inventário e estado do PR, mas não fiz nova comparação byte a byte nem replay. Gate permanece em andamento.

### Produção

- 10 tabelas públicas: RLS habilitado em todas, **zero policies**.
- 9 tabelas têm grants amplos para `anon` e `authenticated`, incluindo `TRUNCATE` e `MAINTAIN`.
- 3 funções SECURITY DEFINER de trigger usam `search_path=public`; catálogo mostra EXECUTE para anon/authenticated. O Security Advisor reporta 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. Como as funções retornam `trigger`, não executei RPC para provar invocabilidade; os grants e alertas exigem correção/revisão.
- `realtime.messages`: 106 registros, todos `private=false`; zero policies. Eventos: 72 user_status, 26 db_change, 4 remote_command e 4 remote_result, no tópico `upstatus-live-...`.
- Buckets `chat-images` e `profile-images` são públicos, limite 20 MiB; 168 e 20 objetos respectivamente. `storage.objects` não tem policies próprias.
- Default ACLs de postgres e supabase_admin continuam amplas em public/storage/graphql_public.

### Laboratório

- 18 tabelas públicas com RLS e zero policies; grants diretos de anon/authenticated em tabelas public foram removidos.
- As três funções SECURITY DEFINER de trigger usam search_path vazio e não concedem EXECUTE a anon/authenticated.
- Advisor apresenta 18 INFO de RLS sem policy e nenhum WARN SECURITY DEFINER.
- Ainda existem default ACLs amplas em storage e de supabase_admin; laboratório melhorou, mas não está completamente limpo.

## Testes manuais

A [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) segue aberta, atualizada pela última vez em 2026-11-08 07:04 UTC, com **0/8 critérios físicos aprovados**. Nenhum teste no Tampermonkey/Sale Smartly, queda/retorno de internet sem F5, microfone, tela ou interoperabilidade instalada foi executado pela QA nesta rodada.

## Gates QA

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime público, sem policies e sem autenticação privada padrão |
| TEST-ISOLATION | blocked | Apenas produção e laboratório; quota bloqueia integração |
| MIGRATION-PROVENANCE | in_progress | Quatro SQLs recuperados do ledger, sem validação final em Full-Product TEST |
| AUTH-03 | blocked | Produção sem colunas/RPCs de convite e rate limit |
| ACL-STORAGE | blocked | Grants, default ACLs, SECURITY DEFINER e buckets públicos |
| RECONNECT | pending | 0/8 critérios físicos; sem confirmação de Ricardo |
| HUMAN-REVIEW | pending | PRs sem review; sem autorização de release |

## Conclusão e próximos passos

1. Investigar separadamente os 402 de produção; a última telemetria disponível não comprova recuperação.
2. O proprietário da organização precisa revisar Usage/Billing e spend cap do laboratório.
3. Consolidar Normal em um único corte de distribuição/API/versão e adicionar rate limit de convites equivalente ao Team Lite.
4. Corrigir o workflow oficial Team Lite para projeto, SHA, CLI pinada e função correta.
5. Tornar Realtime privado/autorizado por padrão e corrigir grants, default ACLs, SECURITY DEFINER e Storage.
6. Provisionar Full-Product TEST e validar migrations/preflight.
7. Executar os oito testes físicos da Issue #78 e obter revisão humana.

**Nenhum teste novo foi executado pela QA.** Foram inspecionados CI histórico, código, bundles, logs, Advisors e catálogos. Nenhuma operação de escrita ou alteração de produção foi realizada.
