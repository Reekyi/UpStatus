# UpStatus — Auditoria independente de qualidade

**Data da auditoria:** 2026-11-15 15:35 UTC
**Repositório:** Reekyi/UpStatus
**Produção Supabase:** dlfvkawaiqduhlazsszm
**Laboratório Supabase:** bfpjtfqlnypisxljoxkb
**Branch documental:** qa/release-readiness-2026-11-04-master
**Veredito:** NOT READY

## Método e limites

- Leitura integral de docs/RELEASE_READINESS.md na branch QA: 8.422 linhas físicas no GitHub / 5.752 linhas de conteúdo extraído, aproximadamente 1,01 MB. O último checkpoint append-only do documento-base é 2026-11-15 06:30 UTC; este relatório atualiza a evidência para 15:35 UTC.
- Heads, metadados de PRs, reviews, workflows, logs de CI e conteúdo de arquivos foram consultados no GitHub.
- Supabase foi consultado por inventários, logs, Security Advisor, fontes de Edge Functions e SQL exclusivamente SELECT/catalog.
- Não existe checkout local em /workspace, /workspaces, /repo ou /app. /mnt/data está vazio. Nenhum teste local ou manual foi executado.
- Nenhuma suíte foi iniciada pela auditoria. Resultados de CI citados são execuções existentes, não novos testes desta rodada.
- Nenhuma escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/grants/policies/ACLs ou operação destrutiva foi realizada.

## Heads reais e integridade do repositório

| Ref | HEAD | Observação |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | Último commit observado é documental; a base de #74/#82 é a9288cc, um commit atrás |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 | Branch de desenvolvimento |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | Branch oficial Team Lite |
| QA | e9f7b2d4125a44ba36dbec3a855f9741a28f5e97 | HEAD atual confirmado pela PR #82 e ref da branch QA |

master, develop e team-lite-official retornam protected=false. A API de repository rulesets retornou lista vazia. A proteção clássica específica da branch QA não pôde ser consultada pela rota de branches; não declarar esse aspecto como confirmado.

## PRs obrigatórias e CI

| PR | HEAD | Base | Estado | Evidência atual |
|---|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | master a9288cc | Open / Draft | Validate 43376770142 PASS; Smoke 43376770200 PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official 9065bc1 | Open / Draft | Candidate Checks 41674353127 PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | team-lite-official 9065bc1 | Open / Draft | Candidate Checks 43363871881 PASS |
| #82 QA | e9f7b2d4125a44ba36dbec3a855f9741a28f5e97 | master a9288cc | Open / Draft | Validate 43725608876 FAIL: production updateURL mismatch em scripts/validate.mjs:26 |

Não há reviews humanas submetidas nas PRs #74, #75, #76 ou #82. #75 é a baseline anterior e está superada pela linha ativa #76; não tratar como uma entrega independente.

### Evidência de CI e limites

- #74: Validate e Smoke passaram no HEAD exato. O passo de verificação de rate limit de emissão de setup-invites foi SKIPPED; portanto esse resultado não cobre a correção de emissão de convites adicionada posteriormente na #161.
- #76: Candidate Checks passou no HEAD exato, incluindo teste de build TEST, guard de mutação isolada, adapter autenticado, enrollment, recuperação de voz/screen, Chromium com stubs Tampermonkey, integração autenticada, concorrência de rate limit, recibos e setup-invite.
- #82: falha reproduzida no log do run 43725608876: VALIDATION FAILED: production updateURL mismatch. Não alterar o validator para mascarar a divergência.

## Candidatas recentes e compatibilidade

| PR | HEAD | Resultado verificado | Limite |
|---|---|---|---|
| #161 Normal | 557814dc31bed779b84a2094358dc6b2a7e67689 | Validate 43479685384 e Smoke 43479685445 PASS | Migration/RPC ainda não estão em produção; 429 de setup-invite sem Retry-After; release version ainda 3.4.7 |
| #163 Voz | 00f357b0f5921d1995bb52c7b50f53ef8276e334 | Validate 43488822143 e Voice Open HTTP Status Contract 43488822237 PASS | A função lab implantada v32 ainda não mapeia VOICE_ATTEMPT_ALREADY_ACTIVE para HTTP 409 |
| #164 Upload | a27ced56564f3d18948c70138f6d6b2a1f2d0907 | Validate 43544570609 PASS | CI estático; não é teste manual de upload real ou de bytes malformados |
| #165 Normal provenance | 434478771dca54505d3ec8b0cea0ada57d8d6dca | Source Guard 43619801133 PASS; Smoke 43619663747 FAIL | Smoke foi bloqueado por HTTP 402 antes dos testes autenticados |
| #166 Team Lite provenance | e90e0dbbc0c6d89d77ea359dff0f1e82b4428413 | Authenticated Call Source Guard 43624572780 PASS | Guard estático; não equivale a E2E de runtime nem torna Realtime privado |
| #167 Build/chat | d100b0820dd7f98e2b78a98e6b6f8c09f13b1867 | Validate 43635704388 PASS | Não altera o estado vermelho da PR #82, que é outra branch/HEAD |

