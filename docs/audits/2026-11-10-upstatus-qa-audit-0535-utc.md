# UpStatus — auditoria independente de qualidade
**Snapshot:** 10/11/2026 05:35 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Laboratório:** `bfpjtfqlnypisxljoxkb`

## Veredito

**`not_ready` — não liberar.** Os candidatos Normal e Team Lite passaram nos checks atuais auditados, e a PR #131 passou pelo Smoke completo. Porém, foi identificado um bloqueador novo de integração: o build Normal gera o backend atualizado em `upstatus`, mas o userscript continua enviando as chamadas de API para `upstatus-screen-share-3-1-1-beta10`; o workflow de produção da #74 publica somente `upstatus`. O runtime beta10 implantado ainda mantém o setup legado. Portanto, o código novo de AUTH-03 não está no destino efetivamente usado pelo cliente Normal.

Os problemas de Realtime público, grants/RLS/Storage, proveniência de migrations, publicação Team Lite e aceitação física continuam abertos.

## 1. Heads reais e estado das PRs

| Ref | Base | HEAD | Estado / observação |
|---|---|---|---|
| Branch QA / PR #82 | `master` em `a9288cc` | `aece4a9385c99e13dcef318d8c4f119f122ebb50` | Draft; 179 commits à frente e 1 atrás do `master` atual |
| `master` | — | `9d40461babcec8eb8686c2a04be9c675df7da381` | Sem proteção de branch reportada pela API |
| `team-lite-official` | — | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Sem proteção de branch reportada pela API |
| PR #74 Normal | `master` em `a9288cc` | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Draft; 883 commits à frente e 1 atrás do `master` atual |
| PR #75 Team Lite baseline | `team-lite-official` | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft; 59 commits à frente |
| PR #76 Team Lite | `team-lite-official` | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | Draft; 378 commits à frente |
| PR #130 AUTH-03 antigo | base declarada `afc69bc` | `a6c32324e6fe17a0783bad09637131d7893285fd` | Draft; branch divergiu da base Normal atual: 12 à frente, 4 atrás |
| PR #131 AUTH-03 reconciliado | `chore/continuity-foundation` em `fb878537` | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | Draft; 1 commit à frente, 0 atrás; substitui o candidato divergente sem reescrever #130 |
| PR #129 guard Team Lite | `team-lite-official` | `886d364d0c43af0d8aed867bf04c407478af5e8f` | Draft; bloqueio do dispatcher legado ainda não integrado |

A API do GitHub reportou `protected=false` para QA, `master` e `team-lite-official`. Não há proteção efetiva dessas branches visível nesta fotografia. As PRs #74, #75, #76, #82, #130 e #131 não têm reviews submetidas; a #129 também permanece Draft.

## 2. CI: o que passou e o que falhou

| PR / HEAD | Workflow | Resultado |
|---|---|---|
| #74 `fb878537` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) | PASS, PR-triggered no HEAD exato |
| #74 `fb878537` | [Signaling Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS, PR-triggered no HEAD exato |
| #75 `7bbf9b9` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; não é check novo desta rodada |
| #76 `3b1406dd` | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) | PASS, PR-triggered no HEAD exato |
| #82 `aece4a` | [Validate 42756511530](https://github.com/Reekyi/UpStatus/actions/runs/42756511530) | FAIL na etapa Validate |
| #130 `a6c3232` | [Signaling Smoke 42741601731](https://github.com/Reekyi/UpStatus/actions/runs/42741601731) | PASS no candidato antigo, mas a branch divergiu da base atual |
| #131 `17169a30` | [Signaling Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) | PASS, PR-triggered; todas as etapas do job concluíram SUCCESS |

O Smoke da #131 executou a verificação de rate limit distribuído, recibos de leitura atômicos, consumo único de convite e cleanup. O harness de rate limit afirma 24 requisições concorrentes no primeiro bucket (5 permitidas, 19 negadas), 6 no segundo administrador (5 permitidas, 1 negada), preservação do limite do primeiro bucket, reset da janela e limpeza das fixtures.

