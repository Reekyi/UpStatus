# Auditoria independente de qualidade - UpStatus
**Execução:** 15/11/2026 02:41 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA inspecionado antes do relatório:** `a4fa787298499f3046c15136a41996c552e5d62f`

## Veredito

**NOT READY.** Não liberar, mesclar, publicar userscripts nem executar migrations de produção.

Achados de maior prioridade nesta rodada:

1. Produção continua publicando broadcasts Realtime com `private=false`; o trigger de mensagens transmite a linha inteira.
2. O workflow oficial de produção Team Lite executa `supabase functions deploy upstatus`, que é o nome da função Normal, não `upstatus-team-lite`.
3. Os workflows TEST de `develop` e `team-lite-official` ainda usam `secrets.SUPABASE_PROJECT_ID` sem guard que confirme o projeto TEST. O valor do secret não foi lido.
4. Os bundles instalados têm uma divergência real de senha: Normal rejeita menos de 6 caracteres, Team Lite aceita 4. As duas versões compartilham as mesmas contas.
5. O endpoint legado `POST /api/setup` em produção não exige setup token; a autorização de limpeza do chat continua baseada apenas no nome Ricardo.
6. Quatro das sete migrations registradas em produção não têm o SQL original no branch master.
7. O laboratório não é Full-Product TEST e a última bateria de chamadas à Edge Function retornou HTTP 402 por quota.

## Escopo e limitações

- Inspeção remota do GitHub, Supabase, metadados de branches, PRs, workflows, logs e fontes das Edge Functions implantadas.
- Consultas Supabase foram somente SELECT e leitura de catálogo.
- Os userscripts servidos pelas Edge Functions foram decodificados e inspecionados; não foram publicados.
- Não havia checkout local, navegador com Tampermonkey ou ambiente físico para testar queda real de rede, microfone e captura de tela.
- CI automatizado não foi classificado como teste manual.
- Nenhum request de exploração foi enviado aos endpoints RPC de broadcast; a exposição foi avaliada por grants, Advisor e definições PostgreSQL.

## Documento de prontidão

Li integralmente [docs/RELEASE_READINESS.md](https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/docs/RELEASE_READINESS.md) na branch QA. O arquivo tem aproximadamente 1.045.105 bytes e 8.410 linhas. O último checkpoint interno é de **08/11/2026 18:30 UTC**, portanto o documento está defasado em relação aos estados de 09 a 15/11 registrados em `docs/audits/` e nos comentários de #79. Não sobrescrevi o histórico do documento principal.

## Heads e governança GitHub

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `a4fa787298499f3046c15136a41996c552e5d62f` |

A comparação de QA com master indica 325 commits à frente e 1 atrás. O HEAD QA coincide com o head atual da PR #82.

Metadados de proteção:
- `master`, `develop` e `team-lite-official` retornaram `protected=false`.
- A API de repository rulesets retornou lista vazia.
- A consulta administrativa de proteção da branch QA retornou HTTP 403; não afirmo o estado clássico de proteção da QA.
- Nenhuma das PRs obrigatórias #74, #75, #76 e #82 tem review humana submetida.

