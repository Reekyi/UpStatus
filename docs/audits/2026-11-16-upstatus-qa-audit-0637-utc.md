# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-16 06:37 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório de sinalização/autenticação `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY — não liberar**

## Método e limites

Releitura de `docs/RELEASE_READINESS.md`, heads/PRs/issues/workflows/commits do GitHub, logs de CI já existentes, fontes das Edge Functions implantadas e consultas SQL exclusivamente SELECT nos dois projetos. Nenhum workflow foi disparado por esta auditoria. Não houve checkout local, execução local de testes, sessão Tampermonkey/Sale Smartly autenticada ou dispositivo físico; portanto não houve teste manual.

Vocabulário: **CI PASS/FAIL** = resultado do workflow no commit indicado; **inspeção de código** = leitura estática de fonte/configuração; **teste automatizado de integração/browser** = execução do CI no ambiente isolado; **manual pendente** = exige navegador/dispositivo real; **bloqueado** = dependência objetiva ainda não resolvida.

O snapshot final anterior de `docs/RELEASE_READINESS.md` é de **2026-11-15 06:30 UTC** e está defasado para esta revalidação.

## Heads e governança

| Branch | HEAD | Protegida? |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | Não |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | Não |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Não |
| QA | `b68df996f1be2079f7308c4023312b0b8bf662bd` | Não |

Compare master → QA: **360 commits à frente, 1 atrás**, divergência com merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. A QA contém documentação; não foi feito rebase.

A API do GitHub retorna `protected=false` e nenhum required status check nas quatro branches. O endpoint de rulesets do repositório retornou lista vazia; rulesets organizacionais não foram verificados. **Achado de governança:** não há proteção de branch/revisão/check obrigatório visível no nível do repositório.

## PRs e CI

| PR | HEAD | Evidência atual | Leitura QA |
|---|---|---|---|
| #74 Normal | `dcaf6a0` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) PASS | Candidata forte; não integrada |
| #75 Team Lite | `7bbf9b9` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico | Baseline antigo, superado pela #76 |
| #76 Team Lite | `83a6cc4` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) PASS | Candidata forte; não integrada |
| #82 QA | `b68df99` | [Validate 43812990969](https://github.com/Reekyi/UpStatus/actions/runs/43812990969) FAIL | Falha reproduzida em updateURL |
| #161 Normal | `557814d` | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) PASS | Baseada na #74; não integrada |
| #163 Voz HTTP 409 | `00f357b` | [Validate 43488594110](https://github.com/Reekyi/UpStatus/actions/runs/43488594110) PASS | Contrato offline; runtime de laboratório não atualizado |
| #167 Upload/chat | `d25b3fb` | [Validate 43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392) PASS | Sem Smoke/transferência real |
| #168 Retry-After | `c6de3eb` | [Validate 43755941462](https://github.com/Reekyi/UpStatus/actions/runs/43755941462) PASS | Sem Smoke; 900s é limite conservador |
| #170 Updater/chat | `693039e` | [Validate 43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686) FAIL | Assertion espera upload imediato; contrato #167 usa anexo pendente |
| #174 develop upload | `277dd7b` | [Validate 43802407509](https://github.com/Reekyi/UpStatus/actions/runs/43802407509) PASS | Backport isolado em develop |
| #175 develop admin | `d20187c` | [Admin Role Security 43808590208](https://github.com/Reekyi/UpStatus/actions/runs/43808590208) PASS; [Validate 43808590131](https://github.com/Reekyi/UpStatus/actions/runs/43808590131) FAIL | Segurança dedicada passou; validação completa falha por helper de upload ausente |

As reviews submetidas de #74, #75, #76 e #82 estão vazias. As PRs relevantes permanecem abertas/Draft.

### O que os PASS realmente cobrem

- #74 Smoke: **136/136** verificações autenticadas; testes de salas, concorrência, convites, WebRTC no Chromium e entrega de tracks de áudio/vídeo; limpeza de fixtures verificada. O harness de rate limit de emissão de convite foi **skipped** nessa execução.
- #76 Candidate Checks: **110/110** verificações autenticadas; inclui rate limit de convites, testes de voz/screen signaling, WebRTC no browser e IIFE Team Lite com browser/Tampermonkey stubs offline.
- Esses resultados são CI histórico no ambiente isolado. Não comprovam microfone físico, captura física de tela, Tampermonkey real no Sale Smartly ou reconexão após queda real de internet.
- #167 valida contratos de upload cliente/servidor com mocks; não fez PUT real para Storage. O bundle Normal atualmente implantado já marca o item como `pendingUpload:true`; portanto a regressão precisa proteger o contrato de anexo pendente (envio posterior e restauração se falhar), não exigir upload imediato.
- #175 tem teste dedicado de papel administrativo aprovado, mas o Validate completo falha em `client signed upload helper missing`.

## Build, distribuição e workflows

### Causa atual da #82

