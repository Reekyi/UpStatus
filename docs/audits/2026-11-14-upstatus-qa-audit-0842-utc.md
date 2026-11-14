# UpStatus - auditoria independente QA
**Data da execução:** 2026-11-14T08:42:18.358Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Projeto Supabase de produção:** `dlfvkawaiqduhlazsszm`  
**Projeto Supabase de laboratório:** `bfpjtfqlnypisxljoxkb`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA antes deste relatório:** `83e4bd2ac1eb886ecab69041d37197c455be9e30`

## Escopo e classificação

Foram revalidados os heads, PRs #74, #75, #76 e #82, issues #78 e #79, candidatos relacionados #85, #124 e #164, workflows, bundles implantados, Edge Functions, catálogo PostgreSQL, RLS, grants, Default ACL, Realtime, Storage, migrations e Security Advisor.

- **CI PASS/FAIL:** somente resultado de workflow existente no SHA identificado.
- **Inspeção de código:** leitura estática de fonte ou bundle implantado. Não prova exploração ou comportamento físico.
- **Teste manual:** exige navegador/dispositivo real e confirmação humana.
- **Pendente/Bloqueado:** dependência não satisfeita ou evidência ausente.

Nenhum teste foi iniciado ou repetido pela auditoria. Não houve checkout local nem ambiente de navegador/Tampermonkey. Os resultados de CI abaixo foram consultados, não executados por esta auditoria.

## 1. Heads e integridade das branches

| Referência | HEAD / commit | Relação com a base |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | Base atual |
| QA / #82 | `83e4bd2ac1eb886ecab69041d37197c455be9e30` | 300 à frente, 1 atrás de master |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Base Team Lite |
| develop | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | Base de candidatos de upload |
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 à frente, 1 atrás de master |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 à frente de team-lite-official |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | 386 à frente de team-lite-official |
| #85 cutover/upload | `b75707b6eaf678d87863144748b9aed8e2866455` | 48 à frente, 1 atrás de master |
| #124 upload | `77c9d4c3b525325996db973cbec609ae2ddb0d83` | 6 à frente de develop |
| #164 avatar | `a27ced56564f3d18948c70138f6d6b2a1f2d0907` | 30 à frente de develop |

A QA estava exatamente no HEAD informado antes da criação deste arquivo. A PR #82 contém 156 arquivos alterados, todos em `docs/`. Não foi feito rebase, merge ou alteração em branch de Engenharia.

## 2. CI observado

| PR | Resultado no HEAD consultado | Evidência |
|---|---|---|
| #74 Normal | Validate e Signaling Smoke PASS | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| #75 Team Lite | PASS histórico, não é a candidata atual | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite | Candidate Checks PASS | [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| #82 QA | FAIL | [43572055102](https://github.com/Reekyi/UpStatus/actions/runs/43572055102) |
| #85 | Validate PASS no commit `b75707b` | [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) |
| #124 | Validate PASS no commit `77c9d4c` | [42594697302](https://github.com/Reekyi/UpStatus/actions/runs/42594697302) |
| #164 | Validate PASS no commit `a27ced5` | [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) |

A #74 registrou 136/136 checks autenticados e 19/19 não autenticados. O Smoke cobriu WebRTC, áudio/vídeo remoto, mesh de três participantes e rate limit de sinalização. O teste distribuído de rate limit de emissão de convites foi ignorado nessa execução.

A #76 registrou 110/110 checks autenticados e 16/16 não autenticados, além de testes de voz, tela, recuperação, concorrência e Playwright Full-IIFE com endpoints inertes e stubs. É CI automatizado, não aceitação física no Tampermonkey.

### Falha da QA

