# Auditoria independente UpStatus — 2026-11-08 20:36 UTC / 17:36 BRT

## Escopo e integridade

- Repositório: [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus).
- Projeto Supabase de produção: `dlfvkawaiqduhlazsszm`.
- Laboratório isolado: `bfpjtfqlnypisxljoxkb`.
- Branch QA: `qa/release-readiness-2026-11-04-master`.
- HEAD QA lido antes desta nota: `00828f68e1c4b0aae5d4b534198c8724776134a6`.
- HEAD da PR #82 confirmado no mesmo SHA: `00828f68e1c4b0aae5d4b534198c8724776134a6`.
- Master: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- QA vs master: 137 commits à frente, 1 atrás. O único commit atrás é `9d40461`, documental: `docs/checkpoints/2026-11-08-production-migration-history-preflight.md`; não altera runtime.
- Branch QA não protegida; required status checks com enforcement desligado.
- `docs/RELEASE_READINESS.md`: blob SHA `7cfbd70886df42ce790c078c224b19284a632595`, 1.055.655 bytes. O conteúdo foi lido pelo raw URL; a seção mais recente no arquivo principal é a revalidação de 15:30 BRT.
- Nota anterior `docs/audits/2026-11-08-upstatus-qa-audit-1925-utc.md`: blob SHA `eba05890e74ec488576801199d128cf0bf7cd5b1`, 18.443 bytes. Ela foi lida antes desta atualização.
- Esta nota é um arquivo novo. Nenhum arquivo existente foi substituído.

## Decisão executiva

**NÃO LIBERAR.** Os candidatos têm evidência automatizada relevante de integração e WebRTC, mas produção continua nos runtimes antigos; a sinalização server-mediated não está implantada em produção e a flag cliente segue desativada por padrão. Também permanecem bloqueios de workflow Team Lite, versão de release, AUTH-03, segurança de Realtime e aceitação manual.

## PRs, heads e CI por SHA exato

