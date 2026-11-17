# UpStatus — auditoria independente de QA
**Data:** 2026-11-14 17:28 UTC  
**Repositório:** Reekyi/UpStatus  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Supabase isolado:** bfpjtfqlnypisxljoxkb  
**Recomendação:** **NOT READY**

## Escopo e método

Revalidação read-only de refs GitHub, PRs #74/#75/#76/#82, PRs auxiliares que afetam os mesmos riscos (#133, #149, #158, #163), issues #78/#79, workflows/logs, artefatos das Edge Functions implantadas, catálogo PostgreSQL, RLS/grants/Default ACL, Realtime, Storage, migrations e Advisors.

O documento docs/RELEASE_READINESS.md foi lido integralmente pela versão raw da branch QA: **5.746 linhas / 1.050.184 caracteres**. Seu último checkpoint interno continua sendo 2026-11-08 18:30 UTC. Este relatório é uma atualização separada; o documento central não foi alterado.

Não há checkout local do repositório nem ambiente local de navegador/Tampermonkey nesta execução. Não executei testes locais ou manuais. Os resultados de CI abaixo foram lidos dos logs de execuções já existentes. Todas as consultas SQL foram SELECT-only.

## 1. Heads e integridade das branches

| Ref | HEAD | Relação com master |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | referência |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 | 114 à frente / 147 atrás |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | 220 à frente / 147 atrás |
| QA | 5a6e53de9948cb773fba675cc27357108f33e77c | 314 à frente / 1 atrás |

PR #82 permanece aberta/Draft, base master, com 165 arquivos alterados. A comparação master...QA confirma que os 165 arquivos alterados são exclusivamente docs/. O SHA-base registrado na PR ainda é a9288ccf, enquanto master já avançou para 9d40461; a comparação atual confirma que QA está um commit atrás de master.

As PRs obrigatórias continuam abertas, Draft, não merged e sem reviews humanas:

| PR | Base | HEAD | Arquivos | Situação |
|---|---|---|---:|---|
| #74 Normal | master | dcaf6a072546eda0089e0cee4018c3047011f600 | 90 | Draft |
| #75 Team Lite baseline | team-lite-official | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | 10 | Draft |
| #76 Team Lite candidate | team-lite-official | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | 57 | Draft |
| #82 QA | master | 5a6e53de9948cb773fba675cc27357108f33e77c | 165 | Draft |

#76 é uma continuação da linha Team Lite e não deve ser tratada como payload independente de #75.

## 2. CI — evidência por HEAD

| PR | Workflow | Resultado | Evidência |
|---|---|---|---|
| #74 | Validate | PASS | https://github.com/Reekyi/UpStatus/actions/runs/43376770142 |
| #74 | Signaling Smoke | PASS | https://github.com/Reekyi/UpStatus/actions/runs/43376770200 |
| #75 | Candidate Checks | PASS histórico | https://github.com/Reekyi/UpStatus/actions/runs/41674353127 |
| #76 | Candidate Checks | PASS | https://github.com/Reekyi/UpStatus/actions/runs/43363871881 |
| #82 | Validate | FAIL | https://github.com/Reekyi/UpStatus/actions/runs/43616757429 |

### #74 Normal

No HEAD dcaf6a0, Validate e Signaling Smoke concluíram com sucesso. O Smoke confirmou 19/19 verificações não autenticadas e 136/136 autenticadas, incluindo integração isolada, WebRTC de chamada/voz/tela, entrega de faixas remotas, mesh de três participantes, rate limit de sinalização (90 aceitas + 1 HTTP 429 com Retry-After 60s), concorrência de rate limit, recibos de leitura atômicos, consumo único de convite e limpeza das fixtures.

**Limitação:** a etapa “Verify distributed setup-invite issuance rate limit” foi skipped. O CI Normal não fecha sozinho todo o rate limit de AUTH-03.

### #75 Team Lite baseline

O run histórico passou, mas o job atual daquele SHA contém somente a checagem básica de scripts e metadados de versão. É uma baseline antiga, não uma validação funcional equivalente à #76.

### #76 Team Lite

No HEAD 83a6cc4, Candidate Checks passou: 16/16 verificações não autenticadas, 110/110 autenticadas e 11/11 casos do contrato HTTP isolado. Também passaram os testes de voz/screen-share, recuperação de sala, WebRTC em Chromium, mesh de três participantes, rate limit distribuído, recibos atômicos, convite único, rate limit de emissão de convite, full-IIFE Playwright, guard de isolamento e limpeza.