A falha da #82 é `production updateURL mismatch` em `scripts/validate.mjs:26`. A causa foi localizada por inspeção: o `scripts/build.mjs` herdado do `master` monta o `CLOUD_SERVER` como `upstatus-screen-share-3-1-1-beta10` e deriva dele o `updateURL`, enquanto `release.json` e o validator exigem `/functions/v1/upstatus/upstatus.user.js`. O build candidato da #74 já mudou o `updateURL` para respeitar `release.json`, mas a branch QA não contém essa correção de build. O novo HEAD documental da QA não recebeu check próprio.

## 3. Bloqueador novo: o Normal gera e publica um backend, mas usa outro

Inspeção dos arquivos da candidata #74:

- `scripts/build.mjs` define `PROD_FUNCTION="upstatus"` e grava o servidor compilado em `supabase/functions/upstatus/index.ts`.
- O mesmo build injeta `CLOUD_SERVER` do userscript como `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-screen-share-3-1-1-beta10`.
- `src/userscript/upstatus.user.template.js` define `server=CLOUD_SERVER`; a função `api()` monta todas as chamadas como `server + route`.
- `.github/workflows/deploy-production.yml` publica somente `supabase functions deploy upstatus`.

Consequência: o workflow publica o backend novo em `upstatus`, mas o cliente Normal usa `upstatus-screen-share-3-1-1-beta10` para as rotas de API. O runtime beta10 v6 continua com `POST /api/setup` chamando `login(req,true)`. Assim, as rotas de convite e rate limit adicionadas em `src/server/index.template.ts` não chegam ao endpoint que o cliente usa. Os testes isolados usam `upstatus-test`, portanto não demonstram que o destino de produção está alinhado.

É necessário escolher e validar um único contrato: ou apontar o `CLOUD_SERVER` do cliente para o backend que o workflow publica, ou compilar/publicar explicitamente o backend beta10 atualizado. Adicionar uma asserção de build/CI que compare `CLOUD_SERVER` com o slug efetivamente implantado evitaria regressão.

## 4. Team Lite: candidato testado, publicação ainda sem caminho seguro

- A userscript oficial Team Lite é v3.4.30, usa `CLOUD_SERVER` `upstatus-team-lite` e ainda assina o tópico antigo `upstatus-screen-share-live-3-1-1-beta10`.
- A candidata #76 é v3.4.31, usa o tópico novo e `CLOUD_SERVER` `upstatus-team-lite`; o build candidato também gera a função `upstatus-team-lite`.
- O workflow `team-lite-candidate.yml` é de testes, não de publicação de produção.
- O workflow oficial em `team-lite-official` ainda expõe `workflow_dispatch`, carrega secrets de produção, usa Supabase CLI `latest` e executa deploy do slug `upstatus`, que pertence ao Normal.
- A PR #129 substitui o workflow legado por um job que falha fechado, mas continua Draft e não foi integrada. Isso é mais seguro do que o workflow antigo, porém ainda não fornece um caminho de deploy Team Lite correto e aprovado.

Não despachei nenhum workflow de publicação.

## 5. Realtime e compatibilidade Normal / Team Lite

### Artefatos implantados

- Edge Function `upstatus` v480 embute userscript Normal v3.4.7. O bundle usa `CLOUD_SERVER` `upstatus-screen-share-3-1-1-beta10`, tópico `upstatus-screen-share-live-3-1-1-beta10`, e não contém `private:true` nem `setAuth()`.
- Userscript Team Lite oficial v3.4.30 usa `CLOUD_SERVER` `upstatus-team-lite`, tópico `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` nem `setAuth()`.
- Edge Function `upstatus-screen-share-3-1-1-beta10` v6 embute um artefato identificado como v3.1.1-beta8, com updateURL e tópico beta8. Há divergência entre o slug da função e o header do userscript embutido.
- As candidatas Normal e Team Lite agora configuram o tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, alinhado ao tópico dos triggers. Essa paridade foi confirmada por inspeção dos arquivos candidatos, mas ainda não foi publicada.
- Nas candidatas, `signaling_transport_enabled` continua `false` por padrão e o endpoint começa vazio. Não encontrei `private:true` nem `setAuth()` no cliente candidato. O transporte autenticado permanece opt-in.
- Não existe função `upstatus-signal` na produção. No laboratório existem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

