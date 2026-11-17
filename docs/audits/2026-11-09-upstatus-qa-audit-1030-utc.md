# Auditoria independente UpStatus — 2026-11-09 10:30 UTC

## Escopo e método

Projeto: userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

- GitHub: Reekyi/UpStatus
- Supabase produção: dlfvkawaiqduhlazsszm
- Supabase laboratório de segurança: bfpjtfqlnypisxljoxkb

A primeira leitura foi docs/RELEASE_READINESS.md na branch QA. O blob atual é 7cfbd70886df42ce790c078c224b19284a632595, com 1.045.105 caracteres. A leitura integral foi feita pelo blob do GitHub porque a operação normal de conteúdo retornou corpo vazio para esse arquivo grande. O documento principal não foi alterado.

Vocabulário:
- AUTOMATED PASS: workflow/teste concluído com sucesso no SHA indicado.
- CODE INSPECTION: inspeção estática de fonte/configuração/catálogo; não equivale a teste de runtime.
- MANUAL PENDING: exige navegador/dispositivo real ou aceite humano.
- BLOCKED: dependência ou condição impeditiva confirmada.
- NOT VERIFIED: evidência não disponível ou não pertence ao ambiente/HEAD atual.

Todas as consultas SQL nesta rodada foram SELECT-only. Não foram executados scripts de teste, fixtures, migrations, deploys, merges, releases ou publicações. Não foram alterados secrets, flags, roles, grants, policies ou ACLs.

## Heads e integridade da QA

| Ref | SHA |
|---|---|
| QA qa/release-readiness-2026-11-04-master | fc3cb65ee639d6246537c4fa945338a6869e4c87 |
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

Compare master...QA: 156 commits à frente, 1 atrás; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b.

O único commit exclusivo de master é documental: 9d40461babcec8eb8686c2a04be9c675df7da381, que adiciona docs/checkpoints/2026-11-08-production-migration-history-preflight.md. Não fiz rebase nem incorporei esse commit automaticamente.

O registro QA anterior de 09:43 UTC foi preservado, blob dd14f62922cec8619c6fc2f65259449d0eade213. Esta nota é um arquivo novo e independente.

## PRs principais, heads e CI

| PR | HEAD | Evidência | Classificação |
|---|---|---|---|
| #74 Normal | 9c0133e8cf6bd85ac8993888718a408db2f24a3e | Validate 42451736696; Smoke 42451736729 | AUTOMATED PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Candidate Checks 41674353127 | PASS histórico |
| #76 Team Lite | eb28e88325d7e8a6236d9050bebabf794d64a8c4 | Candidate Checks 42450476433 | AUTOMATED PASS |
| #82 QA | fc3cb65ee639d6246537c4fa945338a6869e4c87 | Último Validate disponível 42573817979 falhou no HEAD anterior c633d5b3; nenhum run associado ao HEAD atual foi encontrado | CI atual NOT VERIFIED |
| #85 master updater/cutover | b75707b6eaf678d87863144748b9aed8e2866455 | Validate 42475230911 | AUTOMATED PASS; cutover intencionalmente bloqueado |
| #123 Team Lite deploy guard | b8cd8e15a983b00fd5b1eaca0ffecfd18b9b0d99 | Guard 42589119358 | AUTOMATED PASS offline |
| #124 signed uploads | 77c9d4c3b525325996db973cbec609ae2ddb0d83 | Validate 42594697302 | AUTOMATED PASS, branch develop |
| #125 default-branch dispatcher | 35c9122d5a07a0890c1fafda86cadd3a842f96b1 | Dispatcher 42598656306; Validate 42598656421 | Guard PASS; Validate FAIL herdado |
| #126 preflight completeness | 048f74c7987c02225260605480a535c3808ebcfa | Offline contract 42598779957 | AUTOMATED PASS focado |

