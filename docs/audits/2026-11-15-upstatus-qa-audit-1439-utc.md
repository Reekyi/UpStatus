# Auditoria independente de qualidade — UpStatus

**Execução:** 2026-11-15 14:39:30 UTC  
**Projeto:** `Reekyi/UpStatus`  
**QA:** `qa/release-readiness-2026-11-04-master`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## 1. Método e integridade

- Leitura de `docs/RELEASE_READINESS.md` na branch QA: 8.423 linhas; o último checkpoint interno do documento é 2026-11-15 06:30 UTC.
- Heads conferidos:
  - `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`
  - `develop`: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`
  - `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
  - QA antes deste relatório: `152722339223804258d49c458c0d4986659ed077`
- QA vs master: 339 commits à frente e 1 atrás. O commit exclusivo de master é documental; não fiz rebase nem incorporei mudanças concorrentes.
- Rulesets do repositório: lista vazia. Branch API confirmou `protected=false` em master, develop e team-lite-official. A proteção clássica da branch QA com nome contendo barra não foi confirmada.
- PRs e Issues foram consultadas sem escrita. A única escrita desta execução é este arquivo novo na branch QA e a atualização do comentário QA existente na Issue #79.

## 2. PRs obrigatórias e CI

Resultados conferidos nos HEADs exatos:

| PR | HEAD | CI observado |
|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Validate e Signaling Smoke SUCCESS |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks SUCCESS histórico |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Candidate Checks SUCCESS |
| #82 QA | `152722339223804258d49c458c0d4986659ed077` | Validate FAILURE |

Evidências:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- #75 histórico: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43720048833

O #82 falha em `production updateURL mismatch`, em `scripts/validate.mjs:26`. O log do job mostra build Normal/TEST 3.4.7 e falha no assert do updateURL. Não enfraqueci o validator nem iniciei rerun.

### Candidatas posteriores relevantes

| PR | HEAD | Check exato observado | Leitura QA |
|---|---|---|---|
| #160 | `d36eae7c78de74bd9938fd38d558752f0bf214cb` | Smoke SUCCESS | Predecessora; não tem Validate no SHA consultado |
| #161 | `557814dc31bed779b84a2094358dc6b2a7e67689` | Validate + Smoke SUCCESS | Candidata Normal mais completa para cutover/API e rate limit de convites |
| #163 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` | Validate + HTTP 409 contract SUCCESS | Candidato mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para 409 |
| #164 | `a27ced56564f3d18948c70138f6d6b2a1f2d0907` | Validate SUCCESS | Upload assinado/avatar; sem upload físico |
| #165 | `434478771dca54505d3ec8b0cea0ada57d8d6dca` | Voice contract guard SUCCESS | Check focado, não é Validate completo |
| #166 | `e90e0dbbc0c6d89d77ea359dff0f1e82b4428413` | Team Lite source guard SUCCESS | Check focado, não é suíte completa |
| #167 | `d100b0820dd7f98e2b78a98e6b6f8c09f13b1867` | Validate SUCCESS | Candidato de updater/anexos; não integrado |

Logs de #161:
- Validate: https://github.com/Reekyi/UpStatus/actions/runs/43479685384
- Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43479685445

O Smoke #161 confirmou 136/136 verificações autenticadas, 19/19 não autenticadas e teste concorrente do rate limit de convites no projeto isolado: 5 de 24 requisições permitidas e 19 rejeitadas, com isolamento por administrador e limpeza dos fixtures. A migration `20261109230000_setup_invite_rate_limit.sql` e a chamada à RPC existem na candidata, mas **não estão aplicadas em produção**. #161 também alinha o alvo de API Normal de beta10 para a função `upstatus`, coordenando a distribuição com o runtime.

#163 corrige o contrato HTTP 409 no candidato. A função atualmente implantada no laboratório, `upstatus-signal-test` v32, ainda não contém `VOICE_ATTEMPT_ALREADY_ACTIVE` nem o mapeamento 409. O teste candidato não prova que o runtime implantado recebeu a correção.

#165/#166 removem a marca `_authenticatedTransport` controlável pelo payload e passam a origem autenticada fora do payload. É melhoria real, mas os clientes ainda mantêm descoberta pública e o transporte autenticado continua opt-in; isso não fecha RT-01.

