# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-15 07:43 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Projetos Supabase:** produção `dlfvkawaiqduhlazsszm`; laboratório `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## Escopo e método

Foi lida a versão atual de `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`. O último adendo nela registrado antes desta rodada era o checkpoint de 2026-11-15 06:30 UTC.

Foram reconsultados heads, PRs, reviews, commits, workflows, logs de CI, Issues #78/#79, catálogos PostgreSQL, Security Advisor, Edge Functions, migrations e logs de produção/laboratório. Todas as consultas SQL executadas nesta rodada foram SELECT-only.

Classificação:
- **CI PASS/FAIL:** resultado de workflow existente no SHA indicado. Nenhuma suíte foi iniciada novamente nesta rodada.
- **INSPEÇÃO DE CÓDIGO/CATÁLOGO:** leitura estática ou consulta read-only; não equivale a exploração ou teste de runtime.
- **MANUAL PENDENTE:** requer navegador/dispositivo real ou confirmação humana.
- **BLOQUEADO:** dependência objetiva impede concluir a validação.

Não houve teste manual, merge, deploy, release, publicação de userscript, migration, alteração de secret/flag/grant/policy/ACL ou operação destrutiva.

## 1. Heads e governança

Heads confirmados pela API de branches no momento da auditoria:

| Branch | HEAD | Protected |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | false |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | false |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | false |
| `qa/release-readiness-2026-11-04-master` | `350a88ab62ec20b20b182cebd6633d859693758c` | false |

A API de repository rulesets retornou lista vazia. Não há proteção efetiva de branch nem regras obrigatórias de review/checks para as quatro referências consultadas.

Comparação contra o HEAD atual de master:
- PR #74: 887 commits à frente e 1 atrás; 90 arquivos, 13.558 adições e 219 remoções.
- PR #82/QA: 331 commits à frente e 1 atrás; 179 arquivos, 45.004 adições e nenhuma remoção. A comparação de arquivos confirma que o conteúdo divergente é documental.
- PR #76: 327 commits à frente do HEAD da #75, sem commits atrás; 57 arquivos no metadado da PR, 12.020 adições e 161 remoções.

O metadado de base das PRs #74/#82 ainda apontava para o SHA anterior `a9288ccf`, enquanto a branch master já está em `9d40461`. As comparações atuais mostram que ambas estão um commit atrás de master.

## 2. PRs, reviews e CI

Todas as PRs #74, #75, #76 e #82 permanecem abertas e Draft. A API de reviews retornou arrays vazios para as quatro. Não há aprovação humana registrada.

| PR | HEAD | Resultado observado |
|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | Validate PASS e Smoke PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | PASS histórico; sem execução recente no HEAD consultado |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Candidate Checks PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `350a88ab62ec20b20b182cebd6633d859693758c` | Validate FAIL |

### Evidências detalhadas