Links:
- [PR #74](https://github.com/Reekyi/UpStatus/pull/74), [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42451736696), [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42451736729)
- [PR #75](https://github.com/Reekyi/UpStatus/pull/75), [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127)
- [PR #76](https://github.com/Reekyi/UpStatus/pull/76), [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/42450476433)
- [PR #82](https://github.com/Reekyi/UpStatus/pull/82), [último Validate disponível](https://github.com/Reekyi/UpStatus/actions/runs/42573817979)
- [PR #85](https://github.com/Reekyi/UpStatus/pull/85), [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42475230911)
- [PR #123](https://github.com/Reekyi/UpStatus/pull/123), [guard](https://github.com/Reekyi/UpStatus/actions/runs/42589119358)
- [PR #124](https://github.com/Reekyi/UpStatus/pull/124), [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42594697302)
- [PR #125](https://github.com/Reekyi/UpStatus/pull/125), [dispatcher guard](https://github.com/Reekyi/UpStatus/actions/runs/42598656306), [Validate](https://github.com/Reekyi/UpStatus/actions/runs/42598656421)
- [PR #126](https://github.com/Reekyi/UpStatus/pull/126), [offline contract](https://github.com/Reekyi/UpStatus/actions/runs/42598779957)

### Normal e Team Lite

No HEAD exato da #74, o Smoke registrou 19/19 verificações não autenticadas e 136/136 autenticadas. O log confirma WebRTC de chamada, voz e tela com remote tracks, mesh de três participantes, teardown, concorrência de voice attempts, rate limit 90 aceitas + 1 HTTP 429 com Retry-After de 60 segundos, setup enrollment e cleanup.

No HEAD exato da #76, Candidate Checks registrou 16/16 verificações não autenticadas, 110/110 autenticadas e 11/11 casos do mapper HTTP offline. O workflow também executou Full-IIFE Playwright com endpoints inertes/stubs, WebRTC de chamada/voz/tela, mesh, rate limit, setup enrollment e cleanup.

A #76 está 305 commits à frente e 0 atrás da #75; a #75 é ancestral/base histórica. Não integrar #75 e #76 separadamente.

Esses resultados são automatizados e isolados. Não comprovam Tampermonkey instalado, perda física de rede, permissões reais de microfone/display ou interoperabilidade física Normal ↔ Team Lite.

### #82 e o bloqueio herdado do Validate

O último run encontrado para #82, 42573817979, falhou no SHA anterior c633d5b3 em scripts/validate.mjs:26 com production updateURL mismatch. O HEAD atual da QA é fc3cb65 e não possui run associado encontrado nesta consulta.

A causa está no build de master: o gerador ainda usa o host/slug beta10 para o updateURL, enquanto release.json e o validator exigem o endpoint estável /functions/v1/upstatus/upstatus.user.js.

A PR #85 corrige a geração do updateURL e o isolamento da URL TEST. Seu Validate passou no HEAD exato b75707b. A PR permanece Draft e baseada no antigo master a9288cc, enquanto master avançou para 9d40461. Não foi integrada.

A #85 tem um cutover guard fail-closed. O Validate passa, mas o diagnóstico de produção permanece bloqueado por AUTH-03 e pelas migrations de setup ausentes. Isso não é autorização para deploy.

## Novos guards Team Lite: #123, #125 e #126

A #123 corrige o alvo de deploy para upstatus-team-lite, fixa Supabase CLI 2.122.1, exige dispatch manual/confirmado, SHA/ref exatos e preflight de projeto/migrations. Não aplica migrations.

A #125 resolve a limitação de workflow_dispatch: o dispatcher precisa estar no default branch master. O novo workflow fica em master somente depois de a PR ser integrada. Atualmente #125 está Draft; o dispatcher ainda não está disponível no default branch.

O run 42598656306 passou no job offline_guard e deixou o job deploy como SKIPPED. O Validate separado 42598656421 falhou no updateURL herdado de master. Portanto, #125 não tem CI integralmente verde.

A #126 acrescenta duas proteções corretas:
- GET de branches gerenciadas, exigindo exatamente uma main default, ligada ao Git master e ACTIVE_HEALTHY.
- Reconciliação de cada migration remota aplicada com um arquivo local de mesmo version/name.

O run focado 42598779957 passou. A verificação de produção deve falhar hoje: main está MIGRATIONS_FAILED e quatro arquivos históricos não existem no diretório local.

### Achado P2 — aprovação humana não está totalmente comprovada pelo dispatcher

Inspeção do workflow #125: a checagem de reviews seleciona o último estado APPROVED/CHANGES_REQUESTED/DISMISSED, exige APPROVED e login diferente do autor. Porém, não verifica:
- se o reviewer é uma conta humana (user.type != Bot);
- se o review foi submetido no HEAD atual do PR (review.commit_id == head.sha);
- se o reviewer possui permissão/pertence ao conjunto de aprovadores autorizado.

Assim, uma aprovação de bot ou uma aprovação antiga ainda não invalidada por política de branch pode satisfazer o teste textual de “human approval”. O workflow também não prova a configuração de reviewers do environment production.

Correção recomendada: exigir reviewer humano e autorizado, vincular a aprovação ao HEAD exato e usar proteção de branch/environment com stale-approval dismissal. O endpoint de branch protection retornou HTTP 403 nesta conexão; configuração efetiva permanece NOT VERIFIED.

### Achado P2 — reconciliação de migrations verifica nomes, não conteúdo

O helper da #126 compara versão/nome remoto com filename local. Isso detecta arquivos ausentes e divergências de nome, mas não detecta um SQL local alterado mantendo o mesmo nome.

Como a listagem remota do Supabase fornece version/name, e não checksum do SQL, a recuperação dos quatro arquivos históricos precisa vir acompanhada de proveniência confiável: blob SHA/artefato original revisado ou manifesto de checksums aprovado. Não basta criar arquivos com os nomes corretos.

## Supabase: estado e histórico de migrations

Produção dlfvkawaiqduhlazsszm:
- Projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Branch gerenciada default main, git_branch master, status MIGRATIONS_FAILED.
- Histórico remoto: 7 migrations até 20261027155438.
- Diretório master/QA: somente 3 migrations.

As quatro migrations aplicadas remotamente, mas ausentes do diretório local são:
1. 20261023154754_create_upstatus_visual_config.sql
2. 20261026195855_add_chat_message_file_name.sql
3. 20261027154329_allow_chat_document_mime_types.sql
4. 20261027155438_set_upstatus_upload_limits_20mb.sql

A listagem do branch candidato #126 contém 11 migrations, mas também não contém esses quatro arquivos. A consulta GitHub de histórico por caminho não localizou commits para os quatro nomes no histórico consultado; isso não prova que nunca existiram em outro repositório/artefato.

O log Supabase já registrado em 2026-11-08 13:47:43 UTC informa: “Remote migration versions not found in local migrations directory.” A comparação local/remota confirma a causa imediata. Não reconstruir SQL a partir do schema atual.

A #126 bloqueia corretamente o deploy enquanto main não estiver ACTIVE_HEALTHY e enquanto as fontes históricas estiverem ausentes.

Laboratório bfpjtfqlnypisxljoxkb:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- 38 migrations.
- Sem branches gerenciadas adicionais.
- Funções upstatus-signal-test v32 e upstatus-signal-e2e-once v3.

Nenhuma migration candidata de capacidade/idempotência/readiness foi aplicada ao laboratório nesta rodada. A função signal-test v32 permanece antiga; a presença de migrations no repositório não equivale a aplicação no banco.

## Edge Functions e AUTH-03

Produção lista 38/38 Edge Functions ACTIVE, todas com verify_jwt=false. Isso, sozinho, não prova ausência de autenticação: os handlers principais inspecionados usam autenticação própria por token de sessão. A inspeção nesta rodada cobriu diretamente Normal e Team Lite, não todas as 38 funções.

Runtime atual:
- upstatus v480, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd.
- upstatus-team-lite v15, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb.
- upstatus-test v281.
- upstatus-screen-share-3-1-1-beta10 v6.
- Nenhuma função upstatus-signal server-mediated em produção.

AUTH-03 permanece P1:
- Os dois runtimes instalados ainda encaminham POST /api/setup para login(req,true) antes do contexto autenticado.
- O primeiro chamador que conhece uma conta sem password_hash pode definir a senha sem token de convite.
- Há fallback nominal de implementation_admin para Ricardo, Lohan e Guilherme quando o papel está vazio.
- Normal exige senha de 6 caracteres no setup; Team Lite permite 4, divergência de política.
- Produção: 5 usuários, zero password hashes vazios, zero roles vazios, zero colunas setup_token_* e zero RPC consume_upstatus_setup_invite.

Não existe conta atualmente desconfigurada, mas o fluxo de provisionamento instalado continua sem prova de convite. Os templates candidatos #74/#76 usam token de 64 caracteres hexadecimais e RPC de consumo atômico; o laboratório possui as quatro colunas e a RPC, SECURITY INVOKER, search_path vazio e EXECUTE restrito a service_role. Produção não recebeu AUTH-03.

## Realtime, RLS, grants e SECURITY DEFINER

O snapshot atual de produção:
- realtime.messages: 50 linhas, 7 partições, todas private=false, RLS true, zero policies.
- anon/authenticated mantêm SELECT/INSERT/UPDATE em realtime.messages.
- Três funções upstatus_broadcast_* são SECURITY DEFINER, search_path=public, retornam trigger e têm EXECUTE para anon/authenticated.
- O Security Advisor reporta 3 WARN para anon e 3 WARN para authenticated. Não foi tentada invocação HTTP direta; as funções retornam trigger e estão anexadas a triggers.

A inspeção anterior dos runtimes implantados, cujos source SHAs continuam iguais, encontrou os clientes Normal/Team Lite assinando tópico público diferente do tópico dos triggers. Nenhum cliente instalado usa private:true/realtime.setAuth(). O trigger de mensagens transmite to_jsonb(OLD/NEW) completo. A configuração efetiva de public access no Dashboard não foi verificada.

Produção:
- 10 tabelas public com RLS e zero policies.
- 9 dessas tabelas concedem SELECT/INSERT/UPDATE/DELETE/TRUNCATE a anon e authenticated.
- upstatus_visual_config é a exceção sem grants diretos aos papéis clientes.
- storage.objects: RLS true, zero policies, anon/authenticated com SELECT/INSERT/UPDATE/DELETE.
- Default ACLs de postgres em public/storage e de supabase_admin em public/GraphQL/graphql_public continuam amplas.

Laboratório:
- 17 tabelas public com RLS e zero policies, sem grants diretos a anon/authenticated nas tabelas public.
- Três funções broadcast usam search_path vazio e não concedem EXECUTE aos papéis clientes.
- realtime.messages e storage.objects ainda possuem grants para anon/authenticated, sem policies.
- Default ACLs de postgres em public estão restritas a postgres/service_role, mas defaults de postgres em storage e de supabase_admin em public/GraphQL continuam amplas.

Advisors observados em 2026-11-09 10:31 UTC:
- Produção Security: 3 WARN anon + 3 WARN authenticated + 10 INFO RLS/no-policy; Performance 0; Health 0.
- Laboratório Security: 0 WARN + 17 INFO RLS/no-policy; Performance 4 INFO de índices não usados; Health 0.

## Storage e signed upload

Buckets de produção:
- chat-images: public=true, 20 MiB, MIME de imagem/vídeo/áudio/documentos.
- profile-images: public=true, 20 MiB, MIME de imagem.
- Laboratório não possui esses buckets.

A #124 (base develop) passou no Validate 42594697302. Os testes são offline/mocados e cobrem origem, bucket, path, token, MIME, tamanho, PUT e fallback legado. Não houve upload real.

Achado P2 de inspeção: a rota de signed upload valida MIME/tamanho declarados e emite URL assinada, mas não inspeciona os bytes enviados. File.type/extensão/Content-Type podem ser falsificados. Como os buckets são públicos, validar só depois do upload deixa uma janela de exposição. Exigir inspeção server-side antes da publicação ou bucket privado de quarentena com finalize/copy após validar magic bytes.

## Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios físicos. Ainda faltam perda real de internet, recuperação sem F5, reentrada em sala, chamadas após reconexão, microfone/display reais e interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 16/35 no corpo atual; 19 itens pendentes. Comentários recentes registram #125/#126 e o achado de signed upload.

Nenhum teste físico foi executado nesta rodada.

## Classificação final

AUTOMATED PASS:
- #74 Validate + Smoke no HEAD exato.
- #76 Candidate Checks no HEAD exato.
- #75 PASS histórico, substituída pela evolução #76.
- #85 Validate no HEAD exato, com cutover guard intencionalmente bloqueado.
- #123 guard offline/mocked.
- #124 Validate offline/mocked.
- #125 dispatcher offline_guard; deploy SKIPPED.
- #126 contrato offline focado.

CODE INSPECTION:
- AUTH-03 first-caller setup nos runtimes instalados.
- Divergência de histórico local/remoto e causa de MIGRATIONS_FAILED.
- Guards #125/#126 e lacunas de aprovação/proveniência.
- RLS/grants/Default ACLs/SECURITY DEFINER/Realtime.
- Signed upload sem validação dos bytes.

MANUAL PENDING:
- Oito critérios físicos da #78.
- Tampermonkey instalado, rede real, microfone/display e interoperabilidade instalada.

BLOCKED:
- Deploy Team Lite: managed main MIGRATIONS_FAILED e quatro fontes históricas ausentes.
- Cutover Normal: AUTH-03 ausente na produção e workflow atual ainda não integrado.
- Realtime autenticado ainda não está nos runtimes implantados.
- Testes que mutam fixtures aguardam autorização explícita para janela controlada do laboratório.
- Reviews humanas, branch protection e environment reviewers não confirmados.

## Próximos gates

1. Recuperar os quatro SQLs históricos originais com proveniência/hash confiável; não reconstruir por inferência.
2. Reconciliar o histórico local/remoto e obter main ACTIVE_HEALTHY antes de liberar qualquer dispatcher.
3. Corrigir a checagem de aprovação do #125: reviewer humano/autorizado e review no HEAD exato; confirmar proteção do environment.
4. Fortalecer #126 com proveniência/checksum dos SQLs históricos, além de filename/version/name.
5. Fechar AUTH-03 em ambos os runtimes e remover first-caller setup/role fallback nominal.
6. Definir anti-replay server-side com nonce/sequence/operation identity além da idempotência por chave.
7. Obter autorização explícita para mutação controlada no laboratório; validar allowlist antes de aplicar migrations/testar readiness/capacidade/replay.
8. Migrar Realtime para privado/autenticado, reduzir payloads e restringir grants/default ACLs.
9. Decidir privacidade Storage e validar bytes antes de publicar uploads.
10. Integrar candidatos com revisão humana, proteger branches/environments, documentar rollout/rollback e concluir #78.

**DECISÃO: NÃO LIBERAR.**

Nenhuma migration, SQL write, fixture, deploy, merge, release, publicação de userscript ou alteração de secrets/flags/roles/grants/policies/ACLs foi realizada. A única escrita desta rodada é este novo documento na branch QA.