Em master, `scripts/build.mjs` fixa `PROJECT=dlfvkawaiqduhlazsszm`, usa `upstatus-test` para TEST e deriva o `updateURL` de `cloud`. Para Normal, `cloud` ainda aponta para `upstatus-screen-share-3-1-1-beta10`. Já `release.json` aponta para `/upstatus/upstatus.user.js` e `scripts/validate.mjs` exige exatamente esse destino. O Validate 43812990969 termina em **`production updateURL mismatch`**.

A candidata #74 corrige a origem do updateURL via `release.json.scriptUrl` e mantém o endpoint de API beta10. #161, empilhada sobre #74, corrige também o destino da API para `upstatus`. #167 e #170 são linhas independentes baseadas em master; não incluem automaticamente a integração #161/#168.

### TEST não está isolado no build atual

O build de master usa o projeto de produção também para o artefato TEST. O projeto de produção tem a função `upstatus-test` v281 e várias funções beta/backup. O laboratório `bfpjtfqlnypisxljoxkb` tem apenas `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3; não tem usuários, mensagens ou buckets.

As candidatas #74/#76 melhoram o guard: exigem `vars.SUPABASE_TEST_PROJECT_ID`, rejeitam produção e rejeitam o projeto de sinalização como alvo de Full-Product TEST. A workflow candidata é manual e usa Supabase CLI 2.122.1. **Não há terceiro projeto Full-Product TEST disponível**, portanto o guard impede corretamente o deploy até provisionamento de ambiente próprio.

### Publicação

- Master `deploy-test.yml`: dispara também por push em develop, usa `secrets.SUPABASE_PROJECT_ID` genérico e CLI `latest`.
- Master `deploy-production.yml`: manual, mas trava exatamente em versão 3.4.7 e usa CLI `latest`. A candidata #74 pinou CLI 2.122.1, porém manteve o guard exato 3.4.7; um bump de versão exige atualizar esse guard.
- `team-lite-official` `deploy-production.yml`: publica a função `upstatus`, não `upstatus-team-lite`, e usa CLI `latest`. A #76 não altera esse workflow. Não despachar.
- O Normal instalado (3.4.7) tem updateURL em `upstatus`, mas API em beta10 v6. Team Lite instalado é 3.4.30, API `upstatus-team-lite` v15 e updateURL GitHub raw. A candidata Team Lite #76 está em 3.4.31.

## Normal / Team Lite: segurança e contratos

### Upload assinado

Os dois bundles instalados já contêm helper de upload assinado; esta auditoria não considera a existência do helper como pendência. O problema é o endurecimento:

- Runtimes Normal v480 e Team Lite v15 validam MIME declarado e tamanho declarado (até 20 MiB), geram caminho aleatório, verificam token e caminho retornado pelo Storage, mas não vinculam rigorosamente a origem/rota da URL assinada ao projeto/bucket.
- Clientes instalados Normal e Team Lite aceitam a URL retornada pelo servidor e fazem PUT sem validação completa de origem/caminho/token; não usam `redirect: error`.
- #167 Normal adiciona validação de origem HTTPS, bucket, caminho público/assinado, token e PUT com `credentials: omit` e `redirect: error`.
- Team Lite #76 ainda usa `uploadFileDirect` sem essas verificações; o template servidor Team Lite também não valida origem/caminho da URL. #174 é backport para develop, não resolve Team Lite.
- Os buckets continuam públicos e o servidor não inspeciona bytes reais; MIME é declarado pelo cliente. Arquivos de chat/documentos ficam acessíveis por URL pública.

### AUTH-03 e limpeza do chat

Runtimes implantados Normal v480 e Team Lite v15 ainda têm setup sem convite obrigatório, fallback de papel administrativo baseado em nomes e limpeza global do chat autorizada apenas por `name === "Ricardo"`. Senha mínima no login legado: Normal 6; Team Lite 4. Produção tem cinco usuários e nenhum com hash de senha ou papel vazio; não foi reproduzida tomada de conta.

As candidatas #74 Normal e #76 Team Lite exigem setup token e papel persistido na limpeza; #76 já inclui rate limit de emissão. #161 acrescenta rate limit à linha Normal. Nada disso foi implantado em produção.

**Correção de precisão desta rodada:** a RPC de laboratório `consume_upstatus_setup_invite` existe com três argumentos (`p_user_name`, `p_setup_token_hash`, `p_password_hash`), SECURITY INVOKER, `search_path=""` e EXECUTE somente para postgres/service_role. A checagem anterior com assinatura de dois argumentos não correspondia à assinatura real. Produção não tem colunas `setup_token_*` nem essa RPC.

## Realtime, voz e tela

- Produção: 106 registros em `realtime.messages`, todos `private=false`; último registro observado em 2026-11-13. Os clientes instalados ainda usam o tópico legado beta10; triggers usam `upstatus-live-6f5e7b31-...`.
- Normal e Team Lite candidatos têm `signalTransportFlag=false` por padrão, fazem `channel(UP_REALTIME_TOPIC)` sem `private:true`/auth e mantêm listeners/broadcasts públicos como fallback. A migração server-mediated existe como opt-in, não como transporte padrão. RT-01 continua bloqueado.
- `upstatus-signal-test` v32 no laboratório autentica `x-upstatus-token` por hash de sessão, verifica membership aceito, limita leituras/escritas e aplica TTL/cleanup. Não está implantada em produção.
- O helper lab v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`. #163 passou o contrato offline para 409; o runtime lab v32 continua sem esse mapeamento.
- Issue #78 continua aberta com **0/8** critérios. Issue #79 está com **16/35** itens marcados e 19 pendentes. Não houve teste físico de reconexão sem F5, áudio bidirecional com dispositivos reais ou captura real de tela.

