# UpStatus — auditoria independente de QA e release

**Data da auditoria:** 2026-11-07 15:26 BRT (18:26 UTC)  
**Repositório:** Reekyi/UpStatus  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**Projetos Supabase:** produção dlfvkawaiqduhlazsszm; laboratório isolado bfpjtfqlnypisxljoxkb

## Escopo e classificação

UpStatus é um userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Classificações usadas:
- **AUTOMATED PASS:** workflow terminou com sucesso no HEAD exato indicado.
- **CODE INSPECTION:** fonte, configuração ou catálogo foi inspecionado; não é teste de runtime.
- **MANUAL PENDING:** depende de navegador, Tampermonkey, dispositivo, rede ou aceite humano.
- **NOT VERIFIED:** não há evidência suficiente ou a evidência é de outro ambiente.
- **BLOCKED:** existe dependência ou risco que impede a aprovação de release.

Esta rodada foi somente leitura em GitHub e Supabase, exceto pela criação deste relatório novo na branch QA. Nenhum workflow foi disparado pela auditoria.

## 1. Heads reais e PRs

Metadados obtidos diretamente do GitHub em 2026-11-07:

| PR | Head SHA | Base | Ahead / behind | Estado |
|---|---|---|---:|---|
| #74 Normal | ce614f5bd96bbc4aab9c9cb136a0be8496f0d8a9 | master | 844 / 0 | Open / Draft |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | 59 / 0 | Open / Draft |
| #76 Team Lite candidate | 2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7 | team-lite-official | 313 / 0 | Open / Draft |
| #82 QA docs | 8bdcd2a1c1db814dbf1a64ca0092fdfe59ccb9c1 | master | 105 / 0 | Open / Draft |
| #84 TEST guard | 21341f331270e142bdf7584c1cdf16e6011e41b3 | develop | 30 / 0 | Open / Draft |
| #85 updater/security | 17554523ef51bafd503e74b3f1271d55f43a6eda | master | 21 / 0 | Open / Draft |

Nenhuma das seis PRs está merged. As consultas de reviews retornaram zero reviews humanas submetidas.

#75 é baseline histórico: a comparação direta confirma que #76 está 254 commits à frente de #75 e zero atrás. Não tratar #75 e #76 como duas entregas independentes para merge.

#74 tem 844 commits à frente de master. Exige revisão cuidadosa de histórico, escopo e plano de integração; a contagem de commits não é aprovação.

## 2. CI atual nos HEADs exatos

### Normal #74 — AUTOMATED PASS

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/42398965090 — SUCCESS.
- Signaling Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42398965312 — SUCCESS.
- Job Smoke: 128482407945.

O log exato confirma:
- 19/19 checks não autenticados.
- 129/129 checks autenticados.
- WebRTC de chamada, voz e compartilhamento de tela; áudio/vídeo remoto.
- Mesh autenticado de três participantes.
- Entrada/saída de salas, ownership e membership concorrentes.
- Tentativas de sala de voz persistidas antes do open; cancel-before-open tombstone; open/cancel race sem membership órfã.
- Rate limit distribuído: 90 aceitas, 1 HTTP 429 e Retry-After 60s.
- Concorrência do RPC de rate limit e dos recibos atômicos de leitura.
- Enrollment isolado: elegibilidade NULL/vazio, conta já configurada, token malformado/incorreto/expirado/replay, concorrência de um vencedor, fallback/preservação de papéis e rejeição de escalada administrativa.
- Cleanup de usuários, sessões, salas, memberships e eventos temporários confirmado pelo workflow.

O HEAD ce614f5 é um commit documental que registra a limitação de entrega Realtime no laboratório; não altera o runtime candidato.

### Team Lite #76 — AUTOMATED PASS

- Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/42386904302 — SUCCESS.
- Job: 128446098075.

O log exato confirma:
- 103/103 checks autenticados.
- WebRTC de chamada, voz e tela; áudio/vídeo remoto.
- Mesh de três participantes e teardown.
- Recuperação de salas, ownership, membership, cancel-before-open e persistência durável de tentativas.
- Rate limit distribuído: 90 aceitas, 1 HTTP 429 e Retry-After 60s.
- Recibos atômicos e enrollment isolado.
- Atualizador 3.4.31, sintaxe dos portais Lucca/Ycaro, isolamento de sessões e regressões de logout/offline.
- Cleanup de usuários, sessões, salas, memberships e eventos temporários confirmado.

