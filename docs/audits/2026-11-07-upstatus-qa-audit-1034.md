# UpStatus — auditoria independente de QA
**Data da verificação:** 2026-11-07 10:34 UTC (07:34 BRT)  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Escopo Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório isolado `bfpjtfqlnypisxljoxkb`

## 1. Conclusão executiva

- **Normal #74:** Validate e Signaling Smoke passaram nos HEADs exatos consultados.
- **Team Lite #76:** Candidate Checks passou no HEAD exato consultado.
- **TEST guard #84:** Validate passou, incluindo testes de alvo, metadados, escopo de segredo e contrato de upload assinado.
- **QA #82:** Validate continua falhando no baseline herdado `production updateURL mismatch`; a PR é documental e não altera runtime.
- **Release:** continua bloqueado. Não existe projeto Supabase completo de TEST; o workflow de deploy TEST é apenas manual e implanta somente `upstatus-test`. Team Lite não tem runtime TEST próprio.
- **Achado de integração:** o builder Normal da #74 ainda aponta o CLOUD_SERVER de produção para beta10, enquanto o UpdateURL de produção aponta para `upstatus`. A correção de alinhamento está na PR #84 baseada em develop, não no HEAD atual da #74.
- **Produção:** as funções principais ainda usam setup público antigo e fallback administrativo por nome. Os broadcasts de produção continuam públicos e enviam payloads com dados.
- **Aceitação física:** #78 continua 0/8. Nenhum teste manual real de Tampermonkey, rede, microfone ou captura de tela foi executado por esta auditoria.

Classificação usada: **Automatizado PASS**, **inspeção de código**, **consulta read-only**, **manual pendente**, **bloqueado**. Uma aprovação de CI não é aprovação de segurança, deploy ou release.

## 2. HEADs e PRs

Todos os PRs abaixo estavam abertos, Draft e sem aprovação humana submetida na consulta de reviews. O indicador GitHub de mergeabilidade não é aprovação de código.

