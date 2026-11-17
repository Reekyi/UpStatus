# UpStatus — auditoria independente de QA

**Data:** 2026-11-17 00:35 UTC  
**Escopo:** GitHub `Reekyi/UpStatus`; Supabase produção `dlfvkawaiqduhlazsszm`; laboratório isolado `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, workflows, CI, logs, bundles Edge Functions, catálogos PostgreSQL, migrations, Storage e Security Advisors. Nenhum teste foi iniciado manualmente pela QA.

## Veredito

**NOT READY — não liberar Normal nem Team Lite.**

A fotografia atual confirma cinco bloqueios independentes: (1) produção acumulou 77.925 respostas HTTP 402 no último intervalo de Edge logs disponível; (2) o laboratório está bloqueado por quota e não é Full-Product TEST; (3) o transporte Realtime continua público por padrão; (4) produção mantém grants/ACLs amplos e AUTH-03 ausente; (5) os workflows de release não coordenam distribuição, API e versão.

**Cuidado com a janela de logs:** o último registro `function_edge_logs` disponível foi às **21:00:47 UTC de 16/11**. Não há logs posteriores desse stream até a consulta de 00:35 UTC. Isso não prova recuperação nem ausência de tráfego; a causa dos 402 em produção permanece desconhecida.

## 1. Heads reais e prontidão documental

| Referência | HEAD consultado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA `qa/release-readiness-2026-11-04-master` | `3c786d0ec1c670d6e9338235cad4704b43cbc533` |

O arquivo `docs/RELEASE_READINESS.md` foi lido integralmente: **8.423 linhas / 1.046.356 caracteres**. O último checkpoint interno é de **15/11/2026 06:30 UTC**, portanto está desatualizado para esta execução. Não alterei o arquivo-base; esta auditoria foi criada como documento separado.

Comparações atuais:
- PR #74: 887 commits à frente e 1 atrás de master.
- PR #75: 59 à frente e 0 atrás da base Team Lite.
- PR #76: 389 à frente e 0 atrás de `team-lite-official`.
- PR #82 / branch QA: 382 à frente e 1 atrás de master; o diff comparado é documental (218 arquivos de documentação).

A API de branches reporta `protected=false` para **master, develop, team-lite-official e QA**. Não há proteção de branch visível nessas quatro referências. As PRs #74, #75, #76, #82 e #176 têm **zero reviews registradas** nesta consulta.

## 2. PRs e CI — separar execução automatizada de teste manual

| PR | HEAD | Evidência no HEAD | Classificação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | [Validate PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770142); [Smoke PASS](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | CI automatizado aprovado |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks PASS](https://github.com/Reekyi/UpStatus/actions/runs/41674353127), execução histórica de 03/11 | PASS histórico, não valida #76 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `00a578e9174e08238a1289a35feb02d171625421` | [Candidate Checks FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43868863235) | Bloqueio de infraestrutura |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `3c786d0ec1c670d6e9338235cad4704b43cbc533` | [Validate FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43980459247) | Falha herdada de build |
| [#176 migrations](https://github.com/Reekyi/UpStatus/pull/176) | `b50f8567392322b4309468e0fe9e6fc81ca38c1d` | [Validate FAIL](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) | Dependência ausente no baseline |

### #74 Normal

Validate e Smoke passaram no HEAD exato. Isso é evidência automatizada de CI, não aceitação física no Sale Smartly. O candidato inclui token de primeiro acesso e uma checagem adicional de papel administrativo para limpeza do chat, mas o transporte de sinalização autenticada continua opt-in e sem endpoint configurado por padrão.

### #76 Team Lite

O job `signed-upload-contracts` passou. No job `candidate-checks`, guards de build/isolamento, adapter, recuperação de voz/tela e contrato HTTP local passaram. A etapa de autenticação do endpoint isolado recebeu HTTP 402 em vez do 401 esperado. O corpo da resposta informa `exceed_edge_functions_invocations_quota` e orienta o proprietário a atualizar o plano ou remover o spend cap. Playwright, integração autenticada, concorrência, recibos e testes de convite foram ignorados após a falha.

Os logs do laboratório registram 48 respostas 402 entre 12:37:25 e 12:41:42 UTC de 16/11. Não foi feita alteração de plano, cobrança ou spend cap.

### #82 QA

O PR é documental. O Validate falha na asserção `production updateURL mismatch`, em `scripts/validate.mjs:26`. O erro é herdado do build de master; não é falha causada pelo conteúdo Markdown. O workflow dispara validação para o PR inteiro mesmo quando o diff é somente documentação.

### #176 — proveniência de migrations

A PR recupera quatro statements SQL do ledger de produção, com newline final, mas declara corretamente que isso não prova recuperação byte a byte dos arquivos originais/comentários. Nenhum SQL foi reaplicado. O Validate falha por `client signed upload helper missing`; não houve replay nem preflight em Full-Product TEST. Manter Draft.

## 3. Workflows, distribuição e compatibilidade Normal / Team Lite

### Normal candidato

O workflow [deploy-production.yml da #74](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/.github/workflows/deploy-production.yml) é manual-only, faz checkout do SHA exato, exige branch master, confere o project ref de produção e fixa Supabase CLI 2.122.1. Isso é uma melhoria real de segurança operacional.

Mas ele publica **somente** a função `upstatus`. O build candidato ainda define `CLOUD_SERVER` para `upstatus-screen-share-3-1-1-beta10`; portanto, atualizar apenas `upstatus` não atualiza a API que o cliente chama.

Há também uma trava de versão contraditória: `release.json` e o artefato raiz estão em **3.4.7**, enquanto o workflow exige exatamente 3.4.7. O build guard exige versão superior ao artefato atual para sincronizar uma nova distribuição. Um userscript alterado precisa de bump de versão para que o Tampermonkey o reconheça, mas o workflow atual rejeita esse bump. O plano de release precisa alinhar versão, updater, distribuição e API.

### Team Lite oficial

O workflow [deploy-production.yml de team-lite-official](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml) continua usando CLI `latest`, não valida explicitamente projeto/SHA/branch e executa `supabase functions deploy upstatus`. O alvo Team Lite deveria ser `upstatus-team-lite`.

**Não despachar o workflow oficial Team Lite.**

O workflow candidato [team-lite-candidate.yml](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/.github/workflows/team-lite-candidate.yml) tem guards de isolamento, CLI e projeto de teste, concorrência com fila e contratos offline. É CI de candidato, não workflow de produção.

### Versões implantadas

| Função | Versão Edge | Versão interna |
|---|---:|---|
| Normal `upstatus` | 480 | 3.4.7 |
| API beta10 | 6 | 3.1.1-beta8 |
| Team Lite `upstatus-team-lite` | 15 | 3.4.30 |
| TEST `upstatus-test` | 281 | 3.3.28 |

Team Lite candidato declara buildVersion 3.4.31, mas a função implantada continua 3.4.30. Produção lista 38 Edge Functions ACTIVE, todas com `verify_jwt=false`; isso não prova que todas as rotas aceitem chamadas anônimas, mas exige revisão explícita da autenticação própria em cada endpoint.

## 4. Supabase — disponibilidade, isolamento e migrations

Projetos consultados:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY.
- Laboratório isolado `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY.
- Não existe projeto Full-Product TEST.
- A branch gerenciada `main` de produção continua `MIGRATIONS_FAILED`, embora o preview esteja ACTIVE_HEALTHY.

