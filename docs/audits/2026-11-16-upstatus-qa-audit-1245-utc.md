# Auditoria independente UpStatus — 2026-11-16 12:45 UTC

**Execução:** 2026-11-16T12:44:44.318Z  
**Escopo:** GitHub `Reekyi/UpStatus`, Supabase produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.  
**Método:** inspeção read-only de refs, PRs, commits, workflows, logs Edge, catálogo PostgreSQL, migrations e código-fonte implantado/candidato. Não foram iniciados testes nem workflows pela QA.

## 1. Heads reais e integridade

| Ref | HEAD observado |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| develop | `6b33e1e` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| QA | `ea4a9150b071fad4eb826c01bb345ff14fc3615d` antes deste relatório |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `00a578e9174e08238a1289a35feb02d171625421` |
| PR #82 | `ea4a9150b071fad4eb826c01bb345ff14fc3615d` |

- QA/#82 está 366 commits à frente e 1 atrás de master antes deste relatório; o commit master-only é documental. Não fiz rebase.
- #74 está 887 commits à frente e 1 atrás de master, com 90 arquivos alterados.
- #75 está 59 commits à frente de team-lite-official. #76 está 389 à frente, com 59 arquivos; #76 é a linha candidata atual, não uma entrega independente de #75.
- #82 é documental: 206 arquivos e 50.857 linhas adicionadas.
- #74, #75, #76 e #82 continuam abertas/Draft. Não há reviews humanas registradas nessas quatro PRs.

## 2. PRs e CI nos HEADs observados

| PR | Evidência CI | Classificação QA |
|---|---|---|
| #74 Normal | Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e Signaling Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS no HEAD `dcaf6a0` | **CI PASS**. Smoke: 136/136 checks autenticados, 19/19 não autenticados e WebRTC de chamada/voz/tela em Chromium. O passo de rate limit de emissão de convite foi skipped. Não é aceite físico. |
| #75 Team Lite | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS | **PASS histórico** no HEAD antigo; não representa a candidata atual. |
| #76 Team Lite | [43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): FAILURE no HEAD `00a578e` | Job `signed-upload-contracts` **PASS**; `candidate-checks` **FAIL/BLOCKED** no teste de autenticação do endpoint isolado: `/health` retornou 402 em vez de 200. Os testes autenticados, browser e integração posteriores foram skipped. |
| #82 QA | [43859007405](https://github.com/Reekyi/UpStatus/actions/runs/43859007405): FAILURE | Falha herdada de `production updateURL mismatch` em `scripts/validate.mjs`; não é falha do conteúdo documental. |

### Upload assinado Team Lite

