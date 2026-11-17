# UpStatus — auditoria independente de QA

**Data:** 2026-11-09 18:29 UTC (15:29 BRT)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA antes deste relatório:** `0944e61058148b0dbed028c803eefa85478aa88f`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório:** `bfpjtfqlnypisxljoxkb`

## Escopo e método

UpStatus é um userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly. Foram reconsultados `docs/RELEASE_READINESS.md`, heads e PRs #74, #75, #76, #82 e #129, PRs auxiliares #125, #127 e #128, Issues #78/#79, checks existentes, artefatos e templates Normal/Team Lite, inventário Edge Functions, migrations, advisors e catálogos PostgreSQL.

O arquivo `docs/RELEASE_READINESS.md` foi lido integralmente pela API de conteúdo do GitHub: blob SHA `7cfbd70886df42ce790c078c224b19284a632595`, aproximadamente 1.045.105 caracteres. É um checkpoint append-only com snapshots históricos; os dados abaixo foram revalidados contra refs e runtimes atuais, sem tratar tabelas antigas como estado presente.

Nenhum workflow foi iniciado ou repetido. Não houve checkout/build/teste local, exploração, teste físico, escrita SQL, fixture, migration, deploy, merge, release, publicação de userscript ou alteração de configuração.

## Refs e PRs

- QA / PR #82: `0944e61058148b0dbed028c803eefa85478aa88f`.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA está 167 commits à frente e 1 atrás de master; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- #74 Normal: `9c0133e8cf6bd85ac8993888718a408db2f24a3e`, Open/Draft.
- #75 Team Lite baseline: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, Open/Draft.
- #76 Team Lite: `eb28e88325d7e8a6236d9050bebabf794d64a8c4`, Open/Draft; 305 commits à frente da baseline #75.
- #82 QA: Open/Draft.
- #129 desativação do dispatcher legado Team Lite: `886d364d0c43af0d8aed867bf04c407478af5e8f`, Open/Draft.

### CI existente, por SHA exato

| PR / commit | Evidência | Classificação |
|---|---|---|
| #74 | Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) e Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS | AUTOMATED PASS |
| #75 | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | AUTOMATED PASS histórico; baseline superada |
| #76 | Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS | AUTOMATED PASS |
| #82 | Validate [42665141956](https://github.com/Reekyi/UpStatus/actions/runs/42665141956) FAILURE | AUTOMATED FAIL: contrato `production updateURL mismatch` em `scripts/validate.mjs:26` |
| #129 | Offline guard PR [42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) e push [42670881277](https://github.com/Reekyi/UpStatus/actions/runs/42670881277) SUCCESS | AUTOMATED PASS isolado |
| #125 | Offline guard [42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306) SUCCESS; deploy SKIPPED; Validate [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) FAILURE | PASS parcial; não é deploy |
| #127 | Migration provenance [42615130073](https://github.com/Reekyi/UpStatus/actions/runs/42615130073) SUCCESS | PASS offline; não recupera SQLs ausentes |
| #128 | Review provenance [42614800302](https://github.com/Reekyi/UpStatus/actions/runs/42614800302) SUCCESS | PASS offline; não é aprovação humana |

As verificações de #74/#76 cobrem fluxos automatizados de API, WebRTC, sala/voz/tela, mesh, rate limit e cleanup no laboratório. Não substituem aceite em navegador instalado. #75 é somente baseline histórica. As listas de reviews consultadas para #74, #75, #76, #82, #127, #128 e #129 retornaram vazias.

## Achados de código e compatibilidade

### RT-01 — Realtime público e divergência de tópico

**BLOCKED / CODE INSPECTION + catálogo de produção.**

