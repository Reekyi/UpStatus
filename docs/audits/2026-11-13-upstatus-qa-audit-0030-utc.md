# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-13 00:38 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`  
**Modo:** somente leitura em GitHub/Supabase; relatório novo na branch QA. Nenhum teste físico, deploy, merge, migration ou escrita SQL foi executado.

## 1. Heads e integridade documental

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `6b1b8ce25eb9a6c7bf1bfbe137e518d05a8c3d93` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

Compare master → QA: divergente, 265 commits à frente e 1 atrás; 124 arquivos diferentes, todos em `docs/`. Nenhum arquivo de runtime/workflow aparece no diff dessa branch QA.

`docs/RELEASE_READINESS.md` foi recuperado pelo Git blob e lido integralmente: 1.045.105 bytes, 8.410 linhas, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint técnico do documento continua em 2026-11-08 18:30 UTC.

## 2. PRs obrigatórias e CI por HEAD

| PR | HEAD / evidência | Resultado | Classificação |
|---|---|---|---|
| #74 Normal | `a79ec9a922eaa064d2982bf650dbd7a6d186e9bd`; [Validate 42409229531](https://github.com/Reekyi/UpStatus/actions/runs/42409229531), [Smoke 42409229487](https://github.com/Reekyi/UpStatus/actions/runs/42409229487) | PASS | CI automatizado no candidato; 19/19 checks não autenticados, 129/129 autenticados, WebRTC de chamada/voz/tela, mesh de 3 membros, teardown e rate limit 90 aceitas + 1 HTTP 429 / Retry-After 60s. Não é teste físico. |
| #75 Team Lite baseline | `7bbf9b90`; [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico | Validação básica de scripts/versões; não é bateria completa de integração. #76 é continuação/descendente, não payload independente. |
| #76 Team Lite | `4edfbf25476c7c751741b2e14c2c88fdc554f618`; [Candidate Checks 42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) | PASS | 16/16 não autenticados, 110/110 autenticados, WebRTC call/voice/screen, mesh 3 membros, teardown, rate limit, recibos atômicos, convite de uso único, rate limit de convites, guard de build TEST e layout de migrations. Integração isolada, não aceite física. |
| #82 QA | `6b1b8ce25eb9a6c7bf1bfbe137e518d05a8c3d93`; [Validate 43330863080](https://github.com/Reekyi/UpStatus/actions/runs/43330863080) | FAIL | Falha reproduzida: `production updateURL mismatch`, em `scripts/validate.mjs:26`. |
| #157 Team Lite avatar ownership | HEAD `b7baf3a98e22b8a9555d667878e49e121d7bcf8c`, base `f1938fa0369eebb4703ef34462cf25148a70a291`, 4 commits à frente; merge ref `0f22f1ddbd8325428a3bea71ddad4779e39105ed`. [Push 43333821827](https://github.com/Reekyi/UpStatus/actions/runs/43333821827), [PR 43333849082](https://github.com/Reekyi/UpStatus/actions/runs/43333849082) | PASS nos dois | CI executa helper puro em VM e assertions estáticas; não consulta Supabase, não testa sessão renomeada/reutilizada e não faz PUT real no Storage. Sem review humana. |

As PRs #74, #75, #76, #82 e #157 não têm reviews registradas nesta consulta. Todas as evidências acima são de CI; nenhuma equivale a publicação ou aceite manual.

## 3. PR #157 — melhoria e lacuna residual de identidade

A candidata substitui o prefixo de avatar derivado do nome por SHA-256 de `users.id`, consulta no máximo dois registros e falha fechado quando não encontra exatamente um ID. Isso é uma melhoria válida.

A inspeção do template Team Lite encontrou, porém, o seguinte:
- `upstatus_sessions` continua armazenando somente `user_name`; `createSession` cria sessão com validade de 30 dias.
- `userFromToken` devolve e mantém em cache somente o nome da sessão.
- `avatarUserId(name)` resolve o ID novamente por `users.name`.
- `upstatus_profiles` continua com PK `user_name` e a rota faz upsert por esse nome.

