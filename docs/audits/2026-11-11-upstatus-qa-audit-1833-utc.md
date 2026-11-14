# UpStatus — auditoria independente de QA

**Data:** 2026-11-11 18:34 UTC (15:34 BRT)  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`

## Resumo executivo

**Recomendação: NOT READY.**

Esta execução foi de inspeção read-only no GitHub e Supabase. Não foram iniciados reruns, testes HTTP, testes de navegador, testes físicos, deploys ou alterações de produção.

Achados novos/confirmados nesta rodada:

1. **AUTH-03 não está integrado ao runtime Normal atual.** A produção Normal v480 e Team Lite v15 ainda usam o fluxo antigo `login(req,true)` sem token de convite. O candidato Team Lite #76 contém consumo de convite e rate limit; Normal #74 contém convite e #131 acrescenta rate limit. Porém, a API Normal #142 deriva de #141 e voltou ao login antigo, sem convite nem rate limit.
2. **#142 não recebe check de PR no próprio PR.** O workflow filtra `pull_request.branches` pela branch de origem, enquanto o evento é filtrado pela branch-base. O único Validate no HEAD #142 foi evento `push`. O mesmo workflow dispara para #143 porque a base de #143 é a branch #142.
3. **O guard próprio #143 não executa no PR #143.** Seu filtro de PR aceita apenas base `master`, mas #143 tem base #142. O offline guard observado foi no evento push. O Validate de PR visto em #143 pertence ao workflow de API candidata, não ao workflow do dispatcher.
4. **O preflight #143 omite a migration de rate limit de convites** `20261109230000_setup_invite_rate_limit` e não valida presença/hash dos arquivos SQL locais.
5. **Produção tem 103 broadcasts persistidos com `private=false`**, todos no tópico legado. Os bundles Normal/Team Lite implantados assinam o tópico beta10 e não configuram `private:true` nem `setAuth()`.
6. **Não existe terceiro projeto Supabase full-product TEST.** A organização lista somente produção e laboratório. O workflow TEST exige um terceiro project ref e rejeita explicitamente ambos os projetos existentes.
7. Os quatro arquivos SQL históricos continuam ausentes em `master` (HTTP 404 na leitura de conteúdo). A PR #135 contém statements recuperados do ledger, não os blobs originais.

## Heads reais e governança

| Ref | HEAD | Protegida |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | não |
| QA | `96876d70d7c10371d326598638c0d56f38abe78e` | não |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | não |

A comparação de QA contra master retornou **226 commits à frente e 1 atrás**, com merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não houve rebase.

A consulta de rulesets retornou lista vazia. Não encontrei branch protection efetiva em master, QA ou team-lite-official.

`docs/RELEASE_READINESS.md` foi lido integralmente nesta execução: **8.410 linhas**, aproximadamente 1,045 milhão de caracteres, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint interno do documento continua em 2026-11-08 18:30 UTC. O arquivo principal foi preservado; este relatório é um arquivo separado.

## PRs e evidência de CI

Todas as PRs abaixo continuam abertas e Draft. A consulta de reviews retornou **zero reviews submetidas** em #74, #75, #76, #82, #131, #141, #142 e #143.

| PR | HEAD | Base | Evidência no HEAD consultado |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | master | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) PASS; Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | PASS histórico [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite | `4edfbf25476c7c751741b2e14c2c88fdc554f618` | team-lite-official | Candidate Checks [42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) PASS; todas as etapas observadas passaram |
| #82 QA | `96876d70d7c10371d326598638c0d56f38abe78e` | master | Validate [43070933435](https://github.com/Reekyi/UpStatus/actions/runs/43070933435) FAIL em “Validate build” |
| #131 AUTH-03 Normal | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | chore/continuity-foundation | Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) PASS |
| #141 updater/chat | `61d00fb8666f4ca91c5a3c52a415d877b31a10cf` | master | Validate [42936993580](https://github.com/Reekyi/UpStatus/actions/runs/42936993580) PASS |
| #142 API Normal | `f4b1a6dbccecf63152bf353fcaaadfcd41357e11` | #141 branch | Validate [42977043722](https://github.com/Reekyi/UpStatus/actions/runs/42977043722) PASS **em push**, não PR |
| #143 dispatcher | `34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa` | #142 branch | Validate PR [42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622) PASS; offline guard push [42984657754](https://github.com/Reekyi/UpStatus/actions/runs/42984657754) PASS; deploy SKIPPED |
| #129 Team Lite guard | `f48a2d9edf5d46aaca46d79f4b26c6fd8305c51c` | team-lite-official | Guard [42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545) PASS |

### O que os logs de jobs realmente mostram

- #74 Smoke passou, mas as etapas “Syntax-check setup invite rate-limit harness when present” e “Verify distributed setup-invite issuance rate limit” foram **SKIPPED**.
- #131 Smoke executou e passou nas etapas de syntax, endpoint isolado, integração autenticada, rate limit de signaling, recibos de leitura, consumo único de convite e rate limit distribuído de emissão.
- #76 Candidate Checks executou e passou nos contratos de isolamento, signaling, enrollment, recuperação de voz/tela, Chromium Full-IIFE, integração autenticada, rate limits, migrations e triggers do workflow.
- #82 falhou no job Validate, antes de qualquer outra etapa. A série recente de execuções reporta `production updateURL mismatch`; o validator atual ainda exige que o header `updateURL` de produção contenha `/upstatus/upstatus.user.js`. Não foi feito rerun.

### Divergência entre candidatas Normal

- #131 adiciona o rate limit sobre a linha #74, que já contém convite one-time.
- #142 deriva da #141/master e seu `src/server/index.template.ts` não contém `setupToken`, `consume_upstatus_setup_invite` nem `consume_upstatus_setup_invite_rate_limit`.
- A comparação entre a branch #131 e a branch #142 retornou **884 commits à frente e 29 atrás**, status diverged. Não é uma integração pequena ou segura por cherry-pick cego.
- A comparação #143 contra #142 retornou **13 à frente e 1 atrás**, status diverged.

## Workflow de publicação e teste

### Normal API candidata (#142)

O arquivo `.github/workflows/normal-beta10-api-candidate.yml` usa:

- push para `fix/normal-beta10-api-parity-20261111`;
- `pull_request.branches` também para `fix/normal-beta10-api-parity-20261111`.

O PR #142 tem como base `fix/master-staged-chat-attachments-20261111`. Como o filtro de `pull_request.branches` corresponde à base, o check não dispara no PR #142. O run 42977043722 confirma evento `push`. O mesmo filtro dispara no PR #143, cuja base é a branch #142.

### Dispatcher Normal (#143)

O workflow próprio do dispatcher filtra PR apenas para base `master`. Como #143 tem base #142, o offline guard próprio não executou como check de PR. O run 42984657754 é evento push; o Validate de PR 42984668622 veio do workflow de API candidata.

O script `scripts/normal-production-dispatcher.mjs` lista sete migrations obrigatórias, até `20261027155438`, mas omite `20261109230000_setup_invite_rate_limit`. Não encontrei validação de hash/presença dos SQLs locais. O preflight confere o histórico remoto e o projeto, não a proveniência local completa.

O deploy está condicionado a workflow_dispatch em master, confirmação explícita, SHA atual, PR aprovado, checks no SHA, atestados de segurança/aceitação física e CLI 2.122.1. A ordem é API beta10 primeiro e userscript Normal depois. Não encontrei compensação automática se o segundo deploy falhar após o primeiro ter concluído.

### Team Lite oficial

O workflow atual em `team-lite-official` ainda executa `supabase functions deploy upstatus`, em vez de `upstatus-team-lite`, e usa Supabase CLI `latest`. Não encontrei validação equivalente de projeto, SHA e migrations no workflow. #129 desativa esse caminho em uma candidata Draft, ainda não integrada. **Não despachar o workflow oficial atual.**

### Ambiente full-product TEST

O workflow de TEST exige `vars.SUPABASE_TEST_PROJECT_ID`, rejeita o projeto de produção e também rejeita explicitamente o laboratório de signaling. A organização retorna apenas dois projetos: produção e laboratório. Portanto, não existe hoje um terceiro projeto full-product TEST que satisfaça o guard. O laboratório é isolado e serve aos contratos/fixtures de signaling, mas não substitui o ambiente full-product.

## Supabase — fotografia read-only

### Projetos e migrations

| Ambiente | Estado | PostgreSQL | Migrations |
|---|---|---|---:|
| Produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 |
| Laboratório `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 39 |

