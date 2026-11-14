# UpStatus — auditoria independente de QA

**Data:** 2026-11-09 16:34 UTC (13:34 BRT)  
**Repositório:** `Reekyi/UpStatus`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** `bfpjtfqlnypisxljoxkb`

## Escopo, método e classificação

UpStatus é um userscript/app de presença, chat, chamadas de voz e compartilhamento de tela integrado ao Sale Smartly.

Foram consultados refs e commits Git, PRs, arquivos e workflows GitHub Actions; Issues #78 e #79; Management API e catálogos PostgreSQL Supabase; advisors; código-fonte dos Edge Functions implantados e código candidato Normal/Team Lite.

Classificações:
- **AUTOMATED PASS/FAIL:** workflow existente, concluído no SHA exato.
- **CODE INSPECTION:** código, configuração ou catálogo inspecionado sem reproduzir o comportamento como exploração.
- **MANUAL PENDING:** depende de navegador/dispositivo/rede real ou aceite humano.
- **BLOCKED:** gate impeditivo com dependência não resolvida.
- **NOT VERIFIED:** evidência insuficiente.

Nenhum workflow foi iniciado ou repetido pela auditoria. Não foi aberto checkout local nem executado teste local. Os logs existentes de CI foram lidos. Não houve teste físico em Tampermonkey, navegador do usuário, rede real, microfone ou captura de tela.

## Documento principal e integridade das refs

O conteúdo completo de `docs/RELEASE_READINESS.md` foi lido pela API de Contents do GitHub: blob SHA `7cfbd70886df42ce790c078c224b19284a632595`, 1.045.105 caracteres e 8.410 linhas. O endpoint de arquivo simplificado retornou conteúdo vazio; a leitura alternativa retornou o texto integral. A seção final desse documento é de 2026-11-08 18:30 UTC, portanto é histórico, não fotografia atual. O arquivo não foi alterado nesta rodada.

Heads observados antes deste registro:
- QA: `d83fa9b31665faefd85c82902cc026f3c0818510`.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA vs master: 165 commits à frente e 1 atrás; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`.
- O único commit exclusivo de master é `9d40461`, que adiciona somente `docs/checkpoints/2026-11-08-production-migration-history-preflight.md`.

Não fiz rebase nem incorporei o commit concorrente de master. O novo relatório é um arquivo separado, criado somente na branch QA.

## PRs e CI por SHA exato

| PR | HEAD | Estado | Evidência atual consultada |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Open / Draft | Validate [42451736696 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42451736696); Signaling Smoke [42451736729 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127 PASS histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite atual](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Open / Draft | Candidate Checks [42450476433 PASS](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `d83fa9b31665faefd85c82902cc026f3c0818510` | Open / Draft | Validate [42647676714 FAIL](https://github.com/Reekyi/UpStatus/actions/runs/42647676714) |

Detalhes dos logs:
- **#74:** 19/19 checks não autenticados e 136/136 checks autenticados passaram. O smoke também concluiu browser WebRTC para chamada individual, sala de voz e vídeo de tela, mesh de três participantes, teardown, limite distribuído (90 aceitos, 1 rejeitado com HTTP 429 e Retry-After de 60 s) e enrollment de setup isolado com token de uso único e concorrência de um vencedor.
- **#76:** 16/16 checks não autenticados e 110/110 autenticados passaram. O candidato Team Lite também concluiu browser WebRTC, mesh de três participantes, rate limit 429, enrollment isolado e testes automatizados de recuperação/saída/reentrada.
- **#75:** é baseline histórica. A comparação confirma que #76 está 305 commits à frente e 0 atrás de #75; não são duas linhas de produto independentes para somar como releases.
- **#82:** falha em `scripts/validate.mjs:26` com `production updateURL mismatch`. O build chega à validação de PROD/TEST 3.4.7 e então falha nessa assertion. A falha não é causada pelo conteúdo Markdown, mas o check da PR permanece vermelho.
- Nenhuma review foi retornada para #74, #75, #76 ou #82. Também não foram retornadas reviews para #127 e #128.

PRs auxiliares relevantes:
- [#85](https://github.com/Reekyi/UpStatus/pull/85), correção candidata de updater URL/autorização por role, continua Open / Draft; não está integrada.
- [#123](https://github.com/Reekyi/UpStatus/pull/123), guard candidato de deploy Team Lite, continua Open / Draft.
- [#127](https://github.com/Reekyi/UpStatus/pull/127), proveniência de migrations, continua Open / Draft; o workflow focado [42615130073](https://github.com/Reekyi/UpStatus/actions/runs/42615130073) passou offline, sem recuperar os quatro SQLs ausentes.
- [#128](https://github.com/Reekyi/UpStatus/pull/128), guard de aprovação humana por SHA, continua Open / Draft; o workflow focado [42614800302](https://github.com/Reekyi/UpStatus/actions/runs/42614800302) passou offline, mas não há review humana nem autorização de release.

## Compatibilidade Normal / Team Lite e workflows

Os testes de integração em CI exercitam aliases Normal/Team Lite, chamadas, salas, tela e mesh em ambiente isolado. Isso é **AUTOMATED PASS**, não prova de instalação física, permissões reais de Tampermonkey ou recuperação da conexão do usuário.

Estado dos runtimes e clientes de produção:
- Edge Function Normal `upstatus`: v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- API usada pelo userscript Normal: `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`. O userscript Normal implantado é 3.4.7 e aponta seu `CLOUD_SERVER` para beta10, não para `upstatus`.
- Edge Function Team Lite `upstatus-team-lite`: v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`. O userscript Team Lite implantado é 3.4.30 e aponta para essa função.
- A lista de produção contém 38/38 Edge Functions ACTIVE e 38/38 com `verify_jwt=false`. Esse atributo sozinho não prova ausência de autenticação: os runtimes usam autenticação própria por token de sessão. O fluxo de setup, porém, continua vulnerável conforme a seção AUTH-03.