## Supabase: snapshot SELECT-only

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Edge Functions ACTIVE | 38 | 2 |
| Migrations no ledger | 7 | 39 |
| Tabelas public com RLS sem policies | 10 | 18 |
| Grants diretos em public para clientes | 126 em 9 tabelas | 0 |
| Grants TRUNCATE em public para clientes | 18 | 0 |
| Mensagens Realtime observadas | 106, todas públicas | 0 |
| Buckets Storage | 2 públicos | 0 |
| Usuários | 5 | 0 |

Produção:
- `realtime.messages`, `storage.buckets` e `storage.objects` têm grants SELECT/INSERT/UPDATE para anon/authenticated e zero policies próprias.
- Três funções SECURITY DEFINER de broadcast usam `search_path=public` e EXECUTE para anon/authenticated. Security Advisor: 3 WARN anon + 3 WARN authenticated; 10 INFO de RLS sem policy.
- `chat-images`: 168 objetos; `profile-images`: 20; ambos públicos, limite 20 MiB.
- `main` está `MIGRATIONS_FAILED`.

Laboratório:
- Três funções SECURITY DEFINER correspondentes usam `search_path=""` e EXECUTE restrito a postgres/service_role; Advisor sem WARN, mas 18 INFO.
- Ainda existem default ACLs amplas para anon/authenticated em schemas public/GraphQL e Storage; grants em Realtime/Storage permanecem apesar de não haver buckets/objetos.
- As RPCs de setup-invite, rate limit e read receipts existem, SECURITY INVOKER, search_path vazio, EXECUTE apenas postgres/service_role.

Ambos os projetos reportaram apenas logs PostgreSQL/PgBouncer na janela de 24h; sem logs Edge suficientes para contar HTTP 402 ou confirmar recuperação. Não inferir disponibilidade a partir da ausência de logs Edge.

### Proveniência de migrations

Os quatro SQLs abaixo retornam 404 tanto em master quanto em QA, embora suas versões estejam no ledger de produção:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

**Nota:** o ledger confirma sete versões; não reconstruir SQL ausente por inferência.

## Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | **blocked** | 106 eventos públicos; clientes ainda usam transporte público |
| TEST-ISOLATION | **blocked** | só existe laboratório de sinalização, explicitamente rejeitado como Full-Product TEST |
| MIGRATION-PROVENANCE | **blocked** | quatro SQLs originais 404 em master/QA |
| AUTH-03 | **blocked** | setup legado ainda implantado; candidato não integrado |
| ACL-STORAGE | **blocked** | grants/default ACLs e buckets públicos |
| RECONNECT | **pending** | issue #78 0/8; sem teste físico |
| HUMAN-REVIEW | **pending** | PRs abertas/Draft sem review/aprovação humana |

## Prioridades

1. Proteger master/develop/team-lite-official com required checks e review.
2. Integrar #74 + #161 + #168 em um Normal único; reconciliar #167 com anexos pendentes e atualizar a regressão da #170 para o contrato correto.
3. Incrementar versão Normal e corrigir o guard de release; alinhar build, manifesto, updateURL e API.
4. Corrigir workflow Team Lite para publicar `upstatus-team-lite`, CLI pinada e alvo exato.
5. Completar upload seguro em Team Lite e decidir Storage privado/inspeção de bytes.
6. Tornar transporte autenticado padrão em Normal e Team Lite; remover fallback público após migração coordenada.
7. Aplicar AUTH-03 somente após revisão/autorizações e recuperar os SQLs originais.
8. Provisionar Full-Product TEST separado do laboratório de sinalização.
9. Atualizar o contrato HTTP 409 no helper implantado somente após fluxo de release autorizado.
10. Executar os oito critérios físicos da #78 e obter aprovação humana.

## Integridade

Nenhuma consulta SQL alterou dados: todas foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operação destrutiva. Nenhum teste manual foi alegado. A única escrita documental desta rodada é este arquivo novo na branch QA; o comentário dedicado QA da Issue #79 foi atualizado sem duplicata e sem tocar no comentário da Engenharia.