Todas as candidatas acima permanecem Draft e sem aprovação humana.

### AUTH-03: avanço real, mas ainda não implantado

A #161 adiciona a migration candidata 20261109230000_setup_invite_rate_limit.sql e a RPC consume_upstatus_setup_invite_rate_limit. A tabela usa RLS, não concede privilégios de cliente, a RPC é SECURITY INVOKER, usa search_path vazio e EXECUTE somente para service_role. O handler limita a cinco emissões por administrador em quinze minutos, com bucket baseado em hash da identidade administrativa, antes de ler o corpo da requisição.

O Smoke #161 confirmou 136/136 verificações autenticadas, WebRTC de chamada/voz/tela, mesh de três participantes, rate limit de sinalização 90 aceitas + 1 HTTP 429 com Retry-After 60s, concorrência do rate limit de sinalização, recibos atômicos, enrollment e concorrência/isolamento/cleanup do rate limit de setup-invite.

Não confundir os dois limiters: o Retry-After de 60 segundos observado no log pertence ao rate limit de sinalização. A resposta 429 do limiter de setup-invite não define Retry-After nem expõe orientação equivalente. Isso é uma lacuna do contrato de cliente.

Consultas SELECT-only confirmaram que a tabela e RPC de setup-invite existem no laboratório, mas não existem em produção. Os runtimes implantados Normal v480 e Team Lite v15 também não contêm a chamada à RPC. Se o handler candidato for publicado antes da migration, o caminho fail-closed não terá dependência resolvida e poderá responder 503.

### Proveniência autenticada de sinalização

#165 e #166 removem a confiança no marcador _authenticatedTransport vindo do próprio payload e passam a transportar a proveniência separadamente. É uma correção de integridade do contrato, não uma migração para canal privado. Os clientes ainda usam descoberta pública e os bundles instalados não usam private:true nem realtime.setAuth().

O Smoke da #165 falhou em 19/19 verificações não autenticadas porque o gateway devolveu HTTP 402 em vez dos status esperados 401/405. A resposta do Supabase foi explícita: Service for this project is restricted due to the following violations: exceed_edge_functions_invocations_quota. Os testes autenticados e seguintes foram pulados. Classificar como bloqueio de infraestrutura/quota do laboratório, não como regressão funcional demonstrada.

## Workflows de publicação

### Normal

- Workflow atual em master: .github/workflows/deploy-production.yml, blob 8252c6c6. É manual, usa SUPABASE_PROJECT_ID via secret, instala CLI latest, não fixa o projeto esperado nem valida explicitamente o SHA do checkout. Exige release.json.version exatamente 3.4.7 e preRelease vazio, e publica upstatus.
- Workflow candidato na base #74: blob f3493d19. É mais seguro: exige master, checkout no github.sha, compara SHA, fixa o projeto dlfvkawaiqduhlazsszm e usa Supabase CLI 2.122.1. Porém também exige exatamente 3.4.7.
- A #161 mantém release.json em 3.4.7, igual ao artefato instalado. O build guard exige versão estritamente maior para sincronizar o artefato raiz. Portanto é necessário escolher uma nova versão estável; mas os workflows atuais exigem exatamente 3.4.7. O fluxo de release está contraditório até o guard de versão ser atualizado por revisão.
- A #161 alinha CLOUD_SERVER Normal ao slug upstatus, mas o runtime atualmente implantado v480 ainda contém o userscript 3.4.7 e não tem a RPC de rate limit. O cutover precisa coordenar artefato, backend e migration.

### Team Lite

- Workflow oficial em team-lite-official: .github/workflows/deploy-production.yml, blob e95bab76. O root release.json dessa branch é 3.0.40 com preRelease beta.22; o manifesto próprio team-lite/release.json declara buildVersion 3.4.30 stable. O guard lê o manifesto raiz, então atualmente deve bloquear a execução.
- Se o guard passar, o comando continua publicando supabase functions deploy upstatus, não upstatus-team-lite. O workflow usa CLI latest e SUPABASE_PROJECT_ID por secret, sem projeto esperado, SHA exato ou preflight de migrations. Não despachar.

### TEST

