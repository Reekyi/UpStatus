# Auditoria independente UpStatus — 2026-11-13 17:42 UTC

**Recomendação:** `not_ready`  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, workflows/logs, arquivos candidatos, bundles Edge Functions implantados, Advisors e catálogos PostgreSQL. SQL executado exclusivamente com `SELECT`. Nenhum workflow foi disparado por QA e nenhum teste manual foi realizado.

> Este relatório é um checkpoint de auditoria, não autorização para merge, deploy, release, publicação de userscript, migrations, alteração de secrets/flags ou provisionamento de projeto.

## 1. Heads e integridade das referências

| Referência | HEAD | Situação |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | sem proteção de branch |
| QA `qa/release-readiness-2026-11-04-master` | `7a4730cff0e0fd18c03adea175e7bdcbf0f1de4b` | sem proteção de branch |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | sem proteção de branch |
| #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` | base master |
| #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | base team-lite-official |
| #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | base team-lite-official |
| #82 | `c8e3c6f144969d0371845eb1acb51c4e49652716` | PR documental |
| #161 | `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e` | base chore/continuity-foundation |
| #162 | `fa8c9fa1fc91a238fca65fb46f31d078288e7f36` | base fix/normal-api-target-aligned-rate-limit |

A branch QA está um commit à frente da cabeça declarada pela PR #82. A comparação `c8e3c6f...7a4730c` contém somente o novo relatório documental `docs/audits/2026-11-13-upstatus-qa-audit-1628-utc.md`; não é divergência funcional, mas a PR #82 não representa o HEAD QA atual. O único Validate associado ao HEAD da PR #82 nesta leitura é o run 43463260387, que falhou em `production updateURL mismatch`. A consulta de runs por SHA não retornou run para o HEAD QA documental.

A #162 está desatualizada em relação à base atual: a base registrada no PR é `a1d8dc8409ae894a5fb02acd2014749b7281868f`, enquanto a branch-base atual da #161 está em `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e`. A comparação da base atual com a cabeça #162 resulta em **8 commits à frente e 1 atrás**. Os checks verdes da #162 pertencem ao SHA antigo e devem ser renovados após reconciliar a base.

As branches `master`, QA e `team-lite-official` retornaram `protected=false`. Isso deixa os principais pontos de integração sem a proteção de branch esperada. Não encontrei reviews humanas nas PRs #74, #75, #76, #82, #161 ou #162.

## 2. PRs e CI

Todas as PRs listadas abaixo permanecem abertas, Draft e não mergeadas.

