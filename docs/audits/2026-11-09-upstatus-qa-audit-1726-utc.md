# UpStatus — auditoria independente de QA

**Data:** 2026-11-09 17:26 UTC (14:26 BRT)  
**Repositório:** `Reekyi/UpStatus`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## Escopo, método e limites

UpStatus é um userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Foram consultados refs/commits Git, PRs #74, #75, #76, #82 e candidatos auxiliares #125, #128 e #129; Issues #78 e #79; logs de workflows existentes; fontes dos runtimes Edge Functions; catálogos PostgreSQL, histórico de migrations e Security Advisor dos projetos Supabase.

Classificações:
- **AUTOMATED PASS/FAIL:** workflow existente, concluído no SHA indicado.
- **CODE INSPECTION:** código/configuração/catálogo inspecionado, sem reproduzir exploração.
- **MANUAL PENDING:** exige navegador/dispositivo/rede real ou aprovação humana.
- **BLOCKED:** gate impeditivo com dependência não resolvida.
- **NOT VERIFIED:** evidência insuficiente.

Nenhum workflow foi iniciado ou repetido. Não foi feito checkout local, build local, teste manual, upload de teste, exploração de Realtime ou mutação de fixtures. Os logs existentes de CI foram lidos. Consultas SQL foram SELECT-only.

## Documento principal e integridade das refs

O blob integral de `docs/RELEASE_READINESS.md` foi recuperado e lido: SHA `7cfbd70886df42ce790c078c224b19284a632595`, 1.045.105 caracteres e 8.410 linhas. O histórico termina na seção de 2026-11-08 18:30 UTC; é histórico, não fotografia atual. O documento não foi alterado nesta rodada.

Heads observados antes deste registro:
- QA: `e777d13ae7b0baf98acdac19c7b71546d162efdf`.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA vs master: 166 commits à frente e 1 atrás; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- O commit master-only observado continua sendo `9d40461`, documental. Não fiz rebase nem incorporei alterações concorrentes.

## PRs e CI por HEAD exato

