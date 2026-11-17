# Auditoria independente de qualidade do UpStatus — 14/11/2026, 15:25 UTC

## Escopo e método

Revalidação read-only de GitHub e Supabase para UpStatus Normal e Team Lite. Foram consultados refs/heads, metadados e reviews das PRs #74, #75, #76 e #82, Issues #78 e #79, workflows e logs do Validate, arquivos de build/deploy, fontes das Edge Functions implantadas, catálogo PostgreSQL, Security Advisor, Storage, migrations e projetos disponíveis.

O documento central docs/RELEASE_READINESS.md foi lido pelo blob GitHub SHA 7cfbd70886df42ce790c078c224b19284a632595: 8.410 linhas e 1.045.105 caracteres. O último checkpoint interno é de 08/11/2026 15:30 BRT / 18:30 UTC. Os relatórios de 14/11 são arquivos separados; o documento central não contém atualização posterior a esse checkpoint.

Não existe checkout local do UpStatus neste ambiente. Não foram executados testes locais, browser/Tampermonkey ou testes manuais. Os resultados de CI abaixo são execuções já existentes, consultadas por SHA/run. Não foi iniciado rerun manual.

## Heads reais e relações entre branches

- master: 9d40461babcec8eb8686c2a04be9c675df7da381
- develop: 6b33e1e26ad105143f00372ae6d0f2fa52df60d6
- team-lite-official: 9065bc1536fde64f437f6f12b7abb9b072cb8281
- QA: 73c5ccf117855d23165225540a6c1af902d1780a antes deste relatório.

Comparações:
- QA vs master: 310 commits à frente, 1 atrás. O único commit master-only é 9d40461, que altera apenas docs/checkpoints/2026-11-08-production-migration-history-preflight.md.
- PR #74 / chore/continuity-foundation: HEAD dcaf6a072546eda0089e0cee4018c3047011f600; 887 commits à frente e 1 atrás de master.
- PR #75 / team-lite/3.4.31-guest-fixes: HEAD 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309; 59 commits à frente de team-lite-official.
- PR #76 / team-lite/signaling-transport-candidate: HEAD 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94; 386 commits à frente de team-lite-official.
- #76 descende de #75: 327 commits à frente e zero atrás. Os dez arquivos alterados em #75 também aparecem em #76. Tratar #75/#76 como uma pilha; não mesclar os dois independentemente.
- PR #82 aponta para o HEAD QA 73c5ccf117855d23165225540a6c1af902d1780a e contém 163 arquivos, todos documentais.

As quatro PRs obrigatórias estão abertas, Draft e sem merge. A API de reviews retornou zero reviews em #74, #75, #76 e #82. A leitura dos endpoints de branch protection retornou HTTP 403 para master, team-lite-official e QA; portanto, a proteção das branches não pôde ser confirmada e não deve ser descrita como ausente.

## CI e workflow

| PR | HEAD | Evidência | Resultado |
|---|---|---|---|
| #74 Normal | dcaf6a0 | https://github.com/Reekyi/UpStatus/actions/runs/43376770142 e https://github.com/Reekyi/UpStatus/actions/runs/43376770200 | Validate e Signaling Smoke SUCCESS |
| #75 Team Lite baseline | 7bbf9b9 | https://github.com/Reekyi/UpStatus/actions/runs/41674353127 | Candidate Checks SUCCESS histórico; não substitui #76 |
| #76 Team Lite | 83a6cc4 | https://github.com/Reekyi/UpStatus/actions/runs/43363871881 | Candidate Checks SUCCESS |
| #82 QA | 73c5ccf | https://github.com/Reekyi/UpStatus/actions/runs/43605526106 | Validate FAILURE |

O run 43605526106 fez checkout do merge ref do PR, executou o build 3.4.7 / TEST 3.4.7 e falhou em scripts/validate.mjs:26 com “VALIDATION FAILED: production updateURL mismatch”. O job teve uma única etapa funcional, Validate build, concluída com failure. Nenhum rerun foi iniciado.

