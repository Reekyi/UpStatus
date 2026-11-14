# Auditoria independente de qualidade — UpStatus

**Data da execução:** 2026-11-14T00:38:24.025Z  
**Repositório:** Reekyi/UpStatus  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**HEAD QA antes do append:** 2c8f2da0c17b16d3622a6c824d59c7ca0d87c2c0  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb

## 1. Método e limites

Foi lido o arquivo docs/RELEASE_READINESS.md na branch QA: 5.746 linhas e 1.050.184 caracteres. O último checkpoint técnico registrado dentro dele é 2026-11-08 15:30 BRT / 18:30 UTC. O documento está desatualizado em relação aos HEADs e workflows observados nesta execução; este relatório é um adendo separado e não altera o documento original.

Foram feitas inspeções read-only no GitHub e Supabase, leitura de fontes de Edge Functions implantadas, consulta de catálogo PostgreSQL e leitura dos logs de workflows existentes. Não foram iniciados workflows, scripts locais, uploads, testes de navegador ou mutações de fixtures. Os resultados de CI abaixo são resultados já existentes no GitHub, não testes executados manualmente nesta sessão.

A única escrita desta execução é este novo arquivo documental na branch QA e a atualização do comentário QA existente na Issue #79. Nenhuma branch de Engenharia, produção Supabase ou configuração de produção foi alterada.

## 2. Heads reais

| Ref | SHA |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA | 2c8f2da0c17b16d3622a6c824d59c7ca0d87c2c0 |

PRs principais continuam OPEN e Draft. Nenhuma review humana foi encontrada nas PRs #74, #75, #76, #82, #161, #163 e #164.

| PR | HEAD | Base | Arquivos | Commits |
|---|---|---|---:|---:|
| #74 Normal | dcaf6a0 | master | 90 | 887 |
| #75 Team Lite baseline | 7bbf9b9 | team-lite-official | 10 | 59 |
| #76 Team Lite | 83a6cc4 | team-lite-official | 57 | 386 |
| #82 QA | 2c8f2da | master | 148 | 292 |
| #161 Normal | 557814d | #74 | 10 | 12 |
| #163 Voz | 00f357b | #161 | 6 | 7 |
| #164 Upload | 67d0570 | develop | 5 | 24 |

A consulta da API de proteção de branches retornou HTTP 401 para master e team-lite-official. Portanto, a proteção dessas branches não foi confirmada nesta execução; não trato o 401 como prova de que estejam protegidas ou desprotegidas.

## 3. CI por SHA exato

| PR | Workflow | Run | Resultado |
|---|---|---:|---|
| #74 | UpStatus Validate | 43376770142 | PASS |
| #74 | Signaling Smoke | 43376770200 | PASS |
| #75 | Team Lite Candidate Checks | 41674353127 | PASS histórico |
| #76 | Team Lite Candidate Checks | 43363871881 | PASS |
| #82 | UpStatus Validate | 43528988510 | FAIL |
| #161 | UpStatus Validate | 43479685384 | PASS |
| #161 | Signaling Smoke | 43479685445 | PASS |
| #163 | UpStatus Validate | 43488822143 | PASS |
| #163 | Voice Open HTTP Status Contract | 43488822237 | PASS offline |
| #164 | UpStatus Validate | 43532274434 | FAIL |

Links:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- #75 histórico: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- #76: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- #82: https://github.com/Reekyi/UpStatus/actions/runs/43528988510
- #161 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43479685384
- #161 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43479685445
- #163 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43488822143
- #163 Contract: https://github.com/Reekyi/UpStatus/actions/runs/43488822237
- #164 atual: https://github.com/Reekyi/UpStatus/actions/runs/43532274434

### 3.1 #82 — causa concreta do Validate vermelho

A PR #82 é documental: seus 148 arquivos alterados são docs/RELEASE_READINESS.md e relatórios de auditoria. Ela não altera runtime.

