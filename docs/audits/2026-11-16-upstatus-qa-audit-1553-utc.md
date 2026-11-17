# Auditoria independente UpStatus — 2026-11-16 15:53 UTC

**Execução:** 2026-11-16T15:53:25Z  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** leitura de `docs/RELEASE_READINESS.md`, refs e árvores Git, PRs/issues/comentários, arquivos de workflow/build/server, logs de CI, fontes das Edge Functions implantadas, catálogo PostgreSQL, Security Advisor, inventário de migrations e logs Edge. Todas as consultas SQL foram SELECT-only. Nenhum teste foi iniciado pela QA nesta execução; foram inspecionados resultados de CI já existentes.

## 1. Documento-base e heads reais

Li `docs/RELEASE_READINESS.md` na branch QA. O blob tem SHA `7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c` e 8.422 linhas. O snapshot consolidado do documento-base termina na revalidação de 2026-11-15 06:30 UTC; relatórios horários posteriores estão em `docs/audits/`. O relatório anterior mais recente era `2026-11-16-upstatus-qa-audit-1455-utc.md`. Mantive o documento-base e os relatórios anteriores intactos.

| Ref | HEAD observado | Estado |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | release 3.4.7 |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | deploy TEST atual ainda é push-triggered |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | runtime oficial 3.4.30 |
| QA `qa/release-readiness-2026-11-04-master` | `39e40a95e3d66b43573788861ee074df290b2b73` | igual ao HEAD da #82 |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` | aberta / Draft |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | aberta / Draft |
| PR #76 | `00a578e9174e08238a1289a35feb02d171625421` | aberta / Draft |
| PR #82 | `39e40a95e3d66b43573788861ee074df290b2b73` | aberta / Draft |

Comparações:
- #74: 887 commits à frente e 1 atrás de `master`.
- #75: 59 commits à frente de `team-lite-official`.
- #76: 389 commits à frente de `team-lite-official`; é descendente de #75, 330 commits à frente e sem commits atrás de #75.
- #82: 370 commits à frente e 1 atrás de `master`; os 209 arquivos alterados são todos documentação, sem arquivos de runtime, workflow ou migration.
- A API de branches reporta `protected=false` para `master`, `develop` e `team-lite-official`. Rulesets não foram consultados nesta execução; não concluo que não exista proteção externa por ruleset.

## 2. PRs e CI nos HEADs exatos

| PR | Evidência no HEAD atual | Classificação |
|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Signaling Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS | **CI PASS**. Smoke: 19/19 checks não autenticados e 136/136 autenticados; integração Chromium incluiu WebRTC de chamada, voz e tela. Concorrência de rate limit de sinalização, recibos de leitura e consumo de convite passaram. A etapa de rate limit de emissão de convites foi **SKIPPED**. |
| #75 Team Lite baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS | **PASS histórico** no HEAD da baseline. #76 é sua continuação/descendente e contém as mesmas dez alterações da #75; este PASS não valida o HEAD atual da #76. |
| #76 Team Lite signaling | [Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAILURE | O job `signed-upload-contracts` passou. `candidate-checks` falhou na primeira chamada: `/health` recebeu HTTP 402 em vez de 200. O corpo identifica `exceed_edge_functions_invocations_quota` e orienta o proprietário a atualizar o plano ou remover spend caps. Resultado: 0/16 checks não autenticados passaram; Playwright, Full-IIFE, testes autenticados, concorrência e cleanup foram **SKIPPED**. Bloqueio de infraestrutura do laboratório, não evidência suficiente de regressão funcional do código. |
| #82 QA docs | [Validate 43890960412](https://github.com/Reekyi/UpStatus/actions/runs/43890960412): FAILURE | `scripts/validate.mjs:26` falha com `production updateURL mismatch`. A PR é documental; a validação falha no contrato herdado do build/validator da base. |

Todos os quatro PRs continuam abertos/Draft e sem reviews humanas registradas. Os resultados de CI são evidência automatizada nos ambientes usados pelo workflow, não teste físico no Sale Smartly/Tampermonkey. O teste de upload da #76 é de contrato offline com mocks; não houve PUT real ao Storage.

## 3. Workflows, distribuição e compatibilidade

### Workflows atuais nas branches oficiais

