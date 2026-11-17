# Auditoria independente de qualidade — UpStatus
**Execução:** 2026-11-17T01:41:45.851Z  
**Repositório:** Reekyi/UpStatus  
**Produção:** Supabase dlfvkawaiqduhlazsszm  
**Laboratório:** Supabase bfpjtfqlnypisxljoxkb  
**Veredito:** NOT READY — não autorizar merge, deploy, release ou publicação.

## 1. Método e limites

Foram feitas somente inspeções read-only no GitHub e Supabase: refs e metadados de branches/PRs/issues, checks e logs de workflows existentes, conteúdo de arquivos e patches, fontes de Edge Functions implantadas, inventários de migrations, Security Advisor, logs e consultas SELECT aos catálogos PostgreSQL.

Nenhum teste foi iniciado pela QA nesta execução. Os resultados abaixo classificados como CI são execuções já existentes do GitHub Actions. Não houve teste manual em Tampermonkey/Sale Smartly, browser local, rede física, microfone ou captura de tela.

A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79. Não houve escrita SQL, alteração de produção, fixture, migration, deploy, merge, workflow dispatch, release, publicação de userscript, alteração de secrets, flags, roles, grants, policies ou ACLs.

## 2. Documento de prontidão e heads reais

O blob de docs/RELEASE_READINESS.md na branch QA foi lido integralmente: 1.046.356 caracteres e 8.423 linhas, SHA do blob 7ed86116c40f3e2309b1bf7ca34ff9bc377edc2c. O último checkpoint dentro do documento é de 2026-11-15 06:30 UTC. Portanto, o documento-base está desatualizado para os heads e evidências desta execução; não foi sobrescrito.

| Ref | HEAD atual |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e (prefixo consultado) |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| qa/release-readiness-2026-11-04-master | a747d986d5899cb83483d0dcfee91db0554a570e |

O commit atual de master é documental e está um commit à frente do base SHA a9288cc declarado por #74 e #82. Não foi feito rebase. A diferença identificada é o checkpoint documental de AUTH-03, não uma mudança de runtime.

| PR | HEAD | Base | Estado |
|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | master / a9288cc | aberta, Draft |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official / 9065bc1 | aberta, Draft |
| #76 Team Lite signaling | 00a578e9174e08238a1289a35feb02d171625421 | team-lite-official / 9065bc1 | aberta, Draft |
| #82 documentação QA | a747d986d5899cb83483d0dcfee91db0554a570e | master / a9288cc | aberta, Draft |

As quatro PRs estão sem reviews humanas. As branches master, develop, team-lite-official e QA não têm proteção visível; a consulta de rulesets do repositório retornou lista vazia. A ausência de proteção obrigatória é um risco de governança, não uma falha funcional do userscript.

## 3. CI existente por HEAD

| PR | Evidência existente | Classificação |
|---|---|---|
| #74 | Validate 43376770142 PASS; Smoke 43376770200 PASS | AUTOMATED PASS |
| #75 | Candidate Checks 41674353127 PASS em 03/11 | PASS histórico, não substitui #76 |
| #76 | Signed-upload contracts PASS; Candidate Checks 43868863235 FAIL | Offline PASS; integração bloqueada |
| #82 | Validate 43988844694 FAIL | AUTOMATED FAIL |

### #74 Normal

O Smoke no HEAD exato passou 136/136 verificações autenticadas. O log registra negociação WebRTC de chamada, áudio de voz e vídeo de compartilhamento de tela em Chromium, entrega de tracks remotas, teardown, mesh de três participantes, gestão de salas, rate limit distribuído (90 aceitos e o seguinte 429), concorrência de recibos de leitura e testes de enrollment isolado.

Isso é evidência de CI no projeto isolado, não aceitação física em Sale Smartly. O endpoint de transporte autenticado ainda está desabilitado por padrão no candidato; portanto, o PASS não fecha RT-01.

### #75 Team Lite

O PASS de 03/11 é histórico. A PR #76 é a candidata mais recente de signaling e contém alterações sobrepostas. Não tratar o PASS da #75 como aprovação do estado atual Team Lite.

### #76 Team Lite

