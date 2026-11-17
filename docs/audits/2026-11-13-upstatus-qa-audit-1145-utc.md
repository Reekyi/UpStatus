# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-13 11:45:24 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção:** Supabase `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** Supabase `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY — não liberar**

## Escopo e método

Revalidação read-only de branches, PRs #74, #75, #76, #82 e candidata relacionada #161; Issues #78 e #79; histórico de workflows e logs; userscripts e Edge Functions efetivamente implantados; catálogo PostgreSQL, RLS, grants, Default ACL, SECURITY DEFINER, Realtime, Storage, migrations e Advisors.

O conteúdo integral de `docs/RELEASE_READINESS.md` foi recuperado do raw GitHub (aprox. 1,05 MB). Seu último checkpoint técnico datado continua em **2026-11-08 18:30 UTC**. O documento é histórico e não contém esta revalidação de 13/11.

**Classificação:** CI significa execução automatizada no SHA indicado; inspeção de código/catálogo não é teste de runtime; Playwright/Chromium é automatizado e não substitui Tampermonkey/hardware; manual permanece pendente quando não há evidência física.

Nenhum script de teste foi executado localmente nesta rodada. Foram inspecionados logs existentes. Não havia sessão local controlada de navegador/Tampermonkey para aceitação física.

## 1. Heads, PRs e integridade de revisão

### Heads reais antes deste relatório

| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `13ad6ad2e8d9739d8a8356fc29c7ffe088c9c71d` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

A QA estava **277 commits à frente e 1 atrás** de master. A branch QA não está protegida. Master e team-lite-official também retornaram sem proteção de branch e sem required status checks.

### PRs revalidadas

| PR | HEAD | Base | Estado | Histórico/diff informado pelo GitHub |
|---|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | master em `a9288cc` | OPEN / Draft | 887 commits; 90 arquivos; +13.558 / -219 |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | OPEN / Draft | 59 commits; 10 arquivos; +1.267 / -76 |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | team-lite-official | OPEN / Draft | 386 commits; 57 arquivos; +12.020 / -161 |
| #82 documentação QA | `13ad6ad2e8d9739d8a8356fc29c7ffe088c9c71d` | master em `a9288cc` | OPEN / Draft | 277 commits; 135 arquivos; +35.583 / -0 |
| #161 Normal consolidada | `a1d8dc8409ae894a5fb02acd2014749b7281868f` | branch #74 em `dcaf6a0` | OPEN / Draft | 10 commits; 9 arquivos; +380 / -9 |

Nenhuma dessas PRs tinha review humano ou reviewer solicitado. A #161 é uma candidata filha da #74, não uma PR diretamente contra master. A #74 está baseada no master anterior `a9288cc`, enquanto o master atual é `9d40461`; o compare atual informa a candidata divergida e um commit atrás do master.

**Risco de integração:** o GitHub reporta históricos muito grandes em #74 e #76 (887 e 386 commits). Isso não prova que cada commit seja alteração funcional nova, mas torna a revisão/merge direta de alto risco. Exigir comparação de diff final, origem dos commits e estratégia de consolidação/squash aprovada. A #82 também é uma PR documental grande, com 135 arquivos de auditoria, não apenas um arquivo.

### Proteções de branch

As três branches principais consultadas — master, QA e team-lite-official — estão sem branch protection e sem required status checks. Isso é uma lacuna de governança: um PR Draft ou um push pode avançar sem review/check obrigatório imposto pela branch.

## 2. CI e workflows

| Alvo | Run | Resultado observado |
|---|---|---|
| #74 Validate | [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | PASS |
| #74 Signaling Smoke | [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS; 136/136 verificações autenticadas |
| #75 Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico do baseline |
| #76 Candidate Checks | [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS; 110/110 autenticadas e 16/16 não autenticadas |
| #82 Validate | [43411193366](https://github.com/Reekyi/UpStatus/actions/runs/43411193366) | FAIL em `production updateURL mismatch` |
| #161 Signaling Smoke | [43407101808](https://github.com/Reekyi/UpStatus/actions/runs/43407101808) | PASS no HEAD exato; inclui etapa “Validate complete Normal and TEST build” |

### #74 Normal

O Smoke no HEAD atual confirmou 136/136 verificações autenticadas, WebRTC de chamada/voz/tela com entrega de tracks remotas, mesh de três participantes, encerramento de peers e tracks, concorrência de salas/voz, rate limit de sinalização (90 aceitas, 1 HTTP 429 com Retry-After 60s), recibos de leitura atômicos e cleanup das fixtures.

### #76 Team Lite