A versão Normal atualmente servida pela Edge Function upstatus v480 tem header @updateURL e @downloadURL apontando corretamente para /functions/v1/upstatus/upstatus.user.js. Portanto, o header instalado não está quebrado. O defeito está no próximo build de master: scripts/build.mjs ainda deriva o updateURL do endpoint beta10, enquanto scripts/validate.mjs exige o endpoint estável upstatus. O candidato #74 já usa release.scriptUrl e valida a URL estável; essa correção ainda não está em master.

O workflow de produção em master usa checkout padrão, CLI latest e deploy somente de upstatus, sem validação explícita de SHA/projeto no próprio workflow. O candidato #74 melhora o guard de branch master, SHA e projeto e fixa CLI 2.122.1, mas continua publicando somente upstatus; a API beta10 precisa de plano de rollout coordenado.

O workflow oficial .github/workflows/deploy-production.yml em team-lite-official ainda executa supabase functions deploy upstatus, não upstatus-team-lite; usa CLI latest e não valida projeto/SHA/migrations. Não despachar esse workflow. A PR #76 adiciona workflow de Candidate Checks e alterações de deploy-test, mas não corrige o dispatcher oficial deploy-production.yml.

## Runtime implantado: Normal, Team Lite e sinalização

Fontes obtidas diretamente das Edge Functions de produção:
- upstatus v480, SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd; userscript embutido 3.4.7.
- upstatus-team-lite v15, SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb; userscript embutido 3.4.30.
- upstatus-screen-share-3-1-1-beta10 v6, SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29.
- upstatus-test v281, SHA 7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a.

Nos dois userscripts instalados:
- o canal é criado sem private:true e sem realtime.setAuth();
- ambos assinam upstatus-screen-share-live-3-1-1-beta10;
- Normal processa remote_command e chama executeRemoteCommand quando o target é o membro local;
- Team Lite também chama executeRemoteCommand após verificar a própria sessão e geração local, mas não autentica a identidade do publicador;
- call_signal, voice-room e screen-share continuam entregando payloads aos handlers sem prova server-side da identidade do emissor.

A inspeção é estática. A configuração Dashboard “Allow public access” não foi exposta pelo conector; não foi feita exploração, publicação de broadcast, injeção de SDP/ICE, captura de áudio ou tela.

A divergência de tópico permanece: os triggers PostgreSQL publicam em upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, enquanto os clientes instalados assinam o tópico beta10 acima. O snapshot de 14 dias contém 106 eventos no tópico dos triggers, todos private=false: 72 user_status, 26 db_change, 4 remote_command e 4 remote_result. Esses registros não demonstram entrega aos clientes atuais.

O candidato #74 muda PROD_TOPIC para o tópico dos triggers e usa release.scriptUrl, mas os templates de servidor inspecionados nas branches candidatas não implementam /api/signal nem /api/room. O helper client-side signaling-transport existe, mas o backend server-mediated funcional está somente no laboratório. O transporte autenticado continua default-off; não é seguro ativá-lo em produção apenas apontando para a função de teste.

## Supabase: banco, Realtime, ACL e Storage

Produção dlfvkawaiqduhlazsszm: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions ACTIVE. Todas as 38 reportam verify_jwt=false no nível da plataforma; isso não prova ausência de autorização, pois os handlers principais usam sessão customizada, mas exige revisão de autenticação por rota.

Realtime:
- realtime.messages: RLS true, FORCE RLS false, zero policies.
- anon/authenticated possuem SELECT, INSERT e UPDATE em realtime.messages.
- 106 eventos private=false nos últimos 14 dias no tópico dos triggers, conforme detalhado acima.

RLS e grants:
- Dez tabelas públicas consultadas têm RLS habilitado e zero policies.
- Nove delas concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER: 126 concessões diretas para os dois papéis clientes.
- upstatus_visual_config é a exceção sem esses grants de cliente.
- RLS não protege TRUNCATE; nenhum TRUNCATE foi tentado.
- Security Advisor: 10 INFO de RLS sem policies e seis WARN relativos às três funções SECURITY DEFINER, contadas para anon e authenticated.
- As três funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users têm SECURITY DEFINER, search_path=public, retorno trigger e ACL com EXECUTE para PUBLIC/anon/authenticated/service_role. Como retornam trigger, não foi demonstrada invocação direta como RPC comum; os grants continuam desnecessários e o search_path precisa de revisão.
- Default ACL: 24 definições, 75 ACL entries, com defaults amplos para anon/authenticated em public, storage e schemas GraphQL.

