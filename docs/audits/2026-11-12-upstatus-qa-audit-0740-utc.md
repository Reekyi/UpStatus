# UpStatus — auditoria independente QA

**Data da auditoria:** 2026-11-12T07:42:25.630Z  
**Repositório:** Reekyi/UpStatus  
**Produção Supabase:** dlfvkawaiqduhlazsszm  
**Laboratório isolado:** bfpjtfqlnypisxljoxkb  
**Branch documental:** qa/release-readiness-2026-11-04-master

## Veredito

**NOT READY — não liberar.**

Houve progresso verificável nas candidatas: a PR #147 passou pelo Validate offline completo no merge ref que combina sua cabeça com a QA atual; a PR #149 passou pelo guard de proveniência de sinalização e pelos Candidate Checks completos. Isso não altera o estado dos runtimes instalados: Normal v480 e Team Lite v15 ainda executam comandos e processam sinalização recebidos por broadcasts públicos.

Os bloqueadores de release continuam sendo: integração incompleta das correções, Realtime público, transporte autenticado de voz/tela ainda opt-in, primeiro setup sem convite obrigatório na produção, workflow Team Lite apontando para o runtime Normal, grants/ACL/Storage amplos, migrations sem proveniência e ausência de aceitação física.

## Método e limites

- GitHub: inspeção read-only de refs, PRs, diffs, arquivos, workflows e logs de execuções já existentes.
- Supabase: consultas SELECT-only em catálogos, tabelas de metadados e contagens; inspeção de Edge Functions e Security Advisor.
- Não iniciei nem repeti workflows.
- Não executei testes de navegador nesta rodada; apenas examinei logs de CI já concluídos.
- Não executei teste físico no Tampermonkey, perda real de rede, microfone/display permissions ou interoperabilidade instalada.
- Não houve escrita em produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag, grants, policy, ACL ou fixture.
- A única escrita desta rodada é este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.

## Heads reais e documentação

| Ref | HEAD observado |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA | 7c5691740eacab79d531ac0ecee1ef15c3ae8adf |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

A comparação master → QA retornou QA 244 commits à frente e 1 atrás. O único commit master-only é documental: docs/checkpoints/2026-11-08-production-migration-history-preflight.md. Não fiz rebase.

As branches master, QA e team-lite-official estão sem proteção; a API de rulesets retornou lista vazia.

Li integralmente docs/RELEASE_READINESS.md na branch QA: 8.410 linhas, aproximadamente 1,045 MB. O último checkpoint interno é 08/11/2026 às 18:30 UTC. O arquivo está desatualizado em relação aos heads e execuções de 12/11; foi preservado, sem edição.

## PRs e CI

### PR #74 — Normal

- Aberta e Draft; HEAD fb878537d95db9097cce6d29a14260b9fd8d2e3d.
- Validate 42753434411: PASS.
- Signaling Smoke 42753434336: PASS.
- O log do Smoke registra 136/136 verificações autenticadas, negociação WebRTC e entrega de áudio/vídeo em navegador, mesh de três membros, teardown, rate limit 90 aceitas + 1 rejeitada HTTP 429, concorrência de tentativas de voz, setup enrollment e cleanup.
- Inspeção do source da branch: remote_command já é tratado como wake-up e agenda polling autenticado. Porém call_signal ainda passa diretamente ao handler; voice-room e screen-share continuam usando o caminho público quando signalTransportFlag está false.
- CI não equivale a teste físico.

### PR #75 — baseline Team Lite

- Aberta e Draft; HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309.
- É baseline histórica, não substitui a candidata #76.
- Não encontrei nesta rodada uma nova execução exata que acrescente evidência além dos registros históricos.

### PR #76 — Team Lite signaling candidate

- Aberta e Draft; HEAD c4dee8d2c502499de5f95932ac14a90cffb56196, base team-lite-official.
- Candidate Checks 43124413080: SUCCESS.
- Log: 110/110 verificações autenticadas; testes de chamadas, sala de voz e compartilhamento de tela com entrega de áudio/vídeo em navegador; mesh de três membros; rate limit 90+1/429; convite e roster; concorrência de voice attempts; cleanup; polling de remote-command reconciliado após SUBSCRIBED.
- O remote_command da candidata é wake-up-only.
- O transporte server-mediated de voz/tela continua opt-in. O adapter declara enabled=false por padrão e o cliente conserva fallback público quando a flag está desativada.