O último commit da #76, 2e0ff694, corrige a asserção de política de senha para verificar o template Team Lite efetivamente usado. Ele remove a comparação automática com uma cópia Normal antiga presente no branch Team Lite. Assim, a paridade de política entre produtos é confirmada por inspeção dos templates e por testes separados, não por um teste automatizado de comparação entre branches.

Política dos candidatos: nova senha com mínimo de 6 caracteres; login legado com mínimo de 4 em ambos.

### Baseline #75 — PASS histórico

- Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/41674353127 — SUCCESS histórico.
- O resultado é do baseline antigo; #76 é o candidato atual.

### TEST guard #84 — AUTOMATED PASS, deploy NOT VERIFIED

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/42387042361 — SUCCESS.
- Job: 128446510950.

Passaram os testes de:
- Build TEST com destino inerte por padrão e rejeição de produção/laboratório.
- Preflight de project ref, organização, ACTIVE_HEALTHY e database host.
- Workflow manual-only, checkout do SHA do dispatch, verificação de develop e escopo do token.
- Contrato de upload assinado no cliente.

O workflow de deploy não foi dispatchado. A Management API não foi chamada em deploy real. O resultado é validação automatizada do guard, não validação de implantação.

### Updater/security #85 — AUTOMATED PASS com mocks

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/42386047749 — SUCCESS.
- Job: 128443518217.

O log confirma:
- Build Normal/TEST 3.4.7.
- Teste do cliente de upload assinado.
- Teste do servidor em Node VM com mocks de Storage/DB.
- Regressões de chat: anexos staged, upload assinado, filename/legenda, permissões por papel, preview de links, screen-share, notificações e indicadores de não lidas.

Não houve upload real no Supabase Storage.

**Dependência de integração:** a branch #85 é baseada em master. Seu server template usa autorização administrativa baseada no papel armazenado e corrige o contrato UpdateURL/DownloadURL via release.json, mas ainda conserva o setup antigo e não contém o fluxo setup-invite da #74. Não integrar #85 isoladamente como se já carregasse AUTH-03. A combinação/rebase precisa preservar o convite de primeiro acesso da #74 e o trabalho de Team Lite.

### QA #82 — VALIDATE FAIL herdado de master

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/42397178890 — FAILURE.
- Job: 128476950309.
- O build produziu Normal/TEST 3.4.7 e falhou em scripts/validate.mjs com “production updateURL mismatch”.

A #85 contém a correção do validador para comparar UpdateURL/DownloadURL com release.json, mas essa correção ainda não está em master. Não enfraquecer o validador para deixar a PR documental verde.

## 3. Workflow TEST ativo em develop

**BLOCKED / AÇÃO NECESSÁRIA**

Branch develop observada pelo base SHA da #84: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6.

Arquivo ativo:
https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml

Blob SHA: d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839.

O arquivo ativo contém:
- workflow_dispatch e push em develop;
- secret compartilhado SUPABASE_PROJECT_ID;
- Supabase CLI latest;
- deploy de upstatus-test;
- ausência de verificação independente da identidade do projeto de destino.

O valor do secret não foi lido. Não há evidência para afirmar qual é o destino efetivo; a falha é a ausência de uma garantia de isolamento.

A #84 substitui esse desenho por workflow_dispatch somente, checkout de github.sha, verificação de refs/heads/develop, comparação do SHA executado com GITHUB_SHA, vars.SUPABASE_TEST_PROJECT_ID, rejeição de produção e laboratório, preflight de organização/status/database host, CLI 2.122.1 e deploy limitado a upstatus-test.

A correção continua em PR Draft. Não executar o workflow ativo de develop até integrar/revisar a proteção.

## 4. Supabase — projetos e migrations

A listagem da organização retornou somente dois projetos:

| Ambiente | Project ref | Estado | PostgreSQL |
|---|---|---|---|
| Produção | dlfvkawaiqduhlazsszm | ACTIVE_HEALTHY | 17.11.0.002 |
| Laboratório isolado | bfpjtfqlnypisxljoxkb | ACTIVE_HEALTHY | 17.11.0.003 |

Não existe um terceiro projeto TEST full-product.

Migrations:
- Produção: 7 registros, última 20261027155438.
- Laboratório: 34 registros, última 20261107165942 pin_empty_search_path_trigger_broadcasts_test.