Tudo isso é evidência automatizada do projeto isolado; não é teste físico de Tampermonkey nem prova de implantação.

### #82 QA

O Validate 43616757429 falhou no merge SHA sintético 3a7bbbefc20369ad525d45ba12b6e1823276af4d, que combina o HEAD QA 5a6e53de com master 9d40461.

Erro exato em scripts/validate.mjs:26:

    VALIDATION FAILED: production updateURL mismatch

O workflow executou o builder e produziu UpStatus 3.4.7 / TEST 3.4.7, mas a asserção do endereço de atualização falhou. Não fiz rerun manual.

## 3. Builder Normal e regressão de anexos

O script scripts/build.mjs de master define o endpoint de API de produção como upstatus-screen-share-3-1-1-beta10 e deriva updateURL desse endpoint. O validator de master exige o caminho estável /functions/v1/upstatus/upstatus.user.js. O release.json contém o endereço de distribuição estável, mas o builder de master não utiliza release.scriptUrl.

A candidata #74 corrige a separação: usa release.scriptUrl para a URL de distribuição e mantém a URL de API separada. O userscript Normal atualmente implantado já contém o @updateURL estável correto. Portanto, o defeito confirmado é do próximo artefato gerado pelo builder, não do header Normal instalado.

A PR #158 tenta separar os metadados de atualização, mas seu Validate no HEAD 25775192 falha em scripts/chat-regression.test.mjs:

    CHAT REGRESSION FAILED: files are staged instead of uploaded immediately

Não aceitar a correção do updater se ela alterar o comportamento de envio imediato de anexos do chat.

## 4. Proveniência dos eventos: #74/#76 ainda permitem falsificação

A inspeção estática dos candidatos encontrou receiveCallSignal(p) confiando em p._authenticatedTransport quando signalingTransportFlag está ligado. Essa propriedade fica dentro do payload controlado pelo emissor do broadcast público e pode ser forjada por quem publica a mensagem. Não é prova de origem autenticada.

As correções específicas existem:

- PR #133 Normal: receiveCallSignal(p, authenticatedSource); polling autenticado passa true e broadcast público passa false. CI nos HEADs da PR: Normal API Target Candidate Validation 42804903827 e Signaling Smoke 42804903887, ambos PASS. A branch está 14 commits à frente e 4 atrás da base #74.
- PR #149 Team Lite: mesma separação entre payload e proveniência. CI nos HEADs da PR: Authenticated Call Source Guard 43173176077 e Candidate Checks 43173176232, ambos PASS. A branch está 10 commits à frente e 2 atrás da base #76.

Ambas permanecem abertas/Draft, sem reviews humanas e divergidas das respectivas bases. Não contabilizar essas correções como integradas aos candidatos #74/#76.

## 5. Runtime efetivamente implantado

A inspeção decodificou os userscripts embutidos nas Edge Functions de produção:

| Produto | Edge Function | Versão da função | Userscript embutido |
|---|---|---:|---|
| Normal | upstatus | v480 | 3.4.7 |
| Team Lite | upstatus-team-lite | v15 | 3.4.30 |
| Normal legado API | upstatus-screen-share-3-1-1-beta10 | v6 | API beta10 |

O Normal instalado usa @updateURL e @downloadURL estáveis em /functions/v1/upstatus/upstatus.user.js, mas seu CLOUD_SERVER continua apontando para beta10. Team Lite usa o artefato raw do branch team-lite-official.

Ambos os userscripts instalados criam canal Realtime sem private:true e sem realtime.setAuth(). Normal recebe remote_command e chama executeRemoteCommand diretamente. Team Lite verifica a sessão/generation local antes de executar, mas isso não autentica o emissor do broadcast. Os listeners de call_signal também recebem payloads públicos sem prova de identidade do publicador.

As funções centrais reportam verify_jwt=false no gateway; os handlers usam autenticação própria por x-upstatus-token. Isso exige revisão por rota, mas verify_jwt=false isoladamente não prova que cada handler esteja sem autenticação.

## 6. Realtime — P0 de segurança

Os três triggers de produção foram consultados via pg_get_functiondef:

- upstatus_broadcast_messages() é SECURITY DEFINER, search_path=public, está ligado ao trigger upstatus_messages_broadcast e envia to_jsonb(OLD/NEW) completo por realtime.send(..., 'db_change', tópico, false).
- upstatus_broadcast_remote_state() é SECURITY DEFINER, search_path=public, ligado a upstatus_remote_state_broadcast e envia metadados de remote_command/remote_result com private=false.
- upstatus_broadcast_users() é SECURITY DEFINER, search_path=public, ligado a upstatus_users_broadcast e envia name/status/reason/update metadata com private=false.

A tabela public.messages contém message, image_url, mentions, reply_to, reactions, file_name, sender e timestamps. O broadcast de db_change transmite o registro completo, não apenas um aviso de invalidação. Isso cria um caminho de divulgação de conteúdo de chat e metadados de anexos para qualquer assinante que consiga acessar o canal público. A configuração do Dashboard “Allow public access” não é exposta pelo conector; não reproduzi assinatura externa nem publiquei broadcasts. A classificação é CODE INSPECTION + PRODUCTION CATALOG, não exploração reproduzida.

Tópicos:

- Triggers: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0
- Clientes instalados: upstatus-screen-share-live-3-1-1-beta10

A divergência significa que os eventos dos triggers não comprovam entrega aos clientes atuais.

Snapshot de realtime.messages nos últimos 14 dias: 106 eventos, todos private=false: 72 user_status, 26 db_change, 4 remote_command e 4 remote_result. Primeiros registros observados em 10/11 e últimos em 13/11.

realtime.messages: RLS true, FORCE RLS false, zero policies e grants efetivos SELECT/INSERT/UPDATE para anon e authenticated. Não inferir acesso a linhas somente pelos grants; RLS sem policies continua negando operações de linha. Private Realtime exige desenho de JWT/policies compatível. O token customizado UpStatus não é um Supabase Auth JWT.

## 7. Backend server-mediated e contrato HTTP

Produção contém 38 Edge Functions ACTIVE. Não existe função upstatus-signal. A função upstatus-test v281 está no mesmo projeto de produção e não é ambiente isolado.