Todas as PRs #74/#75/#76/#82 e as candidatas #160–#167 continuam abertas/Draft, sem reviews humanas submetidas.

## 3. Supabase: disponibilidade e logs

Ambos os projetos reportam `ACTIVE_HEALTHY`:
- Produção: PostgreSQL 17.11.0.002, região us-west-2.
- Laboratório: PostgreSQL 17.11.0.003, região sa-east-1.

Janela consultada: 2026-11-14 14:31:44 UTC até 2026-11-15 14:31:44 UTC.

| Projeto | Fonte | HTTP 402 |
|---|---|---:|
| Produção | function_edge_logs | 88 |
| Produção | edge_logs (gateway) | 6 |
| Laboratório | function_edge_logs | 19 |

Total: 94 em produção e 19 no laboratório. A última ocorrência em produção foi 2026-11-14 20:57:39 UTC; a última no laboratório, 17:10:45 UTC. Os últimos registros de Edge no período são 402; não há evidência de recuperação no recorte. Um dos registros de produção é uma requisição de navegador no Brasil para `/api/chat` com 402; também há 402 nos downloads Normal e Team Lite.

**Causa não comprovada.** Não atribuir a billing, quota ou plano sem Usage/Billing e diagnóstico do provedor. Não há evidência de que os serviços estejam indisponíveis neste exato momento; há evidência de falhas e ausência de recuperação observável nos logs consultados.

## 4. Runtimes instalados e compatibilidade

Management API e bundles embutidos conferidos:

| Função | Versão Edge | Userscript | Observação |
|---|---:|---:|---|
| `upstatus` | v480 | 3.4.7 Normal | Distribui Normal; API embutida aponta para beta10 |
| `upstatus-team-lite` | v15 | 3.4.30 Team Lite | API aponta para a própria função; updater aponta para branch GitHub mutável |
| `upstatus-screen-share-3-1-1-beta10` | v6 | 3.1.1-beta8 embutido | API Normal legado ainda usado pelo Normal |
| `upstatus-test` | v281 | 3.3.28 | Endpoint histórico ativo em produção |

Os bundles Normal e Team Lite não contêm `private:true` nem `realtime.setAuth()`; ambos assinam o tópico público `upstatus-screen-share-live-3-1-1-beta10`. Ambos mantêm listeners públicos de call/voice/screen. O updater Team Lite usa a branch `team-lite-official`, que a Branch API reporta sem proteção.

Os runtimes Normal, Team Lite e TEST ainda expõem `/api/account?name=` sem autenticação, permitem primeiro setup por `POST /api/setup` sem convite e autorizam `/api/chat/clear` somente pelo nome Ricardo, sem exigir o papel administrativo persistido. Os candidatos #161 e as linhas empilhadas melhoram esse desenho, mas não estão nos runtimes implantados.

A função Normal implantada ainda usa beta10, enquanto a candidata #161 muda o alvo para `upstatus`; esse cutover precisa ser coordenado com o deploy da função e do userscript. O workflow oficial Team Lite ainda publica o slug Normal (`upstatus`) em vez de `upstatus-team-lite`. O workflow TEST em develop usa um secret de projeto sem comparação explícita com o ID fixo do laboratório. Não executei workflows.

## 5. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- 10 tabelas public com RLS habilitado e sem policies.
- 126 grants diretos em tabelas public, distribuídos por 9 tabelas e anon/authenticated; 18 grants TRUNCATE.
- 24 registros de default ACL; a inspeção mostrou defaults com privilégios de anon/authenticated em public e storage.
- Três funções SECURITY DEFINER: `upstatus_broadcast_messages`, `upstatus_broadcast_users`, `upstatus_broadcast_remote_state`. Todas com `search_path=public` e EXECUTE para anon/authenticated/service_role. O Advisor reporta 3 WARN anon + 3 WARN authenticated.
- `realtime.messages`: 106 mensagens nos últimos 14 dias, todas `private=false`; RLS sem policies e grants SELECT/INSERT/UPDATE para anon/authenticated. O trigger de mensagens publica OLD/NEW completos por `to_jsonb`.
- Storage: buckets `chat-images` (168 objetos) e `profile-images` (20 objetos), ambos públicos, limite de 20 MiB, zero policies em `storage.objects`. Há grants de clientes no schema storage.

### Laboratório