- `master/.github/workflows/deploy-production.yml`: manual, usa `secrets.SUPABASE_PROJECT_ID`, CLI `latest`, valida apenas que `preRelease` está vazio e fixa a versão em 3.4.7; não verifica explicitamente o SHA/ref de release nem compara o project ref com o ID de produção antes de publicar `upstatus`.
- `develop/.github/workflows/deploy-test.yml`: dispara manualmente e por push em `develop`; usa o secret genérico `SUPABASE_PROJECT_ID`, CLI `latest`, e publica `upstatus-test` sem guard visível que rejeite produção ou exija um Full-Product TEST separado. O valor real do secret não foi lido.
- `team-lite-official/.github/workflows/deploy-production.yml`: usa o secret genérico, CLI `latest`, não fixa SHA/ref nem valida o project ref e executa `supabase functions deploy upstatus`. **Esse é o slug Normal, não `upstatus-team-lite`. Não despachar.**
- A árvore de `team-lite-official` não contém `team-lite-candidate.yml`; o workflow de Candidate Checks está somente nas candidatas #75/#76 e ainda não está ativo na branch oficial.

### Melhorias nas candidatas e desalinhamento

- A candidata #74 torna o deploy Normal manual-only, faz checkout do SHA dispatchado, exige `refs/heads/master`, compara checkout SHA com `GITHUB_SHA`, verifica o project ref de produção e fixa Supabase CLI 2.122.1. Ainda publica somente `upstatus`.
- `scripts/build.mjs` da #74 separa URL de distribuição e API: o `updateURL` vem de `release.json.scriptUrl` (`/upstatus/upstatus.user.js`), mas `CLOUD_SERVER` de produção continua apontando para `upstatus-screen-share-3-1-1-beta10`. Assim, publicar somente `upstatus` não atualiza o backend beta10 que o cliente Normal usa. O runtime beta10 precisa de cutover coordenado com artefato, endpoint, versão e rollback.
- O `release.json` Normal permanece 3.4.7 e o workflow candidato #74 exige exatamente 3.4.7. O corte de uma nova versão ainda precisa de decisão e validação do guard.
- `team-lite/release.json` da candidata #76 indica buildVersion 3.4.31; o runtime oficial implantado é 3.4.30.
- A candidata #76 adiciona guard para `SUPABASE_TEST_PROJECT_ID`, rejeita produção e o laboratório de sinalização e fixa CLI 2.122.1 no deploy TEST. Porém esse laboratório não é Full-Product TEST.

## 4. Supabase: projetos, Edge Functions e disponibilidade

A listagem da organização retornou somente dois projetos:
- Produção `UpStatus`, ref `dlfvkawaiqduhlazsszm`, `ACTIVE_HEALTHY`.
- Laboratório `upstatus-security-test`, ref `bfpjtfqlnypisxljoxkb`, `ACTIVE_HEALTHY`.

Não existe um terceiro projeto Full-Product TEST na organização consultada. O laboratório tem somente duas Edge Functions de teste e tabelas de aplicação vazias; é um ambiente isolado de segurança/sinalização, não um ambiente completo de produto. O status `ACTIVE_HEALTHY` do projeto não garante que as invocações Edge estejam liberadas.

### Inventário de produção

Foram listadas 38 Edge Functions, todas `ACTIVE` e com `verify_jwt=false`. Isso não prova acesso anônimo por si só: os handlers UpStatus usam token customizado `x-upstatus-token`. É necessário manter inventário de autenticação/autorizações por rota, pois o gateway não valida JWT Supabase nessas funções.

| Função | Versão | SHA da fonte implantada |
|---|---:|---|
| `upstatus` | 480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-screen-share-3-1-1-beta10` | 6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| `upstatus-team-lite` | 15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-test` | 281 | — |

A fonte implantada do Normal `upstatus` identifica a versão 3.4.7; o runtime beta10 contém o backend legado que atende as rotas de API do Normal. Team Lite implantado é 3.4.30. As funções não foram modificadas.

### HTTP 402

Consulta read-only de `function_edge_logs` no recorte de 24 horas entre 2026-11-15 15:48:30 UTC e 2026-11-16 15:48:30 UTC. Os registros disponíveis começam às 11:41:55 UTC; portanto, os totais abaixo são o que foi observado no recorte, não uma garantia de cobertura contínua das 24 horas.

| Rota em produção | HTTP 402 |
|---|---:|
| beta10 `/api/chat` | 21.758 |
| beta10 `/api/status` | 9.529 |
| beta10 `/api/remote-status` | 9.511 |
| beta10 `/api/account` | 31 |
| beta10 `/api/members` | 21 |
| beta10 `/api/me` | 21 |
| distribuição `/upstatus/upstatus.user.js` | 6 |
| **Total observado** | **40.877** |