Os templates candidatos Normal e Team Lite não implementam as rotas server-mediated que o helper de sinalização chama (/signal, /broadcast, /poll, /ack e /room/*). Os runtimes de produção também não contêm essas rotas.

No projeto isolado, upstatus-signal-test v32 e upstatus-signal-e2e-once v3 estão ACTIVE. A função isolada autentica x-upstatus-token, verifica sessão e usa rate limit distribuído por usuário, com limites de leitura/escrita e Retry-After. Isso não equivale a uma implantação de produção.

### Divergência de HTTP 409

A função isolada v32 mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não reconhece VOICE_ATTEMPT_ALREADY_ACTIVE; esse código cai no caminho HTTP 500.

A PR #163 adiciona VOICE_ATTEMPT_ALREADY_ACTIVE => HTTP 409 em voice-status.mjs e tem Validate/Voice Open HTTP Status Contract PASS no HEAD 00f357b0 (runs 43488822143 e 43488822237). Porém a validação é offline; a própria PR declara que não fez chamada HTTP real à Edge Function. A função implantada no laboratório continua v32 sem esse mapeamento. Não classificar o contrato do servidor como validado.

## 8. PostgreSQL, RLS, grants e SECURITY DEFINER

Consultas read-only do catálogo de produção:

- 10 tabelas públicas com RLS habilitado e zero policies.
- Nove dessas tabelas têm grants efetivos amplos para anon/authenticated, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE. upstatus_visual_config não tem grants diretos de cliente.
- RLS não protege TRUNCATE. Isso é privilégio excessivo no catálogo; não foi demonstrada execução via PostgREST.
- Default ACLs mantêm privilégios para anon/authenticated em public, graphql, graphql_public e storage, incluindo privilégios de tabela, EXECUTE em funções e privilégios de sequência.
- As três funções SECURITY DEFINER de broadcast usam search_path=public, retornam trigger e estão ligadas a triggers. EXECUTE é efetivo para anon/authenticated/service_role. O Advisor apresenta três WARN para anon e três para authenticated. Como são funções trigger, não foi demonstrada invocação direta como RPC comum; os grants continuam desnecessários.

Security Advisor de produção: 10 INFO (RLS habilitado sem policy), 3 WARN para anon e 3 WARN para authenticated, cobrindo as mesmas três funções SECURITY DEFINER.

## 9. Storage

| Bucket | Público | Objetos | Limite | MIME |
|---|---:|---:|---:|---|
| chat-images | Sim | 168 | 20 MiB | imagem, vídeo, áudio, PDF, Office, CSV e texto |
| profile-images | Sim | 20 | 20 MiB | PNG/JPEG/WebP/GIF |

Não há policies próprias em storage.objects. Acesso público significa que objetos com URL podem ser lidos sem autenticação; isso é especialmente relevante porque chat-images não contém apenas imagens, mas também documentos e mídia. O limite do bucket continua 20 MiB.

## 10. AUTH-03 e estado dos projetos

Produção:

- 5 usuários, 319 sessões, 5 perfis.
- Zero colunas setup_token_* em public.users.
- Zero RPCs candidatas de setup invite, rate limit de convite, rate limit de sinalização ou merge de read receipts.
- Zero tabelas candidatas de rate limit/sinalização consultadas.
- AUTH-03 não está implantado.

Laboratório bfpjtfqlnypisxljoxkb:

- ACTIVE_HEALTHY, PostgreSQL 17.
- 39 migrations, duas Edge Functions de teste.
- 18 tabelas públicas com RLS e zero policies; zero grants diretos de cliente.
- Zero usuários, sessões, perfis, buckets, objetos, mensagens e linhas em realtime.messages.
- Portanto é um ambiente isolado de sinalização, mas não um Full-Product TEST.

A branch Supabase main de produção continua MIGRATIONS_FAILED, enquanto o preview aparece ACTIVE_HEALTHY.

A proveniência dos quatro SQLs recuperados na rodada anterior não foi reavaliada nesta execução; o gate MIGRATION-PROVENANCE não foi atualizado neste relatório.

## 11. Issues e aceitação manual

- Issue #78 permanece OPEN, com 0/8 critérios físicos marcados. O último comentário de Engenharia é de 08/11. Nenhum teste manual novo foi registrado nesta rodada.
- Issue #79 permanece OPEN, com 16 itens marcados e 19 pendentes no corpo. O comentário dedicado UPCONTROL:QA foi atualizado sem criar duplicata e sem alterar o comentário da Engenharia.

Permanecem MANUAL PENDING: perda real de internet por aproximadamente 10 segundos, recuperação sem F5, reentrada em sala, novas chamadas, áudio bidirecional, microfone/display permissions reais, Tampermonkey em perfis separados e interoperabilidade instalada Normal ↔ Team Lite.

## 12. Gates e recomendação

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Realtime público, proveniência forjável em #74/#76 e backend server-mediated ausente em produção |
| TEST-ISOLATION | BLOCKED | Laboratório isolado, porém sem fixtures/buckets/dados Full Product |
| AUTH-03 | BLOCKED | Produção sem setup tokens/RPCs/rate limit candidatos |
| ACL-STORAGE | BLOCKED | Grants/Default ACL amplos, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | 0/8 testes físicos |
| HUMAN-REVIEW | PENDING | PRs obrigatórias sem aprovação humana |

MIGRATION-PROVENANCE não foi reavaliado nesta execução e não recebe atualização.

**Recomendação: NOT READY.** Prioridades:

1. Remover broadcasts públicos de linhas completas e minimizar payloads.
2. Integrar proveniência fora do payload em Normal e Team Lite, reconciliando #133/#149 com as bases.
3. Implementar e testar o backend server-mediated nos templates de ambas as linhas antes de qualquer cutover.
4. Corrigir HTTP 409 na função real, não somente no helper offline.
5. Corrigir builder Normal sem quebrar upload imediato de anexos.
6. Corrigir workflow oficial Team Lite, que ainda publica o slug upstatus em vez de upstatus-team-lite, usa CLI latest e não valida projeto/SHA.
7. Concluir AUTH-03 e revisar grants, Default ACL, SECURITY DEFINER e Storage.
8. Provisionar Full-Product TEST, executar aceitação física e obter revisão humana.

## 13. Registro de segurança

Nenhuma escrita em produção. Nenhuma migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva. Todas as consultas SQL foram SELECT-only. Nenhum teste local ou manual foi executado.

A única alteração de repositório desta execução é este novo relatório Markdown na branch QA dedicada. docs/RELEASE_READINESS.md, branches de Engenharia e workflows não foram alterados manualmente.
