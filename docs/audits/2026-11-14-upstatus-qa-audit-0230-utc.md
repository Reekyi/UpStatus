# Auditoria independente de qualidade — 2026-11-14 02:30 UTC

## Escopo e método

Revalidação read-only do repositório `Reekyi/UpStatus`, dos PRs #74, #75, #76, #82 e candidatas relacionadas #161, #163 e #164; Issues #78 e #79; workflows e logs do GitHub Actions; projetos, migrations, Edge Functions, advisors e catálogo PostgreSQL do Supabase.

Foi lido integralmente `docs/RELEASE_READINESS.md` na branch QA. Blob SHA `7cfbd70886df42ce790c078c224b19284a632595`, 1.045.105 caracteres e 8.410 linhas. O último checkpoint técnico dentro do documento é de 08/11/2026 às 18:30 UTC. O arquivo foi preservado.

Classificação usada:
- **CI PASS/FAIL:** resultado de workflow associado ao HEAD/merge ref informado.
- **CODE INSPECTION:** leitura de código, configuração ou catálogo; não equivale a teste de execução.
- **MANUAL PENDING:** exige navegador, dispositivo ou aceite humano.
- **BLOCKED:** dependência ou risco impede fechar o gate.
- **NOT VERIFIED:** não há evidência suficiente.

Nenhum teste manual foi realizado. Não houve rerun manual, alteração de produção, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/grants/policies ou operação destrutiva. Todas as consultas SQL foram SELECT-only.

## 1. Heads reais

| Referência | HEAD |
|---|---|
| master | `9d40461babcec8eb868c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `d7bf18bd8c73aa0799e8af8963f95443521e5e56` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 | `d7bf18bd8c73aa0799e8af8963f95443521e5e56` |
| PR #161 | `557814dc31bed779b84a2094358dc6b2a7e67689` |
| PR #163 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` |
| PR #164 | `a27ced56564f3d18948c70138f6d6b2a1f2d0907` |

A QA está 294 commits à frente e 1 atrás de master. A PR #82 aponta para o mesmo HEAD da QA e contém apenas documentação.

## 2. CI e workflows

| PR/linha | Evidência | Resultado | Limite |
|---|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | **PASS / PASS** | CI de candidato, não release instalado |
| #75 Team Lite baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico** | Head sem atualização recente |
| #76 Team Lite | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | **PASS** | CI isolado, não aceitação física |
| #82 QA | [Validate 43541643377](https://github.com/Reekyi/UpStatus/actions/runs/43541643377) | **FAIL** | Falha no HEAD atual |
| #161 Normal | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | **PASS / PASS** | Candidato Normal |
| #163 Voz | [Validate 43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143), [Contract 43488822237](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) | **PASS / PASS** | Contrato HTTP 409 offline; não é chamada à Edge Function implantada |
| #164 Upload | [Validate 43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) | **PASS** | Job executado no merge ref de PR contendo o head `a27ced5`; VM/mocks, sem upload real |

### #164 — resultado detalhado

O log do run 43544570609 fez checkout do merge ref `a53224d6af90af597d7fd39c9e75803f0c822720`, merge do head `a27ced5` sobre develop. O build reportou `3.0.40 / TEST 3.0.40-beta.22`. Passaram os testes do cliente e servidor de upload assinado, incluindo rota/bucket, MIME/tamanho, origem HTTPS, caminho, token de uso único, PUT e integração da UI.

A bateria server-side usa VM e Storage mockado. Não houve upload real no Storage nem teste contra Edge Function implantada.

### #82 — falha atual

O job 132283318279 fez checkout do merge ref `47513c948b3a19d0f3b7a71396dae3a250d5047b`, contendo o head atual `d7bf18b`. O build gerou `3.4.7 / TEST 3.4.7` e falhou em `scripts/validate.mjs:26`:

`VALIDATION FAILED: production updateURL mismatch`.

Não removi assertions e não executei rerun.

## 3. Upload de avatar: candidata #164 versus produção

### Candidata #164 — melhoria confirmada por inspeção e CI

A PR #164 tem base `develop`, está aberta/Draft, 30 commits e 5 arquivos alterados. Não altera a linha Team Lite.

