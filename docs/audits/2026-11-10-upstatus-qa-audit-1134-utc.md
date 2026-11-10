# Auditoria independente de QA — UpStatus
**Data:** 2026-11-10 11:34 UTC (08:34 BRT)  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## Parecer

**Recomendação: `not_ready`.** As candidatas combinadas Normal #133 e Team Lite #134 passaram nas suítes completas de PR no HEAD exato, incluindo AUTH-03 no Normal. Isso é progresso real. Ainda assim, os clientes implantados permanecem em versões antigas, o transporte autenticado não é o padrão nem nos candidatos (flag desabilitada por default), o banco de produção conserva broadcasts públicos e privilégios amplos, e a aceitação física/revisão humana não ocorreu.

Esta auditoria separa CI, inspeção estática, estado implantado, teste manual e dependências. Não foram executados testes locais ou manuais nesta rodada.

## Documento de prontidão e integridade da QA

- Li integralmente `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master` usando o blob `7cfbd70886df42ce790c078c224b19284a632595`.
- Conteúdo: 1.045.105 caracteres, 8.410 linhas. O último checkpoint interno do documento é 2026-11-08 18:30 UTC. O documento principal foi preservado, sem append ou substituição.
- Branch QA antes deste relatório: `a6ca94739220ba8cb17c655c0f7a593b37b821ca`; master: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- Compare QA vs master: 186 commits à frente, 1 atrás, divergido. O merge-base é `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não fiz rebase.
- API de branches informa `protected=false` para master, QA e team-lite-official. Não foi possível ler regras administrativas adicionais; não inferir proteção ausente além do campo retornado.
- O arquivo é um novo relatório em `docs/audits/`; nenhum arquivo existente foi sobrescrito.

## Heads reais, PRs e reviews

| PR | HEAD | Base | Estado |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | master | open, Draft, mergeable |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | open, Draft, mergeable |
| #76 Team Lite signaling | `3b1406ddb56aecfa5b5515791ca99aea92c305ab` | team-lite-official | open, Draft, mergeable |
| #82 QA | `a6ca94739220ba8cb17c655c0f7a593b37b821ca` | master | open, Draft, mergeable |
| #133 Normal combinado | `8d38036ead5e1c3c9cc00db9791f8c9de093ba62` | #74 | open, Draft, mergeable |
| #134 Team Lite combinado | `ee246aa252417e4dbda5f8a3aaf9f02c9ab0ace5` | #76 | open, Draft, mergeable |
| #135 recuperação documental SQL | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` | master | open, Draft, mergeable |

Comparações GitHub:
- #74 contra master atual: 883 commits à frente, 1 atrás; divergido. O PR ainda se baseia no SHA anterior de master.
- #76 contra team-lite-official: 378 à frente, 0 atrás.
- #133 contra #74: 14 à frente, 0 atrás.
- #134 contra #76: 10 à frente, 0 atrás.

Reviews humanas: nenhuma review registrada nas PRs #74, #75, #76, #82, #133, #134 e #135. Os candidatos novos continuam Draft.

## CI por HEAD exato

### Normal #133 — PASS PR-triggered

- [API Target Candidate Validation 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827): job e todos os steps concluídos com sucesso.
- [Signaling Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887): job e todos os steps concluídos com sucesso.
- Log do Smoke: 136/136 verificações autenticadas; WebRTC de chamada com faixa de áudio remota; voz; compartilhamento de tela com faixa de vídeo remota; mesh autenticado de três participantes; teardown.
- Também passaram os contratos de salas/voice attempts, isolamento de tentativas entre aliases Normal/Team Lite, rate limit de sinalização (90 aceitas e 1 rejeitada com HTTP 429 e Retry-After), concorrência de recibos de leitura, consumo único de convite e rate limit distribuído de emissão de convite. O log confirma limpeza de usuários, sessões, salas, memberships e eventos temporários.
- AUTH-03 agora está no HEAD combinado #133; não é mais apenas a PR isolada #131. A validação do convite passou no laboratório, não em produção.

### Team Lite #134 — PASS PR-triggered

