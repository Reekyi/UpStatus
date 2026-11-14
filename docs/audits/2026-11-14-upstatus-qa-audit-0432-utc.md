# Auditoria independente de qualidade — UpStatus

**Execução:** 2026-11-14 04:32 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Recomendação:** **NOT READY**

## 1. Escopo, heads e limites

Li integralmente `docs/RELEASE_READINESS.md` na branch QA: blob `7cfbd70886df42ce790c078c224b19284a632595`, 1.045.105 caracteres e 8.410 linhas. O último registro datado no documento é de **08/11/2026 às 15:30**; portanto, ele não representa sozinho o estado observado em 14/11. O arquivo foi preservado.

Heads consultados diretamente no GitHub:

| Branch | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `32cfdda8bbd3d4424e335f667d34af71b4b75a4e` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` |

Comparações atuais: QA está **296 commits à frente e 1 atrás** de master; a candidata Team Lite #76 está **386 à frente e 0 atrás** de `team-lite-official`; #76 está 327 commits à frente da baseline #75.

Nenhuma execução local de testes, navegador ou Tampermonkey foi realizada. Os resultados de CI abaixo foram inspecionados nos logs dos jobs; não foram rerunados nesta auditoria. SQL no Supabase foi somente SELECT/catálogo.

## 2. PRs, commits e reviews

| PR | HEAD | Base | Estado observado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a0` | master | Open/Draft; 887 commits, 90 arquivos |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b9` | team-lite-official | Open/Draft; 59 commits, 10 arquivos |
| [#76 Team Lite signaling](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4` | team-lite-official | Open/Draft; 386 commits, 57 arquivos |
| [#82 QA documental](https://github.com/Reekyi/UpStatus/pull/82) | `32cfdda` | master | Open/Draft; 296 commits, 152 arquivos |
| [#161 Normal API/auth](https://github.com/Reekyi/UpStatus/pull/161) | `557814d` | #74 | Open/Draft |
| [#163 contrato de voz](https://github.com/Reekyi/UpStatus/pull/163) | `00f357b` | #161 | Open/Draft |
| [#164 upload/avatar](https://github.com/Reekyi/UpStatus/pull/164) | `a27ced5` | develop | Open/Draft; 30 commits, 5 arquivos |

As sete PRs consultadas (#74, #75, #76, #82, #161, #163 e #164) não têm reviews humanas registradas. #82 altera somente arquivos em `docs/`; não modifica runtime, workflows ou migrations.

## 3. CI: resultados por HEAD

### Normal #74 — PASS

No HEAD `dcaf6a0`:
- [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) SUCCESS.
- [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) SUCCESS.
- Logs: 19/19 checks não autenticados e 136/136 autenticados.
- Chromium confirmou negociação WebRTC e entrega de áudio remoto em chamada e voz, vídeo remoto em compartilhamento de tela, mesh de três participantes e teardown.
- Rate limit distribuído: 90 aceitas e 1 rejeitada com HTTP 429 / Retry-After 60s.
- Fixtures temporárias foram limpas.

### Team Lite #75 e #76

- #75: [Candidate Checks histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS no HEAD `7bbf9b9`; serve como baseline, não como candidato atual.
- #76: [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) SUCCESS no HEAD `83a6cc4`.
- Logs #76: 11/11 contratos HTTP isolados, 16/16 checks não autenticados e 110/110 autenticados.
- A candidata reporta versão 3.4.31, valida sintaxe/manifesto, portais Lucca/Ycaro, isolamento de sessão e executa Playwright/Chromium com stubs de Tampermonkey.
- Também confirma rate limit distribuído de sinalização, convites de uso único, rate limit distribuído de emissão de convites e limpeza de fixtures.

### Normal #161 e contrato de voz #163

- #161: [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43479685384) e [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) SUCCESS no mesmo SHA `557814d`.
- #163: [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43488822143) e [Voice Contract](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) SUCCESS no SHA `00f357b`.
- O contrato offline mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. Não comprova a resposta da Edge Function implantada.

### Upload #164 — PASS, com limite de escopo

- [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) SUCCESS no HEAD `a27ced5`.
- O job construiu PROD 3.0.40 / TEST 3.0.40-beta.22 e aprovou regressões do cliente e servidor de signed upload.
- O teste server-side usa VM/Storage mockado. Não houve upload real no Storage.
- A PR é baseada em develop e não está integrada à linha Normal 3.4.7 nem ao Team Lite.

### QA #82 — FAIL reproduzido

- [Validate no HEAD exato #82](https://github.com/Reekyi/UpStatus/actions/runs/43552537033) FAILURE.
- Erro exato: `VALIDATION FAILED: production updateURL mismatch`.
- O check Supabase Preview foi SKIPPED.
- A falha é herdada da combinação de build/validator presente em master, não de alteração de runtime nesta PR documental.

## 4. Causa da falha de Validate da QA e segurança do build

Inspeção comparativa de `scripts/build.mjs` e `scripts/validate.mjs`:

- Em master, o build monta o updateURL Normal usando o endpoint legado `upstatus-screen-share-3-1-1-beta10`.
- O validator de master exige que o artefato contenha `/upstatus/upstatus.user.js`.
- A #74 candidata usa `release.json.scriptUrl`, valida igualdade exata com o endpoint Normal esperado e seu validator verifica updateURL/downloadURL contra esse manifesto.
- Assim, a candidata #74 contém a correção, mas ela ainda não está na base master usada pela #82.

Há também diferença de segurança de build: o `scripts/build.mjs` de master usa `fs.rmSync` recursivamente nos diretórios das funções e em `dist` antes de reescrever. O build candidato #74 remove esse padrão, preserva sidecars rastreados, valida o alvo TEST e torna a sincronização do artefato raiz opt-in, com guarda de versão.

## 5. Workflows

### Normal candidato (#74)

O workflow de produção é manual, exige branch master, checkout SHA exato, projeto Supabase esperado, token presente, versão estável explicitamente fixada em 3.4.7, Validate e CLI 2.122.1. Publica somente `upstatus`.

O guard de versão precisa de decisão humana antes de uma próxima versão; não deve ser removido para fazer o CI ficar verde.

O workflow TEST candidato é manual, exige `SUPABASE_TEST_PROJECT_ID`, rejeita produção e o projeto isolado de signaling/auth, confere formato/igualdade do projeto e fixa CLI 2.122.1. Ele falha fechado até existir um projeto Full-Product TEST.

### Team Lite oficial versus candidata #76

Na branch atual `team-lite-official`, `.github/workflows/deploy-test.yml` ainda:
- tem gatilho push em develop;
- usa `secrets.SUPABASE_PROJECT_ID` genérico;
- usa Supabase CLI `latest`;
- não verifica projeto dedicado, SHA exato ou allowlist de destino.

A candidata #76 inclui versões corrigidas de `deploy-test.yml` e `team-lite-candidate.yml`, mas não está integrada à branch oficial. O workflow candidato faz testes isolados no projeto de signaling/auth; isso não o transforma em Full-Product TEST.

**Não despachar o workflow TEST atualmente presente em team-lite-official.**

## 6. Supabase — projetos, migrations e Edge Functions

Projetos encontrados na organização:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe terceiro projeto Full-Product TEST. O laboratório é de signaling/auth e não possui buckets de Storage.

Migrations:
- Produção: 7 versões no ledger.
- Laboratório: 39 versões.
- `supabase/migrations` em master: somente 3 SQLs canônicos.
- Quatro versões do ledger de produção não têm fonte SQL correspondente no diretório canônico.
- Branch Supabase `main`: MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.

Produção tem 38 Edge Functions ACTIVE. As relevantes:
- `upstatus` v480.
- `upstatus-team-lite` v15.
- `upstatus-test` v281.
- `upstatus-screen-share-3-1-1-beta10` v6.

Não encontrei função dedicada `upstatus-signal` implantada em produção.

## 7. Runtimes instalados — compatibilidade e autenticação

Decodifiquei o userscript embutido nas duas Edge Functions implantadas, sem expor chaves:

- Normal v480 embute userscript 3.4.7.
- Team Lite v15 embute userscript 3.4.30.
- Ambos apontam o servidor e o tópico Realtime para beta10.
- Não encontrei `realtime.setAuth()`, `private:true` nem `setupToken` nos userscripts implantados.

### Avatar Normal — incompatibilidade funcional confirmada

O userscript Normal embutido solicita `/api/profile/avatar-upload-url` e depois envia `avatarUrl` para `/api/profile/avatar`. O handler Normal v480 de `profileRoute` lê `dataUrl` e tenta decodificá-lo. Os contratos não correspondem; a atualização do avatar pode falhar mesmo após o upload assinado inicial.

### Avatar Team Lite — ownership insuficiente

O userscript Team Lite também envia `avatarUrl`. O handler v15 aceita URL sob o prefixo público de `profile-images`, mas não associa o caminho ao `users.id` autenticado. A propriedade do objeto não está comprovada.

### O que a #164 melhora

A candidata #164 troca o avatar para envio server-mediated, limita o corpo a 3 MiB antes do parse, limita os bytes decodificados a 2 MiB, verifica assinaturas JPEG/PNG/GIF/WebP, rejeita MP4 `ftyp` declarado como imagem, deriva prefixo por ID e usa `upsert:false`.

Limitações residuais: não há decoder/re-encode completo nem limite de dimensões/pixels; a resolução do ID ainda consulta por nome e falha fechada se não houver exatamente um resultado; não houve upload real no Storage; a mesma correção não foi portada ao Team Lite. O fluxo de anexos do chat continua com upload assinado direto e validação baseada nos metadados declarados pelo cliente.

## 8. AUTH-03

Nos handlers implantados Normal v480 e Team Lite v15:
- Não encontrei rate limit de tentativas de login.
- Não encontrei `setupToken` nem RPC `consume_upstatus_setup_invite`.
- `/api/setup` chama o fluxo de login/setup sem convite de uso único.
- Há fallback de role por nome para contas administrativas legadas.
- O login exige senha mínima de 6 caracteres no Normal e 4 no Team Lite.
- Sessões e perfis ainda usam identidade por nome, não `users.id`.

A candidata #161/#76 implementa convite único e rate limit distribuído de emissão de convites, mas isso não equivale a rate limit de tentativas de senha. O estado instalado continua sem essas proteções.

## 9. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime

Consulta read-only encontrou 106 mensagens nos últimos 14 dias, todas com `private=false`:
- 72 `user_status`.
- 26 `db_change`.
- 4 `remote_command`.
- 4 `remote_result`.

Os triggers publicam em tópico `upstatus-live-6f5e7b31-...`; os userscripts instalados assinam o tópico beta10. Há divergência entre tópico produtor e consumidor.

`realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies, grants SELECT/INSERT/UPDATE para anon e authenticated. O trigger de mensagens transmite linha completa por `to_jsonb(OLD/NEW)`.

### PostgreSQL

Snapshot de produção:
- 10 tabelas públicas com RLS habilitado e sem policies.
- 126 grants diretos para anon/authenticated em 9 tabelas.
- 18 grants TRUNCATE.
- 120 entradas Default ACL para anon/authenticated.
- 3 funções SECURITY DEFINER de broadcast com `search_path=public` e EXECUTE amplo.

As funções são trigger-returning; não foi demonstrada invocação RPC direta. Os grants amplos continuam desnecessários e precisam de revisão. RLS sem policy é default-deny para os papéis clientes, portanto não trato os grants isoladamente como prova de leitura irrestrita dessas linhas.

### Storage

Produção:
- `chat-images`: público, 168 objetos, limite 20 MiB.
- `profile-images`: público, 20 objetos, limite 20 MiB.
- Zero policies próprias em `storage.objects`.

O limite do bucket impõe teto de objeto, mas não comprova que o MIME declarado corresponda aos bytes. O laboratório não tem buckets de chat/perfil.

## 10. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 0/8 critérios físicos aprovados.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, 16 itens marcados e 19 pendentes no checklist do corpo. O último snapshot de validação no corpo é de 07/11; o comentário QA dedicado foi atualizado separadamente nesta execução.

Não executei Tampermonkey, perda/retorno real de rede, microfone físico, captura real de tela ou chamada instalada Normal ↔ Team Lite. CI Chromium não substitui esses testes.

## 11. Prioridades

1. Corrigir o contrato de avatar do Normal instalado e portar ownership por ID ao Team Lite, com atualização coordenada de cliente e backend.
2. Completar validação de imagem (decoder/re-encode e limites de pixels) e decidir política de Storage; revisar também anexos do chat.
3. Integrar a correção build/updateURL da #74 à base usada pela QA sem enfraquecer o validator.
4. Criar Full-Product TEST independente, com Storage e destino explicitamente allowlisted.
5. Implementar AUTH-03 no runtime implantado: convite de uso único, rate limit de login e identidade por ID.
6. Tornar Realtime privado/autorizado, alinhar tópicos e remover full-row payloads.
7. Restringir grants, Default ACL e EXECUTE de SECURITY DEFINER com plano revisado.
8. Recuperar as quatro fontes SQL originais e diagnosticar MIGRATIONS_FAILED.
9. Corrigir o workflow TEST Team Lite oficial antes de qualquer despacho.
10. Concluir os oito testes físicos da #78 e obter reviews/aprovação humana.

## 12. Veredito e garantias

**NOT READY.** Há CI verde relevante em #74, #76, #161, #163 e #164, mas os runtimes instalados continuam diferentes dos candidatos e há bloqueadores de segurança, compatibilidade, ambiente TEST e aceitação física.

Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva. Todas as consultas SQL executadas foram SELECT/catalog-only. Nenhum teste manual foi simulado.
