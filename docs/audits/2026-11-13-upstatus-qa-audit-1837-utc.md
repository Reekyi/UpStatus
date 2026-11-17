# Auditoria independente UpStatus QA — 2026-11-13 18:37 UTC

## Escopo e método

Revalidação read-only de GitHub e Supabase para UpStatus Normal, Team Lite e TEST. Foram consultados os heads de branches/PRs, histórico de CI e logs de jobs, fontes dos bundles implantados via Management API, inventário de Edge Functions, migrations, catálogos PostgreSQL, grants, Default ACLs, policies, Realtime, Storage e Security/Performance Advisors.

**Não executei testes manuais, não disparei workflows e não alterei produção.** Os resultados de CI abaixo são execuções já existentes. Todas as consultas SQL foram SELECT-only.

## Baseline documental e heads

- Li integralmente `docs/RELEASE_READINESS.md` na branch QA: 1.045.105 bytes e 8.410 linhas.
- O último checkpoint técnico dentro desse arquivo continua em **2026-11-08 18:30 UTC**. As auditorias de 13/11 estão em arquivos separados; o documento principal não foi alterado.
- HEADs verificados:
  - `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`
  - `qa/release-readiness-2026-11-04-master`: `5e44621901379fac184bc531e9241840719805ec`
  - `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`
  - PR #74: `dcaf6a072546eda0089e0cee4018c3047011f600`
  - PR #75: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`
  - PR #76: `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94`
  - PR #82: `5e44621901379fac184bc531e9241840719805ec`
  - PR #161: `557814dc31bed779b84a2094358dc6b2a7e67689`
  - PR #162: `fa8c9fa1fc91a238fca65fb46f31d078288e7f36`

QA e PR #82 apontam para o mesmo HEAD. A comparação QA vs master é 286 commits à frente e 1 atrás; os 142 arquivos divergentes são documentação, Markdown e templates de issue/PR. Não encontrei alterações de runtime nessa comparação.

Master, team-lite-official e QA estão sem branch protection. As PRs #74, #75, #76, #82, #161 e #162 permanecem Draft e sem reviews humanas.

## PRs, commits e CI

| PR | Commits | Arquivos | Situação |
|---|---:|---:|---|
| #74 Normal | 887 | 90 | Draft, mergeable |
| #75 Team Lite baseline | 59 | 10 | Draft, mergeable |
| #76 Team Lite candidata | 386 | 57 | Draft, mergeable |
| #82 QA | 286 | 142 | Draft, mergeable |
| #161 Normal | 12 | 10 | Draft, mergeable |
| #162 contrato de voz | 8 | 7 | Draft, não mergeable |

A #74 está 887 commits à frente e 1 atrás de master. A #75 está 59 commits à frente de team-lite-official; a #76, 386 à frente. A #161 está 12 commits à frente da base #74 e sem commits atrás. A #162 está **8 commits à frente e 2 atrás do HEAD atual da #161**; o merge-base é `a1d8dc8409ae894a5fb02acd2014749b7281868f`. A #162 precisa ser rebaseada/atualizada antes de integração.

### Resultados exatos de CI observados