A branch gerenciada `main` de produção continua `MIGRATIONS_FAILED`, enquanto o preview está `ACTIVE_HEALTHY`. A causa não foi diagnosticada nesta execução.

Os quatro arquivos originais continuam ausentes em master (404):
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A PR #135 arquiva statements recuperados do ledger, mas isso não comprova recuperação dos arquivos originais byte a byte, comentários ou blobs Git.

### Edge Functions e AUTH-03 implantado

Produção lista 38 Edge Functions ACTIVE, todas com `verify_jwt=false`; isso, isoladamente, não prova ausência de autenticação, pois handlers podem validar token customizado. Runtimes relevantes:

| Função | Versão | SHA de fonte |
|---|---:|---|
| upstatus | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| upstatus-team-lite | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| upstatus-screen-share-3-1-1-beta10 | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| upstatus-test | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |

Laboratório tem duas funções: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Nenhuma função `upstatus-signal` está implantada em produção.

A inspeção do código implantado confirmou que Normal v480 e Team Lite v15 ainda executam `login(req,true)` sem token de setup. A rota `/api/setup` chama esse caminho. O código Normal usa fallback nominal para papel administrativo quando o papel está vazio; Team Lite também preserva o fluxo antigo de primeiro acesso.

Já o candidato Team Lite #76 exige token hexadecimal de 64 caracteres, consome `consume_upstatus_setup_invite` e chama `consume_upstatus_setup_invite_rate_limit`. O candidato Normal #74 também contém convite one-time; #131 acrescenta rate limit. A API Normal #142 não preserva esses mecanismos.