Storage:
- chat-images: público, 168 objetos, limite 20 MiB.
- profile-images: público, 20 objetos, limite 20 MiB.
- Zero policies em storage.objects. A leitura de objetos em buckets públicos depende da posse da URL; isolamento por usuário não está comprovado.

Autenticação:
- Produção: 5 usuários, 319 sessões, 5 perfis.
- upstatus_sessions usa user_name/token_hash/expires_at; upstatus_profiles usa user_name. Não há user_id nessas tabelas.
- Zero colunas setup_token_* e zero RPC consume_upstatus_setup_invite.
- As duas funções principais ainda expõem o caminho legado /api/account e /api/setup; não foi encontrada integração de setup-token no runtime instalado.

## Laboratório e migrations

O único laboratório é bfpjtfqlnypisxljoxkb, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, com 39 migrations e duas Edge Functions: upstatus-signal-test v32 e upstatus-signal-e2e-once v3. A função upstatus-signal-test contém rotas /signal, /poll, /ack, /room/create e /room/accept, além de verificações de membership e expiração, mas está isolada.

Consulta read-only ao laboratório retornou zero buckets, zero objetos, zero usuários, zero sessões, zero perfis e zero mensagens Realtime. Portanto, não é Full-Product TEST. Não existe terceiro projeto TEST independente. A branch gerenciada main do projeto de produção continua MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY.

## Issues, testes manuais e limitações

- Issue #78: aberta, 0/8 critérios de aceite marcados. Reconexão física sem F5, nova entrada em sala, chamadas após reconexão, interoperabilidade instalada, microfone e compartilhamento reais continuam pendentes.
- Issue #79: aberta, 16/35 itens marcados e 19 pendentes no corpo.
- Nenhum teste manual foi executado. Não há checkout local do UpStatus nem diretório .git do projeto neste ambiente. Não foram executados scripts locais ou fixtures.
- A configuração de acesso público do Realtime não foi verificada.
- Branch protection não pôde ser consultada porque o endpoint retornou 403.
- MIGRATION-PROVENANCE não foi reavaliado quanto à recuperação dos quatro arquivos originais nesta rodada; não atualizar esse gate com base apenas na contagem de migrations.

## Gates e veredito

- RT-01: BLOCKED — clientes instalados usam broadcasts públicos sem autenticação do emissor; tópico dos triggers diverge do tópico dos clientes; backend server-mediated não está implantado em produção.
- TEST-ISOLATION: BLOCKED — laboratório não tem dados/buckets de produto; não existe Full-Product TEST.
- AUTH-03: BLOCKED — produção sem setup tokens/RPC de convite e sem user_id nas sessões/perfis.
- ACL-STORAGE: BLOCKED — grants amplos, Default ACLs amplas, funções SECURITY DEFINER com EXECUTE excessivo e buckets públicos sem policies.
- RECONNECT: PENDING — Issue #78 permanece 0/8; exige teste físico sem F5.
- HUMAN-REVIEW: PENDING — zero reviews humanas nas quatro PRs obrigatórias e nenhuma autorização explícita de release.
- MIGRATION-PROVENANCE: não atualizado nesta rodada.

Recomendação: NOT READY. Prioridades: (1) concluir transporte server-mediated em ambiente isolado e implementar rotas nos dois templates; (2) remover fallback público sensível e validar identidade/membership; (3) corrigir workflow Team Lite e coordenar deploy Normal/beta10; (4) corrigir builder sem regredir anexos do chat; (5) completar AUTH-03 e revisar grants/ACL/Storage; (6) provisionar Full-Product TEST; (7) executar testes físicos e obter aprovação humana.

Nenhuma alteração em produção foi realizada. Todas as consultas SQL foram SELECT-only. Não houve migration, deploy, merge, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva. A única escrita documental desta rodada é este novo relatório na branch QA; o documento central RELEASE_READINESS.md foi preservado.
