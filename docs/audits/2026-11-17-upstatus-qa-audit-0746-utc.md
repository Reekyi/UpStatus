# Auditoria independente de QA — UpStatus
**Execução:** 17/11/2026 07:46 UTC  
**Repositório:** Reekyi/UpStatus  
**Projetos Supabase:** produção dlfvkawaiqduhlazsszm; laboratório bfpjtfqlnypisxljoxkb  
**Recomendação:** NOT READY — não liberar Normal nem Team Lite.

## Resumo executivo

A revalidação encontrou um bloqueador crítico de segurança que permanece tanto nos userscripts implantados quanto no fallback dos candidatos: a sinalização de voz e compartilhamento de tela ainda pode passar por broadcast público. O transporte autenticado existe nos candidatos, mas é opt-in, começa desligado e depende de um endpoint same-origin que ainda não existe em produção.

A inspeção estática encontrou um caminho de alto impacto: os handlers aceitam identidade do remetente vinda do payload; quando a sala está ativa, a criação do peer adiciona tracks locais de microfone e, se o compartilhamento estiver ativo, tracks locais de tela. Uma oferta forjada que alcance o canal pode iniciar negociação com um peer não autenticado. O acesso público efetivo depende da configuração “Allow public access” do projeto, que não é exposta pelo conector. Nenhuma exploração, captura de áudio ou captura de tela foi tentada. A classificação é bloqueador P0 de release por desenho não autenticado, não incidente explorado comprovado.

Também foram confirmados 77.925 HTTP 402 em produção e 48 no laboratório. O laboratório está no plano Free e não consegue completar a integração real; não existe Full-Product TEST independente. O CI Normal é bom, mas não cobre o rate limit de emissão de convites no HEAD #74. A PR #131 contém essa melhoria, porém diverge da #74 e não testa a rota HTTP de uma Edge Function Normal implantada.

## Escopo e método

Foram lidos integralmente os 8.423 lines / 1.046.356 caracteres de docs/RELEASE_READINESS.md na branch QA. O documento termina com checkpoint de 15/11/2026 e não incorpora a auditoria de 17/11; portanto está desatualizado. O próprio documento já continha um alerta P0 para ofertas de screen-share não autenticadas; esta execução revalidou o caminho diretamente nos bundles implantados e nos candidatos, e estendeu a análise à trilha de voz.

Foram consultados refs GitHub, PRs, reviews, jobs e logs de CI, Issues, bundles e fontes de Edge Functions, migrations, logs Supabase, Security Advisors e catálogos PostgreSQL. Todas as consultas SQL foram SELECT-only. Não foi executado teste manual no navegador/Tampermonkey/Sale Smartly e nenhum CI foi repetido manualmente.

## 1. Branches e documentação

| Branch | HEAD | Protegida |
|---|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 | não |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 | não |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 | não |
| qa/release-readiness-2026-11-04-master | efd0fda89620d852c6728c84a6b12883c34a17fc | não |

A QA está 390 commits à frente e 1 atrás de master. O único commit de master após o merge-base é documental; não foi feito rebase nem atualização automática. A branch QA e a PR #82 apontam para o mesmo HEAD. As quatro branches consultadas não têm proteção visível.

docs/RELEASE_READINESS.md tem 8.423 linhas e aproximadamente 1,046 MB. O último checkpoint do arquivo é de 15/11; não substituí o documento extenso nem sobrescrevi trabalho concorrente. Esta auditoria foi registrada em arquivo separado.

## 2. PRs, commits e CI

| PR | HEAD | Base | Estado | Evidência |
|---|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | master a9288cc | aberta / Draft, 887 commits, 90 arquivos | Validate e Smoke SUCCESS |
| #75 Team Lite | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official 9065bc1 | aberta / Draft, 59 commits, 10 arquivos | PASS histórico, sem integração atual |
| #76 Team Lite | 00a578e9174e08238a1289a35feb02d171625421 | team-lite-official 9065bc1 | aberta / Draft, 389 commits, 59 arquivos | contratos offline PASS; integração bloqueada por quota |
| #82 QA | efd0fda89620d852c6728c84a6b12883c34a17fc | master a9288cc | aberta / Draft, 390 commits, 225 arquivos | Validate FAIL em updateURL |
| #131 AUTH-03 | 17169a30a9b93d1b6f870d1632e3fd0502cb1a8b | chore/continuity-foundation fb878537 | aberta / Draft, 1 commit, 6 arquivos | Smoke SUCCESS no HEAD exato |
| #176 migrations | b50f8567392322b4309468e0fe9e6fc81ca38c1d | develop 6b33e1e | aberta / Draft, 6 commits, 6 arquivos | Validate FAIL em helper de upload |