A falha não é causada pelo Markdown. Na branch QA, scripts/build.mjs define o cloud de produção como o endpoint beta10 e constrói updateURL a partir desse cloud. Já scripts/validate.mjs exige que o updateURL contenha /upstatus/upstatus.user.js. release.json declara corretamente o endpoint /upstatus, mas a versão de build.mjs nesta branch não usa esse campo para renderizar o updateURL.

A PR #161 tem uma correção candidata: seu build usa release.scriptUrl para o updateURL. Isso ainda não foi integrado em master/QA. Não remover a assertion do validator; reconciliar o contrato entre build, manifesto e distribuição.

Referências:
- Build da QA: https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/scripts/build.mjs
- Validator da QA: https://github.com/Reekyi/UpStatus/blob/qa/release-readiness-2026-11-04-master/scripts/validate.mjs
- Manifesto: https://github.com/Reekyi/UpStatus/blob/master/release.json
- Candidata #161: https://github.com/Reekyi/UpStatus/pull/161

### 3.2 #164 — PASS antigo não vale para o HEAD atual

O HEAD atual é 67d0570. O Validate 43532274434 falhou em scripts/test-signed-upload-server.mjs:152 com TypeError ao ler length de legacyUploads. O harness declara calls com storage, upserts e uploads, mas o teste consulta calls.legacyUploads. Há também outra referência posterior ao mesmo campo. Isso é uma falha real do teste/harness e impede considerar a PR validada no HEAD atual.

O PASS anterior citado no checkpoint da Engenharia pertence a 6844cf7, não ao HEAD 67d0570.

## 4. Upload de avatar e anexos

### 4.1 Candidata #164

O desenho atual da #164 melhorou em relação ao upload assinado de avatar:

- A rota de avatar antiga /api/profile/avatar-upload-url retorna HTTP 410.
- O cliente envia data URL ao endpoint autenticado /api/profile/avatar.
- O servidor decodifica Base64, deriva MIME/extensão a partir de magic bytes e confere o tamanho real dos bytes até 2 MiB.
- O prefixo do objeto é derivado de users.id, resolvido pelo nome autenticado e exigindo exatamente um resultado.
- O upload usa upsert:false.
- A associação da URL ao perfil verifica origem, bucket e prefixo de ownership.

Isso é inspeção de código, não prova de upload real. O Validate atual falha no harness; não houve upload real no Supabase.

Limitações residuais:
1. sniffMime confere assinaturas iniciais, mas não decodifica/re-encoda integralmente a imagem nem limita dimensões/pixels. Recomenda-se decodificar e re-encodar em ambiente isolado.
2. readBody executa req.text() e JSON.parse sem limite explícito de corpo antes de Base64 decode. O limite de 2 MiB é aplicado depois de ler e decodificar. Adicionar limite de Content-Length/streaming antes da alocação.
3. O perfil continua armazenado por user_name e a sessão continua contendo user_name; o uso de users.id é parcial, não uma migração completa de identidade.
4. A rota de associação da URL verifica o prefixo de ownership, mas não confirma explicitamente a existência/validade integral do objeto.
5. signedUploadRoute retorna 410 para avatar, mas mantém código específico de avatar inalcançável depois do retorno antecipado.
6. O upload assinado de anexos de chat continua sendo PUT direto ao Storage. O servidor confere p.mime e p.size declarados pelo cliente, mas não inspeciona os bytes reais. upsert:false impede sobrescrita, porém não comprova que o conteúdo corresponde ao MIME declarado.

### 4.2 Incompatibilidade instalada Normal

O userscript Normal implantado é 3.4.7 e chama /api/profile/avatar-upload-url; depois do PUT assinado, envia {avatarUrl: ...} para /api/profile/avatar.