- [#74 Validate — run 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): passou no guard de build TEST e no Validate.
- [#74 Smoke — run 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): checks não autenticados e integração/browser autenticados passaram; rate limit distribuído de sinalização, recibos de leitura e consumo único de convite passaram. O passo de sintaxe do teste de rate limit de emissão de convites e o teste distribuído de emissão de convites foram **skipped**, portanto essa parte não está comprovada por este run.
- [#75 Candidate Checks — run 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico, não é uma nova validação da linha atual.
- [#76 Candidate Checks — run 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881): todos os passos observados concluíram com sucesso, incluindo guard de isolamento, adaptador autenticado, enrollment, recuperação de voz/tela, contrato HTTP, Chromium com IIFE completo e stubs de Tampermonkey, testes integrados, rate limits e consumo atômico de convites.
- [#82 Validate — run 43686124447](https://github.com/Reekyi/UpStatus/actions/runs/43686124447): falhou em `scripts/validate.mjs:26` com `VALIDATION FAILED: production updateURL mismatch`. O log confirma que o build gerou UpStatus 3.4.7 / TEST 3.4.7 antes da asserção falhar. O novo SHA documental da QA não recebeu outro Validate; o workflow ignora alterações somente em docs.

#76 é continuação da #75, não uma entrega independente. Não somar os dois resultados como duas versões prontas.

## 3. Workflows e cadeia de publicação

### Team Lite oficial

Arquivo: [`.github/workflows/deploy-production.yml`](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml), blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`.

O workflow:
- lê `./release.json` da raiz, não `team-lite/release.json`;
- verifica somente `release.json.preRelease`;
- executa o Validate raiz;
- instala Supabase CLI `latest`;
- usa `secrets.SUPABASE_PROJECT_ID` sem verificar explicitamente o ref esperado;
- executa `supabase functions deploy upstatus`.

O manifesto raiz declara versão 3.4.7 e URL do userscript Normal. O manifesto Team Lite declara coreVersion 3.4.7, buildVersion 3.4.30, canal stable e URL própria na branch `team-lite-official`.

**Conclusão:** o workflow oficial Team Lite continua apontando para o manifesto e slug Normal. Não despachar. O fato de o workflow ser manual não reduz o risco do destino errado.

### TEST

O workflow atual de `develop` dispara em push e workflow_dispatch, usa `secrets.SUPABASE_PROJECT_ID`, CLI `latest` e não contém a mesma verificação explícita de projeto encontrada no candidato.

O workflow candidato em #76 é mais seguro: manual-only, usa `vars.SUPABASE_TEST_PROJECT_ID`, rejeita produção e o projeto isolado de sinalização, verifica formato e consistência do ref, fixa CLI 2.122.1 e publica `upstatus-test`. Ele ainda faz checkout de `develop`, e não publica o código candidato Team Lite. Não está integrado à branch oficial.

O workflow `team-lite-candidate.yml` é de CI, não de deploy. Ele testa pushes na branch oficial, mantém filtros de caminho para PR e serializa os testes compartilhados do projeto isolado.

## 4. Supabase — estado dos projetos

Ambos os projetos retornaram `ACTIVE_HEALTHY`:
- Produção: região us-west-2, PostgreSQL 17.11.0.002.
- Laboratório `upstatus-security-test`: região sa-east-1, PostgreSQL 17.11.0.003.

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Edge Functions ACTIVE | 38 | 2 |
| Migrations no ledger | 7 | 39 |
| Usuários | 5 | 0 |
| Mensagens | 302 | 0 |
| Sessões | 319 | 0 |
| Perfis | 5 | 0 |
| Buckets | 2 | 0 |
| Objetos Storage | 188 | 0 |

O laboratório não é Full-Product TEST: não tem usuários, sessões, mensagens, perfis, buckets ou objetos. Ele é um projeto isolado para sinalização/autenticação.

## 5. Realtime, RLS, grants e SECURITY DEFINER

### Produção

A consulta de `realtime.messages` encontrou 106 eventos no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os 106 estão com `private=false`. O último evento registrado foi em 2026-11-13 20:52:22 UTC.

As definições SQL atuais confirmam:
- `upstatus_broadcast_messages()` envia `to_jsonb(OLD/NEW)` no campo `record`, incluindo a linha completa da mensagem;
- `upstatus_broadcast_remote_state()` transmite campos de comando/resultado, como sender, target, status, reason, createdAt e error;
- `upstatus_broadcast_users()` transmite name, status, reason, updated_at e sync.

As três funções são SECURITY DEFINER, usam `search_path=public` e têm EXECUTE para anon e authenticated. O Security Advisor observou 10 INFO de RLS sem policies, 3 WARN para anon e 3 WARN para authenticated, citando os três endpoints RPC.

Dez tabelas públicas têm RLS sem policies. Nove delas ainda têm grants diretos para anon e authenticated: 126 concessões somadas (sete tipos de privilégio para cada um dos dois papéis em nove tabelas). Isso inclui 18 grants TRUNCATE. RLS não substitui a remoção de privilégios TRUNCATE; não foi reproduzida chamada REST que execute TRUNCATE.

Os Default ACLs de produção continuam amplos para postgres em public/storage e para supabase_admin em public/graphql/graphql_public. Storage:
- `chat-images`: público, 168 objetos, limite 20 MiB;
- `profile-images`: público, 20 objetos, limite 20 MiB;
- zero policies próprias em `storage.objects`.

### Laboratório

As três funções de broadcast continuam SECURITY DEFINER, mas agora têm `search_path=''` e EXECUTE somente para service_role. Os payloads foram minimizados para `{op: TG_OP}`, inclusive mensagens e comandos/resultados remotos.

Isso é um hardening real no laboratório, mas os broadcasts continuam com `private=false`. O laboratório também mantém grants de cliente em Storage e Realtime; não há buckets/objetos de produto nem eventos Realtime de teste nesta fotografia.

Os Default ACLs de postgres em public estão restritos a service_role, mas storage e os defaults de supabase_admin em public/graphql/graphql_public continuam amplos.

**RT-01 permanece bloqueado:** a produção transmite conteúdo/metadados em tópico público; o laboratório não é prova de rollout privado/autorizado.

## 6. Edge Functions e autenticação

A produção tem 38/38 Edge Functions ACTIVE. Duas são os produtos principais (`upstatus` v480, código 3.4.7; `upstatus-team-lite` v15, código 3.4.30). `upstatus-screen-share-3-1-1-beta10` v6 continua ativo como backend legado. Há ainda 35 endpoints auxiliares test/beta/backup ativos. Todos reportam `verify_jwt=false` na plataforma; os handlers principais inspecionados usam sessão própria, então esse campo isolado não prova ausência de autenticação.

O endpoint `upstatus-test` v281, código 3.3.28, também permanece ACTIVE em produção. Inspeção do código confirma:
- GET `/api/account` responde `needsSetup` sem autenticação, permitindo enumeração do estado de setup;
- POST `/api/setup` não exige token de convite e configura conta existente sem password_hash;
- fallback de role usa nomes fixos (Ricardo/Lohan/Guilherme) para atribuir `implementation_admin`;
- POST `/api/chat/clear` verifica apenas `name === "Ricardo"`, sem exigir papel persistido.

Nos runtimes principais atuais, Normal exige senha mínima de 6 caracteres e Team Lite 4. Ambos mantêm setup sem convite e fallback de papel por nome. O login usa sessão própria, mas isso não corrige a autorização do fluxo de setup.

O upload assinado valida MIME e tamanho declarados pelo cliente e gera URL assinada sem inspecionar os bytes do arquivo. A função `sniffMime()` retorna o MIME declarado quando não reconhece assinatura. Isso é inspeção de código; nenhum arquivo malicioso foi enviado. Os buckets públicos aumentam o impacto potencial de conteúdo incorreto.

## 7. HTTP 402 — disponibilidade

Na janela de 24 horas de 2026-11-14 07:37:30 UTC a 2026-11-15 07:37:30 UTC foram observadas **94 respostas HTTP 402 em produção**:
- 24 GET + 1 HEAD do userscript Team Lite;
- 21 GET + 1 HEAD do userscript Normal;
- 21 GET em `upstatus-screen-share-3-1-1-beta10/api/chat`;
- 10 GET em `/api/status`;
- 10 GET em `/api/remote-status`;
- 6 GET em `/realtime/v1/websocket`.

Os seis registros de gateway confirmam respostas 402 no handshake WebSocket do Realtime. O intervalo observado foi aproximadamente 16:32–20:57 UTC em 14/11.

No laboratório foram observadas 19 respostas 402 em chamadas de `upstatus-signal-test`, incluindo health, criação/abertura de sala, broadcast e rotas de sala, concentradas em 17:10:45 UTC.

**A causa não foi determinada.** Os logs provam as respostas HTTP 402, mas não provam que a causa seja quota, billing ou plano. Não há evidência nesta rodada de recuperação posterior nem acesso ao Usage/Billing para fechar a causa. O teste integrado deve continuar bloqueado até o responsável do projeto confirmar a recuperação.

## 8. Migrations e aceitação

O ledger de produção contém sete migrations. Quatro arquivos originais continuam ausentes em master (GitHub Contents API retorna 404):
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

O laboratório tem 39 migrations, mas isso não substitui a proveniência dos SQLs de produção. Não reconstruir esses arquivos a partir do schema.

[Issue #78](https://github.com/Reekyi/UpStatus/issues/78) continua OPEN com 0/8 critérios marcados. Os oito itens de reconexão/voz, áudio, integridade de peers e teste manual seguem pendentes.

[Issue #79](https://github.com/Reekyi/UpStatus/issues/79) continua OPEN com 16 itens marcados e 19 desmarcados.

Nenhum teste manual foi executado nesta rodada. Não havia navegador Tampermonkey/dispositivos reais disponíveis. CI de Chromium e stubs não substituem reconexão física sem F5, permissões reais de microfone/tela e interoperabilidade instalada Normal ↔ Team Lite.

## 9. Gates e recomendação

| Gate | Estado | Evidência resumida |
|---|---|---|
| RT-01 | BLOCKED | 106 eventos de produção, todos private=false; payload completo; funções executáveis por anon/authenticated |
| TEST-ISOLATION | BLOCKED | laboratório vazio e 19 respostas 402 |
| MIGRATION-PROVENANCE | BLOCKED | quatro SQLs originais retornam 404 |
| AUTH-03 | BLOCKED | setup sem convite, fallback de role por nome, autorização de limpeza sem papel persistido |
| ACL-STORAGE | BLOCKED | grants/Default ACL amplos, buckets públicos sem policies próprias |
| RECONNECT | PENDING | Issue #78 0/8; teste físico não executado |
| HUMAN-REVIEW | PENDING | PRs Draft, sem reviews; sem autorização de release |

**Recomendação: NOT READY.**

Prioridades:
1. Investigar causa e recuperação dos HTTP 402 em produção e laboratório via responsável com acesso a Usage/Billing.
2. Corrigir workflow Team Lite (manifesto correto, slug `upstatus-team-lite`, projeto/SHA fixos, CLI pinada e preflight); não executar o workflow atual.
3. Remover payload completo de broadcasts públicos e coordenar transporte autenticado/privado nos dois clientes.
4. Restringir SECURITY DEFINER, grants, Default ACL, Storage e Realtime.
5. Corrigir AUTH-03, endpoint legado `upstatus-test` e autorização por papel.
6. Validar bytes reais no upload e decidir Storage privado/signed-read.
7. Recuperar os quatro SQLs originais e provisionar Full-Product TEST.
8. Executar os oito critérios físicos da #78 e obter aprovação humana.

## 10. Integridade e limites

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, leitura de secrets, alteração de flags/permissões ou operação destrutiva.

Este arquivo é um novo registro documental na branch QA. O checklist histórico e os comentários da Engenharia não foram alterados.