No banco de produção não existem colunas `setup_token_*`, tabela `upstatus_setup_invite_rate_limits` ou RPC `consume_upstatus_setup_invite`. No laboratório, as quatro colunas, a tabela e a RPC existem.

### Realtime

Consulta SQL read-only encontrou **103 linhas**, todas `private=false`, em um único tópico:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

| Evento | Linhas |
|---|---:|
| user_status | 51 |
| db_change | 40 |
| remote_command | 6 |
| remote_result | 6 |

Os bundles implantados Normal e Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`, não o tópico usado pelos triggers. A decodificação dos userscripts embutidos confirmou ausência de `private:true` e `setAuth()`. Os handlers recebem payloads de `remote_command`, `call_signal`, voice-room e screen-share; no Team Lite há checagem da própria sessão/generation local, mas isso não autentica o emissor do broadcast. Nenhuma injeção de evento, oferta ICE, chamada, áudio ou tela foi realizada.

`realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; anon e authenticated possuem SELECT, INSERT e UPDATE. As três funções `upstatus_broadcast_*` são SECURITY DEFINER, retornam `trigger`, usam `search_path=public` e mantêm EXECUTE para anon/authenticated. O Advisor registra 3 WARN para anon e 3 para authenticated. A função de mensagens transmite o registro OLD/NEW completo; remote-state envia campos de comando/resultado; user-status envia nome/status/reason/updated_at/sync.

### RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas concedem sete privilégios a cada papel cliente; a consulta encontrou 63 grants para anon e 63 para authenticated (**126 no total**). Incluem TRUNCATE; RLS não protege TRUNCATE.
- 120 entradas Default ACL: 24 por combinação de owner/schema para postgres em public/storage e supabase_admin em public/graphql/graphql_public.
- Buckets `chat-images` e `profile-images` públicos, 20 MiB cada.
- Zero policies próprias em `storage.objects`.

Laboratório:
- 18 tabelas RLS sem policies.
- Zero grants diretos de tabela para anon/authenticated nas tabelas públicas auditadas.
- 96 entradas Default ACL, ainda incluindo defaults amplos de supabase_admin/public e GraphQL e postgres/storage.
- Zero buckets e zero mensagens Realtime.

### Chat e usuários

Produção:
- 296 mensagens.
- 5 documentos; os 5 sem `file_name`.
- 5 usuários; nenhum password hash vazio e nenhum papel vazio.

A coluna `file_name` existe no banco e nos runtimes consultados, mas os cinco registros históricos de documento continuam sem nome persistido.

## Issues e aceitação

- Issue #78 continua aberta, **0/8 critérios físicos marcados**. Nenhum teste manual de queda real de internet, retorno sem F5, reentrada em sala, chamada, microfone/tela ou interoperabilidade instalada foi executado.
- Issue #79: corpo com 35 itens, 16 marcados e 19 pendentes. O comentário QA existente foi atualizado; o comentário da Engenharia foi preservado.

## Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 103 broadcasts private=false; tópico divergente |
| TEST-ISOLATION | BLOCKED | Só existem produção e laboratório; workflow exige terceiro projeto |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais retornam 404; #143 omite migration AUTH-03 |
| AUTH-03 | IN_PROGRESS | #76/#131 têm candidatos e CI; produção e API #142 não têm o fluxo |
| ACL-STORAGE | BLOCKED | 126 grants diretos, 120 Default ACL, dois buckets públicos sem policies |
| RECONNECT | PENDING | Issue #78 0/8; nenhum teste físico |
| HUMAN-REVIEW | PENDING | Zero reviews submetidas nas PRs examinadas; sem autorização de release |

## Próximos passos recomendados

1. Tornar Realtime privado/autorizado por padrão em Normal e Team Lite, validar membership/identidade no servidor e remover listeners públicos sensíveis.
2. Reconciliar AUTH-03 em uma única linha Normal/Team Lite; preservar token one-time e rate limit no runtime/API que será publicado; adicionar rate limit de tentativas de login.
3. Corrigir filtros `pull_request.branches` para as bases reais, exigir PR checks e fazer o guard #143 executar no PR que pretende proteger.
4. Atualizar o preflight #143 para incluir a migration `20261109230000` e validar arquivos SQL locais/hashes de proveniência; planejar compensação/rollback entre os dois runtimes.
5. Corrigir workflow Team Lite para slug `upstatus-team-lite`, CLI pinada e validações de projeto/SHA/migrations.
6. Provisionar um terceiro projeto full-product TEST sem reutilizar produção ou laboratório.
7. Recuperar os quatro SQLs originais, diagnosticar `MIGRATIONS_FAILED` e endurecer grants/Default ACL/Storage com owner autorizado.
8. Executar aceitação física Normal/Team Lite sem F5 e obter reviews/aprovação humana.

**Nenhuma produção foi modificada.** Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secret/flag, escrita de fixtures ou teste manual. A única escrita desta execução é este novo relatório na branch QA dedicada.