### PR #82 — documentação QA

- Aberta e Draft; HEAD igual ao QA: 7c5691740eacab79d531ac0ecee1ef15c3ae8adf.
- Validate 43170039990: FAILURE no merge ref 0b0a060.
- Log explícito: build 3.4.7 e erro “VALIDATION FAILED: production updateURL mismatch” em scripts/validate.mjs:26.
- A falha é reproduzível no HEAD QA atual; não foi provocado pelo novo relatório, que ainda não foi criado quando essa execução ocorreu.

### PR #147 — destino do updater e regressões de chat

- Aberta e Draft; HEAD fdc727d072008b064fb8f3c4af52067c5da15111, base QA.
- A branch do PR está 16 commits à frente e 7 atrás do HEAD QA atual. O workflow de PR montou o merge ref a88db9e, juntando fdc727d com QA 7c569174.
- Validate 43176202190: SUCCESS no merge ref.
- O log confirma sintaxe, contrato de release target, uso de release.json.scriptUrl, build offline, regressões de chat e “Validation OK”.
- A regressão aprovada cobre composer, anexos staged, link-cards, compartilhamento de tela, mute de speaker, cores por remetente, notificações e indicadores de não lidas.
- O teste de link-card foi ajustado para verificar as regras CSS efetivas em vez de depender de um marcador legado.
- O workflow usa contents: read, checkout com persist-credentials=false e não utiliza secrets.
- A correção ainda não está integrada à branch QA/master. A validação verde é evidência da candidata, não da branch QA sozinha.

### PR #148 — remoção do fallback nominal de administrador

- Aberta e Draft; HEAD 716a41db346de2f7ea1c821e29f02fb0256d09c5.
- Validate direcionado 43151989910: SUCCESS.
- A candidata muda o fallback para role armazenado ou implementation_user e remove a promoção pelo nome quando o papel está vazio.
- Limitação: não introduz setup_token, convite obrigatório ou consumo atômico. Se uma conta já tiver implementation_admin armazenado e ainda estiver sem senha, o setup continua preservando esse papel. Portanto, a correção de fallback nominal não fecha o primeiro acesso.
- Produção possui cinco contas configuradas: três implementation_admin e duas implementation_user; zero password_hash e zero role vazios no snapshot atual. O risco descrito é latente, não uma conta desconfigurada observada.

### PR #149 — provenance de call_signal Team Lite

- Aberta e Draft; HEAD 77352d2e3b93722d6b69a9eec31a92bb63158230; 10 commits à frente de #76, sem commits atrás.
- Guard 43173176077: SUCCESS.
- Candidate Checks 43173176232: SUCCESS.
- Log confirma 110/110 verificações autenticadas, WebRTC call/voice/screen com remote tracks, mesh de três membros, rate limit 90+1/429, setup-invite e cleanup.
- A candidata remove o marcador _authenticatedTransport controlado pelo payload e passa a informar a origem autenticada como argumento separado.
- Quando o transporte autenticado está habilitado, somente presence e ended com discoveryOnly=true são aceitos como hints públicos; ended só remove entrada do diretório e não encerra chamada ativa.
- Limitação crítica: o transporte continua desativado por padrão no stack-base. Com a flag false, o listener público ainda pode processar call_signal, voice-room e screen-share. A candidata não está implantada.

### PRs relacionadas

- #143 dispatcher Normal: aberta/Draft, HEAD c4a04fa755b877bc76b1372170a26e7b974264e6. O workflow tem preflight, CLI pinada e duas funções Normal em ordem. Porém a branch de release ainda contém o handler antigo de remote_command no template de distribuição. A comparação #146 versus #143 está divergente: #146 tem 10 commits exclusivos à frente e 15 atrás.
- #146 remote-command hints/reconnect: aberta/Draft, HEAD 71c5ce2f730ade8ee3e8b090498202933809ce5c. Corrige o fluxo de comandos Normal, mas não inclui o hardening de call_signal/voz/tela e ainda não está reconciliada com #143.
- #129 Team Lite legacy deploy guard: aberta/Draft; guard 42993962545 passou. A proposta bloqueia o workflow inseguro, mas não está incorporada à branch oficial.

