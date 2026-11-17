# Auditoria independente UpStatus — 2026-11-16 18:45 UTC

**Veredito: NOT READY.** Esta execução revalidou GitHub, CI existente, fontes Edge implantadas, logs, catálogo PostgreSQL, Advisors, migrations, Realtime e workflows. Todas as consultas ao Supabase foram read-only. Não foram executados testes novos nem testes físicos.

## Heads e PRs

- `master`: `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- Branch QA / PR #82: `41e413d629c1700501bcecbc02b7d3602019d7d6`.
- [PR #74 Normal](https://github.com/Reekyi/UpStatus/pull/74): `dcaf6a072546eda0089e0cee4018c3047011f600`, 887 commits, 90 arquivos.
- [PR #75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75): `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`, 59 commits, 10 arquivos.
- [PR #76 Team Lite candidato](https://github.com/Reekyi/UpStatus/pull/76): `00a578e9174e08238a1289a35feb02d171625421`, 389 commits, 59 arquivos.
- [PR #82 QA](https://github.com/Reekyi/UpStatus/pull/82): `41e413d629c1700501bcecbc02b7d3602019d7d6`, 375 commits, 212 arquivos.

As quatro PRs continuam abertas, Draft e não mescladas. A consulta de reviews retornou zero reviews submetidas nas quatro. A comparação de #75 para #76 mostra #76 **330 commits à frente e zero atrás**: #75 é baseline ancestral, não um payload independente para merge.

## Documento de prontidão

[docs/RELEASE_READINESS.md](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md) foi lido no HEAD QA. O blob tem 1.046.356 bytes e a última seção registrada é de 2026-11-15 06:30 UTC; portanto, não incorpora esta fotografia de 16/11. É um histórico append-only extenso, com snapshots repetidos e datas antigas. Esta execução foi registrada em arquivo de auditoria separado para evitar reescrever esse histórico.

## CI existente, por HEAD exato

### #74 Normal

- [Validate run 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): SUCCESS no HEAD `dcaf6a0`.
- [Signaling Smoke run 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS no mesmo HEAD.
- O log registra **136/136 checks autenticados**, WebRTC de chamada, voz e compartilhamento de tela com remote tracks, mesh de três participantes, teardown, rate limit distribuído (90 aceitos + 1 HTTP 429), concorrência de recibos e limpeza das fixtures.
- A etapa `Verify distributed setup-invite issuance rate limit` ficou **SKIPPED**. Logo, não há evidência desse contrato nesse Smoke.
- É CI isolado, não teste manual Tampermonkey/Sale Smartly.

### #75 Team Lite baseline

- [Candidate Checks run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico no HEAD baseline.
- Não substitui a validação do candidato atual #76.

### #76 Team Lite

- [Candidate Checks run 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAILURE no HEAD `00a578e`.
- O job independente `signed-upload-contracts` passou nos contratos de servidor e cliente.
- O job `candidate-checks` passou guards, adapter, enrollment, recuperação de voz/tela e contratos HTTP locais. Falhou no passo de autenticação do endpoint isolado: **0/16 checks não autenticados** porque todas as rotas responderam HTTP 402, quando o teste esperava 401.
- A resposta do Supabase foi explícita: `exceed_edge_functions_invocations_quota`, com orientação para o proprietário atualizar o plano ou remover spend cap.
- Playwright, integração autenticada, concorrência, recibos, convites e etapas posteriores foram SKIPPED. Não classificar como falha funcional do código; é bloqueio de infraestrutura que impede validar o candidato.

### #82 QA

- [Validate run 43920626011](https://github.com/Reekyi/UpStatus/actions/runs/43920626011): FAILURE no HEAD exato `41e413d`.
- O job executou `node scripts/validate.mjs` e falhou em `scripts/validate.mjs:26` com `VALIDATION FAILED: production updateURL mismatch`.
- A falha está reproduzida no HEAD atual. Não foi iniciado rerun.

## Disponibilidade Edge e login Normal

Produção `dlfvkawaiqduhlazsszm` está `ACTIVE_HEALTHY`, mas o log unificado registra **55.702 respostas HTTP 402** nas rotas consultadas. O primeiro registro desta amostra é 11:41 UTC e o último 18:37 UTC; não interpretar isso como 24 horas completas de cobertura, apesar de a consulta usar janela máxima de 24h.

| Rota | HTTP 402 |
|---|---:|
| `/api/chat` | 29.623 |
| `/api/status` | 13.008 |
| `/api/remote-status` | 12.979 |
| `/api/account` | 32 |
| `/api/members` | 27 |
| `/api/me` | 27 |
| distribuição `/upstatus/upstatus.user.js` | 6 |
| **Total** | **55.702** |

Os logs de produção mostram status e URL, mas não expõem a causa específica do 402. Não atribuir automaticamente a mesma quota observada no laboratório. A ausência de um evento `/api/login` nesta amostra também impede afirmar que o POST de login foi diretamente observado; as rotas de conta, usuário e API essenciais, porém, estão bloqueadas.

O laboratório `bfpjtfqlnypisxljoxkb` também está `ACTIVE_HEALTHY`, mas suas 14 rotas consultadas devolveram 48 respostas 402 durante o teste. O log do CI identifica a causa de forma inequívoca: `exceed_edge_functions_invocations_quota`. Isso bloqueia a integração #76.

## Edge Functions e compatibilidade instalada

A produção lista 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso não prova, isoladamente, acesso anônimo às rotas: os runtimes centrais fazem autenticação própria por token de sessão. É necessário manter inventário de autenticação por função.

- `upstatus`: versão Edge 480, runtime interno 3.4.7. O userscript embutido 3.4.7 aponta API para `upstatus-screen-share-3-1-1-beta10` e tópico Realtime `upstatus-screen-share-live-3-1-1-beta10`.
- `upstatus-screen-share-3-1-1-beta10`: versão Edge 6, mas o código fonte declara `VERSION = 3.1.1-beta8` e embute userscript beta8 que aponta para o endpoint/tópico beta8. Há deriva entre slug beta10 e artefato/runtime beta8.
- `upstatus-team-lite`: versão Edge 15, runtime e userscript embutido 3.4.30. O cliente aponta API para o slug Team Lite, mas ainda assina o tópico Realtime legado beta10.
- Não existe função de sinalização server-mediated correspondente em produção. `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 existem somente no laboratório.