Os contratos offline de upload assinado passaram; o log registra 11/11 verificações do contrato HTTP. A integração real recebeu HTTP 402 com a mensagem explícita de quota Edge Functions. Resultado: 0/16 checks não autenticados. Playwright, integração autenticada e verificações posteriores foram ignorados. A falha integrada é BLOCKED por infraestrutura, não prova de defeito no helper offline.

### #82 QA

O Validate no HEAD atual falhou em production updateURL mismatch. O log mostra erro em scripts/validate.mjs. O diff da PR é documental. O workflow validate.yml de master não tem paths-ignore para Markdown/docs, então alterações apenas documentais disparam o build. A candidata #74 já contém paths-ignore, mas essa melhoria não está em master.

## 4. Disponibilidade e logs Supabase

### Produção

A consulta de 24 horas retornou 77.925 eventos em function_edge_logs, todos HTTP 402:

| Rota | Respostas 402 | Primeiro evento | Último evento |
|---|---:|---|---|
| /api/chat | 41.630 | 16/11 11:42:08 UTC | 16/11 21:00:47 UTC |
| /api/status | 18.104 | 16/11 11:42:15 UTC | 16/11 21:00:43 UTC |
| /api/remote-status | 18.086 | 16/11 11:42:22 UTC | 16/11 21:00:47 UTC |
| /api/members | 33 | 16/11 11:41:55 UTC | 16/11 20:14:41 UTC |
| /api/me | 33 | 16/11 11:41:55 UTC | 16/11 20:14:40 UTC |
| /api/account | 33 | 16/11 11:46:13 UTC | 16/11 19:45:42 UTC |
| download /upstatus.user.js | 6 | 16/11 12:42:40 UTC | 16/11 14:29:33 UTC |

Não há function_edge_logs posteriores a 16/11 21:00:47 UTC até a consulta de 17/11 01:35 UTC. Entretanto, pgbouncer_logs e postgres_logs continuam com eventos até 17/11 01:35 UTC. Isso não permite concluir que o UpStatus se recuperou: pode ser ausência de chamadas às Edge Functions ou interrupção específica da telemetria. A causa dos 402 em produção continua desconhecida.

### Laboratório

O projeto bfpjtfqlnypisxljoxkb registrou 48 respostas 402 entre 16/11 12:37:25 e 12:41:42 UTC em 14 rotas da função upstatus-signal-test. O log do Candidate Checks #76 contém a mensagem:
exceed_edge_functions_invocations_quota — o proprietário do projeto precisa atualizar o plano ou remover o spend cap para restaurar o serviço.

O conector não expôs Usage/Billing nem o plano efetivo da organização nesta execução. Não atribuir automaticamente a mesma causa aos 402 de produção.

## 5. Inventário Supabase e Edge Functions

A organização contém exatamente dois projetos:

| Projeto | Estado | PostgreSQL | Migrations | Branches |
|---|---|---|---:|---:|
| UpStatus / dlfvkawaiqduhlazsszm | ACTIVE_HEALTHY | 17.11.0.002 | 7 | main: MIGRATIONS_FAILED |
| upstatus-security-test / bfpjtfqlnypisxljoxkb | ACTIVE_HEALTHY | 17.11.0.003 | 39 | nenhuma |

Não existe projeto Full-Product TEST separado. O projeto de segurança é um laboratório de fixtures e sinalização; não é substituto de um ambiente completo para replay de todas as migrations e testes de produto.

Produção lista 38 Edge Functions ACTIVE e todas reportam verify_jwt=false. Isso não prova que todas aceitam acesso anônimo: os runtimes UpStatus usam token próprio e precisam validar cada rota internamente. Ainda assim, a configuração torna obrigatória a revisão de autenticação e autorização por endpoint.

Runtimes operacionais inspecionados:

| Função | Revisão Edge | Versão interna |
|---|---:|---|
| upstatus | 480 | 3.4.7 |
| upstatus-screen-share-3-1-1-beta10 | 6 | 3.1.1-beta8 |
| upstatus-team-lite | 15 | 3.4.30 |
| upstatus-test | 281 | 3.3.28 |

A branch gerenciada main de produção continua MIGRATIONS_FAILED. A causa raiz não foi determinada pelos recursos read-only disponíveis.

## 6. Normal e Team Lite: bundles e candidatos

### Runtimes implantados

