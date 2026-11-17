# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-14T01:36:49.934Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA antes deste relatório:** `4498e0e98468e17f66203dd81c822d5b7aba25e4`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`

## Escopo e método

Revalidei os heads vivos das PRs #74, #75, #76, #82, #161, #163 e #164; workflows e logs dos SHAs correspondentes; Issues #78 e #79; documentação de prontidão; bundles e Edge Functions implantadas; catálogo PostgreSQL, RLS, grants, Default ACL, SECURITY DEFINER, Realtime, Storage, migrations e Security Advisor.

A auditoria foi somente leitura em produção e laboratório. As consultas SQL bem-sucedidas foram SELECT/catalog-only. Não houve chamada de upload, login, RPC, broadcast, teste de rede, teste de microfone/tela ou operação de escrita no Supabase.

## Resumo executivo

**Recomendação: NOT READY.**

Avanço confirmado: a PR #164 passou no Validate no HEAD exato `5a316771a486859520a8c2b6c3fbd714f82da76b`, run [43538512540](https://github.com/Reekyi/UpStatus/actions/runs/43538512540). A correção candidata agora usa upload de avatar mediado pelo servidor, deriva o prefixo do objeto a partir de `users.id`, rejeita propriedade cruzada e desativa a antiga rota assinada de avatar com HTTP 410.

Isso ainda não representa um upload real no Supabase: os testes da PR extraem helpers para VM e substituem o banco/Storage por mocks. A inspeção encontrou duas lacunas residuais no novo caminho: ausência de limite do corpo antes de `req.text()`/Base64 decode e uma ambiguidade no detector de MIME para containers MP4 declarados como JPEG.

Também confirmei incompatibilidade no avatar dos runtimes instalados: Normal envia `avatarUrl` após upload assinado, enquanto o backend Normal v480 espera `dataUrl`; Team Lite v15 aceita URL do bucket sem vincular o objeto ao ID do usuário.

Os bloqueadores de Realtime, AUTH-03, ACL/Storage, isolamento TEST e proveniência de migrations continuam presentes. A QA/#82 permanece com Validate vermelho.

## Status vocabulary

- **CI PASS:** workflow concluído com sucesso no SHA exato indicado.
- **CI FAIL:** workflow concluído com falha no SHA exato indicado.
- **CODE INSPECTION:** comportamento inferido da fonte/configuração; não é teste de runtime.
- **MANUAL PENDING:** requer navegador instalado, dispositivo, rede ou aceite humano.
- **BLOCKED:** dependência ou lacuna impede aprovação do gate.
- **NOT VERIFIED:** evidência não foi obtida ou não corresponde ao ambiente/artefato em questão.

## Heads reais e PRs

