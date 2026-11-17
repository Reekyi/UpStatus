# UpStatus — auditoria independente de qualidade

**Execução:** 2026-11-16T10:19:58.925Z  
**Repositório:** `Reekyi/UpStatus`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.

## Conclusão

**NOT READY.** Foram confirmados dois riscos de publicação: o build/ workflow TEST do master usa o projeto de produção como alvo e a cópia do workflow de produção na branch `team-lite-official` publica o slug Normal `upstatus`, não `upstatus-team-lite`. Além disso, Realtime continua público, AUTH-03 não chegou aos runtimes, e a candidata Team Lite ainda não tem a mesma validação de URL de upload do Normal.

Esta rodada foi de inspeção read-only. Não houve execução de testes físicos, rerun manual de workflows, merge, deploy, migration, release ou publicação.

## 1. Refs, documento e integridade

Heads consultados diretamente:

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `1555361226ad8242ec084268f90d6fa6e7c0ee7b` |

A comparação QA vs master retornou 364 commits à frente, 1 atrás e 204 arquivos alterados, todos em `docs/`. A QA não contém alteração de runtime nesta linha documental.

Li integralmente `docs/RELEASE_READINESS.md` na QA (8.423 linhas). O último checkpoint dentro do documento é **2026-11-15 06:30 UTC**, portanto o documento-base está desatualizado em relação a esta revalidação de 16/11. Este relatório é um arquivo novo; o documento-base não foi sobrescrito.

O endpoint de branch protection retornou HTTP 403 por falta de acesso da integração; o endpoint de repository rulesets retornou lista vazia. **Proteção efetiva de branches não verificada**: não concluo que estejam desprotegidas.

## 2. PRs, issues e CI

As PRs #74, #75, #76 e #82 continuam abertas e Draft. A consulta de reviews retornou zero reviews submetidas nas quatro.

| PR | HEAD | Evidência exata | Resultado |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | **PASS**, com uma etapa de rate limit de emissão de setup-invite marcada SKIPPED no Smoke |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico**; não substitui #76 |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | **PASS**; etapas de transporte autenticado, convite, recuperação de voz/tela, browser smoke e rate limit concluídas |
| #82 QA | `1555361226ad8242ec084268f90d6fa6e7c0ee7b` | [Validate 43834240806](https://github.com/Reekyi/UpStatus/actions/runs/43834240806) | **FAIL** |

O log de #82 confirma que o build gerou `UpStatus 3.4.7 / TEST 3.4.7` e depois falhou em `VALIDATION FAILED: production updateURL mismatch` (`scripts/validate.mjs:26`). O commit documental acionou o workflow automaticamente; a falha é do contrato herdado de build/manifesto, não de uma execução de teste feita pela QA.

PRs relacionadas reconsultadas:

- #161: Validate e Smoke PASS no HEAD consultado ([43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445)).
- #167: Validate PASS ([43784897392]); não há Smoke no HEAD consultado.
- #168: Validate PASS ([43755941462]); não há Smoke no HEAD consultado.
- #170: Validate FAIL ([43762594686]); o contrato espera upload imediato, incompatível com o fluxo `pendingUpload` já presente nos clientes.
- #174: Validate PASS ([43802407509]).
- #175: teste dedicado de autorização PASS ([43808590208]), mas Validate geral FAIL ([43808590131]).

CI é evidência automatizada apenas para o SHA e o ambiente indicados. Nenhum desses resultados equivale a teste físico ou implantação em produção.

## 3. Build e workflows: risco de destino

### Normal / master

Em master:

- `scripts/build.mjs` fixa `PROJECT=dlfvkawaiqduhlazsszm`, `PROD_FUNCTION=upstatus` e `TEST_FUNCTION=upstatus-test`.
- O artefato TEST é construído com o mesmo project ref de produção.
- `release.json` permanece em 3.4.7 e aponta para `/functions/v1/upstatus/upstatus.user.js`.
- O build Normal ainda gera o updateURL usando o endpoint legado `upstatus-screen-share-3-1-1-beta10`, o que explica o mismatch do Validate.
- `.github/workflows/deploy-test.yml` é manual-only (`workflow_dispatch`), usa o secret genérico `SUPABASE_PROJECT_ID`, CLI `latest` e publica `upstatus-test` nesse projeto, sem allowlist que rejeite produção.

A função `upstatus-test` **já existe em produção**, ACTIVE v281, com userscript embutido 3.3.28. Não há evidência de que esta auditoria tenha executado o workflow ou causado essa implantação. O risco é que o workflow manual não impede o destino de produção e o build já aponta TEST para esse projeto.