O userscript embutido no Normal declara versão 3.4.7, com updateURL/downloadURL em /functions/v1/upstatus/upstatus.user.js, mas CLOUD_SERVER aponta para upstatus-screen-share-3-1-1-beta10. O tópico assinado é upstatus-screen-share-live-3-1-1-beta10.

O Team Lite embutido declara 3.4.30, atualiza pelo raw GitHub team-lite-official e chama a API upstatus-team-lite. Também assina o tópico antigo upstatus-screen-share-live-3-1-1-beta10.

Os triggers do banco publicam em upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Portanto, o tópico dos clientes implantados não coincide com o dos triggers atuais.

### Candidata Normal #74

O build candidato corrige a separação entre distribuição e API: release.json aponta a distribuição para /upstatus/upstatus.user.js, mas CLOUD_SERVER continua apontando para beta10. O tópico candidato muda para upstatus-live-..., alinhando o nome ao trigger, porém continua público.

O signaling_transport_enabled é false por padrão, o endpoint de signaling não vem configurado e os listeners públicos continuam sendo o caminho ativo. Não há private:true nem setAuth no fluxo Realtime candidato. A presença de um adapter HTTP no código não significa que a sinalização autenticada esteja ativada ou pronta em produção.

O workflow candidato de produção #74 adiciona verificações de branch master, SHA, project ref e token e fixa Supabase CLI 2.122.1. Porém:
- fixa release.version exatamente em 3.4.7;
- publica somente a função upstatus;
- não publica a API beta10 que o cliente ainda chama;
- não contém preflight de histórico AUTH-03.

O workflow de deploy-test candidato recusa produção e o projeto isolado de signaling, o que é correto. Como só existem esses dois projetos, o guard impede o deploy Full-Product TEST até existir um terceiro ambiente.

### Candidata Team Lite #76

O manifesto candidato eleva buildVersion para 3.4.31. O workflow oficial em team-lite-official e o mesmo arquivo no branch candidato ainda fazem deploy de upstatus, usam CLI latest e não validam branch, SHA e projeto de forma equivalente ao candidato Normal. O slug correto do backend Team Lite é upstatus-team-lite. Não despachar o workflow oficial.

### AUTH-03 e rate limit

Os runtimes implantados Normal e Team Lite ainda aceitam setup sem convite. No runtime Normal a senha mínima é seis caracteres; no Team Lite, quatro. Ambos mantêm fallback administrativo por nomes fixos (Ricardo, Lohan e Guilherme) quando o papel está vazio. O runtime também tem uma verificação administrativa especial pelo nome Ricardo em rota de comando remoto.

Os candidatos melhoram o primeiro acesso: Normal #74 e Team Lite #76 exigem token de convite consumido por RPC. Os templates candidatos alinham senha de setup em seis caracteres e login em quatro.

Há, porém, uma divergência concreta: o handler Normal #74 emite convite sem chamar consume_upstatus_setup_invite_rate_limit, embora a migration e o teste dessa RPC estejam no conjunto candidato. O handler Team Lite #76 chama a RPC e aplica limite de cinco convites por administrador em 900 segundos. AUTH-03 não está implantado em produção.

A consulta de catálogo em produção confirmou ausência da tabela upstatus_setup_invites, colunas setup_token_hash/setup_token_expires_at, RPC consume_upstatus_setup_invite, tabela/RPC de rate limit, tabela de tentativa de voz e tabelas upstatus_signal_*.

## 7. RLS, grants, SECURITY DEFINER, Realtime e Storage

### Produção

- Dez tabelas do schema public têm RLS habilitado, FORCE RLS desabilitado e zero policies.
- Nove das dez concedem privilégios diretos a anon e authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- O grant TRUNCATE não é protegido por RLS. Não foi tentada operação destrutiva.
- Default ACLs mantêm privilégios amplos para objetos futuros criados por postgres em public/storage e por supabase_admin em public/GraphQL.

As três funções upstatus_broadcast_messages, upstatus_broadcast_remote_state e upstatus_broadcast_users são SECURITY DEFINER, retornam trigger, usam search_path=public e têm EXECUTE para anon/authenticated. Como retornam trigger, não há evidência de que sejam invocáveis diretamente como RPC PostgREST comum; a classificação do Advisor não deve ser confundida com exploração RPC comprovada. Os grants de cliente continuam desnecessários e search_path precisa ser endurecido.

### Realtime