Nenhuma das seis PRs consultadas possui review humana registrada.

### #74 Normal

[Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) passaram. O Smoke confirma 136/136 verificações autenticadas, chamadas WebRTC, voz, screen-share, mesh de três participantes, rate limit de sinalização e recibos atômicos de leitura. O passo de sintaxe do harness de rate limit de convites e o passo de teste distribuído de emissão de convites foram SKIPPED. O HEAD #74 não aplica o rate limit de convites.

### #75 Team Lite

O PASS histórico [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) não substitui os testes da candidata #76 nem prova integração atual.

### #76 Team Lite

[Candidate Checks 43868863235](https://github.com/Reekyi/UpStatus/actions/runs/43868863235): 11/11 contratos offline do mapeador HTTP passaram. A primeira chamada de integração recebeu HTTP 402 em vez de 200/401. Resultado 0/16 verificações não autenticadas aprovadas; Playwright, IIFE, integração autenticada, rate limits e testes subsequentes foram SKIPPED. A resposta identificou exceed_edge_functions_invocations_quota. Não é reprovação funcional comprovada do Team Lite; é bloqueio de infraestrutura.

A #76 contém a #75 como ancestral: 330 commits à frente e nenhum atrás. Não devem ser tratadas como duas entregas independentes.

### #82 QA

[Validate 44033141582](https://github.com/Reekyi/UpStatus/actions/runs/44033141582) falhou em production updateURL mismatch. A validação de master ainda exige que o updateURL contenha /upstatus/upstatus.user.js; o build/candidato tem lógica baseada em release.json.scriptUrl. O relatório é documental e não introduziu alteração de produto. A falha é herdada do build/validator da base.

### #131 AUTH-03

[Smoke 42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) passou no HEAD exato: 136/136 verificações autenticadas; rate limit distribuído de cinco convites por administrador a cada 900 segundos; 24 chamadas concorrentes resultaram em cinco permitidas e 19 negadas; isolamento de bucket, janela e limpeza passaram. O teste foi feito no projeto isolado, com opt-in explícito de mutação.

A #131 está 1 commit à frente e 4 atrás da #74. O próprio PR declara que não envia HTTP através de uma Edge Function Normal implantada, não cobre throttling de login e não fecha o gate AUTH-03 completo. É candidata útil, mas não integrada.

### #176 migrations

[Validate 43936811839](https://github.com/Reekyi/UpStatus/actions/runs/43936811839) falhou em client signed upload helper missing. Os quatro SQLs recuperados coincidem com os statements do ledger após normalizar apenas a quebra de linha final. Isso não prova os bytes originais dos arquivos, comentários e formatação, nem substitui replay em ambiente Full-Product TEST.

## 3. Issues

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios físicos marcados. Última atualização em 08/11. Não houve teste físico de queda/retorno de internet, reentrada, novas chamadas ou interoperabilidade Normal ↔ Team Lite sem F5.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 16/35 itens marcados e 19 pendentes. O comentário QA dedicado foi atualizado, sem duplicata; o comentário da Engenharia foi preservado.

## 4. Supabase, projetos e disponibilidade

A organização Supabase está no plano Free e possui exatamente dois projetos:

| Projeto | Região | Estado | Migrations |
|---|---|---|---:|
| UpStatus produção dlfvkawaiqduhlazsszm | us-west-2 | ACTIVE_HEALTHY | 7 |
| upstatus-security-test bfpjtfqlnypisxljoxkb | sa-east-1 | ACTIVE_HEALTHY | 39 |

Não existe Full-Product TEST independente. O laboratório é específico de signaling/auth; a consulta encontrou zero users, messages, sessions, signal rooms, signal events, objetos Storage e mensagens Realtime. A branch gerenciada main da produção continua MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY.

### HTTP 402

Consulta de logs nas últimas 24 horas:

| Rota de produção | HTTP 402 |
|---|---:|
| /api/chat | 41.630 |
| /api/status | 18.104 |
| /api/remote-status | 18.086 |
| /api/members | 33 |
| /api/me | 33 |
| /api/account | 33 |
| download do userscript | 6 |
| **Total** | **77.925** |

Último evento de Edge Function: 16/11/2026 21:00:47.824 UTC. Há logs posteriores de PostgreSQL/PgBouncer, mas não de Edge Functions. Isso não prova recuperação nem indisponibilidade atual; ACTIVE_HEALTHY é estado do projeto, não health check da aplicação.

No laboratório foram confirmadas 48 respostas 402 em 14 rotas, com a mensagem exceed_edge_functions_invocations_quota. Último evento: 16/11/2026 12:41:42.781 UTC.

## 5. Edge Functions e autenticação implantada

Produção tem 38 Edge Functions ACTIVE; todas retornam verify_jwt=false. Isso não é, isoladamente, prova de falha, pois os handlers principais usam token customizado UpStatus. Porém, cada rota precisa validar esse token e a autorização internamente, e a quantidade de funções históricas/test/backup ativas amplia a superfície a revisar.

Versões relevantes confirmadas:

- upstatus v480, source SHA bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd; userscript servido 3.4.7.
- upstatus-team-lite v15, source SHA 2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb; userscript servido 3.4.30.
- upstatus-screen-share-3-1-1-beta10 v6, source SHA f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29; bundle de distribuição interno 3.1.1-beta8.
- O laboratório possui upstatus-signal-test v32 e upstatus-signal-e2e-once v3. Não existe upstatus-signal nem upstatus-signal-test em produção.

Nos runtimes implantados, /api/setup ainda executa primeiro setup sem token de convite. O fallback de role usa nomes fixos quando o papel está vazio. Normal exige seis caracteres no primeiro setup; Team Lite usa quatro no login. /api/chat/clear verifica apenas o nome literal Ricardo, sem verificar role administrativo.

Os candidatos melhoram o primeiro acesso: #74 consome convite, mas não aplica rate limit na emissão; #76 aplica cinco por administrador a cada 900 segundos; #131 adiciona o mesmo rate limit ao Normal. A diferença ainda precisa ser integrada e validada por HTTP real.

## 6. Realtime, voz e compartilhamento de tela — bloqueador crítico

### Estado implantado

Os bundles servidos são Normal 3.4.7 e Team Lite 3.4.30. Ambos:

- assinam upstatus-screen-share-live-3-1-1-beta10;
- criam cliente Supabase com publishable key;
- não configuram channel private=true nem chamam realtime.setAuth();
- recebem eventos de voz/tela por broadcast público;
- usam o campo from do payload como identidade do peer, sem comprovar membership server-side no handler cliente.

O banco publica triggers no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0, diferente do tópico assinado pelos clientes instalados.

### Caminho de alto impacto

Nos bundles implantados, voiceRoomReceive e screenShareReceive aceitam offers/ICE sem validar que o remetente pertence à sala. voiceRoomMakePeer adiciona os tracks locais do microfone ao novo peer. screenShareMakePeer adiciona os tracks locais de tela quando o compartilhamento está ativo.

Assim, se um remetente conseguir publicar no canal público, uma oferta forjada com remetente e sala controlados pode iniciar negociação e receber áudio ou vídeo local da vítima. Não houve exploração, captura de áudio ou captura de tela. A configuração do projeto que permite public access não é exposta pelo conector; a reachability externa exata permanece por confirmar. Ainda assim, o desenho é um bloqueador P0 de release.

O runtime instalado também trata remote_command recebido por broadcast como comando: executa syncSaleSmartly antes de enviar POST /api/status ao backend. A ordem confia no payload público antes da confirmação HTTP autenticada. O candidato melhora esse ponto: remote_command vira apenas wake-up para polling autenticado. Essa correção não resolve o fallback público de voz/tela.

### Candidatos #74 e #76

O transporte server-mediated existe, mas a flag é lida com default false e o endpoint começa vazio. Com a flag desligada, os handlers continuam entregando broadcast público diretamente a voiceRoomReceive e screenShareReceive. initSignalingTransport exige que o endpoint tenha a mesma origem da API. Como o único endpoint de teste está no outro projeto Supabase e não existe função equivalente em produção, o transporte autenticado não pode ser habilitado em produção no estado atual.

RT-01 permanece BLOCKED. Não basta marcar o canal como privado: o token UpStatus é customizado, não um Supabase Auth JWT; membership, autenticação e policies precisam ser implementadas e testadas no servidor.

## 7. RLS, grants, SECURITY DEFINER e Storage

### Produção

- 10 tabelas públicas com RLS habilitado e nenhuma policy.
- 166 entradas de grants para anon/authenticated em public, storage e realtime; 18 entradas de TRUNCATE.
- 3 funções SECURITY DEFINER de trigger com search_path=public e ACL incluindo PUBLIC, anon e authenticated.
- Security Advisor: 10 avisos INFO de RLS sem policy, 3 avisos anon e 3 authenticated para SECURITY DEFINER.
- Default ACLs amplas para owners postgres/supabase_admin no schema public e postgres no schema storage.
- realtime.messages: 106 linhas, todas private=false, sem policies; grants SELECT/INSERT/UPDATE para anon e authenticated.
- Storage: chat-images e profile-images públicos, ambos com limite 20 MiB; 188 objetos; nenhuma policy própria em storage.objects.

As três funções SECURITY DEFINER retornam trigger e estão anexadas a triggers. Não foi demonstrada execução direta por RPC; os grants são desnecessários e o payload de broadcast público é o risco concreto.

### Laboratório

- 18 tabelas públicas com RLS e sem policies.
- Grants diretos anon/authenticated nas tabelas de aplicação removidos; nenhum TRUNCATE concedido.
- Três funções SECURITY DEFINER com search_path vazio e EXECUTE apenas para postgres/service_role.
- Ainda há default ACLs amplas para supabase_admin em public e postgres em storage; grants de Storage/Realtime continuam presentes.
- Zero fixtures de produto e zero objetos/mensagens.

O laboratório está mais endurecido que produção, mas não é um clone completo e não pode validar o release integral.

## 8. Workflows de publicação

- Workflow Normal candidato é manual-only, faz checkout do SHA dispatchado, verifica branch master, projeto e token, fixa Supabase CLI 2.122.1 e valida a versão. Porém, publica somente upstatus; não coordena a função beta10 que o userscript ainda chama. release.json permanece 3.4.7.
- Workflow oficial Team Lite publica a função upstatus em vez de upstatus-team-lite, usa CLI latest e não possui as mesmas verificações de projeto/SHA/migrations. Não despachar esse workflow.
- O Validate de master ainda impõe o updateURL legado e faz a PR documental #82 falhar.

## 9. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | broadcast público, sem membership/autenticação; endpoint server-mediated ausente em produção |
| TEST-ISOLATION | BLOCKED | existe laboratório de signaling, mas não Full-Product TEST e quota bloqueada |
| MIGRATION-PROVENANCE | IN_PROGRESS | 4/4 statements recuperados coincidem; bytes originais e replay não comprovados |
| AUTH-03 | IN_PROGRESS | #131 passou Smoke isolado, mas não está integrado nem testado por HTTP real |
| ACL-STORAGE | BLOCKED | grants/default ACLs, Realtime e buckets públicos ainda pendentes |
| RECONNECT | PENDING | Issue #78 continua 0/8; sem teste físico sem F5 |
| HUMAN-REVIEW | PENDING | nenhuma review humana nas PRs examinadas e sem autorização de release |

## 10. Próximos passos recomendados

1. Remover o fallback público de sinalização de voz/tela e validar identidade/membership server-side antes de aceitar offer, answer ou ICE.
2. Criar e validar endpoint server-mediated no mesmo projeto/origin da API de produção antes de habilitar a flag nos clientes.
3. Fazer Realtime usar canal privado/autorizado com token apropriado e reduzir payloads de broadcast.
4. Corrigir o caminho de remote_command para que broadcast seja somente aviso; comando deve vir de rota autenticada e autorizada antes de qualquer side effect no Sale Smartly.
5. Restaurar quota do laboratório e investigar os 402 de produção separadamente.
6. Reconciliar #131 com #74, executar novamente o CI no HEAD integrado e testar emissão/consumo de convite por HTTP real.
7. Corrigir grants, default ACLs, SECURITY DEFINER, Storage e política de privacidade dos buckets com owner autorizado.
8. Corrigir workflow Team Lite e coordenar distribuição/API/versão Normal.
9. Criar Full-Product TEST, validar migrations/replay, concluir 8/8 testes físicos da #78 e obter reviews humanas.

## Segurança da execução

Nenhum teste de navegador, Tampermonkey ou Sale Smartly foi executado pela QA. Foram inspecionados resultados de CI existentes; não foram repetidos. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de produção, secret, flag, role, grant, policy, ACL ou operação destrutiva.

A única escrita desta execução é este relatório documental na branch QA e a atualização do comentário QA já existente na Issue #79. Nenhum comentário da Engenharia foi alterado.
