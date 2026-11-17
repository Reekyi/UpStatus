# UpStatus — auditoria independente de QA

**Data:** 2026-11-11 17:42 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Escopo:** inspeção read-only de GitHub, CI, artefatos implantados, catálogo Supabase, SQL SELECT e workflows.

## Resumo executivo

**Recomendação: NOT READY.** A QA atual falha no `Validate build`; a candidata de API Normal não recebe um check PR-triggered por filtro de branch incorreto; o dispatcher #143 omite a migration de rate limit de convites e não valida a proveniência dos arquivos SQL locais; o workflow oficial Team Lite ainda aponta para a função Normal. Em produção, Realtime continua público, os grants e Default ACL seguem amplos, e AUTH-03 não está instalado.

Avanços verificáveis: #76 passou 110/110 verificações autenticadas; #131 passou 136/136 e executou o teste concorrente de rate limit; #141 contém a correção candidata para o updater Normal; #143 passou no Guard em push e no Validate da API candidata. Esses resultados não equivalem a release integrada ou validação manual.

## 1. Heads e integridade documental

| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA | `d136dd498c0804d8218dfb182c742f90bf7eceb5` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `4edfbf25476c7c751741b2e14c2c88fdc554f618` |
| PR #82 / QA | `d136dd498c0804d8218dfb182c742f90bf7eceb5` |
| PR #131 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| PR #141 | `61d00fb8666f4ca91c5a3c52a415d877b31a10cf` |
| PR #142 | `f4b1a6dbccecf63152bf353fcaaadfcd41357e11` |
| PR #143 | `34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa` |

