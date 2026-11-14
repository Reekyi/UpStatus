# Auditoria independente UpStatus — 2026-11-11 04:40 UTC

## Escopo e método

Auditoria read-only do GitHub `Reekyi/UpStatus` e dos projetos Supabase de produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.

Foram consultados heads, PRs, issues, workflows e logs existentes; o documento `docs/RELEASE_READINESS.md` foi recuperado integralmente pelo blob da branch QA. Foram feitas inspeções estáticas das Edge Functions implantadas e consultas SQL exclusivamente SELECT/catálogo. Nenhum teste manual, navegador real, requisição externa de exploração ou workflow foi iniciado pela QA.

Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva foi realizada.

## Heads e integridade documental

- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA `qa/release-readiness-2026-11-04-master`: `877a98e8d568ab1e4307f5f5f0ec382551dff5ae`.
- Comparação QA contra master: 210 commits à frente e 1 atrás; não foi feito rebase.
- `docs/RELEASE_READINESS.md`: blob `7cfbd70886df42ce790c078c224b19284a632595`, 1.045.105 caracteres e 8.410 linhas. A leitura integral confirmou que a última seção do documento principal é de 2026-11-08 15:30 BRT / 18:30 UTC. Os relatórios mais recentes estão em arquivos separados em `docs/audits/`.

## PRs prioritárias e CI nos HEADs exatos

| PR | HEAD | Situação | Evidência |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Open/Draft; Validate e Signaling Smoke SUCCESS | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open/Draft; PASS histórico limitado, não é a candidata atual | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | Open/Draft; Candidate Checks SUCCESS | [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) |
| #82 QA | `877a98e8d568ab1e4307f5f5f0ec382551dff5ae` | Open/Draft; Validate FAILURE herdado | [Validate 42954651032](https://github.com/Reekyi/UpStatus/actions/runs/42954651032) |
| #143 dispatcher Normal | `736679a9033702c5d5af0e0aae9fb7eea5b20fbe` | Open/Draft, empilhada sobre #142; guard e Validate passaram em push | [Workflow 42957054454](https://github.com/Reekyi/UpStatus/actions/runs/42957054454) |

As PRs #74, #75, #76, #82 e #143 não possuem reviews humanas registradas. #143 tem base `fix/normal-beta10-api-parity-20261111`, portanto é uma PR empilhada, não uma integração direta em master.

### QA #82

O job exato do HEAD `877a98e` falhou em `scripts/validate.mjs:26`: o build gera Normal/TEST 3.4.7 e o validator retorna `production updateURL mismatch`. Não foi alterado nem enfraquecido o validator.

## PR #143 — correção da falha anterior do dispatcher

A QA revalidou o novo helper e workflow no HEAD `736679a`.

Correções confirmadas:
- Os checks obrigatórios são explicitamente `offline_guard` e `validate`.
- Ambos precisam estar concluídos com sucesso no SHA exato de release/publicação.
- Checks de outro SHA, ausentes, falhos, em andamento ou skipped fora da allowlist são rejeitados.
- Somente os jobs opcionais `deploy` e `Supabase Preview` podem ser skipped.
- O workflow executa o guard em push para master e em PR direcionada a master.
- O workflow publica beta10 antes de `upstatus`, usa Supabase CLI 2.122.1, exige confirmação manual, revisão allowlisted, projeto/organização exatos e preflight read-only.
- O teste offline cobre checks skipped indevidos, check obrigatório ausente/skipped, SHA incorreto, failure, in-progress e histórico truncado.

O workflow 42957054454 foi evento `push`: `offline_guard` SUCCESS e `deploy` SKIPPED. Isso é CI da candidata, não execução de deploy. Como a PR #143 está empilhada sobre #142, não recebeu evento PR dirigido a master neste HEAD.