O laboratório contém signaling/auth e duas Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não contém o backend completo Normal/Team Lite nem buckets chat-images/profile-images.

O builder Team Lite gera upstatus-team-lite, mas não gera upstatus-team-lite-test. O workflow TEST da #84 implanta somente upstatus-test. O runtime TEST próprio do Team Lite permanece BLOCKED.

## 5. Signaling autenticado e issue #78

A inspeção dos dois clientes confirma:
- Normal e Team Lite persistem tentativa de voz vinculada ao membro antes de chamar /room/open.
- O cancelamento usa /room/cancel-open e o servidor de teste usa RPCs open/cancel com tombstone.
- A mesma versão do adapter signaling-transport.mjs está presente nos dois branches.
- Os testes Normal e Team Lite cobrem reload, retry, falha de armazenamento, cancel-before-open e não vazamento de token no estado persistido.

**Limite crítico:** em ambos os clientes, signaling_transport_enabled é lido do GM storage com default false. O transporte autenticado é opt-in. Quando desativado, os clientes continuam usando o caminho Realtime legado. Os testes CI ativam o transporte no ambiente isolado; isso não prova que o caminho padrão de produção deixou de usar broadcasts públicos.

Issue #78:
https://github.com/Reekyi/UpStatus/issues/78

Continua OPEN, 26 comentários, 0/8 caixas de aceite marcadas. Os testes automatizados melhoraram, mas faltam testes físicos no Tampermonkey:
- queda real de internet por aproximadamente 10 segundos;
- retorno sem F5 e reentrada na sala;
- iniciar/receber nova chamada depois da reconexão;
- microfone e captura de tela reais;
- participantes que permaneceram online;
- ausência de áudio duplicado, peers órfãos e pollers duplicados;
- interoperabilidade entre instalações Normal e Team Lite.

A regra funcional de voice room permanece canal aberto, sem convite nem aceitação. Os testes atuais confirmam que o open join não cria convite pendente.

## 6. Produção — Edge Functions e autenticação

Inventário:
- 38 Edge Functions ACTIVE.
- Todas reportam verify_jwt=false. Isso não prova ausência de autenticação: os runtimes principais validam sessão customizada. Exige inventário por rota.
- 36 nomes contêm test/beta/backup. Não assumir que são descartáveis; mapear consumidores e rollback antes de qualquer desativação.

Quatro runtimes principais inspecionados:

| Função | Versão | SHA de runtime |
|---|---:|---|
| upstatus | v480 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd |
| upstatus-test | v281 | 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a |
| upstatus-team-lite | v15 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb |
| upstatus-screen-share-3-1-1-beta10 | v6 | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 |

As quatro fontes implantadas ainda expõem GET /api/account com needsSetup, POST /api/setup pelo fluxo antigo e fallback administrativo por nome quando o papel está vazio. A produção não contém setup_token_hash/setup_token_expires_at/setup_token_issued_by nem consume_upstatus_setup_invite.

Snapshot agregado SELECT em public.users:
- 5 contas;
- 0 sem senha;
- 0 sem papel;
- 3 implementation_admin.
- 262 mensagens.

Não há conta atualmente reivindicável nesse snapshot. O risco é latente para novas contas provisionadas sem senha/papel.

Produção não contém:
- RPC consume_upstatus_setup_invite;
- RPC consume_upstatus_signal_rate_limit ou tabela correspondente;
- RPC merge_chat_read_receipts;
- tabela upstatus_signal_voice_room_attempts;
- rate limiter específico de autenticação.

No laboratório, os campos setup_token_* e consume_upstatus_setup_invite existem; também existem a tabela/RPC de rate limit de signaling, merge_chat_read_receipts e a tabela de voice-room attempts. Não existe auth-rate-limit RPC/tabela no laboratório.

O runtime test-auth-enrollment.mjs usa service_role e chama diretamente a RPC via REST. O log CI confirma token incorreto, malformado, expirado, replay, concorrência e papéis. Isso não testa o fluxo HTTP completo /api/setup-invite → entrega privada → /api/setup, nem HTTP 403 para emissor não administrador. AUTH-03 permanece parcialmente validado; AUTH-02 permanece ausente.

## 7. RLS, grants, SECURITY DEFINER e default ACLs

### Produção

