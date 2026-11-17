# UpStatus — auditoria independente de QA
**Data:** 2026-11-12 09:00 UTC  
**Repositório:** Reekyi/UpStatus  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Supabase laboratório:** bfpjtfqlnypisxljoxkb  
**Recomendação:** NOT READY — não liberar.

## 1. Método e limites
- Inspeção somente leitura de refs, PRs, diffs listados, workflows, logs de jobs concluídos, código-fonte e metadados das Edge Functions.
- Consultas PostgreSQL somente SELECT e catálogos. Nenhuma migration, DDL, DML, alteração de grants, policy, ACL, role, secret ou flag.
- Os resultados CI citados pertencem aos run IDs e HEADs indicados. CI de navegador/VM/fixtures não é teste físico de Tampermonkey.
- Não foram iniciados workflows, reruns, chamadas externas de sinalização, uploads, testes de microfone/tela ou quedas físicas de rede.

## 2. Heads reais e integridade
| Ref | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| qa/release-readiness-2026-11-04-master | b4795dda00b3c9d39e0e85a49005ee4208fc0e86 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

A comparação QA versus master está divergida: 245 commits à frente e 1 atrás. O merge-base é a9288ccfcb0f308d3a587bfca624418a395be07b. Não foi feito rebase. A branch QA permanece separada e recebeu somente um novo arquivo documental nesta execução.

O documento docs/RELEASE_READINESS.md foi recuperado integralmente pelo endpoint de conteúdo do GitHub: 8.410 linhas, blob SHA 7cfbd70886df42ce790c078c224b19284a632595. O último checkpoint interno é de 2026-11-08 18:30 UTC; o documento não contém as revalidações de 12/11 e está desatualizado em relação aos HEADs atuais. O original foi preservado.

## 3. PRs obrigatórias e CI
| PR | HEAD / base | Estado | Evidência atual |
|---|---|---|---|
| #74 Normal | fb878537d95db9097cce6d29a14260b9fd8d2e3d / master | open, Draft, 883 commits, 90 arquivos | Validate e Signaling Smoke SUCCESS, run 42753434336. Log do smoke: 19/19 checks não autenticados, 136/136 autenticados, WebRTC de chamada/voz/tela, 90 aceitos + 1 HTTP 429 com Retry-After 60s. |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 / team-lite-official | open, Draft, 59 commits, 10 arquivos | Candidate Checks PASS histórico, run 41674353127. HEAD sem alteração desde 03/11; não substitui a candidata #76. |
| #76 Team Lite | c4dee8d2c502499de5f95932ac14a90cffb56196 / team-lite-official | open, Draft, 384 commits, 57 arquivos | Candidate Checks SUCCESS, run 43124413080. Log: 16/16 não autenticados, 110/110 autenticados, 11/11 contratos HTTP isolados, WebRTC de áudio/vídeo, rate limit 90 + 1 HTTP 429 e rate limit de emissão de convite. Build reporta 3.4.31. |
| #82 QA independente | b4795dda00b3c9d39e0e85a49005ee4208fc0e86 / master | open, Draft, 245 commits, 108 arquivos; mergeable_state unstable | Validate FAILURE, run 43177246629. O job fez checkout do merge ref 03efeabbdd797d80679d03a3636bf347e4ad4eae e falhou em scripts/validate.mjs:26 com “production updateURL mismatch”. |

Nenhuma review humana foi registrada nas PRs #74, #75, #76, #82, #147 e #149. Todas permanecem Draft.