O código candidato:
- Lê o corpo do avatar com limite de 3 MiB antes do parse JSON, rejeitando Content-Length excessivo e contando bytes do stream; cancela o reader quando o limite é excedido.
- Decodifica o Data URL e aplica limite de 2 MiB aos bytes reais.
- Detecta assinaturas JPEG/PNG/GIF/WebP e rejeita declaração de imagem sem assinatura reconhecida; o ramo MP4 `ftyp` não classifica mais o conteúdo como JPEG.
- Resolve um único `users.id` para o nome autenticado; nomes ausentes/ambíguos falham fechado.
- Deriva prefixo de objeto a partir do ID, verifica origem/bucket/caminho e exige propriedade do avatar antes de associar a URL ao perfil.
- Faz upload server-mediated com `upsert:false`; a rota antiga de upload assinado de avatar retorna HTTP 410.

Os testes incluem rejeição por Content-Length, limite de stream sem Content-Length, cancelamento do reader, aceitação exatamente no limite, tamanho real, identidade ambígua, propriedade cruzada e contrato de upload sem sobrescrita.

### Lacunas residuais da candidata

- A imagem é identificada por assinatura, mas não é decodificada e re-encodada por um decoder de imagem confiável. Não há limite de dimensões/pixels; arquivo truncado ou conteúdo poliglota com cabeçalho válido ainda merece defesa adicional.
- O harness atual não contém teste comportamental explícito para MP4 `ftyp` declarado como JPEG, embora o código tenha o ramo de rejeição.
- A identidade ainda é resolvida de `ctx.name` para `users.id`; sessões/perfis não foram migrados integralmente para `user_id`.
- O fluxo de anexos do chat permanece PUT direto com URL assinada. O servidor valida MIME e tamanho declarados, mas não inspeciona os bytes reais do objeto recebido.
- A PR é baseada em develop e não modifica `team-lite/upstatus-team-lite.user.js` nem `src/server/team-lite-index.template.ts`. Não há paridade Team Lite.
- Compatibilidade de rollout precisa ser planejada: os clientes instalados ainda chamam `/api/profile/avatar-upload-url`; a candidata desativa essa rota para avatar e espera o novo fluxo Data URL. Publicar backend antes de atualizar os clientes pode quebrar o salvamento de avatar dos clientes antigos.

## 4. Contrato de avatar nos runtimes instalados

Edge Functions de produção consultadas diretamente:
- `upstatus` v480.
- `upstatus-team-lite` v15.
- `upstatus-test` v281.
- `upstatus-screen-share-3-1-1-beta10` v6.

O userscript Normal em master e o Team Lite em `team-lite-official` usam o mesmo fluxo antigo: solicitam `/api/profile/avatar-upload-url`, enviam PUT direto ao Storage e depois fazem POST em `/api/profile/avatar` com `avatarUrl`.

**Normal v480:** `profileRoute` só processa `p.dataUrl` e não aceita `avatarUrl`; a rota de autorização ainda permite avatar assinado com limite declarado de até 20 MiB. O cliente e o backend têm contrato incompatível: o PUT pode ocorrer, mas a gravação do perfil não segue o campo enviado pelo cliente.

**Team Lite v15:** `profileRoute` aceita qualquer URL que comece pelo prefixo público do bucket `profile-images`, sem conferir o prefixo de propriedade derivado de `users.id`. Isso permite potencialmente associar ao perfil uma URL de avatar de outra conta.

Os buckets implantados têm limite de 20 MiB; a checagem de 2 MiB no cliente não substitui enforcement no servidor. A correção #164 ainda não está integrada nem implantada em nenhum dos runtimes.

## 5. AUTH-03 e identidade

Inspeção direta dos handlers instalados:
- Normal v480 exige senha mínima de 6 caracteres; Team Lite v15 exige 4.
- `POST /api/setup` permite definir a primeira senha quando `password_hash` está vazio; não há token de convite único no handler.
- Não foi encontrado rate limit de tentativas de login nos handlers.
- A role vazia ainda recebe fallback nominal para Ricardo/Lohan/Guilherme no setup.
- Sessões são gravadas/lidas por `user_name`; não há `user_id` no fluxo de sessão.
- `/api/account?name=` expõe `needsSetup` por nome.

A candidata #161 e a #76 incluem melhorias de convite e rate limit de emissão de convites, mas isso não equivale a rate limit de tentativas de senha e não está implantado em produção.

## 6. Realtime e funções SECURITY DEFINER