Migrations no ledger:
- Produção: **7**.
- Laboratório: **39**.

O laboratório contém quatro colunas `setup_token_*`, RPC `consume_upstatus_setup_invite` e tabela de rate limit. Produção não contém essas colunas, RPC ou tabela de rate limit. O laboratório não tem buckets Storage e não representa um ambiente completo para validar chat/anexos.

### HTTP 402 de produção

O stream `function_edge_logs` contém **77.925 respostas 402** no recorte disponível de 16/11:

| Rota | Respostas 402 |
|---|---:|
| beta10 `/api/chat` | 41.630 |
| beta10 `/api/status` | 18.104 |
| beta10 `/api/remote-status` | 18.086 |
| beta10 `/api/me` | 33 |
| beta10 `/api/account` | 33 |
| beta10 `/api/members` | 33 |
| distribuição `/upstatus/upstatus.user.js` | 6 |

Primeiro registro: 11:41:55 UTC. Último registro: 21:00:47 UTC. O stream não apresentou registros posteriores na consulta até 00:35 UTC. A causa específica em produção não foi identificada. Não inferir que a quota do laboratório seja a causa em produção.

## 5. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

Produção tem 106 registros em `realtime.messages`, todos `private=false`:
- 72 `user_status`;
- 26 `db_change`;
- 4 `remote_command`;
- 4 `remote_result`.

A tabela tem RLS habilitado, FORCE RLS desabilitado, zero policies e grants efetivos SELECT/INSERT/UPDATE para anon e authenticated. O laboratório também mantém grants SELECT/INSERT para anon/authenticated em `realtime.messages`, apesar de não ter linhas nem policies.

Os clientes Normal e Team Lite criam `channel(UP_REALTIME_TOPIC)` sem `private:true` ou `setAuth()`. Nos candidatos, `signaling_transport_enabled` é false por padrão e o endpoint de sinalização server-mediated fica vazio. Assim, o caminho autenticado ainda não é o default e os listeners públicos legados permanecem ativos.