- [Candidate Checks 42804453298](https://github.com/Reekyi/UpStatus/actions/runs/42804453298): suíte completa executada como check de pull_request no HEAD exato; todos os steps passaram.
- [Authenticated Call Source Guard 42804453252](https://github.com/Reekyi/UpStatus/actions/runs/42804453252): guard focado passou como check de PR.
- O log confirma 110/110 verificações autenticadas, testes de navegador Full-IIFE, negociação WebRTC de chamada/voz/tela, mesh de três participantes, recuperação e capacidade de sala, rate limits, setup-invite, recibos de leitura e cleanup. A atualização de Engenharia também reporta 16/16 verificações não autenticadas e 11/11 contratos HTTP.
- A suíte usa o projeto isolado, não produção.

### PRs principais e QA

- #74 no HEAD pai `fb878537`: Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) passaram historicamente nesse HEAD. Esses checks não incluem as alterações posteriores de #133.
- #75 `7bbf9b90`: PASS histórico do baseline; não substitui a linha ativa #76/#134.
- #76 no HEAD pai `3b1406d`: Candidate Checks [42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) passou; não contém por si só o patch posterior #134.
- #82 QA HEAD `a6ca947`: Validate [42800913422](https://github.com/Reekyi/UpStatus/actions/runs/42800913422) falhou em `scripts/validate.mjs:26`, `production updateURL mismatch`.
- #135 HEAD `98e96cfe`: Validate [42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) falhou na mesma asserção herdada. Supabase Preview foi skipped. Não houve aplicação de SQL.
- Os resultados #133/#134 são CI automatizado. Não são aprovação humana, publicação, teste físico de Tampermonkey ou reconexão real sem F5.

## Proveniência das quatro migrations: avanço parcial

A PR [#135](https://github.com/Reekyi/UpStatus/pull/135) recupera os textos de `supabase_migrations.schema_migrations.statements` por SELECT read-only. Conferi os quatro registros do ledger com o diff arquivado:

| Versão | Nome | Conteúdo no ledger |
|---|---|---|
| 20261023154754 | create_upstatus_visual_config | 1 statement |
| 20261026195855 | add_chat_message_file_name | 1 statement |
| 20261027154329 | allow_chat_document_mime_types | 1 statement |
| 20261027155438 | set_upstatus_upload_limits_20mb | 1 statement |

Os quatro arquivos em `docs/migration-recovery/` correspondem ao texto SQL armazenado no ledger. O manifesto declara corretamente `executed_statement_recovered_not_original_file`. Todos os quatro registros têm `rollback = NULL` e `idempotency_key = NULL`; o manifesto não prova o arquivo original, comentários, formatação original, blob Git original ou rollback.

Conclusão de QA: **o texto executado foi recuperado e comparado; os arquivos originais não foram recuperados byte a byte.** O material permanece fora de `supabase/migrations/`, o que impede descoberta/aplicação automática pela Supabase CLI. Não mover, reconstruir, aplicar ou usar em deploy sem revisão de proveniência e autorização. Gate MIGRATION-PROVENANCE fica `in_progress`, não `done`.

## Supabase: projetos, migrations e Edge Functions

A listagem de projetos retorna exatamente dois projetos:
- Produção `dlfvkawaiqduhlazsszm`, UpStatus, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, upstatus-security-test, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Migrations:
- Produção: 7, terminando em `20261027155438`.
- Laboratório: 39, terminando em `20261110000612`.
- Branch gerenciada `main` do projeto de produção: `MIGRATIONS_FAILED`; preview do projeto: `ACTIVE_HEALTHY`.

Edge Functions:
- Produção: 38 ACTIVE; todas reportam `verify_jwt=false`. Isso não prova ausência de autenticação: os handlers principais usam token customizado. Não foi feita auditoria individual de todos os 38 handlers.
- Runtimes principais inspecionados: `upstatus` v480 (userscript 3.4.7), `upstatus-team-lite` v15 (userscript 3.4.30), `upstatus-screen-share-3-1-1-beta10` v6 e `upstatus-test` v281.
- **Isolamento:** `upstatus-test` v281 está dentro do projeto de produção, não no projeto de laboratório. O bundle embutido é 3.3.28 e aponta seu API server para o runtime beta10. Não tratar essa função como ambiente isolado.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não existe função server-mediated `upstatus-signal` no projeto de produção.

Fonte implantada:
- Normal v480 embute userscript 3.4.7; `@updateURL` aponta para `/functions/v1/upstatus/upstatus.user.js`, mas `CLOUD_SERVER` aponta para `upstatus-screen-share-3-1-1-beta10`; tópico inscrito: `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite v15 embute 3.4.30; API aponta para `upstatus-team-lite`, mas tópico ainda é `upstatus-screen-share-live-3-1-1-beta10`.
- TEST v281 embute 3.3.28; API e tópico apontam para beta10.
- Nos bundles implantados inspecionados: sem `private:true`, sem `realtime.setAuth()` e sem `signaling_transport_enabled`.
- Os handlers dos três runtimes principais mantêm `POST /api/setup -> login(req,true)`; o catálogo de produção não contém `setup_token_*`, tabela `upstatus_setup_invite_rate_limits`, RPC `consume_upstatus_setup_invite` ou RPC de rate limit de convite.

## Realtime e confiança da origem

Produção:
- Consulta read-only de `realtime.messages`: 48 linhas no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; todas `private=false`. A linha mais recente observada é de 2026-11-09 21:00 UTC.
- RLS em `realtime.messages` está ligado, sem policies; anon/authenticated têm SELECT, INSERT e UPDATE efetivos.
- O tópico dos triggers não coincide com o tópico beta10 assinado pelos bundles implantados.
- Não foi demonstrado subscriber externo, exploração ou entrega de comando a usuário real; o achado é configuração pública e incompatibilidade de tópicos observadas, não prova de incidente.

Candidatos #133/#134:
- A proveniência autenticada foi movida para argumento fora do payload; `_authenticatedTransport` foi removido.
- A allowlist de descoberta pública é limitada a `presence` e `ended`; `join_declined` e mídia/controle devem usar transporte autenticado.
- **Bloqueador residual:** `signaling_transport_enabled` continua default `false` nos templates Normal e Team Lite. Os listeners e fallback legado público continuam ativos quando a flag está desligada. A correção de proveniência protege o modo autenticado, mas não torna esse modo o default seguro.
- Team Lite candidato já usa o tópico novo `upstatus-live-6f5e7b31-...`; Normal usa placeholders de build para server/topic e o Validate do candidato passou. Nenhum dos candidatos foi publicado.
- Não habilitar a flag em produção: o endpoint server-mediated não existe no projeto de produção.

## RLS, grants, SECURITY DEFINER e Storage

Produção, consultas de catálogo read-only:
- 10 tabelas públicas com RLS habilitado e zero policies.
- Nove tabelas backend-owned concedem privilégios efetivos SELECT/INSERT/UPDATE/DELETE/TRUNCATE para anon e authenticated; `upstatus_visual_config` é a exceção sem esses grants. Também foram confirmados REFERENCES/TRIGGER/MAINTAIN para anon nas nove tabelas.
- `pg_default_acl`: 24 entries, 75 ACL items, incluindo defaults amplos para objetos futuros.
- Três funções `upstatus_broadcast_*` são `SECURITY DEFINER`, owner postgres, `search_path=public`, retorno `trigger`, EXECUTE efetivo para anon/authenticated/service_role. O Advisor reporta 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. Por retornarem `trigger`, não as classifiquei como RPC comum diretamente invocável; os grants continuam desnecessários e o search_path merece hardening.
- `storage.objects`: RLS habilitado, zero policies, grants SELECT/INSERT/UPDATE/DELETE efetivos para anon e authenticated.
- Buckets `chat-images` e `profile-images`: públicos, 20 MiB cada. Nenhuma escrita, upload de prova ou alteração de bucket foi feita.

Laboratório:
- 18 tabelas públicas consultadas com RLS, zero policies e sem grants diretos de tabela para anon/authenticated.
- Tabela `upstatus_setup_invite_rate_limits` e colunas de setup token existem.
- `consume_upstatus_setup_invite`, `consume_upstatus_setup_invite_rate_limit` e `consume_upstatus_signal_rate_limit` são SECURITY INVOKER, search_path vazio e EXECUTE apenas para service_role.
- Isso valida o isolamento do banco de teste; não equivale a rollout em produção.

## Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos. Nenhum teste Tampermonkey, queda real de rede, recuperação sem F5, microfone/tela com permissões reais ou interoperabilidade instalada foi executado.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): comentário dedicado QA atualizado; comentário da Engenharia preservado.
- HUMAN-REVIEW continua pendente; nenhuma aprovação humana foi encontrada e não existe autorização de release.

## Gates QA

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime público; transporte privado/server-mediated não é default e não existe em produção. |
| TEST-ISOLATION | in_progress | Laboratório separado e limpo nos workflows, mas função `upstatus-test` ainda existe no projeto de produção e não há terceiro projeto full-product TEST. |
| MIGRATION-PROVENANCE | in_progress | Statements do ledger recuperados e comparados; arquivos originais/rollback não comprovados. |
| AUTH-03 | in_progress | Normal #133 e Team Lite #134 passaram no laboratório; produção continua sem schema e setup por convite. |
| ACL-STORAGE | blocked | Grants, Default ACLs, SECURITY DEFINER e buckets públicos continuam. |
| RECONNECT | pending | Depende de teste físico sem F5; Issue #78 0/8. |
| HUMAN-REVIEW | pending | Sem reviews humanas e sem autorização explícita. |

## Próximos passos recomendados

1. Fazer do transporte server-mediated autenticado o default seguro em Normal e Team Lite; remover listeners públicos de controle/voz/tela antes de habilitar clientes.
2. Manter #133/#134 como candidatas Draft até review humana e reconciliação segura com as PRs-pai; preservar checks PR-triggered completos.
3. Corrigir o validator herdado `production updateURL mismatch` na linha QA/master sem enfraquecer a checagem.
4. Revisar os quatro statements recuperados com o owner; buscar os arquivos originais/rollback em backup ou artefato de release. Não colocar statements recuperados em `supabase/migrations/` por conveniência.
5. Planejar hardening de grants, Default ACLs, funções trigger, Storage e Realtime com rollback revisado.
6. Só depois do cutover candidato e da revisão, executar os oito critérios físicos da Issue #78.

## Limites e segurança desta execução

- GitHub: leituras de branches, PRs, commits, workflows, logs, reviews, arquivos e comentários; escrita somente deste novo relatório na branch QA e atualização do comentário QA existente na Issue #79.
- Supabase: somente SELECT, listagem de projetos, migrations, funções e advisors. Nenhum DDL/DML, migration, fixture, deploy, secret, flag, grant, policy, ACL ou bucket foi alterado.
- Nenhum workflow foi disparado ou reexecutado pela auditoria. Foram inspecionados os resultados já existentes.
- Nenhum teste manual ou exploração externa foi realizado.