A Edge Function Normal v480 tem profileRoute que lê p.dataUrl e chama uploadFile com String(p.dataUrl||""). Ela não consome p.avatarUrl. Portanto, o cliente e o backend implantados têm contratos incompatíveis: o objeto pode ser enviado ao Storage, mas a gravação do perfil falha ao tentar decodificar um data URL ausente, deixando potencialmente um objeto órfão.

Além disso, o endpoint de upload assinado de avatar continua exposto no backend Normal, aceita até 20 MiB declarados e usa upsert:true. O caminho legado server-mediated por dataUrl tem limite de 2 MiB e sniffMime, mas não é o caminho chamado pelo userscript 3.4.7 observado.

### 4.3 Team Lite instalado

O userscript Team Lite implantado é 3.4.30 e usa o mesmo fluxo de URL assinada seguido de POST avatarUrl.

O backend Team Lite v15 aceita avatarUrl se começar com o prefixo público profile-images do projeto, mas não confere que o caminho pertence ao users.id autenticado. Assim, um usuário autenticado pode tentar associar ao próprio perfil uma URL de avatar de outro usuário, desde que conheça o caminho público.

O Team Lite também aceita dataUrl de avatar até 20 MiB e o signedUploadRoute aceita avatar até 20 MiB com upsert:true. A correção de ownership da #164 está na candidata Normal/develop e ainda não foi portada para Team Lite.

### 4.4 Storage

Snapshot de produção:
- chat-images: público, 20 MiB, 168 objetos.
- profile-images: público, 20 MiB, 20 objetos.
- Zero policies em storage.objects.
- Allowed MIME types incluem imagens, vídeo, áudio e documentos no bucket de chat.

O acesso público pode ser uma decisão funcional para avatars/anexos, mas precisa ser explícito. A ausência de policies próprias e o upload direto com MIME declarado pelo cliente não constituem validação de conteúdo.

## 5. Autenticação e identidade

Fontes implantadas:
- Normal: Edge Function upstatus v480, userscript 3.4.7.
- Team Lite: upstatus-team-lite v15, userscript 3.4.30.
- TEST: upstatus-test v281, userscript 3.3.28.

Constatações:
- Normal exige senha mínima de seis caracteres no login; Team Lite exige quatro.
- Primeiro acesso continua em POST /api/setup sem setupToken/convite de uso único nos runtimes instalados.
- O setup ainda contém fallback de role administrativa por nome (Ricardo, Lohan e Guilherme) quando a role está vazia.
- GET /api/account?name= é público e retorna needsSetup, permitindo enumeração do estado de configuração de contas.
- Não foi encontrado rate limit de tentativas de login nos handlers.
- users tem PK id, mas não possui índice/constraint UNIQUE em name.
- upstatus_sessions armazena token_hash, user_name e expires_at; não tem user_id.
- upstatus_profiles tem PK user_name; não tem user_id.
- A candidata de convite da #161 limita emissão de convites por administrador e consome convite atomicamente, mas isso não equivale a rate limit de login.

Snapshot SQL: cinco usuários, 302 mensagens, 319 sessões e cinco perfis. Não foram encontrados password hashes vazios nem roles vazias.

As 38 Edge Functions de produção reportam verify_jwt=false. Isso não prova sozinho ausência de autenticação: as rotas de aplicação usam token próprio de sessão. Ainda assim, endpoints públicos de setup/account precisam de controles próprios.

## 6. Realtime, voz e compartilhamento de tela

Snapshot de realtime.messages nos últimos 14 dias:
- 106 linhas, todas private=false.
- Um tópico: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- 72 user_status, 26 db_change, 4 remote_command e 4 remote_result.
- RLS true, FORCE RLS false, zero policies, sete partições diretas.
- anon e authenticated têm SELECT, INSERT e UPDATE efetivos.

Os triggers de produção publicam com private=false. upstatus_broadcast_messages envia o registro OLD/NEW completo via to_jsonb. upstatus_broadcast_remote_state publica campos de comando/resultado. upstatus_broadcast_users publica status do usuário.