- Produção contém 39 mensagens Realtime observadas, 39 com `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- `upstatus_broadcast_messages()` envia `to_jsonb(OLD/NEW)` em `db_change`, incluindo o registro completo; `upstatus_broadcast_remote_state()` publica metadados de comandos/resultados; `upstatus_broadcast_users()` publica estado e razão do usuário. As três são SECURITY DEFINER, `search_path=public`, retornam `trigger`, estão associadas a triggers e têm EXECUTE efetivo para anon/authenticated.
- Não executei RPC, não injetei eventos e não reproduzi assinatura externa. Os grants nas funções trigger são desnecessários, mas não alego exploração direta.
- Os templates Normal e o artefato Team Lite assinam `realtimeClient.channel(UP_REALTIME_TOPIC)` sem `private:true` ou `realtime.setAuth()`.
- `signalTransportFlag` é false por padrão em ambos; `signalTransportEndpoint` começa vazio. O caminho server-mediated é opt-in e o fallback público de call/voice/screen permanece ativo por padrão.
- Foi encontrada divergência estática de tópico: o build Normal ainda define `PROD_TOPIC=upstatus-screen-share-live-3-1-1-beta10`, enquanto os triggers atuais publicam em `upstatus-live-6f5e...`. O build Team Lite define o tópico novo, mas o artefato versionado `team-lite/upstatus-team-lite.user.js` ainda contém o tópico beta10 antigo. É preciso alinhar template, build e artefato e provar entrega/compatibilidade; não houve teste de entrega nesta execução.

### AUTH-03 — setup em produção

**BLOCKED / CODE INSPECTION.**

Os runtimes implantados Normal v480 e Team Lite v15 ainda encaminham `POST /api/setup` para `login(req,true)`. O login verifica se a conta existe e se ainda não tem hash, então atualiza a senha diretamente. Não exige convite/token, não consome autorização atomicamente e mantém fallback de administrador por nome (`Ricardo`, `Lohan`, `Guilherme`). A senha mínima diverge: Normal 6 caracteres; Team Lite 4.

Os templates candidatos #74/#76 usam token de convite de uso único e RPC `consume_upstatus_setup_invite`. A RPC não existe em produção; no laboratório ela é SECURITY INVOKER, search_path vazio e EXECUTE somente service_role. Não encontrei rate limit dedicado a login/setup/emissão de convite nos fluxos candidatos inspecionados. Os limites de sinalização não equivalem a proteção de onboarding.

### ACL, Storage e SECURITY DEFINER

**BLOCKED / catálogo e Security Advisor.**

- 10 tabelas públicas com RLS habilitado e sem policies.
- 9 tabelas públicas com grants diretos a anon/authenticated, incluindo TRUNCATE. RLS sem policies impede acesso por policy, mas não remove o privilégio TRUNCATE.
- 24 entradas em `pg_default_acl`, incluindo defaults amplos em public/storage/GraphQL.
- `storage.objects`: zero policies e grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
- Buckets `chat-images` e `profile-images` públicos, limite de 20 MiB cada.
- Security Advisor: 10 INFO de RLS sem policy e 3 WARN para EXECUTE de SECURITY DEFINER por anon + 3 WARN por authenticated. Performance Advisor sem achados.

### Upload — P2

Os runtimes implantados e templates candidatos ainda têm `sniffMime()` com fallback `return declared` para assinatura não reconhecida. `signedUploadRoute()` valida MIME e tamanho declarados pelo cliente e emite signed URL; não inspeciona os bytes que serão enviados antes de permitir publicação. A validação existente não prova conteúdo real. Não houve upload de teste.

### Migrations e Edge Functions

- Produção está ACTIVE_HEALTHY; inventário contém 7 migrations remotas.
- Em `master`, só os três SQLs originais iniciais existem. Estes quatro continuam ausentes: `20261023154754_create_upstatus_visual_config.sql`, `20261026195855_add_chat_message_file_name.sql`, `20261027154329_allow_chat_document_mime_types.sql`, `20261027155438_set_upstatus_upload_limits_20mb.sql`.
- A branch Supabase `main` está `MIGRATIONS_FAILED`. Não reconstruir SQL a partir do schema atual.
- Produção lista 38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Isso não prova ausência de autenticação: os runtimes centrais usam token de sessão próprio. Normal `upstatus` v480 SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; Team Lite v15 SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; beta10 v6 SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

### Dispatcher de produção Team Lite

A branch oficial `team-lite-official` ainda contém `.github/workflows/deploy-production.yml` com secrets de produção, CLI `latest` e comando `supabase functions deploy upstatus` (slug Normal). A Draft #129 remove credenciais/comando e falha fechado; seus testes offline passaram nos eventos push e pull_request, mas a PR ainda não foi integrada. Não despachar o workflow antigo.

Achado adicional de governança: os endpoints de branch do GitHub retornaram `protected=false` para `master` e `team-lite-official`; a consulta de rulesets retornou lista vazia. Não há evidência de required checks/reviews aplicados por proteção de branch nessas refs.

## Laboratório e testes manuais

O laboratório `bfpjtfqlnypisxljoxkb` está ACTIVE_HEALTHY, com 38 migrations e duas Edge Functions. Consultas SELECT-only encontraram 17 tabelas públicas com RLS/sem policies e zero grants diretos para anon/authenticated; zero usuários, mensagens, sessões, mensagens Realtime e buckets Storage. A RPC de convite existe apenas nesse projeto e está limitada a service_role. **TEST-ISOLATION: DONE** para o ambiente isolado, sem afirmar que o produto está aceito.

A Issue #78 segue aberta com os oito critérios desmarcados. O próprio contexto descreve falha de reentrada na sala após queda de internet de aproximadamente 10 segundos sem F5. Nenhum teste físico foi executado nesta rodada. **RECONNECT: MANUAL PENDING**.

## Gates

- RT-01: BLOCKED.
- TEST-ISOLATION: DONE.
- MIGRATION-PROVENANCE: BLOCKED.
- AUTH-03: BLOCKED.
- ACL-STORAGE: BLOCKED.
- RECONNECT: PENDING.
- HUMAN-REVIEW: PENDING; reviews consultadas vazias e sem autorização explícita de release.

## Próximos passos

1. Integrar e revisar a desativação do dispatcher legado Team Lite antes de qualquer dispatch; corrigir branch protection/review requirements.
2. Alinhar tópico Realtime, artefatos Normal/Team Lite e transporte autenticado; migrar payloads sensíveis para canal privado autorizado ou substituto server-mediated e provar o cutover.
3. Aplicar correção de AUTH-03 somente após migração revisada e validação isolada, incluindo rate limit específico.
4. Recuperar os quatro SQLs originais de fonte confiável e fechar proveniência antes de qualquer preflight.
5. Revisar grants, Default ACLs, Storage e validação de bytes em ambiente isolado.
6. Executar os oito critérios físicos da #78 e obter reviews humanas no SHA exato antes de considerar autorização de release.

**Veredito: NÃO LIBERAR.** CI de candidatos aprovado não elimina os bloqueadores de segurança, migração, deploy, compatibilidade Realtime e aceite manual.
