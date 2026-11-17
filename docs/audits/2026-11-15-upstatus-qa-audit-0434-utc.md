# Auditoria independente de qualidade do UpStatus — 15/11/2026

**Execução:** 2026-11-15T04:34:30.289Z  
**Resultado:** **NOT READY**  
**Escopo:** Normal, Team Lite, GitHub, Supabase produção e laboratório.  
**Método:** inspeção de código, metadados, CI/logs e consultas SQL somente leitura. Não foi executado teste manual, navegador local ou escrita em produção.

## Resumo executivo

Há quatro bloqueadores de release independentes:

1. O Realtime de produção continua público e o trigger de mensagens transmite OLD/NEW completos.
2. O workflow oficial Team Lite publica a Edge Function Normal (upstatus), não upstatus-team-lite.
3. O Team Lite instalado recebe atualizações de uma URL raw vinculada à branch team-lite-official, que não tem proteção; não há rulesets no repositório.
4. A produção contém a função legada upstatus-test v281 (userscript 3.3.28), com setup sem token de convite e limpeza de chat autorizada apenas pelo nome.

Além disso, não existe projeto Full-Product TEST, quatro arquivos SQL aplicados em produção não existem em master, as permissões de Storage/Realtime continuam amplas e a aceitação física segue 0/8.

## 1. Documento de prontidão e heads

O blob completo de docs/RELEASE_READINESS.md foi lido na branch qa/release-readiness-2026-11-04-master:

- Blob: 7cfbd70886df42ce790c078c224b19284a632595
- 8.409 linhas, aproximadamente 1,045 MB.
- Último checkpoint interno: 08/11/2026 18:30 UTC. O documento é histórico e não reflete as revalidações de 15/11.

Heads consultados:

| Branch | HEAD | Protegida |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | Não |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 | Não |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | Não |
| QA | 4d592fd7d82b067edef9e4bce6eb72e05cacbc04 | Não |

Repository rulesets: lista vazia. A comparação QA → master retornou 327 commits à frente e 1 atrás. A PR #82 contém 176 arquivos, todos em docs/; não há mudança de runtime nesta PR.

## 2. PRs, commits e CI

Todas as PRs obrigatórias permanecem abertas, Draft e sem reviews humanas.

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | PASS | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | PASS histórico | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | PASS | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| #82 QA | 4d592fd7d82b067edef9e4bce6eb72e05cacbc04 | FAIL | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43673511788) |

- #74: 90 arquivos e 887 commits. Validate e Smoke passaram no HEAD exato. O log do Smoke confirma 136/136 verificações autenticadas, WebRTC de chamada/voz/tela, malha de três participantes, rate limit 90 aceitos + 1 HTTP 429, setup enrollment, recibos atômicos e cleanup das fixtures.
- #75: 10 arquivos e 59 commits. PASS histórico, mas é baseline substituída.
- #76: 57 arquivos e 386 commits. 16/16 verificações não autenticadas e 110/110 autenticadas; Playwright/Chromium executou o IIFE Team Lite com stubs de Tampermonkey, WebRTC de chamada/voz/tela, malha de três membros, rate limits, setup invite e cleanup. A comparação #76 contra #75 mostra 327 commits à frente e zero atrás; não contar #75 e #76 como entregas independentes.
- #82: 327 commits e 176 arquivos, somente documentação. O Validate do HEAD exato falhou em scripts/validate.mjs:26: production updateURL mismatch. O commit documental posterior não gera Validate porque o workflow ignora alterações em docs.

Esses resultados são CI. Não são testes físicos de Tampermonkey nem autorização de release.

## 3. Workflows e distribuição

### Bloqueador Team Lite