## Runtimes implantados: inspeção de código

A Management API retornou 38 Edge Functions ACTIVE na produção, todas com verify_jwt=false. Esse metadado não prova ausência de autenticação: os handlers principais implementam sessão própria, e verify_jwt deve ser avaliado por função/rota.

| Função | Versão | SHA da fonte |
|---|---:|---|
| upstatus | v480 | bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd |
| upstatus-team-lite | v15 | 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb |
| upstatus-test | v281 | 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a |
| upstatus-screen-share-3-1-1-beta10 | v6 | f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29 |

Decodifiquei os USERSCRIPT_BASE64 dos dois runtimes principais:

- Normal v480 embute UpStatus 3.4.7.
- Team Lite v15 embute Team Lite 3.4.30.
- Ambos mantêm listener broadcast remote_command que extrai payload.command e chama executeRemoteCommand(c).
- Ambos entregam call_signal ao handler a partir do broadcast público.
- Ambos encaminham eventos de voice-room e screen-share a handlers sem prova de identidade do emissor.
- Ambos ainda roteiam POST /api/setup para login(req,true).
- Ambos ainda possuem fallback de papel por nome para Ricardo, Lohan e Guilherme quando role está vazio.

A inspeção do source da branch do dispatcher #143 também encontrou o handler direto executeRemoteCommand(c). A candidata #74 e a #76 já transformam remote_command em wake-up para polling autenticado, mas isso ainda não foi levado ao fluxo de publicação.

## Realtime, RLS, grants e SECURITY DEFINER — produção

Snapshot SELECT-only em 12/11:

- realtime.messages: 109 linhas; todas private=false.
- Eventos: 57 user_status, 40 db_change, 6 remote_command e 6 remote_result.
- Todas as linhas estão no tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.
- RLS de realtime.messages habilitado; FORCE RLS desabilitado; zero policies.
- anon e authenticated têm SELECT e INSERT efetivos em realtime.messages.
- Dez tabelas public estão com RLS habilitado e zero policies.
- Grants diretos para anon/authenticated: 166 linhas, sendo 126 em public, 32 em storage e 8 em realtime.
- TRUNCATE: 18 grants, distribuídos por nove tabelas distintas.
- Default ACL: 15 entradas, 120 itens expandidos para anon/authenticated.
- Duas buckets públicas, chat-images e profile-images, com limite de 20 MiB cada.
- storage.objects: zero policies próprias; 188 objetos.
- public.messages: 296 linhas; 296 com file_name nulo.

As três funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users são SECURITY DEFINER, retornam trigger, usam search_path=public e têm EXECUTE para anon/authenticated/service_role. O Security Advisor gera três WARN para anon e três para authenticated. Como retornam trigger, não há evidência nesta auditoria de que possam ser chamadas como RPC PostgreSQL comum; não classificar o grant como exploração RPC demonstrada. O grant continua desnecessário e search_path=public merece hardening. O risco concreto confirmado é o conteúdo transmitido pelos triggers em broadcasts públicos; o trigger de mensagens transmite OLD/NEW completo.

Os clientes instalados usam tópico beta10, diferente do tópico dos triggers. Não alinhar os tópicos antes de minimizar payload e migrar para autorização adequada.

## AUTH-03, produção e laboratório

Produção:
- Cinco contas; três admins e duas contas de usuário.
- Zero password_hash vazios e zero role vazios.
- Zero colunas setup_token_* em public.users.
- Nenhuma tabela de convite.
- Nenhuma RPC de consumo de convite ou rate limit.
- O primeiro setup continua sem token obrigatório nos dois runtimes instalados.