No snapshot de produção existem 5 usuários, zero grupos de nomes duplicados, mas **não existe constraint UNIQUE em `users.name`**. A tabela de laboratório possui UNIQUE(name). Assim, o helper falha fechado para ambiguidades atuais, mas a sessão não está vinculada ao ID imutável: uma sessão antiga após rename/reuso do nome pode voltar a resolver uma identidade diferente. O fluxo de rename e a migração de `upstatus_profiles` não são cobertos pelo teste. Convidados Lucca/Ycaro também não têm teste de compatibilidade; se chamarem a rota sem linha em `users`, ela falha fechado com HTTP 409.

**Próximo ajuste recomendado:** vincular o ID imutável à sessão na autenticação, invalidar sessões no rename/reuso e definir uma migração/compatibilidade para perfis. Testar sessão antiga, rename, nome reutilizado, nome duplicado e convidados.

## 4. TEST e publicação — bloqueadores P0

Há somente dois projetos Supabase ativos e saudáveis:
- Produção `dlfvkawaiqduhlazsszm`, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, PostgreSQL 17.11.0.003.

Não existe projeto full-product TEST independente.

No projeto de produção:
- 38/38 Edge Functions estão ACTIVE e reportam `verify_jwt=false`; isso não significa automaticamente ausência de autenticação, pois os handlers usam sessões próprias.
- 12 funções com prefixo `upstatus-test` estão ACTIVE.
- `upstatus-test` v281 serve userscript 3.3.28.
- O bundle TEST tem o mesmo `@name` e `@namespace` Tampermonkey do Normal, aponta para o mesmo projeto Supabase, usa a mesma API beta10 e o mesmo tópico beta10.
- O backend TEST lê `SUPABASE_SERVICE_ROLE_KEY` do ambiente do próprio projeto. A chave não foi encontrada embutida no userscript; o risco é o runtime de teste operar sobre o projeto de produção.

O guard candidato de build TEST é positivo e foi aprovado no CI de #74/#76, mas não substitui nem retira o runtime v281 já implantado.

Workflows lidos:
- `.github/workflows/deploy-production.yml` em `team-lite-official`, blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`: `workflow_dispatch`, CLI `latest`, secret `SUPABASE_PROJECT_ID`, comando `supabase functions deploy upstatus`. O slug está errado para Team Lite; deveria ser `upstatus-team-lite`. **Não despachar.**
- `.github/workflows/deploy-test.yml` em `team-lite-official`, blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`: `workflow_dispatch` e gatilho `push` em `develop`, usa secret compartilhado `SUPABASE_PROJECT_ID` e publica `upstatus-test`. O runtime instalado confirma que o alvo atual é o projeto de produção. **Não despachar.**
- O workflow Normal em master também usa CLI `latest` e publica somente `upstatus`; não coordena por si só o runtime beta10.

## 5. Supabase — fotografia read-only

### Produção

| Indicador | Resultado |
|---|---:|
| Migrations no ledger | 7 |
| Edge Functions ACTIVE | 38 |
| Funções `upstatus-test*` ACTIVE | 12 |
| Tabelas public com RLS e sem policies | 10 |
| Tabelas public com grants diretos a clientes | 9 |
| Grants TRUNCATE efetivos para anon/authenticated | 18 |
| Entradas Default ACL expandidas | 120 |
| Buckets públicos | 2 |
| Objetos Storage | 188 |

Buckets: `chat-images` (168 objetos) e `profile-images` (20 objetos), ambos públicos e com limite de 20 MiB. Não há policies próprias em `storage.objects`.

`realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies e SELECT/INSERT/UPDATE concedidos a anon e authenticated.

### Realtime e SECURITY DEFINER

Existem 125 mensagens persistidas, todas `private=false`, no tópico legado:
- `db_change`: 46
- `user_status`: 67
- `remote_command`: 6
- `remote_result`: 6

As três funções `upstatus_broadcast_*` em produção são SECURITY DEFINER, `search_path=public`, owner postgres e EXECUTE para anon/authenticated/service_role. O trigger de mensagens transmite a linha OLD/NEW completa via `to_jsonb`; remote-state transmite metadados de comando/resultado; user-status transmite status e razão. Todos usam `realtime.send(..., false)`.

Os bundles Normal v480 (3.4.7) e Team Lite v15 (3.4.30) assinam o tópico beta10 público, não configuram `private:true` e não chamam `setAuth()`. O Normal executa `remote_command` recebido; Team Lite verifica a própria sessão antes de executar, mas não autentica independentemente o emissor do broadcast.

### Laboratório

| Indicador | Resultado |
|---|---:|
| Migrations | 39 |
| Tabelas public RLS sem policies | 18 |
| Grants diretos de clientes nas tabelas public de aplicação | 0 |
| Grants TRUNCATE de clientes em public | 0 |
| Default ACL expandidas | 96 |
| Mensagens Realtime | 0 |
| Buckets/objetos Storage | 0 |

Os três triggers de broadcast do laboratório têm `search_path=''`, EXECUTE somente service_role e payload reduzido à operação. Ainda usam `private=false`. A tabela `realtime.messages` continua com RLS sem policies e SELECT/INSERT/UPDATE concedidos a anon/authenticated. Portanto, o laboratório está mais endurecido que produção, mas não fecha RT-01 nem comprova entrega Realtime.

Security Advisor: produção 3 WARN anon + 3 WARN authenticated + 10 INFO RLS sem policy; laboratório 18 INFO RLS sem policy, sem WARN de SECURITY DEFINER.

## 6. AUTH-03, migrations e voz

Produção não possui colunas `setup_token_*`, tabela de rate limit de convite nem RPC de consumo de convite. O laboratório possui quatro colunas `setup_token_*` e migrations/estruturas de teste correspondentes.

Os quatro SQLs históricos abaixo retornam 404 em master:
1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

O ledger registra as sete migrations de produção, mas os arquivos originais não estão no diretório de migrations. A branch gerenciada Supabase `main` está `MIGRATIONS_FAILED`, com preview ACTIVE_HEALTHY.

A Edge Function de laboratório `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não reconhece `VOICE_ATTEMPT_ALREADY_ACTIVE`; o fallback de código é HTTP 500. Isso foi confirmado por inspeção estática, **não por requisição HTTP real**.

## 7. Issues e aceitação manual

- Issue #78 continua aberta, 0/8 critérios físicos aprovados. Não houve teste Tampermonkey de perda/retorno de rede sem F5, microfone real, captura de tela com permissões reais ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79 continua aberta; corpo com 16 itens marcados e 19 pendentes.
- O comentário QA dedicado foi atualizado no comentário existente `6744331652`; o comentário da Engenharia `6744711778` foi preservado. JSON de Control Center validado sem duplicatas.

## 8. Gates e recomendação

| Gate | Estado QA | Evidência atual |
|---|---|---|
| RT-01 | blocked | Produção mantém broadcasts públicos; bundles sem private/auth |
| TEST-ISOLATION | blocked | TEST v281 e 12 funções test-prefixed dentro de produção |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs originais 404; ledger 7 |
| AUTH-03 | blocked | Estruturas ausentes em produção; presentes somente no lab |
| ACL-STORAGE | blocked | Grants, Default ACL, buckets públicos e policies ausentes |
| RECONNECT | pending | Issue #78 0/8; nenhum teste físico |
| HUMAN-REVIEW | pending | Sem review/autorizações humanas nos candidatos |

**Recomendação: `not_ready`.** Não integrar/publicar antes de:
1. Provisionar TEST full-product isolado e retirar o runtime TEST legado da produção por plano aprovado.
2. Corrigir o workflow Team Lite para slug/projeto/SHA/CLI exatos e bloquear o dispatcher antigo.
3. Vincular sessão ao ID imutável e fechar rename/reuso/perfis/guests.
4. Tornar sinalização privada/autorizada nos dois clientes e alinhar tópicos/triggers.
5. Fechar grants, Default ACL, RLS, SECURITY DEFINER e política de Storage.
6. Recuperar/validar SQLs originais e diagnosticar MIGRATIONS_FAILED.
7. Corrigir o mapper HTTP 409 e testar endpoint implantado no laboratório.
8. Executar os oito critérios físicos e obter aprovação humana no SHA final.

## 9. Limites desta execução

Não havia checkout local para executar testes novos. Foram inspecionados logs existentes de CI, código-fonte, bundles implantados, catálogos, advisors e migrations. Não foi feito PUT real no Storage, request HTTP real de voz, exploração Realtime ou teste físico de navegador.

Todas as consultas SQL foram SELECT/catalog-only. Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva ocorreu. A única escrita de documentação foi a criação deste arquivo novo na branch QA; o documento RELEASE_READINESS.md e arquivos de Engenharia não foram sobrescritos.