A comparação `master...QA` retornou 225 commits à frente e 1 atrás antes deste relatório. O merge-base é `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não houve rebase.

`docs/RELEASE_READINESS.md` foi lido integralmente via GitHub Contents API: 8.410 linhas, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint interno é de 2026-11-08 18:30 UTC. O documento original foi preservado; esta auditoria foi criada em arquivo separado.

## 2. PRs e CI nos HEADs exatos

| PR | Estado | Evidência atual | Interpretação QA |
|---|---|---|---|
| #74 Normal | Open / Draft | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336), ambos PASS | O Smoke executou a integração isolada, mas o passo de rate limit de emissão de convites ficou `skipped` neste HEAD. |
| #75 Team Lite baseline | Open / Draft | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), PASS | Evidência histórica do baseline 3.4.31; não substitui a candidata atual #76. |
| #76 Team Lite | Open / Draft | [Candidate Checks 42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169), PASS | Log confirma 110/110 checks autenticados, browser WebRTC e rate limit de convites executado. |
| #82 QA | Open / Draft | [Validate 43060104679](https://github.com/Reekyi/UpStatus/actions/runs/43060104679), FAIL | O passo `Validate build` falha com `production updateURL mismatch`. |
| #131 AUTH-03 Normal | Open / Draft | [Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798), PASS | Log confirma 136/136 checks autenticados e teste concorrente de rate limit no laboratório. |
| #135 migrations | Open / Draft | [Validate 42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777), FAIL | Arquiva statements recuperados do ledger; não recupera os quatro arquivos originais byte a byte. |
| #139 signaling PR check | Open / Draft | [Source Parity 42851899626](https://github.com/Reekyi/UpStatus/actions/runs/42851899626), PASS | Check de paridade estática; não é aceitação HTTP/produção. |
| #141 updater/chat | Open / Draft | [Validate 42936993580](https://github.com/Reekyi/UpStatus/actions/runs/42936993580), PASS | Candidata corrige a origem do updateURL e adiciona staged chat attachments e autorização administrativa por papel. |
| #142 API Normal | Open / Draft | [Push Validate 42977043722](https://github.com/Reekyi/UpStatus/actions/runs/42977043722), PASS | Não houve run PR-triggered no HEAD; o filtro do workflow não corresponde à base real da PR. |
| #143 dispatcher | Open / Draft | [Guard 42984657754](https://github.com/Reekyi/UpStatus/actions/runs/42984657754), PASS; [API Validate 42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622), PASS | O Guard executou em push e o deploy ficou SKIPPED. O run PR é o Validate da API candidata, não o Guard do dispatcher. |
| #129 Team Lite legacy guard | Open / Draft | [Guard 42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545), PASS | A proteção candidata passou em `offline_guard`, mas ainda não foi incorporada à branch oficial. |

As PRs #74, #75, #76, #82, #131, #129, #141, #142 e #143 estão abertas/Draft e sem reviews humanas submetidas nas consultas de reviews. Nenhuma foi considerada aprovada para release.

### 2.1 Raiz da falha de #82

O log do run 43060104679 confirma: `Built UpStatus 3.4.7 / TEST 3.4.7`, seguido de `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`.

Na QA, `scripts/build.mjs` define `PROD_FUNCTION="upstatus"`, mas o ramo de produção de `renderUser()` ainda monta `cloud` apontando para `upstatus-screen-share-3-1-1-beta10`. O validator exige que o header de produção contenha `/upstatus/upstatus.user.js`. `release.json` já declara `scriptUrl` em `/upstatus/upstatus.user.js`.

A #141 altera o build para usar `release.scriptUrl` como URL de atualização do userscript. É a correção candidata coerente, mas ainda não está na QA/master e não foi publicada.

### 2.2 Gatilhos de CI e integração entre PRs

- #142 tem base `fix/master-staged-chat-attachments-20261111`, mas `normal-beta10-api-candidate.yml` define `pull_request.branches` como `fix/normal-beta10-api-parity-20261111`, que é a branch de origem da PR. O filtro de `pull_request.branches` seleciona a branch-base. Resultado observado: existe Validate em push 42977043722, mas nenhum check PR-triggered no HEAD #142.
- #143 tem base #142. `deploy-production.yml` filtra `pull_request.branches: master`, portanto o `offline_guard` do dispatcher não roda no evento PR desta stacked PR; o Guard 42984657754 foi push. O run 42984668622 é o Validate da API candidata.
- #143 está 13 commits à frente e 1 atrás do HEAD #142, com merge-base `6fa53bd8246862e6fd5613787e5fa9bea4cdaefa`. A candidata precisa ser reconciliada com a API atual antes de aprovação.
- #131 está um commit à frente do HEAD #74 e contém a migration de rate limit. O blob da migration `20261109230000_setup_invite_rate_limit.sql` é idêntico em #131 e #76 (`ab73b5cd8200147a449327d21798eef588834d50`). Isso prova paridade do SQL candidato, não integração com #142.

## 3. Publicação e dispatcher

A #143 melhora o controle de release: `workflow_dispatch`, SHA de release explícito, PR aprovada, confirmação booleana, environment `production`, verificação de projeto/organização, Supabase CLI fixada em 2.122.1 e rechecagem do HEAD de master. O fluxo publica beta10 antes de `upstatus` e não executa `db push`/migrations automaticamente. No run de Guard, o job deploy ficou SKIPPED.

Há dois gaps concretos no preflight:

1. `REQUIRED_PRODUCTION_MIGRATIONS` contém somente as sete versões históricas e não inclui `20261109230000_setup_invite_rate_limit`.
2. `normal-production-dispatcher.mjs` não verifica presença dos arquivos em `supabase/migrations` nem hashes/blobs locais. A checagem atual valida o histórico remoto, não a proveniência do source SQL.

O dispatcher também exige uma versão estável superior à implantada. `release.json` continua em 3.4.7, igual ao userscript Normal servido. Não há nova versão estável aprovada.

### 3.1 Team Lite: workflow oficial ainda é inseguro

Na branch `team-lite-official`, `.github/workflows/deploy-production.yml` continua manual, usa Supabase CLI `latest` e executa `supabase functions deploy upstatus`. O alvo correto é `upstatus-team-lite`; não há preflight equivalente de projeto/SHA/migrations. A #129 cria um guard para desativar o dispatcher legado e passou no run 42993962545, mas permanece Draft. **Não despachar o workflow oficial atual.**

### 3.2 Proteção do repositório

GitHub retornou `protected=false` para `master`, `qa/release-readiness-2026-11-04-master` e `team-lite-official`. A API de rulesets retornou lista vazia. Portanto, não há proteção efetiva de branch nem rulesets exigindo os checks observados. Os guards próprios dos workflows não substituem essa proteção geral.

## 4. Runtimes e compatibilidade Normal / Team Lite

### 4.1 Edge Functions implantadas

| Função | Versão | Userscript embutido/servido |
|---|---:|---|
| `upstatus` | v480 | Normal 3.4.7 |
| `upstatus-team-lite` | v15 | Team Lite 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | O bundle embute script beta8, versão 3.1.1-beta8 |
| `upstatus-test` | v281 | TEST dentro do projeto de produção, não um projeto isolado |

Produção possui 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso é configuração do gateway, não prova automática de ausência de autenticação: os handlers principais amostrados usam sessão/token customizado `x-upstatus-token`. A auditoria não revisou individualmente todas as 38 rotas.

Os userscripts extraídos dos bundles implantados mostram:
- Normal 3.4.7 e Team Lite 3.4.30 assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Nenhum dos dois configura `private:true` ou `setAuth()`.
- Nenhum contém `file_name` ou o fluxo `setup_invite`/`setup_token`.
- A função beta10 v6 embute o userscript beta8 e aponta seu próprio updater para beta8. É uma divergência de artefato/versionamento que precisa ser resolvida.
- Normal usa updater `/upstatus/upstatus.user.js`; Team Lite usa o arquivo raw da branch `team-lite-official`.

### 4.2 Autenticação e onboarding em produção

Os runtimes Normal v480 e Team Lite v15 ainda expõem `GET /api/account?name=` com `needsSetup` e `POST /api/setup` que chama `login(req,true)` sem token de convite. Não há `setup_token_*`, RPC de consumo de convite ou tabela de convites no banco de produção. O fluxo de login não tem rate limit próprio.

A tabela `users` tem cinco contas e a consulta atual encontrou zero `password_hash` vazio e zero `role` vazio. Portanto, não há conta desconfigurada no snapshot atual; o risco é o caminho first-caller continuar disponível para provisionamentos futuros.

Há divergência de senha mínima: Normal exige seis caracteres; Team Lite aceita quatro. O fallback de papel no setup ainda usa nomes hardcoded quando `role` está vazio. A rota implantada `/api/chat/clear` continua autorizando pelo nome literal Ricardo, em vez de consultar o papel persistido; a #141 contém a correção candidata por papel administrativo.

### 4.3 Chat e anexos

A produção tem 296 mensagens, cinco do tipo document e as cinco sem `file_name`. A coluna existe no banco, mas os userscripts servidos não a usam. A API candidata #142 já seleciona `file_name`, mas não contém AUTH-03 (`setup_invite`, `setup_token`, RPC de consumo ou rate limit). A integração #131 + #141/#142 ainda não foi feita.

Na implementação implantada, `sniffMime()` retorna o MIME declarado quando não reconhece a assinatura do arquivo. O caminho de signed upload valida MIME e tamanho declarados e devolve URL assinada, mas não inspeciona os bytes que serão enviados diretamente ao Storage. Os buckets são públicos.

Há divergência de limite no Normal: `mediaRoute` aceita imagens até 25 MiB, enquanto `chat-images` tem limite de 20 MiB. O signed-upload limita a 20 MiB; o caminho legado de imagem pode aceitar a requisição e falhar ao gravar no bucket para arquivos entre 20 e 25 MiB. Team Lite limita o caminho legado a 20 MiB.

## 5. Supabase: segurança e estado atual

### 5.1 Realtime

A consulta read-only encontrou 100 linhas em `realtime.messages`; todas `private=false`, em um único tópico. Distribuição:

| Evento | Quantidade |
|---|---:|
| `user_status` | 48 |
| `db_change` | 40 |
| `remote_command` | 6 |
| `remote_result` | 6 |

A linha mais recente consultada é de 2026-11-11 17:16:17 UTC. O tópico dos triggers é `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os clientes Normal/Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`. Os tópicos não coincidem.

O trigger de mensagens transmite OLD/NEW completo em `db_change`; os demais enviam metadados de status e comandos. Não foi feita exploração externa nem prova de acesso de terceiro; o achado é a configuração pública observada.

`realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies, SELECT e INSERT para anon/authenticated. As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, `search_path=public`, com EXECUTE para anon, authenticated e service_role. Advisor atual: 3 WARN anon + 3 WARN authenticated e 10 INFO de RLS sem policy.

