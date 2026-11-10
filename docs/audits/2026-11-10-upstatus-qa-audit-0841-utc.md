# Auditoria independente UpStatus — 2026-11-10 08:41 UTC

## Parecer

**Release recommendation: `not_ready`.** Os workflows dos candidatos Normal, Team Lite, AUTH-03 e do alinhamento de destino API passaram nos SHAs auditados, mas a cadeia não está pronta para release. Foram encontrados dois bloqueadores adicionais no código candidato: (1) a origem autenticada de sinais de chamada ainda é representada por um campo controlado pelo payload em #74 e #76; (2) a correção do destino API existe na PR #132, mas ainda não está no HEAD da #74. Produção permanece com broadcast Realtime público, setup legado sem convite e grants/ACLs excessivos.

## Heads e estado do GitHub

Fotografia consultada em 2026-11-10 08:41 UTC:

| Referência | HEAD | Relação relevante |
|---|---|---|
| `master` | `9d40461` | referência principal |
| QA `qa/release-readiness-2026-11-04-master` | `2fcee18` antes deste relatório | 182 à frente e 1 atrás de master |
| `chore/continuity-foundation` | `fb878537` | 883 à frente e 1 atrás de master |
| `team-lite-official` | `9065bc` | referência oficial Team Lite |
| PR #74 Normal | `fb878537` | Draft; Validate e Smoke verdes neste SHA |
| PR #75 Team Lite baseline | `7bbf9b9` | PASS histórico; não substitui o candidato atual |
| PR #76 Team Lite | `3b1406dd` | 378 à frente e 0 atrás de team-lite-official |
| PR #82 QA | `2fcee18` | 182 à frente e 1 atrás de master; Validate falhou |
| PR #131 AUTH-03 Normal | `17169a30` | 1 à frente e 0 atrás da base |
| PR #132 API target Normal | `74d787ba` | 4 à frente e 0 atrás da base |
| PR #129 guard Team Lite | `886d364` | Draft; guard offline passou |

As PRs #74, #75, #76, #82, #131 e #132 não apresentam reviews humanas registradas. Permanecem abertas/Draft, sem merge.

## CI e testes automatizados