### Candidatas recentes relacionadas
- #147, HEAD fdc727d072008b064fb8f3c4af52067c5da15111, base QA 6b9aba1c4ec96a8e8472343bfbc0221636b1c872, open/Draft. Validate completo SUCCESS em 43176202190: build, contrato de updateURL, regressões completas de chat e validação final. A candidata usa release.json.scriptUrl. Atenção: a base da PR está 8 commits atrás do HEAD QA atual b4795dda; revalidar contra a base atual antes de aceitar o resultado como integração final.
- #148, HEAD 716a41db346de2f7ea1c821e29f02fb0256d09c5, base branch fix/qa-release-script-url-20261112 no SHA e6c1b740d3f3b2b5c05fcc603f7420e1c131aea3. Guard direcionado PASS em 43151989910. Remove o fallback nominal de administrador e usa papel armazenado; porém /api/setup ainda chama login(req,true) sem token de convite. Uma conta já marcada como admin e sem senha preservaria o papel. A base da #148 está 4 commits atrás do HEAD atual da #147; reconciliar as branches antes da integração.
- #149, HEAD 77352d2e3b93722d6b69a9eec31a92bb63158230, base team-lite/signaling-transport-candidate no HEAD da #76 c4dee8d2. Guard e Candidate Checks SUCCESS em 43173176077 e 43173176232. Log: 16/16 não autenticados, 110/110 autenticados, 11/11 contratos HTTP, áudio de chamada/voz, vídeo de tela, rate limit 90 + 1 HTTP 429 e rate limit de convite. A validação de triggers agora aceita listas YAML inline e em bloco. A candidata separa a origem autenticada do payload; a política pública só permite hints presence/ended com discoveryOnly=true. O transporte segue opt-in e desativado por padrão.
- #131 AUTH-03 Normal, HEAD 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b, um commit à frente da base #74 fb878537. Open/Draft. Smoke SUCCESS em 42760281798; contém migration 20261109230000_setup_invite_rate_limit.sql e teste correspondente. A migration de rate limit não está no HEAD da #74 isoladamente; é necessário integrar/reconciliar #131 para paridade completa com #76.
- #143 dispatcher Normal, HEAD c4a04fa755b877bc76b1372170a26e7b974264e6, open/Draft. Candidate Validate SUCCESS em 43093687347. O workflow candidato é manual-only, exige operação release/rollback, branch master e confirmação explícita, verifica projeto/organização e publica API beta10 antes do userscript Normal. Porém a #146 está divergida: #146 tem 10 commits exclusivos à frente e 15 atrás da #143; não combinar/publicar sem reconciliação.
- #146 remote-command, HEAD 71c5ce2f730ade8ee3e8b090498202933809ce5c, open/Draft. Validate SUCCESS em 43108250452. Transforma remote_command público em wake-up e busca comando pela API autenticada; precisa ser integrado ao dispatcher #143 após reconciliação.
- #129 guard Team Lite, HEAD f48a2d9edf5d46aaca46d79f4b26c6fd8305c51c, open/Draft. Guard SUCCESS em 42993962545; propõe bloquear o workflow legado de publicação, mas ainda não foi incorporado à branch oficial.

## 4. Código efetivamente implantado
Management API retornou:
| Edge Function produção | Versão | SHA da fonte | verify_jwt |
|---|---:|---|---|
| upstatus | 480 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd | false |
| upstatus-team-lite | 15 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb | false |
| upstatus-screen-share-3-1-1-beta10 | 6 | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 | false |
| upstatus-test | 281 | 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a | false |

A produção possui 38 Edge Functions ativas; todas reportam verify_jwt=false. Isso não prova ausência de autenticação: os handlers principais usam sessão própria e precisam ser avaliados individualmente. Não existe slug de produção upstatus-signal.

As fontes de upstatus e upstatus-team-lite foram lidas e os USERSCRIPT_BASE64 embutidos foram decodificados:
- Normal v480 contém userscript 3.4.7.
- Team Lite v15 contém userscript 3.4.30.
- Ambos assinam upstatus-screen-share-live-3-1-1-beta10, usando channel(UP_REALTIME_TOPIC), sem private:true e sem realtime.setAuth().
- O trigger SQL publica em upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Os tópicos não coincidem.
- Normal executa diretamente executeRemoteCommand(c) quando recebe remote_command.
- Team Lite verifica a própria sessão e geração, mas ainda executa o comando do payload; isso não autentica o emissor.
- Ambos entregam call_signal, voice-room e screen-share a handlers com validação estrutural, sem prova de identidade do emissor no transporte instalado.
- Ambos mantêm /api/setup -> login(req,true), sem setup token e sem rate limit de emissão de convite.
- O login implantado ainda tem fallback nominal para implementation_admin quando role está vazio.

A API beta10 v6 foi inspecionada: não contém rotas /signal, /broadcast ou /poll para sinalização server-mediated. O laboratório tem upstatus-signal-test v32 (SHA f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712) e upstatus-signal-e2e-once v3; isso não equivale a backend implantado em produção.

## 5. Realtime, RLS, grants e SECURITY DEFINER
Consulta SELECT em realtime.messages:
- 109 linhas; 109 private=false.
- Um único tópico legado: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- Eventos: 40 db_change, 57 user_status, 6 remote_result, 6 remote_command.

Catálogo PostgreSQL:
- public: 10 tabelas com RLS habilitado e zero policies; FORCE RLS em zero tabelas.
- realtime: realtime.messages com RLS, zero policies e FORCE RLS desabilitado.
- storage: 10 tabelas com RLS e zero policies.
- Grants efetivos para anon/authenticated: public 126, storage 32, realtime 8; total 166.
- public inclui 18 grants TRUNCATE em nove tabelas (cada uma para anon e authenticated). RLS não protege TRUNCATE.
- Default ACL: 120 entradas direcionadas a papéis clientes em graphql, graphql_public, public e storage; 300 entradas ACL expandidas no total.