| PR | Branch / base | HEAD completo | Comparação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `chore/continuity-foundation` / master | `7475a82e421c9286e6944ea17ee73afd39ed73d9` | 839 à frente / 0 atrás |
| [#75 baseline Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `team-lite/3.4.31-guest-fixes` / team-lite-official | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 / 0 |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `team-lite/signaling-transport-candidate` / team-lite-official | `87bbb2f91ac21477d69f7945ec62598e2bc6dce7` | 310 / 0; 251 commits à frente de #75 |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `qa/release-readiness-2026-11-04-master` / master | `6ca946f7520610b9d96bce296c74cfd0a7696748` | 92 / 0 |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `safety/test-deploy-target-guard-20261107` / develop | `773cf5e1af2774568c5705cd0d108acdf5d417e0` | 26 / 0 |

A #74 tem uma divergência histórica grande com master (839 commits); exige revisão de merge-base, escopo e sequência de cutover, mesmo com CI verde. #76 é continuação da #75, não um candidato independente.

## 3. CI nos HEADs exatos

### Normal #74 — PASS automatizado

- [Validate 42354944089](https://github.com/Reekyi/UpStatus/actions/runs/42354944089): SUCCESS.
- [Signaling Smoke 42354944038](https://github.com/Reekyi/UpStatus/actions/runs/42354944038): SUCCESS.
- Log do Smoke: 19/19 verificações não autenticadas e 129/129 autenticadas.
- Cobertura confirmada no log: chamadas WebRTC, voz, compartilhamento de tela, mesh de três membros, convite/entrada/saída de sala, recuperação de tentativa de voz, cancel-before-open, recuperação de screen-share, parser/envelope/adapter/polling, Retry-After, rate limit concorrente, read receipts atômicos e enrollment.
- Rate limit: 90 operações aceitas, uma rejeitada com HTTP 429 e `Retry-After: 60s`.
- Enrollment isolado: NULL/empty eligibility, conta configurada, token malformado/incorreto/expirado/reutilizado, corrida com um vencedor, fallback de role, preservação de admin explicitamente provisionado e não escalada de `" implementation_admin "`.

### Team Lite #76 — PASS automatizado

- [Candidate Checks 42354761800](https://github.com/Reekyi/UpStatus/actions/runs/42354761800): SUCCESS.
- Log: 16/16 verificações não autenticadas e 103/103 autenticadas.
- Cobertura: adapter, AUTH-03, recuperação durável de voice-room attempt, screen-share offer/answer, integração autenticada no projeto isolado, rate limit concorrente, read receipts, aliases Normal/Team Lite, updater 3.4.31 e portais Lucca/Ycaro.
- Rate limit: 90 aceitas, uma HTTP 429, `Retry-After: 60s`.
- O log confirma limpeza das fixtures ao final.

### Baseline #75

- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS no HEAD histórico exato #75. Não substitui os resultados atuais da #76.

### QA #82 — FAIL herdado

- [Validate 42360361232](https://github.com/Reekyi/UpStatus/actions/runs/42360361232): FAILURE.
- Erro exato: `VALIDATION FAILED: production updateURL mismatch`.
- O build terminou como 3.4.7 / TEST 3.4.7 antes da asserção.
- O HEAD #82 altera documentação; não alterou builder, manifesto ou validador. Não enfraquecer a asserção para obter verde.

### TEST guard #84 — PASS de validação, sem deploy

- [Validate 42362618413](https://github.com/Reekyi/UpStatus/actions/runs/42362618413): SUCCESS.
- Passaram: TEST build-target guard, metadados do projeto, escopo de secrets do workflow, contrato de upload assinado e Validate.
- Esse run não executou o preflight real pela Management API e não implantou Edge Function. O workflow `deploy-test.yml` é `workflow_dispatch`, restrito a `develop`, exige `vars.SUPABASE_TEST_PROJECT_ID`, rejeita produção e o projeto de fixtures e implanta somente `upstatus-test`.

## 4. Builder e isolamento TEST

### Correção confirmada

No HEAD #74, `scripts/build.mjs` blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`:
- lê `UPSTATUS_TEST_PROJECT_ID`;
- usa o sentinel inerte `00000000000000000000` quando não configurado;
- rejeita produção `dlfvkawaiqduhlazsszm`;
- rejeita o projeto isolado de signaling/auth `bfpjtfqlnypisxljoxkb`;
- deriva API, Realtime, Storage fallback e updater TEST do mesmo projeto;
- desabilita release feed/updater automático no artefato TEST.

O commit #74 `7475a82e` ajustou a regressão para exigir UpdateURL manual derivado de `CLOUD_SERVER`. **O artefato TEST atual não aponta automaticamente para produção.** A afirmação antiga de que o build TEST ainda direcionava para produção está superada.

### Ambiente ainda inexistente

Inventário Supabase atual:
- Produção: `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Isolado: `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.
- Não existe um terceiro projeto completo de TEST.

O projeto isolado contém apenas duas Edge Functions: `upstatus-signal-test` v32 (SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`) e `upstatus-signal-e2e-once` v3 (SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`). É laboratório de signaling/RPC, não backend completo de produto.

A PR #84 adiciona guardas seguros e preflight de metadados, mas não cria o projeto TEST. Não há função `upstatus-team-lite-test` no inventário e o workflow deploy TEST implanta apenas `upstatus-test`. A #76 testa o cliente/contratos Team Lite e usa o projeto isolado compartilhado; não comprova deploy/execução do runtime Edge Function Team Lite completo.

### Divergência de API/distribuição Normal permanece na #74

- Builder #74 blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3`, linhas 55–56: CLOUD_SERVER de produção aponta para `upstatus-screen-share-3-1-1-beta10`.
- Root `release.json` blob `93caf1701ea508575c90d002c0b8c3037b34d82a` aponta o `scriptUrl` para `/functions/v1/upstatus/upstatus.user.js`.
- Logo, distribuição e API do cliente ainda apontam para funções diferentes no HEAD #74.
- Produção tem `upstatus` v480 e beta10 v6.
- A PR #84, em branch separada baseada em develop, usa `PROD_FUNCTION=upstatus` e deriva API/UpdateURL do mesmo destino (builder blob `9a2c19dd685c109cc435e64cc6dc02742feed1e1`). Essa correção ainda não está no HEAD #74.

O deploy de produção existente publica somente `upstatus`; não garante atualização da beta10 que o cliente #74 ainda usa como API. Exigir mapa de distribuição/API/Realtime e plano de rollback antes do cutover.

Versão: Normal continua buildando 3.4.7, igual à versão já implantada; exige bump deliberado antes de release. Team Lite candidato 3.4.31; produção Team Lite v15 contém 3.4.30.

## 5. AUTH-03 e AUTH-02

### AUTH-03 — candidato implementado; RPC automatizada aprovada; HTTP incompleto

Inspeção dos templates:
- Normal `src/server/index.template.ts`, blob `d2291a9927983ba40fa53b45bc61fb86c3093ffb`.
- Team Lite `src/server/team-lite-index.template.ts`, blob `6696ba618a4080d6073e9264dd8fc621a6f8bb0f`.

Contrato candidato:
- token aleatório de 256 bits;
- persistência somente do hash SHA-256;
- expiração de 15 minutos;
- emissão protegida por sessão e role admin;
- RPC de consumo atômico;
- SECURITY INVOKER, search_path vazio, EXECUTE apenas para service_role;
- papéis NULL/empty/ASCII-whitespace-only recebem `implementation_user`;
- strings não vazias são preservadas literalmente, impedindo promoção de `" implementation_admin "`.

O teste `scripts/test-auth-enrollment.mjs`, blob `97abe2500f2a1a4b83c85ef5388c909cd54609b4`, chama diretamente `/rpc/consume_upstatus_setup_invite` com service_role e fixtures no projeto isolado. O log cobre token malformado, incorreto, expirado, replay, concorrência de um vencedor, fallback de role, admin explícito, padded-admin non-escalation e cleanup.

**Limite:** o teste de runtime não chama as rotas HTTP `/api/setup-invite` e `/api/setup`. O teste estático confirma o gate admin e o contrato de cliente, mas faltam integração HTTP real, HTTP 403 para emissor não-admin, entrega privada do token e verificação de não vazamento em logs. Não há botão administrativo dedicado.

O handler de emissão agora aceita contas com `password_hash IS NULL` ou string vazia, alinhando o predicado de emissão ao RPC.

### AUTH-02 — ausente

Não existe `upstatus_auth_rate_limits` nem `consume_upstatus_auth_rate_limit` em produção ou no projeto isolado. Não encontrei chamada de auth limiter nos handlers candidatos `login(req, setup)`. O rate limit de signaling não protege login, setup ou emissão de convite.

Política de senha:
- Normal: setup mínimo 6; login mínimo 4.
- Team Lite: setup mínimo 4; login mínimo 4.
Há divergência de política de criação, mas o login Normal aceita 4 e preserva a compatibilidade com senhas antigas de 4/5 caracteres criadas pelo Team Lite.

Os clientes candidatos removem senhas antigas do GM storage (Normal) e sessionStorage (Team Lite), sem voltar a persistir a senha. Cobertura é VM/estática; permissões GM e comportamento real ainda exigem Tampermonkey.

## 6. Produção: Edge Functions e autenticação antiga

Inventário read-only: 38 Edge Functions ACTIVE; todas com `verify_jwt=false`. Isso não prova ausência de autenticação por si só: as funções principais implementam sessão customizada. As quatro fontes principais foram inspecionadas:

| Função | Versão | SHA | Versão embutida |
|---|---:|---|---|
| `upstatus` | 480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` | 3.4.7 |
| `upstatus-test` | 281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` | 3.3.28 |
| `upstatus-team-lite` | 15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` | 3.4.30 |
| beta10 | 6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` | 3.1.1-beta8 |

As quatro fontes ainda possuem setup antigo sem convite: `POST /api/setup` inicializa conta sem token; o fallback escolhe `implementation_admin` por nome para Ricardo/Lohan/Guilherme quando o role está ausente; `GET /api/account` revela `needsSetup`. O risco é latente, não evidência de conta atualmente reivindicável.

SELECT agregado em `public.users`: 5 contas, 0 password_hash NULL/vazio, 0 roles NULL/vazios, 3 roles explicitamente `implementation_admin`.

Produção tem 7 migrations até `20261027155438`; não possui setup-token columns, setup RPC, auth limiter, signaling limiter, voice-attempt tables ou RPC de read receipts atômicos. A função `upstatus-test` continua ACTIVE dentro do projeto de produção, embora o builder candidato agora use sentinel quando não há TEST configurado.

As 34 funções restantes foram inventariadas, mas não tiveram todos os handlers revisados individualmente nesta rodada.

## 7. Projeto isolado, migrations e fixtures

Projeto isolado: 33 registros de migration até `20261107061242`.
- Colunas setup-token instaladas em `public.users`.
- `consume_upstatus_setup_invite` presente.
- `consume_upstatus_signal_rate_limit` presente.
- `merge_chat_read_receipts` presente.
- Voice-room attempts presentes.
- Auth-specific rate limiter ausente.

Snapshot SELECT-only após os workflows: zero fixtures de teste em users, sessions, rooms, memberships, events, call attempts, voice attempts e rate-limit buckets. Os logs mostram allowlists explícitas para as suítes mutáveis e cleanup verificado. QA não executou esses scripts nem fez limpeza manual.

**Rastreabilidade:** o arquivo rastreado `supabase/test-migrations/20261106191000_bounded_rate_limit_cleanup_test.sql` e o registro aplicado no ledger isolado usam identificadores/timestamps diferentes (`20261106210556_bounded_rate_limit_cleanup_isolated_test`). Manter um mapeamento explícito source-file → migration ledger para auditoria/reprodução.

## 8. RLS, grants, SECURITY DEFINER e Realtime

### Produção

Consulta de catálogo:
- Nove tabelas backend-owned em `public` com RLS habilitado e zero policies.
- Para anon e authenticated, privilégios efetivos SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN nessas nove tabelas.
- `upstatus_visual_config` não tem grants de cliente.
- `realtime.messages`: RLS habilitado, zero policies, SELECT/INSERT/UPDATE para anon e authenticated.

Zero policies não prova acesso às linhas por PostgREST; os grants continuam excessivos. TRUNCATE não é filtrado por RLS e deve ser removido dos papéis cliente após validar o contrato service-only.

Três triggers estão habilitados:
- `upstatus_messages_broadcast`;
- `upstatus_remote_state_broadcast`;
- `upstatus_users_broadcast`.

As três funções são SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated e enviam broadcast com `private=false`.
- mensagens: OLD/NEW completos por `to_jsonb`;
- remote-state: metadados de comandos/resultados;
- user-status: nome, status, motivo, updated_at e sync.

### Isolado

- Tabelas backend-owned em public: zero grants efetivos para anon/authenticated.
- `realtime.messages`: ainda SELECT/INSERT/UPDATE para anon/authenticated, RLS e zero policies.
- Funções broadcast: SECURITY DEFINER com `search_path=pg_catalog, public`, EXECUTE negado a anon/authenticated e permitido a service_role; payload minimizado para `{op}`.
- Os broadcasts isolados ainda usam `private=false`; autorização Realtime privada não está concluída.

### Default ACL / ACL-02

- Produção: default ACL de postgres ainda amplo em public e storage; default ACL de supabase_admin amplo em graphql, graphql_public e public.
- Isolado: default ACL de postgres em public foi restrito a postgres/service_role; storage ainda amplo e defaults de supabase_admin em graphql/graphql_public/public continuam amplos.
- Em ambos, postgres não é superuser e não é membro de supabase_admin; supabase_admin é superuser. ACL-02 não pode ser concluído com a sessão atual; requer caminho administrativo autorizado.

### Advisors (consulta atual)

- Produção: 6 SECURITY DEFINER WARN (3 anon + 3 authenticated), 10 INFO RLS sem policies; Performance e Health sem findings.
- Isolado: 0 SECURITY DEFINER WARN, 17 INFO RLS sem policies, 4 INFO de índices não utilizados; Health sem findings.

## 9. Issues e testes manuais

- [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos. Último checkpoint [6705445618](https://github.com/Reekyi/UpStatus/issues/78#issuecomment-6705445618) confirma que não houve teste real de Tampermonkey com perda de internet, retorno sem F5, encerramento offline, microfone/display ou interoperabilidade instalada Normal ↔ Team Lite.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 91 comentários. O corpo principal continua no snapshot de 2026-11-03; comentário mais recente [6705445312](https://github.com/Reekyi/UpStatus/issues/79#issuecomment-6705445312) registra os resultados de CI das 07:00 BRT. Atualizar o corpo/checklist para refletir o estado atual, sem marcar release pronta.

## 10. Gates recomendados

1. Provisionar projeto Supabase dedicado de TEST completo; não reutilizar produção nem o laboratório de fixtures.
2. Executar preflight real da Management API somente após existir o projeto e configurar a variável dedicada; revisar região, organização, status, secrets e rollback.
3. Criar runtime e workflow de deploy/teste próprios para Team Lite; hoje o deploy TEST cobre somente `upstatus-test`.
4. Alinhar CLOUD_SERVER, UpdateURL, Realtime e Storage no HEAD #74; incorporar a correção do builder em uma PR de engenharia apropriada, sem alterar branches de engenharia pela QA.
5. Fazer bump de versão Normal e documentar mapa de endpoints/rollback Normal e Team Lite.
6. Adicionar testes HTTP reais para emissão/consumo de convite, não-admin 403, entrega privada e redaction de logs.
7. Implementar rate limit distribuído e fail-closed para login/setup/convite, com concorrência, 429, Retry-After e origem de cliente confiável.
8. Planejar cutover das quatro funções antigas de produção e inventariar consumidores/rollback antes de retirar versões legadas.
9. Migrar broadcasts para payload mínimo e autorização Realtime privada compatível com a sessão customizada; reduzir grants de tabela/função e resolver ACL-02 com admin autorizado.
10. Completar os 8 testes físicos da #78, reconciliar #79 e obter reviews humanas independentes.

## 11. Segurança e limites desta rodada

- Todas as consultas SQL foram SELECT-only.
- Nenhuma migration foi aplicada.
- Nenhuma Edge Function foi implantada/alterada.
- Nenhum secret, flag, role, grant, policy ou configuração de produção foi alterado.
- Nenhuma fixture foi criada, modificada ou removida por QA.
- Nenhum workflow foi iniciado, rerun ou cancelado manualmente por QA; foram inspecionados os runs existentes.
- Nenhum merge, release ou publicação de userscript.
- Nenhuma branch de engenharia foi alterada.
- A única escrita desta rodada é este novo relatório na branch QA dedicada.

**Sem percentual de conclusão.** CI, inspeção de código, estado de produção, validação do laboratório, aceitação manual e prontidão de release permanecem categorias distintas.