- **Normal #74:** [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Signaling Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) concluídos com sucesso no HEAD `fb878537`. O log do Smoke confirma 136/136 verificações autenticadas, negociação WebRTC e entrega de faixa remota para chamada, voz e vídeo de tela, mesh de três participantes, teardown, limite de sinalização e testes de sala/convite. Isso é CI em ambiente isolado, não aceitação física.
- **Team Lite #76:** [Candidate Checks 42753492373](https://github.com/Reekyi/UpStatus/actions/runs/42753492373) concluído com sucesso no HEAD `3b1406dd`. O log confirma 110/110 verificações autenticadas, Playwright com stubs de Tampermonkey, WebRTC para chamada/voz/tela, mesh de três participantes, recuperação de salas, rate limit e limpeza.
- **Team Lite #75:** [run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é PASS histórico no SHA `7bbf9b9`; não é evidência nova do HEAD #76.
- **AUTH-03 #131:** [Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) passou no SHA `17169a30`. O job executou os testes de concorrência de emissão de convite, isolamento de buckets, consumo atômico, integração autenticada e navegador.
- **API target #132:** [Validate 42773004553](https://github.com/Reekyi/UpStatus/actions/runs/42773004553) passou no SHA `74d787ba`, incluindo histórico da branch Team Lite, guard de build TEST e validação dos artefatos Normal/TEST.
- **QA #82:** [Validate 42776640891](https://github.com/Reekyi/UpStatus/actions/runs/42776640891) falhou no HEAD `2fcee18` com `production updateURL mismatch`, em `scripts/validate.mjs:26`. Não houve novo check no HEAD QA após o append documental desta auditoria.
- **Follow-ups de proveniência de chamada:** [#102 run 42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669), [#103 run 42554766818](https://github.com/Reekyi/UpStatus/actions/runs/42554766818) e [#104 run 42524476674](https://github.com/Reekyi/UpStatus/actions/runs/42524476674) passaram seus guards offline. Eles não equivalem à integração dessas correções em #74/#76 nem a um cutover.
- **Team Lite deploy guard:** [#129 run 42670892535](https://github.com/Reekyi/UpStatus/actions/runs/42670892535) passou offline, mas a PR continua Draft e a branch oficial não foi alterada.

## Achados novos de código candidato

### 1. A origem autenticada do sinal ainda pode ser falsificada em #74 e #76

No Normal candidato, `src/userscript/upstatus.user.template.js` ainda cria `_authenticatedTransport:true` dentro do payload recebido por polling e `receiveCallSignal(p)` decide confiança consultando `p._authenticatedTransport`. O listener público de Realtime encaminha o payload sem uma origem confiável fora de banda.

No Team Lite candidato, `team-lite/upstatus-team-lite.user.js` repete o mesmo padrão: o polling marca o objeto com `_authenticatedTransport:true`, enquanto o listener público encaminha o objeto e o receiver confia nessa propriedade. Um remetente de broadcast público pode construir o mesmo campo. Quando o transporte autenticado é habilitado, isso enfraquece o limite de confiança que deveria separar sinais privados dos públicos. A allowlist atual ainda aceita `join_declined` como hint público, além de presence/ended.

Os follow-ups #102 e #103 corrigem o desenho passando `authenticatedSource` fora do payload, marcando o listener público como `false`, removendo o marcador e limitando discovery público a propriedades próprias `presence`/ `ended`. Os guards offline passaram, mas os commits não estão integrados nos HEADs auditados #74 e #76. A PR #104 também endurece o gate RT-01 e exige a migration de rate limit de sinalização; é um guard, não a implementação/cutover.

**Impacto:** RT-01 permanece bloqueado. Não tratar os testes atuais como prova de que o transporte autenticado rejeita spoofing no candidato principal.

### 2. Correção de destino API existe em #132, mas não está no HEAD da #74

No HEAD #74, `scripts/build.mjs` ainda monta `CLOUD_SERVER` para `upstatus-screen-share-3-1-1-beta10`, enquanto `.github/workflows/deploy-production.yml` publica a função `upstatus`. Isso mantém o artefato #74 desalinhado do destino que o workflow publica.

A PR #132 corrige o build para derivar a URL de `PROD_FUNCTION` e acrescenta validação de igualdade entre o alvo do userscript e o slug do workflow. Seu CI passou. Porém, #132 é uma PR Draft filha, quatro commits à frente da base `chore/continuity-foundation`; o HEAD da #74 continua em `fb878537` e não contém a correção. Produção também não foi atualizada.

O `release.json` Normal continua em versão `3.4.7`. Team Lite candidato declara build `3.4.31`, enquanto o runtime oficial ainda serve `3.4.30`. Não há publicação validada.

### 3. Dispatcher oficial Team Lite segue inseguro até integração de #129

Na branch `team-lite-official`, `.github/workflows/deploy-production.yml` ainda expõe `workflow_dispatch`, usa environment/secrets de produção, Supabase CLI `latest` e executa deploy do slug `upstatus`, que é o runtime Normal. A #129 substitui o dispatcher por um bloqueio explícito e tem guard offline PASS, mas continua Draft e não foi integrada. Não executar o dispatcher legado.

## Supabase — produção (somente leitura)

Projeto `dlfvkawaiqduhlazsszm`, estado ACTIVE_HEALTHY. A lista contém 38 Edge Functions; todas reportam `verify_jwt=false`. Isso não prova, isoladamente, ausência de autenticação: os três runtimes principais inspecionados usam autenticação própria por token. Os demais handlers não foram todos auditados individualmente.

Runtimes principais:
- `upstatus` v480, código `VERSION 3.4.7`, userscript embutido 3.4.7.
- `upstatus-team-lite` v15, userscript embutido 3.4.30.
- `upstatus-screen-share-3-1-1-beta10` v6, mas o userscript embutido declara 3.1.1-beta8 e aponta para a função/tópico beta8.
- Não há função de produção `upstatus-signal`. No laboratório existem apenas `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

Os três runtimes inspecionados ainda encaminham `POST /api/setup` para `login(req,true)`. A consulta de catálogo confirmou ausência, em produção, de colunas `setup_token_*`, RPC de consumo de convite, tabela de rate limit de convites e RPC de rate limit. A melhoria candidata não está implantada.

### Realtime

A consulta SELECT-only encontrou 48 mensagens em `realtime.messages`; 48/48 são `private=false`. Destas, 39 ocorreram nas últimas 48 horas: 20 `db_change`, 13 `user_status`, 3 `remote_command` e 3 `remote_result`. O tópico dos triggers é `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

Os clientes efetivamente embutidos continuam:
- Normal: `CLOUD_SERVER` beta10 e tópico `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite: API `upstatus-team-lite`, tópico beta10.
- Screen Share beta10: script embutido beta8, API/tópico beta8.

Nenhum dos três bundles usa `private:true` ou `realtime.setAuth()`. `realtime.messages` tem RLS habilitado, zero policies e grants SELECT/INSERT efetivos para anon/authenticated; a exposição principal observada é que as mensagens broadcast foram armazenadas como públicas. Não foi feita exploração externa.

### RLS, grants, ACL e SECURITY DEFINER

- Dez tabelas `public` têm RLS habilitado e zero policies.
- Nove dessas tabelas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE e TRUNCATE segundo `has_table_privilege`; `upstatus_visual_config` não concede esses privilégios diretamente.
- `pg_default_acl`: seis entradas, 24 itens ACL. Para os owners `postgres` e `supabase_admin`, defaults concedem privilégios amplos de tabela (`arwdDxtm`), EXECUTE em funções (`X`) e privilégios de sequência (`rwU`) a anon/authenticated.
- `storage.objects`: RLS habilitado, zero policies; anon/authenticated têm SELECT, INSERT, UPDATE e DELETE efetivos no catálogo.
- Buckets `chat-images` e `profile-images` são públicos, ambos com limite de 20 MiB.
- Três funções `upstatus_broadcast_*` são `SECURITY DEFINER`, `search_path=public`; catálogo confirma EXECUTE para anon/authenticated. O Advisor reporta 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policy. Como as funções retornam `trigger`, não foi demonstrada invocação direta por RPC; os grants devem ser restringidos de qualquer forma.

## Supabase — laboratório

Projeto `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, 39 migrations, 18 tabelas públicas, duas Edge Functions de teste. SELECT-only confirmou zero users, sessions, messages, chat_reads, state rows, Realtime messages, buckets e objects. As tabelas públicas têm RLS e nenhuma policy; não há SELECT/INSERT direto para anon/authenticated. As RPCs de convite e rate limit são SECURITY INVOKER, `search_path` vazio e EXECUTE somente para service_role.

A migration aplicada no laboratório para rate limit é `20261110000612_setup_invite_rate_limit_contract_test_20261109`; a migration candidata de produção `20261109230000_setup_invite_rate_limit.sql` não aparece no histórico remoto do laboratório. Portanto, o contrato foi testado com migration de teste, mas a proveniência/aplicação do SQL de produção ainda não foi comprovada. O laboratório também não possui buckets Storage nem runtime full-product independente.

## Migrations e proveniência

Produção tem sete migrations remotas e branch gerenciada `main` em `MIGRATIONS_FAILED`. Os quatro SQLs originais continuam ausentes de `master` (404):
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_message_file_name.sql` (nome de arquivo solicitado/esperado deve ser conferido; o arquivo remoto registrado é `add_chat_message_file_name`)
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Correção: a lista contém quatro arquivos, sendo o segundo `20261026195855_add_chat_message_file_name.sql`; o nome acima com prefixo `allow` é apenas uma observação de nomenclatura, não um quinto arquivo.

## Aceitação manual

A última atualização da Issue #78 continua sendo de 2026-11-08 06:59 UTC e registra 0/8 critérios físicos aprovados. Não há evidência de teste físico Tampermonkey nesta rodada: perda real de internet, recuperação sem F5, reentrada, permissões reais de microfone/tela e interoperabilidade instalada Normal ↔ Team Lite continuam pendentes. Playwright/Chromium e stubs de GM não substituem esse teste.

## Gates

| Gate | Status | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcast público em produção; nenhum transporte autenticado implantado; spoof de proveniência ainda nos candidatos principais |
| TEST-ISOLATION | in_progress | Laboratório isolado e limpo, mas sem Storage/full-product TEST |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs ausentes; main MIGRATIONS_FAILED; migration de produção de convite não aplicada exatamente no laboratório |
| AUTH-03 | blocked | Candidato passou, mas runtimes de produção ainda usam setup legado e não têm token/rate-limit; login sem rate limit específico |
| ACL-STORAGE | blocked | Grants/Default ACLs amplos, Storage público e policies ausentes |
| RECONNECT | pending | 0/8 testes físicos confirmados |
| HUMAN-REVIEW | pending | PRs relevantes continuam Draft e sem aprovação explícita |

## Limitações e segurança operacional

O blob de `docs/RELEASE_READINESS.md` permanece `7cfbd70886df42ce790c078c224b19284a632595`, idêntico ao documento integralmente lido anteriormente. Nesta rodada o conector retornou conteúdo vazio ao tentar ler por faixa; não alego uma nova leitura integral. Nenhuma alteração em produção, SQL write, migration, deploy, merge, release, secret/flag change, workflow dispatch, publicação de userscript ou operação destrutiva foi realizada. Todas as consultas Supabase foram SELECT-only. A única escrita desta rodada é este relatório na branch QA e a atualização do comentário QA existente na Issue #79.