Consultas read-only de catálogo e definições atuais confirmaram:
- `realtime.messages`: RLS ligado, FORCE RLS desligado, zero policies; anon/authenticated têm SELECT e INSERT efetivos.
- As três funções trigger `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, `search_path=public`, e ACL inclui PUBLIC, anon e authenticated.
- `upstatus_broadcast_messages` envia `to_jsonb(OLD/NEW)` completo em `db_change`.
- `upstatus_broadcast_remote_state` envia campos de comando e resultado em `remote_command` e `remote_result`.
- `upstatus_broadcast_users` envia nome, status, motivo, updated_at e sync em `user_status`.
- Os três broadcasts usam `private=false` e tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Os clientes instalados continuam assinando o tópico beta10 `upstatus-screen-share-live-3-1-1-beta10`; tópico dos triggers e tópico do cliente não coincidem.

O Security Advisor de produção retorna 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated sobre SECURITY DEFINER. As funções retornam `trigger` e estão anexadas a triggers; não foi demonstrada execução RPC direta nesta auditoria. O risco concreto confirmado é a publicação pública dos payloads e os privilégios EXECUTE desnecessários.

## 7. RLS, grants, Default ACL e Storage

Snapshot SQL de produção:
- 10 tabelas public com RLS e sem policies.
- 9 tabelas public concedem 7 tipos de privilégio a anon e authenticated: 63 linhas de grants por papel, 126 no total.
- 120 entradas Default ACL para anon/authenticated distribuídas entre postgres e supabase_admin nos schemas public, storage e GraphQL.
- Zero policies em `public`, `realtime` e `storage` no catálogo consultado.
- Buckets `chat-images` e `profile-images` são públicos (leitura pública), limite de 20 MiB cada, com 168 e 20 objetos respectivamente.

A ausência de policies em bucket público não significa, por si só, upload anônimo irrestrito; o bucket público habilita leitura pública, enquanto upload depende de grants/policies ou de capacidade assinada. A política de privacidade e a validação de conteúdo dos anexos continuam pendentes.

## 8. Projetos, migrations e Edge Functions

A organização contém dois projetos:
- Produção `dlfvkawaiqduhlazsszm`, ACTIVE_HEALTHY.
- `upstatus-security-test` `bfpjtfqlnypisxljoxkb`, ACTIVE_HEALTHY.

O projeto de teste não tem buckets Storage; é laboratório de signaling/auth, não Full-Product TEST. Não há terceiro projeto isolado.

Migrations:
- Produção: 7 no ledger.
- Laboratório: 39 no ledger.
- `master/supabase/migrations`: 3 arquivos SQL canônicos.
- Quatro migrations do ledger de produção não têm fonte SQL correspondente no diretório canônico.
- Branch Supabase `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.

Produção lista 38 Edge Functions ACTIVE. Não há função server-mediated `upstatus-signal` em produção. O laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. `verify_jwt=false` nas funções de produção é configuração de gateway; os handlers fazem autenticação própria por token, portanto a revisão precisa continuar sendo por rota.

## 9. Issues, reviews e aceitação física

- Issue #78 permanece OPEN com 0/8 critérios de aceite marcados; comentários recentes disponíveis não registram confirmação física mais nova. Reconexão Normal/Team Lite sem F5, reentrada, novas chamadas, microfone/tela reais e interoperabilidade instalada continuam MANUAL PENDING.
- Issue #79 permanece OPEN, 16 itens marcados e 19 pendentes.
- PRs #74, #75, #76, #82 e #164 continuam abertas, Draft e unmerged.
- Não há reviews formais registradas nas PRs #74, #75, #76, #82 e #164.

## 10. Veredito

**NOT READY.**

Prioridades:
1. Corrigir o Validate da QA no updateURL sem enfraquecer o validator.
2. Planejar migração de avatar compatível com clientes antigos; portar a proteção para Team Lite.
3. Acrescentar decoder/re-encode e limite de dimensões/pixels para avatar; validar anexos do chat no servidor.
4. Concluir AUTH-03 com convite único, rate limit de login e identidade por user_id.
5. Tornar Realtime privado/autenticado, remover full-row broadcasts e alinhar tópico/cliente com plano de cutover/rollback.
6. Corrigir grants, Default ACL, SECURITY DEFINER e decidir a política de Storage.
7. Criar Full-Product TEST independente e recuperar as quatro fontes SQL ausentes.
8. Corrigir workflow Team Lite e reconciliar versionamento Normal.
9. Executar os oito testes físicos da #78 e obter review/aprovação humana.

Nenhuma escrita SQL, migration, deploy, merge, release, publicação, alteração de secrets/flags ou operação destrutiva ocorreu. Todas as consultas SQL foram SELECT-only. A única escrita desta rodada é este relatório documental novo na branch QA; o documento RELEASE_READINESS original foi preservado.
