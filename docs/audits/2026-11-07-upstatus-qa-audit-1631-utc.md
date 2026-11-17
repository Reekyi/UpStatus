# Auditoria independente UpStatus — 2026-11-07 16:31 UTC (13:31 BRT)

## Escopo e método

Repositório: [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus).  
Produção Supabase: `dlfvkawaiqduhlazsszm`.  
Laboratório isolado: `bfpjtfqlnypisxljoxkb`.

Esta auditoria trata o UpStatus como userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly. O trabalho foi feito por inspeção read-only do GitHub, workflows existentes, fontes das Edge Functions implantadas, inventário de projetos/migrations/funções, Supabase Advisors e consultas SQL exclusivamente SELECT.

O arquivo `docs/RELEASE_READINESS.md` foi lido primeiro nesta rodada. Seu blob SHA permaneceu `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`. O HEAD da branch QA antes deste relatório era `e57177325be8294533d5c2beb332124bff063a4e`, igual ao HEAD da PR #82. O documento principal não foi alterado.

Classificações:
- **AUTOMATED PASS:** workflow concluído com sucesso no SHA exato indicado.
- **CODE INSPECTION:** fonte, configuração ou catálogo inspecionado; não equivale a teste de runtime.
- **MANUAL PENDING:** exige navegador real, Tampermonkey, dispositivo ou aceite humano.
- **BLOCKED:** dependência ou risco que impede o gate de release.
- **NOT VERIFIED:** não há evidência suficiente.

## 1. Heads e governança GitHub

