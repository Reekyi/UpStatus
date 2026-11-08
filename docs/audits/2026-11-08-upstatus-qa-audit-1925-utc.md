# Auditoria independente UpStatus — 2026-11-08 19:25 UTC

## Integridade e escopo

- Repositório: Reekyi/UpStatus.
- Branch QA: qa/release-readiness-2026-11-04-master.
- HEAD lido antes desta gravação: 64b5e6da7ae1cbd7b7bc7601560983e62cbb170f.
- docs/RELEASE_READINESS.md lido pelo blob SHA: 7cfbd70886df42ce790c078c224b19284a632595 (1.045.105 caracteres).
- Master atual na comparação: 9d40461babcec8eb868c6a2c04be9c675df7da381.
- QA vs master: 135 commits à frente, 1 atrás. PR #82 continua Open/Draft.
- Esta nota é um arquivo novo. O readiness principal não foi substituído nem reescrito.
- Escopo de banco: SELECT e leitura de metadados/código apenas. Nenhum teste mutável foi iniciado pelo auditor.

## Decisão executiva

**NÃO LIBERAR.** Permanecem bloqueadores de segurança e de operação: os runtimes de produção ainda confiam em sinais Realtime sem identidade autenticada do remetente; não existe função de sinalização server-mediated no projeto de produção; o workflow Team Lite aponta para o slug Normal; AUTH-03 ainda não está aplicado em produção; e a candidata Team Lite tem uma lacuna entre o contrato HTTP testado offline e a função v32 atualmente implantada no laboratório.

## PRs, heads e distância

| PR | HEAD | Estado | Observação |
|---|---|---|---|
| #74 | 9c0133e8cf6bd85ac8993888718a408db2f24a3e | Open/Draft | 877 commits à frente e 1 atrás de master; build candidate corrigido; CI e signaling smoke aprovados |
| #75 | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | Open/Draft | Baseline Team Lite histórico |
| #76 | eb28e88325d7e8a6236d9050bebabf794d64a8c4 | Open/Draft | 364 commits à frente de team-lite-official e 305 à frente do baseline #75 |
| #82 | 64b5e6da7ae1cbd7b7bc7601560983e62cbb170f | Open/Draft | QA documental; 135 à frente e 1 atrás de master |
| #89 | 4224dc31683d4b235e52d2ddcece1570294763f0 | Open/Draft | Guard de cutover aprovado em push |
| #92 / #93 | 2a1b8c74 / fb9ccd9b | Open/Draft | Guards verify_jwt de Team Lite e Normal aprovados |
| #94 / #95 | 00462a20 / 3dc309ce | Open/Draft | UI de convites Normal e Team Lite com CI aprovado |
| #96 / #97 | f4ee025d / ba318f72 | Open/Draft | Teste de emissão Normal e Full-IIFE não-admin Team Lite aprovados |
| #98 | 76753b11 | Open/Draft | Full-IIFE Normal falhou |
| #99 | bdce3962 | Open/Draft | Wake-up de remote_command aprovado, mas correção parcial |
| #100 | f8716a04 | Open/Draft | Push passou; não há run pull_request no HEAD |

Os endpoints de reviews consultados para #74, #75, #76, #82, #99 e #100 não retornaram reviews humanas.

## CI: evidência e classificação

### Aprovado automaticamente

- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42451736696
- #74 Signaling Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42451736729. Logs confirmam 19/19 checks não autenticados, 136/136 autenticados, browser WebRTC para chamada/voz/tela, mesh de três participantes, cleanup de usuários/sessões/salas/memberships/eventos e teste AUTH-03 isolado.
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/42450476433. Logs confirmam 16/16 não autenticados, 110/110 autenticados, browser WebRTC para chamada/voz/tela, mesh de três participantes, rate limit 90 aceitos/1 rejeitado e cleanup.
- #92 Team Lite JWT: https://github.com/Reekyi/UpStatus/actions/runs/42493683062.
- #93 Normal JWT: https://github.com/Reekyi/UpStatus/actions/runs/42493686213.
- #94 Normal UI: https://github.com/Reekyi/UpStatus/actions/runs/42498502349.
- #95 Team Lite UI: https://github.com/Reekyi/UpStatus/actions/runs/42499560082.
- #96 emissão de convite: https://github.com/Reekyi/UpStatus/actions/runs/42501260634.
- #97 Full-IIFE não-admin Team Lite: https://github.com/Reekyi/UpStatus/actions/runs/42501696875.
- #99 wake-up guard: https://github.com/Reekyi/UpStatus/actions/runs/42503227603.
- #100 Full-IIFE Normal em evento push: https://github.com/Reekyi/UpStatus/actions/runs/42503432784.
- #89 Production Cutover Guard Candidate: https://github.com/Reekyi/UpStatus/actions/runs/42486397701, push no HEAD 4224dc, sucesso. **Correção de classificação:** este run é Production Cutover Guard Candidate, não AUTH-03 Integration. A evidência de integração AUTH-03 está nos jobs #74/#76 acima.