Risco de publicação:
- O workflow de `master` usa Supabase CLI `latest` e deploya `upstatus`. Esse slug é o alvo declarado para Normal, mas o userscript Normal implantado aponta para beta10; deployar apenas `upstatus` não corta o endpoint ativo dos clientes Normal.
- O workflow em `team-lite-official` também usa CLI `latest`, mas executa `supabase functions deploy upstatus`, em vez de `upstatus-team-lite`. Um dispatch pode sobrescrever o runtime Normal. **Não despachar esse workflow.**
- O workflow Team Lite não tem guard de projeto/SHA equivalente ao fluxo candidato de segurança. Nenhum deploy foi iniciado.
- `release.json` Normal segue em 3.4.7; `team-lite/release.json` do candidato declara buildVersion 3.4.31, enquanto o cliente oficial implantado segue 3.4.30. Os candidatos permanecem Draft.

## Supabase: projeto, migrations e isolamento

Produção:
- Projeto `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Branch gerenciada default `main`: MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.
- Histórico remoto: 7 migrations.
- Estes quatro arquivos originais continuam ausentes de `master/supabase/migrations`; as quatro buscas por caminho retornaram HTTP 404:
  - `20261023154754_create_upstatus_visual_config.sql`
  - `20261026195855_add_chat_message_file_name.sql`
  - `20261027154329_allow_chat_document_mime_types.sql`
  - `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #127 adiciona um guard offline de proveniência, mas não fornece os quatro artefatos ausentes. Não reconstruir SQL a partir do schema atual.

Laboratório:
- Projeto separado `bfpjtfqlnypisxljoxkb`, nome `upstatus-security-test`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, região sa-east-1.
- 38 migrations e duas Edge Functions de teste (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3).
- Snapshot: zero usuários/fixtures, zero buckets Storage e zero linhas em `realtime.messages`; 17 tabelas public com RLS sem policies, mas zero grants diretos para anon/authenticated; as três funções SECURITY DEFINER de broadcast têm EXECUTE somente para service_role e search_path vazio.
- O projeto isolado existe e está separado de produção. Nenhuma fixture foi mutada nesta auditoria.

## Segurança de produção

### AUTH-03 — BLOCKED / P1

Inspeção dos runtimes implantados `upstatus` v480, beta10 v6 e `upstatus-team-lite` v15:
- `POST /api/setup` encaminha para `login(req,true)`.
- Nos runtimes implantados, o fluxo verifica se a conta não tem password_hash e atualiza a senha diretamente. Não exige setup token, não consome convite e não usa RPC atômica.
- Há fallback de role administrativa por nome para Ricardo, Lohan e Guilherme.
- O UPDATE não serializa atomicamente um único vencedor. A senha mínima diverge: Normal e beta10 6 caracteres; Team Lite 4.
- A RPC `consume_upstatus_setup_invite(text,text,text)` não existe em produção.

Os candidatos #74 e #76 já contêm token de setup de 64 caracteres hexadecimais e chamam a RPC de consumo de convite. O CI isolado cobre token inválido/expirado/replay e concorrência de um vencedor. Porém essa RPC só existe no laboratório; não está implantada em produção. A inspeção dos templates candidatos também não encontrou rate limit específico no fluxo de login/setup/emissão de convite. Portanto a correção candidata melhora a autorização, mas ainda não fecha o gate completo de autorização + rate limit.

### RT-01 — BLOCKED / P1

Consulta SELECT-only de `realtime.messages` retornou 31 linhas no snapshot:
- 15 `user_status`
- 14 `db_change`
- 1 `remote_result`
- 1 `remote_command`

Todas as 31 têm `private=false` no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. A contagem é uma fotografia de retenção, não um total histórico cumulativo.

