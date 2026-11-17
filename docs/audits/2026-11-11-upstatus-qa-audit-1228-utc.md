# Auditoria independente de qualidade — UpStatus

**Executada em:** 2026-11-11T12:35:37.703Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Resultado:** **NOT READY**

## Escopo, método e limites

Revalidação read-only de GitHub e Supabase. Li integralmente `docs/RELEASE_READINESS.md` pelo blob GitHub `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.410 linhas. O último append existente no documento principal é de 08/11/2026 às 18:30 UTC. O documento principal foi preservado; este relatório é um arquivo separado.

A leitura por Contents API retornou conteúdo vazio, mas a leitura do blob foi completa. Não havia checkout/worktree local nem navegador de produto disponível para executar testes novos. Não fiz teste manual, rerun de workflow, HTTP contra produção ou teste físico. Os resultados de CI abaixo são execuções já existentes.

## Heads e integridade

- `master`: `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- QA / PR #82 antes deste relatório: `e8e8d6c24999f83b8f163976918961c13fa742d5`.
- QA comparada com master: 219 commits à frente, 0 atrás; merge-base igual ao master consultado.
- O documento principal não foi sobrescrito nem rebased.

## PRs, heads e CI

| PR | Estado / head | Evidência atual |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | Open, Draft, unmerged; `fb878537d95d` | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336): success |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | Open, Draft, unmerged; `7bbf9b90b3a7` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): success histórico; #76 é a linha ativa |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | Open, Draft, unmerged; `4edfbf25476c` | Candidate Checks [42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169): success |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | Open, Draft, unmerged; `e8e8d6c24999` | Validate [43013846009](https://github.com/Reekyi/UpStatus/actions/runs/43013846009): failure |
| [#131 Normal AUTH-03](https://github.com/Reekyi/UpStatus/pull/131) | Open, Draft, unmerged; `17169a30a9b9` | Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798): success; log registra 136/136 checks |
| [#142 API Normal](https://github.com/Reekyi/UpStatus/pull/142) | Open, Draft, unmerged; `f4b1a6dbccec` | Nenhum run PR-triggered retornado para o HEAD consultado |
| [#143 dispatcher Normal](https://github.com/Reekyi/UpStatus/pull/143) | Open, Draft, unmerged; `34cbf5877dc3` | Validate [42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622): success |

Nenhuma review humana foi registrada nas PRs #74, #75, #76, #82, #131, #142 ou #143.

### Falha atual da QA

O log exato de #82 mostra build `3.4.7 / TEST 3.4.7`, seguido de `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`. Não enfraqueci o validator e não fiz rerun.

### AUTH-03 Normal — avanço real, ainda candidato

A PR #131 está diretamente baseada no HEAD #74 e acrescenta um commit. A migration de rate limit tem o mesmo Git blob SHA nas candidatas Normal #131 e Team Lite #76: `ab73b5cd8200147a449327d21798eef588834d50`.

A rota candidata `issueSetupInvite`:
- valida o papel administrativo armazenado;
- consome `consume_upstatus_setup_invite_rate_limit` usando chave derivada por SHA-256 do administrador;
- limita a 5 emissões por 900 segundos;
- retorna 429 quando o limite é excedido e 503 se a RPC falha;
- rejeita antes de ler o corpo do convite.

A migration usa RLS, revoga acesso de PUBLIC/anon/authenticated, concede acesso à service_role, define a RPC como SECURITY INVOKER e fixa `search_path=''`. O teste de integração usa o projeto isolado e valida concorrência, buckets independentes, reset e cleanup. O mesmo workflow registra testes de navegador para chamada, voz, tela e malha de três participantes.

Limite da evidência: a integração de rate limit chama a RPC diretamente no laboratório; a rota HTTP da Edge Function é coberta por harness com RPC simulada. Não encontrei neste run um teste end-to-end HTTP da rota candidata implantada. O candidato não implementa rate limit de tentativas de login.

A tabela/RPC de rate limit e a estrutura de convite continuam ausentes na produção. O laboratório contém a tabela/RPC de rate limit e a RPC de consumo de convite. Portanto AUTH-03 permanece em andamento, não concluído.

### Integração de linhas de release

#143 continua Draft e está 13 commits à frente / 1 atrás da base #142; a comparação mostra divergência. Não considerar o dispatcher e a API como uma entrega integrada até reconciliar os heads. O dispatcher valida os dois runtimes Normal, mas não há aprovação humana nem autorização de release.

## Supabase — fotografia read-only

### Realtime e confiança

Produção contém **69 eventos** em `realtime.messages`, todos `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:

- 20 `db_change`
- 6 `remote_command`
- 6 `remote_result`
- 37 `user_status`

Os bundles servidos por Normal v480 e Team Lite v15 foram decodificados: ambos assinam `upstatus-screen-share-live-3-1-1-beta10`; não encontrei `private:true` nem `setAuth()`. O tópico dos clientes não coincide com o dos triggers.

`realtime.messages` tem RLS habilitado, zero policies e privilégios SELECT/INSERT para anon e authenticated. As três funções `upstatus_broadcast_*` são SECURITY DEFINER, retornam `trigger`, usam `search_path=public` e mantêm EXECUTE para anon/authenticated. Não tratei o warning do Advisor como prova de RPC direta invocável para função que retorna trigger. O risco concreto confirmado é o broadcast público: a função de mensagens envia OLD/NEW completo via `to_jsonb`; as outras enviam dados de comando/resultado e status.

### RLS, grants e ACL

- Produção: 10 tabelas públicas com RLS e zero policies.
- Nove dessas tabelas têm privilégios diretos de cliente, incluindo SELECT e TRUNCATE para anon e authenticated. RLS não protege TRUNCATE.
- Default ACL: 120 entradas para anon/authenticated em public, storage, graphql e graphql_public.
- Laboratório: 18 tabelas públicas com RLS e zero policies; nenhuma concede SELECT direto a anon/authenticated nas tabelas auditadas.
- Default ACL do laboratório: 96 entradas para os papéis clientes.
- As três funções de broadcast do laboratório continuam SECURITY DEFINER, mas usam search_path vazio e EXECUTE está revogado para anon/authenticated.

### Storage e mensagens

Produção tem dois buckets públicos, ambos com limite de 20 MiB: `chat-images` e `profile-images`. `storage.objects` tem zero policies próprias. Laboratório: zero buckets e zero policies.

A consulta agregada de `public.messages` encontrou 279 mensagens, cinco documentos e cinco documentos sem `file_name`.

### Edge Functions e autenticação

Produção lista 38/38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Isso não prova ausência de autenticação: a amostra dos handlers principais Normal v480, Team Lite v15 e beta10 v6 contém autenticação customizada por `x-upstatus-token`, hash SHA-256, lookup de sessão e cache local de 30 segundos. Não fiz auditoria rota a rota das 38 funções.

Produção não possui `upstatus-signal`. O laboratório possui `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. A função de teste v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não contém tratamento específico para `VOICE_ATTEMPT_ALREADY_ACTIVE`; o contrato real HTTP continua pendente.

### Migrations

- Produção: 7 migrations no ledger.
- Laboratório: 39 migrations.
- Branch Supabase gerenciada `main`: `MIGRATIONS_FAILED`, enquanto `preview_project_status=ACTIVE_HEALTHY`.
- Os quatro SQLs abaixo retornaram 404 em `master`:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruí SQLs por inferência e não apliquei migrations.

## Issues e validação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos marcados. Nenhum teste de queda real de internet, retorno sem F5, reentrada, nova chamada ou interoperabilidade instalada foi realizado pela QA nesta rodada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16 itens marcados e 19 pendentes no corpo.

## Gates e recomendação

| Gate | Estado QA | Evidência / motivo |
|---|---|---|
| RT-01 | blocked | 69 broadcasts públicos; tópico de cliente divergente |
| TEST-ISOLATION | in_progress | projeto isolado contém fixtures/schema de teste; ainda não é ambiente full-product |
| MIGRATION-PROVENANCE | blocked | quatro SQLs do ledger retornam 404 em master; branch main MIGRATIONS_FAILED |
| AUTH-03 | in_progress | #131 e laboratório passaram; produção não tem tabela/RPC |
| ACL-STORAGE | blocked | grants/Default ACL amplos; dois buckets públicos sem policies |
| RECONNECT | pending | 0/8 critérios físicos; requer teste manual sem F5 |
| HUMAN-REVIEW | pending | PRs Draft sem reviews; nenhuma autorização de release |

**Recomendação: NOT READY.** Prioridades: corrigir Realtime privado/autorizado e alinhar tópicos; recuperar e validar os quatro SQLs originais; endurecer grants/Default ACL/Storage; integrar AUTH-03 também ao fluxo de login; reconciliar #131/#142/#143; corrigir o contrato HTTP de voz; corrigir o Validate da QA; concluir os oito testes físicos e obter aprovação humana.

Nenhuma produção foi modificada. Todas as consultas SQL desta auditoria foram SELECT-only. Não houve deploy, merge, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. Nenhum teste novo foi executado pela QA.
