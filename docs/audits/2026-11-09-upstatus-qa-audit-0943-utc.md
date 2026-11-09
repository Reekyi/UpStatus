# Auditoria independente UpStatus - 2026-11-09 09:43 UTC

## Escopo e método

Projeto auditado: userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Repositório: `Reekyi/UpStatus`  
Produção Supabase: `dlfvkawaiqduhlazsszm`  
Laboratório Supabase: `bfpjtfqlnypisxljoxkb`

A primeira leitura foi `docs/RELEASE_READINESS.md` na branch QA. Blob SHA preservado: `7cfbd70886df42ce790c078c224b19284a632595` (1.045.105 caracteres). O arquivo foi lido por blob porque a resposta de conteúdo normal veio vazia para o arquivo grande. Nenhuma alteração foi feita nele.

Todas as consultas ao Supabase foram SELECT-only ou leituras de inventário/log. Não houve execução de scripts de teste, mutação de fixtures, migration, deploy, merge, release, publicação de userscript ou alteração de secrets, flags, roles, grants, policies ou ACLs.

## Heads e integridade da QA

| Ref | SHA exato |
|---|---|
| `qa/release-readiness-2026-11-04-master` | `40809927be9eeda798e55d618a904752e351d7f6` |
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

QA está 154 commits à frente e 1 atrás de master. Merge-base: `a9288ccfcb0f308d3a587bfca624418a395be07b`.

O único commit exclusivo de master é documental: `9d40461babcec8eb8686c2a04be9c675df7da381`, que adiciona `docs/checkpoints/2026-11-08-production-migration-history-preflight.md` (blob `fb1a5a5a1bac36eb791925315f9a7964ae7fdfbf`). Não fiz rebase nem merge dessa alteração na QA. A nova nota desta rodada será adicionada como arquivo independente.

## Estado das PRs e CI

Todos os PRs consultados permanecem abertos e Draft. Não há reviews humanas registradas em #74, #75, #76, #82, #123 ou #124.

