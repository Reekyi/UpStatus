# Auditoria independente UpStatus — 2026-11-12 16:37:43 UTC

## Escopo e método

Auditoria read-only do repositório `Reekyi/UpStatus`, dos candidatos Normal/Team Lite e dos projetos Supabase `dlfvkawaiqduhlazsszm` (produção) e `bfpjtfqlnypisxljoxkb` (laboratório isolado).

Foram consultados heads e comparações Git, PRs #74/#75/#76/#82 e candidatas relacionadas (#133/#149/#151/#152), Issues #78/#79, workflows e logs existentes, conteúdo de `docs/RELEASE_READINESS.md`, catálogos PostgreSQL via consultas SELECT, inventário e fontes das Edge Functions. Nenhum workflow foi iniciado ou repetido pela auditoria.

**Limite:** não havia checkout local/test harness disponível nesta execução. Não executei scripts localmente, não fiz teste manual de navegador e não reproduzi chamadas HTTP. Resultados de CI abaixo são dos runs existentes; inspeção estática e estado implantado estão identificados separadamente.

## Resumo executivo

- PR #152 é um avanço verificável: candidata criada sobre o HEAD exato da QA, 11 commits à frente/0 atrás, com workflow offline completo aprovado no SHA exato.
- #152 corrige o destino do updater Normal/TEST e porta regressões de chat da #147, sem remover assertions. Continua Draft, sem review, e não é uma release completa.
- O Validate da QA (#82) continua falhando em `production updateURL mismatch`.
- Produção mantém bundles Normal 3.4.7 e Team Lite 3.4.30 com listeners de comandos e sinalização em broadcasts públicos.
- Produção tem 117 mensagens Realtime com `private=false`, grants amplos, tabelas RLS sem policies e buckets públicos.
- O laboratório está isolado e sem fixtures, mas a Edge Function de sinalização v32 não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409.
- Workflow oficial Team Lite continua deployando o slug Normal `upstatus` e usando CLI `latest`.
- **Recomendação: NOT READY.** Sem merge, deploy, migration, release, publicação ou mudança de configuração.

## Heads e integridade do repositório

| Referência | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA | `3255712e2cee2badf9d5d8085c3d1a2ac13f4c0c` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

Comparação master → QA: **256 commits à frente, 1 atrás**, status `diverged`, merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não houve rebase.

A API de branches reporta `protected=false` para master, QA e team-lite-official. O endpoint de repository rulesets retornou lista vazia. Portanto, não há proteção/ruleset de branch visível nesta inspeção.

`docs/RELEASE_READINESS.md` foi lido integralmente via Git blob: SHA `7cfbd70886df42ce790c078c224b19284a632595`, 8.410 linhas, 1.045.105 caracteres. O último checkpoint interno é de 2026-11-08 18:30 UTC; o documento não registra as mudanças desta rodada.

## PRs obrigatórias e CI

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Draft; Validate e Smoke PASS | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) · [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft; PASS histórico | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Draft; 110/110 PASS | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) |
| #82 QA | `3255712e2cee2badf9d5d8085c3d1a2ac13f4c0c` | Draft; FAIL | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43250677400) |

O log de #82 executou build 3.4.7/TEST 3.4.7 e falhou em `scripts/validate.mjs:26`: `VALIDATION FAILED: production updateURL mismatch`.

Candidatas relacionadas revalidadas:

- #133 Normal, HEAD `8d38036ead5e1c3c9cc00db9791f8c9de093ba62`: [Smoke #42804903887 SUCCESS](https://github.com/Reekyi/UpStatus/actions/runs/42804903887); a evidência histórica registra 136/136 verificações.
- #149 Team Lite, HEAD `77352d2e3b93722d6b69a9eec31a92bb63158230`: [Candidate Checks #43173176232 SUCCESS](https://github.com/Reekyi/UpStatus/actions/runs/43173176232); a candidata registra 110/110 e 11/11 contratos HTTP offline.
- #151 admin/chat, HEAD `60b686aefc1e5ae01197a8be8c7956ef9cc56bd3`: [Full Validate #43196245858 SUCCESS](https://github.com/Reekyi/UpStatus/actions/runs/43196245858).

Não foram encontradas reviews submetidas nas PRs obrigatórias nem na #152.

## PR #152 — revisão independente

