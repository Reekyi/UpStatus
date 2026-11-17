# UpStatus — Auditoria independente QA
**Data:** 14/11/2026, 07:34 UTC  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb  
**Recomendação:** **NOT READY**

## 1. Escopo e segurança

Revalidação read-only de GitHub e Supabase: heads, PRs #74/#75/#76/#82, issues #78/#79, workflows, logs de CI, bundles servidos pelas Edge Functions, catálogos PostgreSQL, Realtime, Storage, migrations e Security Advisor.

O arquivo docs/RELEASE_READINESS.md foi lido integralmente por blob: 8.410 linhas, 1.045.105 caracteres, SHA 7cfbd70886df42ce790c078c224b19284a632595. O último checkpoint técnico no próprio arquivo é **08/11/2026 15:30 UTC**. Portanto, o readiness está desatualizado em relação a esta rodada. O original não foi alterado.

Nenhum teste manual, exploração externa ou upload real foi executado. Todas as consultas SQL foram SELECT-only. Não houve escrita em produção, merge, deploy, migration, release, publicação de userscript, alteração de secret, flag, role, grant, policy, ACL ou fixture. A única escrita de repositório é este relatório novo na branch QA; o comentário QA da Issue #79 também foi atualizado.

## 2. Heads e divergência

| Referência | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA / PR #82 | 1476e2ddb0910e72f192b425a8f5fa16052371dc |
| team-lite-official | 9065bc1 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| PR #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 |
| PR #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| PR #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 |
| PR #164 avatar/upload | a27ced56564f3d18948c70138f6d6b2a1f2d0907 |

master → QA: 299 commits à frente, 1 atrás; merge-base a9288ccfcb0f308d3a587bfca624418a395be07b. O commit exclusivo de master é 9d40461, mensagem "docs: record read-only AUTH-03 migration preflight". Não fiz merge nem rebase.

A PR #82 tem 155 arquivos alterados, todos em docs/. PRs #74, #75, #76 e #82 não têm reviews humanas registradas.

## 3. CI e PRs

| PR | Evidência | Resultado |
|---|---|---|
| #74 Normal | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS; 19/19 não autenticadas, 136/136 autenticadas |
| #75 baseline | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; não é a candidata atual |
| #76 Team Lite | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS; 16/16 não autenticadas, 110/110 autenticadas |
| #82 QA | [Validate 43567184054](https://github.com/Reekyi/UpStatus/actions/runs/43567184054) | FAIL: production updateURL mismatch |
| #164 upload | [Validate 43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) | PASS no HEAD a27ced5 |

#74: WebRTC em navegador, chamada/voz/tela, áudio e vídeo remoto, mesh de três participantes, rate limit distribuído de sinalização (90 aceitas + 1 HTTP 429), recibos de leitura atômicos e recuperação de voz/tela. O log não mostra o rate limit de emissão de convites como aprovado nessa execução.

#76: WebRTC, recuperação de voz/tela, mesh, rate limit distribuído, recibos atômicos e rate limit de emissão de setup-invite. São resultados de CI no projeto isolado, não aceitação física.

#164: Validate com mocks/offline; não houve integração com Storage real. O corpo da PR dizia que não havia run às 02:07 UTC, mas o Validate 43544570609 passou no HEAD a27ced5 às 02:08 UTC.

### Causa da falha QA

Em master, scripts/build.mjs monta updateUrl como cloud + "/upstatus.user.js", mas o cloud de produção aponta para upstatus-screen-share-3-1-1-beta10. release.json aponta para /functions/v1/upstatus/upstatus.user.js, que é o caminho exigido pelo validator. O build de master e o manifesto discordam.

A candidata #74 corrige o builder para usar release.scriptUrl e validar igualdade exata. Essa correção ainda não está em master, portanto o Validate herdado pela #82 continua vermelho. Não enfraqueci o validator.

## 4. Workflows