| PR / branch | Base | HEAD | Estado | Evidência |
|---|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | master | `dcaf6a072546eda0089e0cee4018c3047011f600` | Open / Draft | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) PASS; Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | team-lite-official | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico; não substitui #76 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | team-lite-official | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Open / Draft | Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) PASS: 110/110 autenticados e 16/16 não autenticados |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | master | `4498e0e98468e17f66203dd81c822d5b7aba25e4` | Open / Draft | Validate [43535552203](https://github.com/Reekyi/UpStatus/actions/runs/43535552203) FAIL: `production updateURL mismatch` |
| [#161 Normal](https://github.com/Reekyi/UpStatus/pull/161) | #74 | `557814dc31bed779b84a2094358dc6b2a7e67689` | Open / Draft | Validate [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) PASS; Smoke [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) PASS |
| [#163 Voz](https://github.com/Reekyi/UpStatus/pull/163) | #161 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` | Open / Draft | Validate [43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) PASS; Voice Contract [43488822237](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) PASS |
| [#164 Upload](https://github.com/Reekyi/UpStatus/pull/164) | develop | `5a316771a486859520a8c2b6c3fbd714f82da76b` | Open / Draft | Validate [43538512540](https://github.com/Reekyi/UpStatus/actions/runs/43538512540) PASS; não há Smoke/Storage real |

Comparações GitHub:
- QA vs master: 293 commits à frente e 1 atrás; 149 arquivos alterados na #82, todos sob `docs/`.
- #74: 887 commits à frente de master.
- #76: 386 commits à frente de team-lite-official.
- #164: 26 commits à frente e zero atrás de develop.
- #161: 12 commits à frente da base #74.
- #163: 7 commits à frente da #161.

Reviews humanas: zero submissões em #74, #75, #76, #82 e #164. A API de branch protection retornou HTTP 403 para master, team-lite-official e develop; portanto a proteção não pôde ser confirmada e não deve ser descrita como habilitada ou desabilitada.

## PR #164 — upload de avatar

### O que o CI realmente aprovou

O Validate [43538512540](https://github.com/Reekyi/UpStatus/actions/runs/43538512540) passou no HEAD `5a316771`. O teste de servidor cobre origem, bucket, caminho, token, limite declarado, MIME, ownership por prefixo de `users.id`, rejeição de avatar de outro usuário e `upsert:false`. O teste cliente verifica a rota, URLs e contrato PUT.

Os arquivos de teste usam `node:vm`, mocks de `db.storage` e respostas locais. Isso é contrato isolado, não upload HTTP/Storage real.

### Lacunas encontradas por inspeção estática

1. **Limite do corpo é aplicado tarde.** `readBody(req)` chama `await req.text()` sem limite de streaming/Content-Length antes de materializar o JSON. O avatar é decodificado de Base64 e só depois `uploadFile` verifica `d.bytes.length > 2 MiB`. Um corpo excessivo consome memória antes da rejeição. Falta limite explícito do corpo antes do parse e da decodificação.
2. **MIME MP4 pode ser classificado como JPEG.** Em `sniffMime`, a condição do container MP4 (`ftyp`) vem antes da rejeição de declarações `image/*`; quando o cliente declara `image/jpeg`, esse ramo retorna `image/jpeg`. A allowlist de avatar aceita JPEG. O harness não cobre esse caso. É uma falha potencial de classificação, não uma exploração reproduzida.
3. **Imagem não é decodificada/re-encodada.** A validação de magic bytes identifica alguns formatos, mas não comprova que o arquivo inteiro é uma imagem válida nem limita dimensões/pixels.
4. **Anexos do chat permanecem no PUT assinado direto.** `signedUploadRoute` valida MIME e tamanho declarados pelo cliente e cria URL assinada para `chat-images`; o navegador envia os bytes diretamente. O bucket limita o objeto a 20 MiB, mas não há inspeção server-side do conteúdo real antes de torná-lo público.

Fonte e testes:
- [PR #164](https://github.com/Reekyi/UpStatus/pull/164)
- [Server template candidato](https://github.com/Reekyi/UpStatus/blob/fix/develop-signed-upload-avatar-limit-20261113/src/server/index.template.ts)
- [Teste server-side](https://github.com/Reekyi/UpStatus/blob/fix/develop-signed-upload-avatar-limit-20261113/scripts/test-signed-upload-server.mjs)
- [Teste cliente](https://github.com/Reekyi/UpStatus/blob/fix/develop-signed-upload-avatar-limit-20261113/scripts/test-signed-upload-client.mjs)

## Compatibilidade Normal / Team Lite instalados

Bundles extraídos das Edge Functions implantadas:

| Produto | Edge Function | Versão userscript | Observação |
|---|---|---:|---|
| Normal | upstatus v480 | 3.4.7 | Contrato de avatar incompatível |
| Team Lite | upstatus-team-lite v15 | 3.4.30 | Ownership de avatar não vinculada a users.id |
| TEST legado | upstatus-test v281 | 3.3.28 | Não é ambiente Full-Product TEST isolado |
| API Normal | upstatus-screen-share-3-1-1-beta10 v6 | — | Tópico legado |

- **Normal:** o cliente instalado chama `/api/profile/avatar-upload-url`, faz PUT assinado e envia `avatarUrl` a `/api/profile/avatar`. O backend v480 mantém `profileRoute` que lê somente `p.dataUrl` e chama `uploadFile`; a chamada com `avatarUrl` não satisfaz esse contrato. A rota de upload assinado ainda existe no backend v480. A inspeção indica falha ao salvar avatar; não foi feita chamada de escrita para reproduzir.
- **Team Lite:** o cliente usa o mesmo padrão de URL assinada. O backend v15 aceita URL com prefixo do bucket público `profile-images`, mas não valida prefixo de ownership derivado do ID. Um usuário pode potencialmente associar ao perfil uma URL de avatar de outro usuário.
- Os dois bundles instalados usam o tópico `upstatus-screen-share-live-3-1-1-beta10`; não foi encontrado `private:true` nem `realtime.setAuth()` nos clientes.

## Realtime e sinalização

Consulta SELECT-only em produção:
- 106 mensagens em 14 dias: 72 `user_status`, 26 `db_change`, 4 `remote_command`, 4 `remote_result`.
- 106/106 com `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Triggers publicam nesse tópico; os clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. Há divergência entre produtor e consumidor.
- `upstatus_broadcast_messages` envia `to_jsonb(OLD/NEW)` completo no evento `db_change`, incluindo conteúdo e metadados da linha.
- `upstatus_broadcast_remote_state` envia campos selecionados de comandos/resultados; `upstatus_broadcast_users` transmite nome/status/motivo.
- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies, sete partições e grants SELECT/INSERT/UPDATE para anon/authenticated.
- A configuração Dashboard que permite public subscribe não foi exposta pelo conector; não foi tentado subscribe anônimo, broadcast ou ataque. `private=false` é evidência de canal não privado, não prova de exploração externa.

## PostgreSQL, RLS, grants, SECURITY DEFINER e Storage

Snapshot de catálogo e Security Advisor:
- Produção: 10 tabelas de `public` com RLS e zero policies.
- Nove tabelas públicas concedem privilégios diretos a anon/authenticated: 126 linhas de grants; 18 concessões TRUNCATE.
- 120 entradas Default ACL para anon/authenticated.
- Três funções `public.upstatus_broadcast_*` SECURITY DEFINER, `search_path=public`, EXECUTE para PUBLIC/anon/authenticated/service_role. Security Advisor registra 3 WARN para anon e 3 WARN para authenticated, além de 10 INFO de RLS sem policy. Não foi feita chamada RPC para testar execução.
- Performance e Health Advisors retornaram listas vazias.
- Storage: `chat-images` e `profile-images` públicos, 20 MiB cada, 168 e 20 objetos respectivamente; zero policies próprias em `storage.objects`. Chat aceita imagens, vídeos, áudio e documentos; perfil aceita imagens.

Laboratório:
- 18 tabelas públicas com RLS e zero policies; zero grants diretos de tabela a anon/authenticated em public.
- 96 entradas Default ACL para anon/authenticated.
- Três funções de broadcast usam search_path vazio e EXECUTE apenas para postgres/service_role.
- Security Advisor: 0 WARN e 18 INFO. O laboratório não possui buckets Storage.

## AUTH-03, usuários e Edge Functions

Produção:
- Cinco usuários, cinco perfis e 319 sessões; zero password hashes vazios e zero roles vazias.
- `users` tem PK em `id`, mas nenhuma constraint UNIQUE em `name`.
- `upstatus_sessions` contém `user_name`, não `user_id`; `upstatus_profiles` também é baseada em `user_name`.
- Nenhuma tabela de setup-invite/rate-limit nem RPC `consume_upstatus_setup_invite` no schema de produção.
- Login Normal exige mínimo de seis caracteres; Team Lite exige quatro.
- Handlers instalados não contêm rate limit de tentativas de login. Primeiro acesso ainda não exige convite de uso único e mantém fallback nominal para atribuição administrativa quando role está vazia.
- Os handlers usam token próprio via `x-upstatus-token`; `verify_jwt=false` nas Edge Functions não prova por si só ausência de autenticação, mas exige revisão de autorização em cada rota.

Edge Functions:
- Produção: 38 ACTIVE, incluindo `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281 e API beta10 v6; todas reportam `verify_jwt=false`.
- Laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- O laboratório possui colunas setup-token em users e migrações de convite/rate-limit, mas não é ambiente Full-Product TEST.

## Ambientes e migrations

- Existem dois projetos Supabase: produção e laboratório signaling/auth. Não existe Full-Product TEST independente.
- Produção: sete migrations no ledger.
- Laboratório: 39 migrations.
- Master: somente três SQLs canônicos em `supabase/migrations`; quatro migrations do ledger de produção não têm fonte correspondente no diretório canônico.
- Branch Supabase `main`: `MIGRATIONS_FAILED`; preview project status `ACTIVE_HEALTHY`. Não foi executado repair/reset/rebase.
- O laboratório não possui buckets Storage, portanto não cobre o produto completo.

## Workflows e publicação

- Workflow oficial Team Lite, em `team-lite-official`, executa `supabase functions deploy upstatus`, não `upstatus-team-lite`; usa CLI `latest`. **Não despachar esse workflow.**
- Workflow candidato Normal na #74 é manual-only, exige branch master, checkout SHA exato, projeto `dlfvkawaiqduhlazsszm` e CLI 2.122.1. Seu guard de produção aceita exclusivamente release.json 3.4.7; o próximo versionamento exige atualização deliberada e revisão desse guard.
- QA `validate.yml` dispara para PR com base master/develop; o validator da branch QA contém assertion fixa de updateURL para `/upstatus/upstatus.user.js`. A #82 falhou com `production updateURL mismatch`; não removi assertion e não fiz rerun.
- Branch protection não pôde ser verificada: endpoints administrativos retornaram HTTP 403 para master, team-lite-official e develop.

## Issues e aceitação física

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos marcados. Não houve teste instalado Tampermonkey de queda/retorno sem F5, reentrada, chamadas, microfone real, captura real de tela ou interoperabilidade Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16 itens marcados e 19 pendentes no corpo.
- Reviews humanas: zero em #74, #75, #76, #82 e #164.
- CI de Chromium/VM é evidência automatizada isolada; não substitui aceitação física.

## Gates desta rodada

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | Realtime 106/106 private=false, tópico divergente, zero policies e payload de mensagem completo |
| TEST-ISOLATION | BLOCKED | Só produção e laboratório; lab sem Storage/buckets |
| MIGRATION-PROVENANCE | BLOCKED | Produção 7 migrations; master 3 SQLs canônicos |
| AUTH-03 | BLOCKED | Produção sem setup invite/rate limit; sessões/perfis por nome |
| ACL-STORAGE | BLOCKED | Grants, Default ACL, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | Issue #78 0/8, sem confirmação física |
| HUMAN-REVIEW | PENDING | PRs abertas/Draft, zero reviews humanas |

## Limites e segurança desta execução

- Nenhuma escrita, migration, grant, policy, ACL, secret, flag ou configuração foi feita no Supabase.
- Nenhum deploy, merge, release ou userscript foi publicado.
- Nenhum workflow foi iniciado ou repetido manualmente; apenas logs existentes foram inspecionados.
- Nenhum upload, login, RPC, broadcast, subscribe, chamada, áudio ou captura de tela foi executado.
- Não havia ambiente de navegador/Tampermonkey para testes físicos; esses itens permanecem pendentes.
- A única escrita desta execução é este relatório novo na branch QA. O arquivo RELEASE_READINESS.md foi preservado.