A candidata #74 melhora o guard: exige `SUPABASE_TEST_PROJECT_ID`, rejeita produção e o projeto de sinalização isolada, fixa CLI 2.122.1 e falha fechado sem configuração. Porém, não existe terceiro projeto Supabase para Full-Product TEST; portanto não há destino seguro configurado.

### Team Lite oficial

A cópia de `.github/workflows/deploy-production.yml` na branch `team-lite-official` publica:

`supabase functions deploy upstatus --project-ref "$SUPABASE_PROJECT_ID"`

Ela usa CLI `latest`, secret genérico e não faz validação de projeto/SHA/migrations equivalente à candidata Normal. O slug esperado para Team Lite é `upstatus-team-lite`. **Não despachar esse workflow**: se executado nessa branch, o alvo declarado é a função Normal.

A cópia `deploy-test.yml` em `team-lite-official` também diverge da versão master: contém gatilho push em develop e usa `SUPABASE_PROJECT_ID` genérico. A versão master consultada é manual-only. Registro a divergência estática; não afirmo que o gatilho da branch não-default tenha sido executado.

## 4. Runtimes e compatibilidade

Inventário read-only:

| Runtime | Estado | Versão Edge | Versão userscript embutida |
|---|---|---:|---|
| Normal `upstatus` | ACTIVE | v480 | 3.4.7 |
| Normal API legada `upstatus-screen-share-3-1-1-beta10` | ACTIVE | v6 | 3.1.1-beta8 identificada na fonte |
| Team Lite `upstatus-team-lite` | ACTIVE | v15 | 3.4.30 |
| TEST `upstatus-test` em produção | ACTIVE | v281 | 3.3.28 |
| Laboratório `upstatus-signal-test` | ACTIVE | v32 | helper de sinalização |
| Laboratório `upstatus-signal-e2e-once` | ACTIVE | v3 | helper E2E |

Decodifiquei os userscripts embutidos nas funções implantadas:

- Normal 3.4.7 atualiza pelo endpoint `upstatus`, mas usa `CLOUD_SERVER` da API beta10.
- Team Lite 3.4.30 usa a API própria `upstatus-team-lite`.
- Ambos assinam o tópico Realtime `upstatus-screen-share-live-3-1-1-beta10`.
- Ambos criam `channel(UP_REALTIME_TOPIC)` sem `private:true`, sem `setAuth()` e sem transporte server-mediated no runtime instalado.
- O cliente instalado contém `pendingUpload`; portanto a assertion de upload imediato da #170 está desatualizada em relação ao fluxo atual.

## 5. Upload assinado e chat

Os dois runtimes instalados já possuem endpoints e helpers de upload assinado. A lacuna não é a existência do recurso, e sim o endurecimento:

- O cliente instalado valida a presença de token/URL/path e envia PUT, mas não valida rigorosamente origem, bucket, path e token contra a autorização.
- O PUT instalado não usa `credentials: 'omit'` nem `redirect: 'error'`.
- A candidata Normal (#167) acrescenta validação de origem/path/token e essas opções de fetch.
- A candidata Team Lite (#76) ainda usa helper mais permissivo, sem paridade com o Normal.
- O servidor valida MIME e tamanho declarados e cria URL assinada, mas não inspeciona os bytes reais nem usa quarentena privada.
- Os buckets de produção são públicos, então o upload assinado não torna o objeto privado.

No servidor implantado, `/api/chat/clear` verifica apenas `name === "Ricardo"`; embora exista helper `admin(name)` para outras rotas, ele não é aplicado à limpeza global. As candidatas #167/#171 adicionam papel persistido, mas não estão implantadas.

## 6. AUTH-03

Produção:

- 5 usuários; 0 hashes de senha vazios; 0 papéis vazios.
- 0 colunas `setup_token_*`.
- RPC `consume_upstatus_setup_invite` ausente.
- RPC de rate limit de setup-invite ausente.
- `POST /api/setup` continua aceitando primeiro setup sem token de convite.
- Fallback legado pode atribuir `implementation_admin` por nome quando o papel está vazio.
- Política mínima de senha diverge: Normal 6 caracteres; Team Lite 4.

Não reproduzi tomada de conta; os cinco registros consultados estão configurados. A conclusão é que o fluxo implantado ainda não tem a proteção de convite/role das candidatas.

## 7. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

Consulta read-only de 14 dias em produção: **106 eventos, todos `private=false`**:

| Evento | Quantidade |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_command | 4 |
| remote_result | 4 |

O tópico dos clientes (`upstatus-screen-share-live-3-1-1-beta10`) diverge do tópico dos triggers (`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`).

As três funções de broadcast são SECURITY DEFINER, `search_path=public` e EXECUTE efetivo para anon/authenticated/service_role. `upstatus_broadcast_messages()` envia `to_jsonb(OLD/NEW)` completo; as funções de remote state e users também emitem metadados em canal público.

O transporte server-mediated existe apenas no projeto isolado. A flag candidata `signaling_transport_enabled` tem default false, então mesmo a candidata mantém o fallback legado até o rollout ser alterado. Não há endpoint de sinalização equivalente implantado em produção.

### RLS e grants

Produção:

- 10 tabelas public com RLS habilitado e zero policies.
- 9 tabelas public com grants diretos a anon/authenticated, incluindo TRUNCATE.
- `realtime.messages`: RLS true, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.
- `storage.objects`: RLS true, zero policies e grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
- RLS sem policies não prova acesso a linhas; TRUNCATE não é protegido por RLS. Não foi demonstrada exploração direta por essas permissões.

Default ACLs de postgres em public/storage e de supabase_admin em public/GraphQL continuam amplas.

### Storage

| Bucket | Objetos | Público | Limite |
|---|---:|---|---:|
| chat-images | 168 | Sim | 20 MiB |
| profile-images | 20 | Sim | 20 MiB |

Não existem policies próprias em `storage.objects`. A política de privacidade dos buckets permanece sem decisão.

### Advisor

- Produção: 6 WARN relativos a EXECUTE amplo nas três SECURITY DEFINER e 10 INFO de RLS sem policies.
- Laboratório: 0 WARN e 18 INFO de RLS sem policies.

No laboratório, as três funções de broadcast usam `search_path` vazio e EXECUTE apenas para service_role. Porém, default ACLs de Storage e schemas gerenciados continuam amplas.

## 8. Migrations, ambiente e logs

- Produção: 7 migrations no ledger.
- Laboratório: 39 migrations.
- `supabase/migrations` em master e QA contém somente três arquivos.
- Quatro migrations presentes no ledger de produção continuam sem os SQLs originais em master/QA:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- Branch gerenciada `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- A organização tem somente dois projetos: produção e laboratório de sinalização. O laboratório não tem usuários, mensagens ou objetos Storage; não é Full-Product TEST.
- Logs nas últimas 24h: produção 72 pgbouncer + 21 postgres; laboratório 72 pgbouncer + 17 postgres. Não foram retornados logs Edge suficientes para calcular HTTP 402 ou atribuir disponibilidade de Edge Functions.

## 9. Issues e aceitação manual

- Issue #78: OPEN, 0/8 critérios marcados; oito critérios físicos continuam pendentes. Os comentários mais recentes com evidência de aceitação são de 08/11; não encontrei confirmação posterior de Ricardo.
- Issue #79: OPEN, 16 itens marcados e 19 pendentes (16/35).

Não havia sessão autenticada Tampermonkey/Sale Smartly nem dispositivos reais nesta execução. Não foram executados testes de perda real de rede, reentrada em sala, áudio bidirecional, microfone, captura de tela ou interoperabilidade instalada.

## 10. Gates e recomendação

| Gate | Estado | Evidência resumida |
|---|---|---|
| RT-01 | BLOCKED | 106 eventos públicos; triggers enviam `private=false`; transporte autenticado só no laboratório |
| TEST-ISOLATION | BLOCKED | TEST do master aponta para produção; só existem dois projetos Supabase |
| MIGRATION-PROVENANCE | BLOCKED | quatro SQLs originais ausentes; branch `main` em MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | setup sem convite e RPC ausente em produção |
| ACL-STORAGE | BLOCKED | grants/ACLs amplas, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8; sem teste físico |
| HUMAN-REVIEW | PENDING | PRs abertas/Draft, sem reviews; sem autorização explícita de release |

**Recomendação: NOT READY.** Prioridades: corrigir o destino TEST e provisionar um terceiro projeto Full-Product TEST; corrigir o workflow Team Lite para o slug correto e copiar os guards; reconciliar #167/#161/#168 sem remover regressões; completar AUTH-03; tornar Realtime privado/server-mediated por padrão; revisar ACLs/RLS/Storage; recuperar SQLs; só então executar aceitação física e revisão humana.

## Integridade da execução

Todas as consultas Supabase foram SELECT-only. Nenhuma produção ou laboratório foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva.

A única escrita de repositório é este arquivo novo na branch QA dedicada. A Issue #79 foi atualizada no comentário existente marcado `<!-- UPCONTROL:QA -->`; o comentário separado de Engenharia foi preservado.
