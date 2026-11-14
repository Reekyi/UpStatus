# Auditoria independente UpStatus — 2026-11-09 11:34 UTC

## Escopo e método

Projeto auditado: userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

- GitHub: Reekyi/UpStatus
- Supabase produção: `dlfvkawaiqduhlazsszm`
- Supabase laboratório isolado: `bfpjtfqlnypisxljoxkb`

Classificações:
- **AUTOMATED PASS**: workflow/teste concluído com sucesso no SHA indicado.
- **CODE INSPECTION**: inspeção de fonte, configuração ou catálogo; não prova comportamento de runtime.
- **MANUAL PENDING**: depende de navegador/dispositivo real ou aceite humano.
- **BLOCKED**: pré-condição impeditiva confirmada.
- **NOT VERIFIED**: evidência não disponível ou não pertence ao HEAD/ambiente atual.

### Leitura do documento principal

A ref QA foi consultada antes da auditoria. `docs/RELEASE_READINESS.md` permanece no blob SHA `7cfbd70886df42ce790097c878e41ebec5846d90`. O endpoint de conteúdo retornou corpo vazio para o documento grande (aprox. 1.045.105 caracteres), inclusive nas tentativas por intervalo/base64. A nota QA anterior de 10:30 UTC registra a leitura integral desse mesmo SHA. O SHA não mudou; não editei o documento principal.

Todas as consultas SQL desta rodada foram SELECT/catalog-only. Não foram executados scripts de teste, fixtures, migrations, deploys, merges, releases ou publicações. Não houve alteração de secrets, flags, roles, grants, policies ou ACLs.

## Heads e integridade da QA

| Ref | SHA |
|---|---|
| QA `qa/release-readiness-2026-11-04-master` | `9b48bb1a0d61fe6e4107951e860b325506929d29` |
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

Comparação `master...QA`: **157 commits à frente / 1 atrás**, merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. O commit exclusivo de master continua sendo documental, `9d40461...`, com o checkpoint de histórico de migrations. Não fiz rebase, merge ou alteração em branches de engenharia.

## PRs solicitadas e evidência de CI

