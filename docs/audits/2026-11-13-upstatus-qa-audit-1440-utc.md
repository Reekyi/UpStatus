# Auditoria independente UpStatus — 13/11/2026 14:40:54 UTC

**Escopo:** GitHub `Reekyi/UpStatus`, Supabase produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.  
**Branch documental:** `qa/release-readiness-2026-11-04-master`.  
**Método:** inspeção read-only de refs, PRs, workflows/logs, fontes de Edge Functions implantadas, catálogo PostgreSQL, migrations, Storage e Security Advisor. Não foram executados testes novos, requisições de negócio, broadcasts, fixtures ou testes de navegador.

## Resumo executivo

**Recomendação: NOT READY.**

Há evidência automatizada forte para as candidatas Normal #161 e Team Lite #76, mas o produto instalado ainda não recebeu as proteções de autenticação, identidade e sinalização. O TEST instalado continua usando a API de produção e compartilhando a identidade de instalação do Normal. A publicação Team Lite continua perigosa na branch oficial.

Achados novos desta rodada:

1. Normal instalado exige seis caracteres também no login, enquanto Team Lite instalado aceita quatro. Uma senha de quatro ou cinco caracteres criada pelo Team Lite pode não autenticar no Normal. As candidatas #161 e #76 alinham login em quatro e primeiro acesso em seis.
2. Normal e Team Lite instalados ainda permitem `POST /api/setup` sem `setupToken`, mantêm fallback de role administrativa por nome e autorizam limpeza total do chat apenas pelo nome Ricardo.
3. O build QA deriva o `updateURL` do `CLOUD_SERVER` beta10, enquanto o validator exige a função `upstatus`. Isso explica a falha atual do Validate #82. A candidata #161 corrige a separação entre endpoint de API e distribuição.
4. O snapshot Realtime atual encontrou 91 mensagens nos últimos 14 dias, todas `private=false`, no tópico dos triggers. Os clientes instalados ainda assinam o tópico beta10. O checkpoint da Engenharia de 14:06 UTC reportou 128 mensagens; os snapshots variam e não devem ser tratados como contador monotônico.
5. O Storage remoto diverge do `supabase/config.toml`: os dois buckets live estão em 20 MiB; o arquivo declara chat em 25 MB e perfil em 2 MB. O bucket live de chat também aceita tipos de documento que não aparecem na allowlist do arquivo.
6. O laboratório de signaling/auth continua sendo o único segundo projeto. Não há ambiente full-product TEST independente.

## Integridade documental e refs

Li integralmente `docs/RELEASE_READINESS.md` na branch QA: **1.045.105 caracteres e 8.410 linhas**. O último checkpoint técnico dentro do arquivo continua sendo 08/11/2026 às 18:30 UTC. O arquivo principal foi preservado; esta rodada foi registrada em relatório separado.

Heads verificados antes deste relatório:

| Ref | SHA |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA | `ffe306256c867e6fc73916e6cbf596f4db97edb5` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 | `ffe306256c867e6fc73916e6cbf596f4db97edb5` |
| PR #161 | `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e` |
| PR #162 | `8dc23905180494feded76f10e9fbdd59ac85feb5` |

QA está **281 commits à frente e 1 atrás** de master, com 138 arquivos divergentes. Os commits mais recentes da QA são documentais. GitHub reporta `master` e `team-lite-official` sem proteção de branch. Não encontrei reviews humanas nas PRs #74, #75, #76, #82, #161 e #162; todas continuam Draft.

## CI e workflows — resultados por SHA

| Linha | Evidência | Resultado | Classificação |
|---|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS; Smoke 19/19 não autenticados e 136/136 autenticados | CI no HEAD exato |
| #75 Team Lite | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico | Baseline antiga, não substitui #76 |
| #76 Team Lite | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | 16/16 não autenticados e 110/110 autenticados | CI no HEAD exato |
| #82 QA | [Validate 43436792837](https://github.com/Reekyi/UpStatus/actions/runs/43436792837) | FAIL: `production updateURL mismatch` | CI no HEAD exato |
| #161 Normal | [Smoke 43430030814](https://github.com/Reekyi/UpStatus/actions/runs/43430030814) | 19/19 não autenticados e 136/136 autenticados | CI no HEAD exato; não encontrei Validate separado no mesmo SHA |
| #162 Voz | [Validate 43430131864](https://github.com/Reekyi/UpStatus/actions/runs/43430131864) | PASS | CI no HEAD exato; contrato offline incluído |