- .github/workflows/deploy-test.yml em develop, blob d4d44fd3, dispara por push em develop e workflow_dispatch. Usa SUPABASE_PROJECT_ID por secret, CLI latest e publica upstatus-test. Não valida que o projeto é o laboratório autorizado, nem fixa o projeto esperado.
- A função upstatus-test v281 está ACTIVE em produção. O secret não foi lido; portanto o destino efetivo do workflow não foi confirmado. A combinação é uma ambiguidade de alto risco.
- Não foi encontrado workflow dedicado de deploy TEST para Team Lite na listagem de .github/workflows de develop.

## Supabase: produção e laboratório

### Edge Functions e versões implantadas

- Produção: 38 Edge Functions ACTIVE; todas reportam verify_jwt=false na camada da plataforma. Isso não prova ausência de autenticação, pois os handlers centrais usam sessão própria x-upstatus-token; exige inventário por função/rota.
- 36 das 38 funções têm nomes históricos de test, beta ou backup. Não desativar em massa sem inventário de dependências e consumidores.
- upstatus v480 contém userscript 3.4.7; upstatus-team-lite v15 contém 3.4.30; upstatus-screen-share-3-1-1-beta10 v6 contém API Normal antiga com userscript embutido 3.1.1-beta8; upstatus-test v281 contém 3.3.28.
- Laboratório: upstatus-signal-test v32 e upstatus-signal-e2e-once v3. A função v32 ainda não mapeia VOICE_ATTEMPT_ALREADY_ACTIVE para 409.
- Os bundles implantados Normal e Team Lite não chamam consume_upstatus_setup_invite_rate_limit; nenhum dos dois clientes embutidos usa private:true ou realtime.setAuth().

### Migrations e proveniência

- Produção tem sete migrations, última 20261027155438. A branch gerenciada main está MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY.
- Laboratório tem 39 migrations, mas zero usuários, sessões, mensagens, salas, memberships, eventos, buckets e objetos de produto. Não é Full-Product TEST.
- Os quatro arquivos abaixo constam no ledger de produção, mas retornaram HTTP 404 no GitHub tanto em master quanto na QA:
  - 20261023154754_create_upstatus_visual_config.sql
  - 20261026195855_add_chat_message_file_name.sql
  - 20261027154329_allow_chat_document_mime_types.sql
  - 20261027155438_set_upstatus_upload_limits_20mb.sql
- Não reconstruir esses SQLs a partir do schema atual. Recuperar os artefatos originais e validar proveniência.

### RLS, grants, ACLs e SECURITY DEFINER

| Métrica | Produção | Laboratório |
|---|---:|---:|
| Tabelas public com RLS e sem policy | 10 | 18 |
| Linhas de grants diretos em tabelas public para anon/authenticated | 126 | 0 |
| Tabelas public com grants de cliente | 9 | 0 |
| Grants TRUNCATE para clientes | 18 | 0 |
| Registros pg_default_acl | 24 | 25 |
| Entradas ACL de default para anon/authenticated | 120 | 96 |

Produção mantém três funções trigger-only SECURITY DEFINER: upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users. Todas usam search_path=public e EXECUTE efetivo para anon, authenticated e service_role. Security Advisor reporta três WARN para anon e três WARN para authenticated, além de dez INFO para RLS sem policies.

Laboratório mantém as três funções SECURITY DEFINER com search_path vazio e EXECUTE somente para service_role. Não há grants diretos de cliente nas tabelas public, mas ainda existem default ACLs amplas de supabase_admin em schemas como public, realtime, storage e graphql; não considerar ACL-STORAGE resolvido.

Em realtime.messages, produção e laboratório têm RLS true, FORCE RLS false, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated. Isso é privilégio desnecessário; a ausência de policy não prova acesso direto a linhas. Não inferir exploração somente a partir do grant.

### Realtime

- Produção: 106 linhas em realtime.messages, todas private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- A função upstatus_broadcast_messages serializa o registro completo de OLD/NEW via to_jsonb e chama realtime.send com private=false. As funções de remote-state publicam metadados de comando/resultado; a função de usuários publica nome/status/reason/update.
- Os bundles Normal e Team Lite assinam tópico legado upstatus-screen-share-live-3-1-1-beta10, diferente do tópico dos triggers. Os dois clientes não usam private:true nem setAuth().
- Laboratório reduziu os payloads dos três triggers a {op: TG_OP} e usa search_path vazio, mas ainda chama realtime.send com private=false. realtime.messages no laboratório tem zero linhas; a entrega trigger-to-client não foi validada.
- Nenhum acesso externo foi reproduzido. O risco é confirmado por código/catálogo, não por exploração demonstrada.

### Storage

