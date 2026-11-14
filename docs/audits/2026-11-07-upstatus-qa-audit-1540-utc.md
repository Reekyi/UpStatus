# Auditoria independente UpStatus — 2026-11-07 12:42 BRT (15:42 UTC)

## Escopo e método

Auditoria read-only do GitHub \`Reekyi/UpStatus\` e dos projetos Supabase \`dlfvkawaiqduhlazsszm\` (produção) e \`bfpjtfqlnypisxljoxkb\` (laboratório isolado). Primeiro foi lido \`docs/RELEASE_READINESS.md\` na branch QA; blob SHA confirmado: \`1ae48aab678a06b4ff75d061d2355a6449cbe1e0\`.

Nenhum deploy, merge, migration, release, alteração de secret/flag/role/grant/policy/ACL ou publicação foi executado pela auditoria. Todas as consultas SQL foram SELECT-only. Nenhum script de teste mutável foi executado manualmente. Os testes mutáveis observados ocorreram nos workflows de PR, com URL do projeto isolado e variáveis de allowlist explícitas.

## 1. Heads atuais e PRs

Heads reconsultados diretamente no GitHub às 12:42 BRT:

| PR | Branch | HEAD | Base | Ahead / behind | Estado |
|---|---|---|---|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | chore/continuity-foundation | \`7475a82e421c9286e6944ea17ee73afd39ed73d9\` | master \`a9288ccfcb0f308d3a587bfca624418a395be07b\` | 839 / 0 | Open, Draft |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | team-lite/3.4.31-guest-fixes | \`7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309\` | team-lite-official \`9065bc1536fde64f437f6f12b7abb9b072cb8281\` | 59 / 0 | Open, Draft |
| [#76 Team Lite atual](https://github.com/Reekyi/UpStatus/pull/76) | team-lite/signaling-transport-candidate | \`2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7\` | team-lite-official \`9065bc1536fde64f437f6f12b7abb9b072cb8281\` | 313 / 0 | Open, Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | qa/release-readiness-2026-11-04-master | \`64fe8272869b0ee9d01a557ea99c3bc4a1420042\` | master \`a9288ccfcb0f308d3a587bfca624418a395be07b\` | 99 / 0 | Open, Draft |
| [#84 TEST isolation](https://github.com/Reekyi/UpStatus/pull/84) | safety/test-deploy-target-guard-20261107 | \`21341f331270e142bdf7584c1cdf16e6011e41b3\` | develop \`6b33e1e26ad105143f00372ae6d0f2fa52df60d6\` | 30 / 0 | Open, Draft |
| [#85 updater/upload/security](https://github.com/Reekyi/UpStatus/pull/85) | fix/master-release-script-url-20261107 | \`17554523ef51bafd503e74b3f1271d55f43a6eda\` | master \`a9288ccfcb0f308d3a587bfca624418a395be07b\` | 21 / 0 | Open, Draft |

Todas as seis PRs continuam abertas, Draft e sem merge. A consulta de reviews retornou zero reviews em todas. A #76 está 254 commits à frente da #75; o baseline #75 permanece histórico, não substitui o candidato atual.

## 2. CI por HEAD exato

### Normal #74 — PASS automatizado

- [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089): SUCCESS no HEAD \`7475a82e421c9286e6944ea17ee73afd39ed73d9\`.
- [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038): SUCCESS no mesmo HEAD.
- Log do Smoke: 129/129 checks autenticados; negociação WebRTC e entrega de áudio remoto em chamada/voice e vídeo remoto em screen-share; mesh de três participantes; cancel-before-open/tombstones e recuperação de salas; rate limit 90 aceitas + 1 HTTP 429 com Retry-After 60s; concorrência de read receipts; enrollment isolado; cleanup verificado.
- Validate: guard do target TEST, layout de migrations, contrato estático de enrollment, regressões de chat/updater aprovados.

### Team Lite #76 — PASS automatizado no HEAD mais recente

Houve uma falha intermediária no HEAD anterior \`95c37573ef30c3b05dacc18738fd9dc74626fe49\`, run [42386822774](https://github.com/Reekyi/UpStatus/actions/runs/42386822774). A falha estava no teste estático de política de senha: o teste executado no branch Team Lite lia também \`src/server/index.template.ts\` do próprio branch, que é uma cópia-base antiga do Normal e ainda contém a política antiga. Não era o template efetivamente usado pelo Team Lite.

O commit corretivo \`2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7\` removeu essa dependência cruzada e passou a verificar a política do próprio template Team Lite. Isso evita comparar o candidato Team Lite com uma cópia desatualizada do Normal no branch errado. A contrapartida é que a paridade entre produtos deixa de ser uma comparação automatizada entre branches; ela foi confirmada nesta auditoria por inspeção dos dois candidatos: ambos usam 6 caracteres no setup e 4 no login legado.

- [Candidate Checks 42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302): SUCCESS no HEAD exato \`2e0ff69419cdd2a06c68c5d58cf221ccfc6738c7\`.
- 16/16 checks não autenticados e 103/103 checks autenticados.
- Chromium: WebRTC de chamada, voice e screen com entrega de tracks remotos; mesh de três participantes e teardown.
- Rate limit: 90 aceitas, 1 HTTP 429, Retry-After 60s.
- Voice-room ownership/leave/retry/rejoin e recuperação offline/online aprovados.
- AUTH-03 isolado: NULL/empty eligibility, conta já configurada, token malformado/incorreto/expirado/replay, one-winner concorrente, fallback de papel vazio e preservação de papel explícito.
- Cleanup verificado; Team Lite 3.4.31, portais Lucca/Ycaro e updater aprovados.

O run anterior 42386822774 é histórico de um HEAD substituído; não representa o estado atual da #76.

### Baseline #75 — PASS histórico

[Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) permanece PASS no HEAD \`7bbf9b90\`. É evidência histórica do baseline, não uma execução recente do candidato #76.

### TEST guard #84 — PASS automatizado

- [Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361): SUCCESS no HEAD exato \`21341f331270e142bdf7584c1cdf16e6011e41b3\`.
- O último commit da #84 alterou README/documentação do fluxo; o workflow seguro permanece no branch e os guards foram reexecutados.
- Passaram sentinel inerte, rejeição de destinos proibidos, preflight de metadata, escopo de token, pinagem do SHA do dispatch e contrato de upload assinado.
- O log construiu PROD 3.0.40 / TEST 3.0.40-beta.22 com target TEST inerte e não implantável.
- Não houve workflow_dispatch nem chamada real à Management API.

### Updater/upload #85 — PASS automatizado, com limite claro

- [Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749): SUCCESS no HEAD \`17554523ef51bafd503e74b3f1271d55f43a6eda\`.
- Passaram signed-upload client regression, signed-upload server regression em Node VM com Storage/DB mocks e chat regression.
- O candidato implementa anexos staged, preview removível, legenda/reply preservados, filename separado da legenda, upload assinado para chat/avatar e validações de origem HTTPS, bucket, MIME, tamanho, path, token e URL pública. O evento cliente \`chat_fast\` deixou de enviar a linha completa.
- Não houve upload real no Storage. O laboratório não tem buckets de chat/perfil. O teste é mockado e não prova integração real.

### QA #82 — FAIL herdado do validador

- [Validate 42382198198](https://github.com/Reekyi/UpStatus/actions/runs/42382198198): FAILURE no HEAD \`64fe8272869b0ee9d01a557ea99c3bc4a1420042\`.
- Erro: \`VALIDATION FAILED: production updateURL mismatch\`.
- A causa é a asserção antiga de master, não uma divergência acidental no artefato. O builder usa deliberadamente URLs distintas para distribuição do userscript e API: \`release.json.scriptUrl\` aponta para \`/functions/v1/upstatus/upstatus.user.js\`, enquanto \`CLOUD_SERVER\` mantém o backend beta10 legado durante a transição. A PR #85 atualiza o validador para comparar UpdateURL/DownloadURL com \`release.json.scriptUrl\` e preserva a API beta10 como endpoint de compatibilidade. Seu Validate passou.
- Portanto, corrigir o validador não significa trocar o backend legado agora; o cutover ainda exige plano coordenado e rollback.

## 3. Workflow TEST ativo em develop — risco crítico

Branch develop atual: \`6b33e1e26ad105143f00372ae6d0f2fa52df60d6\`, API do GitHub reporta \`protected=false\`.

Arquivo ativo \`.github/workflows/deploy-test.yml\`, blob SHA \`d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839\`:
- tem \`push\` em develop e \`workflow_dispatch\`;
- usa \`secrets.SUPABASE_PROJECT_ID\` compartilhado;
- expõe \`SUPABASE_ACCESS_TOKEN\` no escopo do job;
- usa Supabase CLI \`latest\`;
- implanta \`upstatus-test\` sem validar organização, projeto ou database host.

O valor do secret não foi lido. Não afirmo que o destino efetivo seja produção; o problema é que o workflow ativo não garante que não seja. A branch develop está sem proteção reportada.

A correção candidata da #84, blob do workflow \`1ca0c4ef4f633724280b81691471d8acc777edd2\`, é manual-only, checkout do SHA exato do dispatch, exige develop, rejeita produção e o laboratório de fixtures, usa \`vars.SUPABASE_TEST_PROJECT_ID\`, confere organização \`bcjtvojfkfoxvsitzmkl\`, estado ACTIVE_HEALTHY e database host pela Management API, limita o token aos três steps necessários e implanta somente \`upstatus-test\`.

A proteção está validada em PR Draft, mas ainda não está integrada em develop. Nenhum deploy foi disparado pela auditoria.

## 4. Supabase — projetos e runtimes

A organização \`bcjtvojfkfoxvsitzmkl\` contém somente dois projetos, ambos ACTIVE_HEALTHY:

| Projeto | Região | PostgreSQL | Migrations | Edge Functions |
|---|---|---|---:|---:|
| Produção \`dlfvkawaiqduhlazsszm\` | us-west-2 | 17.11.0.002 | 7, última \`20261027155438\` | 38 |
| Laboratório \`bfpjtfqlnypisxljoxkb\` | sa-east-1 | 17.11.0.003 | 33, última \`20261107061242\` | 2 |

Não existe projeto full-product TEST na organização.

Produção:
- \`upstatus\` v480, SHA \`bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd\`;
- \`upstatus-test\` v281, SHA \`7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a\`;
- \`upstatus-team-lite\` v15, SHA \`2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb\`;
- \`upstatus-screen-share-3-1-1-beta10\` v6, SHA \`f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29\`.

Todas as 38 funções reportam \`verify_jwt=false\`; isso não significa automaticamente ausência de autenticação, pois as funções centrais usam sessão customizada. As quatro funções centrais foram inspecionadas por fonte implantada.

Laboratório:
- \`upstatus-signal-test\` v32;
- \`upstatus-signal-e2e-once\` v3.

O laboratório é adequado para signaling/auth/RPCs, mas não contém o backend completo Normal/Team Lite nem os buckets \`chat-images\` e \`profile-images\`.

## 5. Normal / Team Lite: compatibilidade e AUTH

### Candidatos

Os templates candidatos Normal #74 e Team Lite #76 usam \`minPasswordLength=setup?6:4\`: seis caracteres para novo setup e quatro para login legado. A RPC de primeiro acesso é chamada com token hash, e o fluxo de convite é coberto por testes isolados.

A correção de teste no commit \`2e0ff694\` eliminou a comparação contra a cópia Normal obsoleta do branch Team Lite. A paridade atual está confirmada por inspeção dos dois templates; não há teste cross-branch automatizado independente.

### Produção ainda está no fluxo antigo

As quatro funções implantadas não possuem \`consume_upstatus_setup_invite\`, auth rate limiter nem colunas de token:
- Normal v480 exige seis caracteres tanto no login quanto no setup e ainda contém fallback por nome;
- Team Lite v15 exige quatro caracteres tanto no login quanto no setup e ainda contém fallback por nome;
- \`upstatus-test\` v281 também exige quatro e contém fallback por nome;
- beta10 v6 exige seis e contém fallback por nome.

Nas quatro, \`/api/setup\` continua público e \`/api/account\` ainda informa \`needsSetup\`. Os papéis são verificados em rotas autenticadas, mas a primeira configuração continua no modelo legado.

Consulta agregada de produção: 5 contas, 0 senha NULL/vazia, 0 papel NULL/vazio, 3 administradores explícitos. Não foi encontrada conta oficial atualmente reivindicável; o risco é latente para futuras contas sem senha/papel.

### Objetos de rollout ausentes em produção

SELECT confirmou ausentes:
- RPC \`consume_upstatus_setup_invite\`;
- RPC \`consume_upstatus_signal_rate_limit\`;
- RPC \`merge_chat_read_receipts\`;
- tabela \`upstatus_auth_rate_limits\`;
- colunas \`setup_token_hash\` e \`setup_token_expires_at\`.

AUTH-03 está implementado nos candidatos, mas não implantado. Ainda falta prova HTTP completa de emissão por admin, 403 para não-admin, entrega privada do token e consumo pela rota real. AUTH-02 (rate limit de login/setup) não existe nos candidatos nem em produção.

A PR #85 troca o fallback de admin para papel armazenado e melhora a UI, mas sua fonte ainda expõe \`/api/setup\` sem convite e \`/api/account\` com \`needsSetup\`; ela não substitui o rollout AUTH-03. A rota \`/api/chat/clear\` no branch #85 continua Ricardo-only por nome, devendo ser confirmada como política explícita de owner, separada do papel admin.

## 6. Upload assinado e Storage

A PR #85 passou testes de cliente e servidor em VM/mock. O código valida origem HTTPS, bucket, MIME, tamanho, path, token e URL pública; o PUT do cliente não envia credenciais e bloqueia redirects. Os candidatos #74/#76 também contêm rotas \`signedUploadRoute\`.

Limitações:
- nenhum upload real foi executado;
- o laboratório não possui buckets de chat/perfil;
- a gravação de áudio continua no caminho separado legado \`/api/chat/audio\` com data URL, fora do contrato de signed upload de chat/avatar;
- em produção, \`chat-images\` e \`profile-images\` são buckets públicos com limite 20 MB. Signed upload controla autorização de escrita, não confidencialidade de leitura: qualquer pessoa com URL pública pode ler o objeto. Se anexos forem privados, será necessário bucket privado e fluxo autenticado de download.

## 7. RLS, grants, SECURITY DEFINER e Realtime

### Produção

Security Advisor observado às 15:40:42 UTC:
- 3 WARN: SECURITY DEFINER executável por anon;
- 3 WARN: SECURITY DEFINER executável por authenticated;
- 10 INFO: RLS habilitado sem policy;
- Performance e Health sem findings.

As três funções são:
- \`public.upstatus_broadcast_messages()\`;
- \`public.upstatus_broadcast_remote_state()\`;
- \`public.upstatus_broadcast_users()\`.

Catálogo confirmou SECURITY DEFINER, \`search_path=public\`, EXECUTE para PUBLIC, anon, authenticated e service_role, com triggers habilitados. Os broadcasts usam \`realtime.send(..., false)\`:
- mensagens serializam a linha OLD/NEW inteira via \`to_jsonb\`;
- remote-state envia sender/target/status/reason/error e metadados de resultado;
- user-status envia nome/status/reason/updated_at/sync.

Nove tabelas backend-owned têm RLS e zero policies, mas anon e authenticated possuem oito privilégios efetivos: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. \`upstatus_visual_config\` é a exceção sem grants de cliente. Zero policies não prova acesso às linhas via PostgREST; TRUNCATE não é protegido por RLS.

\`realtime.messages\` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.

Default ACLs permanecem amplos para objetos futuros em public/storage e schemas GraphQL, com defaults de postgres e supabase_admin concedendo privilégios a anon/authenticated. A sessão SQL atual não é superuser e não é membro de supabase_admin; ACL-02 exige caminho administrativo autorizado.

### Laboratório isolado

- Security Advisor: 0 WARN, 17 INFO de RLS sem policies.
- Performance: 4 INFO de índices não utilizados.
- Health: sem findings.
- RPCs \`consume_upstatus_setup_invite\`, \`consume_upstatus_signal_rate_limit\` e \`merge_chat_read_receipts\`: SECURITY INVOKER, search_path vazio, EXECUTE somente para service_role.
- Tabelas backend-owned sem grants de cliente.
- \`realtime.messages\` ainda mantém grants de cliente e zero policies.

### Fixtures observadas

Durante a execução #76, um snapshot SELECT encontrou transitoriamente 6 rooms, 14 memberships, 4 bindings, 4 sessions, 1 event e 6 rate-limit buckets; usuários de teste, call attempts, voice attempts, messages e chat_reads estavam zerados. O workflow [42386904302](https://github.com/Reekyi/UpStatus/actions/runs/42386904302) registrou cleanup verificado. SELECT posterior às 15:37:27 UTC e nova leitura às 15:42:11 UTC encontraram zero em todas as categorias consultadas. A sequência é consistente com fixtures temporárias do workflow #76; nenhum registro foi alterado pela auditoria e nenhum owner foi inferido a partir de linhas individuais.

## 8. Issues

- [#78 reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 26 comentários, todos os 8 critérios de aceite ainda desmarcados. Faltam teste manual no Tampermonkey, perda real de internet por ~10s, recuperação sem F5, reentrada, nova chamada, microfone/tela físicos e compatibilidade instalada Normal ↔ Team Lite. Testes Chromium e VM não substituem esse aceite.
- [#79 release](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 96 comentários. O corpo ainda é o snapshot 12:23 BRT e lista #76 no HEAD antigo \`87bbb2f\`, #84 no HEAD antigo \`66ccc65\` e #76 run \`42354761800\`. O comentário 12:35 BRT dizia que o novo #76 run estava em andamento; agora ele terminou SUCCESS em \`2e0ff694\` / \`42386904302\`. O checklist precisa ser reconciliado com os heads e evidências atuais.

## 9. Gates prioritários

1. Substituir/proteger o workflow TEST ativo em develop; branch develop está sem proteção reportada.
2. Provisionar projeto TEST full-product independente, na organização esperada.
3. Criar runtime e workflow TEST próprios para Team Lite; hoje só \`upstatus-test\` é implantada.
4. Manter a distinção intencional entre URL de distribuição e API legada, documentando cutover/rollback; não tratar a falha antiga do validador como prova de bug de endpoint.
5. Completar AUTH-03 via HTTP real e implementar rate limit de login/setup antes do rollout.
6. Planejar rollout coordenado de autenticação legada e política de senha, preservando compatibilidade das contas Team Lite.
7. Migrar broadcasts para autorização privada, remover full-row payloads e restringir EXECUTE.
8. Revogar grants/default ACLs excessivos com plano administrativo revisado; resolver ACL-02.
9. Validar upload real em Storage TEST privado ou decidir explicitamente a política de leitura pública.
10. Executar os 8 critérios físicos da #78 e atualizar #79.
11. Obter reviews humanas; todas as PRs seguem Draft e sem reviews.

## 10. Veredito

- Normal #74: CI aprovado no HEAD atual.
- Team Lite #76: CI aprovado no HEAD atual após correção do teste cross-branch.
- TEST guard #84: Validate aprovado no HEAD atual, mas workflow ainda não integrado em develop e nenhum dispatch real.
- Updater/upload #85: Validate aprovado com mocks, sem upload real.
- QA #82: Validate falha por asserção antiga herdada de master; não é evidência de mismatch real entre URL de distribuição e API.
- Release: BLOCKED por workflow ativo inseguro, ausência de TEST full-product, rollout AUTH incompleto, Realtime público/grants amplos e testes físicos pendentes.

Sem percentual de conclusão. CI verde não autoriza merge, deploy, release ou publicação.

## Registro de segurança

- Todas as consultas SQL foram SELECT-only.
- Nenhuma migration, deploy, alteração de Edge Function, secret, flag, role, grant, policy ou ACL.
- Nenhuma fixture criada, alterada ou removida pela auditoria.
- Nenhum workflow disparado manualmente pela auditoria.
- Nenhuma branch de engenharia alterada.
- Única escrita desta rodada: novo relatório nesta branch QA dedicada.


## Pós-commit — validação automática da própria atualização QA

Após a criação deste relatório, o commit documental \`268bb2ae3b6864a3db5ca00b2dc2081cfd6424b3\` disparou automaticamente [Validate 42387735290](https://github.com/Reekyi/UpStatus/actions/runs/42387735290), no HEAD exato. O job terminou FAILURE em \`VALIDATION FAILED: production updateURL mismatch\`. O build foi concluído como PROD 3.4.7 / TEST 3.4.7 antes da asserção.

A falha confirma que o validador herdado em master ainda não contém a correção da PR #85. Não é falha causada pelo conteúdo documental, e não foi removida nem enfraquecida nenhuma asserção. A PR #82 permanece Draft; a correção do validador continua isolada na #85 e aguarda revisão/integração autorizada.

Verificação antes desta atualização: branch QA em \`268bb2ae3b6864a3db5ca00b2dc2081cfd6424b3\`; blob do relatório \`5bde7205fe6e40fbcf70ba20308f46693dc49673\`; \`docs/RELEASE_READINESS.md\` preservado em \`1ae48aab678a06b4ff75d061d2355a6449cbe1e0\`.