Security Advisor:
- 3 WARN para SECURITY DEFINER executável por anon;
- 3 WARN para SECURITY DEFINER executável por authenticated;
- 10 INFO de RLS habilitado sem policy.
- Performance e Health sem findings.

As três funções:
- upstatus_broadcast_messages()
- upstatus_broadcast_remote_state()
- upstatus_broadcast_users()

Continuam SECURITY DEFINER, search_path=public, EXECUTE efetivo para anon/authenticated/service_role e triggers habilitados.

O broadcast de mensagens publica OLD/NEW completo por to_jsonb, incluindo conteúdo e metadados. Remote-state publica metadados de comandos/resultados. User-status publica nome/status/reason/updated_at/sync. Todos usam realtime.send com private=false.

Nove tabelas backend-owned em public têm RLS, zero policies e privilégios efetivos de anon/authenticated para SELECT/INSERT/UPDATE/DELETE/TRUNCATE. upstatus_visual_config não tem esses grants. Zero policies não prova acesso às linhas via PostgREST, mas TRUNCATE não é protegido por RLS e os grants são excessivos.

realtime.messages tem RLS, zero policies e SELECT/INSERT/UPDATE efetivos para anon/authenticated.

Default ACLs de produção:
- postgres em public e storage;
- supabase_admin em public, graphql e graphql_public;
- defaults concedem a anon/authenticated privilégios de tabela amplos (incluindo DELETE/INSERT/MAINTAIN/REFERENCES/SELECT/TRIGGER/TRUNCATE/UPDATE), EXECUTE em funções e SELECT/UPDATE/USAGE em sequences.

### Laboratório

A migration 20261107165942 está no ledger. As três funções continuam SECURITY DEFINER por serem trigger functions, mas têm search_path vazio, EXECUTE negado para anon/authenticated e permitido para service_role. Os triggers permanecem ativos. Advisor isolado: 0 WARN, 17 INFO de RLS; Performance tem quatro INFO de índices não utilizados; Health sem findings.

Os payloads de broadcast no laboratório foram reduzidos a {op}, mas ainda usam private=false. realtime.messages permanece com RLS, zero policies e grants de SELECT/INSERT/UPDATE para anon/authenticated.

Default ACLs do laboratório melhoraram para postgres/public, mas continuam amplos para postgres/storage e supabase_admin em public/graphql/graphql_public.

## 8. Realtime — entrega não comprovada no laboratório

Consulta pg_inherits:
- produção: parent realtime.messages com 7 partições filhas;
- laboratório: parent realtime.messages com 0 partições filhas.

O probe transacional anterior no laboratório executou os triggers, mas realtime.send registrou warning de partição ausente e não inseriu mensagem. O warning foi absorvido pela implementação da função; a transação não provou entrega.

Logo:
- configuração de search_path, grants e bindings do trigger está validada no laboratório;
- entrega trigger → realtime.messages → WebSocket permanece NOT VERIFIED;
- autorização privada também não está implementada; private=false permanece nos dois ambientes.

Não criar partições manualmente no schema gerenciado realtime. É necessário projeto TEST suportado com infraestrutura Realtime funcional e teste de entrega/autorização.

A migration de produção 20261107170000_pin_empty_search_path_trigger_broadcasts.sql existe na #74, blob 650efd2ab325ef3924ce9e95e83b72c0510a3f3f, mas não está no ledger de produção.

## 9. Storage e anexos

Buckets de produção:
- chat-images: public=true, limite 20 MiB;
- profile-images: public=true, limite 20 MiB.

A consulta de pg_policies não encontrou policy explícita em storage.objects. Buckets públicos permitem leitura por URL pública. Upload assinado protege a escrita, não torna o download privado.

#85 passou testes mockados de cliente/servidor, sem upload real. O laboratório não possui os buckets. Decidir se anexos de chat/perfil devem ser públicos por contrato ou migrar para buckets privados com URLs de download assinadas. Não declarar Storage E2E aprovado.

## 10. Issues

- #78 permanece OPEN, 0/8 critérios marcados; aceitação física MANUAL PENDING.
- #79 permanece OPEN, 97 comentários. O corpo principal ainda mostra revalidação de 12:23 BRT. O comentário de engenharia mais recente consultado é 13:56 BRT e já está desatualizado em relação aos workflows #74/#76/#84/#85 concluídos nesta auditoria. Reconciliar heads e evidências sem marcar gates físicos como concluídos.