### Falhou ou não validado no evento correto

- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42510980751. Falha em Validate build, job 128823763932, com production updateURL mismatch.
- #98 Full-IIFE Normal: https://github.com/Reekyi/UpStatus/actions/runs/42502183259. Playwright aguardou o botão de configurações enquanto o card estava fechado; timeout de 10 segundos. O passo de validação posterior foi skipped.
- #100 não tem run pull_request no HEAD f8716a. O workflow .github/workflows/normal-setup-invite-ui.yml, blob 17c84d2d3b87069d7176c6ddd76c219c5c9e778a, inclui a branch base de #100 em push (duplicada), mas não em pull_request.branches. O push verde não substitui o check de PR. #98 continua no HEAD que falhou.

### Causa exata da falha de updateURL em master/QA

- release.json blob 93caf1701ea508575c90d002c0b8c3037b34d82a aponta scriptUrl para /functions/v1/upstatus/upstatus.user.js.
- scripts/build.mjs em master/QA, blob 51fd9983c53ad88cd269b251423bfc3439131139, define o cloud de produção como /functions/v1/upstatus-screen-share-3-1-1-beta10 e deriva updateUrl = cloud + /upstatus.user.js.
- scripts/validate.mjs, blob b1fa56c204c9e4dc6a689bced81efb9f5466b48f, exige /upstatus/upstatus.user.js.
- Resultado: o build publica metadado de atualização apontando para beta10, enquanto o manifesto/validador esperam o endpoint de distribuição upstatus.
- A correção já existe no branch #74: scripts/build.mjs blob 55b7db9c36a58956cfa41d5002ac290ab8fee5d3 usa release.scriptUrl para update/download URL, mantendo o beta10 como API base; scripts/validate.mjs blob bab708afb472542961f1ee06478704ea41495280 compara o header com o manifesto. #74 Validate passa. O fix ainda não está em master/QA.

## Realtime e compatibilidade Normal/Team Lite

### Produção: código efetivamente implantado

Foram lidos os quatro runtimes relevantes e decodificados os userscripts embutidos:

| Função | Versão Edge | SHA da fonte | Userscript |
|---|---:|---|---|
| upstatus | v480 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd | 3.4.7 |
| upstatus-team-lite | v15 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb | 3.4.30 |
| upstatus-screen-share-3-1-1-beta10 | v6 | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 | API |
| upstatus-test | v281 | 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a | 3.3.28 |

Os scripts Normal, Team Lite e TEST em produção ainda:
- executam diretamente executeRemoteCommand com base no payload broadcast remote_command;
- recebem call_signal, eventos de voice room e screen share e encaminham os payloads aos handlers;
- não contêm signalTransportFlag, realtime.setAuth() ou private:true.

O remetente é representado por campos da própria mensagem (from/to/roomId/SDP), sem identidade autenticada verificada pelo cliente. O canal usa o tópico upstatus-screen-share-live-3-1-1-beta10 e publishable key público.

**Limite da evidência:** o setting Dashboard “Allow public access” não foi exposto pelos conectores. Não houve conexão WebSocket anônima, injeção de broadcast, exploração ou captura de mídia. A exploração externa não foi reproduzida; a falha de confiança está confirmada estaticamente e bloqueia release até o caminho público ser removido/validado.

### Candidatos

- #74 Normal e #76 Team Lite já tratam remote_command apenas como wake-up e ignoram remote_result público. Ambos possuem sinalização HTTP server-mediated opt-in.
- Em ambos, signalTransportFlag default é false e signalTransportEndpoint default é string vazia. Com a flag desligada, o caminho legado público continua ativo.
- Quando a flag está ligada, receiveCallSignal rejeita mensagens sem _authenticatedTransport, exceto eventos de descoberta limitados; os listeners de voz/tela deixam de consumir broadcasts públicos.
- Portanto, os candidatos ainda não tornam o transporte autenticado obrigatório por padrão.
- #99 corrige apenas o wake-up de remote_command no stack Normal. Seu branch não contém signalTransportFlag nem o módulo signaling-transport; call_signal, voice room e screen share continuam recebidos diretamente de broadcasts. Além disso, o listener remote_result ainda confia em commandId/sender fornecidos no payload e pode falsificar o resultado exibido ao administrador. O #74 ignora esse broadcast e consulta o resultado por HTTP autenticado. #99 é correção parcial, não substitui a migração completa.