- 18 tabelas public com RLS e sem policies, mas zero grants diretos de anon/authenticated nas tabelas public.
- 25 registros de default ACL; ainda existem entradas de privilégios para clientes que precisam de revisão por schema/owner.
- As três funções SECURITY DEFINER de broadcast têm search_path vazio e EXECUTE somente para service_role.
- Nenhuma mensagem Realtime, nenhum bucket e nenhum objeto Storage.
- Security Advisor: 18 INFO de RLS sem policy, zero WARN. Performance Advisor: cinco INFO de índices não utilizados. Health Advisor: nenhum lint nos dois projetos.

A ausência de policies em tabelas backend-owned não prova, isoladamente, acesso efetivo aos dados; entretanto, os grants atuais são excessivos e TRUNCATE não é protegido por RLS.

## 6. Edge Functions e migrations

Produção possui 38 Edge Functions ACTIVE; laboratório possui duas. Todas reportam `verify_jwt=false` no nível da plataforma; isso não prova ausência de autenticação, pois os handlers principais usam sessão/token próprios. A produção mantém 35 funções históricas test/beta/backup além dos três endpoints de produto (Normal delivery, Normal beta10 e Team Lite), incluindo `upstatus-test` v281.

Migrations:
- Produção: 7 versões no ledger.
- Laboratório: 39 versões.
- A branch gerenciada Supabase `main` da produção continua `MIGRATIONS_FAILED`, apesar do preview `ACTIVE_HEALTHY`.

Confirmei 404 em master e QA para os quatro SQLs que aparecem no ledger de produção:
1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

A produção não possui `public.upstatus_setup_invite_rate_limits`, `consume_upstatus_setup_invite_rate_limit` nem `consume_upstatus_setup_invite`. A candidata #161 inclui a migration de rate limit, mas ela não foi aplicada em produção.

O laboratório está vazio: zero users, messages, sessions, signal rooms, memberships, events, call attempts, voice attempts, rate-limit rows, objetos Storage e mensagens Realtime. É um ambiente de sinalização/autenticação, não Full-Product TEST.

## 7. Issues e teste manual

- Issue #78 permanece OPEN, 0/8 critérios físicos: reconexão Normal/Team Lite sem F5, reentrada, chamadas, áudio sem duplicação, interoperabilidade e teste manual.
- Issue #79 permanece OPEN, 16 itens marcados e 19 pendentes.
- Não existe checkout local em `/workspace`, `/workspaces`, `/repo` ou `/app`; `/mnt/data` está vazio. Não havia navegador Tampermonkey nem dispositivos reais.
- Nenhum teste manual foi executado. CI e inspeção de código não foram apresentados como teste físico.

## 8. Gates

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | blocked | Bundles implantados públicos; 106 mensagens private=false |
| TEST-ISOLATION | blocked | Laboratório sem fixtures de produto |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs 404 em master e QA |
| AUTH-03 | blocked | Produção sem tabela/RPC; candidata #161 passa CI isolado |
| ACL-STORAGE | blocked | Grants/default ACLs, buckets públicos e zero policies |
| RECONNECT | pending | Issue #78 sem testes físicos |
| HUMAN-REVIEW | pending | PRs abertas/Draft, sem review humana ou autorização |

## 9. Prioridades

1. Diagnosticar os HTTP 402 e comprovar recuperação.
2. Integrar e revisar #74/#161/#163 e as candidatas de upload/updater; não tratar checks focados como Validate completo.
3. Coordenar o cutover Normal para a função `upstatus` com versão, updateURL, backend e migration revisados.
4. Corrigir workflow Team Lite (slug, projeto fixo, SHA exato, CLI pinada) e workflow TEST (projeto fixo do laboratório).
5. Implementar Realtime privado/autorizado como padrão e retirar payloads públicos autoritativos; os hints públicos restantes precisam ser estritamente não autoritativos.
6. Aplicar AUTH-03 somente após review e autorização; validar no runtime real.
7. Revisar RLS, grants, default ACLs, SECURITY DEFINER e Storage com owner autorizado.
8. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
9. Provisionar Full-Product TEST, executar testes físicos da #78 e obter aprovação humana.

**Integridade:** produção e laboratório foram inspecionados somente por consultas SELECT/catalog/logs. Não houve migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. Nenhum workflow foi iniciado pela auditoria.