Os clientes Normal e Team Lite implantados assinam o canal público `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` e sem `realtime.setAuth()`. O Normal entrega payloads recebidos a `receiveCallSignal`, `voiceRoomReceive` e `screenShareReceive`; Team Lite também faz checks de sessão local, mas isso não autentica a identidade do remetente. O tópico dos clientes não coincide com o tópico antigo usado pelos triggers de banco.

Os candidatos incluem transporte server-mediated, mas `signaling_transport_enabled` é opt-in e default false. Com a flag ligada, os handlers candidatos de chamadas exigem `_authenticatedTransport` (exceto hints de descoberta limitados); sem a flag, o caminho público legado continua ativo. O adapter e a função de sinalização foram testados no laboratório, não implantados em produção. Não foi demonstrado acesso externo, spoofing ou entrega maliciosa nesta auditoria.

### RLS, grants, SECURITY DEFINER e Storage — BLOCKED

SELECTs de catálogo em produção:
- 10 tabelas public com RLS habilitado e zero policies.
- 9 dessas tabelas concedem privilégios diretos a anon/authenticated, incluindo TRUNCATE.
- 24 entradas de Default ACL; há ACLs amplas para papéis clientes em public, storage e schemas relacionados.
- `storage.objects`: zero policies e privilégios efetivos SELECT/INSERT/UPDATE/DELETE para anon e authenticated.
- Buckets `chat-images` e `profile-images` são públicos, com limite de 20 MiB cada.
- Security Advisor: 10 INFO de RLS sem policy, 3 WARN para SECURITY DEFINER executável por anon e 3 WARN para authenticated.

As três funções de broadcast SECURITY DEFINER usam `search_path=public` e têm EXECUTE efetivo para anon/authenticated. Elas retornam tipo trigger e estão ligadas a triggers; não concluo que sejam invocáveis diretamente como RPC PostgREST. O grant é excessivo e o Advisor alerta, mas o risco independente e confirmado é o broadcast público e o payload enviado pelos triggers. A função de chat transmite `to_jsonb(OLD/NEW)` integral.

RLS sem policy bloqueia acesso normal a linhas por esses papéis; isso não torna os grants adequados, e TRUNCATE não é protegido por RLS. Não foi feita tentativa de mutação nem exploração de API.

### Upload — CODE INSPECTION / P2

No beta10 implantado:
- `signedUploadRoute()` valida MIME e tamanho declarados pelo cliente, cria Signed Upload URL e já devolve URL pública, sem inspecionar os bytes enviados.
- `sniffMime()` no caminho legado reconhece algumas assinaturas, mas retorna o MIME declarado quando não reconhece os bytes.
- Os buckets são públicos; falta uma fronteira server-side de quarentena/validação antes da publicação.

Não foi feito upload de teste nem reprodução de exploit.

## Issues e aceitação manual

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): aberta, 8 critérios de aceite e 0 marcados. O texto da issue relata que, após queda de internet por cerca de 10 segundos durante sala de voz, o usuário não consegue reentrar sem F5. Nenhum teste físico foi realizado nesta rodada.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): 16/35 caixas marcadas e 19 pendentes no corpo. Isso não é percentual de prontidão.
- CI com Chromium/WebRTC, stubs e fixtures isoladas é evidência automatizada; não substitui Tampermonkey real, rede real, permissões de microfone/tela nem reconexão sem F5.
- Não há reviews humanas nas PRs auditadas e a aprovação humana de release continua pendente.

## Veredito e próximos gates

**NÃO LIBERAR.** O CI candidato de Normal e Team Lite está verde nos HEADs consultados, mas isso não fecha a segurança nem a prontidão operacional.

Prioridades:
1. Corrigir AUTH-03 nos runtimes efetivamente usados, com convite de uso único, consumo atômico e rate limit explícito; alinhar política de senha Normal/Team Lite.
2. Construir e validar transporte server-mediated em ambiente isolado, tornar o caminho autenticado o default, coordenar cutover Normal beta10 e Team Lite e retirar handlers públicos sensíveis.
3. Corrigir grants, Default ACLs, SECURITY DEFINER e Storage com plano revisado por owner autorizado.
4. Recuperar os quatro SQLs originais ou aprovar formalmente estratégia de baseline/reconciliação; manter o preflight fail-closed.
5. Corrigir o workflow oficial Team Lite para o slug correto, CLI pinada e validação de projeto/SHA; não despachar o workflow atual.
6. Validar bytes de upload antes de publicar o objeto e decidir a política de privacidade/quarentena.
7. Executar os oito critérios físicos da #78 em Normal e Team Lite e obter aprovação humana explícita antes de qualquer release.

Nenhuma escrita em produção, SQL DDL/DML, migration, deploy, merge, release, dispatch de workflow, alteração de secret/flag/role/grant/policy/ACL ou publicação de userscript foi realizada. A única escrita desta rodada é este relatório novo na branch QA; `docs/RELEASE_READINESS.md`, branches de engenharia e comentário da Engenharia na Issue #79 foram preservados.