- chat-images: público, 168 objetos, limite 20 MiB.
- profile-images: público, 20 objetos, limite 20 MiB.
- storage.objects tem zero policies próprias. A allowlist inclui imagens, mídia e documentos. A política de privacidade dos buckets continua sem decisão e o upload de anexos ainda exige validação real de bytes, origem, MIME e tamanho.

### HTTP 402 e disponibilidade

Janela consultada: 2026-11-14 15:28 UTC a 2026-11-15 15:28 UTC.

Produção: 94 respostas HTTP 402:
- 25 downloads Team Lite.
- 22 downloads Normal.
- 21 chamadas de chat na API beta10.
- 10 remote-status.
- 10 status.
- 6 WebSocket Realtime.
Primeiras ocorrências às 16:32:55 UTC e última às 20:57:39 UTC em 14/11. A consulta de logs de produção não encontrou a mensagem textual exceed_edge_functions_invocations_quota; portanto a causa específica dos 402 de produção permanece desconhecida.

Laboratório: 19 respostas HTTP 402 no upstatus-signal-test, concentradas às 17:10:45 UTC em 14/11. A execução CI da #165 recebeu explicitamente exceed_edge_functions_invocations_quota. A causa de quota do laboratório está confirmada.

Não houve linhas 2xx para essas rotas no agrupamento de logs consultado. Isso não é um teste sintético de uptime e não prova indisponibilidade contínua nem recuperação. Não há evidência de recuperação.

## Issues e aceitação manual

- Issue #78 permanece OPEN com oito critérios físicos desmarcados (0/8): reconexão Normal/Team Lite sem F5, reentrada, chamadas após reconexão, áudio/peers sem duplicação, participantes estáveis, regressões automatizadas e teste manual.
- Issue #79 permanece OPEN com 16 itens marcados e 19 pendentes (16/35).
- Nenhum teste físico com Tampermonkey instalado, perda real de rede, microfone/display permissions reais ou interoperabilidade Normal ↔ Team Lite foi executado.

## Gates

| Gate | Estado | Evidência / motivo |
|---|---|---|
| RT-01 | BLOCKED | Broadcast público full-row em produção; bundles instalados sem private:true/setAuth; lab minimiza payload mas ainda é público |
| TEST-ISOLATION | BLOCKED | Lab sem fixtures Full-Product e quota Edge Functions excedida, bloqueando Smoke #165 |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs originais 404 em master e QA |
| AUTH-03 | BLOCKED | #161 passa em lab, mas migration/RPC ausentes em produção e Retry-After ausente no 429 de setup-invite |
| ACL-STORAGE | BLOCKED | Grants/ACL/SECURITY DEFINER e buckets públicos/policies ausentes permanecem em produção |
| RECONNECT | PENDING | Issue #78 0/8; exige confirmação física de Ricardo |
| HUMAN-REVIEW | PENDING | PRs permanecem Draft e sem review humana; sem autorização explícita de release |

## Próximos passos recomendados

1. Responsável com acesso ao Supabase Usage/Billing deve revisar a quota/spend cap do laboratório; o gateway identificou exceed_edge_functions_invocations_quota. Conferir a produção separadamente, pois o motivo dos 402 não foi comprovado.
2. Atualizar o contrato do rate limit de setup-invite para retornar Retry-After e cobri-lo em teste.
3. Preparar migration AUTH-03 revisada e aplicada primeiro em TEST isolado; só depois planejar rollout coordenado para produção com aprovação explícita.
4. Resolver a contradição de version guard entre o build (#161 exige versão maior que 3.4.7) e o workflow de produção (exige exatamente 3.4.7).
5. Corrigir workflow Team Lite para manifesto correto, slug upstatus-team-lite, projeto/SHA fixos, CLI pinada e preflight; corrigir também o workflow TEST para projeto explicitamente allowlisted.
6. Tornar Realtime privado/autorizado por arquitetura compatível com a autenticação própria do UpStatus; reduzir payloads e validar trigger-to-client em ambiente isolado.
7. Endurecer grants/default ACLs/SECURITY DEFINER e decidir Storage privado; não criar policies públicas genéricas para silenciar o Advisor.
8. Recuperar os quatro SQLs originais; diagnosticar MIGRATIONS_FAILED; provisionar Full-Product TEST.
9. Executar os oito critérios físicos da #78 e obter review/aprovação humana.

## Registro de segurança

Todas as consultas Supabase desta execução foram SELECT/catalog-only. Nenhum teste manual ou rerun foi iniciado. Nenhuma produção foi alterada. A única escrita no repositório é este arquivo novo na branch QA dedicada, criado após confirmar que o HEAD era e9f7b2d e que o caminho ainda não existia. Nenhum arquivo existente foi sobrescrito.