O log de [43572055102](https://github.com/Reekyi/UpStatus/actions/runs/43572055102) confirma:

```
Built UpStatus 3.4.7 / TEST 3.4.7
VALIDATION FAILED: production updateURL mismatch
```

O builder de master, blob `51fd9983`, gera o updateURL a partir de `upstatus-screen-share-3-1-1-beta10`. O validator de master, blob `b1fa56c2`, exige `/upstatus/upstatus.user.js`. O `release.json` já contém o URL estável, mas o builder atual não consome `release.scriptUrl`.

A #85 contém uma correção candidata para usar o manifesto e coordenar deploy beta10 antes de upstatus. Ela ainda está 48 commits à frente e 1 atrás de master, sem review humana. A falha da #82 é herdada do build de master, não causada pelo Markdown.

## 3. Realtime e comandos remotos

### Bundles efetivamente implantados

Management API retornou os seguintes runtimes e hashes:

| Função | Versão Edge | Userscript/API | SHA da fonte |
|---|---:|---|---|
| `upstatus` | v480 | Normal 3.4.7, distribuidor | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | v15 | Team Lite 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | API Normal | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |
| `upstatus-test` | v281 | TEST legado 3.3.28 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |

Os bundles Normal e Team Lite foram decodificados diretamente das fontes Base64 embutidas nas funções. Ambos criam o canal Realtime com a chave publicável, sem `private:true` e sem `realtime.setAuth()`.

No Normal, o listener `remote_command` confere o destinatário e chama `executeRemoteCommand`. Essa rotina chama `syncSaleSmartly(c.status)` e depois registra o status pela sessão local. O Team Lite também verifica que o próprio usuário está autenticado e que a geração de sessão permanece atual, mas não autentica o emissor do broadcast. Nenhum dos dois comprova criptograficamente a identidade do remetente nem membership emitida pelo servidor antes de aceitar os campos `from`, `to`, `roomId` e o conteúdo de sinalização.

**Limite da conclusão:** não foi feita exploração, injeção de broadcast, chamada externa, captura de áudio ou tela. A configuração de Dashboard `Allow public access` não está disponível no conector. Portanto, a possibilidade de publicação externa no tópico ativo não foi reproduzida.

### Divergência de tópico

Os clientes instalados assinam:

`upstatus-screen-share-live-3-1-1-beta10`

Os triggers PostgreSQL publicam em:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

A consulta read-only de `realtime.messages` encontrou 106 eventos nos últimos 14 dias, todos `private=false`, no tópico antigo: 72 `user_status`, 26 `db_change`, 4 `remote_command` e 4 `remote_result`.

Essa divergência significa que os 106 eventos de origem PostgreSQL não comprovam entrega aos clientes que assinam o tópico beta10. O listener público no bundle continua sendo uma fronteira de confiança insegura se o canal ativo aceitar publicação pública, mas essa condição de Dashboard não foi confirmada.

O trigger `upstatus_broadcast_messages` transmite `to_jsonb(OLD/NEW)` completo. O trigger de estado remoto transmite campos de comando/resultado. O trigger de usuário transmite nome, status, motivo, timestamp e sync. Todos usam `private=false`. Não alinhar os tópicos antes de minimizar o payload.

### Candidatas #74 e #76

Nas fontes candidatas, `signalTransportFlag` é `false` por padrão e `signalTransportEndpoint` começa vazio. Os caminhos de `voiceRoomSend` e `screenShareSend` continuam com fallback para broadcast Realtime quando a flag está desligada.

O endpoint de sinalização server-mediated não está implantado em produção. A função `upstatus-signal` não aparece na lista de produção. No laboratório existe `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`, e `upstatus-signal-e2e-once` v3. O cliente valida que o endpoint tem a mesma origem do servidor, portanto não pode apontar diretamente para o projeto de laboratório.

O helper isolado usa token de sessão, membership, limite de corpo 20 KiB, TTL de evento 2 minutos, TTL de sala 2 horas, 90 eventos/minuto e 240 leituras/minuto. Ainda não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409; mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`.

**Conclusão RT-01:** bloqueado. O transporte autenticado não é padrão, o fallback público continua, e não há endpoint de produção pronto.

## 4. Uploads, avatar e compatibilidade

### Produção

Normal 3.4.7 usa o distribuidor `upstatus` v480 e chama a API beta10 v6. Corrigindo a classificação de auditorias anteriores: o cliente Normal envia `avatarUrl` à API beta10, e essa rota aceita `avatarUrl`. Não há incompatibilidade cliente/backend nesse caminho específico.

Team Lite 3.4.30 chama `upstatus-team-lite` v15 e também envia `avatarUrl`.

O problema real nos dois runtimes é ownership: as rotas de perfil verificam apenas o prefixo público do bucket `profile-images`; não vinculam o caminho do objeto ao `users.id` autenticado. Um usuário pode potencialmente associar ao próprio perfil a URL pública de outro objeto de avatar.

As rotas de upload assinado:
- leem JSON sem limite explícito de corpo antes de `req.text()`;
- confiam em MIME e tamanho declarados pelo cliente;
- permitem até 20 MiB;
- criam signed upload com `upsert:true`;
- não inspecionam os bytes que chegam ao Storage.

O cliente também envia `x-upsert:true`. Os anexos do chat usam o mesmo desenho de upload direto.

### Buckets implantados

| Bucket | Público | Limite | Objetos | Tipos principais |
|---|---:|---:|---:|---|
| `chat-images` | Sim | 20 MiB | 168 | Imagens, vídeo, áudio e documentos |
| `profile-images` | Sim | 20 MiB | 20 | PNG, JPEG, WebP, GIF |

Não foram encontradas policies próprias em `storage.objects`. A leitura de objetos em bucket público depende da posse da URL; não há isolamento por usuário comprovado.

### Candidatas de upload

- **#85:** signed upload server-side verifica bucket, path, token, MIME, tamanho declarado e origem HTTPS, mas continua usando `createSignedUploadUrl(..., {upsert:true})`. O cliente faz PUT direto e declara o Content-Type. Validate passou no commit `b75707b`, mas a branch divergiu de master e não tem review.
- **#124:** mantém o mesmo modelo de upload assinado direto, com checks de metadados. Validate passou no commit `77c9d4c`, mas não comprova inspeção dos bytes reais.
- **#164:** candidata baseada em develop, Validate PASS no commit `a27ced5`. O avatar passa a ser server-mediated: corpo limitado a 3 MiB antes do parse, bytes decodificados limitados a 2 MiB, assinatura MIME para JPEG/PNG/GIF/WebP, ownership por prefixo derivado de `users.id` e `upsert:false`. O harness usa Storage mockado, não upload real. Não há decoder/re-encoder integral nem limite de dimensões/pixels. Os anexos do chat continuam assinados diretamente e a mesma proteção não foi portada ao Team Lite.

**Conclusão de upload:** #164 é avanço concreto para avatar, mas não fecha chat, Team Lite nem validação em Storage real.

## 5. PostgreSQL, RLS, grants e SECURITY DEFINER

Consulta read-only de catálogo em produção:

- 10 tabelas públicas com RLS habilitado e zero policies.
- 9 dessas tabelas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER.
- `upstatus_visual_config` não concede esses privilégios aos papéis clientes.
- FORCE RLS está desabilitado.
- Foram observados 166 grant rows para anon/authenticated no conjunto public/realtime/storage.
- As 9 tabelas com grants amplos incluem TRUNCATE. RLS não protege TRUNCATE; nenhuma operação TRUNCATE foi tentada.
- Default ACL: 24 conjuntos, 300 privilégios expandidos, 120 privilégios para anon/authenticated.
- Laboratório: 25 conjuntos, 277 privilégios expandidos, 96 privilégios para anon/authenticated.

As três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, retornam `trigger` e estão ligadas a triggers. O Security Advisor mostra 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policies. A descrição do Advisor de RPC direto é inconsistente com o retorno `trigger`; não foi demonstrada invocação PostgREST. Os grants continuam desnecessários e o search_path deve ser endurecido.

No laboratório, as funções de broadcast têm search_path vazio e EXECUTE restrito, mas ainda há 18 INFO de RLS sem policies. As tabelas de produto do laboratório não concedem grants diretos a anon/authenticated nas consultas realizadas.

## 6. AUTH-03, usuários e Edge Functions

Produção:
- 5 usuários, 319 sessões e 5 perfis.
- `users` possui somente a PK `id`; não há constraint UNIQUE em `name`.
- `upstatus_sessions` e `upstatus_profiles` usam `user_name`, não `user_id`.
- Não existem colunas `setup_token_*`, tabela de setup-invite nem RPC `consume_upstatus_setup_invite`.
- Não foi encontrado rate limit de tentativas de login nos handlers instalados.
- Primeiro acesso continua sem convite único.

Laboratório:
- quatro colunas de setup-token;
- RPC `consume_upstatus_setup_invite`, SECURITY INVOKER, search_path vazio, EXECUTE somente service_role;
- zero buckets Storage e zero fixtures de produto.

Produção tem 38 Edge Functions ACTIVE, todas reportando `verify_jwt=false` no gateway. Isso não prova, isoladamente, ausência de autenticação: os handlers principais usam token próprio (`x-upstatus-token`) e precisam ser revisados rota a rota. O projeto contém também funções legadas/teste/backup ativas.

Funções principais:
- `upstatus` v480;
- `upstatus-team-lite` v15;
- beta10 v6;
- `upstatus-test` v281 dentro do próprio projeto de produção.

O laboratório tem duas funções ativas: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. Não há endpoint server-mediated de sinalização implantado em produção.

**Conclusão AUTH-03:** bloqueado. As estruturas de convite existem apenas no laboratório/candidatas; login e identidade por ID não estão concluídos em produção.

## 7. Migrations, projetos e workflows

Projetos encontrados na organização: somente produção e laboratório.

| Ambiente | Migrations | Storage |
|---|---:|---|
| Produção | 7 | 2 buckets públicos |
| Laboratório | 39 | 0 buckets |

A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

Os quatro arquivos abaixo não existem em master (404 no GitHub Contents API), embora as versões constem no ledger de produção:

- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

### Workflows

- **Normal #74:** CLI pinada 2.122.1 e verificações de projeto/SHA, mas o workflow desse candidato publica somente `upstatus`; não coordena beta10.
- **#85:** candidato mais completo, publica beta10 antes de upstatus e fixa CLI 2.122.1. Mantém guard de versão 3.4.7; o preflight de cutover exige versão estável superior a 3.4.7, então o corte permanece fechado até uma nova versão ser escolhida.
- **Team Lite oficial:** workflow ainda usa CLI `latest` e executa `supabase functions deploy upstatus`, não `upstatus-team-lite`. Não despachar.
- **Team Lite #76:** o workflow de teste usa variável de projeto TEST explícita e CLI 2.122.1, mas não substitui a correção do workflow oficial de produção.
- **Master build:** gera updateURL beta10, enquanto validator exige o endpoint estável `/upstatus/upstatus.user.js`. #85 contém correção candidata, ainda não integrada.

## 8. Issues, reviews e aceitação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos aprovados. Não houve teste Tampermonkey real, queda física de rede, recuperação sem F5, permissão real de microfone/display ou interoperabilidade instalada.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 itens marcados no corpo.
- Não foram encontradas reviews humanas nas PRs #74, #75, #76, #82, #85, #124 ou #164.
- Nenhum teste manual foi realizado nesta execução.

## 9. Gates e recomendação

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, fallback ativo e sem endpoint de produção |
| TEST-ISOLATION | BLOCKED | Só dois projetos; laboratório sem Storage/fixtures; TEST legado dentro da produção |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs históricos ausentes e branch main MIGRATIONS_FAILED |
| AUTH-03 | BLOCKED | Convite e rate limit de login não aplicados em produção; sessões por nome |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, TRUNCATE, buckets públicos e ausência de policies próprias |
| RECONNECT | PENDING | Exige confirmação física de Ricardo; issue #78 permanece 0/8 |
| HUMAN-REVIEW | PENDING | Sem reviews e sem autorização explícita de release |

**Recomendação: NOT READY. Não liberar.**

Prioridades:
1. Tornar sinalização server-mediated o padrão seguro em Normal e Team Lite, remover fallback público e validar sessão, membership, destinatário, replay, expiry e rate limit no servidor.
2. Corrigir o tópico dos triggers e reduzir payload antes de qualquer alinhamento.
3. Portar ownership por ID e upload validado ao Team Lite; concluir decoder/dimensões e proteger anexos do chat.
4. Aplicar AUTH-03 somente após revisão e autorização específicas.
5. Endurecer grants, Default ACL, SECURITY DEFINER e Storage com plano revisado.
6. Recuperar os quatro SQLs originais e diagnosticar MIGRATIONS_FAILED.
7. Corrigir workflows Normal/Team Lite e reconciliar versão/updateURL.
8. Executar os oito testes físicos e obter aprovação humana.

## 10. Limites e segurança desta execução

- Todas as consultas SQL executadas foram SELECT-only.
- GitHub e Supabase foram usados somente para inspeção, exceto a criação deste relatório na branch QA e a atualização do comentário QA dedicado na Issue #79.
- Não houve merge, deploy, release, publicação de userscript, migration, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva.
- Não houve exploração Realtime, broadcast de teste, chamada externa, captura de áudio/tela, teste físico ou rerun manual de CI.
- A configuração de public access do Realtime não está exposta pelo conector.
- O relatório é um checkpoint de auditoria, não autorização de mudança ou release.
