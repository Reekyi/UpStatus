# Auditoria independente UpStatus | 2026-11-17 05:34 UTC

**Veredito: NOT READY.** Esta rodada revalidou o documento de prontidão, heads e ancestry, PRs/CI, workflows, código candidato, projetos Supabase, Edge Functions, logs e catálogos PostgreSQL. A QA não executou testes de produto nem testes manuais.

## 1. Método, escopo e limites

- GitHub: leitura de refs, PRs, diffs, commits, workflows, jobs/logs, reviews, issues e arquivos.
- Supabase: leitura de projetos, migrations, branches, Edge Functions, logs, Security Advisor e consultas PostgreSQL SELECT-only.
- Escrita autorizada: este relatório novo na branch QA e atualização do comentário QA existente na Issue #79.
- Não houve escrita SQL, alteração de produção, deploy, merge, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou mutação de fixtures.
- Não havia ambiente de navegador/Tampermonkey/Sale Smartly disponível para aceitação física; não simulei execução.

## 2. Documento de prontidão e heads reais

Li integralmente `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`: **1.046.356 caracteres e 8.423 linhas**. O último checkpoint interno é **2026-11-15 06:30 UTC**; portanto, o documento-base está desatualizado em relação às inspeções de 17/11. Não sobrescrevi o arquivo de 1 MB; este checkpoint fica em relatório separado.

Heads observados:

| Branch | HEAD |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `666ea27aab8fe89e695d07380907b409c0334eee` |

Comparações:
- #74 / `chore/continuity-foundation`: **887 à frente / 1 atrás** de master; merge-base `a9288cc`.
- #82 / QA: **388 à frente / 1 atrás** de master; merge-base `a9288cc`. O diff da #82 contém 223 arquivos, todos em `docs/`; nenhum arquivo de runtime.
- #75: 59 commits à frente de `team-lite-official`.
- #76: 330 commits à frente de #75, zero atrás. #76 é continuação direta da #75, não uma segunda entrega independente.

Não fiz rebase nem incorporei o commit concorrente de master. A QA permanece dedicada.

## 3. PRs obrigatórias e CI no HEAD exato

| PR | HEAD | Evidência mais recente observada | Classificação |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Validate 43376770142 PASS; Smoke 43376770200 PASS | Automated PASS com lacuna |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks 41674353127 PASS | PASS histórico e limitado |
| #76 Team Lite signaling | `00a578e9174e08238a1289a35feb02d171625421` | Signed-upload contracts PASS; Candidate Checks 43868863235 FAIL | Bloqueado por quota |
| #82 QA docs | `666ea27aab8fe89e695d07380907b409c0334eee` | Validate 44019002408 FAIL | Falha herdada de build/validator |

Nenhuma dessas PRs tem review humana registrada.

### #74 Normal

- Validate e Smoke passaram no HEAD exato.
- O log do Smoke registra **19/19 checks não autenticados** e **136/136 checks autenticados**, incluindo chamada WebRTC, voz, screen-share, mesh de três participantes, teardown, rate limit de sinalização, read receipts e consumo atômico de convite.
- O step **“Verify distributed setup-invite issuance rate limit” foi SKIPPED** porque `scripts/test-setup-invite-rate-limit.mjs` não existe nesse HEAD.
- Inspeção direta de `src/server/index.template.ts` confirma que `issueSetupInvite` verifica admin e emite token, mas **não chama** `consume_upstatus_setup_invite_rate_limit`.
- O workflow Normal tem guards de branch/SHA/projeto e CLI Supabase 2.122.1, mas publica somente `upstatus`. O userscript candidato continua chamando a API beta10; portanto, esse workflow isolado não publica o runtime de API que o cliente chama.

### #75 e #76 Team Lite

- #75 é baseline histórico; seu PASS não valida o candidato atual.
- #76 contém 59 arquivos e 389 commits. O contrato de signed upload passou.
- Os 11/11 checks do mapeador HTTP isolado passaram.
- A integração real do laboratório recebeu HTTP 402 em health e em 15 verificações que deveriam retornar 401/405. Resultado: **0/16 checks não autenticados aprovados**.
- O corpo da resposta confirma `exceed_edge_functions_invocations_quota`. Playwright, integração autenticada, concorrência e passos seguintes foram SKIPPED. Isso é bloqueio de infraestrutura, não prova de defeito funcional do adapter.

### #82 QA

O Validate mais recente falhou em `scripts/validate.mjs` com `production updateURL mismatch`. A inspeção do workflow de master confirma que ele continua disparando em alterações Markdown; não há `paths-ignore` para docs. O build/validator herdado tem contratos divergentes para a URL de distribuição. A #82 é documental e não introduziu código de produto.

### Candidatas relacionadas que afetam os gates

