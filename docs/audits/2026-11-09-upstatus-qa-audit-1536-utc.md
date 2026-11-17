# UpStatus — auditoria independente de QA

**Data:** 2026-11-09 15:36 UTC (12:36 BRT)  
**Branch QA:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA observado antes do registro:** `9ff1478d00fd3823f9c7f606ee8075518167e694`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## Escopo e método

UpStatus é um userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Foram consultados GitHub (refs, PRs, commits, diffs, workflows, jobs, logs, reviews e issues) e Supabase (projetos, branches gerenciadas, migrations, Edge Functions, Advisors e catálogos PostgreSQL). As consultas SQL foram exclusivamente SELECT/catalog-only. Foram lidos os logs dos workflows já existentes; nenhum workflow foi disparado ou reexecutado. Não foram executados testes locais, fixtures, testes físicos ou uploads.

Classificações:
- **AUTOMATED PASS:** workflow concluído com sucesso no SHA exato indicado.
- **AUTOMATED FAIL:** workflow concluído com falha no SHA exato indicado.
- **CODE INSPECTION:** inspeção estática de código/configuração ou catálogo; não equivale a exploração ou teste de runtime.
- **MANUAL PENDING:** depende de navegador/dispositivo/rede real ou aceite humano.
- **BLOCKED:** gate impeditivo confirmado.
- **NOT VERIFIED:** evidência não disponível ou insuficiente.

## Documento principal e integridade das refs

Li integralmente o blob de `docs/RELEASE_READINESS.md`, SHA `7cfbd70886df42ce790c078c224b19284a632595` (1.045.105 caracteres), usando a leitura do blob GitHub porque o endpoint de conteúdo retornou corpo vazio. A última seção datada do documento é a revalidação de **2026-11-08 15:30 BRT / 18:30 UTC**. Portanto, o arquivo é um histórico importante, mas não representa sozinho o estado atual. Ele foi preservado sem alteração.