- #74:
  - [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): SUCCESS.
  - [Signaling Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS; log registra 136/136 checks autenticados, WebRTC de chamada/voz/tela, mesh de três participantes, rate limit 90 aceitas + 1 HTTP 429 com Retry-After 60s, setup enrollment e cleanup.
- #75:
  - [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico. É baseline, não substitui a candidata #76.
- #76:
  - [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881): SUCCESS no HEAD exato; log registra 110/110 checks autenticados, browser WebRTC para chamada/voz/tela, mesh, rate limit, setup-invite, recuperação e cleanup.
- #161:
  - [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384): SUCCESS no HEAD exato `557814d`.
  - [Signaling Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445): SUCCESS no mesmo SHA; 136/136 checks autenticados. O log confirma WebRTC com áudio/vídeo remoto, mesh de três membros, rate limit 90+1/429, rate limit distribuído de setup-invite, consumo atômico de convite e cleanup.
  - A correção do filtro de Validate para incluir a base real `chore/continuity-foundation` já está no HEAD e os dois workflows agora executaram com sucesso.
- #162:
  - [Validate 43459219365](https://github.com/Reekyi/UpStatus/actions/runs/43459219365): SUCCESS no SHA `fa8c9fa`.
  - [Voice contract 43459218841](https://github.com/Reekyi/UpStatus/actions/runs/43459218841): SUCCESS no mesmo SHA.
  - Limitação: `scripts/voice-open-status.test.mjs` importa o mapper e cria objetos `Response` locais. Não faz requisição HTTP real à Edge Function implantada. O contrato unitário mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para 409, mas a integração HTTP real ainda não foi comprovada.
- #82:
  - [Validate 43474486040](https://github.com/Reekyi/UpStatus/actions/runs/43474486040): FAILURE no HEAD exato `5e44621`, que também é o HEAD da branch QA.
  - Erro: `VALIDATION FAILED: production updateURL mismatch`. O build chega a produzir PROD/TEST 3.4.7 antes da assertion. Como a comparação QA vs master contém somente documentação/templates, a falha é herdada do contrato do validator/master, não causada pelo relatório QA.

## Candidatas: achados de código

### Normal #161

A candidata:
- Alinha API e distribuição Normal para a função `upstatus`.
- Exige `setupToken` de 64 caracteres hexadecimais no primeiro acesso.
- Usa RPC de consumo atômico do convite.
- Emite convite com token aleatório de 256 bits, hash armazenado e validade de 15 minutos.
- Limita emissão a cinco convites por administrador em 900 segundos.
- Usa senha mínima de seis caracteres no setup e quatro no login.
- Define role padrão de usuário comum e preserva role explícita.
- Exige nome Ricardo **e** role administrativa na limpeza total do chat.

Limitações remanescentes:
- Sessões e perfis ainda usam `user_name`, não `users.id`.
- O bucket de rate limit de convite é derivado do nome do administrador.
- Não encontrei rate limit de tentativas em `POST /api/login`; a rota continua sem limitação por usuário/IP no código revisado.
- A limpeza do chat ainda combina um nome fixo com role, em vez de autorização por identidade imutável/owner ID.
- O transporte autenticado de voz/tela continua opt-in: `signaling_transport_enabled` default false e endpoint configurável vazio. O caminho legado público continua sendo o fallback.

### Team Lite #76

A candidata Team Lite está em build 3.4.31; a versão implantada continua 3.4.30. O template candidato alinha setup/login à política 6/4 caracteres e implementa o mesmo fluxo de convite único/rate limit. O tópico candidato é alinhado ao tópico dos triggers, mas o transporte privado/autenticado não é default.

### Bloqueio de versão Normal

Na #161:
- `release.json` continua em 3.4.7.
- O artefato raiz `UpStatus.user.js` também está em 3.4.7.
- `scripts/build.mjs --sync-root-artifact` exige que a versão seja estritamente maior que a do artefato atual.
- O workflow `.github/workflows/deploy-production.yml` aceita somente release estável exatamente 3.4.7.

Isso cria um bloqueio: para sincronizar/publicar uma nova versão é necessário incrementar acima de 3.4.7, mas o workflow rejeita qualquer versão diferente de 3.4.7. Corrigir a regra de versão e o manifesto é pré-requisito; não executar deploy.

## Runtimes implantados e Edge Functions

Fontes obtidas read-only pela Management API:

| Função | Versão | SHA da fonte | Userscript embutido |
|---|---:|---|---|
| `upstatus` | v480 | `bb2713ce…f7cc9dd` | Normal 3.4.7 |
| `upstatus-team-lite` | v15 | `2c13414a…a8e0dfb` | Team Lite 3.4.30 |
| `upstatus-test` | v281 | `7b5dfb12…a16cb0a` | TEST 3.3.28 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | `f6c5f8a4…1f05ad29` | API legada |
| Laboratório `upstatus-signal-test` | v32 | `f893360a…76b8712` | endpoint de teste |
| Laboratório `upstatus-signal-e2e-once` | v3 | — | sentinel |

Produção tem 38 Edge Functions ACTIVE; as 38 retornam `verify_jwt=false`. O backend principal usa sessão própria por `x-upstatus-token`, portanto a autenticação por rota precisa permanecer rigorosa. O laboratório tem duas funções. Não existe endpoint server-mediated `upstatus-signal` em produção.

Os três bundles instalados foram decodificados:
- Normal: updater aponta para `upstatus`, mas `CLOUD_SERVER` ainda aponta para beta10; tópico Realtime beta10; namespace `upseller`; prefixo GM `upstatus_screen_share_beta8_`.
- Team Lite: API `upstatus-team-lite`, updater GitHub team-lite-official; tópico Realtime beta10; namespace `upseller-team-lite`.
- TEST: updater `upstatus-test`, mas API beta10; tópico beta10; namespace `upseller` e prefixo GM igual ao Normal.

Os três clientes instalados não contêm `private:true` nem `realtime.setAuth()`.

### AUTH-03 instalado

Os runtimes Normal, Team Lite e TEST ainda permitem primeiro setup sem `setupToken`. O código implantado atribui role administrativa por fallback nominal para Ricardo, Lohan e Guilherme quando a role está vazia. A limpeza total do chat implantada autoriza pelo nome Ricardo, sem exigir role no handler atual.

Produção não tem colunas `setup_token_*`, RPC `consume_upstatus_setup_invite` nem RPC/tabela de rate limit de convites. O schema tem cinco usuários, zero hashes vazios, zero roles vazias e zero nomes duplicados atualmente; porém `users.name` não tem constraint UNIQUE, e a PK é `users.id`. `upstatus_sessions` e `upstatus_profiles` ainda são identificadas por `user_name`.

Não encontrei rate limit de tentativas de login nos handlers Normal, Team Lite ou TEST implantados. O rate limit de convite da candidata limita emissão, não tentativas de senha.

## Supabase — Realtime, PostgreSQL e Storage

### Realtime de produção

SELECT de `realtime.messages` nos últimos 14 dias retornou **103 broadcasts**, todos `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 69 `user_status`
- 26 `db_change`
- 4 `remote_command`
- 4 `remote_result`

Os três bundles instalados assinam `upstatus-screen-share-live-3-1-1-beta10`, não o tópico atual dos triggers.

Triggers confirmados:
- `messages`: `to_jsonb(OLD/NEW)` completo enviado como `db_change`.
- `upstatus_state`: envia campos selecionados de comando/resultado.
- `users`: envia nome, status, reason, updated_at e sync.

Todos chamam `realtime.send(..., false)`. `realtime.messages` tem RLS habilitado, FORCE RLS desabilitado, zero policies e SELECT/INSERT/UPDATE concedidos a anon/authenticated. Não houve teste de assinatura externa nem exploração; o setting Dashboard de acesso público não foi exposto pelo conector.

As três funções SECURITY DEFINER de broadcast têm `search_path=public`, EXECUTE amplo e retorno `trigger`. Como retornam trigger, não há evidência de RPC PostgREST comum invocável diretamente; o risco confirmado é o payload transmitido em broadcast público e os grants desnecessários.

### RLS, grants e Default ACLs

Produção:
- 10 tabelas públicas com RLS e zero policies.
- 9 tabelas públicas concedem sete privilégios a anon e authenticated, incluindo TRUNCATE: 18 concessões TRUNCATE no total.
- Default ACL: 60 entradas de privilégio para anon e 60 para authenticated, distribuídas por 15 objetos ACL de cada papel em schemas public/storage/GraphQL.
- Security Advisor: 6 WARN e 10 INFO.

Laboratório:
- 18 tabelas públicas com RLS e zero policies, mas sem grants diretos de tabela para anon/authenticated.
- RPCs `consume_upstatus_setup_invite`, `consume_upstatus_setup_invite_rate_limit`, `consume_upstatus_signal_rate_limit` e `merge_chat_read_receipts` são SECURITY INVOKER, `search_path` vazio e EXECUTE somente postgres/service_role.
- As três funções broadcast são SECURITY DEFINER, mas têm `search_path` vazio e EXECUTE somente postgres/service_role.
- Defaults de postgres em public estão restritos; defaults de storage/GraphQL e alguns defaults de supabase_admin ainda são amplos.
- Security Advisor: 0 WARN e 18 INFO. Performance Advisor: 5 índices não utilizados.

### Storage

Produção tem dois buckets públicos, 188 objetos e zero policies em `storage.objects`:
- `chat-images`: 168 objetos, 20 MiB, permite imagens, mídia e tipos de documentos.
- `profile-images`: 20 objetos, 20 MiB, permite imagens.

`supabase/config.toml` versionado declara chat 25 MB e perfil 2 MB. A configuração implantada é 20 MiB para ambos; o bucket chat também aceita documentos que não aparecem na allowlist versionada. Há drift de tamanho/MIME e nenhuma política própria de Storage. Laboratório não possui buckets nem objetos.

## Migrations e isolamento de TEST

- Ledger de produção: 7 migrations.
- Arquivos canônicos em master: 3.
- Quatro fontes ausentes em master:
  - `20261023154754_create_upstatus_visual_config`
  - `20261026195855_add_chat_message_file_name`
  - `20261027154329_allow_chat_document_mime_types`
  - `20261027155438_set_upstatus_upload_limits_20mb`
- Laboratório: 38 migrations.
- Branch gerenciada Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

Existem somente dois projetos Supabase: produção e laboratório de signaling/auth. Não existe projeto full-product TEST. O build guard da #161 usa sentinel inerte quando `UPSTATUS_TEST_PROJECT_ID` não está configurado e rejeita produção/laboratório como destino full TEST; isso é fail-closed, mas não cria o ambiente. Produção ainda tem 12 funções com prefixo `upstatus-test`.

### Workflows de deploy

- Workflow Normal da #161 fixa CLI 2.122.1 e valida branch master, SHA e projeto de produção. Porém a regra de versão descrita acima impede a nova versão.
- Workflow Team Lite oficial ainda executa `supabase functions deploy upstatus`, usa CLI `latest` e não verifica projeto/SHA. **Não despachar.**
- Workflow TEST oficial Team Lite usa `SUPABASE_PROJECT_ID` genérico e deploya `upstatus-test`, sem guard explícito que prove destino full-product TEST isolado. Não há evidência de que o secret atual aponte para produção, mas o workflow não falha fechado por projeto.

## Issues e aceitação

- Issue #78 permanece OPEN com 0/8 critérios físicos marcados. Não houve confirmação de reconexão física sem F5, microfone real ou compartilhamento instalado nesta execução.
- Issue #79 permanece OPEN; o checklist existente está em 16/35.
- Não encontrei reviews humanas nas seis PRs auditadas.

## Gates

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcast público, clientes beta10 vs tópico trigger, transporte privado não default |
| TEST-ISOLATION | blocked | Só produção + laboratório signaling/auth; sem full-product TEST |
| MIGRATION-PROVENANCE | blocked | Quatro fontes históricas ausentes; main MIGRATIONS_FAILED |
| AUTH-03 | blocked | Produção sem setup token/RPC/rate limit; login sem throttle; identidade por nome |
| ACL-STORAGE | blocked | RLS/policies, grants/TRUNCATE, Default ACLs e Storage públicos |
| RECONNECT | pending | 0/8 critérios físicos da #78 |
| HUMAN-REVIEW | pending | PRs Draft sem reviews/aprovação |

## Próximos passos recomendados

1. Atualizar versão Normal acima de 3.4.7 e corrigir o guard do workflow de produção antes de qualquer release.
2. Rebasear #162 sobre #161 HEAD 557814d e adicionar teste HTTP real contra a função isolada, não somente `Response` local.
3. Corrigir workflow Team Lite: slug `upstatus-team-lite`, projeto fixo, SHA exato, CLI pinada e preflight; adicionar guard explícito de TEST.
4. Provisionar um terceiro projeto full-product TEST somente após estimativa de custo/billing e autorização.
5. Tornar sinalização server-mediated privada/autenticada por padrão e remover listeners públicos sensíveis; alinhar tópico cliente/trigger.
6. Completar AUTH-03, adicionar rate limit de login, migrar sessões/perfis para `users.id` e impor unicidade de identidade.
7. Recuperar e validar as quatro migrations originais; não reconstruir SQL histórico por inferência.
8. Restringir grants/Default ACLs, revisar policies RLS e decidir Storage privado/limites/MIME.
9. Executar os oito testes físicos da #78 e obter aprovação humana do SHA final.

## Veredito

**NOT READY.** #161 é a melhor candidata Normal nesta rodada: Validate e Smoke passaram no mesmo HEAD. #76 mantém boa cobertura Team Lite. #162 tem contrato unitário aprovado, mas está desatualizada em relação à base e não comprova HTTP real. A produção ainda não recebeu AUTH-03 nem transporte privado/autenticado, e a cadeia de deploy Team Lite/Normal tem bloqueios.

Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/grants/policies/ACLs, nem teste manual. Todas as consultas SQL foram SELECT-only. A escrita GitHub desta execução limita-se a este relatório na branch QA e à atualização do comentário QA existente na Issue #79.
