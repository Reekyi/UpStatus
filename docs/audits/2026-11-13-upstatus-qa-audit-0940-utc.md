# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-13 09:40 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## 1. Escopo e método

Revalidação read-only de heads, PRs #74/#75/#76/#82/#159, issues #78/#79, workflows e logs existentes; leitura integral do blob de `docs/RELEASE_READINESS.md`; inspeção dos templates Normal/Team Lite; decodificação dos userscripts embutidos nas Edge Functions; consultas SQL exclusivamente SELECT no projeto de produção e no laboratório.

O arquivo `docs/RELEASE_READINESS.md` foi obtido pelo blob SHA `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 bytes e 8.410 linhas. O último checkpoint interno continua em 2026-11-08 18:30 UTC. O documento foi preservado.

**Classificação:** CI = workflow existente no SHA informado; inspeção = análise estática/catálogo; manual pendente = exige navegador, Tampermonkey, hardware ou confirmação humana; bloqueado = dependência não resolvida. Nenhum workflow foi disparado nesta execução e nenhum teste manual foi realizado.

## 2. Heads e divergências

| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `12a8a79f3e176b1fcc86086d5633b296fbe299d0` |
| `team-lite-official` | `9065bc1…` |
| PR #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 baseline Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 QA | `12a8a79f3e176b1fcc86086d5633b296fbe299d0` |
| PR #159 | `0bf5a9b76156dea69380468197f19d6ee4bcffc3` |

QA está 275 commits à frente e 1 atrás de master; a comparação retorna 133 arquivos divergentes, todos documentais. O único commit adicional de master observado nesta comparação adiciona `docs/checkpoints/2026-11-08-production-migration-history-preflight.md`. PR #74 está 1 commit atrás do master atual, e essa diferença também é documental.

PR #159 usa como base `1d47e9d18306733dd48f8a9e279c8c2fc28165c6`, enquanto o HEAD QA atual é `12a8a79`: o PR está um commit de auditoria atrás da base atual. PR #76 está 327 commits à frente do baseline #75.

As PRs #74, #75, #76, #82 e #159 permanecem abertas/Draft e sem reviews humanas registradas.

## 3. CI observado

| PR / execução | Resultado observado | Limite |
|---|---|---|
| #74 Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | **PASS** | Build/validação no SHA candidato |
| #74 Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | **PASS**, 136/136 autenticados | Chromium/WebRTC e integração no ambiente isolado; não substitui instalação Tampermonkey |
| #75 Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico** | Baseline superado pela #76 |
| #76 Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | **PASS**, 110/110 autenticados e 16/16 não autenticados | Inclui voz/tela, mesh, recuperação, setup-invite e rate limit no laboratório |
| #82 Validate [43395843064](https://github.com/Reekyi/UpStatus/actions/runs/43395843064) | **FAIL** | `production updateURL mismatch` no HEAD QA atual |
| #159 Push [43392498395](https://github.com/Reekyi/UpStatus/actions/runs/43392498395) e PR [43392506216](https://github.com/Reekyi/UpStatus/actions/runs/43392506216) | **PASS** | Validação offline; sem Supabase, navegador ou teste físico |

Os logs da #76 confirmam os cenários de enrollment isolado (token malformado, errado, expirado, replay, concorrência de um vencedor e preservação de role) e rate limit distribuído de convites. Isso é evidência do laboratório, não de produção.

O Validate da #82 falha porque o build da branch QA ainda monta o `@updateURL` Normal a partir do endpoint beta10, enquanto `release.json` aponta para `/functions/v1/upstatus/upstatus.user.js`. O log atual termina em `VALIDATION FAILED: production updateURL mismatch`.

## 4. Achado P0 de integração Normal: #74 publica uma função diferente da API usada pelo cliente

Na branch candidata #74, `scripts/build.mjs` define:
- `PROD_FUNCTION = "upstatus"`;
- `expectedProductionUpdateUrl` em `/functions/v1/upstatus/upstatus.user.js`;
- `updateUrl` Normal a partir de `release.json`;
- **`CLOUD_SERVER` Normal ainda em `/functions/v1/upstatus-screen-share-3-1-1-beta10`**.

O workflow de produção da #74 publica somente `supabase functions deploy upstatus`, depois de exigir master, SHA exato, projeto esperado e CLI 2.122.1. Portanto, o candidato distribui o userscript por `upstatus`, mas o cliente continua enviando chamadas de API para beta10. As alterações de backend compiladas em `upstatus` não serão usadas pelo cliente enquanto `CLOUD_SERVER` permanecer em beta10.

A validação da #74 verifica o updateURL e o alvo do TEST, mas não exige que o `CLOUD_SERVER` Normal corresponda ao `PROD_FUNCTION` publicado. A suíte não detecta essa divergência.

A #159 corrige o build: alinha `CLOUD_SERVER` e updateURL com `upstatus` e adiciona uma asserção explícita em `scripts/test-qa-release-target.mjs`. Isso é uma correção útil, mas não deve ser integrada isoladamente: a #159 também remove a exigência de convite de primeiro acesso (seção 5) e herda um workflow de deploy com CLI `latest`, sem as mesmas verificações de SHA/projeto da #74.

**Recomendação:** portar apenas o alinhamento de destino e a asserção de contrato da #159 para a linha Normal da #74, preservando o enrollment seguro, o workflow protegido e o incremento de versão.

Evidências:
- [Build #74](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/scripts/build.mjs)
- [Validate #74](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/scripts/validate.mjs)
- [Workflow de produção #74](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/.github/workflows/deploy-production.yml)
- [Build #159](https://github.com/Reekyi/UpStatus/blob/fix/qa-updateurl-reconciled-20261113/scripts/build.mjs)
- [Teste de destino #159](https://github.com/Reekyi/UpStatus/blob/fix/qa-updateurl-reconciled-20261113/scripts/test-qa-release-target.mjs)

## 5. Achado P1 de AUTH-03: #159 remove o convite de uso único

A #74 e a #76 exigem `setupToken` de 64 caracteres hexadecimais e chamam `consume_upstatus_setup_invite`. A #76 também chama `consume_upstatus_setup_invite_rate_limit` antes de emitir convite (5 por administrador em 900 segundos).

Na #159, o fluxo voltou a:
1. consultar a conta pelo nome;
2. aceitar `POST /api/setup` quando `password_hash` ainda está vazio;
3. definir a senha e a role sem validar ou consumir token de convite.

A rota pública `GET /api/account?name=` também retorna `needsSetup`, permitindo consultar o estado de configuração por nome. O runtime usa `verify_jwt=false` no gateway e autenticação de sessão própria dentro da função; o endpoint de setup é deliberadamente anterior à sessão, portanto precisa de prova de convite.

O teste `scripts/chat-regression.test.mjs` verifica role/UI e limpeza do chat, mas não exige `setupToken`. `scripts/test-qa-release-target.mjs` valida URL/API e papel administrativo, mas também não verifica o contrato de enrollment. O CI offline da #159 passa sem detectar a regressão.

A #159 remove o fallback de role administrativa por nome, o que é positivo, mas isso não substitui o convite de uso único. A #159 ainda protege `/api/chat/clear` com nome Ricardo **e** role `implementation_admin`; a identidade de proprietário continua baseada em nome, não em ID imutável.

Produção atualmente tem 5 usuários, zero senhas não inicializadas, zero roles vazias e zero nomes duplicados. Portanto, não foi observado usuário atualmente elegível para setup; o achado é um caminho estrutural inseguro para contas futuras ou reabertas, não uma tomada de conta atual demonstrada.

Evidências:
- [Login/setup candidato #159](https://github.com/Reekyi/UpStatus/blob/fix/qa-updateurl-reconciled-20261113/src/server/index.template.ts)
- [Enrollment protegido #74](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/src/server/index.template.ts)
- [Enrollment e rate limit Team Lite #76](https://github.com/Reekyi/UpStatus/blob/team-lite/signaling-transport-candidate/src/server/team-lite-index.template.ts)

## 6. Workflows e release

### Normal
O workflow da #74 tem controles melhores: somente master, checkout SHA exato, projeto esperado, CLI 2.122.1 e deploy apenas de `upstatus`. Entretanto, ele bloqueia a release em `release.json.version === 3.4.7`, que é a mesma versão instalada. É necessário escolher e validar uma nova versão antes de qualquer publicação. O workflow não inclui o preflight de histórico de migrations documentado no checkpoint #89.

### Team Lite
O workflow oficial `team-lite-official/.github/workflows/deploy-production.yml` continua usando CLI `latest` e executa `supabase functions deploy upstatus`, não `upstatus-team-lite`. Se despachado, o workflow pode sobrescrever a função Normal em vez de atualizar Team Lite. O arquivo não foi alterado pela #76. **Não despachar.**

### #159
O workflow próprio da #159 é manualmente acionado apenas para validar o candidato e usa `contents: read`, sem conexão Supabase. O `deploy-production.yml` herdado na branch #159 usa CLI `latest` e não reproduz as proteções de branch/SHA/projeto do workflow #74. A #159 permanece Draft; não é workflow de publicação aprovado.

## 7. Artefatos efetivamente instalados

Decodifiquei os userscripts embutidos nas Edge Functions atuais:

| Produto | Edge Function | Versão da função | Versão do script | Namespace | API usada |
|---|---|---:|---:|---|---|
| Normal | `upstatus` | v480 | 3.4.7 | `upseller` | beta10 |
| Team Lite | `upstatus-team-lite` | v15 | 3.4.30 | `upseller-team-lite` | `upstatus-team-lite` |
| TEST | `upstatus-test` | v281 | 3.3.28 | `upseller` | beta10 |

Normal e TEST compartilham namespace `upseller` e o prefixo GM `upstatus_screen_share_beta8_`. TEST tem updateURL próprio, mas seu `CLOUD_SERVER` e tópico Realtime apontam para produção beta10. O runtime TEST não está isolado.

Produção lista 38 Edge Functions ACTIVE, todas com `verify_jwt=false` no gateway e autenticação customizada esperada no código; 12 slugs começam com `upstatus-test`. Não existe `upstatus-signal` em produção. O laboratório lista somente `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