### Fotografia SQL read-only

Na janela de 24 horas, `realtime.messages` retornou 39 linhas, todas `private=false`, no tópico novo:

| Evento | Linhas |
|---|---:|
| `db_change` | 20 |
| `user_status` | 13 |
| `remote_command` | 3 |
| `remote_result` | 3 |

Os triggers publicam no tópico novo, enquanto os bundles implantados ainda assinam tópicos antigos. A paridade dos candidatos não fecha o gate de produção. Não foi feita injeção externa nem exploração.

## 6. Supabase: RLS, grants, SECURITY DEFINER e Storage

### Tabelas e permissões

- 10 tabelas do schema `public` têm RLS habilitado e nenhuma policy.
- 9 dessas tabelas têm grants de cliente; `anon` e `authenticated` possuem privilégios que incluem `TRUNCATE` nessas 9 tabelas. `TRUNCATE` não é filtrado por RLS; embora não seja uma operação normal exposta pelo PostgREST, é um grant excessivo que deve ser removido e auditado.
- `realtime.messages` tem RLS habilitado, nenhuma policy e grants SELECT/INSERT para `anon` e `authenticated`.
- `storage.objects` tem RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE/DELETE para `anon` e `authenticated`.
- Existem 24 registros em `pg_default_acl`, contendo 75 itens ACL distribuídos entre owners e schemas. O total inclui schemas internos do Supabase; não deve ser interpretado como 75 grants apenas no schema `public`.

### SECURITY DEFINER

As três funções `public.upstatus_broadcast_messages()`, `public.upstatus_broadcast_remote_state()` e `public.upstatus_broadcast_users()` são `SECURITY DEFINER`, têm `search_path=public` e EXECUTE efetivo para `anon` e `authenticated`. O Security Advisor reportou 3 WARN para `anon`, 3 WARN para `authenticated` e 10 INFO por RLS habilitado sem policy.

Essas funções retornam `trigger`; não foi demonstrada execução direta via RPC. O achado é o privilégio amplo reportado pelo Advisor e confirmado por `has_function_privilege`, não uma exploração reproduzida.

### Storage

Os buckets `chat-images` e `profile-images` continuam públicos, com limite de 20 MiB cada. A rota Signed Upload não inspeciona os bytes do arquivo antes de emitir a URL; o helper legado pode aceitar o MIME declarado quando não reconhece a assinatura. Não foi feito upload de teste em produção.

## 7. Edge Functions e ambientes

- Produção: 38 Edge Functions, todas ACTIVE e todas com `verify_jwt=false`. Isso, isoladamente, não prova ausência de autenticação; os três runtimes principais usam autenticação própria por token. O problema específico confirmado é que os runtimes implantados ainda têm o fluxo antigo de primeiro setup.
- Runtimes principais: `upstatus` v480, `upstatus-team-lite` v15 e `upstatus-screen-share-3-1-1-beta10` v6.
- Os três encaminham `POST /api/setup` para `login(req,true)`; o código implantado não consome convite nem rate limit.
- Produção não tem a RPC `consume_upstatus_setup_invite_rate_limit` nem a tabela `upstatus_setup_invite_rate_limits`.
- O projeto possui somente dois projetos Supabase: produção e `upstatus-security-test`. Não há ambiente full-product TEST independente.
- O laboratório está ACTIVE_HEALTHY, com 39 migrations, duas Edge Functions de teste e zero linhas em 12 tabelas de fixtures consultadas, incluindo usuários, sessões, mensagens, salas, membros, bindings, eventos, tentativas de chamada/voz, rate limits e `realtime.messages`.
- A RPC de rate limit no laboratório é `SECURITY INVOKER`, tem `search_path` vazio, EXECUTE negado a `anon`/`authenticated` e concedido somente a `service_role`. A mesma RPC não existe em produção.