O commit [3b4385c](https://github.com/Reekyi/UpStatus/commit/3b4385c088285e14a4ad4c4b4f229b18e77023b2), já ancestral do HEAD atual de #76, endurece a validação de origem HTTPS, rota, bucket, caminho, token, MIME e tamanho seguro; o cliente usa PUT sem credenciais e sem seguir redirecionamentos. Os contratos offline de servidor e cliente passaram no job separado. São testes VM/mocks: **não houve PUT real ao Storage** e a integração completa continua bloqueada pelo 402.

### Compatibilidade AUTH-03 nos candidatos

- Os templates Normal #74 e Team Lite #76 implementam setupToken e consumo da RPC `consume_upstatus_setup_invite`.
- Team Lite também chama a RPC de rate limit de emissão de convites; o template Normal não contém essa chamada e o teste correspondente no Smoke #74 foi skipped.
- Ambos os templates candidatos usam mínimo de 6 caracteres no primeiro acesso e 4 no login. Os runtimes implantados ainda diferem.
- Os candidatos exigem papel administrativo persistido para limpar o chat; isso não está implantado em produção.

## 3. Workflows e publicação

- `master/.github/workflows/deploy-test.yml`: manual, usa `SUPABASE_PROJECT_ID` genérico e CLI `latest`; publica `upstatus-test` no projeto configurado, que hoje é o projeto de produção.
- `develop/.github/workflows/deploy-test.yml`: inclui push em develop, usa o mesmo secret genérico e CLI `latest`.
- A candidata #74 adiciona `UPSTATUS_TEST_PROJECT_ID`, rejeita produção e o laboratório de sinalização e fixa a CLI. É um guard correto, mas não existe projeto Full-Product TEST separado para satisfazê-lo.
- `team-lite-official/.github/workflows/deploy-production.yml` continua publicando o slug `upstatus`, não `upstatus-team-lite`; usa secret genérico e CLI `latest`, sem guard de projeto/SHA/preflight. #76 não altera esse workflow. **Não despachar.**
- O build de master direciona o API base Normal para beta10 e gera updateURL beta10, enquanto `release.json` e o validator exigem `/upstatus/upstatus.user.js`. A candidata #74 usa `release.scriptUrl` e valida o destino exato; essa correção ainda não está em master.
- A publicação Normal candidata #74 não coordena, por si só, o rollout de beta10, Team Lite e TEST.

## 4. Supabase, Edge Functions e HTTP 402

Há somente dois projetos na organização; ambos estão ACTIVE_HEALTHY:

- Produção: `dlfvkawaiqduhlazsszm`.
- Laboratório de segurança/sinalização: `bfpjtfqlnypisxljoxkb`. Não é um Full-Product TEST; contém apenas duas Edge Functions de teste e não possui fixtures/buckets de produto.

Produção: 38/38 Edge Functions ACTIVE e todas com `verify_jwt=false`. Funções operacionais: `upstatus` v480 (Normal 3.4.7), `upstatus-screen-share-3-1-1-beta10` v6, `upstatus-team-lite` v15 (Team Lite 3.4.30) e `upstatus-test` v281 (3.3.28). `verify_jwt=false` não prova acesso anônimo efetivo; os handlers também fazem autenticação própria.

### Falha de disponibilidade observada

**Produção:** 9.044 respostas HTTP 402 em seis rotas de `upstatus-screen-share-3-1-1-beta10`, de 11:41:55Z a 12:42:00Z:
- `/api/chat`: 4.788
- `/api/status`: 2.105
- `/api/remote-status`: 2.104
- `/api/account`: 25
- `/api/members`: 11
- `/api/me`: 11

O userscript Normal 3.4.7 implantado aponta o API base para beta10, embora seu updateURL aponte para a função `upstatus`. Portanto, as rotas centrais do Normal estão dependentes do endpoint que apresenta 402. A agregação não mostrou chamadas `/api/login` ou `/api/setup`; não afirmo que o POST de login em si foi observado falhando.

**Laboratório:** 44 respostas HTTP 402 em 14 rotas de `upstatus-signal-test`, de 12:37:25Z a 12:41:42Z, incluindo `/health`, autenticação, criação de sala e até uma rota inexistente. O CI #76 falhou porque o health endpoint respondeu 402 em vez de 200; as respostas seguintes também foram 402 em vez de 401/405.

Os dois projetos estão ACTIVE_HEALTHY. A função implantada inspecionada não contém status 402 literal. O padrão em dois projetos e funções diferentes aponta fortemente para bloqueio/limite compartilhado de invocações Edge ou controle de plataforma/entitlement. **A causa exata não foi confirmada**: a integração read-only não expõe o painel de consumo/limites/faturamento. Não atribuir automaticamente a cobrança, quota específica ou atualização de código.

### Drift de artefatos

- A função beta10 v6 contém userscript com metadata `3.1.1-beta8` e updateURL/downloadURL para o slug beta8, apesar do slug implantado ser beta10.
- Normal 3.4.7 usa API base beta10; Team Lite 3.4.30 usa API base `upstatus-team-lite`.
- Não há evidência de que o 402 seja causado por esse drift; é um achado adicional de versionamento.

## 5. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

- `realtime.messages`: RLS=true, FORCE RLS=false, zero policies, sete partições diretas.
- Anon/authenticated têm SELECT, INSERT e UPDATE.
- O snapshot atual contém 106 mensagens, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Três funções trigger são SECURITY DEFINER com `search_path=public` e EXECUTE amplo. `upstatus_broadcast_messages` envia OLD/NEW completo via `to_jsonb`; os triggers de estado remoto e usuários também emitem payloads públicos.
- Os clientes implantados Normal e Team Lite assinam `upstatus-screen-share-live-3-1-1-beta10`, diferente do tópico dos triggers. Ambos mantêm `signalTransportFlag=false` por padrão; não usam canal privado nem `realtime.setAuth()`. O transporte autenticado candidato ainda é opt-in.

### Banco e Storage

- Dez tabelas em public têm RLS habilitado e zero policies; nove ainda concedem privilégios diretos a anon/authenticated.
- Três funções SECURITY DEFINER foram encontradas em public/realtime, com `search_path=public` e grants EXECUTE amplos. As três são funções trigger; o risco confirmado é o broadcast público, não uma chamada RPC direta demonstrada.
- `storage.objects`: RLS=true, zero policies próprias. Anon e authenticated têm INSERT/SELECT/UPDATE/DELETE.
- Buckets `chat-images` e `profile-images` continuam públicos, com limite de 20 MiB.

## 6. Migrations e AUTH-03 implantado

- Ledger de produção: 7 migrations. A pasta `supabase/migrations` de master contém somente 3 arquivos.
- Quatro fontes originais ausentes (404 em master e QA):
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`
- Laboratório: 39 migrations. Branch gerenciada `main` da produção: MIGRATIONS_FAILED; `preview_project_status` está ACTIVE_HEALTHY. A causa da falha da branch não foi diagnosticada.
- Produção não tem colunas `setup_token_*` nem RPC `consume_upstatus_setup_invite`.
- Os runtimes Normal/Team Lite implantados ainda aceitam `POST /api/setup` sem setupToken obrigatório, têm fallback de papel baseado em nomes quando role está vazio e autorizam `/api/chat/clear` pelo nome Ricardo. Normal exige 6 caracteres e Team Lite 4 no runtime atual. AUTH-03 não está implantado.

## 7. Issues, aceitação manual e gates

- Issue #78 permanece OPEN, 0/8 critérios físicos marcados. Não houve teste físico Tampermonkey/Sale Smartly com perda de internet, retorno sem F5, microfone/tela reais ou interoperabilidade instalada.
- Issue #79 permanece OPEN, 16/35 itens marcados. O comentário QA dedicado `<!-- UPCONTROL:QA -->` foi atualizado in-place (comentário 6744331652); o comentário da Engenharia não foi alterado.
- Não há reviews humanas nas PRs #74, #75, #76 e #82.

| Gate | Estado | Evidência/razão |
|---|---|---|
| RT-01 | blocked | Realtime público, sem policies; transporte autenticado opt-in e tópico divergente |
| TEST-ISOLATION | blocked | Só produção e laboratório de sinalização; ambos com HTTP 402 |
| MIGRATION-PROVENANCE | blocked | Quatro SQLs ausentes; branch gerenciada main MIGRATIONS_FAILED |
| AUTH-03 | blocked | Runtimes implantados ainda usam setup legado e autorização nominal |
| ACL-STORAGE | blocked | Grants amplos, buckets públicos, zero policies Storage |
| RECONNECT | pending | Issue #78 0/8; depende de teste físico e confirmação |
| HUMAN-REVIEW | pending | Nenhuma review/aprovação humana registrada |

Após o commit deste relatório, a QA branch passou para `d53b5b4` (367 commits à frente e 1 atrás de master); a PR #82 passou a 207 arquivos e 51.002 adições. O Validate automático [43869372350](https://github.com/Reekyi/UpStatus/actions/runs/43869372350) repetiu a falha herdada `production updateURL mismatch` no commit documental desta auditoria.\n\n## 8. Próximos passos

1. O proprietário do projeto isolado deve restaurar as Edge Functions ajustando o plano ou removendo o spend cap; em seguida, confirmar se a mesma restrição afeta produção.
2. Após a restauração do laboratório, repetir Candidate Checks #76 no HEAD atual e executar os testes autenticados/browser; manter o job offline de upload como evidência separada.
3. Provisionar um projeto Full-Product TEST dedicado e corrigir os guards/workflows de master e develop.
4. Recuperar os quatro SQLs originais de artefatos/backup; não reconstruir migrations por inferência.
5. Tornar Realtime privado/autorizado por padrão, alinhar tópicos, revisar SECURITY DEFINER, grants, default ACLs e Storage.
6. Integrar e aplicar AUTH-03 somente após revisão e autorização explícita.
7. Executar os oito critérios físicos da #78 e obter aprovação humana antes de release.

## Veredito

**NOT READY.** Não recomendar merge, deploy, release ou publicação de userscripts.

Nenhum teste foi executado pela QA nesta rodada; foram inspecionados resultados de CI já existentes. Nenhuma migration, escrita SQL, alteração de produção, deploy, merge, release, publicação, secret, flag, role, grant, policy, ACL ou fixture foi realizada. Todas as consultas Supabase foram SELECT/catalog-only. A única escrita desta execução é este relatório na branch QA e a atualização do comentário QA existente na Issue #79.