## 11. Bloqueadores e próximos gates

1. **Crítico:** integrar/revisar a proteção do workflow TEST antes de qualquer execução do workflow atual em develop.
2. **Bloqueado:** provisionar TEST full-product independente, com identidade, host, secrets, Storage e Realtime próprios.
3. **Bloqueado:** gerar runtime e workflow TEST específicos para Team Lite.
4. **Crítico:** coordenar #74 AUTH-03 com #85 updater/admin/upload; #85 isoladamente ainda conserva setup antigo.
5. **Crítico:** migrar setup legado de produção para convite one-time; completar teste HTTP real e criar rate limit distribuído de login/setup.
6. **Crítico:** remover full-row broadcasts, projetar JWT/policies ou transporte server-mediated e migrar para autorização privada; validar entrega real em TEST.
7. **Crítico:** revogar grants de tabelas/funções e corrigir default ACLs com plano de owner/admin, validação e rollback.
8. **Pendente:** decidir privacidade de buckets, testar upload/download real e alinhar limites do fluxo de áudio.
9. **Pendente:** inventariar 36 funções test/beta/backup e consumidores antes de qualquer desativação.
10. **Manual pending:** concluir os oito critérios físicos da #78.
11. **Pendente:** reconciliar #79, corrigir a validação herdada de master sem enfraquecê-la e obter reviews humanas.

## 12. Veredito

- #74 Normal: **AUTOMATED PASS** no HEAD ce614f5; Validate e Smoke completos.
- #76 Team Lite: **AUTOMATED PASS** no HEAD 2e0ff694.
- #75: **PASS histórico**, baseline supersedido por #76.
- #84: **AUTOMATED PASS** do guard; deploy real não executado.
- #85: **AUTOMATED PASS** de mocks/validações; Storage real não testado e integração com AUTH-03 da #74 pendente.
- #82: **VALIDATE FAIL** por asserção herdada de master.
- #78: **MANUAL PENDING**, 0/8 critérios marcados.
- Produção: **BLOCKED** por setup legado, broadcasts públicos, grants/default ACLs e ausência de cutover coordenado.
- TEST full-product: **BLOCKED**.
- Entrega Realtime E2E no laboratório: **NOT VERIFIED**.

Não atribuir percentual. CI de subsistema isolado, inspeção estática, catálogo de produção, runtime isolado, aceitação física e prontidão de release são estados distintos.

## Registro de segurança

Todas as consultas SQL desta auditoria foram SELECT-only. Nenhuma migration, deploy, alteração de Edge Function, secret, flag, role, grant, policy, ACL, fixture, merge, release ou publicação foi realizada. Nenhum workflow foi iniciado/rerun manualmente. Nenhuma branch de engenharia foi modificada.

A única escrita desta rodada é este novo relatório na branch QA dedicada. O arquivo principal docs/RELEASE_READINESS.md foi preservado no blob SHA 1ae48aab678a06b4ff75d061d2355a6449cbe1e0. O relatório anterior docs/audits/2026-11-07-upstatus-qa-audit-1730-utc.md foi preservado no blob SHA d68f1911c2e6f77f705a1e4eff0ca9fe4464c752.

## Evidências principais

- PR #74: https://github.com/Reekyi/UpStatus/pull/74
- PR #75: https://github.com/Reekyi/UpStatus/pull/75
- PR #76: https://github.com/Reekyi/UpStatus/pull/76
- PR #82: https://github.com/Reekyi/UpStatus/pull/82
- PR #84: https://github.com/Reekyi/UpStatus/pull/84
- PR #85: https://github.com/Reekyi/UpStatus/pull/85
- Issue #78: https://github.com/Reekyi/UpStatus/issues/78
- Issue #79: https://github.com/Reekyi/UpStatus/issues/79
- Normal Validate: https://github.com/Reekyi/UpStatus/actions/runs/42398965090
- Normal Signaling Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42398965312
- Team Lite Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/42386904302
- TEST guard Validate: https://github.com/Reekyi/UpStatus/actions/runs/42387042361
- Updater/security Validate: https://github.com/Reekyi/UpStatus/actions/runs/42386047749
- QA Validate failure: https://github.com/Reekyi/UpStatus/actions/runs/42397178890
- Advisor SECURITY DEFINER anon: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- Advisor SECURITY DEFINER authenticated: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Advisor RLS without policy: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