A versão instalada Normal 3.4.7 continua chamando o endpoint beta10. A função de distribuição `upstatus` e a função API beta10 são serviços distintos; publicar somente `upstatus` não atualiza a API que recebe as chamadas atuais.

## Workflows e release cutover

### Normal

O workflow candidato [deploy-production.yml da #74](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/.github/workflows/deploy-production.yml) melhorou o guard: exige branch master, SHA exato, projeto de produção esperado e CLI pinada 2.122.1. Ainda assim, publica somente `upstatus`, não o endpoint beta10 utilizado pelo cliente.

Há um conflito de release metadata: `release.json` e `UpStatus.user.js` estão em 3.4.7; o workflow candidato aceita exclusivamente versão 3.4.7; o build guard exige versão maior que o artefato rastreado quando o script gerado muda. Uma nova versão de userscript precisa de alinhamento entre version bump, artefato e allowlist do workflow antes do corte.

O workflow de produção em master ainda usa CLI `latest` e secret genérico `SUPABASE_PROJECT_ID`, sem os guards de projeto/SHA da candidata.

### Team Lite

O workflow oficial [deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml) continua executando `supabase functions deploy upstatus`, que é o slug Normal, em vez de `upstatus-team-lite`. Usa CLI `latest`, secret de projeto genérico e não verifica projeto/SHA. O mesmo blob de workflow está na branch candidata #76. **Não despachar esse workflow.**

### TEST

A candidata de deploy TEST em #76 usa `SUPABASE_TEST_PROJECT_ID`, rejeita o projeto de produção e o laboratório de fixtures, verifica o build target e fixa CLI 2.122.1. É uma melhoria real. Porém, a organização tem apenas produção e laboratório de sinalização; não existe Full-Product TEST isolado.

## PostgreSQL, RLS, SECURITY DEFINER e Storage

### RLS e grants

O Security Advisor de produção, observado às 18:37 UTC, retorna 10 INFO de RLS sem policies, três WARN para SECURITY DEFINER executáveis por `anon` e três WARN para `authenticated`.

O catálogo confirma nove tabelas backend-owned em `public` com RLS habilitado, zero policies e grants amplos para `anon`/ `authenticated`, inclusive `TRUNCATE`: `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing` e `users`. RLS protege operações de linha sem policy, mas não é proteção para TRUNCATE. O grant é desnecessário e deve ser removido por change set revisado; não foi testada exploração.

As três funções `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` são `SECURITY DEFINER`, têm `search_path=public` e EXECUTE listado para `anon` e `authenticated`. São funções trigger-returning anexadas a triggers. O Advisor atual as descreve como executáveis por `anon` e `authenticated` via `/rest/v1/rpc/<nome_da_função>`; não executei essas rotas. Como a assinatura retorna `trigger`, a disponibilidade efetiva do endpoint deve ser confirmada em ambiente isolado, mas os grants e o alerta permanecem bloqueadores até serem revogados ou formalmente justificados.

### Default ACL

A inspeção de `pg_default_acl` confirma privilégios padrão amplos:
- owner `postgres`: schemas `public` e `storage`;
- owner `supabase_admin`: schemas `public` e `graphql`.

Os defaults concedem a `anon` e `authenticated` privilégios de tabela, EXECUTE em funções e privilégios de sequência. Isso pode recriar grants em objetos futuros mesmo após revogações pontuais. A correção precisa cobrir os owners e schemas efetivamente observados.

### Realtime

Snapshot de `realtime.messages`: **106 registros, todos `private=false`**, distribuídos em 72 `user_status`, 26 `db_change`, 4 `remote_command` e 4 `remote_result`. A tabela está com RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE para `anon` e `authenticated`.

O trigger de mensagens publica `to_jsonb(OLD/NEW)` completo no tópico público `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Triggers de status e remote state também publicam com `private=false`. Os clientes Normal e Team Lite embutidos assinam `upstatus-screen-share-live-3-1-1-beta10`, tópico diferente do trigger. Além da exposição pública, há risco de os clientes não receberem os eventos emitidos pelo trigger atual.

### Storage

Os buckets `chat-images` e `profile-images` continuam públicos, com limite de 20 MiB cada e 188 objetos no total (168 + 20). A consulta de `pg_policies` retorna zero policies em `storage`. A visibilidade pública é configuração do bucket; não foi tentado acessar conteúdo de terceiros.

## AUTH-03 e migrations

Em produção, a consulta de catálogo retorna:
- tabela de convites ausente;
- colunas `setup_token_hash` e `setup_token_expires_at` ausentes;
- RPC `consume_upstatus_setup_invite` ausente.

Os runtimes implantados ainda contêm o caminho legado `/api/setup`. O código Team Lite também contém fallback administrativo por nomes fixos. Isso é inspeção de código/catalog, não teste de exploração.

Produção tem 7 migrations aplicadas; o laboratório tem 38. O diretório `supabase/migrations` em master e QA contém somente 3 SQLs. Quatro migrations aplicadas em produção não têm seus SQLs originais no diretório:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A branch gerenciada Supabase `main` está `MIGRATIONS_FAILED`; o preview aparece `ACTIVE_HEALTHY`. Não reconstruir SQL original por inferência nem aplicar migrations em produção.

## Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): permanece aberta, 0/8 critérios físicos aprovados. Não houve teste real de Tampermonkey, queda/retorno de internet sem F5, permissões reais de microfone/display ou interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): comentário dedicado QA atualizado nesta execução. Comentário da Engenharia preservado.

## Gates

| Gate | Estado | Evidência desta execução |
|---|---|---|
| RT-01 | BLOCKED | 106 mensagens públicas, zero policies e tópico incompatível |
| TEST-ISOLATION | BLOCKED | somente produção e laboratório de sinalização; sem Full-Product TEST |
| MIGRATION-PROVENANCE | BLOCKED | 7 migrations em produção, somente 3 SQLs no repo |
| AUTH-03 | BLOCKED | tabela/colunas/RPC de convite ausentes em produção |
| ACL-STORAGE | BLOCKED | grants/default ACL amplos, SECURITY DEFINER, buckets públicos sem policies |
| RECONNECT | PENDING | Issue #78 0/8; sem teste físico sem F5 |
| HUMAN-REVIEW | PENDING | quatro PRs sem reviews humanas |

## Segurança da execução

- Nenhum teste foi iniciado diretamente pela QA; foram inspecionados resultados de CI existentes.
- Não houve SQL de escrita, migration, alteração de role/grant/policy/ACL, secret, flag, Edge Function, deploy, merge, release ou publicação de userscript.
- Nenhuma fixture foi criada, alterada ou limpa.
- A única escrita desta execução é este relatório documental na branch QA e a atualização do comentário QA existente na Issue #79.
- As automações de Engenharia e QA não foram alteradas.

## Próximos passos prioritários

1. Proprietário do laboratório: revisar Usage/Billing e spend cap para restaurar Edge Functions; repetir #76 no mesmo HEAD somente após o serviço voltar.
2. Produção: identificar no painel Supabase a causa específica dos 402; não presumir que seja a mesma quota do laboratório.
3. Normal: coordenar distribuição, API beta10, versão do artefato e allowlist do workflow; validar rollback.
4. Team Lite: corrigir o workflow de produção para slug `upstatus-team-lite`, CLI pinada, projeto/SHA verificados.
5. Projetar transporte Realtime privado/autenticado e payloads mínimos; não apenas trocar tópico/flag.
6. Recuperar os quatro SQLs originais, corrigir default ACLs sob owner autorizado e provisionar Full-Product TEST.
7. Validar AUTH-03, Storage, RLS/grants e Realtime no ambiente correto.
8. Executar os oito critérios físicos da #78 e obter aprovação humana antes de release.