| PR | Commits / arquivos | Evidência no SHA consultado | Leitura QA |
|---|---:|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | 887 / 90 | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200), ambos PASS | Base Normal forte, mas ainda não representa o runtime instalado; o rate limit de emissão de convite foi acrescentado na linha #161. |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | 59 / 10 | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), PASS histórico | Baseline anterior, superado pela linha #76. |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | 386 / 57 | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881), PASS | 16/16 checks não autenticados e 110/110 autenticados; Chromium/Playwright confirmou áudio remoto, vídeo remoto, mesh de três participantes, teardown, rate limit e cleanup no projeto isolado. |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | 284 / 141 | [Validate 43463260387](https://github.com/Reekyi/UpStatus/actions/runs/43463260387), FAIL | Falha exata: `VALIDATION FAILED: production updateURL mismatch`. A cabeça da PR está um commit documental atrás da branch QA. |
| [#161 Normal](https://github.com/Reekyi/UpStatus/pull/161) | 11 / 10 | [Smoke 43430030814](https://github.com/Reekyi/UpStatus/actions/runs/43430030814), PASS | 19/19 não autenticados e 136/136 autenticados; o Smoke executou a etapa completa de build/Validate, WebRTC, voz, tela, mesh, convite único e rate limit de emissão. |
| [#162 voz](https://github.com/Reekyi/UpStatus/pull/162) | 8 / 7 | [Validate 43459219365](https://github.com/Reekyi/UpStatus/actions/runs/43459219365) e [Voice Contract 43459218841](https://github.com/Reekyi/UpStatus/actions/runs/43459218841), PASS | O helper mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409, mas o teste constrói `Response` local; não é chamada HTTP real à Edge Function. A PR está 1 commit atrás da base atual. |

### 2.1 Lacunas de workflow

- A #161 não recebe o Validate dedicado porque `pull_request.branches` no `.github/workflows/validate.yml` inclui `master`, `develop` e `fix/normal-api-target-aligned-rate-limit-20261113`, mas a base real da #161 é `chore/continuity-foundation`. O filtro de `pull_request.branches` corresponde à branch-base. O Smoke compensa parcialmente porque contém `Validate complete Normal and TEST build`, mas o check independente está mal configurado.
- A #162 tem workflow próprio para o contrato de voz e inclui a base empilhada correta. Entretanto, a cabeça de base mudou depois do snapshot do PR; rebase/reconciliação e novo CI são necessários.
- A #76 descende da #75: a comparação #75 → #76 é 327 commits à frente e zero atrás. Não tratar #75 e #76 como duas linhas independentes para merge.
- A contagem de commits da #74/#76 é grande. Antes de integrar, revisar merge-base, diff final e proveniência dos commits, sem inferir que todos os commits sejam alterações funcionais novas.

### 2.2 Candidatas Normal e Team Lite

A #161 corrige o alinhamento da função Normal: `PROD_FUNCTION=upstatus`, e o updater é validado contra o endpoint de distribuição da mesma função. O build TEST usa projeto configurado por `UPSTATUS_TEST_PROJECT_ID`, rejeita produção e o laboratório de signaling/auth, e usa sentinel inerte quando não existe projeto full-product configurado.

Normal e Team Lite candidatos adotam:
- Primeiro acesso com `setupToken` de 64 caracteres hexadecimais (256 bits), consumo atômico via `consume_upstatus_setup_invite` e validade de 15 minutos.
- Senha mínima de 6 caracteres no setup e 4 no login.
- Emissão de convites limitada a 5 por administrador por janela de 900 segundos.
- Migration de rate limit com `SECURITY INVOKER`, `search_path='' `, privilégios revogados de PUBLIC/anon/authenticated e EXECUTE somente para `service_role`.
- Role padrão `implementation_user`, sem fallback de promoção administrativa pelo nome.

O teste da #161 confirmou 90 requisições aceitas e uma rejeitada com HTTP 429 e `Retry-After: 60s`; o teste de setup confirmou consumo único, expiração, replay e concorrência no ambiente isolado.

O endpoint candidato de limpeza do chat exige nome do proprietário e role administrativa. Ainda existe uma dependência do literal `Ricardo` como identidade do proprietário; a migração completa para `users.id` continua pendente.

## 3. Runtimes efetivamente instalados

Os bundles foram extraídos do código das Edge Functions implantadas e inspecionados estaticamente. Isso é **CODE INSPECTION**, não teste funcional.

| Produto | Edge Function / runtime | Userscript | Namespace | API usada pelo cliente | Tópico Realtime |
|---|---|---|---|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` | `upstatus-screen-share-3-1-1-beta10` | `upstatus-screen-share-live-3-1-1-beta10` |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` | `upstatus-team-lite` | `upstatus-screen-share-live-3-1-1-beta10` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` | `upstatus-screen-share-3-1-1-beta10` | `upstatus-screen-share-live-3-1-1-beta10` |

O Normal tem `@updateURL` em `upstatus`, mas sua API continua apontando para beta10. Team Lite atualiza pelo raw GitHub da branch oficial e chama sua função própria. TEST tem updater próprio, mas chama beta10 de produção e compartilha namespace `upseller` com Normal. Isso mantém risco de colisão de instalação/armazenamento GM entre TEST e Normal.

### 3.1 Autenticação instalada

A inspeção dos três handlers implantados confirmou:
- `POST /api/setup` chama o mesmo fluxo de login sem exigir `setupToken`.
- O setup atribui `implementation_admin` por fallback nominal para os nomes oficiais quando a role está vazia; os demais recebem `implementation_user`.
- A limpeza total do chat é autorizada por comparação do nome `Ricardo`, sem exigir role administrativa.
- Normal rejeita senha menor que 6 caracteres também no login; Team Lite e TEST aceitam 4. Uma conta criada pelo Team Lite com senha de 4–5 caracteres pode falhar no Normal.
- Os cinco usuários atuais estão com senha e role preenchidas; isso não elimina a falha estrutural para futuras contas não configuradas.

O schema de produção não possui colunas `setup_token_*` nem RPC de consumo de convite. `users` tem PK em `id`, mas `name` não possui UNIQUE. `upstatus_sessions` usa `token_hash` e `user_name`; `upstatus_profiles` usa `user_name` como PK. Nenhuma das duas tabelas tem `user_id`.

As 38 Edge Functions de produção estão ACTIVE e reportam `verify_jwt=false`. Isso não é, isoladamente, prova de bypass, pois o aplicativo usa token de sessão próprio; torna essencial que cada rota aplique autorização própria. O caminho de setup instalado não exige o convite que a candidata implementa.

## 4. Realtime, RLS, grants e SECURITY DEFINER

### 4.1 Realtime

Consulta read-only de `realtime.messages` retornou **99 mensagens nos últimos 14 dias**, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 67 `user_status`
- 26 `db_change`
- 3 `remote_command`
- 3 `remote_result`

Os clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`, diferente do tópico dos triggers. O build candidato #161 já declara `PROD_TOPIC=upstatus-live-...` e tópico TEST separado, corrigindo o alinhamento futuro.

Em produção, `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado, zero policies e grants efetivos SELECT/INSERT/UPDATE para anon e authenticated. O snapshot não prova exploração externa; não foi feito subscribe externo nem teste de publicação. A configuração de Dashboard que controla acesso público não ficou disponível nesta inspeção.

O adapter autenticado candidato usa `x-upstatus-token`, mas `enabled=false` por padrão. Sem cutover validado, o transporte legado público continua sendo o caminho ativo. Não existe `upstatus-signal` em produção. No laboratório existem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

### 4.2 RLS e privilégios

Produção:
- 10 tabelas public com RLS habilitado e sem policies.
- 9 dessas tabelas concedem a anon/authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- RLS não protege contra TRUNCATE.
- 120 entradas de Default ACL para anon/authenticated distribuídas por `public`, `storage`, `graphql` e `graphql_public`; incluem privilégios amplos de tabela, sequência e EXECUTE de funções. O conjunto também contém `MAINTAIN` nos defaults de tabela.
- `realtime.messages` não tem policies e mantém os grants acima.

O Security Advisor de produção, observado em 2026-11-13 17:34:15 UTC, reportou 10 INFO de RLS sem policy, 3 WARN de SECURITY DEFINER executável por anon e 3 WARN de SECURITY DEFINER executável por authenticated.

### 4.3 SECURITY DEFINER de broadcast

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, usam `search_path=public` e têm EXECUTE efetivo para anon/authenticated. Os triggers chamam `realtime.send(..., false)`. A função de mensagens transmite OLD/NEW completo; a função de estado transmite campos de comando/resultado; a função de usuários transmite dados de presença.

As funções retornam `trigger`; não foi reproduzida chamada RPC externa. Ainda assim, o privilégio EXECUTE está concedido e o Advisor classifica as funções como externamente executáveis. Restringir EXECUTE e usar `search_path` vazio é a correção candidata no laboratório.

### 4.4 Comparação com o laboratório

O laboratório tem 39 migrations, 18 tabelas public com RLS sem policies, zero buckets Storage e zero mensagens Realtime. As três funções de broadcast do laboratório usam `search_path=''`, não concedem EXECUTE a anon/authenticated e mantêm EXECUTE para service_role. O Advisor do laboratório reporta 18 INFO e zero WARN.

O laboratório demonstra hardening parcial de catálogo, mas não é ambiente full-product: não tem buckets nem dados de produto para validar chat/Storage/Normal/Team Lite.

## 5. Edge Functions, TEST e migrations

- Produção: 38 Edge Functions ACTIVE; 12 slugs começam com `upstatus-test`; todas reportam `verify_jwt=false`.
- Produção: `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281 e beta10 v6.
- Laboratório: somente duas funções de teste, `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Projetos Supabase disponíveis: somente produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`. Não existe terceiro projeto full-product TEST.
- Produção registra 7 migrations; master contém apenas 3 SQLs canônicos no diretório `supabase/migrations`. Quatro fontes do ledger continuam ausentes: `20261023154754`, `20261026195855`, `20261027154329` e `20261027155438`.
- A branch gerenciada Supabase `main` está `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`. Estado confirmado na consulta de branches em 2026-11-13.

Storage de produção:
- `chat-images`: público, 168 objetos, limite 20 MiB.
- `profile-images`: público, 20 objetos, limite 20 MiB.
- Zero policies em `storage.objects`.
- A configuração versionada ainda declara limites diferentes (chat 25 MB e perfil 2 MB) e allowlist incompleta para os tipos encontrados em produção.

## 6. Workflow Team Lite e governança de release

O workflow oficial `.github/workflows/deploy-production.yml` em `team-lite-official` é manual, usa CLI `latest`, usa `SUPABASE_PROJECT_ID` de secret e executa `supabase functions deploy upstatus`. O destino correto para Team Lite é `upstatus-team-lite`. Não executar esse workflow como está.

O workflow oficial `deploy-test.yml` também usa `SUPABASE_PROJECT_ID`, CLI `latest` e publica `upstatus-test`; não garante projeto full-product isolado.

A candidata #76 melhora o dispatcher TEST: usa `vars.SUPABASE_TEST_PROJECT_ID`, recusa produção e laboratório de signaling/auth, exige referência de projeto de 20 caracteres e é manual-only. Essa proteção ainda não está na branch oficial. PRs #125, #128 e #129, que tratam dispatcher, proveniência de aprovação e bloqueio do legado, continuam Draft/não integradas.

As branches master, QA e team-lite-official retornaram `protected=false`. Nenhuma review humana foi encontrada nas PRs principais. A aprovação humana do SHA final permanece pendente.

## 7. Issues e testes manuais

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta; 0/8 critérios físicos marcados. Reconexão após perda real de rede sem F5, navegador/Tampermonkey instalado, permissões reais de microfone/tela e interoperabilidade instalada continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta; 16/35 itens marcados no corpo. Comentário de Engenharia mais recente é independente do comentário QA.
- Os testes Chromium/Playwright das PRs são CI automatizado em ambiente isolado com stubs de browser/Greasemonkey. São valiosos, mas não substituem os oito critérios físicos.
- Nenhum teste manual foi executado por QA nesta rodada. Nenhum script de fixture foi iniciado e nenhum workflow foi disparado.

## 8. Matriz de gates

| Gate | Estado | Evidência / motivo |
|---|---|---|
| RT-01 | BLOCKED | 99 mensagens Realtime, todas private=false; tópico instalado difere do tópico dos triggers; adapter autenticado continua opt-in e sem função de produção. |
| TEST-ISOLATION | BLOCKED | Só dois projetos; TEST instalado na produção compartilha namespace e API beta10 com Normal; laboratório não tem Storage/full-product. |
| MIGRATION-PROVENANCE | BLOCKED | Produção tem 7 migrations; master contém 3 SQLs canônicos; quatro fontes ausentes; branch Supabase main MIGRATIONS_FAILED. |
| AUTH-03 | BLOCKED | Bundles instalados sem setupToken; fallback de role por nome; sem rate limit/colunas/RPC em produção; identidade ainda baseada em user_name. |
| ACL-STORAGE | BLOCKED | RLS sem policies, grants/Default ACL amplos, funções SECURITY DEFINER executáveis por clientes, buckets públicos sem policies. |
| RECONNECT | PENDING | Issue #78 segue 0/8; nenhum teste físico sem F5 foi confirmado. |
| HUMAN-REVIEW | PENDING | PRs Draft e sem reviews; nenhuma autorização explícita de release. |

## 9. Próximas ações recomendadas

1. Corrigir o filtro Validate da #161 para sua base real e exigir check no SHA exato.
2. Reconciliar/rebasear #162 sobre a base #161 atual e renovar Validate/Voice Contract.
3. Manter #161 como linha Normal candidata, preservando convite único, consumo atômico e rate limit; revisar o vínculo de proprietário por nome.
4. Criar ambiente full-product TEST independente somente após decisão de custo/billing e autorização do proprietário.
5. Implementar e validar transporte server-mediated autenticado em ambiente isolado; não habilitar flag nem remover fallback público antes de E2E.
6. Corrigir o dispatcher Team Lite para slug, projeto, SHA, CLI pinada, preflight e aprovação humana.
7. Aplicar AUTH-03 e migrar sessões/perfis para `users.id` em rollout coordenado.
8. Revisar RLS, grants, Default ACL, SECURITY DEFINER e Storage com plano de compatibilidade.
9. Recuperar/provar proveniência dos quatro SQLs e diagnosticar `MIGRATIONS_FAILED`.
10. Executar os oito testes físicos da #78 e obter aprovação humana do SHA final.

## 10. Limites desta execução

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL, fixture ou teste manual. A única escrita no repositório nesta execução é este novo relatório na branch QA; o comentário QA existente na Issue #79 foi atualizado sem criar duplicata e sem alterar o comentário da Engenharia.