Limitações que permanecem:
1. A configuração real de required reviewers do GitHub Environment `production` não pôde ser verificada pela API disponível.
2. As variáveis `UPSTATUS_NORMAL_RELEASE_GATES_ACKNOWLEDGED` e `UPSTATUS_NORMAL_PHYSICAL_ACCEPTANCE` não são vinculadas pelo código a um SHA, timestamp ou atestado assinado de Ricardo.
3. O preflight valida nomes/versões do ledger, não bytes/checksums dos SQLs originais.
4. Não há smoke pós-deploy nem compensação automática se a primeira função for publicada e a segunda falhar.
5. O dispatcher publica somente beta10 e `upstatus`; não inclui o runtime server-mediated `upstatus-signal`.
6. `release.json` em master continua 3.4.7; release exige versão estável superior à versão atual.

A correção da brecha de checks reportada na rodada anterior está **resolvida no código candidato e no CI offline**, mas o gate de release continua bloqueado por pré-condições de produção e aprovação.

## Supabase — produção

Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002. A branch gerenciada `main` continua `MIGRATIONS_FAILED`.

### Migrations e proveniência

- O ledger de produção contém sete migrations.
- O diretório `supabase/migrations` em master contém somente os três SQLs iniciais: `20261005160000_upstatus_cloud.sql`, `20261005173000_remote_realtime.sql`, `20261005180000_client_presence.sql`.
- Os quatro SQLs do ledger de produção abaixo não estão no diretório de master:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

O ledger comprova nomes/versões aplicados, não a recuperação byte a byte dos arquivos. O preflight #143 falhará enquanto a branch `main` permanecer `MIGRATIONS_FAILED`.

### Edge Functions

Produção tem 38 funções ACTIVE. Versões operacionais revalidadas:
- `upstatus` v480.
- `upstatus-team-lite` v15.
- `upstatus-screen-share-3-1-1-beta10` v6.
- `upstatus-test` v281.

Não existe `upstatus-signal` na produção. Todas as 38 funções reportam `verify_jwt=false` no metadata; isso não prova ausência de autenticação de aplicação. Foram inspecionados os três runtimes principais, não foi concluído inventário rota-a-rota das 38 funções.

### AUTH-03 e primeiro acesso

SELECT-only confirmou que produção não tem colunas `setup_token_*`, tabelas de rate limit de convite/sinalização nem as duas RPCs de consumo correspondentes. O laboratório possui quatro colunas, duas tabelas e duas RPCs.

O código implantado ainda roteia `POST /api/setup` para o fluxo de setup sem token de convite; o fallback de papel administrativo usa uma allowlist nominal. O endpoint de limpeza global do chat ainda compara literalmente o nome Ricardo, mesmo havendo helper de papel administrativo em outras rotas. Normal exige senha mínima de seis caracteres; Team Lite aceita quatro.

### Chat e anexos

A tabela `messages` contém 279 linhas; há cinco mensagens do tipo document e nenhuma tem `file_name` preenchido. Os runtimes implantados não contêm persistência de `file_name`. Correção candidata está em #142, ainda não integrada/implantada.

Correção de precisão em relação a uma auditoria anterior: os runtimes implantados **já possuem rotas de signed upload**. O que permanece pendente é o contrato completo de persistência do nome, a autorização administrativa consistente e validação dos bytes reais no caminho assinado. Não foi feito upload real.

### Realtime, RLS, grants e SECURITY DEFINER

