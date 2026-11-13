# Auditoria independente UpStatus QA — 2026-11-13 16:28 UTC

## Escopo e método

Auditoria read-only de `Reekyi/UpStatus` e dos projetos Supabase `dlfvkawaiqduhlazsszm` (produção) e `bfpjtfqlnypisxljoxkb` (laboratório). Foram revalidados refs e PRs #74, #75, #76, #82, #161 e #162; logs CI existentes; Issues #78/#79; artefatos userscript embutidos nas Edge Functions; migrations, RLS, grants, Default ACL, SECURITY DEFINER, Realtime, Storage, Edge Functions e Security Advisor.

**Vocabulário:** AUTOMATED PASS = workflow existente aprovado no SHA citado; CODE INSPECTION = inspeção estática/catálogo, não teste de execução; MANUAL PENDING = depende de navegador/dispositivo/humano; BLOCKED = dependência ou falha confirmada; NOT VERIFIED = sem evidência suficiente.

**Limites:** nenhum workflow foi disparado ou repetido. Não executei testes locais, chamadas HTTP funcionais, navegador/Tampermonkey, microfone, captura de tela ou queda física de rede. Os resultados CI abaixo são logs existentes. Todas as consultas SQL foram SELECT-only. A escrita desta execução limita-se a este relatório novo na branch QA e à atualização do comentário QA existente na Issue #79.

## 1. Heads e integridade documental

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `386d22dc7536a88f52c8acfe5df18d4a9ffd818c` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 | `386d22dc7536a88f52c8acfe5df18d4a9ffd818c` |
| PR #161 | `ae6a5f3053b160f6f5235b68cc94ff1a9fb8984e` |
| PR #162 | `fa8c9fa1fc91a238fca65fb46f31d078288e7f36` |

A QA está 283 commits à frente e 1 atrás de master. A comparação confirma que o diff QA/master contém somente documentação; não houve rebase nem incorporação automática do commit de master.

O arquivo `docs/RELEASE_READINESS.md` foi reaberto pelo blob completo: 8.410 linhas, 1.045.105 bytes, blob `7cfbd70886df42ce790c078c224b19284a632595`. O último checkpoint técnico dentro dele continua em **2026-11-08 18:30 UTC**. O arquivo foi preservado.

Proteção de branch: a API informa `master` e `team-lite-official` sem proteção e sem required checks. A leitura de proteção da QA retornou 403 (não verificável pela integração); não inferir que está protegida.

As PRs consultadas permanecem abertas, Draft e não mescladas. Não encontrei reviews nas PRs #74, #161 e #162. Os históricos são grandes: #74 887 commits/90 arquivos; #75 59/10; #76 386/57; #82 283/140; #161 11/10; #162 8/7. Contagem de commits não equivale a mudança funcional independente; ancestry e diff final precisam ser revisados antes de integrar.

## 2. CI: resultados e lacunas de encadeamento

### PR #74 — Normal

- Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): SUCCESS no HEAD #74.
- Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS no HEAD #74.
- Logs: 19/19 verificações não autenticadas e 136/136 autenticadas; Chromium entregou áudio de chamada, áudio de sala e vídeo de tela; mesh de três participantes, teardown e limpeza das fixtures passaram.
- O teste de consumo atômico de setup invite passou. **Dois passos ficaram SKIPPED:** sintaxe do harness de rate limit de emissão e teste distribuído de rate limit de setup-invite. O Smoke da #74 não prova essa cobertura adicional.

### PR #76 — Team Lite

- Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881): SUCCESS no HEAD #76.
- Logs: 16/16 não autenticadas; 11/11 contratos HTTP isolados; 110/110 integração autenticada; Chromium validou chamada, voz, tela, mesh de três participantes, teardown e limpeza.
- Passaram rate limit distribuído, consumo único de convite, rate limit de emissão de convites, updater, manifest/version 3.4.31 e cenários de recuperação de voz/realtime do candidato.
- Isso é CI em projeto isolado, não aceitação física Tampermonkey.

### PR #161 — Normal consolidado