### 5.2 RLS, grants e Default ACL

- Dez tabelas `public` têm RLS e zero policies.
- Nove tabelas concedem a anon e authenticated sete privilégios diretos cada: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Total observado: 126 concessões diretas. `upstatus_visual_config` é a décima tabela sem policy, mas não apareceu com grants diretos aos dois papéis.
- Default ACL: 120 entradas para anon/authenticated distribuídas entre `public`, `storage`, `graphql` e `graphql_public`, envolvendo objetos de postgres e supabase_admin. Incluem privilégios de tabela como MAINTAIN e TRUNCATE.
- RLS não protege TRUNCATE; não interpretar RLS habilitado como isolamento efetivo enquanto grants/policies não forem corrigidos.

### 5.3 Storage

| Bucket | Público | Limite | Policies em `storage.objects` |
|---|---|---:|---:|
| `chat-images` | Sim | 20 MiB | 0 |
| `profile-images` | Sim | 20 MiB | 0 |

Não foi alterado bucket, ACL, policy ou objeto.

## 6. Laboratório, migrations e Edge Functions

A organização possui somente dois projetos: produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`. Não existe terceiro projeto full-product TEST. O laboratório está ACTIVE_HEALTHY, separado e sem fixtures no snapshot consultado, mas não tem buckets Storage nem a stack completa de distribuição.

| Verificação | Produção | Laboratório |
|---|---:|---:|
| Migrations | 7 | 39 |
| Edge Functions | 38 | 2 |
| Tabelas públicas com RLS | 10 | 18 |
| Tabelas públicas RLS sem policies | 10 | 18 |
| Tabelas públicas com grants diretos anon/authenticated | 9 | 0 |
| Default ACL entries | 120 | 96 |
| Linhas Realtime | 100 | 0 |
| Buckets Storage | 2 | 0 |

No laboratório, as tabelas `users`, `messages`, `upstatus_sessions`, `upstatus_signal_rooms` e `upstatus_setup_invite_rate_limits` estão vazias. Há quatro colunas `setup_token_*`, a tabela de rate limit de convites e duas RPCs de setup-invite. As RPCs `consume_upstatus_setup_invite`, `consume_upstatus_setup_invite_rate_limit` e `consume_upstatus_signal_rate_limit` são SECURITY INVOKER, `search_path` vazio, EXECUTE negado a anon/authenticated e permitido a service_role.

Produção não possui as quatro colunas, RPCs ou tabela de convite/rate limit. As quatro migrations históricas continuam 404 em `master`: visual config, `file_name`, MIME de documentos e limites de upload. A #135 arquiva statements recuperados do ledger, não blobs originais byte a byte.

A Management API retorna branch default `main` como `MIGRATIONS_FAILED`, mas `preview_project_status` e o projeto principal aparecem `ACTIVE_HEALTHY`. Isso não comprova que o banco ativo de produção falhou; o significado da branch/preview precisa ser esclarecido pelos logs da branch no Dashboard.

O laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. A função v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`; esse caso cai no fallback 500. Não foi feita requisição HTTP real.