### Backend de sinalização

- Produção tem 38 Edge Functions ACTIVE, todas verify_jwt=false; nenhuma função com slug contendo “signal” foi encontrada.
- Laboratório bfpjtfqlnypisxljoxkb tem somente upstatus-signal-test v32 (SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712) e upstatus-signal-e2e-once v3 (SHA db0c9206b2171f5f5d67459e2e7451ecbaf6e8ad3c8f55cb4e491660164f5053).
- Não existe backend server-mediated equivalente em produção. A flag do cliente não pode ser ativada com segurança até o endpoint de produção existir, ser configurado e passar testes.

### Divergência do HTTP 409 de voz

- A RPC do laboratório open_upstatus_signal_voice_room_attempt retorna VOICE_ATTEMPT_ALREADY_ACTIVE quando a mesma conta tenta abrir uma segunda tentativa ativa. A função está SECURITY INVOKER, search_path vazio e EXECUTE apenas para service_role.
- O código da função implantada upstatus-signal-test v32 ainda mapeia VOICE_ATTEMPT_CONFLICT e ROOM_FULL para HTTP 409, mas não VOICE_ATTEMPT_ALREADY_ACTIVE; o código desconhecido cai em HTTP 500.
- O candidato Team Lite tem http-contract.mjs blob c840d4a8965b1ca3a4c7519300efe30dbde4ba76 que mapeia esse código para 409, e o teste offline blob 217e44b241d94782767800892843f70205c20b2a verifica o helper e seu uso no source.
- A integração autenticada verifica VOICE_ATTEMPT_ALREADY_ACTIVE via serviceRpc direto, não pela rota HTTP. O teste do mapper é offline. Portanto, CI verde não prova o HTTP 409 no runtime v32 atualmente implantado. Exigir teste HTTP contra o endpoint isolado após atualizar o runtime do laboratório.

## Supabase: snapshots read-only

### Projetos e migrations

- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, região us-west-2, 7 migrations; última 20261027155438.
- Laboratório bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, região sa-east-1, 38 migrations; última 20261108050802.
- A branch main do projeto de produção reporta MIGRATIONS_FAILED, embora preview_project_status seja ACTIVE_HEALTHY.
- A lista de projetos conectados contém somente produção e laboratório; não foi localizado um terceiro projeto TEST full-product.
- Produção: 5 usuários, 0 password_hash NULL/vazio e 0 roles vazios. As quatro colunas setup_token_* e a RPC consume_upstatus_setup_invite não existem.
- Laboratório: 0 usuários/fixtures após o último cleanup observado; quatro colunas setup-token e RPC de consumo existem.

### AUTH-03 em produção

Os runtimes Normal e Team Lite de produção ainda expõem GET /api/account com needsSetup e POST /api/setup que chama login(req,true). O handler legado permite o primeiro chamador de uma conta sem password_hash definir senha; o fallback atribui implementation_admin a nomes Ricardo, Lohan e Guilherme. Os usuários atuais têm hashes, mas isso não elimina o risco para contas futuras ou provisionadas sem senha. A produção ainda não recebeu as migrations AUTH-03.

### RLS, grants e SECURITY DEFINER

- Security Advisor produção: 6 WARN e 10 INFO; laboratório: 0 WARN e 17 INFO.
- Produção: 10 tabelas public com RLS e zero policies. Nove concedem privilégios diretos amplos a anon/authenticated, incluindo TRUNCATE, REFERENCES, TRIGGER e MAINTAIN; upstatus_visual_config é a exceção sem grants de cliente.
- Laboratório: 17 tabelas public com RLS e zero policies, sem grants diretos de tabela para anon/authenticated nas tabelas backend-owned consultadas.
- realtime.messages em ambos: RLS ligado, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated. A ausência de policy impede acesso normal por RLS; os grants continuam desnecessários e a configuração de canal deve ser avaliada separadamente.
- Três funções upstatus_broadcast_* em produção são SECURITY DEFINER, search_path=public e têm EXECUTE concedido a anon/authenticated/service_role. pg_proc confirma RETURNS trigger e pg_trigger confirma associação a triggers. A mensagem do Advisor sobre chamada direta via /rpc é falso positivo para invocação RPC comum dessas funções trigger; os grants EXECUTE continuam desnecessários e devem ser revogados por procedimento autorizado.
- Default ACLs de postgres em public (sequences, functions e tables), storage e de supabase_admin em public/graphql/graphql_public permanecem amplas na produção. No laboratório, defaults de postgres em public estão restritos, mas storage e defaults de supabase_admin continuam amplos.

### Realtime

