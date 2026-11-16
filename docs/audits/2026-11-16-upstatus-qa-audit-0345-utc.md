# UpStatus — auditoria independente de qualidade
**Execução:** 2026-11-16 03:45 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase isolado:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY — não liberar**

## 1. Escopo e método

Revalidação read-only de `docs/RELEASE_READINESS.md`, heads reais, PRs #74/#75/#76/#82 e candidatas relacionadas, issues #78/#79, workflows, logs de CI, fontes dos Edge Functions implantados, catálogos PostgreSQL, Security Advisor, migrations e logs Supabase.

**Classificação:** CI significa somente resultado do workflow já registrado no HEAD indicado. Inspeção de código/catálogo não é teste de execução. Nenhum workflow foi disparado ou repetido. Nenhum teste manual em Tampermonkey/Sale Smartly foi executado.

O documento-base `docs/RELEASE_READINESS.md` foi lido integralmente. Seu último snapshot interno termina em **2026-11-15 06:30 UTC** e não contém as verificações desta execução.

## 2. Heads reais e governança de branches

| Branch | HEAD confirmado | Relação com master |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | base |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | 114 à frente / 147 atrás |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | 220 à frente / 147 atrás |
| QA `qa/release-readiness-2026-11-04-master` | `06edc123b0b9ddea5af14bea9d264588dced84e6` | 356 à frente / 1 atrás |

Comparações feitas contra master. A QA permanece documental; não houve rebase.

**Novo achado de governança:** a API do GitHub reporta `protected=false` para master, develop, team-lite-official e QA. `protection.enabled=false` e `required_status_checks.enforcement_level=off` nas quatro branches. Portanto, não há proteção de branch nem checks obrigatórios impostos no servidor para impedir push direto ou bypass de CI.