| PR | HEAD | Evidência atual | Classificação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | [Validate 42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696); [Smoke 42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) | AUTOMATED PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | [Candidate Checks 42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) | AUTOMATED PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `9b48bb1a0d61fe6e4107951e860b325506929d29` | [Validate 42602151790](https://github.com/Reekyi/UpStatus/actions/runs/42602151790) | AUTOMATED FAIL |

### #74 e #76

No SHA exato da #74, o Signaling Smoke passou com 19/19 verificações não autenticadas e 136/136 autenticadas. O log registra WebRTC de chamada, voz e compartilhamento com remote tracks, mesh de três participantes, teardown, concorrência de voice attempts, rate limit 90 aceitas + 1 HTTP 429 com Retry-After de 60s, setup enrollment e cleanup.

No SHA exato da #76, Candidate Checks passou com 16/16 verificações não autenticadas, 110/110 autenticadas e 11/11 casos do mapper HTTP offline. O workflow inclui Full-IIFE Playwright com endpoints inertes/stubs, WebRTC, mesh, rate limit, setup enrollment e cleanup.

Esses resultados são automatizados e isolados. Não comprovam Tampermonkey instalado, queda física de rede, permissões reais de microfone/display nem interoperabilidade física Normal ↔ Team Lite.

A #76 é a evolução da #75; a #75 é baseline histórica e não deve ser integrada separadamente da #76.

### #82: falha herdada de master

O run exato do HEAD atual falhou em `scripts/validate.mjs:26`:

`VALIDATION FAILED: production updateURL mismatch`

O log confirma que o build termina como PROD/TEST 3.4.7 e falha na assertion de updateURL. É a divergência herdada do master, não uma regressão introduzida pela nota QA.

A correção está na Draft [#85](https://github.com/Reekyi/UpStatus/pull/85), HEAD `b75707b6eaf678d87863144748b9aed8e2866455`, com [Validate 42475230911 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42475230911). #85 não foi integrada; portanto o Validate da #82 continua falhando.

### Retry candidates ainda não integradas nos heads de release

- [#120 Normal](https://github.com/Reekyi/UpStatus/pull/120), HEAD `086bc543e33f4c0a416b0453b5714f60d9e3f894`, [Validate 42577115565 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42577115565).
- [#122 Team Lite](https://github.com/Reekyi/UpStatus/pull/122), HEAD `ad9638eb8a8e2b89ee7fd5e27ab158cef12f7f6f`, [Source Guard 42578565781 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42578565781).

As duas são Drafts em branches próprias. #120 está baseada em branch descendente da #74, e #122 em branch descendente da #76, mas seus commits não estão nos HEADs atuais #74/#76. Não declarar a paridade de retry integrada aos candidatos de release até atualizar/validar esses heads exatos.

## Guards de deploy Team Lite: #123, #125 e #126

- [#123](https://github.com/Reekyi/UpStatus/pull/123), HEAD `b8cd8e15a983b00fd5b1eaca0ffecfd18b9b0d99`: guard offline [42589119358 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42589119358). Corrige o alvo para `upstatus-team-lite`, fixa CLI 2.122.1 e exige confirmação/SHA/projeto/migrations. Não aplica migrations.
- [#125](https://github.com/Reekyi/UpStatus/pull/125), HEAD `35c9122d5a07a0890c1fafda86cadd3a842f96b1`: [dispatcher offline guard 42598649482 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42598649482), job deploy SKIPPED. O Validate separado [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) falha no updateURL herdado de master.
- [#126](https://github.com/Reekyi/UpStatus/pull/126), HEAD `048f74c7987c02225260605480a535c3808ebcfa`: [contrato offline 42598779957 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42598779957). Apenas o job offline foi executado; Preview/live Management API e deploy foram skipped/não executados.

### Achado P2 — aprovação do dispatcher #125 não prova review humano atual

Inspeção do workflow mostra que a checagem seleciona o último estado APPROVED/CHANGES_REQUESTED/DISMISSED, exige APPROVED e login diferente do autor. Não verifica:
- se o reviewer é humano (não Bot);
- se o review foi submetido no HEAD atual do PR (`review.commit_id == head.sha`);
- se o reviewer tem permissão ou pertence ao grupo autorizado de release.

Uma aprovação de bot ou review antiga pode satisfazer a condição textual. O workflow usa o environment `production`, mas a configuração de reviewers desse environment não foi verificável pela conexão disponível.

Correção: reviewer humano e autorizado, aprovação vinculada ao HEAD exato, dismiss stale approvals e proteção obrigatória de branch/environment. A listagem de rulesets retornou vazia; os refs consultados indicam branches oficiais sem proteção obrigatória.

### Achado P2 — #126 reconcilia filename/version/name, não checksum do SQL

`assertRemoteMigrationsHaveLocalFiles` compara versão/nome remoto com o nome do arquivo local. Detecta ausência e divergência de nome, mas não detecta conteúdo SQL alterado mantendo o mesmo filename.

A Management API de migrations fornece version/name, não checksum do SQL. A recuperação histórica deve trazer proveniência verificável (blob SHA/artefato original revisado ou manifesto de hashes aprovado). Não basta recriar arquivos com os nomes corretos.

## Supabase: estado, migrations e runtime

### Projetos e branches

| Projeto | Status | PostgreSQL | Migrations |
|---|---|---|---:|
| Produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 |
| Laboratório `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 38 |

A branch gerenciada default `main` da produção aponta para Git `master`, mas está **MIGRATIONS_FAILED**; preview está ACTIVE_HEALTHY. O log de 2026-11-08 13:47:43 UTC registra:

`Remote migration versions not found in local migrations directory.`

### Causa imediata confirmada do MIGRATIONS_FAILED

O histórico remoto de produção contém sete migrations até `20261027155438`. Os diretórios de `master`, QA, `develop` e `team-lite-official` contêm apenas as três migrations iniciais. As branches candidatas #74, #76 e #126 contêm migrations novas, mas não os quatro arquivos históricos abaixo. A busca de commits pelos quatro nomes não retornou commits.

1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

Isso confirma drift local/remoto como causa imediata do erro da branch gerenciada. Não prova que os originais nunca existiram em backup externo. Recuperar os SQLs originais e validar proveniência; não reconstruir SQL olhando o schema atual.

### Sinalização candidata ainda não instalada

Produção:
- 38/38 Edge Functions ACTIVE.
- `upstatus` v480, source SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite` v15, source SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10` v6.
- Nenhuma função `upstatus-signal` server-mediated em produção.

Laboratório:
- `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`.
- `upstatus-signal-e2e-once` v3.
- Sete tabelas de sinalização candidatas existem, mas `upstatus_signal_event_idempotency` não existe.
- Nenhuma RPC de readiness/enqueue foi encontrada; a v32 não contém `/ready` database-v2.

A lista de migrations do laboratório tem 38 entradas, mas não inclui a migration candidata de idempotência/readiness mais recente. A presença de arquivos em branches não equivale a aplicação no banco.

Todas as 38 funções de produção reportam `verify_jwt=false`; isso isoladamente não prova ausência de autenticação. Os handlers principais inspecionados usam autenticação própria por token de sessão. A revisão individual de todas as 38 funções permanece pendente.

## AUTH-03: P1 no runtime de produção

Inspeção direta dos runtimes Normal v480 e Team Lite v15:

- `POST /api/setup` encaminha para `login(req,true)` antes do middleware/contexto autenticado.
- Se a conta existe e ainda não tem `password_hash`, o primeiro chamador que conhece o nome define a senha sem prova de convite.
- Se o papel está vazio, há fallback nominal que atribui `implementation_admin` a Ricardo, Lohan e Guilherme.
- Política de senha diverge: Normal setup exige 6 caracteres; Team Lite setup aceita 4.

Snapshot de produção:
- 5 usuários.
- 0 hashes de senha vazios.
- 0 papéis vazios.
- Nenhuma coluna `setup_token_*`.
- RPC `consume_upstatus_setup_invite` ausente.

O laboratório possui as quatro colunas de setup-token e a RPC de consumo. Produção não recebeu AUTH-03. Não houve tentativa de explorar o endpoint em produção.

## Realtime, RLS, grants e SECURITY DEFINER

### Realtime

Produção `realtime.messages`: 50 linhas, 42 `user_status` e 8 `db_change`; todas `private=false`.

O trigger `upstatus_broadcast_messages()` é SECURITY DEFINER, `search_path=public`, e publica `to_jsonb(OLD/NEW)` completo no tópico:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

Os userscripts embutidos nos runtimes Normal e Team Lite assinam:

`upstatus-screen-share-live-3-1-1-beta10`

Ambos não contêm `private:true` nem `realtime.setAuth()`. Há divergência de tópicos entre trigger e clientes; entrega trigger-to-client não está demonstrada. O caminho de publicação do banco continua público (`private=false`); acesso externo efetivo no Dashboard não foi verificado.

### RLS/grants

Produção:
- 10 tabelas public com RLS e zero policies.
- 9 dessas tabelas têm grants amplos a anon/authenticated, incluindo TRUNCATE; `upstatus_visual_config` é a exceção sem grants diretos.
- `realtime.messages`: RLS, zero policies, grants de SELECT/INSERT/UPDATE para papéis clientes.
- `storage.objects`: RLS, zero policies, grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
- Três funções broadcast SECURITY DEFINER com `search_path=public` e EXECUTE para anon/authenticated.

Laboratório:
- 17 tabelas public com RLS e zero policies, sem grants diretos a anon/authenticated nas tabelas public.
- Três funções broadcast com `search_path` vazio e sem EXECUTE para papéis clientes.
- `realtime.messages` e `storage.objects` ainda têm grants para anon/authenticated, sem policies.

Default ACLs de produção permanecem amplas em public/storage e schemas GraphQL. No laboratório, os defaults de postgres em public estão mais restritos, mas permanecem ACLs amplas de supabase_admin em public/GraphQL e de postgres em storage.

Security Advisor observado em 11:34 UTC:
- Produção: 3 WARN anon + 3 WARN authenticated + 10 INFO RLS/no-policy; Performance 0; Health 0.
- Laboratório: 0 WARN + 17 INFO RLS/no-policy; Performance 4 INFO de índices não usados; Health 0.

RLS sem policy nega acesso a linhas para papéis clientes, portanto grants amplos não foram tratados como prova isolada de leitura/escrita efetiva. Continuam sendo privilégios desnecessários e risco de expansão futura.

## Storage e signed upload

Buckets de produção:
- `chat-images`: public=true, 20 MiB.
- `profile-images`: public=true, 20 MiB.
- Laboratório não possui esses buckets.

A #124 (branch develop) passou no Validate [42594697302](https://github.com/Reekyi/UpStatus/actions/runs/42594697302), mas não está integrada nem houve upload real. A inspeção anterior da rota signed-upload identificou que ela confia no MIME/tamanho declarados pelo cliente e não inspeciona magic bytes antes da publicação. Como os buckets são públicos, validação posterior deixa janela de exposição. Exigir inspeção server-side antes de publicar ou bucket privado de quarentena com finalize/copy após validação.

## Issues e aceitação física

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, **0/8** critérios físicos aprovados. Permanecem pendentes perda real de internet, recuperação sem F5, reentrada, novas chamadas, microfone/display reais, multiaba e interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, **16/35** itens marcados e 19 pendentes.

Nenhum teste físico foi executado nesta rodada.

## Classificação final

**AUTOMATED PASS**
- #74 Validate + Signaling Smoke no HEAD exato.
- #75 Candidate Checks histórico; baseline superada pela #76.
- #76 Candidate Checks no HEAD exato.
- #120 Validate no HEAD exato.
- #122 Source Guard no HEAD exato.
- #123 guard offline/mocked.
- #125 offline guard; deploy SKIPPED.
- #126 contrato offline focado.

**AUTOMATED FAIL**
- #82 Validate no HEAD atual: production updateURL mismatch.
- #125 Validate separado: mesma falha herdada de master.

**CODE INSPECTION**
- AUTH-03 first-caller setup e fallback nominal nos runtimes instalados.
- Drift de migrations e causa imediata de MIGRATIONS_FAILED.
- Retry candidates #120/#122 fora dos HEADs atuais #74/#76.
- Lacunas de aprovação/proveniência nos guards #125/#126.
- RLS/grants/Default ACLs/SECURITY DEFINER/Realtime/Storage.

**MANUAL PENDING**
- Oito critérios físicos da #78.
- Tampermonkey instalado, rede real, microfone/display e interoperabilidade instalada.

**BLOCKED**
- Deploy Team Lite: managed main MIGRATIONS_FAILED e quatro fontes históricas ausentes.
- Cutover Normal: AUTH-03 ausente na produção e workflow estabilizado não integrado.
- Transporte Realtime autenticado ausente dos runtimes implantados.
- Idempotência/readiness server-side ausente no laboratório v32.
- Testes com fixtures aguardam autorização explícita para janela controlada do laboratório.
- Reviews humanas e proteção obrigatória de branches/environments ausentes/não confirmadas.

## Próximos gates

1. Recuperar os quatro SQLs históricos originais com proveniência/hash confiável; não reconstruir por inferência.
2. Reconciliar histórico local/remoto e obter managed main ACTIVE_HEALTHY.
3. Corrigir #125: reviewer humano/autorizado, review no HEAD exato e proteção de environment/branch.
4. Fortalecer #126 com proveniência/checksum dos SQLs, além de filename/version/name.
5. Integrar os retry candidates #120/#122 nos HEADs exatos de release e revalidar Normal/Team Lite juntos.
6. Fechar AUTH-03 nos dois runtimes e remover first-caller setup/fallback nominal.
7. Definir anti-replay server-side além da idempotência por chave; aplicar readiness/idempotência no laboratório somente após autorização de mutação.
8. Migrar Realtime para privado/autenticado, reduzir payloads e restringir grants/default ACLs.
9. Decidir privacidade Storage e validar bytes antes de publicar uploads.
10. Corrigir updateURL em master por integração revisada de #85; revalidar #82.
11. Proteger branches/environments, obter reviews humanas, documentar rollout/rollback e concluir #78.

**DECISÃO: NÃO LIBERAR.**

Nenhuma migration, SQL write, fixture, deploy, merge, release, publicação de userscript ou alteração de secrets/flags/roles/grants/policies/ACLs foi realizada. A única escrita desta rodada é este documento novo na branch QA.


## Revalidação do commit documental — 2026-11-09 11:40 UTC

Após criar esta nota, o HEAD QA passou a `7e3458f1c507727699fe998e26601c3fceb7cdde`. O commit tem como pai exato `9b48bb1a0d61fe6e4107951e860b325506929d29` e adiciona somente este arquivo.

O Validate disparado para o HEAD documental terminou FAILURE:
- [Run 42610880664](https://github.com/Reekyi/UpStatus/actions/runs/42610880664)
- Job `validate` 129138682391.
- Build concluiu PROD/TEST 3.4.7.
- Falha em `scripts/validate.mjs:26`: `production updateURL mismatch`.

É a mesma assertion herdada de master observada na #82; a nota QA não alterou código nem workflow. O novo SHA documental não é considerado CI-green.

Blob antes do acréscimo: `f07dd7dea574c9656208358a75405e428a59f326`. Esta atualização foi feita somente após buscar novamente conteúdo e SHA atuais; nenhum conteúdo concorrente foi substituído.