## 7. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): permanece OPEN, 0/8 critérios físicos. Nenhuma confirmação de Ricardo sobre queda real de internet e recuperação sem F5 foi registrada nesta rodada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): o corpo mantém 16 itens marcados e 19 pendentes (35 no total). O comentário QA dedicado foi atualizado; o comentário da Engenharia não foi alterado.
- Nenhum teste manual em navegador/dispositivo, HTTP real, reconexão física, upload real ou interoperabilidade instalada foi executado pela QA nesta rodada.

## 8. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | 100 broadcasts públicos, tópico divergente, sem private/auth nos clientes e triggers. |
| TEST-ISOLATION | BLOCKED | Laboratório separado e limpo, mas falta projeto full-product TEST independente com Storage/distribuição completos. |
| MIGRATION-PROVENANCE | BLOCKED | Quatro arquivos originais 404; #135 contém statements do ledger, não source original; preflight #143 não valida hashes locais. |
| AUTH-03 | IN_PROGRESS | #131 passa no laboratório, mas produção não tem schema/RPC/token e API #142 não integra o fluxo. Falta rate limit de login. |
| ACL-STORAGE | BLOCKED | Grants diretos, Default ACL, buckets públicos e zero policies em Storage. |
| RECONNECT | PENDING | Issue #78 segue 0/8; exige confirmação física sem F5 em Normal e Team Lite. |
| HUMAN-REVIEW | PENDING | PRs examinadas sem reviews humanas; não há autorização explícita de release. |

## 9. Próximas ações recomendadas

1. Integrar #131 com a linha #141/#142 e validar AUTH-03 ponta a ponta por HTTP no ambiente isolado; acrescentar rate limit de login.
2. Corrigir o filtro `pull_request.branches` de #142 e fazer o Guard do dispatcher executar também no evento PR da stacked PR #143.
3. Atualizar #143 para exigir a migration de rate limit, verificar arquivos SQL locais e hashes de proveniência, e reconciliar a branch-base com o HEAD API atual.
4. Desativar o workflow legado Team Lite antes de qualquer dispatch; corrigir slug, projeto fixo, CLI pinada, SHA, preflight e rollback.
5. Projetar Realtime privado/server-mediated compatível com a autenticação customizada UpStatus; minimizar payloads antes de qualquer mudança de tópico e provar entrega em ambiente isolado.
6. Corrigir RLS/grants/Default ACL e decidir Storage privado, policies e validação real dos bytes; alinhar limites Normal/Team Lite/buckets.
7. Recuperar os arquivos SQL originais ou registrar proveniência verificável; diagnosticar o status MIGRATIONS_FAILED da branch via logs.
8. Quando houver build integrado e seguro, executar os oito critérios físicos da #78 e obter review/aprovação humana explícita.

## 10. Limites e segurança desta rodada

Todos os comandos SQL executados foram SELECT-only. GitHub e Supabase foram usados para leitura de branches, PRs, workflows, arquivos, Edge Functions, migrations, catálogo, Advisor e dados agregados. Não foram executados testes HTTP, scripts locais, workflows novos ou testes manuais.

Nenhuma alteração foi feita em produção: sem migration, DDL, DML, deploy, merge, release, publicação de userscript, alteração de secrets, flags, roles, grants, policies, ACLs, buckets ou fixtures. As únicas escritas desta rodada são este relatório novo na branch QA dedicada e a atualização do comentário QA existente na Issue #79. `docs/RELEASE_READINESS.md`, branches de engenharia e comentário da Engenharia foram preservados.