**Normal (#74):** workflow candidato manual-only, environment production, exige ref master, confere project ref e fixa Supabase CLI 2.122.1. Publica somente upstatus (distribuição do userscript), não a API beta10. O guard ainda está preso à versão 3.4.7; versão/manifesto precisam ser coordenados para que os clientes instalados recebam a atualização de forma inequívoca.

**Team Lite:** o workflow atual em team-lite-official/.github/workflows/deploy-production.yml usa workflow_dispatch, secret genérico SUPABASE_PROJECT_ID, CLI latest e executa supabase functions deploy upstatus. O alvo correto é upstatus-team-lite. Não há preflight equivalente de branch, SHA e projeto. **Não despachar.**

A PR #76 contém team-lite-candidate.yml e um workflow TEST com projeto configurado e CLI 2.122.1, mas isso não corrige o workflow oficial de produção Team Lite.

## 5. Realtime e comando remoto

### Banco

- realtime.messages: RLS habilitado, FORCE RLS desabilitado, zero policies.
- Anon/authenticated têm SELECT, INSERT e UPDATE no parent; sete partições diretas observadas.
- 106 eventos nos últimos 14 dias, todos private=false: 72 user_status, 26 db_change, 4 remote_command, 4 remote_result.
- Triggers publicam no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0; os userscripts instalados assinam upstatus-screen-share-live-3-1-1-beta10. Os tópicos não coincidem.
- O trigger de mensagens envia to_jsonb(OLD/NEW) completo.

### Bundles de produção

Normal: distribuidora upstatus v480, userscript embutido 3.4.7, API apontada para beta10 v6. Team Lite: upstatus-team-lite v15, userscript 3.4.30.

Ambos assinam o tópico beta10, não definem private:true e não chamam realtime.setAuth(). Ambos recebem remote_command, call_signal e eventos de voz/tela.

**Achado P1, inspeção estática:** o listener Normal aceita remote_command sem checar sessão local ou identidade do emissor. Team Lite checa a própria sessão e geração local, mas também não autentica o emissor do broadcast. Nos dois bundles, executeRemoteCommand chama syncSaleSmartly(c.status), depois tenta gravar o status pela sessão local e pode recarregar a página Sale Smartly. Isso cria um caminho potencial de manipulação remota de status se o canal permitir publicação pública. Não houve exploração; o setting Allow public access do Dashboard não foi exposto, portanto exploração externa não está demonstrada.

### Candidatas #74/#76

As candidatas mudam remote_command para wake-up que dispara polling autenticado. Porém signaling_transport_enabled continua default-off e o endpoint é vazio por padrão. Enquanto a flag está desligada, call_signal e eventos de voz/tela continuam aceitos pelo transporte Realtime legado. O transporte server-mediated só entra quando explicitamente habilitado. A função upstatus-signal-test v32 existe no laboratório, não em produção. RT-01 permanece bloqueado.

## 6. PostgreSQL, ACL e Storage

Produção:
- Dez tabelas públicas com RLS e zero policies.
- Nove tabelas concedem a anon/authenticated SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER e TRUNCATE. Sem policies, RLS bloqueia operações por linha; RLS não protege TRUNCATE.
- Três funções de broadcast SECURITY DEFINER, search_path=public, retornam trigger e estão anexadas a triggers. EXECUTE aparece concedido a anon/authenticated; não foi demonstrada invocação direta como RPC comum. Os grants continuam desnecessários.
- Quinze registros Default ACL geram 120 concessões para anon/authenticated em defaults de postgres/supabase_admin nos schemas public, storage, graphql e graphql_public.
- Security Advisor: 6 WARN e 10 INFO.

| Bucket | Objetos | Público | Limite |
|---|---:|---|---:|
| chat-images | 168 | Sim | 20 MiB |
| profile-images | 20 | Sim | 20 MiB |

Zero policies próprias em storage.objects.

Laboratório: 18 tabelas públicas com RLS e zero policies, mas zero grants diretos de tabela para anon/authenticated. Zero usuários, sessões, perfis, buckets, objetos e mensagens Realtime. Security Advisor: 18 INFO, nenhum WARN. É um laboratório de signaling/auth, não um Full-Product TEST.

## 7. Avatar e anexos

O Normal instalado chama beta10 v6, cujo contrato avatarUrl é compatível com o cliente. Correção de precisão: a função distribuidora v480 não é a API usada pelo cliente; a alegação anterior de incompatibilidade avatarUrl/dataUrl no Normal estava errada.

Nos runtimes instalados, Normal e Team Lite aceitam URLs públicas de avatar sem validar ownership por users.id. O signedUploadRoute confia em MIME/tamanho declarados e usa upsert:true, até 20 MiB.

A PR #164 baseada em develop:
- limita corpo JSON do avatar a 3 MiB antes do parse;
- limita bytes decodificados a 2 MiB;
- reconhece JPEG/PNG/GIF/WebP por assinatura e rejeita MP4 ftyp declarado como JPEG;
- vincula caminho ao prefixo derivado de users.id;
- usa upload server-mediated e upsert:false;
- mantém anexos de chat em PUT direto assinado, com 20 MiB e validação apenas dos metadados declarados.

O Validate do HEAD a27ced5 passou com mocks/offline. Ainda faltam decoder/re-encoder completo, limite de dimensões/pixels e inspeção dos bytes reais dos anexos. Não houve upload real. A candidata não está integrada às linhas oficiais nem aos runtimes instalados.

## 8. AUTH-03 e identidade

Produção: 5 usuários, 319 sessões, 5 perfis; zero hashes vazios, roles vazias ou nomes duplicados. users.id é PK, mas users.name não tem UNIQUE. upstatus_sessions e upstatus_profiles usam user_name, sem user_id.

Zero colunas setup_token_* e zero RPC consume_upstatus_setup_invite. GET /api/account expõe needsSetup; POST /api/setup não exige convite único. O fallback de role por nome ainda promove Ricardo/Lohan/Guilherme a admin quando role está vazia. Login Normal exige 6 caracteres; Team Lite, 4. Não foi encontrado rate limit de tentativas de login nos handlers inspecionados.

Laboratório: quatro colunas setup_token_* e duas RPCs (consume_upstatus_setup_invite e consume_upstatus_setup_invite_rate_limit), SECURITY INVOKER, search_path vazio e EXECUTE apenas service_role. A melhoria não está aplicada em produção; rate limit de emissão de convite não substitui rate limit de login.

## 9. Edge Functions e migrations

- Produção: 38 Edge Functions ACTIVE, todas reportam verify_jwt=false. Isso não prova ausência de autenticação por si só; handlers principais validam token próprio.
- Funções principais: upstatus v480, upstatus-team-lite v15, beta10 v6 e upstatus-test v281.
- Nenhuma função server-mediated de sinalização está implantada em produção.
- Laboratório: duas funções, incluindo upstatus-signal-test v32.

Ledger de produção: sete migrations; laboratório: 39. Três fontes antigas foram encontradas em master. Quatro fontes abaixo estão ausentes em master, develop e QA; busca de commits pelo nome exato não encontrou resultados:
- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

A branch Supabase main está MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY. Nenhuma tentativa de reparo foi feita.

## 10. Issues e aceitação

- Issue #78 OPEN, 0/8 critérios físicos marcados: reconexão Normal/Team Lite sem F5, reentrada, chamadas, ausência de peers/áudio/polling duplicados, participantes persistentes, regressão automatizada e teste manual.
- Issue #79 OPEN, 16/35 itens marcados.
- Reviews humanas em #74, #75, #76 e #82: zero.
- Nenhum teste manual de Tampermonkey, microfone, captura de tela, perda real de internet ou interoperabilidade instalada foi realizado.

## 11. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime legado sem autenticação do emissor; transporte server-mediated default-off |
| TEST-ISOLATION | blocked | Laboratório não é Full-Product TEST e não tem Storage/fixtures |
| MIGRATION-PROVENANCE | blocked | Quatro fontes SQL ausentes em master/develop/QA |
| AUTH-03 | blocked | Produção sem setup token/RPC e sem rate limit de login |
| ACL-STORAGE | blocked | Grants/Default ACL amplos e buckets públicos sem policies |
| RECONNECT | pending | 0/8 testes físicos; aguarda confirmação de Ricardo |
| HUMAN-REVIEW | pending | Sem review humana nem autorização explícita de release |

## 12. Próximas prioridades

1. Remover confiança em broadcasts públicos para comandos/sinalização; validar sender, membership, target, replay, expiry e rate limit no servidor.
2. Tornar o transporte autenticado padrão somente após CI e integração no laboratório; alinhar tópico de triggers/clientes.
3. Integrar ownership de avatar por ID em Normal e Team Lite; concluir validação de imagens e anexos.
4. Aplicar AUTH-03 em produção somente após revisão/autorização: convite único, rate limit de login, identidade por user_id e unicidade.
5. Corrigir grants/Default ACL com owner autorizado; decidir Storage privado e policies mínimas.
6. Recuperar quatro migrations e diagnosticar MIGRATIONS_FAILED.
7. Corrigir workflow Team Lite e reconciliar versão/manifesto Normal.
8. Criar Full-Product TEST independente.
9. Executar os oito testes físicos e obter review/aprovação humana.

**Conclusão: NOT READY.** CI candidato está forte em partes, mas produção continua com transporte Realtime legado, autenticação incompleta, ACL/Storage excessivos e falta de aceitação física. Nenhum resultado de CI foi tratado como teste manual.