O Candidate Checks confirmou 110/110 verificações autenticadas, 16/16 não autenticadas, Chromium WebRTC para chamada/voz/tela, mesh de três participantes, recuperação/leave de sala, aliases Normal/Team Lite, rate limit e setup-invite. É evidência automatizada no laboratório, não aceitação física nem release.

### #161 Normal — melhor candidata desta rodada

A #161 consolida a base #74 e corrige o contrato de API/distribuição. O run [43407101808](https://github.com/Reekyi/UpStatus/actions/runs/43407101808) passou no SHA exato `a1d8dc8`. O job executou build/Validate completo, testes estáticos, endpoints não autenticados, integração autenticada no projeto isolado, Playwright, rate limit de sinalização, recibos de leitura, enrollment e rate limit de emissão de convites. O log confirmou 136/136 verificações autenticadas, WebRTC de chamada/voz/tela, mesh de três membros e cleanup.

**Limite do CI:** o teste de emissão de convites chama diretamente a RPC no laboratório (24 concorrentes: 5 permitidos/19 negados; bucket independente: 5 permitidos/1 negado; reset e cleanup). O teste de rota `/api/setup-invite` é VM/static com banco mockado; não é E2E HTTP contra o servidor candidato implantado. O teste de singleton `VOICE_ATTEMPT_ALREADY_ACTIVE` também chama a RPC diretamente com service role, não valida o status HTTP do endpoint.

### #82

O Validate da branch QA atual falhou no HEAD `13ad6ad` em `scripts/validate.mjs` com `production updateURL mismatch`. A PR #82 é documental; não removi assertions nem alterei o validator para mascarar a falha.

### Publicação Normal

Na candidata #161, `scripts/build.mjs` define `PROD_FUNCTION="upstatus"`. O validator exige que `release.json.scriptUrl`, `@updateURL`, `@downloadURL`, atualizador manual, `CLOUD_SERVER` e workflow de produção apontem para o mesmo projeto/função. Também rejeita o endpoint legado beta10 no artefato Normal.

O workflow Normal candidato é manual, fixa Supabase CLI 2.122.1, exige branch master, checkout SHA exato e project ref esperado, e publica `upstatus`. Porém ele ainda bloqueia qualquer versão diferente de 3.4.7. `release.json` também continua em 3.4.7, igual ao Normal instalado v480. Portanto, o contrato foi corrigido na candidata, mas o incremento de versão e a atualização coordenada do guard continuam pendentes antes de qualquer release autorizado.

### Publicação Team Lite

O workflow em `team-lite-official/.github/workflows/deploy-production.yml` continua com CLI `latest`, sem a mesma verificação de SHA/projeto esperado, e executa `supabase functions deploy upstatus`. O alvo correto é `upstatus-team-lite`. **Não despachar esse workflow:** ele pode publicar código Team Lite na função Normal.

## 3. #161 — correções e ressalvas de código

### Correções candidatas confirmadas por inspeção

- API Normal e distribuição agora usam a mesma configuração `PROJECT + PROD_FUNCTION`; o alvo é `upstatus`, não beta10.
- Primeiro acesso exige token hexadecimal de 64 caracteres; o servidor consome `consume_upstatus_setup_invite` atomicamente e envia apenas o hash.
- O convite é aleatório de 256 bits, expira em 15 minutos e só pode ser emitido para conta com senha NULL/vazia.
- A emissão exige role administrativa persistida e usa `consume_upstatus_setup_invite_rate_limit`: cinco por administrador a cada 900 segundos; erro do limiter retorna 503 (fail-closed) e limite retorna 429.
- A migration candidata cria tabela com RLS, sem grants de cliente; RPC é SECURITY INVOKER, `search_path=''`, EXECUTE apenas para service_role e limpeza oportunista limitada a 100 linhas.
- O teste de enrollment cobre token ausente/malformado/errado/expirado/replay, concorrência de consumo, fallback seguro de role e não escalação por nome.

### Ressalvas ainda abertas na candidata

1. A migration `20261109230000_setup_invite_rate_limit.sql` existe no branch #161, mas não está no ledger de produção. O laboratório tem a tabela/RPC equivalente e a migration de contrato de teste; isso não é aplicação em produção.
2. O endpoint de emissão retorna 429 sem `Retry-After`; a sinalização já testa esse header, mas o rate limit de convite não.
3. A limpeza total do chat exige nome `Ricardo` mais role `implementation_admin`, removendo a autorização somente por nome. Ainda assim, o identificador do proprietário continua sendo uma string; a migração completa para `users.id` não foi feita.
4. O smoke não prova o status HTTP 409 para `VOICE_ATTEMPT_ALREADY_ACTIVE`. O Edge Function isolado v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas não esse código; o fallback é 500. O harness atual verifica o erro via RPC direta, não via HTTP. Corrigir o mapa e acrescentar assertion HTTP explícita.
5. O candidate #161 permanece Draft, sem review, e sua base é a branch #74. Não integrar isoladamente nem tratar CI verde como autorização.