| PR | HEAD atual | Evidência exata | Classificação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | [Validate 42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696), [Smoke 42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) | AUTOMATED PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | [Candidate Checks 42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) | AUTOMATED PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `40809927be9eeda798e55d618a904752e351d7f6` | [Validate 42582875001](https://github.com/Reekyi/UpStatus/actions/runs/42582875001) | FAIL herdado |
| [#120 retry Normal](https://github.com/Reekyi/UpStatus/pull/120) | `086bc543e33f4c0a416b0453b5714f60d9e3f894` | [Validate 42577115565](https://github.com/Reekyi/UpStatus/actions/runs/42577115565) | AUTOMATED PASS |
| [#122 retry Team Lite](https://github.com/Reekyi/UpStatus/pull/122) | `ad9638eb8a8e2b89ee7fd5e27ab158cef12f7f6f` | [Source Guard 42578565781](https://github.com/Reekyi/UpStatus/actions/runs/42578565781) | AUTOMATED PASS |
| [#123 deploy guard Team Lite](https://github.com/Reekyi/UpStatus/pull/123) | `b8cd8e15a983b00fd5b1eaca0ffecfd18b9b0d99` | [Guard 42589119358](https://github.com/Reekyi/UpStatus/actions/runs/42589119358) | AUTOMATED PASS offline |
| [#124 signed uploads](https://github.com/Reekyi/UpStatus/pull/124) | `77c9d4c3b525325996db973cbec609ae2ddb0d83` | [Validate 42594697302](https://github.com/Reekyi/UpStatus/actions/runs/42594697302) | AUTOMATED PASS |

### #74 e #76: o que os testes realmente comprovam

No HEAD exato da #74, o Smoke registrou 19/19 verificações não autenticadas e 136/136 autenticadas. O log confirma negociação WebRTC de chamada, voz e tela com entrega de remote tracks, mesh de três membros, teardown, concorrência de voice attempts, rate limit 90 aceitas + 1 HTTP 429 com Retry-After 60s, setup enrollment e limpeza das fixtures.

No HEAD exato da #76, Candidate Checks confirmou 16/16 verificações não autenticadas e 110/110 autenticadas, 11/11 casos do mapper HTTP offline, Full-IIFE Playwright com endpoints inertes/stubs e WebRTC de chamada, voz e tela. O log também confirma mesh de três membros, rate limit, setup enrollment e cleanup.

Esses resultados são testes automatizados em ambiente isolado. Não são testes físicos no Tampermonkey com perda real de internet, permissões reais de microfone/display ou interoperabilidade instalada.

A #76 está 305 commits à frente e 0 atrás da #75, com a #75 como ancestral. A #75 é baseline histórica; não integrar #75 e #76 separadamente.

### #82: falha atual e causa exata

O Validate da QA falhou em `scripts/validate.mjs:26` com `production updateURL mismatch`.

A inspeção do build atual em master encontrou a causa: `scripts/build.mjs` declara `PROD_FUNCTION="upstatus"`, mas constrói a URL de produção usando o slug legado `upstatus-screen-share-3-1-1-beta10`. Já `release.json` aponta para `/functions/v1/upstatus/upstatus.user.js` e o validator exige `/upstatus/upstatus.user.js`. O artefato gerado e o destino de deploy não concordam. Não é falha causada pelo novo documento QA.

O workflow Normal atual continua manual-only, usa Supabase CLI `latest`, não fixa projeto/organização/SHA nem faz preflight de histórico de migrations, e publica somente `upstatus`.

### #123: deploy guard Team Lite

A candidata usa `workflow_dispatch` manual, confirmação explícita com default false, ref/SHA exatos de `team-lite-official`, Supabase CLI 2.122.1 fixada, validação de projeto/organização e preflight GET de quatro migrations. O único alvo de deploy é `upstatus-team-lite`; não aplica migrations.

O manifesto candidato declara Team Lite 3.4.31 stable, acima da versão instalada 3.4.30. O CI 42589119358 é um teste offline com Management API mockada. Não foi dispatch de produção.

O preflight exige:
- `20261107010000 / setup_invites`
- `20261107060000 / normalize_setup_invite_role`
- `20261107062000 / preserve_setup_invite_roles_verbatim`
- `20261109090000 / atomic_chat_read_receipts_and_visual_config_grants`

Nenhuma dessas quatro versões está aplicada em produção. Portanto, o guard deve falhar fechado no estado atual.

Gap P2: o guard verifica status do projeto e versões/nome de migrations, mas não verifica o estado da branch gerenciada `main` nem a completude do diretório local para todas as migrations remotas. A branch `main` está `MIGRATIONS_FAILED`, enquanto o projeto está `ACTIVE_HEALTHY`. Acrescentar verificação explícita do estado da branch e reconciliação do histórico antes de qualquer dispatch.

### #124: signed uploads

A #124 é baseada em `develop`, não em master ou team-lite-official. O HEAD atual `77c9d4c3` altera somente o validator: substitui uma asserção literal obsoleta `if(p.dataUrl){` por uma verificação do fallback real `String(p.dataUrl||"")` e `uploadFile("profile-images"...)`. O run anterior 42594529303 falhou nessa asserção stale; o run 42594697302 passou e confirma PROD 3.0.40 / TEST 3.0.40-beta.22.

O código cliente valida rota, bucket, origem do projeto, caminho, token, MIME declarado, tamanho, PUT sem credenciais e rejeição de redirects. O servidor cria URL assinada e mantém compatibilidade com avatar dataUrl legado. Os testes são VM/offline e não são upload real no Storage.

Achado P2 por inspeção: o novo caminho assinado valida o MIME e tamanho declarados pelo cliente, mas não inspeciona os bytes enviados. O helper cliente confia em `File.type` ou extensão; o servidor assina o upload antes de qualquer sniffing do conteúdo. O caminho legado `uploadFile` faz sniff dos bytes. Um cliente autenticado pode declarar `image/png` e enviar conteúdo diferente com esse Content-Type. Adicionar validação real de conteúdo/quarentena antes de tornar o objeto público. Os testes atuais não cobrem magic bytes.

Os buckets de produção continuam públicos. A documentação Supabase confirma que arquivos em bucket público são acessíveis publicamente: https://supabase.com/docs/guides/storage/serving/downloads. Signed upload controla quem obtém a capacidade de escrita, mas não torna o objeto privado.

## Supabase: estado e causa confirmada de MIGRATIONS_FAILED

Produção:
- Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Branch gerenciada `main`: MIGRATIONS_FAILED; preview_project_status ACTIVE_HEALTHY.
- Histórico remoto: 7 migrations, até `20261027155438 / set_upstatus_upload_limits_20mb`.
- 38/38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`.
- `upstatus` v480; `upstatus-team-lite` v15; `upstatus-test` v281; função de signaling server-mediated ausente.
- A lista inclui muitas funções beta/test/backup antigas ainda ACTIVE; requer inventário e decisão de desativação, sem presumir que `verify_jwt=false` significa ausência de autenticação.

Laboratório:
- Projeto `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- 38 migrations, até `20261108050802`.
- `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- As contagens read-only de users, sessions, messages, chat_reads, signal rooms/events, voice attempts e call attempts retornaram zero.

### Causa imediata confirmada da falha da branch main

O log Supabase `workflow_run_logs` de 2026-11-08 13:47:43 UTC contém:

`ERROR Remote migration versions not found in local migrations directory.`

A comparação confirma a causa:
- O histórico remoto de produção contém sete versões.
- `master/supabase/migrations` contém somente três arquivos: 20261005160000, 20261005173000 e 20261005180000.
- Faltam no diretório local os arquivos das quatro migrations já aplicadas remotamente:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

Os quatro arquivos não foram encontrados em master, #74, #76 ou #123 durante esta inspeção. Não reconstruir SQL histórico a partir do schema atual. Recuperar os artefatos originais ou definir, com revisão humana, uma estratégia de baseline/reconciliação. Não executar migration para tentar corrigir esse estado.

### AUTH-03: setup inicial

A inspeção dos runtimes instalados Normal v480 e Team Lite v15 confirma que `POST /api/setup` chama `login(req,true)` antes de exigir contexto autenticado. O código implantado permite que o primeiro chamador que conheça uma conta sem password_hash defina a senha; quando o papel está vazio, existe fallback de admin por nome (Ricardo, Lohan, Guilherme).

Snapshot atual:
- 5 usuários em produção.
- 0 password hashes vazios.
- 0 papéis vazios.
- 0 colunas setup-token em produção.
- RPC `consume_upstatus_setup_invite` ausente em produção.

Não há conta atualmente desconfigurada, mas o caminho de primeiro acesso/reset continua sem prova de convite. Os templates candidatos #74/#76 exigem token hexadecimal de 64 caracteres e consomem convite via RPC. No laboratório, `consume_upstatus_setup_invite` é SECURITY INVOKER, search_path vazio e EXECUTE somente para service_role. A migration ainda não foi aplicada em produção.

### Readiness, capacidade e idempotência

As candidatas #109, #112 e #117 possuem CI de contrato aprovado:
- [#109 Validate 42554593978](https://github.com/Reekyi/UpStatus/actions/runs/42554593978)
- [#112 Validate 42555495928](https://github.com/Reekyi/UpStatus/actions/runs/42555495928)
- [#117 Validate 42565813869](https://github.com/Reekyi/UpStatus/actions/runs/42565813869)

No laboratório, `upstatus-signal-test` continua v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`. A inspeção confirmou ausência de `/ready`, `database-v2`, ledger `upstatus_signal_event_idempotency`, RPC de enqueue idempotente e RPC de readiness. Nenhuma migration candidata foi aplicada.

A #120/#122 melhorou a retenção e reutilização de chave/corpo durante retries. Isso não fecha anti-replay com chave nova: a deduplicação do servidor é por chave; o mesmo SDP/ICE repetido com nova chave pode ser aceito. Manter replay com nonce/sequence/operation identity verificável pelo servidor como gate separado.

## Realtime, RLS, grants e SECURITY DEFINER

### Realtime

A inspeção dos userscripts embutidos nos runtimes instalados confirmou:
- Normal v480 e Team Lite v15 assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Nenhum usa `private:true` ou `realtime.setAuth()`.
- Triggers PostgreSQL publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, tópico diferente.
- Snapshot de `realtime.messages`: 50 mensagens, todas `private=false` (42 `user_status`, 8 `db_change`).

Os três triggers de broadcast são SECURITY DEFINER, `search_path=public`, com EXECUTE efetivo para anon/authenticated:
- `upstatus_broadcast_messages`: envia `to_jsonb(OLD/NEW)` completo, incluindo conteúdo e metadados da mensagem.
- `upstatus_broadcast_remote_state`: publica campos de comando e resultado.
- `upstatus_broadcast_users`: publica nome/status/reason/update.

O Security Advisor reporta 3 WARN para anon e 3 WARN para authenticated. Não foi feita tentativa HTTP de invocação direta das funções; elas retornam trigger e estão anexadas a triggers. O payload público e os grants desnecessários permanecem risco confirmado por código/catálogo. A configuração efetiva de acesso público no Dashboard não foi verificada.

### RLS e privilégios

Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 das 10 têm privilégios amplos para anon/authenticated, incluindo TRUNCATE.
- `upstatus_visual_config` não concede privilégios diretos aos papéis clientes.
- `realtime.messages` e `storage.objects`: RLS true, zero policies, SELECT/INSERT/UPDATE efetivos para anon/authenticated.
- Default ACLs de postgres em public/storage e de supabase_admin em public/GraphQL continuam amplas.

Laboratório:
- 17 tabelas públicas com RLS e zero policies, sem grants diretos de tabela para anon/authenticated.
- `realtime.messages` e `storage.objects` ainda têm grants SELECT/INSERT/UPDATE para anon/authenticated e zero policies.
- Default ACLs de postgres em public estão restritas a postgres/service_role; defaults em storage e de supabase_admin em public/GraphQL ainda são amplas.

Advisors atuais:
- Produção Security: 6 WARN / 10 INFO; Performance: 0; Health: 0.
- Laboratório Security: 0 WARN / 17 INFO; Performance: 4 INFO; Health: 0.

### Storage

Buckets de produção:
- `chat-images`: public=true, 20 MiB, MIME de imagem/vídeo/áudio/documentos.
- `profile-images`: public=true, 20 MiB, MIME de imagem.

A privacidade dos anexos continua sem decisão. A nova PR #124 não altera essa configuração.

## Issues, governança e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios físicos marcados. Ainda faltam perda real de internet, recuperação sem F5, reentrada, novas chamadas, microfone/display reais e interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 16 marcados e 19 pendentes no corpo. O checklist mantém RT-01/RT-05/RT-08/RT-09/RT-10/RT-11/RT-12/RT-15/RT-16, rollout/rollback e outras pendências.
- Nenhuma review humana foi encontrada nas PRs examinadas.
- A leitura do endpoint GitHub de branch protection retornou 403; portanto, o estado de proteção/required checks não foi confirmado nesta rodada. Não afirmar que as branches estão desprotegidas sem evidência adicional.

## Classificação final

**AUTOMATED PASS**
- #74 Validate + Signaling Smoke no HEAD exato.
- #76 Candidate Checks no HEAD exato.
- #120 retry explícito Normal.
- #122 retry cache Team Lite.
- #123 deploy guard offline/mocked.
- #124 Validate no HEAD atual após corrigir assertion stale.
- Contratos de #109, #112 e #117.

**CODE INSPECTION**
- AUTH-03 first-caller setup nos runtimes instalados.
- Migration history drift e causa de MIGRATIONS_FAILED.
- Tópicos Realtime divergentes e payloads de broadcast.
- RLS/grants/Default ACLs/SECURITY DEFINER.
- Signed upload sem validação de bytes.

**MANUAL PENDING**
- Os oito critérios da #78.
- Tampermonkey instalado, rede física, permissões reais e interoperabilidade.

**BLOCKED**
- Cutover Normal/Team Lite por migrations ausentes, AUTH-03, Realtime público, Storage público, workflows, ausência de runtime signal e anti-replay.
- Testes de integração no laboratório aguardam autorização explícita de mutação.
- Não despachar workflow Team Lite antigo.
- Não aplicar migrations para tentar corrigir a divergência histórica.

## Próximos gates

1. Recuperar os quatro arquivos de migrations históricos ausentes e reconciliar o histórico local/remoto; não reconstruir SQL por inferência.
2. Corrigir o build Normal para alinhar updateURL, function slug e workflow.
3. Acrescentar ao guard Team Lite a verificação de branch main MIGRATIONS_FAILED e consistência de todo o histórico remoto/local.
4. Fechar AUTH-03 nos dois runtimes, removendo first-caller setup e role fallback por nome.
5. Definir anti-replay server-side com nonce/sequence/operation identity, além da idempotência por chave.
6. Obter autorização de janela de mutação no laboratório, validar allowlist e executar readiness/capacidade/replay somente depois da revisão das migrations.
7. Migrar Realtime para tópicos privados/autenticados, payload mínimo e grants restritos.
8. Revisar grants, Default ACLs e funções SECURITY DEFINER; definir Storage privado ou aceitar formalmente acesso público.
9. Corrigir signed upload para validar conteúdo real, não apenas MIME declarado.
10. Corrigir workflows Normal/Team Lite, obter reviews humanas, documentar rollout/rollback e completar #78.

**Decisão: NÃO LIBERAR.**

Nenhuma migration, SQL write, fixture, deploy, merge, release, publicação de userscript ou alteração de secrets/flags/roles/grants/policies/ACLs foi realizada nesta auditoria. Todas as consultas de banco foram somente leitura. A única escrita autorizada é este novo registro documental na branch QA.