Referências: [master](https://api.github.com/repos/Reekyi/UpStatus/branches/master) · [develop](https://api.github.com/repos/Reekyi/UpStatus/branches/develop) · [team-lite-official](https://api.github.com/repos/Reekyi/UpStatus/branches/team-lite-official) · [QA](https://api.github.com/repos/Reekyi/UpStatus/branches/qa/release-readiness-2026-11-04-master).

## 3. PRs e CI nos HEADs examinados

| PR | HEAD | Resultado observado | Classificação |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Validate 43376770142 e Smoke 43376770200 SUCCESS | CI histórico aprovado |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks 41674353127 SUCCESS | baseline histórica, não candidata ativa |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Candidate Checks 43363871881 SUCCESS | CI aprovado |
| #82 QA | `06edc123b0b9ddea5af14bea9d264588dced84e6` | Validate 43793937512 FAILURE | CI falhou |
| #161 Normal | `557814dc31bed779b84a2094358dc6b2a7e67689` | Validate 43479685384 e Smoke 43479685445 SUCCESS | CI aprovado |
| #167 Normal | `d25b3fbe1bd28a222d45ead6a467ceb7fd00548a` | Validate 43784897392 SUCCESS | Validate apenas; sem Smoke |
| #168 Retry-After | `c6de3eb29bb419e817a237487185df0df752015d` | Validate 43755941462 SUCCESS | Validate apenas; sem Smoke |
| #170 Normal | `693039eddbd01e210fd1344b0196703ca067f374` | Validate 43762594686 FAILURE | CI falhou |

As PRs principais #74/#75/#76/#82 continuam abertas/Draft e sem reviews submetidas. As candidatas #161/#167/#168/#170 também não têm aprovação humana registrada.

### #82: falha herdada, não causada pelo conteúdo documental

A #82 contém **199 arquivos alterados e todos estão em `docs/`**; não há arquivos de runtime, workflow ou migration no diff. O job falha em `scripts/validate.mjs`:

```
Built UpStatus 3.4.7 / TEST 3.4.7
VALIDATION FAILED: production updateURL mismatch
```

Evidência: [Validate #82, run 43793937512](https://github.com/Reekyi/UpStatus/actions/runs/43793937512). Não enfraquecer o validator para fazer o PR documental ficar verde; corrigir o contrato de build na linha de engenharia.

### #170 versus #167: contratos de anexos incompatíveis

O log da #170 falha com:

```
CHAT REGRESSION FAILED: files are staged instead of uploaded immediately
```

A #167 mudou o fluxo para anexos pendentes no compositor, com preview e envio junto da mensagem. A #170 ainda espera upload imediato. A falha é uma regressão de contrato entre candidatas, não evidência de falha do Storage implantado.

Evidência: [Validate #170, run 43762594686](https://github.com/Reekyi/UpStatus/actions/runs/43762594686).

### #167: melhor base para uploads, mas não release

A #167 passou nos contratos offline de upload cliente/servidor e nas regressões de chat: [Validate 43784897392](https://github.com/Reekyi/UpStatus/actions/runs/43784897392). O job confirma validação de rota, bucket, MIME/tamanho declarados, origem, caminho, token de upload, PUT e wiring da UI.

A inspeção do código candidato encontrou:
- `signedUploadRoute` permite apenas buckets `chat-images` e `profile-images`, aplica allowlist de MIME, limite declarado de 20 MiB, caminho aleatório, URL assinada e validação de origem/path/token;
- o servidor confia no MIME e tamanho declarados pelo cliente; não inspeciona magic bytes nem conteúdo real;
- o cliente faz PUT direto para o Storage e recebe URL pública;
- os buckets de produção continuam públicos, então signed upload não equivale a leitura privada;
- não houve Smoke nem transferência real para Storage neste HEAD;
- a versão do artefato continua 3.4.7;
- o build desta branch lê `release.json.scriptUrl` para o updateURL, mas mantém `CLOUD_SERVER` apontando para beta10.

A #167 também protege a limpeza do chat com o papel persistido `implementation_admin`, mas sua função de primeiro setup ainda contém o fluxo legado sem convite.

### #161 + #168: correções de autenticação e destino Normal

A #161 é a candidata que alinha o `CLOUD_SERVER` Normal com a função `upstatus`, usa `release.json.scriptUrl`, exige setup token de 64 caracteres e consome convite por RPC. O rate limit de emissão usa RPC distribuída com limite de cinco por administrador em quinze minutos e falha fechada se a RPC falhar.

O Smoke da #161 passou inclusive as etapas de consumo atômico de convite e rate limit distribuído de emissão. O Smoke antigo da #74 havia pulado a etapa de rate limit de emissão porque o harness ainda não existia naquele HEAD.

A #168 acrescenta `Retry-After: 900` e `Access-Control-Expose-Headers: Retry-After`; o Validate passou, mas não há Smoke ou resposta HTTP real observada. Os 900 segundos são um intervalo conservador, não o tempo restante calculado.

**Integração necessária:** #167 é baseada em master; #161/#168 formam outra linha candidata. Não há um único HEAD com uploads assinados/anexos pendentes + API Normal alinhada + setup token/rate limit + Retry-After. Integrar os contratos sem descartar a proteção de nenhum deles e rodar Validate + Smoke completos. A versão deve ser incrementada acima de 3.4.7 e o guard de release atualizado; manter 3.4.7 impede clientes já nessa versão de receberem a atualização.

### #76 Team Lite

A candidata #76 usa 3.4.31, contém setup token/consumo de convite e verifica papel persistido para limpeza do chat. Candidate Checks passou. A branch oficial continua em 3.4.30.

A #76 também tem um transporte server-mediated opt-in, mas `signaling_transport_enabled` default é false. O cliente ainda não usa `private:true` nem `setAuth()`; os listeners legados de voz/tela permanecem ativos quando a flag não é ligada. Portanto, CI de WebRTC não fecha RT-01.

### #172: fast-forward restrito à candidata

A #172 foi marcada merged por fast-forward na linha candidata. O commit `01ef40243140015e36e303447a3e158ec37a040e` é ancestral do HEAD atual da #167 `d25b3fbe...` (a #167 está dois commits à frente, zero atrás). Nenhuma branch oficial foi atingida. **Recomendação QA: manter esse fast-forward na candidata #167; não há motivo técnico para rollback documental.** Isso não autoriza merge em master.

## 4. Workflows de publicação

### master — produção Normal

O workflow atual é manual (`workflow_dispatch`), lê `release.json`, exige exatamente 3.4.7, instala Supabase CLI `latest` e publica somente `upstatus`. Não fixa o CLI. O project ID vem de secret genérico e o workflow não valida explicitamente o ref/SHA nem compara o destino com uma allowlist de produção.

[Workflow master](https://github.com/Reekyi/UpStatus/blob/master/.github/workflows/deploy-production.yml).

### team-lite-official — bloqueador de publicação

O workflow atual lê o `release.json` raiz, rejeita apenas pre-release, instala CLI `latest` e executa:

```
supabase functions deploy upstatus --project-ref "$SUPABASE_PROJECT_ID" --use-api
```

Isso publica o slug Normal, não `upstatus-team-lite`. **Não despachar o workflow atual.**

[Workflow Team Lite oficial](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml).

Há candidatas de guard/preflight/review (#125/#126/#128/#129); seus checks específicos de dispatcher, preflight, provenance e desativação do legado passaram, mas continuam Draft/não integradas. A #125 ainda falha no Validate herdado de updateURL.

### develop — TEST

O workflow atual tem push automático e despacho manual, usa `SUPABASE_PROJECT_ID` genérico e CLI `latest`, publicando `upstatus-test`. A #74 propõe `SUPABASE_TEST_PROJECT_ID`, rejeita explicitamente produção e o projeto isolado de signaling/auth, valida formato de project ref e fixa CLI 2.122.1. Essa proteção está na candidata, não em develop.

[Workflow TEST atual](https://github.com/Reekyi/UpStatus/blob/develop/.github/workflows/deploy-test.yml) · [Workflow TEST candidato #74](https://github.com/Reekyi/UpStatus/blob/chore/continuity-foundation/.github/workflows/deploy-test.yml).

## 5. Runtimes Edge implantados

| Runtime | Revisão | Userscript embutido | API |
|---|---:|---|---|
| produção `upstatus` | v480 | Normal 3.4.7 | cliente chama beta10 v6 |
| produção `upstatus-screen-share-3-1-1-beta10` | v6 | API legada | beta10 |
| produção `upstatus-team-lite` | v15 | Team Lite 3.4.30 | Team Lite v15 |
| produção `upstatus-test` | v281 | TEST 3.3.28 | função no projeto de produção |
| laboratório `upstatus-signal-test` | v32 | helper de signaling | somente laboratório |
| laboratório `upstatus-signal-e2e-once` | v3 | helper E2E | somente laboratório |

Produção tem 38 Edge Functions ACTIVE; as funções consultadas reportam `verify_jwt=false`. Isso isoladamente não prova ausência de autenticação: os handlers principais usam sessão própria por `x-upstatus-token`. Porém, os endpoints de setup são anteriores ao contexto autenticado.

Decodifiquei os userscripts embutidos de Normal e Team Lite:
- Normal 3.4.7 distribui por `/upstatus/upstatus.user.js`, mas `CLOUD_SERVER` continua em `upstatus-screen-share-3-1-1-beta10`;
- Team Lite 3.4.30 usa `upstatus-team-lite`;
- ambos assinam `upstatus-screen-share-live-3-1-1-beta10`;
- nenhum usa `private:true` ou `realtime.setAuth()`.

Não existe função de signaling server-mediated implantada na produção. O helper `upstatus-signal-test` v32 existe somente no projeto isolado.

## 6. AUTH-03 e autorização administrativa

Inspeção das fontes implantadas de `upstatus` v480 e `upstatus-team-lite` v15 confirmou:
- `GET /api/account?name=` revela se a conta precisa de setup;
- `POST /api/setup` chama `login(req,true)` sem setup token/convite;
- se o papel está vazio, o setup legado atribui `implementation_admin` por fallback nominal para Ricardo/Lohan/Guilherme;
- `POST /api/chat/clear` autoriza somente por `name === "Ricardo"`, sem verificar papel persistido.

Produção tem cinco usuários, nenhum sem hash de senha e nenhum sem papel no snapshot. Não foi reproduzida tomada de conta; o achado é o fluxo legado latente.

No laboratório, existem quatro colunas `setup_token_*`, a RPC `consume_upstatus_setup_invite`, tabela de rate limit e RPC `consume_upstatus_setup_invite_rate_limit`. O laboratório não tem usuários/fixtures, portanto não demonstra a integração de ponta a ponta.

## 7. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime produção

SELECT-only em `realtime.messages`:
- RLS true, FORCE RLS false, zero policies;
- grants SELECT/INSERT/UPDATE efetivos para anon e authenticated;
- 106 linhas no snapshot, todas `private=false`, em um tópico de trigger;
- tópico dos triggers: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`;
- tópico dos clientes instalados: `upstatus-screen-share-live-3-1-1-beta10`, portanto não coincide.

O trigger `upstatus_broadcast_messages` transmite `to_jsonb(OLD/NEW)` completo como `db_change`; os triggers de remote state e status também enviam metadados. Não foi feita exploração nem prova de subscriber externo; a configuração do Dashboard `Allow public access` não é exposta pelo conector. O achado é o canal não privado e o caminho de confiança sem identidade de remetente verificada.

### SECURITY DEFINER e permissões

Produção:
- 10 tabelas public com RLS e zero policies;
- nove dessas tabelas têm grants diretos amplos para anon/authenticated: 126 grants no total, incluindo 18 TRUNCATE;
- três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, com EXECUTE efetivo para anon/authenticated/service_role;
- Security Advisor: 6 WARN (3 funções × 2 papéis) e 10 INFO (RLS sem policy).

As três funções retornam `trigger` e estão ligadas a triggers. Não foi demonstrada chamada PostgREST bem-sucedida dessas funções; o grant EXECUTE é desnecessário e o search_path é amplo, mas não alegar exploração RPC.

Laboratório:
- 18 tabelas public com RLS e zero policies, mas zero grants diretos de tabela para anon/authenticated;
- as três funções broadcast têm search_path vazio e EXECUTE negado a anon/authenticated, permitido a service_role;
- Security Advisor: 0 WARN e 18 INFO;
- default ACLs de anon/authenticated ainda aparecem em public/storage, além de grants em `realtime.messages` e `storage.objects`.

### Storage

Produção:
- `chat-images`: público, 168 objetos, limite 20 MiB;
- `profile-images`: público, 20 objetos, limite 20 MiB;
- `storage.objects`: RLS true, zero policies, grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated.

O upload assinado candidato controla a criação do objeto, mas bucket público continua permitindo leitura pública. A #167 não verifica o conteúdo real dos bytes nem coloca objetos em quarentena privada.

## 8. Migrations, projeto isolado e logs

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Migrations no ledger | 7 | 39 |
| Edge Functions | 38 | 2 |
| Usuários | 5 | 0 |
| Mensagens | 302 | 0 |
| Buckets/objetos | 2 / 188 | 0 / 0 |

A branch gerenciada Supabase `main` está `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`. O laboratório não é Full-Product TEST.

Os quatro SQLs originais retornaram HTTP 404 tanto em master quanto na QA:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

Não reconstruí nenhum SQL por inferência.

Nos logs Supabase das últimas 24 horas, as únicas fontes observadas foram `pgbouncer_logs` e `postgres_logs`; não havia Edge/Function logs. Portanto, não há base para calcular HTTP 402 nem declarar recuperação de disponibilidade nesta execução.

## 9. Issues e aceitação física

- Issue #78: OPEN, **0/8** critérios aprovados.
- Issue #79: OPEN, **16/35** itens marcados.

Os critérios físicos pendentes incluem perda real de internet, reconexão Normal/Team Lite sem F5, reentrada na sala, novas chamadas, áudio bidirecional, microfone/display reais e ausência de peers/pollers órfãos.

Nenhum teste manual foi realizado. Não havia sessão Tampermonkey/Sale Smartly autenticada nem dispositivos reais. Os checks CI citados são resultados históricos dos HEADs indicados, não execuções desta auditoria.

## 10. Gates e próximos passos

| Gate | Estado QA | Evidência |
|---|---|---|
| RT-01 | blocked | 106 mensagens públicas, zero policies e tópicos divergentes |
| TEST-ISOLATION | blocked | laboratório sem fixtures, buckets ou objetos de produto |
| MIGRATION-PROVENANCE | blocked | quatro SQLs 404 e main em MIGRATIONS_FAILED |
| AUTH-03 | blocked | runtimes implantados ainda usam setup legado |
| ACL-STORAGE | blocked | grants amplos, broadcasts SECURITY DEFINER e buckets públicos |
| RECONNECT | pending | Issue #78 0/8; depende de teste físico |
| HUMAN-REVIEW | pending | PRs Draft e sem review humana |

Prioridade recomendada:
1. Integrar #167 com #161/#168 em um único HEAD Normal, preservando anexos pendentes, signed upload, API `upstatus`, setup token/rate limit e Retry-After.
2. Incrementar a versão acima de 3.4.7 e validar manifesto, artefato, updater e cutover coordenado.
3. Corrigir o workflow Team Lite para slug/projeto/ref/CLI corretos e manter os guards de #125/#126/#128/#129.
4. Tornar Realtime privado/autorizado ou concluir transporte server-mediated com identidade, membership, destinatário, replay/expiry e rate limit; não ativar a flag enquanto endpoint de produção não existir.
5. Endurecer grants/default ACLs, SECURITY DEFINER e Storage; decidir privacidade dos buckets e adicionar validação de conteúdo/quarentena.
6. Recuperar os quatro SQLs de fonte autoritativa e diagnosticar MIGRATIONS_FAILED.
7. Provisionar Full-Product TEST, obter reviews independentes e concluir os oito critérios físicos da #78.

## 11. Integridade desta execução

Produção e laboratório permaneceram read-only. Todas as consultas SQL foram SELECT-only. Não houve merge em branch oficial, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs, alteração de fixtures ou operação destrutiva.

A única escrita de produto foi este novo relatório na branch QA dedicada. Nenhum arquivo existente foi sobrescrito.