| PR | HEAD | Estado | Evidência |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Open / Draft | Validate [42451736696 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42451736696); Signaling Smoke [42451736729 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127 PASS histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite atual](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Open / Draft | Candidate Checks [42450476433 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `e777d13ae7b0baf98acdac19c7b71546d162efdf` | Open / Draft | Validate [42656295143 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/42656295143) |

Detalhes dos logs:
- **#74:** 19/19 checks não autenticados e 136/136 autenticados passaram. O smoke também concluiu browser WebRTC para chamada individual, sala de voz e vídeo de tela, mesh de três participantes, teardown, rate limit distribuído (90 aceitos, 1 rejeitado com HTTP 429 e Retry-After de 60 s) e consumo atômico de convite de setup no laboratório.
- **#76:** 16/16 checks não autenticados e 110/110 autenticados passaram. O candidato Team Lite concluiu browser WebRTC, mesh de três participantes, rate limit 429, consumo atômico de convite e regressões automatizadas de recuperação/saída/reentrada de sala.
- **#75:** é baseline histórica; #76 é a linha Team Lite atual e está 305 commits à frente. Não somar #75 e #76 como releases independentes.
- **#82:** falha em `scripts/validate.mjs:26` com `production updateURL mismatch`. O log confirma a assertion. O commit QA é documental; a falha é herdada do contrato de build/updateURL, não uma regressão introduzida pelo relatório. O PR permanece vermelho.
- A API de reviews retornou zero reviews para #74, #75, #76 e #82.

## Workflow Team Lite: mitigação candidata #129

O workflow em `team-lite-official` foi lido diretamente: blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75`. Ele mantém `workflow_dispatch`, secrets de produção, Supabase CLI `latest` e executa `supabase functions deploy upstatus`, que é o slug Normal, não `upstatus-team-lite`. **Não despachar o workflow atual.**

A [PR #129](https://github.com/Reekyi/UpStatus/pull/129) é baseada no HEAD exato atual de `team-lite-official` e propõe:
- substituir o workflow legado por um guard manual fail-closed;
- remover secrets, environment `production`, instalação do CLI e qualquer comando de deploy;
- adicionar teste offline que rejeita o reaparecimento de secrets ou capacidade de deploy.

HEAD candidato: `c3e2bbb933535f7128f9557eb4b22ad32040d70f`. O teste offline passou no workflow de PR [42660420881](https://github.com/Reekyi/UpStatus/actions/runs/42660420881); o log mostra `PASS: legacy Team Lite production workflow is fail-closed and contains no deploy path`. A PR #129 continua Open / Draft, sem review e sem merge. Portanto a branch oficial ainda contém o workflow inseguro.

A [PR #125](https://github.com/Reekyi/UpStatus/pull/125) propõe um dispatcher separado no default branch. Seu guard offline passou em [42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306), mas o job de deploy ficou SKIPPED e o Validate completo falhou em [42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421). A proposta aponta para `upstatus-team-lite`, fixa CLI 2.122.1 e exige SHA/projeto/migrations. A [PR #128](https://github.com/Reekyi/UpStatus/pull/128) acrescenta allowlist de reviewers para aprovação exata; continua Draft e sem review. Nenhum dispatcher foi executado.

## Supabase — projeto, migrations e isolamento

### Produção

- Projeto `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.
- Branch gerenciada default `main`: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Histórico remoto: 7 migrations, até `20261027155438 / set_upstatus_upload_limits_20mb`.
- Quatro fontes originais continuam ausentes em `master/supabase/migrations`; cada caminho retornou HTTP 404:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

A PR #127 e seu manifesto de proveniência protegem os arquivos presentes, mas não recuperam os quatro SQLs ausentes. Não reconstruir migrations por inferência do schema atual.

### Laboratório

- Projeto separado `bfpjtfqlnypisxljoxkb`, `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003.
- Inventário anterior e atual aponta 38 migrations e duas Edge Functions de teste.
- SELECT de contagens: 0 usuários públicos, 0 auth.users, 0 mensagens, 0 sessões, 0 salas, 0 membros de sala, 0 eventos de sinalização, 0 mensagens Realtime e 0 objetos Storage.
- 17 tabelas public com RLS e sem policies, mas sem privilégios diretos de tabela para anon/authenticated. Storage não tem buckets; a tabela `storage.objects` ainda herda grants de cliente e não tem policies, portanto o projeto continua exigindo cuidado mesmo isolado.

O laboratório está separado e vazio de fixtures do produto no snapshot consultado. **TEST-ISOLATION fica concluído para o projeto de laboratório**, sem afirmar que existe um ambiente completo de produção/aceitação manual.

## Edge Functions e compatibilidade Normal / Team Lite

Produção lista 38/38 Edge Functions ACTIVE, todas com `verify_jwt=false`. Esse campo sozinho não prova ausência de autenticação: os runtimes principais inspecionados têm autenticação própria por token de sessão. A inspeção foi amostral, não uma auditoria de rotas de todas as 38 funções.

Runtimes principais observados:
- `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- `upstatus-screen-share-3-1-1-beta10`: v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- `upstatus-test`: v281.

Os candidatos #74/#76 compartilham contratos de sinalização e de voz, mas isso não elimina a diferença entre runtime implantado, cliente candidato e ambiente de laboratório. O userscript Normal de produção aponta para beta10; deployar somente `upstatus` não atualiza por si só o endpoint API ativo do cliente Normal.

## Segurança de produção

### AUTH-03 — BLOCKED / P1

Inspeção dos runtimes implantados Normal v480, beta10 v6 e Team Lite v15:
- `POST /api/setup` encaminha para `login(req,true)`.
- O fluxo implantado aceita primeira configuração quando a conta ainda não tem senha, atualiza `password_hash` sem setup token, convite ou RPC atômica.
- Mantém fallback de papel administrativo por nome para Ricardo, Lohan e Guilherme.
- O update de setup não é um consumo atômico de convite.
- Política implantada diverge: Normal/beta10 exigem 6 caracteres; Team Lite exige 4.
- Produção não tem tabela `upstatus_setup_invites` nem RPC `consume_upstatus_setup_invite(text,text,text)`.

Os templates candidatos #74/#76 melhoram a autorização: exigem token hexadecimal de 64 caracteres e chamam a RPC de consumo de convite; o CI isolado cobre token inválido/expirado/replay e concorrência de um vencedor. Entretanto:
- a RPC e migrations necessárias existem somente no laboratório, não em produção;
- a inspeção dos templates não encontrou rate limit dedicado para login/setup/emissão de convite;
- o rate limit aprovado no CI é do endpoint de sinalização, não do onboarding.

Portanto AUTH-03 segue bloqueado mesmo nos candidatos: autorização de convite está parcialmente implementada, mas rate limit de autenticação/setup e cutover dos runtimes usados continuam pendentes.

### RT-01 — BLOCKED / P1

SELECT-only de `realtime.messages` retornou 35 linhas no snapshot:
- 17 `user_status`
- 14 `db_change`
- 2 `remote_command`
- 2 `remote_result`

Todas as 35 têm `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Isso é fotografia de retenção, não total histórico e não prova exploração externa.

Os clientes Normal/Team Lite inspecionados assinam o canal público legado `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` e sem `realtime.setAuth()`. Nos candidatos #74/#76, `signaling_transport_enabled` é opt-in e default false, e o endpoint de transporte é vazio por padrão; o caminho legado permanece ativo enquanto a migração não é explicitamente configurada. A função `upstatus-signal-test` existe no laboratório, mas não há função server-mediated equivalente na produção.

Não foi publicado broadcast, injetada oferta/ICE nem reproduzido ataque. O acesso externo efetivo ao canal não foi testado.

### RLS, grants, SECURITY DEFINER e Storage — BLOCKED

SELECTs de catálogo em produção:
- 10 tabelas public com RLS habilitado e zero policies.
- 9 tabelas com privilégios efetivos de anon/authenticated; as 9 incluem SELECT/INSERT/UPDATE/DELETE e TRUNCATE.
- 24 entradas de Default ACL.
- `storage.objects`: zero policies; anon e authenticated têm SELECT/INSERT/UPDATE/DELETE efetivos.
- Buckets `chat-images` e `profile-images` são públicos, com limite de 20 MiB cada.
- Security Advisor: 10 INFO de RLS sem policy; 3 WARN de SECURITY DEFINER para anon e 3 WARN para authenticated.

As três funções `upstatus_broadcast_messages()`, `upstatus_broadcast_remote_state()` e `upstatus_broadcast_users()` são SECURITY DEFINER, têm `search_path=public`, EXECUTE efetivo para anon/authenticated e estão anexadas a triggers. O retorno é do tipo `trigger`. O Advisor as descreve como expostas via RPC; esta auditoria confirmou os grants e a associação a triggers, mas não fez chamada RPC nem concluiu exploração direta. O broadcast público e o payload integral de mensagem continuam sendo o risco confirmado por inspeção.

### Upload — CODE INSPECTION / P2

Nos runtimes implantados, `signedUploadRoute()` valida MIME e tamanho declarados pelo cliente, gera Signed Upload URL e retorna URL pública sem inspecionar os bytes enviados. O `sniffMime()` do caminho legado reconhece algumas assinaturas, mas usa o MIME declarado como fallback quando não reconhece os bytes. Com buckets públicos, falta validação server-side/quarentena antes de publicar o objeto. Nenhum upload de teste foi realizado.

## Issues, aceitação manual e revisão humana

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta; 8 critérios físicos, 0 marcados. A falha relatada é não conseguir reentrar na sala após queda de internet de aproximadamente 10 segundos sem F5.
- Issue #79 continua aberta; o corpo mantém 16/35 checkboxes marcadas. Isso não é percentual de prontidão.
- Reviews: zero submissions nas PRs #74, #75, #76, #82, #125, #128 e #129.
- CI com Chromium/WebRTC, stubs e fixtures isoladas é evidência automatizada; não substitui Tampermonkey real, perda/retorno de internet, permissões reais de microfone/tela ou aceitação humana.
- Nenhum teste físico foi realizado nesta rodada.

## Veredito e próximos gates

**NÃO LIBERAR.** CI candidato Normal/Team Lite passou nos HEADs consultados, e #129 oferece mitigação segura candidata para o workflow legado. Ainda há bloqueadores de segurança e operação:

1. Integrar/revisar a mitigação #129 antes de qualquer uso do workflow legado; manter o workflow atual sem dispatch.
2. Completar AUTH-03 com convite de uso único, consumo atômico, rate limit explícito de login/setup e cutover coordenado dos endpoints realmente usados.
3. Tornar o transporte server-mediated o caminho padrão, validar sessão/membership/destinatário/replay/rate limit no servidor e retirar listeners públicos sensíveis.
4. Corrigir grants, Default ACLs, SECURITY DEFINER e Storage por plano revisado e autorizado.
5. Recuperar os quatro SQLs originais ou aprovar formalmente estratégia de baseline/reconciliação; manter preflight fail-closed.
6. Validar bytes de upload em servidor/quarentena privada antes de publicar objetos.
7. Executar os oito critérios físicos da #78 em Normal e Team Lite e obter aprovação humana explícita antes de release.

Nenhuma escrita em produção, SQL DDL/DML, migration, deploy, dispatch de workflow, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou mutação de fixture foi realizada. A única escrita desta rodada é este novo relatório na branch QA; `docs/RELEASE_READINESS.md`, branches de engenharia e comentário da Engenharia na Issue #79 foram preservados.