- **#131 AUTH-03 Normal:** branch `feat/normal-setup-invite-rate-limit-reconciled-20261110`, um commit e seis arquivos, Draft, sem review. Implementa a chamada da RPC de rate limit, limite de cinco convites por admin/900 segundos, falha fechada com 503/429 e preservação do papel retornado pela RPC. O Smoke 42760281798 passou em 10/11, incluindo o teste concorrente de 24 chamadas (cinco permitidas por bucket, bucket independente e reset). Porém, a base da PR é o SHA `fb878537`, quatro commits atrás do HEAD atual da #74. Não há Validate completo no HEAD da #131; precisa reconciliar/reexecutar antes de integração.
- **#85 cutover Normal:** draft antigo, Validate 42475230911 PASS, sem review. O workflow tenta publicar beta10 antes de `upstatus`, mas o build dessa branch ainda usa o tópico Realtime beta10, divergente do tópico atual dos triggers PostgreSQL (`upstatus-live-...`). Não é uma solução pronta para cherry-pick.
- **#176 migrations:** continua Draft, seis commits/seis arquivos, sem review; Validate 43936811839 FAIL em `client signed upload helper missing`. Nesta rodada revalidei seu estado e os ledgers, mas não repeti a comparação byte a byte dos quatro SQLs recuperados na rodada anterior.

## 4. Compatibilidade Normal / Team Lite e workflows

Bundles implantados revalidados:
- Normal `upstatus`: Edge v480, código 3.4.7.
- API Normal `upstatus-screen-share-3-1-1-beta10`: Edge v6, bundle interno 3.1.1-beta8.
- Team Lite `upstatus-team-lite`: Edge v15, código 3.4.30.
- Projeto de sinalização isolado: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3; nenhuma função equivalente está implantada na produção.

Os clientes instalados Normal e Team Lite continuam usando o tópico beta10, enquanto os triggers PostgreSQL publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Os candidatos #74/#76 mudam para o tópico do banco, mas o transporte autenticado continua opt-in/desligado por padrão e o endpoint server-mediated não está configurado no cliente.

Workflow Team Lite oficial:
- usa CLI `latest`;
- não fixa/verifica projeto e SHA como o workflow Normal candidato;
- executa `supabase functions deploy upstatus`, embora o slug correto seja `upstatus-team-lite`.

**Não despachar o workflow oficial Team Lite.**

## 5. Supabase: projetos, migrations, Edge Functions e logs

A organização tem dois projetos:
- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, dedicado a signaling/auth e não Full-Product TEST.

Inventário:
- Produção: **7 migrations**; branch gerenciada `main` em `MIGRATIONS_FAILED`, apesar do preview ACTIVE_HEALTHY.
- Laboratório: **39 migrations**; sem branches Supabase.
- Produção: **38 Edge Functions ACTIVE e 38/38 com `verify_jwt=false`**, incluindo runtimes `upstatus`, `upstatus-test`, beta10, Team Lite e funções antigas de teste/backup. Isso não prova que cada rota esteja sem autenticação: os handlers têm auth customizada. Porém, cada rota depende integralmente dessa validação interna e a superfície de runtimes antigos precisa de inventário.
- Laboratório: duas Edge Functions de teste.
- Não existe terceiro projeto Full-Product TEST.

Logs de produção na janela 16/11 05:30 UTC a 17/11 05:30 UTC:
- 77.925 registros `function_edge_logs`; amostras abertas confirmam HTTP 402 em `/api/chat`, `/api/status` e `/api/remote-status`.
- Último evento Edge observado: **2026-11-16 21:00:47.824 UTC**.
- PostgreSQL e PgBouncer continuaram registrando eventos até 17/11 04:34 e 05:03 UTC, respectivamente.
- Não há evento Edge posterior na janela. Isso não prova recuperação nem ausência de tráfego; a causa específica dos 402 em produção continua desconhecida.
- No laboratório, o CI #76 documenta 48 respostas 402 entre 12:37 e 12:41 UTC por `exceed_edge_functions_invocations_quota`.

## 6. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

- `realtime.messages` é particionada; a tabela-pai tem RLS true, FORCE RLS false e zero policies. Partições consultadas não têm RLS.
- Anon e authenticated têm SELECT/INSERT/UPDATE em `realtime.messages`.
- Snapshot: **106 mensagens**, todas `private=false`, no tópico `upstatus-live-...`; última mensagem em 13/11.
- Triggers do banco publicam nesse tópico; clientes implantados ainda assinam beta10.
- Os candidatos corrigem o tópico, mas não tornam o transporte privado/autenticado padrão.
- Não reproduzi inscrição externa nem injetei broadcasts/SDP/ICE. O setting de acesso público do Realtime não é exposto pelo conector.

### RLS e grants

- Produção: 10 tabelas em `public` com RLS e zero policies.
- Nove dessas tabelas concedem privilégios amplos a anon e authenticated, incluindo TRUNCATE. RLS não protege TRUNCATE.
- `storage.objects` e `realtime.messages` também concedem privilégios de cliente.
- Laboratório: tabelas públicas de produto consultadas têm RLS e zero policies, com grants diretos de anon/authenticated revogados. Isso é melhor que produção, mas não torna o laboratório Full-Product TEST.