## 4. Runtime realmente instalado — inspeção dos bundles

| Produto | Edge Function | Versão | Namespace | API usada pelo bundle |
|---|---|---:|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` | `upstatus-screen-share-3-1-1-beta10` |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` | `upstatus-team-lite` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` | `upstatus-screen-share-3-1-1-beta10` |

O TEST tem `@updateURL` próprio em `/upstatus-test/upstatus.user.js`, mas seu `CLOUD_SERVER` aponta para a API beta10 de produção. Também compartilha com Normal o namespace `upseller`, nome de instalação e chave GM `upstatus_screen_share_beta8_`. Isso cria risco de colisão de estado no Tampermonkey e faz o TEST interagir com backend de produção.

O projeto de produção contém 12 Edge Functions com prefixo `upstatus-test` ACTIVE. O laboratório `upstatus-security-test` é ACTIVE_HEALTHY, mas possui somente duas Edge Functions ativas, incluindo `upstatus-signal-test` v32; não é um ambiente full-product para Normal/Team Lite.

Os três bundles instalados ainda têm fluxo de primeiro acesso sem `setupToken`: quando `password_hash` está vazio, o setup atualiza a senha pelo nome. Se a role estiver vazia, o código legado promove Ricardo, Lohan e Guilherme por nome. O endpoint instalado `/api/chat/clear` também verifica somente `name === "Ricardo"`, sem exigir role. A #161 corrige esses caminhos na candidata, mas não está implantada.

As funções core usam autenticação própria por `x-upstatus-token`, hash SHA-256 da sessão, expiry no banco e cache por isolate de 30 segundos; sessão persistida tem validade de 30 dias. As 38 Edge Functions de produção reportam `verify_jwt=false`; isso não prova que todas as rotas são anônimas. A amostra dos handlers core confirma autenticação customizada, mas falta inventário rota a rota das 38 funções e dos backups/betas.

O banco tem cinco usuários, todos com hash de senha e role preenchidos e nomes atualmente distintos. Porém `users.name` não tem UNIQUE; `upstatus_sessions` e `upstatus_profiles` não possuem `user_id`. A tabela de sessões contém 319 linhas, 161 expiradas.

## 5. Supabase — fotografia read-only de 13/11

### Projetos e migrations

- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11, sete migrations no ledger; última `20261027155438`.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, 39 migrations.
- Branch gerenciada `main` da produção: `MIGRATIONS_FAILED`; preview: `ACTIVE_HEALTHY`.
- Produção não possui colunas `setup_token_*`, tabela de rate limit de convites nem RPC `consume_upstatus_setup_invite`/`consume_upstatus_setup_invite_rate_limit`.
- Laboratório tem quatro colunas de setup-token, RPC de consumo e tabela/RPC de rate limit. Isso comprova apenas o laboratório.
- Os quatro SQLs históricos ainda não foram comprovados como arquivos originais byte a byte no diretório canônico. Não reconstruí SQL nem apliquei migration.

### Realtime

Produção: 125 mensagens observadas nos últimos 14 dias, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:

| Evento | Linhas |
|---|---:|
| user_status | 67 |
| db_change | 46 |
| remote_command | 6 |
| remote_result | 6 |

Há sete partições diretas em `realtime.messages`, RLS habilitado, zero policies e privilégios SELECT/INSERT efetivos para anon/authenticated. Os clientes instalados Normal/Team Lite/TEST assinam `upstatus-screen-share-live-3-1-1-beta10`, diferente do tópico dos triggers.

`upstatus_broadcast_messages()` serializa OLD/NEW completos com `to_jsonb` e publica `db_change` em canal público. `upstatus_broadcast_remote_state()` publica metadados de comandos/resultados; `upstatus_broadcast_users()` publica estado de usuários. O payload completo é o risco concreto de divulgação. Não executei subscriber anônimo nem demonstrei exploração externa.

As três funções são SECURITY DEFINER, `search_path=public`, retornam trigger e estão ligadas a triggers. O Advisor registra EXECUTE efetivo para anon/authenticated (seis WARN no total). Como retornam trigger, não foi demonstrada invocação direta por RPC PostgREST; os grants são desnecessários e devem ser revistos, mas não devem ser descritos como exploit comprovado.

Não existe Edge Function `upstatus-signal` em produção. `upstatus-signal-test` v32 está somente no laboratório. O transporte autenticado permanece opt-in/default-off nos candidatos; o runtime instalado continua no transporte legado.

### RLS, grants e Default ACL

Produção:
- Dez tabelas public, todas com RLS e zero policies.
- Nove tabelas backend-owned ainda têm sete privilégios efetivos para cada papel anon/authenticated: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER (126 linhas de grants).
- Há 18 grants TRUNCATE (nove tabelas para cada papel). RLS não protege TRUNCATE; não foi demonstrada chamada externa pela API.
- Default ACL: 120 entradas para papéis clientes: public 48, graphql 24, graphql_public 24, storage 24.
- Security Advisor: seis WARN e dez INFO.

Laboratório:
- Dezoito tabelas public com RLS e zero policies, mas zero grants diretos de tabela para anon/authenticated nas tabelas public consultadas.
- Default ACL: 96 entradas para papéis clientes.
- Security Advisor: zero WARN e 18 INFO.
- Performance Advisor: cinco INFO de índices nunca utilizados; produção: zero achados de performance.

### Storage

Produção tem dois buckets públicos:
- `chat-images`: 168 objetos.
- `profile-images`: 20 objetos.

Ambos têm limite de 20 MiB e `storage.objects` não tem policies próprias. Os objetos em buckets públicos são acessíveis por URL pública. Os testes de signed-upload na candidata validam rota/bucket/MIME/tamanho/origem/path/token/PUT em VM/mock; não houve Storage E2E real.

## 6. Issues e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, **0/8** critérios marcados. Sem evidência física de reconexão Normal/Team Lite sem F5, reentrada, nova chamada, áudio bidirecional, ausência de peers/pollers órfãos e permissões reais de microfone/tela.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, **16/35** itens marcados e 19 pendentes.
- Playwright/Chromium em CI é automatizado; não substitui Tampermonkey instalado, microfone/display reais, rede física ou teste cruzado Normal ↔ Team Lite.

## 7. Gates e recomendação

| Gate | Estado QA | Evidência/razão |
|---|---|---|
| RT-01 | BLOCKED | Broadcasts públicos persistidos; sem endpoint server-mediated em produção |
| TEST-ISOLATION | BLOCKED | TEST v281 usa API beta10 e namespace/GM do Normal; falta full-product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Produção com sete migrations e main MIGRATIONS_FAILED; SQLs originais não comprovados |
| AUTH-03 | BLOCKED | Primeiro acesso instalado sem token; produção sem RPC/tabela de convite e rate limit |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, buckets públicos e sem policies próprias |
| RECONNECT | PENDING | Issue #78 sem aceite físico |
| HUMAN-REVIEW | PENDING | PRs candidatas Draft, sem review/autorização |

**Recomendação: NOT READY.** Não calcular percentual agregado: CI, inspeção estática, estado implantado e aceitação manual são dimensões diferentes.

## 8. Próximas ações prioritárias

1. Revisar #161 como candidata Normal; manter o primeiro acesso por convite e adicionar assertion HTTP 409 para `VOICE_ATTEMPT_ALREADY_ACTIVE`.
2. Definir um plano de consolidação de #74 (887 commits) e #76 (386 commits) antes de qualquer integração.
3. Criar ambiente full-product TEST separado e migrar runtime TEST legado por procedimento aprovado.
4. Projetar e validar transporte privado/server-mediated em laboratório; só depois coordenar endpoint, cliente e cutover em produção.
5. Corrigir workflow oficial Team Lite para publicar somente `upstatus-team-lite`, com CLI pinada, projeto/SHA e preflight.
6. Migrar sessão/perfil para `users.id`; remover bootstrap por nome e autorização de limpeza somente por nome.
7. Endurecer RLS/grants/Default ACL/SECURITY DEFINER/Storage com migrações revisadas e rollback.
8. Recuperar proveniência dos SQLs, resolver `MIGRATIONS_FAILED` e validar migrations no ambiente oficial.
9. Fazer E2E real de Storage e testes físicos da #78.
10. Obter review humana e autorização explícita do SHA final.

## Registro de segurança

Todas as consultas SQL desta rodada foram SELECT-only. Não houve merge, deploy, release, publicação de userscript, migration em produção, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva. Nenhum workflow foi disparado manualmente. O único trabalho documental desta execução é este novo arquivo na branch QA e a atualização do comentário QA existente na Issue #79.