A tabela realtime.messages contém 106 registros; todos private=false, no tópico upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. A última linha observada é de 13/11 20:52:22 UTC. Há zero policies; anon tem SELECT/INSERT e authenticated tem SELECT.

Os triggers confirmados:
- messages → upstatus_broadcast_messages: envia to_jsonb(OLD/NEW) completo no evento db_change, private=false;
- upstatus_state → upstatus_broadcast_remote_state: envia metadados de remote_command/remote_result, private=false;
- users → upstatus_broadcast_users: envia status e campos associados, private=false.

O risco principal confirmado é a divulgação e confiança em broadcasts públicos, não uma RPC direta das funções trigger. Não foi feita exploração, publicação de evento forjado ou reprodução de ataque. A configuração de dashboard Allow public access não é exposta pelo conector.

### Storage

Produção contém dois buckets públicos:
- chat-images: 168 objetos;
- profile-images: 20 objetos.

Ambos têm limite de 20 MiB e storage.objects tem zero policies. O total é 188 objetos. A política de privacidade e isolamento por usuário permanece sem comprovação.

### Laboratório

O catálogo do laboratório mostra 18 tabelas públicas com RLS e zero policies, mas sem grants diretos atuais de tabela para anon/authenticated. As três funções SECURITY DEFINER de broadcast usam search_path vazio e não concedem EXECUTE aos papéis de cliente.

A proteção ainda é parcial: realtime.messages mantém SELECT/INSERT para anon, SELECT para authenticated e zero policies; default ACLs de storage e de supabase_admin em public/GraphQL ainda são amplas. Não há buckets nem objetos Storage no laboratório. O Security Advisor consultado em 17/11 01:34 UTC retornou 18 INFOs RLS sem policy e nenhum WARN SECURITY DEFINER; produção retornou três WARNs SECURITY DEFINER e dez INFOs RLS sem policy.

## 8. Issues, revisão humana e aceitação física

- Issue #78 está aberta com 0/8 critérios físicos marcados. Os critérios exigem reconexão sem F5 em Normal e Team Lite, reentrada, novas chamadas, ausência de peers/áudio/polling duplicados e teste manual.
- Issue #79 está aberta com 16 itens marcados e 19 pendentes no corpo.
- PRs #74, #75, #76 e #82 continuam Draft e sem reviews humanas.
- Nenhum teste manual foi realizado nesta execução.

## 9. Gates desta execução

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | BLOCKED | 106 mensagens Realtime públicas, zero policies |
| TEST-ISOLATION | BLOCKED | Só dois projetos; laboratório não é Full-Product TEST e quota bloqueou #76 |
| MIGRATION-PROVENANCE | IN PROGRESS | Inventário atual de 7 migrations em produção e 39 no laboratório; recuperação de SQLs ainda exige replay/proveniência final |
| AUTH-03 | BLOCKED | Schema/RPCs ausentes em produção; rate limit divergente nos candidatos |
| ACL-STORAGE | BLOCKED | Grants/default ACLs amplos, buckets públicos e zero policies Storage |
| RECONNECT | PENDING | Issue #78 0/8; requer teste físico sem F5 |
| HUMAN-REVIEW | PENDING | PRs sem reviews e sem autorização explícita de release |

## 10. Próximas ações prioritárias

1. Diagnosticar os 402 de produção; confirmar uma chamada funcional controlada antes de declarar recuperação.
2. O proprietário da organização deve revisar Usage/Billing e spend cap do laboratório; não presumir que a mesma causa explique produção.
3. Unificar o handler AUTH-03 e rate limit entre Normal e Team Lite, com testes HTTP reais no ambiente isolado.
4. Construir e validar sinalização server-mediated autenticada; torná-la default seguro e remover os listeners públicos sensíveis.
5. Corrigir o workflow Team Lite para o slug correto e proteções equivalentes; incluir preflight de migrations no corte Normal.
6. Corrigir grants/default ACLs e Storage por plano revisado, sem aplicar alterações nesta auditoria.
7. Criar Full-Product TEST, validar migrations, executar os oito critérios físicos da #78 e obter revisão humana.

**Recomendação final: NOT READY.** CI positivo em candidato não equivale a deploy seguro nem a aceitação física. A produção ainda tem bloqueadores de disponibilidade, autorização, Realtime e Storage.