### SECURITY DEFINER e default ACL

- Três funções de broadcast são SECURITY DEFINER, `search_path=public`, e têm EXECUTE para anon/authenticated.
- O Security Advisor as reporta como chamáveis via `/rest/v1/rpc`. O catálogo confirma os grants; as funções retornam tipo `trigger`. Não invoquei os endpoints, então a invocabilidade/impacto direto não foi reproduzido. Os grants continuam excessivos e precisam ser removidos/revisados.
- Default ACLs de produção seguem amplas para postgres e supabase_admin em public/storage e para supabase_admin em graphql/graphql_public.
- Laboratório restringiu defaults de postgres em public, mas defaults de supabase_admin em public/GraphQL e de postgres em storage ainda são amplos.

### Storage

- `chat-images`: público, 168 objetos, limite 20 MiB.
- `profile-images`: público, 20 objetos, limite 20 MiB.
- Zero policies próprias em `storage.objects`.
- Bucket público implica leitura pública por URL; não testei upload anônimo e não afirmo que seja permitido. A política de privacidade dos buckets e o alinhamento dos limites continuam pendentes.

## 7. AUTH-03 e primeiro acesso

Produção:
- sem colunas `setup_token_*`;
- sem `upstatus_setup_invite_rate_limits`;
- sem RPCs `consume_upstatus_setup_invite*`;
- runtimes implantados ainda aceitam `POST /api/setup` legado sem convite;
- fallback administrativo por nomes fixos permanece;
- Normal exige senha mínima de seis caracteres; Team Lite, quatro;
- `/api/chat/clear` ainda autoriza pelo nome literal Ricardo, sem verificar papel persistido nesse handler.

Laboratório:
- possui colunas de convite, tabela de rate limit e duas RPCs AUTH-03;
- as RPCs são SECURITY INVOKER, `search_path` vazio e EXECUTE somente service_role.

A candidata #131 prova que a integração Normal com rate limit pode passar Smoke isolado em uma base anterior, mas a #74 atual não contém o harness nem a chamada de rate limit. Team Lite #76 contém a chamada, mas seu CI foi bloqueado por quota. AUTH-03 não está pronto para produção.

## 8. Issues e gates

- Issue #78: OPEN, **0/8** critérios físicos. Nenhum teste manual de reconexão sem F5 foi realizado.
- Issue #79: OPEN, **16/35** itens marcados e 19 pendentes. O comentário dedicado `<!-- UPCONTROL:QA -->` foi atualizado no lugar; permanece um único comentário QA e o comentário da Engenharia foi preservado.

Gates:
- **RT-01: BLOCKED** — tópicos instalados legados, 106 broadcasts publicamente marcados, zero policies e transporte autenticado não é default.
- **TEST-ISOLATION: BLOCKED** — somente produção e laboratório de signaling; quota do laboratório bloqueou a integração #76.
- **MIGRATION-PROVENANCE: IN PROGRESS** — quatro SQLs recuperados do ledger na rodada anterior; PR #176 continua Draft/CI FAIL; produção 7 migrations, laboratório 39, sem replay Full-Product TEST.
- **AUTH-03: IN PROGRESS** — #131 traz rate limit Normal e Smoke PASS em base anterior; #74 atual ainda não tem o harness/chamada; produção não tem schema/RPCs.
- **ACL-STORAGE: BLOCKED** — grants/default ACLs, Realtime e buckets públicos permanecem sem hardening completo.
- **RECONNECT: PENDING** — Issue #78 0/8; requer confirmação física de Ricardo no navegador sem F5.
- **HUMAN-REVIEW: PENDING** — PRs relevantes sem reviews e sem autorização explícita de release.

## 9. Próximas ações

1. Proprietário da organização deve revisar Usage/Billing e spend cap do laboratório; não presumi que seja Ricardo.
2. Diagnosticar separadamente os 402 de produção e obter telemetria Edge posterior ao último evento.
3. Reconciliar #131 com o HEAD atual da #74 e executar Validate/Smoke completo no HEAD integrado.
4. Unificar AUTH-03 entre Normal e Team Lite.
5. Corrigir workflow oficial Team Lite para slug correto, projeto/SHA fixos e CLI pinada.
6. Construir e validar sinalização server-mediated no laboratório; só depois planejar cutover coordenado e remover listeners públicos.
7. Revisar grants/default ACLs, funções SECURITY DEFINER e política/limites de Storage com plano coordenado.
8. Provisionar Full-Product TEST, validar migrations e diagnosticar `MIGRATIONS_FAILED`.
9. Executar os oito testes físicos da #78 e obter reviews/aprovação humana.

**Conclusão: NÃO LIBERAR.** CI verde em candidato isolado não comprova implantação, compatibilidade dos clientes instalados, disponibilidade do backend ou segurança de produção.