As três funções são SECURITY DEFINER, search_path=public, retornam trigger e têm EXECUTE para anon/authenticated. O Security Advisor reporta as seis concessões (três funções para dois papéis) como WARN via RPC; não executei essas funções.

Os userscripts Normal e Team Lite implantados assinam upstatus-screen-share-live-3-1-1-beta10, não o tópico upstatus-live usado pelos triggers. Não usam private:true nem realtime.setAuth(). O Normal encaminha eventos públicos para handlers de remote command, call_signal, voice room e screen share; Team Lite também confere sessão local/generation, mas isso não autentica o remetente do broadcast.

A divergência de tópicos significa que eventos dos triggers não correspondem ao canal assinado pelos clientes. Não foi realizado teste físico de entrega; o efeito final pode depender dos caminhos de polling/fallback.

### Contrato HTTP de voz

A #163 tem contrato offline que mapeia VOICE_ATTEMPT_ALREADY_ACTIVE para HTTP 409. A Edge Function de laboratório implantada, upstatus-signal-test v32, mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para 409, mas não contém VOICE_ATTEMPT_ALREADY_ACTIVE. O CI da #163 passou sobre helper local; não comprova o comportamento da função implantada.

O laboratório tem upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não existe função server-mediated de sinalização implantada em produção.

## 7. PostgreSQL, RLS, grants e SECURITY DEFINER

Produção:
- Dez tabelas public com RLS e zero policies.
- Nove tabelas com grants efetivos para anon/authenticated.
- 126 concessões no total: 63 para anon e 63 para authenticated.
- 18 concessões TRUNCATE.
- 120 entradas de privilégios em Default ACLs amplas nos schemas public/storage e GraphQL.
- Security Advisor: 6 WARN (SECURITY DEFINER executáveis por anon/authenticated) e 10 INFO (RLS sem policies).

RLS sem policies bloqueia operações de linha comuns, mas TRUNCATE não é filtrado por RLS. Os grants precisam ser reduzidos ao mínimo necessário, com revisão do owner e das funções administrativas.

Laboratório:
- 39 migrations.
- Duas Edge Functions ativas.
- Security Advisor: zero WARN e 18 INFO de RLS sem policies.
- Não há fixtures de produto nem buckets Storage; é laboratório de signaling/auth, não Full-Product TEST.

## 8. Migrations, projetos e branches Supabase

Existem dois projetos:
- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório bfpjtfqlnypisxljoxkb (upstatus-security-test): ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Não existe terceiro projeto Full-Product TEST independente.

Ledger:
- Produção: sete migrations.
- Laboratório: 39 migrations.
- master: três arquivos SQL canônicos em supabase/migrations.
- Quatro fontes SQL originais correspondentes a migrations registradas em produção continuam ausentes do diretório canônico.

Branch gerenciada Supabase main continua MIGRATIONS_FAILED, embora preview_project_status seja ACTIVE_HEALTHY. A causa ainda não foi diagnosticada. Não foi executado db push, migration, repair ou qualquer escrita SQL.

## 9. Workflows e release

### Normal

O workflow candidato em #74:
- Exige refs/heads/master.
- Confere checkout SHA == GITHUB_SHA.
- Confere o projeto esperado dlfvkawaiqduhlazsszm.
- Exige SUPABASE_ACCESS_TOKEN.
- Fixa Supabase CLI 2.122.1.
- Publica somente a função upstatus.

Mas o guard de produção aceita exclusivamente release.json version 3.4.7. O build candidato exige incremento de versão antes de sincronizar o artefato raiz UpStatus.user.js. Para publicar uma versão nova, o guard de produção precisa ser revisado junto com o manifesto e o plano de corte; não contornar a proteção.

### Team Lite oficial

