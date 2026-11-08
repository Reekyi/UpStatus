# UpStatus — auditoria independente de qualidade
**Ciclo 11 · 2026-11-08 01:32 UTC (2026-11-07 22:32 BRT)**

Repositório: [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
Produção Supabase: `dlfvkawaiqduhlazsszm`  
Laboratório isolado: `bfpjtfqlnypisxljoxkb`

## Resumo executivo

- **Normal #74:** Validate e Signaling Smoke concluídos com SUCCESS no HEAD exato. O Smoke confirmou 134/134 checks autenticados, incluindo a nova regressão de tentativa única de sala de voz entre abas/aliases.
- **Team Lite #76:** os 108/108 checks autenticados de integração, browser/WebRTC, concorrência, rate limit, recibos e setup-invite passaram. O workflow completo terminou **FAIL** na última asserção estática: o userscript Team Lite contém uma cópia desatualizada do adapter compartilhado.
- **Novo risco de desempenho por inspeção de código:** a migration de tentativa única usa um advisory lock global por par de aliases, sem incluir a conta. Isso serializa aberturas de salas de todos os usuários; não foi feito teste de carga multi-conta.
- **Novo gap de contrato HTTP:** o Edge Function isolado v32 não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. O teste recente exercita o RPC diretamente com service_role, não o status HTTP.
- **Autorização de limpeza do chat:** Team Lite ainda verifica somente o nome Ricardo em `/api/chat/clear`; Normal exige também o papel administrativo. Os quatro runtimes centrais de produção mantêm a condição antiga.
- Produção continua com autenticação legada, broadcasts públicos, grants/default ACLs amplos e sem o novo conjunto de RPCs. Não existe projeto TEST full-product.
- Nenhuma alteração foi feita em produção, no laboratório, em branches de engenharia, PRs ou issues. A única escrita desta auditoria é este novo relatório na branch QA.

## 1. Leitura inicial e heads reais

A leitura inicial de `docs/RELEASE_READINESS.md` na branch QA foi concluída antes das demais inspeções.

- Blob SHA atual: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`
- Tamanho: 797.831 caracteres.
- O final do documento ainda contém snapshot datado de 2026-11-07 02:35:36Z; não reflete os resultados de 2026-11-08. O documento principal foi preservado, sem sobrescrita.

PR #82, branch `qa/release-readiness-2026-11-04-master`:
- HEAD antes deste relatório: `e7224e041029c18e8c2e1d0aa257a3f2fdb84759`
- Base master: `a9288ccfcb0f308d3a587bfca624418a395be07b`
- 114 commits à frente, zero atrás; 23 arquivos; aberta e Draft.

### PRs auditadas

| PR | HEAD exato | Base | Commits | Arquivos | Estado |
|---|---|---|---:|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `d6b467ff0d6bbf9c3f90e8397211cc9ec7807aa4` | master | 869 | 86 | Open / Draft |
| [#75 Baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 | 10 | Open / Draft |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `f45495fd935ee1fee10f693211f170f5c3a7d03a` | team-lite-official | 331 | 44 | Open / Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `e7224e041029c18e8c2e1d0aa257a3f2fdb84759` | master | 114 | 23 | Open / Draft |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | develop | 30 | 13 | Open / Draft |
| [#85 Updater/security](https://github.com/Reekyi/UpStatus/pull/85) | `17554523ef51bafd503e74b3f1271d55f43a6eda` | master | 21 | 7 | Open / Draft |

Todas as seis PRs permanecem abertas, Draft, sem merge e sem aprovação humana registrada. A API retornou `mergeable=true`, o que não substitui review. #76 é a continuação da baseline #75. #74 e #85 possuem arquivos sobrepostos e exigem reconciliação antes da integração.

## 2. CI e testes

### Normal #74 — aprovado

- [Validate 42433643638](https://github.com/Reekyi/UpStatus/actions/runs/42433643638): SUCCESS.
- [Signaling Smoke 42433643630](https://github.com/Reekyi/UpStatus/actions/runs/42433643630): SUCCESS.
- 134/134 checks autenticados.
- O novo teste de singleton confirmou: uma tentativa vence; segunda aba é bloqueada; cancelamento libera a conta; retry funciona e cancela corretamente.
- Browser call/voice/screen WebRTC, remote tracks, mesh de três membros, 90 aceitas + uma HTTP 429 com Retry-After 60s, concorrência de rate limit/recibos/setup-invite e cleanup passaram.

### Team Lite #76 — integração passou, workflow completo falhou

- [Candidate Checks 42433646521](https://github.com/Reekyi/UpStatus/actions/runs/42433646521): **FAIL** no HEAD exato `f45495fd935ee1fee10f693211f170f5c3a7d03a`.
- 108/108 checks autenticados de integração passaram.
- Browser call/voice/screen WebRTC, remote tracks, mesh de três membros, singleton entre abas/aliases, 90 aceitas + uma HTTP 429, Retry-After 60s, concorrência de rate limit/recibos e setup-invite passaram.
- Cleanup do workflow foi concluído.
- A falha ocorreu no passo final `Check candidate scripts and version metadata`, em `scripts/team-lite-candidate-check.mjs:259`: `Team Lite bundled adapter must match the shared tested source module`.

**Causa confirmada por comparação de fonte:**  
- `src/userscript/signaling-transport.mjs`, blob `1479dcee77fb8332fa500b0410ef46c7dd6d9a8a`, adicionou mensagem específica para `VOICE_ATTEMPT_ALREADY_ACTIVE`: “Esta conta já possui uma tentativa de sala de voz ativa em outra aba.”
- `team-lite/upstatus-team-lite.user.js`, blob `0e0660a6abc26052e67b9b1832a75fde7bc0b06e`, ainda contém o tratamento antigo genérico.
- O bundle corresponde ao módulo compartilhado depois de substituir somente esse bloco novo pela implementação antiga. Logo, não é apenas formatação ou comentário: o artefato Team Lite está desatualizado e não entrega a mensagem específica que o módulo/teste espera.
- `scripts/team-lite-candidate-check.mjs`, blob `18a56435370673980118b0a32e01192ec429481c`, detectou corretamente a divergência. **Não enfraquecer a asserção**; regenerar/alinha o artefato no branch de engenharia e repetir Candidate Checks.

### QA #82

- [Validate 42431312702](https://github.com/Reekyi/UpStatus/actions/runs/42431312702): FAIL no HEAD `e7224e0`.
- Log: `VALIDATION FAILED: production updateURL mismatch`, `scripts/validate.mjs:26`.
- Falha herdada do validador/base master; não foi introduzida pelo relatório desta auditoria. Não enfraquecer o validador.

### TEST guard #84 e Updater #85

- [#84 Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361): PASS. O workflow candidato é manual-only, faz checkout do SHA do dispatch, exige develop, usa `SUPABASE_TEST_PROJECT_ID`, rejeita produção e o laboratório, verifica organização/host e fixa Supabase CLI 2.122.1. Não houve dispatch nem deploy real.
- [#85 Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749): PASS nas regressões mockadas de updater/upload. Não é Storage E2E real.
- #75 permanece baseline histórica, sem novo CI exato nesta rodada.

## 3. Novo singleton de voice-room: migration aplicada no laboratório

Arquivos candidatos:
- `supabase/migrations/20261108010000_voice_attempt_singleton.sql`, blob `46bf6f473569d6e606a56044c9fdaf10dada0dff`.
- `supabase/test-migrations/20261108010000_voice_attempt_singleton_test.sql`, blob `76c4e9261aca945bd0ec40fd6377a95c84be486b`.

O ledger do laboratório registra:
- `20261108011520 voice_attempt_singleton_20261108`
- `20261108011524 voice_attempt_singleton_contract_test_20261108`

A função implantada no laboratório é SECURITY INVOKER, usa `search_path` vazio, nega EXECUTE a anon/authenticated e permite service_role. Os testes confirmaram o conflito entre abas/aliases.

**Risco de desempenho por inspeção:** a migration obtém o segundo advisory lock com chave `upstatus-open-voice:<par de aliases>`, sem incluir `p_user_name`. Isso serializa globalmente todas as aberturas de voice room que usam esses aliases, inclusive contas diferentes e salas independentes. O requisito é uma tentativa ativa por conta; a chave parece mais ampla que o necessário. Não houve teste de carga multi-conta. Recomenda-se chave account-scoped e regressão concorrente com usuários diferentes, sem perder o lock ordering.

**Gap HTTP:** a Edge Function isolada `upstatus-signal-test` permanece v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`. Ela deriva `sender` da sessão `x-upstatus-token` e chama o RPC com esse sender, não com identidade fornecida pelo body. Porém, seu mapeamento de erros para HTTP 409 inclui `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`, mas omite `VOICE_ATTEMPT_ALREADY_ACTIVE`; o código cai no default HTTP 500. O teste novo em `scripts/test-signaling-authenticated.mjs` usa `serviceRpc` diretamente para validar o RPC, e não verifica o status HTTP real. Adicionar o código ao mapeamento 409 e um teste HTTP que confirme status + body. Nenhum deploy da função foi feito.

## 4. Autorização de limpeza do chat

**Team Lite candidato:** `src/server/team-lite-index.template.ts`, blob `099d343d977be8f127bacb6d3988cfe90c4fc412`. A rota POST `/api/chat/clear` verifica somente `name === "Ricardo"`, depois lê e apaga todas as mensagens e remove anexos do bucket `chat-images`. Não chama `admin(name)`.

**Normal candidato:** `src/server/index.template.ts`, blob `c7de6c4b8677fd829f512b224db3157e506cf2ad`. Exige nome Ricardo **e** `await admin(name)`, que verifica o papel armazenado.

O checker Team Lite, blob `18a56435370673980118b0a32e01192ec429481c`, não possui asserção para `/api/chat/clear`; isso explica por que o passo estático passou antes da falha do adapter.

Produção foi inspecionada diretamente:
- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`
- `upstatus-test` v281, SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`
- `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`
- `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`

Os quatro runtimes ainda usam nome Ricardo na limpeza global. Também usam fallback `name === "Ricardo" || await admin(name)` no delete individual, e os quatro ainda têm setup legado por nome; nenhum contém `consume_upstatus_setup_invite`.

O risco não é acesso anônimo: exige sessão válida da conta Ricardo. O defeito é a autorização sobreviver ao rebaixamento/revogação do papel. Corrigir o Team Lite, alinhar a interface, adicionar teste negativo (Ricardo não-admin => 403 e zero exclusões) e positivo (admin => autorizado). Não executar essas rotas destrutivas na auditoria.

## 5. Supabase — estado atual

### Projetos e migrations

| Ambiente | Ref | Estado | PostgreSQL | Migrations | Edge Functions |
|---|---|---|---|---:|---:|
| Produção | `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 | 38 |
| Laboratório isolado | `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 36 | 2 |
| TEST full-product | — | Não existe | — | — | — |

Produção não possui as RPCs/tabelas de setup-invite, signaling rate limit, recibos atômicos ou singleton de voice attempt. Consulta catalog-only confirmou todos ausentes. O laboratório possui setup-invite, signaling rate limit, recibos atômicos e singleton; ainda não possui rate limiter específico de login/setup.

Produção tem 5 usuários, 3 administradores explícitos, zero senha vazia e zero papel vazio.

### Edge Functions

Produção: 38 ACTIVE, todas com `verify_jwt=false`; 36 nomes contêm test/beta/backup. Isso não prova ausência de autenticação customizada: os runtimes UpStatus validam sessão própria. É necessário inventário individual de consumidores e rotas antes de desativar qualquer função antiga.

### RLS, grants, SECURITY DEFINER e default ACLs

Security Advisor:
- Produção: 6 WARN (3 anon + 3 authenticated) e 10 INFO de RLS.
- Laboratório: 0 WARN e 17 INFO.

Produção:
- Três broadcasts SECURITY DEFINER com `search_path=public`, EXECUTE para anon/authenticated e canais `private=false`.
- `upstatus_broadcast_messages()` envia OLD/NEW completo via `to_jsonb`.
- Dez tabelas public com RLS e zero policies; nove têm grants amplos para anon/authenticated, incluindo TRUNCATE. `upstatus_visual_config` não tem esses grants.
- `realtime.messages`: RLS ligado, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- Default ACLs amplos de postgres em public/storage e supabase_admin em public/graphql/graphql_public, incluindo grants de tabelas, funções e sequences para anon/authenticated.

Laboratório:
- Broadcasts com search_path vazio, EXECUTE negado a anon/authenticated, permitido a service_role e payload reduzido a `{op}`.
- Ainda usam `private=false`.
- Default ACLs amplos persistem para supabase_admin em public/graphql/graphql_public e postgres em storage.
- ACL-02 permanece sem resolução administrativa; não alterar defaults por esta auditoria.

### Realtime e Storage

- Produção: 7 partições de `realtime.messages`, 50 linhas.
- Laboratório: zero partições e zero linhas. A configuração de trigger foi inspecionada, mas entrega por Realtime/WebSocket não está comprovada no laboratório.
- Buckets de produção `chat-images` e `profile-images` são públicos, limite 20 MiB. Upload assinado #85 passou com mocks; não houve upload real. Upload assinado protege escrita, não leitura.
- `signaling_transport_enabled` continua false por padrão nos dois clientes; o caminho padrão permanece no Realtime legado.

### Fixtures pós-CI

Consulta SELECT-only no laboratório encontrou zero registros em users de teste, sessions, messages, rooms, memberships, bindings, events, rate-limit buckets, call attempts, voice attempts e chat reads. `realtime.messages` continua com zero partições/linhas. O cleanup foi feito pelo workflow; QA não limpou manualmente.

## 6. Pipeline TEST e branches

Workflow ativo em develop:
- `.github/workflows/deploy-test.yml`, blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`.
- Push automático em develop e workflow_dispatch.
- Secret compartilhado `SUPABASE_PROJECT_ID`, CLI `latest`, deploy de `upstatus-test`.
- Sem verificação da identidade do projeto de destino.

#84 substitui por manual-only, checkout do SHA do dispatch, validação de develop, variável dedicada `SUPABASE_TEST_PROJECT_ID`, rejeição de produção/laboratório, preflight de organização/host e CLI 2.122.1. Está Draft e não foi integrado. Não houve dispatch ou deploy real.

A organização ainda não tem projeto TEST full-product; o workflow antigo não deve ser executado. A leitura de branch protection/rulesets foi bloqueada pela API GitHub com HTTP 403; estado de proteção de branches não pôde ser confirmado nesta rodada.

## 7. Issues e aceitação manual

- [#78 Reconexão](https://github.com/Reekyi/UpStatus/issues/78): continua 0/8 critérios físicos. Faltam queda real de rede, retorno sem F5, reentrada, chamadas, microfone/display permission reais e interoperabilidade instalada Normal ↔ Team Lite.
- [#79 Release](https://github.com/Reekyi/UpStatus/issues/79): aberta, 99 comentários. O comentário mais recente ainda descreve Team Lite #76 como em andamento; o run 42433646521 já terminou FAIL no checker estático. Corpo/comentário precisam ser reconciliados. QA não alterou issues.

Nenhum teste físico Tampermonkey foi executado nesta rodada.

## 8. Próximos gates

1. Corrigir a autorização de `/api/chat/clear` no Team Lite e cobrir admin/não-admin.
2. Regenerar/alinha o userscript Team Lite com `src/userscript/signaling-transport.mjs`; manter a asserção de paridade.
3. Mapear `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409 na Edge Function e adicionar teste HTTP real.
4. Rever o advisory lock global; torná-lo account-scoped e testar concorrência de contas diferentes.
5. Integrar a proteção do deploy TEST e provisionar TEST full-product, incluindo runtime Team Lite e Realtime/Storage reais.
6. Implementar AUTH-02 e migrar setup legado/autorizações por nome na produção.
7. Migrar broadcasts para autorização privada e comprovar entrega real.
8. Resolver grants e default ACLs com privilégio administrativo e plano de rollback.
9. Decidir leitura pública/privada de anexos e validar upload/download real, inclusive áudio.
10. Completar #78, reconciliar #79 e obter reviews humanas.

## 9. Limites de execução e segurança

- SQL executado: somente SELECT.
- Nenhuma migration/DDL aplicada pela auditoria.
- Nenhum deploy, merge, release ou publicação de userscript.
- Nenhum secret/token lido.
- Nenhuma alteração de roles, grants, policies, ACLs, flags ou fixtures.
- Nenhum workflow iniciado ou repetido manualmente.
- Nenhuma branch de engenharia ou issue alterada.
- Única escrita: este novo arquivo na branch QA dedicada.

**Veredito:** Normal aprovado no CI do HEAD atual. Team Lite teve integração/browser aprovados, mas o workflow completo falhou por drift real do bundle. Release permanece bloqueado por autorização de chat, pipeline/ambiente TEST, autenticação legada e Realtime público. Sem percentual de progresso inventado.