## 8. Migrations e proveniência

Produção tem 7 migrations remotas. O laboratório tem 39. A branch gerenciada `main` do projeto de produção continua em `MIGRATIONS_FAILED`.

Os quatro arquivos originais abaixo retornaram 404 em `master`, embora as versões constem no histórico remoto de produção:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruí SQLs a partir do schema e não apliquei migrations.

## 9. Teste físico e issues

A [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) continua aberta com os oito critérios físicos desmarcados. O corpo descreve a falha de reconexão sem F5; não há evidência nova de teste instalado no Tampermonkey nesta execução. CI/Playwright não substitui queda real de internet, permissões reais de microfone/tela nem interoperabilidade entre instalações.

A [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) mantém no corpo um checklist histórico de 07/11. O comentário QA dedicado foi atualizado separadamente; o comentário da Engenharia foi preservado.

## 10. Gates e próximos passos

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Bundles implantados usam tópicos antigos e públicos; clientes não autenticam canais; transporte candidato segue opt-in |
| TEST-ISOLATION | in_progress | Laboratório separado e limpo, mas não existe projeto full-product TEST |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs originais ausentes do repositório |
| AUTH-03 | blocked | PR #131 passou no lab, mas produção não tem RPC/tabela e o cliente Normal aponta para outro runtime |
| ACL-STORAGE | blocked | Grants amplos, RLS sem policies e Storage sem policies próprias |
| RECONNECT | pending | Oito critérios físicos da Issue #78 sem aprovação |
| HUMAN-REVIEW | pending | PRs candidatas Draft, sem reviews e sem autorização explícita de release |

### Ações técnicas para Engenharia

1. Corrigir o contrato Normal: `CLOUD_SERVER`, função que recebe as rotas API, função compilada e slug publicado devem ser o mesmo destino. Acrescentar asserção de CI para essa igualdade.
2. Definir um caminho de publicação Team Lite que gere e publique `upstatus-team-lite`; manter bloqueado o dispatcher legado que aponta para `upstatus`.
3. Fazer o cutover Realtime de forma coordenada: tópicos, triggers, canais privados/autorizados ou transporte server-mediated padrão, com teste de entrega trigger-to-client.
4. Remover grants desnecessários, revisar as três funções SECURITY DEFINER e criar policies mínimas necessárias para Storage e tabelas expostas.
5. Recuperar os quatro SQLs originais de sua fonte histórica e reconciliar a branch Supabase `main` sem reconstrução especulativa.
6. Completar rate limit de login/setup além da emissão de convites e testar ambos os produtos no runtime efetivamente usado.

### Ação manual de Ricardo

Quando houver build integrado pronto para teste, executar os oito critérios da Issue #78 em Normal e Team Lite, incluindo queda real de internet por cerca de 10 segundos e retorno sem F5. Até essa confirmação, RECONNECT permanece pendente.

## 11. Limitações e segurança da execução

- `docs/RELEASE_READINESS.md` mantém o blob SHA `7cfbd70886df42ce790c078c224b19284a632595`. A leitura integral foi realizada em execução anterior; nesta rodada, o conector retornou conteúdo vazio inclusive nas tentativas por faixa, embora o SHA permaneça idêntico. Não há alteração do documento principal.
- Não foram executados testes locais ou físicos nesta rodada. Os resultados de CI são os workflows GitHub citados acima.
- Todas as consultas Supabase foram SELECT/catalog/read-only. Não houve SQL write, migration, deploy, merge, release, alteração de secrets/flags, publicação de userscript ou operação destrutiva.
- A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79. Nenhum arquivo existente foi sobrescrito.