## PRs obrigatórias e CI

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | Open / Draft | [Validate PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft, histórico | [Candidate Checks PASS em 03/11](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Open / Draft | [Candidate Checks PASS](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `a4fa787298499f3046c15136a41996c552e5d62f` | Open / Draft | [Validate FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43664247927) |

Comparação das PRs com os SHAs-base registrados no GitHub:
- #74: 887 commits à frente do base SHA, sem commits atrás desse SHA.
- #75: 59 à frente.
- #76: 386 à frente.
- #82: 325 à frente.
- O base SHA de #74/#82 é `a9288cc`, anterior ao master atual `9d40461`; exige reconciliação antes de qualquer integração.
- #82 altera 174 arquivos documentais; não contém correção de runtime.

### Resultados adicionais relevantes

- [#161 Normal API/rate limit](https://github.com/Reekyi/UpStatus/pull/161): Validate [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e Smoke [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) no HEAD `557814dc`. O Smoke confirmou 136/136 checks autenticados, WebRTC de chamada/voz/tela, mesh de três membros, rate limit 90 aceitos + 1 HTTP 429 e rate limit distribuído de emissão de setup invites com concorrência e limpeza.
- [#163 contrato HTTP 409](https://github.com/Reekyi/UpStatus/pull/163): Validate [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) e contrato [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43488822237). O teste offline confirma `VOICE_ATTEMPT_ALREADY_ACTIVE => 409`; não é chamada HTTP ao runtime implantado.
- [#165 proveniência Normal](https://github.com/Reekyi/UpStatus/pull/165): workflow de contrato [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43619801133). A origem autenticada passa como argumento separado; não houve Smoke Supabase nessa PR.
- [#166 proveniência Team Lite](https://github.com/Reekyi/UpStatus/pull/166): guard offline [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43624572780); não houve Smoke Supabase.
- [#167 builder/chat](https://github.com/Reekyi/UpStatus/pull/167): Validate [PASS](https://github.com/Reekyi/UpStatus/actions/runs/43635704388). A candidata corrige o contrato do updater e exige papel persistido para limpeza do chat. Continua Draft e não integrada.
- #82 falhou com `VALIDATION FAILED: production updateURL mismatch` em `scripts/validate.mjs:26`. A correção candidata #167 não altera o HEAD da QA.

### Distinção de evidência

- **CI:** os resultados acima são workflows automatizados, incluindo integração autenticada no projeto isolado e Chromium.
- **Inspeção de código:** fontes dos bundles implantados, templates, SQLs, workflows e diffs das PRs.
- **Teste manual:** nenhum executado nesta rodada.
- **Pendente:** oito critérios físicos de #78 e revisão humana.
- **Bloqueado:** novo Smoke do laboratório por quota; não há Full-Product TEST.

## Bundles e compatibilidade Normal / Team Lite

Artefatos servidos pelo projeto de produção:
- Normal userscript **3.4.7**, função de distribuição `upstatus` v480.
- Team Lite userscript **3.4.30**, função `upstatus-team-lite` v15.
- API beta10 v6; `upstatus-test` v281 também existe no projeto de produção.
- Produção não possui função `upstatus-signal`.
- Laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

Os dois bundles instalados usam o tópico público legado `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` ou `realtime.setAuth()`.
- Normal recebe `remote_command` e executa diretamente `executeRemoteCommand`.
- Team Lite também executa o comando recebido após verificar a sessão local, mas não valida a identidade do publicador.
- O handler de sinalização dos clientes instalados não prova a origem do emissor.
- Os candidatos #74/#76 mudam o comando público para uma dica de consulta autenticada e usam polling server-mediated quando a flag é ligada.
- A flag `signaling_transport_enabled` é false por padrão e o endpoint é vazio. Portanto, o transporte autenticado não está ativo.
- #74/#76 ainda colocam `_authenticatedTransport` no payload da mensagem autenticada; esse campo é falsificável. #165/#166 corrigem isso passando a proveniência como argumento separado. Essas correções continuam Draft e não integradas.

### Incompatibilidade de senha

O runtime Normal implantado rejeita senha menor que 6 caracteres; Team Lite aceita 4. As duas versões usam a mesma tabela `public.users`. Assim, uma senha de 4 ou 5 caracteres aceita pelo Team Lite é rejeitada pelo cliente Normal antes da verificação do hash.

Os templates candidatos reconciliam a política: primeiro acesso com mínimo 6 e login com mínimo 4 nas duas versões. Ainda não está implantado.

### Primeiro acesso e limpeza do chat

Nos dois runtimes implantados:
- `POST /api/setup` chama o fluxo legado sem setup token.
- Se uma conta estiver sem senha, o primeiro setup pode ser reivindicado apenas pelo nome conhecido.
- Se o papel estiver vazio, o fallback atribui `implementation_admin` a Ricardo, Lohan e Guilherme por nome.
- `POST /api/chat/clear` autoriza pelo nome `Ricardo`, sem exigir o papel persistido.

O snapshot atual tem 5 contas, nenhuma com senha ou papel ausente. Isso reduz a exposição imediata das contas existentes, mas não corrige o fluxo de onboarding futuro nem a autorização baseada em nome. O candidato #74/#76 usa setup token de uso único; #161 acrescenta rate limit distribuído; #167 exige `implementation_admin` para limpar o chat.

## Supabase: produção e laboratório

Projetos:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations e 38 Edge Functions ACTIVE.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations e 2 Edge Functions ACTIVE.
- Branch gerenciada `main` de produção: `MIGRATIONS_FAILED`; preview reportado ACTIVE_HEALTHY.
- O laboratório não é um ambiente Full-Product TEST independente: zero usuários, sessões, perfis, mensagens, buckets e fixtures persistentes.

### RLS, grants e SECURITY DEFINER

Produção:
- 10 tabelas públicas com RLS habilitado e zero policies.
- 9 dessas tabelas têm grants diretos para anon/authenticated.
- 9 tabelas concedem TRUNCATE a anon e authenticated. TRUNCATE não é protegido por RLS.
- 24 definições Default ACL, 75 entradas ACL expandidas.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role.
- Security Advisor às 02:40 UTC: 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated. O Advisor aponta explicitamente os caminhos `/rest/v1/rpc/upstatus_broadcast_*`; nenhuma chamada HTTP foi executada.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; SELECT/INSERT/UPDATE concedidos a anon e authenticated.

Laboratório:
- 18 tabelas públicas com RLS e zero policies; zero grants diretos de anon/authenticated nas tabelas públicas consultadas.
- 25 definições Default ACL, 70 entradas ACL.
- Três funções de broadcast SECURITY DEFINER com `search_path=""`, sem EXECUTE para anon/authenticated e EXECUTE para service_role.
- Payloads de broadcast minimizados para `{op: TG_OP}`.
- Ainda usa `private=false`; `realtime.messages` continua sem policies e com SELECT/INSERT/UPDATE para anon/authenticated.
- Security Advisor: 18 INFO de RLS sem policy, sem WARN de SECURITY DEFINER.

### Realtime e confidencialidade

Produção:
- 106 linhas observadas em `realtime.messages`, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- 72 `user_status`, 26 `db_change`, 4 `remote_command`, 4 `remote_result`.
- Último evento observado em 13/11/2026 20:52 UTC.
- `upstatus_broadcast_messages()` serializa OLD/NEW completos com `to_jsonb`, podendo incluir texto, URLs de anexos e metadados.
- Os clientes instalados usam tópico diferente do trigger. A contagem não prova entrega aos clientes.
- O setting de acesso público do Dashboard não foi confirmado; não houve reprodução de acesso externo. Classificação: risco de exposição por desenho, não vazamento externo comprovado.

Laboratório:
- Triggers enviam apenas a operação, sem corpo de mensagem.
- Os canais ainda são públicos; portanto RT-01 não está concluído.

### Storage

Produção:
- `chat-images`: público, limite 20 MiB.
- `profile-images`: público, limite 20 MiB.
- Zero policies próprias em `storage.objects`.
- URLs públicas permitem leitura por quem tiver o endereço. Isso é risco de confidencialidade para anexos de chat.
- O laboratório não possui buckets de chat/perfil.
- #164 tem testes offline de signed upload, mas não houve upload real no Storage.

### AUTH-03

Produção:
- 5 usuários, 319 sessões, 5 perfis e 302 mensagens.
- 0 senhas ausentes e 0 papéis ausentes no snapshot.
- Zero colunas `setup_token_*`, zero RPC `consume_upstatus_setup_invite` e zero tabela `upstatus_setup_invite_rate_limits`.

Laboratório:
- Quatro colunas setup token.
- RPC de consumo de convite presente.
- Tabela de rate limit de convite presente.
- Zero usuários/sessões/perfis/mensagens para validar fluxo completo.

### Migrations e proveniência

Produção registra 7 migrations:
- 3 fontes originais existem no branch master e seus blob IDs conferem.
- 4 fontes originais continuam ausentes (404 no branch master):
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- [PR #127](https://github.com/Reekyi/UpStatus/pull/127) continua Draft; o workflow de proveniência passou, mas não recupera os quatro arquivos ausentes.
- Não sintetizar SQL a partir do schema atual e não marcar MIGRATION-PROVENANCE done.

### Quota do laboratório

Os logs registram 19 respostas HTTP 402 para `upstatus-signal-test` em 14/11/2026 às 17:10:45 UTC, com mensagem de quota de Edge Functions. Não há invocações de Edge Function posteriores até 15/11/2026 02:36 UTC. A recuperação da quota não está comprovada.

## Workflows de deploy: bloqueador de publicação

Arquivos oficiais inspecionados:
- [master deploy-production](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml)
- [master deploy-test](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-test.yml)
- [develop deploy-test](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml)
- [team-lite-official deploy-production](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml)
- [team-lite-official deploy-test](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-test.yml)

Achados:
1. O workflow oficial Team Lite deploya `upstatus`, não `upstatus-team-lite`.
2. Os workflows TEST de develop e team-lite-official têm gatilho push em develop e usam `secrets.SUPABASE_PROJECT_ID`, a mesma referência usada pelo workflow de produção, sem validar que o destino seja o projeto TEST.
3. O valor do secret não foi consultado; o destino efetivo não foi afirmado. O desenho permite deploy para projeto errado se a secret estiver apontada incorretamente.
4. Os workflows oficiais usam Supabase CLI `latest` e não verificam de forma consistente SHA, branch e project-ref esperado.
5. #74 propõe guards de branch/SHA/projeto e CLI fixada; #76 usa `vars.SUPABASE_TEST_PROJECT_ID` e recusa produção/laboratório. Essas proteções ainda não estão integradas às branches oficiais.

Nenhum workflow de deploy foi disparado.

## Issues e aceitação física

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos aprovados.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 checkboxes marcados.
- Não houve teste manual de reconexão sem F5, microfone real, áudio bidirecional, captura de tela real ou interoperabilidade instalada Normal ↔ Team Lite.
- Os testes Chromium dos workflows são CI automatizado; não fecham os critérios físicos de #78.

## Gates desta execução

| Gate | Estado | Evidência / motivo |
|---|---|---|
| RT-01 | blocked | Produção ainda tem broadcasts públicos e full-row payload; laboratório minimiza payload, mas segue private=false. |
| TEST-ISOLATION | blocked | Só há projeto de laboratório vazio; quota de Edge Functions não permite novo Smoke. |
| MIGRATION-PROVENANCE | blocked | Três fontes originais verificadas; quatro ausentes; #127 Draft. |
| AUTH-03 | blocked | Produção sem setup token/RPC/rate limit; onboarding legado e autorização por nome continuam implantados. |
| ACL-STORAGE | blocked | RLS sem policies, grants amplos, SECURITY DEFINER e buckets públicos sem policies. |
| RECONNECT | pending | 0/8 critérios físicos de #78; depende de teste manual no navegador. |
| HUMAN-REVIEW | pending | PRs obrigatórias continuam Draft, sem review; sem autorização explícita de release. |

## Próximas ações recomendadas

1. Corrigir o workflow Team Lite para deployar `upstatus-team-lite`; exigir project-ref, branch e SHA exatos e fixar a versão da CLI.
2. Remover conteúdo de mensagens dos broadcasts de produção e concluir Realtime privado/autorizado.
3. Integrar #165/#166 e implantar backend server-mediated compatível com Normal e Team Lite antes de habilitar a flag.
4. Unificar a política de senha entre as duas versões; implantar setup invite de uso único, rate limit e autorização por papel persistido.
5. Revogar EXECUTE desnecessário das funções SECURITY DEFINER, revisar Default ACL, grants/TRUNCATE e políticas Storage.
6. Recuperar as quatro migrations originais de fonte de backup revisada; não reconstruí-las.
7. Restaurar quota e provisionar Full-Product TEST com fixtures/buckets próprios.
8. Executar os oito testes físicos de #78, incluindo reconexão sem F5 e interoperabilidade instalada.
9. Configurar proteção de branches e obter reviews humanas.
10. Somente depois da aprovação humana, discutir plano de corte/rollback.

## Segurança desta execução

Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy ou operação destrutiva foi realizado. Todas as consultas SQL foram SELECT/catalog-only. O único arquivo novo desta rodada é este relatório documental na branch QA dedicada.