O guard de build da #159 rejeita produção e o projeto de sinalização isolado, e usa sentinel inerte quando não há configuração. Porém ele não comprova que um project ref arbitrário e sua publishable key pertençam a um projeto full-product dedicado. O projeto full-product TEST ainda não foi comprovado.

## 8. Realtime, voz e compartilhamento de tela

### Produção instalada
- Os três bundles não contêm `private:true` nem `realtime.setAuth()`.
- Normal, Team Lite e TEST assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Os triggers PostgreSQL publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os tópicos não coincidem.
- Snapshot de 14 dias: 125 mensagens, todas `private=false`: 67 `user_status`, 46 `db_change`, 6 `remote_command`, 6 `remote_result`.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies; privilégios SELECT/INSERT efetivos para anon e authenticated.

### Candidatas #74/#76
O evento público `remote_command` foi reduzido a hint para polling autenticado. Porém `signaling_transport_enabled` é lido com default false; `createSignalingTransport` também tem `enabled=false` por padrão. Com o transporte desligado, listeners públicos de `call_signal` e sinalização de tela continuam aceitos. A flag não deve ser ligada antes de existir endpoint server-mediated de produção e teste de compatibilidade.

A função `upstatus-signal-test` v32 existe apenas no laboratório. O template server Normal e o Team Lite não implementam uma rota server-mediated de produção. O endpoint `upstatus-signal` não está implantado.

