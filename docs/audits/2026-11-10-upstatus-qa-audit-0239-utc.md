# Auditoria independente UpStatus — 2026-11-10 0239 UTC

## Escopo e método

Revalidação read-only do repositório `Reekyi/UpStatus`, das PRs #74, #75, #76, #82 e #130, das Issues #78/#79 e dos projetos Supabase `dlfvkawaiqduhlazsszm` (produção) e `bfpjtfqlnypisxljoxkb` (laboratório). Foram consultados heads, checks, jobs/logs, reviews, fontes das Edge Functions, catálogos PostgreSQL, migrations e Security Advisor.

`docs/RELEASE_READINESS.md` foi lido pelo blob `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.409 linhas. Seu último checkpoint é 08/11/2026 18:30 UTC; portanto, está desatualizado para os heads e runtimes desta auditoria. O arquivo principal foi preservado.

Classificação: **CI PASS/FAIL** é resultado de workflow no SHA exato; **inspeção de código/catálogo** não é teste de execução; **manual pendente** exige Tampermonkey/dispositivos reais; **bloqueado** indica dependência ou risco sem resolução. Não foram executados testes locais nem testes físicos nesta rodada.

## Heads e PRs

Heads observados:

- QA `qa/release-readiness-2026-11-04-master`: `95507e36c76998319667dd83f054d6e1d4cb371e`.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- Comparação QA × master: 176 commits à frente e 1 atrás; o commit exclusivo de master observado é documental. Nenhum rebase foi feito.

| PR | HEAD | Base | Evidência atual | Leitura QA |
|---|---|---|---|---|
| #74 Normal | `afc69bc41c283ff34cb87bfc5b9a1ab94cffe0bf` | master | [Validate 42741455776 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42741455776); [Smoke 42741455775 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42741455775) | PASS no HEAD exato |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | [Candidate Checks 41674353127 PASS](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; substituído como candidato ativo pela #76 |
| #76 Team Lite | `e7ed9a6318364a183427fb5d93831d3da8fc0db3` | team-lite-official | [Candidate Checks 42734522680 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42734522680) | PASS no HEAD exato |
| #82 QA | `95507e36c76998319667dd83f054d6e1d4cb371e` | master | [Validate 42737366291 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/42737366291) | Falha herdada: `production updateURL mismatch` em `scripts/validate.mjs:26` |
| #130 Normal AUTH-03 | `a6c32324e6fe17a0783bad09637131d7893285fd` | chore/continuity-foundation (`afc69bc`) | [42741601731 IN_PROGRESS](https://github.com/Reekyi/UpStatus/actions/runs/42741601731) | Ainda sem resultado final no HEAD atual |

Nenhuma das cinco PRs tem review humano registrado. Permanecem abertas/Draft e não mescladas.

### Detalhes de CI

- **#74:** 19/19 checks não autenticados e 136/136 autenticados; Chromium validou WebRTC de chamada, voz e compartilhamento de tela, faixas remotas, mesh de três participantes e teardown. O step de rate limit de emissão de convites foi *skipped* porque o script não existe no checkout da branch-base; isso é esperado para a PR empilhada #130.
- **#76:** 16/16 checks não autenticados e 110/110 autenticados; full-IIFE/Playwright, WebRTC de chamada/voz/tela, mesh, rate limits, recibos, convite de uso único e cleanup passaram. O step de rate limit de convites passou no laboratório.
- **Cobertura desigual entre #76 e #130:** a migration `20261109230000_setup_invite_rate_limit.sql` é byte a byte idêntica nas duas branches (blob `ab73b5cd8200147a449327d21798eef588834d50`). O teste Team Lite faz 24 chamadas no primeiro bucket (5 permitidas/19 negadas), uma chamada no bucket independente e reset/cleanup. O teste Normal da #130 foi ampliado para seis chamadas no segundo bucket (5/1) e verifica que o segundo bucket não reinicia o primeiro. É uma lacuna de cobertura do teste Team Lite, não uma falha de runtime demonstrada.
- **#130:** no momento da captura, o job ainda executava integração autenticada/browser; passos de concorrência de sinalização, recibos, consumo de convite e rate limit de emissão estavam pendentes. Um PASS anterior em SHA `c7367f0` não substitui o check do HEAD atual `a6c3232`.
- **#82:** log confirma build 3.4.7 e falha no contrato de `updateURL`; não é uma falha de execução do conteúdo Markdown.
- **#129 dispatcher:** o guard offline já havia passado, mas a PR continua Draft. O workflow oficial Team Lite ainda não foi substituído na branch oficial; não despachar.

## Realtime e compatibilidade Normal/Team Lite

### Evidência de produção

Consulta SELECT-only às últimas 24h de `realtime.messages` encontrou 39 mensagens, todas `private=false`, no tópico:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

Eventos: 20 `db_change`, 13 `user_status`, 3 `remote_command` e 3 `remote_result`.

Os triggers PostgreSQL publicam nesse tópico. Os userscripts efetivamente embutidos nos runtimes implantados foram decodificados e apontam para:

- Normal `upstatus` v480 / userscript 3.4.7: `upstatus-screen-share-live-3-1-1-beta10`.
- Team Lite `upstatus-team-lite` v15 / userscript 3.4.30: `upstatus-screen-share-live-3-1-1-beta10`.
- API Screen Share beta10 v6 contém userscript 3.1.1-beta8 e assina `upstatus-screen-share-live-3-1-1-beta8`.

São três contratos diferentes. Os clientes implantados não usam `private:true` nem `realtime.setAuth()`. O Normal executa `executeRemoteCommand` quando o alvo coincide com o membro local; Team Lite valida a própria sessão/generation, mas isso não autentica o remetente do broadcast. O trigger de mensagens envia a linha inteira via `to_jsonb(OLD/NEW)`; o trigger de estado remoto publica metadados de comando/resultado.

Isto é **inspeção estática/catálogo**, não exploração reproduzida. Não foram injetados broadcasts, SDP ou ICE. O canal público e a divergência de tópicos permanecem bloqueadores; a incompatibilidade indica que os eventos gerados pelos triggers não chegam ao tópico assinado pelos clientes observados.

### SECURITY DEFINER e tabela Realtime

- `realtime.messages`: RLS habilitado, zero policies; grants SELECT/INSERT/UPDATE para `anon` e `authenticated`.
- Três funções `upstatus_broadcast_*` são `SECURITY DEFINER`, `search_path=public`, retornam `trigger` e estão associadas a triggers. ACL inclui PUBLIC/anon/authenticated/service_role. Security Advisor observou 3 WARN para anon e 3 WARN para authenticated.
- Como retornam `trigger`, não afirmo que uma chamada RPC direta foi demonstrada; não tentei executá-las. Os privilégios são excessivos e os broadcasts públicos são o risco confirmado.

## AUTH-03 e Edge Functions

Runtimes implantados inspecionados:

- Normal `upstatus` v480.
- Team Lite `upstatus-team-lite` v15.
- Screen Share beta10 v6.

Os três mantêm `POST /api/setup -> login(req,true)`. A tabela `public.users` em produção tem somente as colunas antigas (sem `setup_token_*`); não existem as RPCs `consume_upstatus_setup_invite`/rate limit nem a tabela `upstatus_setup_invite_rate_limits`. Os cinco usuários atuais têm senha e papel preenchidos; isso não remove o risco do primeiro setup futuro/reset.

Nos candidatos, a emissão de convite exige admin, consome rate limit distribuído (5 por admin/15 min), falha fechada com 503 e retorna 429 quando excedido. A função SQL candidata é `SECURITY INVOKER`, `search_path` vazio e EXECUTE apenas para `service_role`. A migração foi verificada somente no laboratório. O check Normal #130 ainda está em execução no HEAD atual.

Produção tem 38 Edge Functions ACTIVE e todas reportam `verify_jwt=false`; os três runtimes principais usam autenticação própria por token, mas os 38 handlers não foram auditados individualmente. A lista inclui runtimes de teste/backup ainda ativos no projeto de produção. O laboratório tem duas funções de teste: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não há função server-mediated de sinalização implantada em produção.

## RLS, grants, Default ACL e Storage

Snapshot read-only de produção:

- 10 tabelas públicas com RLS e sem policies.
- 9 tabelas concedem privilégios diretos a anon/authenticated, incluindo `TRUNCATE`. RLS não protege TRUNCATE; não foi demonstrado acesso via REST a cada tabela.
- 6 registros de Default ACL no schema public, com 24 entradas de papel nos ACLs; defaults de postgres e supabase_admin incluem anon/authenticated/service_role para tabelas, funções e sequências.
- `storage.objects`: zero policies; grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
- Buckets `chat-images` e `profile-images` públicos, 20 MiB cada.

Os runtimes implantados validam MIME e tamanho declarados na rota Signed Upload e criam a URL assinada sem inspecionar os bytes do arquivo. No fluxo legado, `sniffMime` retorna o MIME declarado quando não reconhece a assinatura. A rota de imagem aceita até 25 MiB, mas o bucket limita 20 MiB, criando divergência para arquivos entre esses limites. Não foi feito upload de teste.

## Migrations e isolamento

- Produção: 7 migrations remotas; branch gerenciada `main` em `MIGRATIONS_FAILED`.
- Os quatro SQLs originais abaixo retornaram 404 em `master`:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, 39 migrations; a tabela de rate limit existe e estava vazia no snapshot.
- Há somente dois projetos Supabase: produção e laboratório. Não existe ambiente full-product TEST independente.
- Durante o check #130 em execução, um snapshot do laboratório encontrou 4 usuários e 4 sessões, com salas/eventos/limites/objetos/Realtime em zero. Como o workflow ainda estava ativo, esses registros podem ser fixtures em andamento; a limpeza final não foi confirmada. Não marcar o laboratório como vazio/limpo até o workflow terminar e uma nova leitura confirmar.

## Issues, governança e teste manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, 0/8 critérios físicos. Não houve teste real de Tampermonkey, perda de internet por 10 segundos, retorno sem F5, permissões reais de microfone/tela ou interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) continua aberta; o corpo ainda contém checklist histórico 16/35. O comentário QA dedicado foi atualizado, sem duplicata e sem alterar o comentário da Engenharia.
- PRs #74, #75, #76, #82 e #130 sem reviews humanas.
- Metadados GitHub indicam `protected=false` para `master` e `team-lite-official`; a consulta de rulesets retornou lista vazia. Os endpoints detalhados de branch protection retornaram 403, portanto não foi possível inspecionar regras administrativas além desses metadados.

## Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 39 mensagens públicas e tópico divergente; dashboard de produção |
| TEST-ISOLATION | IN_PROGRESS | laboratório isolado, mas sem full-product TEST e com CI ativo |
| MIGRATION-PROVENANCE | BLOCKED | 4 SQLs 404 e branch main MIGRATIONS_FAILED |
| AUTH-03 | IN_PROGRESS | #76 PASS; #130 no HEAD atual ainda em execução; produção segue legado |
| ACL-STORAGE | BLOCKED | grants/Default ACL/buckets públicos sem hardening |
| RECONNECT | PENDING | #78 0/8, sem teste físico |
| HUMAN-REVIEW | PENDING | PRs Draft e sem reviews humanas |

## Próximas ações recomendadas

1. Aguardar o check exato #130 e confirmar cleanup do laboratório antes de qualquer outra suíte que muta fixtures.
2. Tornar Realtime privado/autorizado por padrão, alinhar tópicos e substituir broadcasts públicos sensíveis por sinalização server-mediated em Normal e Team Lite.
3. Completar AUTH-03 em ambos os candidatos; incluir cobertura equivalente de isolamento entre buckets no Team Lite. Planejar qualquer rollout de produção separadamente e com autorização.
4. Recuperar os quatro SQLs originais e diagnosticar `MIGRATIONS_FAILED` antes de qualquer migration.
5. Revisar grants, Default ACLs, SECURITY DEFINER, Storage, limites e validação real de conteúdo.
6. Corrigir e revisar o workflow oficial Team Lite antes de qualquer despacho; manter o guard #129 sob review.
7. Criar/definir ambiente full-product TEST independente.
8. Executar os oito critérios físicos da #78 e obter review humano.

## Segurança desta execução

Nenhuma escrita SQL em produção, migration, deploy, merge, release, alteração de secrets/flags/roles/grants/policies/ACL, publicação de userscript ou operação destrutiva foi realizada. As consultas Supabase foram SELECT/catalog-only. Não foram iniciados workflows pela auditoria. A única escrita de código-fonte é este relatório novo na branch QA; o comentário QA da Issue #79 foi atualizado conforme solicitado.