A função `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 existem somente no laboratório; não há função equivalente de sinalização server-mediated na lista de produção. Não publicar broadcasts, injetar ICE/SDP nem tentar exploração nesta auditoria.

### PostgreSQL e SECURITY DEFINER

Produção:
- Dez tabelas públicas com RLS e zero policies.
- Nove dessas tabelas concedem privilégios efetivos amplos a anon/authenticated, incluindo TRUNCATE.
- Security Advisor: 10 INFO de RLS sem policy e 6 WARN relacionados a SECURITY DEFINER.
- Três funções de broadcast — `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state`, `upstatus_broadcast_users` — usam `search_path=public`; o Advisor aponta EXECUTE para anon e authenticated.
- As funções retornam `trigger`; não tentei RPC nem exploração. O grant é desnecessário e deve ser revisto mesmo sem teste de invocação direta.
- Default ACLs de postgres em public/storage e de supabase_admin em public/graphql/graphql_public continuam incluindo privilégios para anon/authenticated.

Laboratório:
- 18 tabelas públicas com RLS e sem policies; grants diretos de anon/authenticated nas tabelas públicas foram revogados.
- Security Advisor: 18 INFO de RLS sem policy e zero WARN.
- Realtime ainda tem grants para anon/authenticated.
- Storage: zero buckets e zero policies.

### Storage de produção

- `chat-images`: público, 168 objetos, limite de 20 MiB.
- `profile-images`: público, 20 objetos, limite de 20 MiB.
- Total: 188 objetos.
- Zero policies em `storage.objects`.

A configuração pública exige decisão explícita de privacidade e políticas de upload. O laboratório sem buckets não valida o fluxo real de anexos.

## 6. AUTH-03 e autorização implantada

Nos runtimes Normal, beta10 e Team Lite implantados:
- `POST /api/setup` ainda encaminha para o setup legado sem exigir token de convite.
- O primeiro setup atribui papel administrativo por fallback nominal para nomes fixos quando o papel está vazio.
- `POST /api/chat/clear` no runtime implantado autoriza pelo nome literal `Ricardo`, não por uma permissão/role robusta.
- A produção não tem as colunas de convite nem as RPCs/tabela de rate limit do candidato.

Os candidatos melhoram o fluxo com token de primeiro acesso e consumo atômico por RPC. O candidato também acrescenta checagem de papel ao caminho de limpeza do chat, mas ainda conserva a condição pelo nome. Essas mudanças não estão implantadas em produção.

## 7. Issues e validação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) permanece OPEN com **0/8 critérios** marcados. Os critérios incluem reconexão sem F5 em Normal e Team Lite, reentrada em sala, novas chamadas, ausência de áudio duplicado/peers órfãos/polling duplicado e teste manual no navegador.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) recebeu o checkpoint/final da QA no comentário dedicado. O comentário da Engenharia foi preservado.

**Nenhum teste manual foi executado pela QA.** Não houve sessão real no Tampermonkey/Sale Smartly, queda física de rede, microfone real ou compartilhamento de tela real. CI automatizado não substitui esses testes.

## 8. Gates e próximos passos

| Gate | Estado QA | Evidência resumida |
|---|---|---|
| RT-01 | blocked | Realtime público, private=false, sem policies e sem auth default |
| TEST-ISOLATION | blocked | Só há laboratório de sinalização/auth; sem Full-Product TEST/Storage |
| MIGRATION-PROVENANCE | in_progress | Quatro SQLs recuperados do ledger na #176; sem prova byte a byte/replay |
| AUTH-03 | blocked | Setup legado e schema de convite ausente em produção |
| ACL-STORAGE | blocked | Grants/default ACLs, SECURITY DEFINER e buckets públicos |
| RECONNECT | pending | Issue #78 0/8; nenhum teste físico |
| HUMAN-REVIEW | pending | Zero reviews nas PRs auditadas; sem autorização de release |

Próximas ações técnicas:
1. O proprietário do laboratório deve revisar Usage/Billing e spend cap para restaurar Edge invocations.
2. Diagnosticar os 402 de produção separadamente; recuperar o stream de logs antes de afirmar disponibilidade.
3. Consolidar o cutover Normal: versão nova, updater, distribuição e API chamada pelo cliente.
4. Corrigir o workflow Team Lite para slug correto, project ref, SHA e CLI fixada.
5. Tornar a sinalização autenticada o caminho padrão e remover listeners públicos sensíveis.
6. Corrigir grants/default ACLs, funções SECURITY DEFINER e Storage com plano de owner/reversão.
7. Validar migrations somente em Full-Product TEST isolado; depois executar aceitação física da #78 e obter reviews humanas.

**Nenhuma alteração em produção foi realizada.** Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL, escrita SQL ou operação destrutiva ocorreu. Todas as consultas SQL foram SELECT-only. A única escrita desta execução é este novo relatório documental na branch QA; nenhum arquivo existente foi sobrescrito.