As três funções public.upstatus_broadcast_messages(), upstatus_broadcast_remote_state() e upstatus_broadcast_users():
- SECURITY DEFINER, search_path=public, retorno trigger.
- EXECUTE true para anon, authenticated e service_role.
- Advisor reporta 3 WARN para anon e 3 WARN para authenticated. A auditoria não executou RPC nem demonstrou invocação direta dessas funções; o retorno trigger e os privilégios amplos foram registrados separadamente.
- O trigger de mensagens publica a linha OLD/NEW inteira via to_jsonb; os triggers de estado e usuário publicam metadados no tópico público.

Security Advisor produção: 10 INFO de RLS sem policy, 3 WARN anon e 3 WARN authenticated. Performance e Health Advisors sem findings.

## 6. Storage, chat e dados de autenticação
- Buckets chat-images e profile-images são públicos, limite 20 MiB cada.
- 168 objetos em chat-images e 20 em profile-images.
- Zero policies próprias em storage.objects.
- public.messages: 296 linhas; 296 com file_name nulo.
- public.users: 5 contas; zero password_hash vazio/nulo e zero role vazio/nulo. Isso não fecha o fluxo de primeiro acesso.

## 7. Produção versus laboratório
Projetos Supabase disponíveis: somente dois.
- Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions.
- Laboratório bfpjtfqlnypisxljoxkb: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, duas Edge Functions de teste.
- Não existe terceiro projeto full-product TEST. upstatus-test v281 está dentro do projeto de produção.
- Laboratório consultado: zero linhas em users, messages, upstatus_sessions, upstatus_signal_rooms, upstatus_signal_events e upstatus_setup_invite_rate_limits.
- Laboratório tem 18 tabelas public com RLS sem policies, mas nenhuma concessão direta de tabela public a anon/authenticated nas consultas de grants.
- As três funções de broadcast do laboratório seguem SECURITY DEFINER com search_path vazio; EXECUTE false para anon/authenticated e true para service_role.
- Security Advisor do laboratório: 18 INFO RLS sem policy; nenhum WARN de SECURITY DEFINER.
- Branch gerenciada main da produção permanece MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.

## 8. AUTH-03 e proveniência
Produção:
- 0 colunas setup_token_*.
- Tabela upstatus_setup_invite_rate_limits ausente.
- RPC consume_upstatus_setup_invite ausente.
- RPC consume_upstatus_setup_invite_rate_limit ausente.
- Cinco contas existentes estão configuradas.

Laboratório tem migrations e RPCs de convite/rate limit. Os candidatos Normal #131 e Team Lite #76 possuem migration e teste de rate limit iguais; a #131 é um commit adicional sobre a base #74 e continua Draft.

As sete migrations registradas em produção são:
20261005160000, 20261005173000, 20261005180000, 20261023154754, 20261026195855, 20261027154329, 20261027155438.
Os quatro SQLs correspondentes às versões 20261023154754, 20261026195855, 20261027154329 e 20261027155438 retornam 404 no branch master. O dispatcher #143 deve continuar fail-closed para arquivos sem proveniência original.

## 9. Issues e aceitação física
- Issue #78 permanece OPEN, 0/8 critérios marcados. Não houve queda física de internet, reconexão sem F5, microfone real, permissões reais de captura, interoperabilidade instalada Normal ↔ Team Lite ou validação Tampermonkey nesta execução.
- Issue #79 permanece OPEN. O comentário dedicado QA foi atualizado; o corpo/checklist histórico não foi reescrito.
- Nenhum teste manual foi executado nesta rodada. CI automatizado de Chromium/VM/fixtures foi classificado como CI, não teste manual.

## 10. Bloqueadores e recomendação
**NOT READY.**
1. RT-01: migrar comandos e sinalização para transporte autenticado/server-mediated em produção; alinhar tópico, reduzir payloads públicos e endurecer grants/ACL.
2. AUTH-03: integrar convite obrigatório e rate limit nas APIs Normal/Team Lite; remover fallback nominal e validar HTTP real.
3. ACL-STORAGE: revisar grants, TRUNCATE, Default ACL e buckets públicos com plano de compatibilidade/rollback.
4. Reconciliar #146 com #143; as branches estão divergidas.
5. Corrigir workflow oficial Team Lite: atualmente usa CLI latest e publica slug upstatus, não upstatus-team-lite. #129 é apenas candidato de bloqueio.
6. Integrar #131 na linha Normal; #74 isoladamente não contém a migration de rate limit.
7. Recuperar e validar os quatro SQLs originais.
8. Revalidar #147 contra o HEAD QA atual; sua base está 8 commits atrás.
9. Executar os oito critérios físicos da #78 e obter revisão/aprovação humana.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva. A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.