A função de laboratório v32 mapeia `VOICE_ATTEMPT_CONFLICT` para 409, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`; esse erro pode cair no fallback 500. Não foi feita chamada HTTP real para reproduzir o status.

Não publiquei broadcasts, não injetei comandos/SDP/ICE e não capturei áudio ou tela. O acesso externo efetivo ao canal público não foi reproduzido; o achado é a configuração/caminho de confiança não autenticada observado no código e catálogo.

## 9. RLS, grants, SECURITY DEFINER e Storage

### Produção — snapshot SELECT
- 10 tabelas public com RLS habilitado e zero policies.
- 9 dessas tabelas têm grants para anon e authenticated, incluindo DELETE/INSERT/SELECT/UPDATE, REFERENCES, TRIGGER e TRUNCATE; são 18 grants TRUNCATE somando os dois papéis.
- Default ACLs para anon/authenticated: 120 entradas agregadas nos schemas public, storage, graphql e graphql_public.
- Três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated/service_role.
- O Security Advisor observado às 09:39 UTC reporta 6 WARN (3 funções executáveis por anon e 3 por authenticated) e 10 INFO (RLS sem policies).
- As funções retornam `trigger`; não foi reproduzida invocação RPC direta. Os grants continuam desnecessários e `search_path=public` merece correção.
- `upstatus_broadcast_messages` envia `to_jsonb(OLD/NEW)` completo; o trigger de estado transmite campos de comando/resultado; o trigger de usuários transmite estado.

RLS sem policy nega acesso de linha para os papéis sujeitos a RLS, mas não protege TRUNCATE. Os grants são excessivos; não foi demonstrada execução destrutiva por cliente.

Storage:
- `chat-images`: público, 168 objetos.
- `profile-images`: público, 20 objetos.
- Zero policies próprias em `storage.objects`.

### Laboratório
- 18 tabelas public com RLS e zero policies; zero grants diretos de tabela para anon/authenticated nas tabelas public consultadas.
- Default ACLs para papéis clientes continuam presentes (96 entradas agregadas nos schemas consultados).
- As três funções broadcast têm `search_path=""` e EXECUTE apenas para service_role.
- Advisor: zero WARN e 18 INFO de RLS sem policies.
- Nenhum objeto Storage e nenhuma mensagem Realtime no snapshot.

## 10. AUTH-03, identidade e migrations

Produção:
- 7 migrations no ledger, até `20261027155438 / set_upstatus_upload_limits_20mb`.
- Nenhuma coluna `setup_token_*`; tabela de rate limit de convite ausente.
- `users.name` não possui UNIQUE.
- `upstatus_sessions` guarda `user_name`, não `user_id`.
- `upstatus_profiles` usa `user_name`, não `user_id`.

Laboratório:
- 39 migrations.
- Colunas `setup_token_*`, `upstatus_setup_invite_rate_limits` e tabelas de sinalização presentes.
- `users.name` tem constraint UNIQUE no laboratório; sessões e perfis ainda usam nome.

O checkpoint de master [migration-history preflight](https://github.com/Reekyi/UpStatus/blob/master/docs/checkpoints/2026-11-08-production-migration-history-preflight.md) documenta três versões AUTH-03 exigidas (`20261107010000`, `20261107060000`, `20261107062000`) ausentes do histórico de produção. O teste de preflight foi feito com fetch mockado; não foi executado contra a Management API de produção. A branch Supabase `main` permanece `MIGRATIONS_FAILED`, enquanto o preview está `ACTIVE_HEALTHY`; a causa não foi verificada por falta de logs read-only disponíveis.

## 11. Issues e aceitação manual

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios marcados. Normal e Team Lite ainda precisam de queda real de internet, reconexão sem F5, reentrada, nova chamada e verificação de ausência de peers/pollers órfãos.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): corpo mantém 16/35 itens marcados e referências de PR/heads antigas. O comentário QA dedicado foi atualizado nesta execução; comentário da Engenharia preservado.

Nenhum teste manual em navegador/Tampermonkey, microfone real, captura de tela real ou reconexão física foi executado. Os testes Chromium do CI validam WebRTC/teardown no harness, não o ciclo físico de offline/online do userscript instalado.

## 12. Gates e decisão

| Gate | Estado QA | Evidência/razão |
|---|---|---|
| RT-01 | **blocked** | Realtime instalado público; endpoint autenticado ausente em produção |
| TEST-ISOLATION | **blocked** | TEST instalado aponta API/tópico para produção e colide com namespace/GM Normal |
| MIGRATION-PROVENANCE | **blocked** | Ledger de produção 7 vs laboratório 39; AUTH-03 ausente; main MIGRATIONS_FAILED |
| AUTH-03 | **blocked** | Setup sem convite no runtime instalado e na #159; schema de produção sem tokens/rate limit |
| ACL-STORAGE | **blocked** | Grants/Default ACL amplos, SECURITY DEFINER e buckets públicos sem policies |
| RECONNECT | **pending** | Issue #78 0/8; exige confirmação física de Ricardo |
| HUMAN-REVIEW | **pending** | PRs sem review e sem autorização explícita de release |

**Veredito: NOT READY.** Não calcular percentual geral. Os checks verdes das candidatas não compensam os bloqueadores de runtime, publicação, autenticação, Realtime e aceitação física.

### Próximas ações recomendadas
1. Portar o alinhamento API/distribuição da #159 para #74, preservando setupToken, consumo atômico e rate limit; acrescentar teste explícito para esse contrato.
2. Fazer o validator exigir que Normal `CLOUD_SERVER`, updateURL e função implantada coincidam.
3. Incrementar a versão Normal e revalidar o merge ref após a atualização documental de master.
4. Corrigir workflow Team Lite para `upstatus-team-lite`, CLI pinada, projeto esperado e SHA aprovado; não despachar o workflow atual.
5. Criar projeto full-product TEST independente; substituir o runtime TEST legado somente por procedimento aprovado.
6. Construir/implantar `upstatus-signal` em produção, validar membership/destinatário/replay/expiração/rate limit e só então habilitar transporte autenticado e remover listeners públicos sensíveis.
7. Revisar grants, Default ACL, SECURITY DEFINER/search_path, RLS e política de privacidade dos buckets.
8. Resolver a proveniência das migrations e `MIGRATIONS_FAILED`.
9. Executar os oito critérios físicos da #78 e obter review humana do SHA final.

## 13. Limites e alterações realizadas

Nenhum teste novo foi executado; foram inspecionados logs de CI existentes. Não havia ambiente de navegador/Tampermonkey e dispositivos reais para aceitação física.

Todas as consultas SQL desta execução foram SELECT-only. Não houve alteração de produção, merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva.

A única escrita documental desta execução é este novo relatório na branch QA. O arquivo `docs/RELEASE_READINESS.md` e os arquivos de Engenharia foram preservados.