O Smoke #161 cobre WebRTC, áudio remoto, vídeo remoto, mesh de três participantes, teardown, convites de primeiro acesso, consumo atômico e rate limit distribuído. O rate limit concorrente permite cinco requisições e rejeita 19 de 24; o teste também verifica isolamento por administrador e reset de janela.

### Causa exata da falha #82

Na QA, `release.json` aponta o `scriptUrl` para `/functions/v1/upstatus/upstatus.user.js`. Porém, o `scripts/build.mjs` da QA define o `CLOUD_SERVER` de produção como `upstatus-screen-share-3-1-1-beta10` e deriva o `updateUrl` desse valor. O `scripts/validate.mjs` exige `/upstatus/upstatus.user.js`. O log do run 43436792837 confirma a falha em `scripts/validate.mjs:26`.

A #161 corrige isso: o `CLOUD_SERVER` Normal aponta para `upstatus`, enquanto o `updateURL` é validado contra `release.json.scriptUrl`. O build também preserva arquivos sidecar ao atualizar somente `index.ts`, em vez de apagar recursivamente diretórios de função e `dist`.

### #162: contrato 409

O `scripts/voice-open-status.test.mjs` testa o helper `voiceOpenErrorStatus` e constrói objetos `Response` locais. O Validate da #162 executa esse teste, portanto o mapeamento `VOICE_ATTEMPT_ALREADY_ACTIVE => 409` está coberto no CI. Isso **não é uma requisição HTTP real** à Edge Function implantada. A função de laboratório continua v32; o módulo candidato `voice-status.mjs` ainda não está implantado. O workflow dedicado tem filtro `pull_request.branches` apontado para a própria branch head, não para a base real da PR; o Validate genérico, entretanto, executa o teste local.

### Team Lite: proteção de publicação existe, mas não está integrada

As PRs #125, #128 e #129 continuam Draft. Os contratos focados passaram:
- #125 dispatcher: [42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306) PASS; o Validate completo [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421) falha no contrato herdado de updateURL.
- #128 review provenance: [42994078899](https://github.com/Reekyi/UpStatus/actions/runs/42994078899) PASS.
- #129 legacy deploy guard: [42993962545](https://github.com/Reekyi/UpStatus/actions/runs/42993962545) PASS.

O dispatcher candidato exige dispatch em master, confirmação explícita, SHA completo igual ao HEAD atual de `team-lite-official`, PR aprovada/mergeada, versão exata e projeto/organização esperados. #129 transforma o workflow legado em bloqueio explícito. Nenhuma dessas correções chegou à branch oficial.

O workflow oficial ainda usa CLI `latest` e executa `supabase functions deploy upstatus`; o destino correto é `upstatus-team-lite`. **Não despachar o workflow atual.** A variável `UPSTATUS_RELEASE_REVIEWERS` é consumida pelo dispatcher candidato; seu valor configurado não foi inspecionado.

## Edge Functions e artefatos realmente instalados

Supabase lista dois projetos na organização:
- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY.
- Laboratório `bfpjtfqlnypisxljoxkb` (`upstatus-security-test`), ACTIVE_HEALTHY.

Produção possui 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Doze slugs têm prefixo `upstatus-test`. O laboratório possui duas funções: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. O laboratório não tem usuários, buckets nem dados full-product; não substitui um terceiro projeto TEST.

