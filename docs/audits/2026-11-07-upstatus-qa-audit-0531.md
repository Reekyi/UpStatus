# UpStatus — auditoria independente QA (2026-11-07 05:31 UTC)

## Classificação de evidência

- **AUTOMATED PASS:** workflow concluído com sucesso no SHA exato indicado.
- **CODE INSPECTION:** leitura estática de código, catálogo PostgreSQL, migrations ou metadados; não equivale a exploração runtime.
- **MANUAL PENDING:** exige Tampermonkey, navegador/dispositivo real ou operador.
- **PENDING:** evidência ou execução ainda não concluída.
- **BLOCKED:** gate de release impedido por risco ou dependência confirmada.
- **NOT VERIFIED:** fonte/ambiente insuficiente para sustentar a conclusão.

## 1. Refs GitHub e PRs

A primeira leitura desta rodada foi docs/RELEASE_READINESS.md na branch qa/release-readiness-2026-11-04-master. O blob lido permaneceu 1ae48aab678a06b4ff75d061d2355a6449cbe1e0 (797,831 caracteres). A branch QA estava no HEAD 66d01d9f72f028861b00220beee3102dd3d362d0 antes da criação deste relatório.

| PR | Branch | HEAD exato | Base | Comparação |
|---|---|---|---|---:|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | chore/continuity-foundation | 7a17b8de29495d1344ef8b0b71b3785e22f90774 | master | 799 ahead / 0 behind |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | team-lite/3.4.31-guest-fixes | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 59 ahead / 0 behind |
| [#76 Team Lite continuation](https://github.com/Reekyi/UpStatus/pull/76) | team-lite/signaling-transport-candidate | 36c8c62846c912440eb1f73858aac76ba433e8ef | team-lite-official | 225 commits ahead of #75 / 0 behind |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | qa/release-readiness-2026-11-04-master | 66d01d9f72f028861b00220beee3102dd3d362d0 | master | 83 ahead / 0 behind |

Todas as PRs permanecem OPEN, Draft e unmerged. As quatro consultas de reviews retornaram zero reviews humanas submetidas. #75 é baseline histórico; #76 é a continuação Team Lite relevante para a validação atual.

## 2. CI exato dos candidatos

### Normal #74 — AUTOMATED PASS

- [Validate 42341111073](https://github.com/Reekyi/UpStatus/actions/runs/42341111073): SUCCESS no HEAD 7a17b8de29495d1344ef8b0b71b3785e22f90774.
- [Signaling Smoke 42341111066](https://github.com/Reekyi/UpStatus/actions/runs/42341111066): SUCCESS no mesmo HEAD.

Logs do Smoke:
- 19/19 checks não autenticados.
- 129/129 checks autenticados.
- Browser WebRTC de chamada, voice room e screen share, com entrega de áudio/vídeo remoto.
- Mesh autenticado de três participantes e teardown.
- Voice-room attempt recovery, cancel-before-open, tombstones, retry e ausência de membership órfã nos cenários cobertos.
- Rate limit: 90 aceitas, 1 HTTP 429, Retry-After 60; teste concorrente aprovado.
- Read receipts atômicos e concorrentes aprovados.
- Enrollment isolado aprovado: elegibilidade NULL/empty, conta já configurada negada, token malformado/incorreto/expirado/replay negados, exatamente um vencedor na concorrência e cleanup.
- Cleanup de usuários, sessões, rooms, memberships e events confirmado.

O Validate também aprovou migration-layout guard, contrato estático de enrollment, regressões de chat/Realtime, build 3.4.7 e atualizador.

### Team Lite #76 — AUTOMATED PASS

- [Candidate Checks 42341115265](https://github.com/Reekyi/UpStatus/actions/runs/42341115265): SUCCESS no HEAD 36c8c62846c912440eb1f73858aac76ba433e8ef.
- Job 128313973038 concluído em 2026-11-07 05:31:23 UTC.

Logs:
- 16/16 checks não autenticados.
- 103/103 checks autenticados.
- Browser WebRTC call/voice/screen, áudio/vídeo remoto, mesh de três participantes e teardown.
- Rate limit: 90 aceitas, 1 HTTP 429, Retry-After 60; concorrência aprovada.
- Read receipts atômicos aprovados.
- Enrollment isolado aprovado com NULL/empty, conta configurada, token inválido/malformado/expirado/replay e consumo concorrente de um vencedor.
- Cleanup verificado.
- Test migration layout guard e metadados 3.4.31 aprovados.
- Recuperação de voz, screen share, logout gate e persistência de handles de saída aprovados nos harnesses.

Esses resultados são aprovações automatizadas dos HEADs exatos. O browser CI não equivale a teste físico de microfone, display capture ou perda real de conectividade no Tampermonkey.

### Baseline #75

[Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é aprovação histórica do HEAD 7bbf9b90. Não substitui o CI atual de #76.

### QA #82

[Validate 42339309226](https://github.com/Reekyi/UpStatus/actions/runs/42339309226) falhou no HEAD 66d01d9f72f028861b00220beee3102dd3d362d0 com VALIDATION FAILED: production updateURL mismatch em scripts/validate.mjs:26. O build 3.4.7 / TEST 3.4.7 foi concluído antes da asserção. Não enfraquecer o validador; reconciliar manifesto, builder e contrato de URL.

## 3. AUTH-03 — enrollment e limpeza de credenciais

### Convite de primeiro acesso

**CODE INSPECTION:** os templates atuais Normal e Team Lite exigem token de setup de 64 caracteres hexadecimais, derivado de 32 bytes aleatórios. O servidor armazena SHA-256, define expiração de 15 minutos e expõe a emissão em /api/setup-invite, depois de validar sessão e papel administrativo. /api/setup consome o convite por RPC atômica. A resposta pública de /api/account foi neutralizada para não revelar o estado de provisionamento.

Blobs inspecionados:
- Normal src/server/index.template.ts: 63dadc2e43eb27b45ba5c686e9bb30ca2fe269dd.
- Team Lite src/server/team-lite-index.template.ts: 45beb694b0d324c4a19d7b66a9ba8f94eb10c00b.
- Normal scripts/auth-enrollment.test.mjs: daebecdc219937a094224b799e95bc82211f636d.

No projeto isolado, consume_upstatus_setup_invite(text,text,text) é SECURITY INVOKER, usa search_path vazio e tem EXECUTE somente para service_role. A suíte CI chama a RPC diretamente com guarda explícita de projeto e opt-in de mutação.

**PENDING:** o teste de integração não exerce ainda o fluxo HTTP completo. Faltam provas de emissão por administrador via /api/setup-invite, negação HTTP 403 para usuário comum, entrega do token apenas ao administrador e verificação de não vazamento do token bruto em logs. Não há botão de emissão no painel administrativo.

**CODE INSPECTION:** a RPC usa coalesce(u.role, 'implementation_user'). NULL é normalizado, mas string vazia/whitespace não é. Isso não concede admin, mas pode deixar papel inconsistente. Recomenda-se coalesce(nullif(btrim(u.role), ''), 'implementation_user') e testes para NULL, empty e whitespace.

### Senhas legadas em armazenamento local

**CODE INSPECTION + AUTOMATED PASS dos testes VM:**
- Normal src/userscript/upstatus.user.template.js, blob 6e0d7fa2ad9c52ee6e0eba17be4164ba7b0adc6f: adiciona GM_listValues e GM_deleteValue em @grant; a limpeza remove somente chaves iniciadas pelo prefixo de produto seguido de password_. Não há passwordKey nem persistência da senha submetida.
- Team Lite team-lite/upstatus-team-lite.user.js, blob 0e0660a6abc26052e67b9b1832a75fde7bc0b06e: remove somente chaves upstatus_team_lite_password_ do sessionStorage; não há passwordKey nem persistência da senha submetida.
- scripts/auth-enrollment.test.mjs executa cada função de limpeza em VM com armazenamento falso e verifica que chaves não relacionadas permanecem intactas. O CI exato de ambos os produtos passou.

**MANUAL PENDING:** executar atualização real no Tampermonkey para confirmar compatibilidade das APIs GM e limpeza do armazenamento existente. A mudança também remove auto-preenchimento de senha; validar UX e recuperação de sessão.

### Política de senha e rate limit

Normal exige mínimo de 6 caracteres no primeiro setup, mas aceita 4 no login para compatibilidade com contas Team Lite existentes. Team Lite aceita 4 no setup e login. Isso preserva autenticação cruzada, mas permite que novas contas Team Lite escolham senha mais fraca. Recomenda-se exigir 6 no novo setup dos dois produtos e manter temporariamente o mínimo de login legado apenas para compatibilidade, com plano de migração.

**BLOCKED:** não existe rate limit distribuído específico de autenticação. upstatus_auth_rate_limits e consume_upstatus_auth_rate_limit estão ausentes tanto na produção quanto no isolado. O rate limit de signaling não protege /api/login, /api/setup ou /api/setup-invite.

## 4. Build, TEST e cutover — DEPLOY-01

**BLOCKED: não usar o artefato TEST atual para testes que possam alterar dados.**

A lista de projetos Supabase contém somente:
- Produção dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Isolado bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não há projeto oficial TEST com runtime completo de Normal/Team Lite. O isolado possui somente upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

**CODE INSPECTION:** scripts/build.mjs, blob e68bc2ad3c1ada638a384f0c07f9a8c48bc87192, define PROJECT="dlfvkawaiqduhlazsszm" e TEST_FUNCTION="upstatus-test". Portanto, o artefato dist/upstatus-test.user.js usa a função upstatus-test dentro do projeto de produção. O tópico de teste tem nome separado, mas UP_REALTIME_URL e a chave publicável também apontam para o projeto de produção. Namespace/tópico distinto não isola banco nem serviço Realtime.

A função upstatus-test está ACTIVE em produção, versão 281, verify_jwt=false, e a fonte inspecionada mantém setup público antigo. Não executar o artefato TEST contra esse backend.

Há também divergência de cutover Normal:
- release.json, blob 93caf1701ea508575c90d002c0b8c3037b34d82a, aponta updateURL para /functions/v1/upstatus/upstatus.user.js.
- O builder define CLOUD_SERVER de produção como /functions/v1/upstatus-screen-share-3-1-1-beta10.
- .github/workflows/deploy-production.yml, blob f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce, faz deploy somente de upstatus, com workflow_dispatch e guard de master/versão.

Logo, publicar somente upstatus não garante que as chamadas de API do cliente usem o backend atualizado. Reconciliar URL de atualização, CLOUD_SERVER, deploy de runtime e rollback antes de qualquer corte. Não executar deploy nesta auditoria.

## 5. Edge Functions de produção

**CODE INSPECTION / inventário:** 38 funções ACTIVE; todas retornam verify_jwt=false. Isso não prova ausência de autenticação customizada, mas amplia a importância de revisar cada rota pública.

Fontes de quatro entrypoints principais foram inspecionadas:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- upstatus-test v281, SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a.
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.

As quatro ainda possuem /api/setup público sem convite e fallback de implementation_admin baseado no nome. O projeto contém também numerosas versões beta/test/backup ACTIVE. upstatus-backup-327-pre328 v1 está ACTIVE, mas seu index.ts retornou vazio.

**NOT VERIFIED:** esta rodada não fez revisão rota-a-rota de todas as 34 variantes históricas restantes. Não desativar endpoints antigos sem mapear consumidores e rollback.

Consulta agregada SELECT-only em produção: 5 contas, 0 sem senha, 0 sem papel, 3 com papel admin. Não foi encontrada conta oficial atualmente reivindicável; isso não elimina o risco latente de provisionamento.

## 6. Supabase — migrations, RLS, grants e ACL

### Produção

- 7 migrations; última 20261027155438.
- Sem colunas setup_token_* em public.users.
- Sem consume_upstatus_setup_invite.
- Sem tabela/RPC de rate limit de signaling ou autenticação.
- Sem merge_chat_read_receipts.
- Sessão SQL: postgres, não superuser e sem membership em supabase_admin.

Nove tabelas backend-owned em public (chat_reads, messages, reactions, status_history, upstatus_profiles, upstatus_sessions, upstatus_state, upstatus_typing, users) têm RLS ativo e zero policies. A consulta de privilégios efetivos confirmou SELECT/INSERT/UPDATE/DELETE/TRUNCATE para anon e authenticated. Isso não prova leitura/escrita de linhas sem policy permissiva; TRUNCATE não é controlado por RLS e deve ser removido após validar o acesso service-only.

realtime.messages também tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

Default ACLs de postgres continuam amplos em public/storage; default ACLs de supabase_admin continuam amplos em public/graphql/graphql_public. ACL-02 depende de caminho administrativo autorizado.

### Projeto isolado

- 29 migrations; última 20261107020949.
- Colunas e RPC de setup invite presentes.
- Rate limit distribuído de signaling presente; rate limit de autenticação ausente.
- merge_chat_read_receipts presente.
- Tabelas backend-owned de signaling sem grants diretos para anon/authenticated.
- realtime.messages permanece com RLS sem policies e SELECT/INSERT/UPDATE para anon/authenticated.

As funções de broadcast isoladas enviam somente hint {op} e têm search_path=pg_catalog, public; EXECUTE foi negado a anon/authenticated e permitido a service_role. Ainda usam private=false, portanto Realtime privado não está concluído.

Default ACL de postgres em public está restrito no isolado, mas storage continua amplo. Default ACLs de supabase_admin em public/graphql/graphql_public continuam amplos.

## 7. Realtime e Security Advisor

### Produção — BLOCKED RT-01

Triggers ativos:
- upstatus_messages_broadcast → upstatus_broadcast_messages().
- upstatus_remote_state_broadcast → upstatus_broadcast_remote_state().
- upstatus_users_broadcast → upstatus_broadcast_users().

As três funções são SECURITY DEFINER, search_path=public, EXECUTE efetivo para anon/authenticated e enviam com private=false. Mensagens publicam registro completo via to_jsonb; remote-state publica sender/target/status/reason e metadados de resultados; user status publica nome/status/reason/updated_at/sync.

Security Advisor observado em 2026-11-07 05:27:56 UTC:
- 6 WARN: as três funções SECURITY DEFINER executáveis por anon e as mesmas três por authenticated.
- 10 INFO: RLS enabled sem policies.
- Performance e Health: nenhum finding.

### Isolado

- 0 WARN de segurança.
- 17 INFO de RLS sem policies.
- Performance: 4 INFO de índices unused.
- Health: nenhum finding.

O isolamento dos emissores e grants melhorou, mas tópico ainda público e realtime.messages ainda possui grants de cliente. Não confundir payload minimizado com canal privado/autorizado.

## 8. Issues e testes físicos

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): aberta, 24 comentários, 0/8 critérios marcados. Permanecem pendentes perda real de internet, reconexão sem F5, Tampermonkey, microfone/display permissions e interoperabilidade instalada Normal ↔ Team Lite.
- [#79 release checklist](https://github.com/Reekyi/UpStatus/issues/79): aberta, 86 comentários. O corpo principal ainda usa snapshot de 2026-11-03 e não foi reconciliado com os HEADs/CI atuais. O comentário mais recente 6701433511 registra ACL e CI pendente da rodada anterior; os dois candidatos agora passaram nos HEADs exatos desta rodada.

Nenhum teste físico foi executado pela auditoria.

## 9. Próximos gates

1. Criar projeto oficial TEST com runtime completo e mover o artefato TEST para fora da produção; validar HTTP, Realtime, storage e secrets isolados.
2. Reconciliar updateURL, CLOUD_SERVER, deploy do backend e rollback Normal/Team Lite.
3. Mapear consumidores das 38 Edge Functions e corrigir/retirar com plano aprovado os endpoints antigos; quatro entrypoints principais ainda confirmam setup público e fallback admin por nome.
4. Implementar rate limit distribuído e fail-closed para login/setup; testar concorrência, 429 e Retry-After.
5. Testar /api/setup-invite por HTTP como admin e não-admin; verificar token, logs, conta-alvo e role NULL/empty/whitespace.
6. Unificar mínimo de senha para novos enrollments, mantendo compatibilidade de login legado durante migração.
7. Concluir Realtime privado, grants mínimos e migração dos broadcasts em produção com plano de corte/rollback aprovado.
8. Resolver ACL-02 por caminho administrativo autorizado.
9. Executar testes físicos #78 e atualizar #79; obter reviews humanas antes de retirar Draft.

## Registro de segurança desta auditoria

- Todas as consultas SQL emitidas pela auditoria foram SELECT-only.
- Nenhuma migration aplicada pela auditoria.
- Nenhuma Edge Function alterada ou implantada.
- Nenhum secret, flag, role, grant ou policy alterado.
- Nenhum workflow iniciado, cancelado ou repetido pela auditoria.
- Nenhum script mutável executado pela auditoria; os workflows automáticos existentes executaram suas suítes com URL exata do projeto isolado e opt-in explícito de mutação.
- Nenhuma fixture criada, alterada ou removida pela auditoria.
- Nenhum deploy, merge, release ou userscript publicado.
- Nenhuma branch de engenharia alterada.
- O único artefato produzido nesta rodada é este relatório novo na branch QA; o arquivo principal e os relatórios anteriores foram preservados.
- Nenhum percentual de conclusão foi calculado.