| PR | HEAD atual | Estado / escopo | Evidência no HEAD |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `9c0133e8cf6bd85ac8993888718a408db2f24a3e` | Open/Draft; 877 commits, 90 arquivos; 1 atrás de master | [Validate 42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) PASS; [Signaling Smoke 42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open/Draft; 59 commits, 10 arquivos | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS; baseline histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `eb28e88325d7e8a6236d9050bebabf794d64a8c4` | Open/Draft; 364 commits, 53 arquivos; base sem commits atrás | [Candidate Checks 42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `00828f68e1c4b0aae5d4b534198c8724776134a6` | Open/Draft; 137 commits, 27 arquivos; 1 atrás de master | [Validate 42515747991](https://github.com/Reekyi/UpStatus/actions/runs/42515747991) FAIL |
| [#89 AUTH-03 / cutover](https://github.com/Reekyi/UpStatus/pull/89) | `4224dc31683d4b235e52d2ddcece1570294763f0` | Open/Draft; 30 commits, 22 arquivos | [Run 42486397701](https://github.com/Reekyi/UpStatus/actions/runs/42486397701) PASS em evento push; nenhum run pull_request encontrado para esse HEAD |
| [#99 remote-command guard](https://github.com/Reekyi/UpStatus/pull/99) | `bdce39626a9636f441ffe2988c87706b9f7c7154` | Open/Draft; 6 commits, 4 arquivos | [Run 42503227603](https://github.com/Reekyi/UpStatus/actions/runs/42503227603) PASS em pull_request |
| [#100 Full-IIFE Normal](https://github.com/Reekyi/UpStatus/pull/100) | `f8716a047328891eeaf4ff6729b8e936d45aeeed` | Open/Draft; 2 commits, 2 arquivos | [Run 42503432784](https://github.com/Reekyi/UpStatus/actions/runs/42503432784) PASS em push; nenhum run pull_request no HEAD |

Reviews humanas: os endpoints de reviews consultados para #74, #75, #76, #82, #89, #99 e #100 retornaram listas vazias.

### O que os testes aprovados realmente cobrem

- #74: logs do Signaling Smoke registram 19/19 verificações não autenticadas, 136/136 autenticadas, negociação WebRTC em browser para chamada/voz/tela, mesh de três participantes, rate limit e cleanup de usuários/sessões/salas/memberships/eventos no projeto isolado.
- #76: logs registram 16/16 verificações não autenticadas, 110/110 autenticadas, browser WebRTC para chamada/voz/tela, mesh de três participantes, rate limit (90 aceitos, 1 rejeitado com HTTP 429) e cleanup.
- Esses são testes automatizados de candidato em ambiente isolado, incluindo browser automatizado. Não são testes físicos em Tampermonkey/Sale Smartly nem testes de microfone/tela em equipamentos reais.
- O workflow de smoke usa URL fixa do projeto isolado e `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`, com allowlist explícita de `bfpjtfqlnypisxljoxkb`. Os testes mutáveis foram executados pela pipeline de engenharia, não pelo auditor. O SELECT atual confirmou zero usuários no laboratório; não foi feita varredura nova de todas as tabelas de fixtures.

## Build, Validate e release

A falha atual da #82 é reproduzível no log do HEAD exato:

`Built UpStatus 3.4.7 / TEST 3.4.7`  
`VALIDATION FAILED: production updateURL mismatch`

Causa confirmada por inspeção:

- Master `scripts/build.mjs`, blob `51fd9983c53ad88cd269b251423bfc3439131139`, deriva `updateURL` de `/functions/v1/upstatus-screen-share-3-1-1-beta10/upstatus.user.js`.
- `release.json`, blob `93caf1701ea508575c90d002c0b8c3037b34d82a`, declara `scriptUrl` em `/functions/v1/upstatus/upstatus.user.js`.
- `scripts/validate.mjs`, blob `b1fa56c204c9e4dc6a689bced81efb9f5466b48f`, exige o endpoint `/upstatus/upstatus.user.js`.
- O branch #74 já corrige isso: `scripts/build.mjs` blob `55b7db9c36a58956cfa41d5002ac290ab8fee5d3` usa `release.scriptUrl` para update/download URL; `scripts/validate.mjs` blob `bab708afb472542961f1ee06478704ea41495280` valida contra o manifesto. #74 passa; master/QA ainda não contém o fix.
- O branch QA é documental e não incorpora o código de #74; por isso o Validate da #82 continua falhando.
- `release.json` Normal continua em 3.4.7. O build candidato também impede sincronizar um artefato rastreado com conteúdo diferente sem incrementar a versão. O guard de cutover da #89 exige versão estável superior a 3.4.7.

## Realtime e compatibilidade Normal / Team Lite

### Produção: runtimes efetivamente implantados

| Edge Function | Versão | SHA da fonte | Userscript embutido |
|---|---:|---|---|
| `upstatus` | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` | 3.4.7 |
| `upstatus-team-lite` | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` | 3.4.30 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` | API |
| `upstatus-test` | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` | 3.3.28 |

Todas as 38 Edge Functions de produção reportam `verify_jwt=false`; a autenticação depende dos handlers e da sessão customizada. Isso não é, isoladamente, prova de acesso anônimo, mas exige validação correta no handler.

Os scripts Normal e Team Lite efetivamente implantados ainda recebem eventos públicos `remote_command`, `remote_result`, `call_signal`, voice-room e screen-share. O Normal executa o comando remoto diretamente a partir do payload; o Team Lite também o faz após verificar a própria sessão. Ambos confiam em campos de remetente/destino fornecidos pelo payload para os handlers de chamada e mídia. Não encontrei `signalTransportFlag`, `realtime.setAuth()` ou `private:true` nos artefatos implantados.

### Candidatos

- #74 Normal e #76 Team Lite possuem `signalTransportFlag` default `false` e `signalTransportEndpoint` default vazio.
- Quando a flag é ligada, `receiveCallSignal` rejeita sinais sem `_authenticatedTransport`, exceto eventos limitados de descoberta; listeners de voice-room e screen-share deixam de consumir os broadcasts públicos.
- Com a flag desligada, o caminho público legado continua ativo. Portanto, a correção não é segura por default.
- #74 e #76 tratam `remote_command` como wake-up e ignoram `remote_result` público.
- #99 é um patch estreito: o teste confirma apenas que `remote_command` acorda uma consulta autenticada. O branch #99 ainda confia em `remote_result` e mantém handlers públicos de call/voz/tela; não substitui a migração completa e não está integrado ao candidato #74/#76.
- O módulo `signaling-transport.mjs` envia por HTTP com `x-upstatus-token`; não usa autenticação Realtime. Os templates de servidor Normal e Team Lite contêm `/api/setup-invite`, mas não implementam as rotas `/room/open`, `/poll`, `/room/members` nem as tabelas `upstatus_signal_*`. O endpoint configurável do cliente está vazio por default.
- A função `upstatus-signal-test` existe apenas no laboratório, não na lista de produção. O Dashboard setting `Allow public access` não é exposto pelos conectores. Não houve conexão anônima, broadcast de teste, injeção de SDP/ICE ou captura de mídia; o achado é estático e o acesso externo efetivo não foi reproduzido.

### HTTP 409: lacuna entre RPC, helper e runtime implantado

- O candidato #74 contém o mapeamento de `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409 no arquivo `supabase/functions/upstatus-signal-test/index.ts`, blob `67af33ac971410f1d2b1bd88ebc004f423d01623`.
- O runtime implantado no laboratório continua em `upstatus-signal-test` v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`. Seu código mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`; o erro desconhecido cai no fallback HTTP 500.
- O teste autenticado verifica `VOICE_ATTEMPT_ALREADY_ACTIVE` via `serviceRpc` direto, não pela rota HTTP. O teste `test-signal-test-helper-http-contract.mjs` é offline e valida o helper, não o runtime implantado.
- Logo, a integração RPC e o helper offline passam, mas o HTTP 409 no runtime v32 não está comprovado. Não foi feita requisição mutável pelo auditor.

## Supabase: snapshot read-only

### Projetos, migrations e Edge Functions

- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions ACTIVE.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, duas Edge Functions de teste ACTIVE.
- Produção não tem função `upstatus-signal-test`; laboratório tem `upstatus-signal-test` v32 (SHA acima) e `upstatus-signal-e2e-once` v3 (SHA `db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053`).
- A branch Supabase `main` permanece `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`. A causa ainda não foi diagnosticada.
- Não há terceiro projeto TEST full-product.

### AUTH-03

- Produção: 5 usuários; zero password hashes NULL/vazios; zero roles NULL/vazios; nenhuma coluna `setup_token_*`; RPC `consume_upstatus_setup_invite` ausente. O primeiro acesso legado continua disponível nos runtimes atuais.
- Laboratório: zero usuários no SELECT atual; quatro colunas setup-token e RPC `consume_upstatus_setup_invite` presentes. A RPC é SECURITY INVOKER, `search_path` vazio e EXECUTE restrito a service_role.
- Nenhuma migration AUTH-03 foi aplicada à produção.

### RLS, grants, SECURITY DEFINER e advisors

- Security Advisor: produção 6 WARN e 10 INFO; laboratório 0 WARN e 17 INFO.
- Produção: 10 tabelas public com RLS e zero policies; nove concedem privilégios diretos amplos a anon/authenticated, incluindo TRUNCATE, REFERENCES e TRIGGER. RLS não protege TRUNCATE.
- Laboratório: 17 tabelas public com RLS e zero policies; as tabelas backend-owned consultadas não concedem grants diretos aos clientes.
- `realtime.messages` em ambos: RLS ligado, zero policies, grants SELECT/INSERT/UPDATE para anon/authenticated. Produção tem 50 linhas, todas `private=false`; laboratório tem zero linhas.
- `storage.objects` em ambos: RLS ligado, zero policies e grants SELECT/INSERT para anon/authenticated. Não interpretar grants como prova de leitura/escrita efetiva: RLS continua sem policies.
- Três funções `upstatus_broadcast_*` de produção são SECURITY DEFINER, `search_path=public`, EXECUTE concedido a anon/authenticated e retornam `trigger`, estando ligadas a triggers. O aviso do Advisor sobre RPC direta é falso positivo para invocação RPC comum dessas funções; os grants continuam desnecessários. No laboratório, `search_path` é vazio e EXECUTE fica restrito a postgres/service_role.
- Default ACLs permanecem amplas em produção. No laboratório, defaults de postgres em public estão restritos, mas defaults de storage e supabase_admin ainda precisam de revisão.
- Performance Advisor: produção sem lints; laboratório com quatro INFO de índices não utilizados. Health Advisor: sem lints nos dois projetos.

### Realtime e Storage

- O tópico dos triggers de produção é `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; o tópico dos clientes é `upstatus-screen-share-live-3-1-1-beta10`. Não coincidem.
- `upstatus_broadcast_messages` envia `to_jsonb(OLD/NEW)` completo em broadcast público. O trigger remote-state emite campos de comando/resultado; os três broadcasts usam `private=false`.
- Produção: buckets `chat-images` e `profile-images` públicos, 20 MiB cada, zero policies em `storage.objects`. Laboratório não possui esses buckets.
- Config candidato: chat 25 MB e perfil 2 MB. Backend Normal tem rota de imagem até 25 MiB e signed-upload até 20 MiB. Arquivos entre 20 e 25 MiB podem passar pela primeira validação e falhar no bucket. Privacidade e limites precisam ser alinhados.

## Deploy e cutover

### Normal

- Workflow #74, blob `f3493d19cb59bb4d9f41eb4ab05d542befa2b8ce`: manual-only, exige master, SHA exato, projeto esperado `dlfvkawaiqduhlazsszm`, CLI 2.122.1 e release exatamente 3.4.7; deploya somente `upstatus`.
- Workflow #89, blob `c36ab9b5ec09546f0562b742fc351e5fe74d8d07`: manual-only, checkout SHA exato, valida projeto/organização, executa preflight read-only das migrations AUTH-03, fixa CLI 2.122.1 e deploya beta10 antes de upstatus. Não aplica migrations.
- O #89 passou no evento push no HEAD exato, mas não tem run pull_request. `release.json` continua 3.4.7 e o guard exige versão estável superior a 3.4.7. Cutover bloqueado.

### Team Lite

- Workflow oficial blob `e95bab7602fd3fcf80ab88ff44ccc9c259593c75` é manual, usa CLI `latest`, não fixa SHA, não valida projeto/organização e não faz preflight de migrations.
- Ele lê o `release.json` raiz (3.0.40, `preRelease=beta.22`) em vez de `team-lite/release.json` (3.4.30 estável; candidato #76 3.4.31) e executa `supabase functions deploy upstatus`, quando o alvo correto é `upstatus-team-lite`.
- No estado atual, o guard de pré-release do manifesto raiz deve falhar antes do deploy. Se esse guard for alterado sem corrigir o slug, o workflow ainda aponta para Normal. **Não despachar.**

## Issues e teste manual

- [#78 Reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios marcados. O corpo exige recuperação sem F5, sala aberta sem convite/aceitação, múltiplas quedas e interoperabilidade Normal ↔ Team Lite.
- [#79 Release](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 16 itens marcados e 19 pendentes.
- Nenhum teste físico foi executado pelo auditor nesta rodada: sem perda real de internet, microfone físico, captura de tela física ou instalação Tampermonkey.

## Próximos gates

1. Construir e validar no laboratório o backend server-mediated, com sessão, membership, destinatário, expiração, replay e rate limit; depois disponibilizar o endpoint em produção.
2. Tornar transporte autenticado obrigatório em Normal e Team Lite, configurar endpoint e remover listeners públicos sensíveis. Não ativar a flag atual enquanto o backend de produção não existir.
3. Corrigir o HTTP 409 no runtime isolado implantado e testar a rota real para `VOICE_ATTEMPT_ALREADY_ACTIVE`; não basta o teste RPC/helper offline.
4. Corrigir o workflow Team Lite: manifesto correto, slug `upstatus-team-lite`, projeto esperado, SHA exato, CLI pinada, preflight e rollback. Não despachar o atual.
5. Incorporar o build fix de updateURL à linha master/QA e obter Validate verde no novo HEAD da #82.
6. Selecionar versão Normal estável superior a 3.4.7 e executar o plano API-first do #89 após revisão/autorização.
7. Fechar AUTH-03 e o corte coordenado de todos os runtimes; não aplicar migrations de produção sem autorização explícita.
8. Corrigir grants/Default ACLs com owner autorizado; alinhar tópicos/payloads Realtime; decidir Storage privado e limites; diagnosticar `MIGRATIONS_FAILED`.
9. Corrigir o filtro de evento PR do #100 e integrar/revisar #99 sem deixar confiança em `remote_result`, call, voz ou tela públicos.
10. Completar os oito testes físicos da #78, atualizar #79 e obter reviews humanas.

## Limites e segurança

Todas as consultas SQL desta execução foram SELECT-only. Não executei scripts mutáveis, não alterei fixtures, não publiquei broadcasts, não fiz conexão Realtime externa, não capturei áudio/tela e não iniciei workflows manualmente. Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou modificação de issue/branch de engenharia foi realizada. A única escrita desta execução é a criação desta nota nova na branch QA.