| Produto | Função/versão | Userscript embutido | API efetiva | Identidade/armazenamento |
|---|---|---|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` | namespace `upseller`, prefixo `upstatus_screen_share_beta8_` |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upstatus-team-lite` | namespace `upseller-team-lite`, prefixo `upstatus_team_lite_` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upstatus-screen-share-3-1-1-beta10` | namespace `upseller`, prefixo `upstatus_screen_share_beta8_` |

Normal recebe atualizações da função `upstatus`, mas seu código embutido conversa com beta10. TEST recebe o userscript da função `upstatus-test`, mas conversa com a API beta10 de produção e compartilha namespace/prefixo GM com Normal. Isso é uma colisão real de identidade/armazenamento e um alvo de API incorreto. A #161 gera namespace `upseller-test`, prefixo `upstatus_test_`, exige `UPSTATUS_TEST_PROJECT_ID` e rejeita produção e o laboratório de signaling/auth; sem projeto dedicado, o build declara sentinel inerte, não um TEST implantável.

## Compatibilidade e autorização Normal/Team Lite

Inspecionei o código implantado e os templates candidatos.

**Instalado:**
- Normal: `password.length < 6` na função de login/setup.
- Team Lite: `password.length < 4`.
- Ambos expõem `POST /api/setup` sem exigir `setupToken`.
- Ambos mantêm fallback que atribui `implementation_admin` a Ricardo/Lohan/Guilherme pelo nome quando a role está vazia.
- Ambos autorizam `POST /api/chat/clear` pela comparação do nome Ricardo, sem exigir role administrativa.
- `users.id` é PK bigint, mas `users.name` não tem UNIQUE.
- `upstatus_sessions` e `upstatus_profiles` guardam `user_name`, sem `user_id`.

O banco atual tem cinco usuários, cinco nomes distintos e zero password hashes/roles vazios. Isso não elimina o risco estrutural de primeiro acesso nem o problema de identidade por nome.

**Candidato #161 Normal e #76 Team Lite:**
- Setup exige token hexadecimal de 64 caracteres, gerado com 32 bytes aleatórios e validade de 15 minutos.
- Consumo é atômico pela RPC `consume_upstatus_setup_invite`.
- Role vazia vira `implementation_user`, sem promoção por nome.
- Login aceita senha de quatro caracteres; setup exige seis, igual nos dois produtos.
- Emissão de convite é limitada a cinco por administrador em 900 segundos.
- Limpeza total do chat exige Ricardo **e** role `implementation_admin`.

Essas correções são evidência de código/CI candidato, não de implantação em produção. AUTH-03 continua bloqueado.

## Realtime e sinalização

Consulta SELECT em produção, janela móvel de 14 dias: **91 linhas em `realtime.messages`, todas `private=false`**, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. O checkpoint da Engenharia de 14:06 UTC reportou 128; os snapshots variam e não foram reconciliados. O valor desta execução é o resultado fresco de 14:34 UTC.

Triggers ativos:
- `upstatus_messages_broadcast` chama `upstatus_broadcast_messages()` após INSERT/UPDATE/DELETE e publica `to_jsonb(OLD/NEW)` completo.
- `upstatus_remote_state_broadcast` publica metadados de remote-command/result.
- `upstatus_users_broadcast` publica nome/status/reason/sync.

As três funções são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE para anon/authenticated. O Advisor registra três WARN para anon e três para authenticated. Como retornam `trigger`, não foi demonstrada invocação direta como RPC comum; o caminho de broadcast público pelos triggers está confirmado.

Os bundles instalados Normal, Team Lite e TEST assinam `upstatus-screen-share-live-3-1-1-beta10`, diferente do tópico dos triggers. #161 e #76 alinham os clientes candidatos ao tópico dos triggers, mas continuam sem `private:true` e sem `realtime.setAuth()`.

O adapter `createSignalingTransport` mantém `enabled=false` por padrão; Team Lite também lê flag default false e endpoint vazio. Não existe `upstatus-signal` em produção. O único `upstatus-signal-test` é v32 no laboratório. Logo, não existe transporte autenticado pronto para cutover em produção.

## RLS, grants, SECURITY DEFINER e Storage

Snapshot atual de produção:
- 10 tabelas do schema public com RLS habilitado e zero policies.
- Nove tabelas public concedem a anon/authenticated DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- `realtime.messages` tem RLS, zero policies, sem FORCE RLS e grants SELECT/INSERT/UPDATE a anon/authenticated.
- Default ACLs em public, storage, graphql e graphql_public ainda incluem privilégios para papéis clientes.
- Security Advisor: 6 WARN e 10 INFO.
- As três funções SECURITY DEFINER de broadcast mantêm EXECUTE amplo e `search_path=public`.

Storage live:
- `chat-images`: público, 20 MiB, 168 objetos.
- `profile-images`: público, 20 MiB, 20 objetos.
- `storage.objects`: RLS habilitado, zero policies próprias.
- Total: 188 objetos em buckets públicos.

**Drift de configuração:** `supabase/config.toml` declara chat-images público com 25 MB e allowlist de imagem/áudio/vídeo; profile-images público com 2 MB. Live está em 20 MiB nos dois buckets; chat-images live também permite PDF, Office, CSV e texto. O arquivo local e o estado remoto não representam a mesma política. Não houve upload de teste.

No laboratório, os três triggers SECURITY DEFINER usam `search_path=""` e não concedem EXECUTE a anon/authenticated. Entretanto, o Advisor reporta 18 tabelas public com RLS sem policies. O laboratório é melhor isolado nos grants diretos, mas não é full-product TEST.

## Migrations e estado gerenciado

Produção registra sete migrations:
- `20261005160000` upstatus_cloud
- `20261005173000` remote_realtime
- `20261005180000` client_presence
- `20261023154754` create_upstatus_visual_config
- `20261026195855` add_chat_message_file_name
- `20261027154329` allow_chat_document_mime_types
- `20261027155438` set_upstatus_upload_limits_20mb

O diretório canônico `master/supabase/migrations` contém somente as três primeiras. As quatro fontes SQL correspondentes às migrations posteriores não foram encontradas no diretório canônico de master nem no candidato #161. Não sintetizar SQL a partir do schema atual. O laboratório registra 39 migrations, incluindo AUTH-03 e rate limits, que não foram aplicadas em produção.

A branch gerenciada Supabase `main` está `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`. Não foi feita tentativa de rebase, reset ou aplicação de migration.

## Issues, testes manuais e classificação

- Issue #78: 0/8 critérios marcados. A reconexão sem F5 continua sem confirmação física Normal e Team Lite.
- Issue #79: 16/35 itens marcados; 19 permanecem pendentes.
- Nenhum teste manual de navegador/Tampermonkey foi executado nesta rodada.
- Não houve teste real de microfone, permissões de tela, reconexão física, interoperabilidade instalada ou requisição HTTP real à função de voz.
- CI citado acima pertence aos SHAs indicados; não foi disparado nem reexecutado pela auditoria.

Classificação:
- **CI:** #74 Validate/Smoke, #76 Candidate Checks, #161 Smoke, #162 Validate aprovados nos SHAs exatos; #82 Validate falhou.
- **Inspeção de código:** auth instalado/candidato, identidade, build, workflows, payloads de trigger, topic, flags e endpoint.
- **Inspeção de banco:** somente SELECT e metadados; nenhum teste de escrita.
- **Manual pendente:** oito critérios da #78.
- **Bloqueado:** RT-01, TEST-ISOLATION, MIGRATION-PROVENANCE, AUTH-03 e ACL-STORAGE.
- **Pendente:** RECONNECT e HUMAN-REVIEW.

## Gates e próximos passos

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcasts públicos, tópico legado e endpoint autenticado ausente em produção |
| TEST-ISOLATION | BLOCKED | Só produção e laboratório de signaling/auth; TEST instalado aponta para produção |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs do ledger não estão no diretório canônico |
| AUTH-03 | BLOCKED | Setup sem convite, fallback nominal e rate limit ausente nos runtimes instalados |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, SECURITY DEFINER e Storage público/config drift |
| RECONNECT | PENDING | Sem confirmação física de Ricardo para Normal e Team Lite sem F5 |
| HUMAN-REVIEW | PENDING | PRs Draft e sem review/autorização de release |

Ordem recomendada:
1. Revisar #161/#162 e consolidar em uma linha Normal única; obter Validate e Smoke no mesmo SHA.
2. Criar ambiente full-product TEST independente, após verificação de custo/billing e autorização.
3. Implementar/implantar sinalização server-mediated no ambiente isolado; só depois planejar cutover privado e autenticado.
4. Integrar o dispatcher #125/#128 e o bloqueio #129 antes de qualquer publicação Team Lite.
5. Planejar AUTH-03 e migração de sessões/perfis para `users.id`.
6. Revisar grants, Default ACL, RLS, SECURITY DEFINER e política/limites de Storage.
7. Recuperar as quatro fontes SQL originais e diagnosticar `MIGRATIONS_FAILED`.
8. Executar os oito critérios físicos e obter aprovação humana do SHA final.

## Limites e segurança desta execução

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, roles, grants, policies, ACLs, fixtures ou dados. Nenhum teste físico foi simulado ou declarado como executado.

A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79. O comentário da Engenharia foi preservado.