Heads observados:
- QA `qa/release-readiness-2026-11-04-master`: `9ff1478d00fd3823f9c7f606ee8075518167e694` (HEAD da PR #82).
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- Merge-base QA/master: `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- Comparação master...QA: **164 commits à frente / 1 atrás**. O único commit exclusivo de master, `9d40461`, altera apenas `docs/checkpoints/2026-11-08-production-migration-history-preflight.md`. Não fiz rebase nem incorporei esse commit concorrente.

A PR #82 continua aberta e Draft, baseada no merge-base antigo `a9288cc`. A QA branch não foi reescrita.

## PRs principais e CI por SHA exato

| PR | Linha | HEAD | Estado | Evidência |
|---|---|---|---|---|
| [#74](https://github.com/Reekyi/UpStatus/pull/74) | Normal | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Open / Draft | Validate [42451736696 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42451736696); Signaling Smoke [42451736729 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) |
| [#75](https://github.com/Reekyi/UpStatus/pull/75) | Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127 PASS histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76](https://github.com/Reekyi/UpStatus/pull/76) | Team Lite atual | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Open / Draft | Candidate Checks [42450476433 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) |
| [#82](https://github.com/Reekyi/UpStatus/pull/82) | QA documental | `9ff1478d00fd3823f9c7f606ee8075518167e694` | Open / Draft | Validate [42620208784 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/42620208784) |

Detalhes conferidos nos logs:
- #74 Smoke: **19/19** verificações não autenticadas e **136/136** autenticadas; job terminou SUCCESS. Incluiu integração isolada, browser/WebRTC, concorrência do rate limiter, recibos atômicos e consumo atômico de convite de setup.
- #76 Candidate Checks: **16/16** verificações não autenticadas e **110/110** autenticadas; job terminou SUCCESS. Incluiu guard de projeto isolado, adapter autenticado, primeiro acesso, recuperação de sala/tela, contrato HTTP, Playwright Full-IIFE com endpoints inertes/stubs e integração/browser.
- #75 é ancestral da #76: comparação entre os heads confirma **305 commits à frente / 0 atrás**. Não tratar #75 e #76 como payloads independentes.
- #82 falha em `scripts/validate.mjs:26` com `production updateURL mismatch`, depois de construir PROD/TEST 3.4.7. O commit #82 mais recente apenas corrige a referência do workflow #126 no relatório; não altera código de produto ou validator.

Reviews: nenhuma review foi retornada para #74, #75, #76, #82, #127 ou #128. CI candidato não equivale a aprovação humana nem aceitação física.

## Guards e workflows de release

- [#123](https://github.com/Reekyi/UpStatus/pull/123) continua Open / Draft. O guard dedicado [42589119358](https://github.com/Reekyi/UpStatus/actions/runs/42589119358) passou. A proposta fixa CLI 2.122.1 e o alvo `upstatus-team-lite`, mas não está integrada.
- [#125](https://github.com/Reekyi/UpStatus/pull/125) continua Open / Draft. O dispatcher offline [42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306) passou, mas o job `deploy` ficou SKIPPED. O Validate [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) falhou no contrato herdado de `production updateURL mismatch`.
- [#127](https://github.com/Reekyi/UpStatus/pull/127) continua Open / Draft. O workflow focado de proveniência [42615130073](https://github.com/Reekyi/UpStatus/actions/runs/42615130073) passou, mas o manifesto cobre somente as três migrations originais presentes.
- [#128](https://github.com/Reekyi/UpStatus/pull/128) continua Open / Draft. O contrato offline de aprovação [42614800302](https://github.com/Reekyi/UpStatus/actions/runs/42614800302) passou. Não há review humana nas PRs auditadas; a configuração da allowlist `UPSTATUS_RELEASE_REVIEWERS` e dos required reviewers do Environment production não foi verificada nesta execução.

Inspeção atual dos workflows oficiais:
- `master/.github/workflows/deploy-production.yml` usa Supabase CLI `latest` e executa `supabase functions deploy upstatus`.
- `team-lite-official/.github/workflows/deploy-production.yml` também usa CLI `latest` e executa `supabase functions deploy upstatus`, em vez de `upstatus-team-lite`. Se despachado, pode substituir o runtime Normal. **Não despachar nenhum dos workflows oficiais.**

## Supabase: projeto, migrations e isolamento

Produção está `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002. A branch gerenciada default `main` está `MIGRATIONS_FAILED`; o preview aparece `ACTIVE_HEALTHY`.

O histórico remoto contém **7 migrations** até `20261027155438`. Os quatro SQLs abaixo continuam ausentes de `master/supabase/migrations`; as quatro consultas de conteúdo retornaram 404:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #127 confirma hashes Git dos três arquivos originais presentes, mas não recupera os quatro ausentes. Não reconstruir SQL por inferência a partir do schema atual.

O laboratório é um projeto separado, `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, com 38 migrations e duas Edge Functions de teste. Nesta consulta: zero linhas em `realtime.messages`, nenhum bucket Storage, 17 tabelas public com RLS sem policies, zero grants diretos de tabela para anon/authenticated e funções SECURITY DEFINER de broadcast sem EXECUTE para esses papéis (EXECUTE somente service_role). É isolamento útil para testes; nenhum fixture foi mutado nesta rodada.

## Segurança de produção: AUTH-03, Realtime, grants e Storage

### AUTH-03 — P1, bloqueado por inspeção de runtime e catálogo

Runtimes implantados:
- Normal `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- Team Lite `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.

Nos dois runtimes, `POST /api/setup` é encaminhado diretamente para `login(req,true)` antes da autenticação geral. O handler lê a conta, verifica se `password_hash` está vazio e atualiza por nome; não consome convite e o UPDATE não garante atomicamente um único vencedor. Há fallback que atribui `implementation_admin` por nome a Ricardo, Lohan e Guilherme. A senha mínima diverge: Normal 6 caracteres, Team Lite 4.

O catálogo de produção confirmou 5 contas, nenhuma com senha ou role vazia, mas não há RPC `consume_upstatus_setup_invite`, `merge_chat_read_receipts` ou rate-limit RPC consultada. Ausência de conta vulnerável agora não elimina o risco latente de primeiro setup/reset e corrida.

### RT-01 — P1, bloqueado

Snapshot read-only de `realtime.messages`: **26 linhas, todas `private=false`**, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 14 `db_change`
- 10 `user_status`
- 1 `remote_command`
- 1 `remote_result`

A inspeção atual de `pg_proc.prosrc` confirmou que `upstatus_broadcast_messages()` publica `to_jsonb(OLD/NEW)` integral em `db_change`, com `private=false`; a função de estado remoto publica campos de comando/resultado; as três funções são SECURITY DEFINER, `search_path=public`, e têm EXECUTE efetivo para anon e authenticated. Security Advisor reportou 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy.

Os clientes Normal/Team Lite auditados usam `.channel(UP_REALTIME_TOPIC)` sem `private:true` e sem `realtime.setAuth()`. Team Lite aponta para `upstatus-screen-share-live-3-1-1-beta10`, enquanto os triggers do banco publicam no tópico legado acima. Os adapters autenticados candidatos continuam opt-in: `signaling_transport_enabled` default false e endpoint vazio. O caminho legado permanece ativo no default. A divergência de tópico não elimina a existência de mensagens públicas no tópico legado.

Classificação: CODE INSPECTION + catálogo. Não foi demonstrado acesso externo, spoofing ou entrega maliciosa a um terceiro nesta execução.

### ACL-STORAGE — bloqueado

Produção:
- 10 tabelas public com RLS e zero policies.
- 9 tabelas public com privilégios diretos para anon/authenticated, incluindo TRUNCATE.
- 24 entradas de Default ACL; há defaults amplos em public e Storage.
- `storage.objects`: zero policies; grants SELECT/INSERT/UPDATE/DELETE para anon e authenticated.
- Buckets `chat-images` e `profile-images` são públicos, com limite de 20 MiB cada.
- Security Advisor: 6 WARN (3 funções SECURITY DEFINER para cada papel cliente) e 10 INFO (RLS sem policy). Performance e Health sem findings.

Laboratório: zero grants diretos de tabela para papéis clientes; as três funções SECURITY DEFINER de broadcast têm search_path vazio e EXECUTE restrito a service_role. Advisor: 17 INFO de RLS sem policy, sem WARN SECURITY DEFINER.

### Upload — P2, CODE INSPECTION

Nos dois runtimes de produção, `sniffMime()` reconhece algumas assinaturas, mas termina com `return declared` para bytes desconhecidos. A rota `signedUploadRoute()` valida MIME e tamanho declarados pelo cliente, cria Signed Upload URL e já devolve URL pública; não recebe nem inspeciona os bytes enviados. Com buckets públicos, falta uma fronteira de quarentena/validação antes da publicação. Não houve upload de teste nem reprodução de exploit.

## Issues e aceitação manual

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta com **0/8 critérios físicos aprovados**. Não houve teste real de perda de internet, reconexão sem F5, reentrada, novas chamadas, microfone/tela ou interoperabilidade instalada Normal ↔ Team Lite.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) tem 16 caixas marcadas e 19 pendentes no corpo atual. Esse checklist histórico não é percentual de prontidão nem substitui a aceitação física.

## Veredito

**NÃO LIBERAR.** O CI dos candidatos Normal e Team Lite está verde nos heads auditados, mas isso não fecha AUTH-03, RT-01, ACL/Storage, proveniência das migrations, upload nem aceitação física. A PR #82 também continua com Validate vermelho.

Próximos gates:
1. Recuperar os quatro SQLs originais e reconciliar o histórico de migrations com owner autorizado.
2. Corrigir setup com convite, consumo atômico e autorização/rate-limit equivalentes nos dois runtimes.
3. Tornar o transporte autenticado o default e remover broadcasts públicos sensíveis; validar membership/sender no servidor.
4. Revisar grants, Default ACLs, SECURITY DEFINER e Storage com plano de rollback.
5. Corrigir validação de bytes do upload e decidir a privacidade dos buckets.
6. Corrigir o workflow Team Lite oficial e manter dispatch bloqueado até aprovação humana.
7. Executar os oito critérios físicos da #78 em navegadores/dispositivos reais e obter reviews humanas.

## Registro de segurança desta rodada

Não houve escrita em Supabase, migration, alteração de schema/grant/policy/ACL, fixture, upload, deploy, merge, release, workflow dispatch, mudança de secret/flag ou publicação de userscript. Nenhuma branch de engenharia foi alterada. A única alteração documental desta rodada é este novo arquivo na branch QA dedicada.