Laboratório bfpjtfqlnypisxljoxkb:
- 39 migrations.
- Duas Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3.
- Quatro colunas setup_token_* em users.
- Tabela upstatus_setup_invite_rate_limits.
- RPCs consume_upstatus_setup_invite e consume_upstatus_setup_invite_rate_limit.
- As duas RPCs são SECURITY INVOKER, search_path vazio, EXECUTE somente service_role.
- Snapshot read-only: zero usuários, mensagens, sessões, salas, memberships, eventos, bindings, rate limits, call attempts, voice attempts, chat reads e realtime.messages; zero buckets e zero grants diretos em public para anon/authenticated.

A organização possui somente os projetos UpStatus e upstatus-security-test. Não há terceiro ambiente full-product TEST. O laboratório é isolado e limpo, mas não substitui um ambiente completo de release.

## Migrations e workflow de publicação

- Produção registra sete migrations.
- master contém somente três arquivos SQL em supabase/migrations.
- Quatro arquivos originais continuam ausentes: create_upstatus_visual_config, add_chat_message_file_name, allow_chat_document_mime_types e set_upstatus_upload_limits_20mb.
- O dispatcher deve continuar falhando fechado para fontes recuperadas apenas do ledger.
- A branch gerenciada main continua MIGRATIONS_FAILED; preview ACTIVE_HEALTHY. A causa não foi diagnosticada nesta rodada.
- O workflow oficial team-lite-official ainda instala Supabase CLI latest e executa deploy no slug upstatus. O slug correto é upstatus-team-lite. Não despachar.
- #129 oferece um guard para bloquear o workflow legado, mas permanece Draft.

## Issues e aceitação manual

- Issue #78 continua aberta com 0/8 critérios físicos aprovados. Os comentários disponíveis não trazem confirmação posterior de teste físico.
- Não foi realizado teste real de perda de internet, reconexão sem F5, reentrada em sala, microfone/display permission ou interoperabilidade instalada Normal ↔ Team Lite.
- Os testes WebRTC citados são CI em navegador automatizado com projeto isolado; não equivalem a aceitação física.
- Issue #79: o comentário QA dedicado foi atualizado no mesmo comentário ID 6744331652. O comentário da Engenharia ID 6744711778 foi preservado. O JSON inclui gate_updates e activity_updates; não foram criados comentários duplicados.

## Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 109 eventos private=false, RLS sem policies e transporte autenticado não default |
| TEST-ISOLATION | DONE | Projeto isolado, zero fixtures e zero grants diretos public para clientes |
| MIGRATION-PROVENANCE | BLOCKED | 7 migrations em produção, 3 SQLs originais no master e 4 ausentes |
| AUTH-03 | IN_PROGRESS | Candidatas Normal/Team Lite passaram CI, mas produção não possui convite/rate limit |
| ACL-STORAGE | BLOCKED | 166 grants, 18 TRUNCATE, 120 itens Default ACL e dois buckets públicos |
| RECONNECT | PENDING | Nenhuma confirmação física sem F5 |
| HUMAN-REVIEW | PENDING | PRs Draft; sem aprovação/autorização explícita |

## Próximas ações recomendadas

1. Integrar a correção de updater/chat #147 à linha QA/master após revisão, e confirmar o Validate na branch resultante.
2. Integrar remote-command hint-only ao dispatcher #143; não publicar a base atual que ainda executa payload direto.
3. Integrar #149 e a implementação correspondente Normal, disponibilizar backend server-mediated em produção e tornar o transporte autenticado default antes de remover o fallback público.
4. Integrar AUTH-03 completo nas duas APIs, incluindo token obrigatório, consumo atômico e rate limit; corrigir também a preservação de papel admin em contas sem senha.
5. Corrigir o workflow oficial Team Lite para upstatus-team-lite, CLI pinada, projeto/SHA verificados e bloqueio fail-closed.
6. Recuperar e validar os quatro SQLs originais antes de qualquer manifesto de migrations.
7. Revisar grants, TRUNCATE, Default ACL, SECURITY DEFINER, search_path, RLS e Storage com o owner autorizado.
8. Depois da integração, executar os oito critérios físicos da #78 e obter aprovação humana.

**Conclusão:** não liberar. Os avanços de CI em #147 e #149 são reais e verificáveis, mas não alteram os bundles de produção nem fecham os gates de segurança. Nenhuma produção foi modificada; todas as consultas SQL desta rodada foram SELECT-only.