| PR | HEAD completo | Base | Ahead / behind | Estado |
|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `27e8fdc4986f583a37fb6b0c5d2cf8df1bac3e02` | master | 843 / 0 | Open, Draft |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 / 0 | Open, Draft |
| [#76 Team Lite candidate](https://github.com/Reekyi/UpStatus/pull/76) | `2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7` | team-lite-official | 313 / 0 | Open, Draft |
| [#82 QA documental](https://github.com/Reekyi/UpStatus/pull/82) | `e57177325be8294533d5c2beb332124bff063a4e` | master | 101 / 0 | Open, Draft |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | develop | 30 / 0 | Open, Draft |
| [#85 updater/security](https://github.com/Reekyi/UpStatus/pull/85) | `17554523ef51bafd503e74b3f1271d55f43a6eda` | master | 21 / 0 | Open, Draft |

Comparação direta confirma que #76 está 254 commits à frente de #75 e zero atrás. #75 é o baseline histórico; #76 é o candidato Team Lite atual. Todas as seis PRs continuam abertas e Draft. As consultas de reviews retornaram zero reviews submetidas, inclusive #75.

A API de branches reportou `protected=false` para master, develop e team-lite-official. Master e develop, portanto, não têm proteção de branch reportada pelo GitHub nesta consulta. Não foram alteradas regras, proteções ou permissões.

## 2. CI exato por candidato

### Normal #74 — AUTOMATED PASS

- [Validate 42389921918](https://github.com/Reekyi/UpStatus/actions/runs/42389921918): SUCCESS no HEAD `27e8fdc`.
- [Signaling Smoke 42389921913](https://github.com/Reekyi/UpStatus/actions/runs/42389921913): SUCCESS no mesmo HEAD.

O log do Smoke confirmou:
- 19/19 verificações não autenticadas.
- 129/129 verificações autenticadas.
- WebRTC de chamada individual, voz e screen-share, com entrega de tracks remotas.
- Convite dinâmico, roster/fanout e mesh autenticado de três participantes.
- Recuperação de salas abertas, transferência de owner, tombstones de cancelamento e corridas de open/leave/cancel.
- Rate limit distribuído: 90 aceitas, uma HTTP 429 e `Retry-After: 60s`.
- Concorrência de read receipts.
- Enrollment isolado: elegibilidade NULL/empty, conta configurada, token malformado/incorreto/expirado/replay, um único vencedor concorrente, fallback de papel, preservação de papel explícito e não escalada de papel administrativo com espaços.
- Limpeza das fixtures verificada pelo workflow.

O Validate construiu PROD 3.4.7 / TEST 3.4.7, passou pelo guard de destino, layout de migrations, testes estáticos de enrollment, regressões de chat e updater.

### Team Lite #76 — AUTOMATED PASS

- [Candidate Checks 42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302): SUCCESS no HEAD `2e0ff694`.

O log confirmou:
- 16/16 verificações não autenticadas.
- 103/103 verificações autenticadas.
- WebRTC call/voice/screen, entrega de áudio/vídeo remoto e mesh de três participantes.
- Recuperação durável de voice rooms, ownership/membership, saída/reentrada e concorrência.
- Rate limit 90/1 com HTTP 429 e Retry-After.
- Read receipts atômicos e enrollment isolado.
- Atualizador 3.4.31, sintaxe de userscript/portais Lucca/Ycaro, isolamento de sessão de convidado.
- Testes de leave/retry/logout, recuperação offline/online e limpeza das fixtures.

Houve uma falha intermediária no teste de compatibilidade cross-branch: o teste verificava um template Normal antigo copiado no branch Team Lite, em vez do template Normal candidato da #74. A asserção foi corrigida; o HEAD atual passou. A paridade de senha entre os dois templates está confirmada por inspeção, mas a suíte não compara automaticamente os dois branches.

### Baseline #75 — PASS histórico

[Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) passou no HEAD inalterado `7bbf9b90`. É evidência histórica do baseline, não substitui os resultados do candidato atual #76.

### TEST guard #84 — AUTOMATED PASS, sem execução de deploy

[Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361) passou no HEAD `21341f33`, incluindo:
- TEST build target guard.
- Metadata guard do projeto dedicado.
- Teste de escopo do token, workflow manual-only e pinagem do SHA de dispatch.
- Regressão de upload assinado do cliente.
- Validate geral.

O workflow não foi despachado e a Management API real não foi chamada. Portanto, o preflight de destino foi validado por testes/inspeção, não por execução real de deploy.

### Updater/security #85 — AUTOMATED PASS com mocks

[Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749) passou no HEAD `17554523`.

O log confirmou:
- Contrato de upload assinado no cliente.
- Teste de servidor em Node VM com Storage/DB mocks.
- Regressão de chat: anexos staged, upload assinado, filename separado da legenda, autorização por papel, link preview, screen-share, notificações e unread indicators.
- Build PROD/TEST 3.4.7.

Não houve upload real no Supabase Storage. O laboratório não tem os buckets de chat/perfil.

### QA #82 — FAIL herdado do baseline master

[Validate 42387782891](https://github.com/Reekyi/UpStatus/actions/runs/42387782891) falhou em `VALIDATION FAILED: production updateURL mismatch`.

A PR #85 contém a correção do validador: compara UpdateURL/DownloadURL e URL manual com `release.json.scriptUrl`, em vez da antiga suposição fixa. A correção permanece na #85 Draft e não está integrada em master. A falha da #82 não prova, por si só, que o artefato atual tenha URL incorreta; é uma falha do validador herdado. Não foi removida nem enfraquecida nenhuma asserção.

## 3. Deploy TEST e isolamento — BLOQUEADOR

Branch develop atual: `6b33e1e26ad105143f00372ae6d0f2fa52df60d6`.  
Workflow ativo: [develop/.github/workflows/deploy-test.yml](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml).  
Blob SHA: `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`.

A fonte ativa ainda contém:
- `push` para develop em caminhos de runtime/build/workflow.
- `workflow_dispatch`.
- `secrets.SUPABASE_PROJECT_ID` como destino.
- Supabase CLI `latest`.
- Deploy de `upstatus-test`.
- Ausência de allowlist/validação de project ref, organização, status ou database host.

O valor do secret não foi lido; não é possível afirmar qual projeto ele aponta. O risco é confirmado pelo contrato do workflow: ele não garante que o destino seja um TEST isolado.

A PR #84 contém a correção: manual-only, checkout de `github.sha`, comparação com `GITHUB_SHA`, branch develop obrigatória, `vars.SUPABASE_TEST_PROJECT_ID`, rejeição de produção e laboratório, metadata/database-host preflight, CLI pinada e token limitado aos steps necessários. A correção passou no Validate, mas permanece Draft e não está em develop. Não execute o workflow ativo.

### Projetos Supabase disponíveis

A organização possui somente dois projetos:
- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe projeto TEST full-product independente.

O laboratório possui 33 registros de migrations e duas funções: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Ele é o laboratório de signaling/auth/RPC, não o backend completo Normal/Team Lite.

O builder Normal gera `upstatus` e `upstatus-test`. O builder Team Lite gera `upstatus-team-lite`, mas não gera `upstatus-team-lite-test`; o workflow candidato #84 implanta apenas `upstatus-test`. Falta runtime e workflow TEST próprios para Team Lite.

## 4. Normal: distribuição e API legada

Inspeção do builder #74, blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`:
- Distribuição/update URL: `/functions/v1/upstatus/upstatus.user.js`, derivada de `release.json.scriptUrl`.
- API CLOUD_SERVER de produção: `/functions/v1/upstatus-screen-share-3-1-1-beta10`.

Essa separação é intencional para manter compatibilidade durante a transição; não deve ser rotulada isoladamente como bug. O gate real é um cutover coordenado, com versão, API, autenticação, Realtime, Storage e rollback alinhados. A função beta10 continua implantada e é o backend de API legado. Não trocar o endpoint apenas para satisfazer o validador antigo.

## 5. AUTH-03 e AUTH-02

### AUTH-03 candidato — CODE INSPECTION + AUTOMATED PASS isolado

Os templates Normal e Team Lite candidatos implementam convite de primeiro acesso:
- Token aleatório de 32 bytes (256 bits).
- Persistência do hash SHA-256, validade de 15 minutos.
- Emissão protegida por papel administrativo armazenado.
- Consumo atômico pela RPC `consume_upstatus_setup_invite`.
- Replay, token malformado/incorreto/expirado e concorrência cobertos pelo teste runtime isolado.
- NULL/empty/whitespace role recebe `implementation_user`; papel preenchido é preservado literalmente, evitando promover ` implementation_admin ` a admin.
- Novas senhas exigem seis caracteres; login legado aceita quatro nos dois candidatos.

O teste runtime `scripts/test-auth-enrollment.mjs` usa service_role e chama REST/RPC diretamente. Não testa a emissão pelo endpoint HTTP real, HTTP 403 para emissor não-admin, entrega privada do token ou fluxo completo `/api/setup-invite` → entrega privada → `/api/setup`. AUTH-03 não está fechado como integração HTTP.

### AUTH-02 — BLOCKED / AUSENTE

Não existe auth-specific distributed rate limiter nos candidatos nem nos dois bancos. O limiter de signaling não protege login/setup/emissão de convite.

### Produção ainda não recebeu AUTH-03

A produção não possui colunas setup-token em users nem `consume_upstatus_setup_invite`. As quatro funções centrais implantadas continuam com rota de setup pública e fallback administrativo por nome. Não há auth limiter.

Há incompatibilidade concreta na produção: o Normal v480 exige senha mínima de 6 caracteres no login; Team Lite v15 exige 4. Como os produtos compartilham o armazenamento de contas, uma conta com senha de 4–5 caracteres pode autenticar no Team Lite e ser recusada pelo Normal antes da verificação de hash. Os candidatos corrigem o contrato para setup=6/login=4 nos dois produtos, mas isso ainda não foi implantado.

## 6. Supabase produção — Edge Functions e dados agregados

Produção: 7 migrations até `20261027155438`; 38 Edge Functions ACTIVE. Todas as 38 reportam `verify_jwt=false`. Isso não prova ausência de autenticação: as funções principais usam sessão customizada, mas o gateway não valida JWT Supabase e cada rota precisa de inventário próprio.

36 das 38 funções ativas têm nomes de test/beta/backup. Não foram desativadas; algumas podem ter consumidores legados. É necessária uma matriz de owner, endpoint, tráfego/dependência e plano de retirada antes de qualquer desativação.

Funções centrais:
- `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-test` v281, SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`.
- `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.

Inspeção das quatro fontes implantadas confirmou:
- Rota de setup antiga presente.
- Rota setup-invite ausente.
- RPC de consumo de convite ausente.
- Fallback por allowlist de nomes presente.
- Auth rate limiter ausente.
- CORS Access-Control-Allow-Origin wildcard.
- `verify_jwt=false` no gateway.

Consulta agregada de `public.users`: 5 contas, 0 password_hash NULL/vazio, 0 role NULL/vazio e 3 admins explícitos. Não há conta atualmente reivindicável nesse snapshot; o risco é latente para futuras contas provisionadas pelo caminho antigo.

Produção não possui as RPCs/tabelas de setup invite, auth rate limit, signaling rate limit ou merge atômico de chat receipts. Nenhuma migration candidata foi aplicada.

## 7. RLS, grants, SECURITY DEFINER e Realtime

### Produção — BLOQUEADOR RT-01

SQL SELECT-only confirmou três triggers habilitados:
- `upstatus_messages_broadcast` → `upstatus_broadcast_messages()`.
- `upstatus_users_broadcast` → `upstatus_broadcast_users()`.
- `upstatus_remote_state_broadcast` → `upstatus_broadcast_remote_state()`.

As três funções são SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated/service_role e enviam Realtime com `private=false`.

A função de mensagens transmite OLD/NEW completo por `to_jsonb`, incluindo texto e metadados de anexos. Remote-state transmite sender/target/status/reason/error e timestamps. User-status transmite nome/status/reason/update metadata. O broadcast público não é neutralizado pelo RLS da tabela de origem.

Security Advisor observado em `2026-11-07T16:32:02Z`:
- 3 WARN: SECURITY DEFINER executável por anon.
- 3 WARN: SECURITY DEFINER executável por authenticated.
- 10 INFO: RLS habilitado sem policy.
Performance e Health Advisor de produção sem findings.

Nove tabelas backend-owned public mantêm oito privilégios efetivos para anon e authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. `upstatus_visual_config` não tem grants de cliente. RLS com zero policies não prova acesso às linhas, mas os grants são superfície excessiva; TRUNCATE não é protegido por RLS.

`realtime.messages`: RLS true, zero policies, anon/authenticated com SELECT/INSERT/UPDATE. Default ACLs de postgres e supabase_admin continuam amplas em public/storage/graphql e schemas relacionados. ACL-02 exige owner/admin autorizado; não foi alterado.

### Laboratório isolado

As RPCs `consume_upstatus_setup_invite`, `consume_upstatus_signal_rate_limit` e `merge_chat_read_receipts` são SECURITY INVOKER, search_path vazio e EXECUTE restrito a service_role.

Tabelas backend-owned não têm grants de cliente. As três funções broadcast isoladas estão com EXECUTE negado a anon/authenticated e payload minimizado a `{op}`; contudo, continuam enviando para canais `private=false`. `realtime.messages` ainda tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

Security Advisor isolado: zero WARN, 17 INFO de RLS sem policy. Performance Advisor: quatro INFO de índices não utilizados. Health Advisor sem findings.

### Migration candidata de search_path

#74 adiciona `supabase/migrations/20261107170000_pin_empty_search_path_trigger_broadcasts.sql` (blob `650efd2ab325ef3924ce9e95e83b72c0510a3f3f`) e contraparte de teste (blob `65d390f8145b9363bf8ac37f2dca670f0493d13e`). O Validate passou no guard de layout. A migration não aparece no ledger de produção nem no ledger isolado, cuja última entrada é `20261107061242`. Portanto, a mudança de search_path vazio ainda é **CODE INSPECTION/STATIC PASS**, não aplicação ou teste de trigger em banco. Ela também não remove payload completo nem torna os canais privados.

## 8. Storage e anexos

Produção tem buckets `chat-images` e `profile-images` com `public=true` e limite de 20 MiB. O bucket de chat permite imagens, vídeo, áudio e documentos; o de perfil permite imagens.

#85 passou regressões mockadas do cliente e servidor para upload assinado, validação de bucket/MIME/tamanho/origem/path/token e compatibilidade de avatar. Não houve upload real porque o laboratório não possui os buckets. Upload assinado controla a escrita, mas não privatiza leitura de bucket público: quem obtiver a URL pública pode ler o objeto. Se documentos de chat forem confidenciais, decidir explicitamente entre manter URLs públicas por contrato ou migrar para buckets privados e download assinado.

## 9. Issues e aceite manual

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios físicos marcados. Falta queda real de internet por ~10s, recuperação sem F5, reentrada, novas chamadas, áudio bidirecional, permissões físicas de microfone/display e interoperabilidade instalada Normal ↔ Team Lite. Chromium/VM não substitui Tampermonkey real.
- [#79 release](https://github.com/Reekyi/UpStatus/issues/79): OPEN. O corpo principal continua com snapshot 12:23 BRT e lista #76 em HEAD antigo. O último comentário de engenharia ainda reporta Normal Smoke como pendente; agora o run 42389921913 terminou SUCCESS. O issue precisa ser reconciliado com os heads e resultados atuais.

## 10. Próximos gates

1. Integrar e revisar a proteção do deploy TEST antes de qualquer execução; develop continua com workflow inseguro.
2. Provisionar projeto TEST full-product, independente de produção e do laboratório de signaling.
3. Criar runtime/workflow TEST próprios para Team Lite.
4. Planejar cutover/rollback Normal e Team Lite sem quebrar o endpoint API legado.
5. Completar testes HTTP de emissão/consumo de setup-invite e 403 para não-admin.
6. Implementar rate limit distribuído, fail-closed, para login/setup/convites.
7. Migrar produção do setup público/fallback por nome, com compatibilidade de senha e rollback.
8. Remover full-row broadcasts, projetar autorização privada ou transporte substituto e reduzir grants.
9. Resolver default ACLs por caminho administrativo autorizado.
10. Validar upload real em Storage TEST e decidir política de leitura pública/privada.
11. Completar os oito critérios físicos de #78.
12. Reconciliar #79 e obter reviews humanas.

## Veredito

- #74 Normal: AUTOMATED PASS no HEAD exato.
- #76 Team Lite: AUTOMATED PASS no HEAD exato.
- #75: PASS histórico do baseline.
- #84: Validate PASS; deploy real não executado e correção ainda não integrada em develop.
- #85: Validate PASS com mocks; upload real não executado.
- #82: FAIL por asserção antiga herdada de master; não prova erro real no UpdateURL.
- Produção: BLOCKED por setup legado, broadcasts públicos, grants/default ACLs e ausência das migrations/RPCs candidatas.
- Manual: PENDING, #78 permanece 0/8.

Não há percentual de conclusão. CI, inspeção estática, catálogo de produção, runtime isolado e aceite físico são evidências diferentes.

## Registro de segurança

- Todas as consultas SQL foram SELECT-only.
- Nenhuma migration, deploy, alteração de Edge Function, secret, flag, role, grant, policy ou ACL.
- Nenhuma fixture criada, alterada ou removida pela auditoria.
- Nenhum workflow disparado, repetido ou cancelado manualmente.
- Nenhum merge, release ou publicação.
- Nenhuma branch de engenharia alterada.
- A única escrita desta rodada é este novo arquivo na branch QA dedicada.