- Smoke [43430030814](https://github.com/Reekyi/UpStatus/actions/runs/43430030814): SUCCESS. Logs: 19/19 não autenticadas e 136/136 autenticadas; etapa `Validate complete Normal and TEST build` passou dentro do Smoke; testes de convite único e rate limit distribuído passaram.
- **Lacuna de CI:** não há run dedicado `UpStatus Validate` associado ao HEAD #161 na consulta de workflow runs. O `validate.yml` da branch tem `pull_request.branches: [master, develop, fix/normal-api-target-aligned-rate-limit-20261113]`, mas a base real da #161 é `chore/continuity-foundation`. O filtro `pull_request.branches` filtra a branch-base, não o nome da branch head; portanto esse check dedicado não corresponde à base da PR. O Smoke compensa parcialmente porque executa Validate completo, mas o check independente/requerido não está encadeado corretamente.

### PR #162 — contrato HTTP da voz

- Validate [43459219365](https://github.com/Reekyi/UpStatus/actions/runs/43459219365): SUCCESS.
- Voice Open HTTP Status Contract [43459218841](https://github.com/Reekyi/UpStatus/actions/runs/43459218841): SUCCESS.
- Comparação de refs: a base atual #161 (`ae6a5f3`) avançou um commit em relação à base usada por #162 (`a1d8dc8`). A #162 está 1 commit atrás e divergiu do HEAD atual da #161. Atualizar a pilha e revalidar antes de tratar os checks como evidência do stack atual.
- O teste é offline: constrói objetos `Response` locais e verifica o helper usado pela rota; não chama a Edge Function implantada por HTTP real. O laboratório continua com `upstatus-signal-test` v32, sem o módulo candidato `voice-status.mjs`.

### PR #82 — QA documental

- Validate [43454515302](https://github.com/Reekyi/UpStatus/actions/runs/43454515302): FAILURE no HEAD QA.
- Log exato: build `3.4.7 / TEST 3.4.7`, seguido de `VALIDATION FAILED: production updateURL mismatch`.
- O diff da #82 é documental. A falha é herdada do contrato/validator do baseline; não atribuir a falha ao Markdown. Nenhum rerun foi iniciado.

## 3. Runtimes instalados e compatibilidade Normal/Team Lite

Extraí os userscripts embutidos nas funções implantadas:

| Runtime | Função | Versão do userscript | Namespace | API |
|---|---|---:|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` | `upstatus-screen-share-3-1-1-beta10` |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` | `upstatus-team-lite` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` | beta10 de produção |

Diferenças confirmadas no código implantado:
- Normal rejeita login com menos de 6 caracteres; Team Lite e TEST aceitam 4. Uma conta criada pelo Team Lite com senha de 4–5 caracteres pode não autenticar no Normal.
- Os três handlers ainda encaminham `POST /api/setup` para `login(req, true)` sem exigir `setupToken`/convite de uso único.
- Os bundles instalados ainda mantêm autorização nominal legada em ações administrativas, incluindo limpeza de chat por comparação do nome Ricardo.
- `users` tem somente PK `id`; não há UNIQUE para `name`. `upstatus_sessions` e `upstatus_profiles` armazenam `user_name`, sem `user_id`.

A #161/#76 alinham a regra candidata de login (mínimo 4; setup mínimo 6), implementam convite único e reforçam autorização por papel/identidade. Essas correções ainda não estão nos runtimes implantados. Não foi demonstrado que uma conta atual esteja sem senha/role; o achado é estrutural, no fluxo futuro.

O TEST continua compartilhando namespace `upseller` e prefixo GM com Normal, e sua API aponta para beta10 de produção. Seu updater próprio não isola o backend. Há somente dois projetos Supabase; o laboratório não é full-product TEST.

## 4. Supabase: projetos, Edge Functions e migrations

- Projetos: produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`; ambos ACTIVE_HEALTHY. Não existe terceiro projeto full-product TEST.
- Produção: 7 migrations aplicadas; 38 Edge Functions ACTIVE. Há 12 funções com prefixo `upstatus-test` no projeto de produção. `upstatus-signal` não existe em produção.
- Laboratório: 39 migrations; `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- A branch Supabase gerenciada `main` continua `MIGRATIONS_FAILED`, com preview `ACTIVE_HEALTHY`.
- Master contém somente três SQLs em `supabase/migrations`, enquanto o ledger de produção tem sete entradas. Quatro fontes SQL históricas continuam sem arquivo canônico recuperado/validado.

## 5. Realtime e sinalização

Snapshot read-only da tabela `realtime.messages`, últimos 14 dias: **97 mensagens, todas `private=false`**, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- `user_status`: 65
- `db_change`: 26
- `remote_command`: 3
- `remote_result`: 3

Os bundles Normal/Team Lite instalados assinam `upstatus-screen-share-live-3-1-1-beta10`, diferente do tópico dos triggers. O bundle Normal instalado não contém `private:true` nem `realtime.setAuth()`; seu listener público `remote_command` ainda chama `executeRemoteCommand` com o comando do payload. Team Lite também recebe broadcast público; checagem da sessão local não autentica o emissor.

Catálogo de `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies, sete partições diretas; anon/authenticated têm SELECT e INSERT. Não foi realizada exploração externa nem envio de broadcast de teste.

Três funções `upstatus_broadcast_*` continuam SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role e retorno `trigger`. Por retornarem trigger, não há evidência de invocação direta como RPC PostgREST comum; os grants amplos continuam desnecessários e o payload público dos triggers é o risco concreto. Não existe função de sinalização autenticada `upstatus-signal` em produção; o transporte seguro permanece apenas no laboratório/candidatas e não deve ser habilitado por flag.

## 6. RLS, grants, Default ACL e Storage

Produção:
- 10 tabelas public com RLS e zero policies.
- Nove tabelas backend-owned concedem a anon e authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER: 9 grants TRUNCATE por papel, 18 no total.
- RLS sem policies bloqueia acesso por linha, mas não protege TRUNCATE. Nenhuma tentativa de TRUNCATE foi feita.
- Default ACLs seguem amplas para objetos de postgres/supabase_admin em public, storage e schemas GraphQL.
- Buckets `chat-images` e `profile-images` são públicos, 20 MiB cada, com 168 e 20 objetos; zero policies próprias em `storage.objects`. O bucket de chat permite tipos de documento. A configuração versionada e os limites implantados precisam ser reconciliados.

Security Advisor de produção, observado em 16:26 UTC: 10 INFO de RLS sem policy; 3 WARN para anon e 3 WARN para authenticated, referentes às três funções SECURITY DEFINER. O Advisor do laboratório reporta 18 INFO de RLS sem policy e nenhum WARN de SECURITY DEFINER.

## 7. Issues e aceitação manual

- Issue #78 permanece OPEN, **0/8 critérios físicos**. Os critérios de queda real de rede, reconexão sem F5, reentrada em sala, nova chamada, áudio sem duplicação, peers/pollers limpos, participantes remanescentes e teste manual seguem pendentes.
- Issue #79 permanece OPEN. O comentário QA dedicado foi atualizado no lugar; o comentário da Engenharia foi preservado.
- CI Chromium/Playwright usa projeto isolado, stubs e fixtures temporárias. Não equivale a Tampermonkey instalado com permissões reais de microfone/tela ou a queda física de internet.

## 8. Gates e recomendação

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 97 broadcasts private=false; tópico dos triggers diverge do cliente |
| TEST-ISOLATION | BLOCKED | apenas dois projetos; TEST aponta para API de produção |
| MIGRATION-PROVENANCE | BLOCKED | 7 migrations no ledger, 3 SQLs canônicos em master |
| AUTH-03 | BLOCKED | setup sem token nos runtimes; zero colunas setup_token em produção |
| ACL-STORAGE | BLOCKED | grants/Default ACL amplos, SECURITY DEFINER, buckets públicos sem policies |
| RECONNECT | PENDING | Issue #78 0/8; nenhum teste físico nesta rodada |
| HUMAN-REVIEW | PENDING | PRs principais Draft; sem review/aprovação da QA nesta rodada |

**Recomendação: NOT READY.** Prioridades: (1) corrigir filtro de Validate da #161 para a base real e obter check dedicado no SHA; (2) atualizar #162 sobre HEAD atual da #161 e validar contrato HTTP com chamada real no laboratório; (3) provisionar ambiente full-product TEST independente antes de substituir o runtime legado; (4) tornar sinalização privada/autenticada por padrão e remover fallback público de voz/tela; (5) implantar AUTH-03 e migrar identidade para `users.id`; (6) corrigir workflow Team Lite para slug correto, CLI pinada e preflight; (7) endurecer grants/Default ACL/Storage e recuperar os quatro SQLs; (8) executar os oito testes físicos e obter aprovação humana explícita.

Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou fixture foi realizada. A única escrita no repositório é este arquivo novo na branch QA.


## Adendo de revalidação após o commit documental

Após a criação deste relatório, a branch QA avançou para `c8e3c6f144969d0371845eb1acb51c4e49652716`, que também é o novo HEAD da PR #82. O GitHub executou automaticamente o Validate [43463260387](https://github.com/Reekyi/UpStatus/actions/runs/43463260387) nesse novo SHA; o job falhou novamente com o mesmo erro: `VALIDATION FAILED: production updateURL mismatch` (após construir `3.4.7 / TEST 3.4.7`). Portanto, a falha foi confirmada também no HEAD documental final, não apenas no HEAD anterior `386d22d`. Nenhum validator foi alterado e nenhum rerun foi iniciado.