- 50 linhas em realtime.messages na produção; 50 private=false (42 user_status, 8 db_change), zero policies.
- O tópico dos triggers é upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0; o tópico dos userscripts é upstatus-screen-share-live-3-1-1-beta10. Não coincidem.
- O trigger de mensagens publica OLD/NEW completo em broadcast público. Não conectar os clientes ao tópico do trigger sem minimizar payload e definir autorização.
- Laboratório: zero mensagens e zero partições; os triggers usam payload minimizado, mas private=false ainda está presente.

### Storage

- Produção: chat-images e profile-images públicos, limite de 20 MiB cada; zero policies em storage.objects.
- Normal server template tem mediaRoute de imagem com limite de 25 MiB, enquanto o bucket é 20 MiB e signed upload é 20 MiB; alinhar para evitar upload entre 20 e 25 MiB falhar no Storage.
- O laboratório não possui buckets chat-images/profile-images.
- Decisão de privacidade e teste real de upload/download continuam pendentes.

### Logs

Na janela de 24 horas consultada, edge_logs tinha 731 eventos; function_edge_logs 215 e function_logs 132 estavam concentrados apenas no trecho final da janela (aprox. 18:39–19:14 UTC). Não usar essas amostras parciais para inferir tráfego diário por runtime ou desuso.

## Deploy e release

- Workflow Team Lite em team-lite-official, blob e95bab7602fd3fcf80ab88ff44ccc9c259593c75, é manual mas não fixa SHA, não verifica projeto, não faz preflight de migrations, instala CLI latest, valida o release.json raiz e executa supabase functions deploy upstatus. O slug correto do runtime Team Lite é upstatus-team-lite. team-lite/release.json no candidato declara buildVersion 3.4.31, mas o workflow não usa esse manifesto. **Não despachar.**
- Workflow Normal candidato, blob c36ab9b5ec09546f0562b742fc351e5fe74d8d07, fixa checkout em github.sha, exige master, verifica projeto/organização, valida migrations AUTH-03 em modo read-only, fixa Supabase CLI 2.122.1 e implanta beta10 antes de upstatus.
- Normal release.json continua 3.4.7. verify-production-cutover.mjs exige versão estável maior que 3.4.7. O cutover permanece bloqueado.
- Nenhuma migration ou deploy foi executado pelo auditor.

## Issues e teste manual

- #78 permanece aberta, atualizada em 2026-11-08T07:04:34Z, 0/8 critérios marcados. O próprio corpo registra reprodução manual: queda de internet por cerca de 10 segundos durante sala de voz e, após reconexão, não consegue reentrar sem F5. A regra funcional é sala aberta, sem convite/aceitação.
- #79 permanece aberta, atualizada em 2026-11-08T19:12:10Z; corpo contém 16 itens marcados e 19 desmarcados. Tratar como checklist documental, não como aprovação de release.
- Nenhum teste manual físico foi executado nesta rodada. Não foram testados microfone físico, captura de tela física, perda real de rede ou instalação Tampermonkey.

## Próximos gates obrigatórios

1. Tornar server-mediated signaling obrigatório em Normal e Team Lite, com endpoint de produção, sessão, membership, destinatário, expiração, replay e rate limit verificados no servidor.
2. Remover listeners públicos de call_signal/voice/screen e ignorar remote_result público; manter apenas wake-up hints sem payload confiável.
3. Verificar formalmente Allow public access no Dashboard e documentar a decisão de canais.
4. Corrigir e testar HTTP 409 no runtime isolado implantado, não somente no helper offline.
5. Corrigir workflow Team Lite para upstatus-team-lite, SHA exato, projeto esperado, preflight e rollback.
6. Incorporar o build fix de updateURL do #74 ao branch de release/master e repetir Validate.
7. Selecionar versão Normal estável superior a 3.4.7.
8. Planejar AUTH-03 e o cutover dos runtimes Normal, beta10, Team Lite e TEST; congelar provisionamento durante a janela.
9. Corrigir grants/default ACLs com owner administrativo autorizado e rever SECURITY DEFINER trigger grants.
10. Alinhar tópicos e payloads Realtime; decidir canal privado ou server-mediated.
11. Definir Storage privado, policies e limites coerentes; testar upload/download real.
12. Diagnosticar MIGRATIONS_FAILED da branch main.
13. Resolver a reconexão reproduzida em #78 e completar os oito critérios físicos.
14. Atualizar #79 com heads/checks atuais e obter reviews humanas.

## Limites desta rodada

Todas as consultas SQL foram SELECT-only. Nenhum script mutável foi executado pelo auditor. Não houve conexão Realtime externa, envio de broadcasts, teste de ataque, captura de mídia, alteração de produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou modificação de issue/branch de engenharia. A única escrita desta rodada é a criação desta nota documental na branch QA.