O arquivo .github/workflows/deploy-production.yml em team-lite-official:
- Usa workflow_dispatch.
- Usa CLI latest.
- Não valida projeto Supabase esperado nem checkout SHA exato.
- Executa supabase functions deploy upstatus, não upstatus-team-lite.

O workflow oficial de TEST usa SUPABASE_PROJECT_ID genérico, CLI latest e deploya upstatus-test sem allowlist de projeto full-product isolado.

**Não despachar esses workflows oficiais.**

A candidata #76 melhora o workflow de testes: exige projeto dedicado, rejeita produção e o projeto isolado de signaling, fixa CLI 2.122.1 e usa guard de mutação. Porém o workflow de deploy TEST faz checkout da branch develop, não do SHA exato do evento, e não compara git rev-parse HEAD com GITHUB_SHA.

## 10. Issues e testes manuais

Issue #78 permanece OPEN, 0/8 critérios físicos aprovados:
- reconexão Normal sem F5;
- reconexão Team Lite sem F5;
- reentrada em sala;
- iniciar/receber chamadas;
- ausência de peers/áudio/polling duplicados;
- participantes que permaneceram online;
- regressão automatizada;
- teste manual no navegador.

Issue #79 permanece OPEN, 16/35 itens marcados e 19 pendentes no corpo.

Nenhum teste físico foi realizado nesta execução: sem Tampermonkey instalado, queda real de internet, microfone, captura de tela ou interoperabilidade Normal ↔ Team Lite. CI Chromium/VM é evidência automatizada isolada, não aceitação física.

## 11. Gates revisados

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 106/106 broadcasts públicos, tópico divergente e clientes sem canal privado autenticado |
| TEST-ISOLATION | blocked | Só produção e laboratório signaling/auth; sem Full-Product TEST |
| MIGRATION-PROVENANCE | blocked | 7 migrations produção, 3 SQLs canônicos e quatro fontes ausentes |
| AUTH-03 | blocked | Setup sem convite, sem rate limit de login e identidade por nome |
| ACL-STORAGE | blocked | Grants/Default ACL amplos e Storage público sem policies |
| RECONNECT | pending | Issue #78 0/8; nenhum teste físico |
| HUMAN-REVIEW | pending | PRs principais sem reviews/aprovação humana |

## 12. Próximas ações recomendadas

1. Corrigir o harness da #164 e obter Validate verde no HEAD 67d0570 ou em novo SHA.
2. Corrigir o contrato de avatar Normal instalado; portar ownership por users.id para Team Lite.
3. Limitar o corpo da requisição antes de req.text/Base64 decode e decodificar/re-encodar imagens com limite de pixels.
4. Inspecionar bytes/MIME dos anexos de chat no servidor ou em quarentena; definir política de bucket público/privado.
5. Corrigir build.mjs/validate.mjs da QA sem remover assertions.
6. Integrar o transporte de voz/tela server-mediated, privado e autenticado como default em Normal e Team Lite; reconciliar tópicos.
7. Alinhar VOICE_ATTEMPT_ALREADY_ACTIVE entre código candidato e Edge Function de laboratório, com teste HTTP real.
8. Implementar convite único, rate limit de login e migração completa para user_id.
9. Reduzir grants, Default ACL e EXECUTE das funções SECURITY DEFINER; revisar RLS/Storage.
10. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
11. Corrigir workflow oficial Team Lite e coordenar versão/guard Normal.
12. Executar os oito testes físicos e obter aprovação humana.

A cotação/provisionamento do Full-Product TEST depende de autorização de Ricardo; nenhum projeto foi criado e nenhum billing foi consultado.

## 13. Segurança da execução

Todas as consultas SQL executadas foram SELECT-only. Não houve alteração de produção, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags, grants, policies, ACL, role ou fixture. Nenhum workflow foi iniciado manualmente. A falha de CI #164 e a falha de Validate #82 são resultados existentes no GitHub, não execuções feitas por esta auditoria.