As rotas beta10 continuavam recebendo 402 até 15:48:29.902 UTC. O último 402 do endpoint de distribuição foi 14:29:33.928 UTC. Não apareceu rota Team Lite nesta amostra. Isso não prova que Team Lite esteja saudável ou indisponível.

**A causa específica da restrição em produção não foi exposta nos logs consultados.** Não atribuir automaticamente a produção ao mesmo código de quota observado no laboratório.

No laboratório, os logs registram 48 respostas 402 em 14 rotas de `upstatus-signal-test`, entre 12:37:25 e 12:41:42 UTC. O log do CI #76 confirma explicitamente `exceed_edge_functions_invocations_quota`: o projeto está restrito por quota/spend cap. Nenhuma alteração de plano, spend cap ou configuração foi feita pela QA.

## 5. AUTH-03 e paridade Normal/Team Lite

### Runtimes implantados

A inspeção read-only das fontes Edge confirma:
- Normal `upstatus` v480 e API beta10 v6 ainda expõem `needsSetup` em `/api/account` e aceitam `POST /api/setup` chamando `login(req,true)` sem exigir `setupToken` ou consumir a RPC de convite.
- Team Lite `upstatus-team-lite` v15 mantém o mesmo desenho legado de setup sem convite.
- O setup legado atribui `implementation_admin` por fallback nominal para `Ricardo`, `Lohan` e `Guilherme` quando o papel está vazio.
- O runtime Normal implantado exige senha mínima de 6 caracteres; Team Lite aceita 4. A política não é uniforme.
- Os três runtimes principais reportam `verify_jwt=false`; a autenticação customizada dentro do handler continua sendo essencial.

### Candidatos

- Os templates candidatos Normal e Team Lite passam a exigir token hexadecimal de primeiro acesso e chamar `consume_upstatus_setup_invite`; ambos definem 6 caracteres para setup e 4 para login.
- O template Team Lite também chama `consume_upstatus_setup_invite_rate_limit`, limitando emissão a 5 convites por 15 minutos e falhando fechado em erro.
- O template Normal não contém essa chamada. O passo correspondente do Smoke #74 foi SKIPPED. A paridade do rate limit de emissão de convites não está fechada.

### Catálogo

- Produção: não existem colunas `setup_token_*` nem as RPCs `consume_upstatus_setup_invite`, `consume_upstatus_setup_invite_rate_limit`, `consume_upstatus_signal_rate_limit` ou `merge_chat_read_receipts`.
- Laboratório: as quatro RPCs existem como `SECURITY INVOKER`, `search_path` vazio e EXECUTE somente para `service_role`. O laboratório não representa implantação em produção.
- Portanto, AUTH-03, rate limit distribuído e recibos atômicos permanecem ausentes no banco/runtime de produção.

## 6. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Tabelas e funções

- Dez tabelas públicas de aplicação têm RLS habilitado e zero policies.
- Nove dessas tabelas concedem privilégios efetivos a `anon` e `authenticated` para SELECT, INSERT, UPDATE, DELETE e TRUNCATE. `upstatus_visual_config` não concede esses privilégios.
- RLS não restringe TRUNCATE. O grant é uma superfície de privilégio desnecessária; esta auditoria não demonstrou um caminho de execução SQL arbitrária via HTTP nem uma exploração.
- Três funções de trigger (`upstatus_broadcast_messages`, `upstatus_broadcast_remote_state`, `upstatus_broadcast_users`) são `SECURITY DEFINER`, usam `search_path=public`, têm um trigger cada e mantêm EXECUTE para `anon`, `authenticated` e `service_role`.
- Security Advisor de produção: 10 INFO de RLS sem policies, 3 WARN para funções SECURITY DEFINER executáveis por anon e 3 WARN para authenticated.
- Default ACLs permanecem amplas para objetos criados por `postgres` em `public` e `storage`, e por `supabase_admin` em `public`, `graphql` e `graphql_public`.

### Realtime

SELECT-only em `realtime.messages` retornou 106 mensagens; todas `private=false`, zero policies em `realtime.messages`, e SELECT/INSERT efetivos para anon/authenticated.

| Evento público observado | Linhas |
|---|---:|
| `user_status` | 72 |
| `db_change` | 26 |
| `remote_command` | 4 |
| `remote_result` | 4 |

A função `upstatus_broadcast_messages()` serializa a linha OLD/NEW completa com `to_jsonb` e publica em `db_change` com `private=false`. `upstatus_broadcast_remote_state()` publica metadados de comando/resultado. `upstatus_broadcast_users()` publica nome, status, razão, updated_at e sync. Isso confirma a configuração de broadcast público no banco; não foi feita tentativa de exploração nem reprodução de entrega a cliente externo.