- `realtime.messages`: 67 eventos persistidos, todos `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os três triggers `upstatus_broadcast_messages/users/remote_state` publicam no tópico legado; a última inspeção dos bundles Normal/Team Lite confirmou que os clientes assinavam o tópico beta10 diferente. As versões implantadas permanecem v480/v15, sem atualização desde aquela inspeção.
- O trigger de mensagens envia a linha OLD/NEW completa com `to_jsonb`. Os broadcasts usam `private=false`.
- Papéis anon e authenticated têm SELECT/INSERT/UPDATE em `realtime.messages`.
- Dez tabelas públicas têm RLS e zero policies. Nove concedem a anon e authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. RLS não protege TRUNCATE; nenhuma operação destrutiva foi tentada.
- As três funções de broadcast são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE para anon/authenticated/service_role. O Security Advisor reporta três WARN para cada papel cliente. Como o retorno é trigger, a QA não fez requisição RPC nem afirma exploração direta; o grant é desnecessário e o payload público é o risco concreto.
- Default ACLs somam 120 entradas para papéis clientes distribuídas entre objetos de postgres/supabase_admin e schemas public, storage, graphql e graphql_public.

### Storage

- `chat-images`: público, 20 MiB, allowlist inclui imagens, áudio, vídeo e documentos.
- `profile-images`: público, 20 MiB, allowlist de imagens.
- Zero policies em `storage.objects`.

## Laboratório isolado

Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, duas funções de teste (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3).

Doze tabelas consultadas por SELECT estavam zeradas: users, messages, sessions, rooms, room_members, events, bindings, signal_rate_limits, call_attempts, voice_attempts, chat_reads e setup_invite_rate_limits. `realtime.messages` tinha zero linhas e Storage tinha zero buckets. As tabelas públicas não concedem grants diretos a anon/authenticated, mas permanecem 96 entradas de Default ACL para papéis clientes em schemas de aplicação/infraestrutura.

O Advisor do laboratório apontou 18 INFO de RLS sem policies e nenhum WARN SECURITY DEFINER. O projeto é isolado e limpo, mas não é um TEST full-product independente.

A Edge Function `upstatus-signal-test` v32 ainda mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`; o helper candidato espera 409. A divergência foi confirmada por inspeção estática, não por requisição HTTP real.

## Team Lite

A branch oficial `team-lite-official` continua com workflow manual que executa `supabase functions deploy upstatus`, usa CLI `latest` e não valida SHA/projeto/migrations. O destino correto seria `upstatus-team-lite`. Não despachar o workflow atual.

## Issue #78 — aceitação física

Issue permanece OPEN e os oito critérios seguem sem aceite. Não houve teste manual de perda real de internet, recuperação sem F5, reentrada em sala, novas chamadas, permissões reais de microfone/tela ou interoperabilidade instalada Normal ↔ Team Lite. CI/WebRTC simulado não fecha esse gate.

## Gates da QA

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcast público, tópico divergente e payload de mensagem completo |
| TEST-ISOLATION | in_progress | Laboratório isolado/zerado, mas não é TEST full-product e mantém Default ACL ampla |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs do ledger ausentes de master; main MIGRATIONS_FAILED |
| AUTH-03 | blocked | Colunas, rate limits e RPCs ausentes em produção |
| ACL-STORAGE | blocked | Grants amplos, Default ACL e buckets públicos sem policies |
| RECONNECT | pending | 0/8 critérios físicos confirmados |
| HUMAN-REVIEW | pending | PRs Draft sem review; nenhuma autorização de release |

## Veredito

**NOT READY.** A correção de checks do dispatcher #143 é válida no candidato e passou no CI push, mas não altera a prontidão de produção. Bloqueadores prioritários: Realtime privado/autorizado, grants/Default ACL/Storage, AUTH-03 e signaling server-mediated, proveniência de migrations, estado MIGRATIONS_FAILED, workflow Team Lite, testes físicos e revisão humana.

Nenhum teste manual, requisição HTTP real, deploy, migration, merge, release, alteração de secrets/flags/roles/grants/policies/ACLs ou publicação foi executado pela QA. Todas as consultas SQL foram SELECT-only. A única escrita desta execução é este relatório na branch QA e a atualização do comentário QA existente na Issue #79.


## Addendum — head final da QA e Validate disparado pelo append

O snapshot inicial desta rodada registrou QA em `877a98e8d568ab1e4307f5f5f0ec382551dff5ae`. A criação deste relatório avançou a branch QA para `ef5d14ae40cbdac23ab261597dd02774d6c36a6d`, que é o HEAD final após o commit documental.

O GitHub executou automaticamente o Validate da PR #82 nesse novo HEAD. O run [42961014652](https://github.com/Reekyi/UpStatus/actions/runs/42961014652) concluiu FAILURE no evento `pull_request`; o log confirma novamente build Normal/TEST 3.4.7 e `production updateURL mismatch` em `scripts/validate.mjs:26`. Nenhum rerun foi iniciado. A falha é a mesma divergência herdada da base, não uma alteração do validator neste relatório.