O workflow oficial [team-lite-official/.github/workflows/deploy-production.yml](https://github.com/Reekyi/UpStatus/blob/team-lite-official/.github/workflows/deploy-production.yml) executa:

    supabase functions deploy upstatus

O alvo esperado é upstatus-team-lite. O arquivo também usa Supabase CLI latest, não confere explicitamente branch/SHA/projeto de destino e não fixa o projeto de produção.

O userscript Team Lite instalado contém @updateURL e @downloadURL apontando para:

    https://raw.githubusercontent.com/Reekyi/UpStatus/team-lite-official/team-lite/upstatus-team-lite.user.js

A branch team-lite-official está sem proteção e não há rulesets. Portanto, o canal de atualização instalado depende de um ref Git mutável, sem barreira de review/checks obrigatórios.

### Outros workflows

- O workflow de produção em master é manual, usa SUPABASE_PROJECT_ID, não verifica explicitamente GITHUB_REF=master, SHA do checkout nem o project ref esperado; usa CLI latest.
- O workflow TEST em develop tem gatilho push, usa o mesmo nome de secret SUPABASE_PROJECT_ID, não possui guard explícito contra produção/laboratório e usa CLI latest. O valor do secret não foi consultado.
- O candidato #74 adiciona checkout SHA, branch master, project ref esperado e CLI pinada.
- O candidato #76 torna o deploy TEST manual e usa vars.SUPABASE_TEST_PROJECT_ID, rejeitando produção e o projeto de fixtures de sinalização; fixa CLI 2.122.1. Esse candidato não corrige o workflow oficial de produção Team Lite.

**Ação recomendada:** não executar o workflow oficial Team Lite até corrigir o slug e adicionar guard de branch, SHA e projeto.

## 4. Runtime Normal / Team Lite

Bundles efetivamente servidos pelas Edge Functions:

| Runtime | Edge version | Userscript |
|---|---:|---:|
| Normal upstatus | v480 | 3.4.7 |
| Team Lite upstatus-team-lite | v15 | 3.4.30 |
| Test legado upstatus-test | v281 | 3.3.28 |

Os bundles Normal e Team Lite atuais usam o tópico upstatus-screen-share-live-3-1-1-beta10, criam o canal sem private:true e não chamam realtime.setAuth().

- Normal recebe remote_command e executa o handler quando o destinatário coincide; não valida a identidade autenticada do publicador.
- Team Lite também verifica a sessão local e a geração de autenticação, mas não autentica o publicador do broadcast.
- Os handlers de call/voice/screen validam campos do payload (from, to, IDs), não uma identidade de emissor criptograficamente/autenticamente vinculada.

Os candidatos #74/#76 incluem transporte server-mediated, mas a flag signaling_transport_enabled começa false e o endpoint começa vazio. O cliente exige HTTPS e mesma origem do servidor de sessão. Existe upstatus-signal-test apenas no laboratório; não existe upstatus-signal em produção. Não é seguro ativar o candidato apontando para outro host.

## 5. Realtime

Snapshot read-only de produção:

| Evento | Registros |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_command | 4 |
| remote_result | 4 |
| **Total** | **106** |

Os 106 registros consultados estão com private=false. O trigger upstatus_broadcast_messages() serializa OLD/NEW completos usando to_jsonb, podendo incluir texto, URLs de anexos e metadados. Os tópicos dos triggers (upstatus-live-6f5e7b31-...) e dos clientes (upstatus-screen-share-live-3-1-1-beta10) não coincidem.

No laboratório, os três triggers publicam somente {op: TG_OP}; as funções têm search_path vazio e não concedem EXECUTE a anon/authenticated. Porém os canais continuam private=false, e realtime.messages continua sem policies e com grants de cliente.

Não foi reproduzido acesso externo aos canais. O risco é confirmado no desenho/configuração, não um vazamento externo comprovado.

## 6. RLS, grants, SECURITY DEFINER e Storage

### Produção

- 10 tabelas públicas com RLS habilitado e zero policies.
- 9 dessas tabelas têm grants diretos para anon/authenticated.
- 126 linhas de grants diretos; 18 grants TRUNCATE.
- realtime.messages: RLS habilitado, zero policies, grants SELECT/INSERT/UPDATE para anon/authenticated.
- Três funções de broadcast SECURITY DEFINER, search_path=public, EXECUTE para anon/authenticated/service_role.
- Security Advisor: 10 INFO de RLS sem policy, 3 WARN para anon e 3 WARN para authenticated.

Storage:

| Bucket | Objetos | Público |
|---|---:|---|
| chat-images | 168 | Sim |
| profile-images | 20 | Sim |

Ambos têm limite de 20 MiB. storage.objects e storage.buckets têm grants SELECT/INSERT/UPDATE/DELETE para anon/authenticated e zero policies próprias.

### Laboratório

- 18 tabelas públicas com RLS e zero policies, mas sem grants diretos para anon/authenticated nas tabelas públicas.
- As funções de broadcast têm EXECUTE restrito a service_role e search_path vazio.
- storage.objects e realtime.messages ainda têm grants de cliente e zero policies.
- Nenhum bucket nem objeto Storage.
- Default ACLs ainda incluem privilégios amplos em schemas public/storage/graphql, especialmente para roles administrativas.

## 7. Edge Functions e autenticação

A organização contém somente dois projetos:

- Produção dlfvkawaiqduhlazsszm, ACTIVE_HEALTHY, 38 Edge Functions ACTIVE e 7 migrations.
- Laboratório bfpjtfqlnypisxljoxkb (upstatus-security-test), ACTIVE_HEALTHY, 2 Edge Functions e 39 migrations.

Não existe Full-Product TEST independente. O laboratório não tem usuários, sessões, perfis, mensagens, buckets nem fixtures de produto.

### Achado adicional: endpoint de teste legado em produção

A função upstatus-test v281 está ACTIVE no projeto de produção e reporta verify_jwt=false. O código usa credencial server-side/service_role e CORS *. O runtime 3.3.28 ainda possui:

- POST /api/setup sem token de convite; configura conta existente sem password.
- Fallback de papel administrativo por nome (Ricardo, Lohan, Guilherme) se o papel estiver vazio.
- POST /api/chat/clear autorizado apenas por name === "Ricardo".

O snapshot atual tem 5 usuários, todos com password e role; não há conta desconfigurada neste momento. Isso reduz a explorabilidade imediata do setup, mas não justifica manter um endpoint legado com escrita privilegiada no projeto de produção. Não encontrei evidência de que os userscripts atuais apontem para upstatus-test.

### AUTH-03

Produção ainda não tem setup-token columns, consumo de convite único ou rate limit de convite/sinalização. O laboratório contém essas estruturas e os testes da #76 passam, mas não estão implantados em produção.

## 8. Upload assinado

O caminho signedUploadRoute valida allowlist de MIME e tamanho declarados pelo cliente e cria URL assinada com upsert:true; não recebe nem inspeciona os bytes do arquivo nesse fluxo. A função sniffMime usada em outro caminho tenta reconhecer assinaturas, mas retorna o MIME declarado quando não reconhece o conteúdo.

O Validate #74 confirma testes de cliente/servidor com Storage mockado. Não houve upload real: o laboratório não tem buckets de chat/perfil e produção foi consultada somente por leitura. Classificação: hardening pendente, não exploit reproduzido.

## 9. Migrations e Issues

A tabela de migrations registra 7 versões em produção e 39 no laboratório. Quatro arquivos originais continuam ausentes em master (HTTP 404):

- 20261023154754_create_upstatus_visual_config.sql
- 20261026195855_add_chat_message_file_name.sql
- 20261027154329_allow_chat_document_mime_types.sql
- 20261027155438_set_upstatus_upload_limits_20mb.sql

Não reconstruir esses arquivos a partir do schema atual e não afirmar proveniência sem recuperar os blobs/commits originais.

- Issue #78: 0/8 critérios físicos marcados; último checkpoint de engenharia encontrado em 08/11/2026. Sem reconexão física sem F5, microfone/tela reais ou interoperabilidade instalada comprovados.
- Issue #79: 16/35 checkboxes marcados no corpo. O corpo contém snapshots históricos; o comentário dedicado QA é atualizado separadamente.

## 10. Gates e recomendação

| Gate | Estado QA |
|---|---|
| RT-01 | blocked |
| TEST-ISOLATION | blocked |
| MIGRATION-PROVENANCE | blocked |
| AUTH-03 | blocked |
| ACL-STORAGE | blocked |
| RECONNECT | pending |
| HUMAN-REVIEW | pending |

**Recomendação de release: NOT READY.**

Prioridades:

1. Remover broadcasts públicos de linhas completas e implantar Realtime privado/autorizado.
2. Desativar/remover o endpoint de teste legado após revisão e substituir setup por convite único.
3. Corrigir o workflow Team Lite (slug, branch/SHA/project guard, CLI pinada) e trocar o updater raw branch por artefato imutável aprovado.
4. Proteger master/develop/team-lite-official/QA com rulesets, checks obrigatórios e review.
5. Integrar transporte autenticado nos dois produtos e habilitar somente após endpoint de mesma origem existir e testes E2E.
6. Endurecer grants, Default ACL, SECURITY DEFINER, Storage e Realtime.
7. Recuperar os quatro SQLs originais.
8. Provisionar Full-Product TEST; depois executar os oito critérios físicos e obter aprovação humana.

## 11. Limites e segurança da execução

- Todas as consultas SQL foram SELECT/catálogo.
- Nenhuma chamada RPC de broadcast foi executada.
- Nenhum teste manual ou navegador Tampermonkey foi executado.
- Nenhum secret foi lido.
- Nenhum merge, deploy, migration, release, publicação de userscript, alteração de flag/grant/policy ou operação destrutiva ocorreu.
- A única escrita no repositório é este relatório novo na branch QA; a única escrita de integração é a atualização do comentário dedicado QA na Issue #79.