Os clientes candidatos mantêm `signaling_transport_enabled=false` por padrão e endpoint de transporte vazio; não usam `private:true` nem `realtime.setAuth()`. O fallback público de voz/tela continua ativo enquanto o transporte autenticado não é o padrão. A função server-mediated de sinalização está somente no laboratório, não na produção.

### Storage

- `chat-images` e `profile-images` continuam públicos, com limite de 20 MiB cada.
- `storage.objects` contém 188 objetos e zero policies próprias.
- A configuração pública do bucket permite leitura por URL; a política de privacidade e a autorização por objeto precisam ser definidas. Não foi tentado acesso a objetos.
- Security Advisor do laboratório reporta 18 INFO de RLS sem policies e nenhum WARN de SECURITY DEFINER executável por anon/authenticated. Isso não elimina a quota Edge nem transforma o laboratório em TEST completo.

## 7. Migrations e proveniência

- Ledger de produção: 7 migrations.
- Ledger do laboratório: 39 migrations.
- A branch gerenciada Supabase `main` permanece `MIGRATIONS_FAILED`, embora o projeto e o preview reportem `ACTIVE_HEALTHY`.
- Os quatro SQLs originais abaixo continuam ausentes tanto em `master` quanto na branch QA, embora suas versões apareçam no ledger remoto de produção:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruir esses SQLs por inferência do schema remoto e não aplicar migrations em produção.

## 8. Issues, aceite físico e aprovação

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, **0/8 critérios físicos** marcados. Nenhum teste manual de perda/retorno de internet, reentrada sem F5, microfone/tela reais ou interoperabilidade instalada foi realizado pela QA nesta execução.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, **16/35** itens marcados. O comentário QA dedicado foi atualizado in-place; o comentário da Engenharia foi preservado.
- PRs #74, #75, #76 e #82 seguem Draft e sem reviews humanas registradas.

## 9. Gates e recomendação

| Gate | Estado | Evidência atual |
|---|---|---|
| RT-01 | **blocked** | 106 mensagens públicas, zero policies, grants amplos; transporte seguro não é default. |
| TEST-ISOLATION | **blocked** | Só produção e laboratório de sinalização; quota Edge bloqueia o laboratório. |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes; branch gerenciada main em MIGRATIONS_FAILED. |
| AUTH-03 | **blocked** | Runtimes implantados sem convite/token; RPCs de AUTH-03 ausentes em produção; rate limit divergente nos candidatos. |
| ACL-STORAGE | **blocked** | Grants/TRUNCATE, SECURITY DEFINER, default ACLs amplas, buckets públicos e zero policies. |
| RECONNECT | **pending** | Issue #78 continua 0/8; CI não substitui teste físico sem F5. |
| HUMAN-REVIEW | **pending** | PRs Draft, sem review humana nem autorização explícita de release. |

**Recomendação: NOT READY.** Não recomendar merge, deploy, release ou publicação de userscripts.

### Próximas ações

1. O responsável com acesso de proprietário ao laboratório deve restaurar as invocações Edge (plano/spend cap); depois repetir Candidate Checks #76 no HEAD atual.
2. O responsável pela produção deve confirmar a causa específica dos 402 no painel Supabase. Não presumir que seja a mesma quota do laboratório.
3. Criar Full-Product TEST separado antes de permitir deploy-test.
4. Corrigir o workflow Team Lite para o slug `upstatus-team-lite`, com guard de projeto/SHA, CLI pinada e preflight; não despachar o workflow atual.
5. Coordenar o endpoint API Normal beta10 com o artefato/distribuição `upstatus` e um rollback revisado.
6. Fechar paridade AUTH-03, rate limit de convites e RPCs no ambiente TEST antes de qualquer produção.
7. Projetar o Realtime privado/server-mediated, remover o fallback público sensível e revisar grants, policies, triggers, default ACLs e Storage.
8. Recuperar os quatro SQLs originais de fonte confiável, diagnosticar MIGRATIONS_FAILED e não sintetizar migrations.
9. Executar os oito critérios físicos da #78 e obter review humana antes de qualquer release.

## 10. Registro de segurança

Nenhum teste foi executado diretamente pela QA; somente logs de CI existentes foram inspecionados. Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL, alteração de spend cap ou operação destrutiva foi realizada. A única escrita desta execução é este novo relatório na branch QA e a atualização in-place do comentário QA existente na Issue #79. Nenhuma branch de engenharia ou comentário da Engenharia foi alterado.