[PR #152](https://github.com/Reekyi/UpStatus/pull/152) é Draft, aberta, não mesclada e sem reviews. Base exata: QA HEAD `3255712e2cee2badf9d5d8085c3d1a2ac13f4c0c`. Comparação: 11 commits à frente, 0 atrás. Seis arquivos alterados.

[Workflow #43256541733](https://github.com/Reekyi/UpStatus/actions/runs/43256541733) passou no HEAD exato `1f8f06c03d361c58acd3dc26d528b4e76bc72f92`. Jobs concluíram: sintaxe, contrato de release target, build offline completo e regressões de chat. O workflow usa `contents: read`, checkout pinado por SHA, `persist-credentials: false`, não usa secrets e não contém deploy.

Mudanças positivas:
- Build Normal passa a usar `release.json.scriptUrl` para updateURL/downloadURL.
- TEST usa seu próprio endpoint e não consulta o manifesto de produção.
- Regressões preservam anexos staged, link preview removível, filename separado da legenda e papel administrativo armazenado.
- Assertions foram atualizadas para o handler de emoji e contrato de role existentes; não foram removidas.

Limites e gaps:
1. O guard de URL em `scripts/build.mjs` aceita qualquer host (`https://[^/]+`) desde que o caminho seja `/functions/v1/upstatus/upstatus.user.js`. `scripts/test-qa-release-target.mjs` compara com `release.json`, mas não exige que o host seja `dlfvkawaiqduhlazsszm.supabase.co`. O valor atual do `release.json` está correto; o teste deveria fixar também o origin esperado.
2. `release.json` continua em 3.4.7, igual ao bundle Normal instalado. O updater compara versões e desativa atualização quando a versão servida é igual à instalada. #152 é candidata de QA, não release; antes de publicar é necessário escolher versão estável superior e validar o manifesto.
3. A PR não integra AUTH-03 completo nem as alterações de backend/signed-upload da #133. Ela não é a candidata Normal final.

## Supabase — produção

Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, Postgres 17.11.0.002. Há 38 Edge Functions; todas reportam `verify_jwt=false` no gateway. Isso não prova, por si só, ausência de autenticação: as fontes principais Normal/Team Lite verificam `x-upstatus-token`, hash de sessão em `upstatus_sessions` e expiração. Os outros slugs ainda exigem revisão individual.

Funções e artefatos relevantes:
- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; bundle Normal 3.4.7.
- `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; bundle Team Lite 3.4.30.
- `upstatus-test` v281 e beta10 v6 também estão no projeto de produção; não constituem ambiente Supabase independente.

Os bundles Normal e Team Lite foram decodificados diretamente das fontes implantadas. Ambos contêm listeners para `remote_command`, `call_signal`, voz e tela; não contêm `private:true` nem `setAuth()`. Normal encaminha o comando recebido ao executor quando o alvo coincide. Team Lite verifica a sessão local do receptor, mas não autentica a identidade do emissor. Os sinais de chamada/voz/tela continuam sem prova independente de origem no transporte instalado.

### Realtime

Snapshot: **117 eventos**, todos `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- user_status: 65
- db_change: 40
- remote_command: 6
- remote_result: 6

`realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies; anon/authenticated possuem SELECT, INSERT e UPDATE.

### RLS, grants e SECURITY DEFINER

Dez tabelas public consultadas estão com RLS habilitado e zero policies. Nove concedem a anon/authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Há 18 grants TRUNCATE (nove tabelas para cada papel).

Grants diretos observados: public 126, realtime 8, storage 32, total 166.

As três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, com EXECUTE para anon/authenticated. São funções trigger; não foi demonstrada invocação RPC direta. O trigger de mensagens transmite OLD/NEW completo; o trigger de estado remoto publica campos de comando/resultado; o trigger de usuários publica status.

Default ACLs de postgres em public/storage e de supabase_admin em public/GraphQL continuam amplas para papéis clientes.

### Storage e dados

- `chat-images`: público, 20 MiB, 168 objetos.
- `profile-images`: público, 20 MiB, 20 objetos.
- Zero policies próprias em `storage.objects`.
- 296 mensagens: 241 text, 17 image, 7 audio, 5 document, 4 video, 22 system; `file_name` nulo no snapshot.
- Cinco usuários: três implementation_admin e dois implementation_user.

## Supabase — laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`): ACTIVE_HEALTHY, região sa-east-1. Há somente duas Edge Functions: `upstatus-signal-test` v32 (SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`) e `upstatus-signal-e2e-once` v3.

As 17 tabelas de fixtures consultadas estão vazias; zero mensagens Realtime e zero buckets/objetos Storage. Dezessete/18 tabelas public consultadas têm RLS e zero policies; não há grants diretos de tabela para anon/authenticated em public. Isso confirma isolamento do projeto, mas não cria um ambiente full-product TEST.

Os três triggers de broadcast do laboratório usam `search_path=''`, EXECUTE somente postgres/service_role e payload mínimo contendo apenas a operação. Ainda publicam com `private=false`; portanto RT-01 não está concluído. Default ACLs de postgres em storage e de supabase_admin em public/GraphQL ainda incluem grants amplos para papéis clientes.

### Divergência HTTP de voz

A RPC `open_upstatus_signal_voice_room_attempt(text,text,text,integer)` é SECURITY INVOKER, `search_path=''`, EXECUTE apenas postgres/service_role e retorna `VOICE_ATTEMPT_ALREADY_ACTIVE` para tentativa ativa.

A Edge Function implantada `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409; `VOICE_ATTEMPT_ALREADY_ACTIVE` cai no default HTTP 500. O helper/teste candidato espera 409 (11/11 offline). Não foi feita chamada HTTP real; o 500 é conclusão da inspeção do código implantado, não resposta reproduzida.

## AUTH-03, migrations e branches Supabase

- Produção: zero colunas `setup_token_*`, zero tabela `upstatus_setup_invite_rate_limits`, zero função `consume_upstatus_setup_invite`.
- Laboratório: quatro colunas, uma tabela de rate limit e uma função de consumo de convite.
- Ledger: produção 7 migrations; laboratório 39.
- Quatro arquivos originais continuam 404 em master: visual config, chat message filename, MIME types e upload limits. Statements recuperados do ledger não equivalem a arquivos originais byte a byte.
- Branch Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

## Workflows e governança de publicação

O workflow oficial Team Lite em `team-lite-official` executa `supabase functions deploy upstatus`, usa CLI `latest` e lê project ID de secret sem guard explícito de slug/SHA/projeto. O destino deveria ser `upstatus-team-lite`. **Não despachar.**

O workflow Normal em master também usa CLI `latest` e project ID de secret; fixa release 3.4.7. A PR #152 valida build/updater/chat offline, mas não substitui workflow de publicação.

## Issues e aceitação manual

- Issue #78: 0/8 critérios marcados. Reconexão Normal/Team Lite sem F5, reentrada, nova chamada, ausência de peers/pollers órfãos e teste manual continuam pendentes.
- Issue #79: corpo contém 16 itens marcados e 19 pendentes. Comentário QA dedicado ID 6744331652; comentário da Engenharia ID 6744711778 deve permanecer separado.

## Classificação dos resultados

- **CI PASS:** #74 Validate/Smoke nos SHAs registrados; #75 PASS histórico; #76 110/110; #133 Smoke PASS; #149 Candidate Checks PASS; #151 Full Validate PASS; #152 workflow offline PASS no SHA exato.
- **CI FAIL:** #82 Validate no HEAD QA 3255712, `production updateURL mismatch`.
- **Inspeção de código:** PR #152, bundles implantados, handlers custom-token, listeners públicos, workflow Team Lite, helpers HTTP.
- **Inspeção PostgreSQL:** SELECT-only em catálogos, grants, policies, triggers, ACLs, mensagens, buckets e migrations.
- **Teste manual:** nenhum realizado nesta execução.
- **Pendente/bloqueado:** RT-01, AUTH-03 em produção, ACL/Storage, proveniência SQL, reconexão física, review humana e publicação segura.

## Gates e próximos passos

| Gate | Estado | Justificativa |
|---|---|---|
| RT-01 | blocked | broadcasts de produção seguem públicos; sem Realtime privado/autorizado |
| TEST-ISOLATION | done | projeto separado, fixtures vazias, sem dados Realtime/Storage |
| MIGRATION-PROVENANCE | blocked | quatro arquivos originais ausentes |
| AUTH-03 | blocked | produção sem colunas/tabela/RPC; candidato não integrado |
| ACL-STORAGE | blocked | grants/Default ACL amplos, buckets públicos sem policies |
| RECONNECT | pending | 0/8 critérios físicos; sem teste sem F5 |
| HUMAN-REVIEW | pending | PRs Draft sem aprovação humana/autorização de release |

Próximos passos:
1. Revisar #152 e fixar o host do updateURL ao projeto esperado.
2. Escolher versão estável superior a 3.4.7 antes de qualquer release.
3. Reconciliar #152 com AUTH-03 e signed uploads da #133, sem criar arquitetura concorrente.
4. Corrigir o mapper HTTP de voz na função de laboratório e testar o endpoint efetivo.
5. Corrigir workflow Team Lite (slug, projeto, SHA e CLI pinada).
6. Tornar sinalização server-mediated autenticada padrão em Normal e Team Lite; alinhar tópicos e retirar listeners públicos sensíveis.
7. Corrigir grants, Default ACL, RLS, SECURITY DEFINER e Storage com plano de rollback.
8. Recuperar proveniência original das migrations e diagnosticar MIGRATIONS_FAILED.
9. Executar os oito testes físicos e obter review/aprovação humana vinculada ao SHA final.

**Veredito: NOT READY.**

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva. A única escrita é este novo relatório documental na branch QA.
