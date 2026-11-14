# UpStatus — auditoria independente QA

**Data da auditoria:** 2026-11-14T20:33:05.413Z  
**Repositório:** Reekyi/UpStatus  
**Branch documental:** qa/release-readiness-2026-11-04-master  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Supabase laboratório:** bfpjtfqlnypisxljoxkb  

## Resumo executivo

**Recomendação: NOT READY.** A candidata Normal #74 e a candidata Team Lite #76 possuem CI integrado verde nos respectivos heads. A nova PR #167 também passou no Validate de PR e corrige a geração do updateURL, além de ajustar o fluxo de anexos e a autorização de limpeza do chat. Isso não altera o estado de produção: os userscripts instalados continuam em versões antigas, os canais Realtime seguem públicos e o banco ainda transmite o registro completo de mensagens por broadcast marcado como private=false.

A falha da PR #82 permanece reproduzida no head atual da QA. O laboratório está saudável, mas vazio e sem dados de produto; não é Full-Product TEST. Não houve teste manual com Tampermonkey, microfone, captura de tela ou queda física de rede.

## Método e limites

- GitHub: leitura de refs, PRs, reviews, arquivos, commits, workflows, jobs e logs.
- Supabase: leitura de metadados de projeto, Edge Functions, migrations, catálogo PostgreSQL, grants, policies, triggers, buckets e Security Advisor.
- Todas as consultas SQL foram SELECT-only.
- Não foram publicados broadcasts, injetados sinais WebRTC, capturados áudio/tela ou executados testes destrutivos.
- Não existe checkout local do produto com navegador/Tampermonkey neste ambiente. Testes manuais não foram executados.
- Trabalho documental: somente um novo arquivo na branch QA dedicada. Não houve alteração de runtime, merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies ou fixture.

## Heads reais e integridade das branches

| Branch | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| QA | 727532533da59132bd764246bad980cc2fc70a28 |

A comparação QA versus master indica 318 commits à frente e um atrás. A PR #82 contém 168 arquivos alterados; a lista completa confirma que todos estão em docs/. Não há alteração de código de produto nessa branch. O head da QA foi revalidado antes da escrita documental para evitar sobrescrever trabalho concorrente.

## PRs obrigatórias e CI

| PR | Head | Base | Estado | Evidência |
|---|---|---|---|---|
| #74 Normal | dcaf6a072546eda0089e0cee4018c3047011f600 | master | Aberta, Draft | Validate e Smoke PASS |
| #75 Team Lite baseline | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 | team-lite-official | Aberta, Draft | PASS histórico |
| #76 Team Lite | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 | team-lite-official | Aberta, Draft | Candidate Checks PASS |
| #82 QA | 727532533da59132bd764246bad980cc2fc70a28 | master | Aberta, Draft | Validate FAIL |

### Normal #74

- Validate: [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) — SUCCESS.
- Signaling Smoke: [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) — SUCCESS.
- O Smoke registrou 19/19 verificações não autenticadas e 136/136 verificações autenticadas.
- Chromium confirmou negociação WebRTC e entrega de áudio remoto para chamada e sala de voz, vídeo remoto de compartilhamento de tela, malha de três participantes e teardown.
- Rate limit de sinalização: 90 aceitos e o próximo rejeitado com HTTP 429 e Retry-After de 60 segundos.
- Recibos atômicos, concorrência do rate limiter e cleanup de fixtures passaram.
- A etapa de rate limit distribuído de emissão de setup invites foi SKIPPED. Não contar esse cenário como aprovado.

### Team Lite #76

- Candidate Checks: [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) — SUCCESS.
- O log registrou 16/16 verificações não autenticadas, 110/110 verificações autenticadas e 11/11 contratos HTTP offline.
- Playwright executou o userscript completo com endpoints inertes e stubs de GM/Tampermonkey.
- WebRTC de chamada, voz e tela, malha de três membros, rate limit 90+1/429, recibos atômicos, consumo único de convite, rate limit de convite e recuperação de sala passaram.
- Isso é CI integrado em ambiente isolado, não teste físico no navegador instalado.

### Team Lite #75

O Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) é PASS histórico da baseline. Não substitui a validação atual da #76.

### QA #82

O Validate [43633091200](https://github.com/Reekyi/UpStatus/actions/runs/43633091200) falhou no head atual da QA:

- Build: Normal 3.4.7 / TEST 3.4.7.
- Erro: production updateURL mismatch.
- O job parou na validação de build. Não foi feito rerun manual.

A falha é coerente com a divergência anterior entre o builder e o endereço de distribuição estável. O artefato Normal atualmente instalado já contém o updateURL estável correto.

## Nova candidata #167: updater e anexos do chat

A PR #167 está aberta, Draft, sem review humana e não mesclada. Head: d100b0820dd7f98e2b78a98e6b6f8c09f13b1867.

Validate: [43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) — SUCCESS no merge ref 8706dd8. O run não inclui Smoke Supabase nem teste manual.

Mudanças inspecionadas:

- O builder usa release.json scriptUrl como URL de distribuição e mantém o endpoint beta10 como API. O validator exige igualdade exata entre updateURL, downloadURL e o endereço estável.
- O manifesto de release é separado do endpoint de API. O artefato TEST não consome o manifesto de produção.
- A remoção recursiva do diretório da função foi retirada do build para preservar arquivos auxiliares existentes.
- A limpeza do chat exige a conta Ricardo e o papel persistido implementation_admin no cliente e no backend.
- Anexos agora ficam pendentes no composer até o usuário enviar a mensagem. Se o upload falhar, o arquivo e a legenda são restaurados para nova tentativa.
- O Validate registrou aprovação das regressões de chat.

Classificação: **CI PASS do Validate de PR + inspeção de código**. Não é teste manual de upload, não comprova gravação no Storage de produção e não substitui Smoke. A mudança de UX de anexos precisa de aceitação manual.

## Artefatos realmente implantados

Consulta read-only à Management API e decodificação dos userscripts embutidos:

| Função | Versão Edge | Userscript embutido |
|---|---:|---:|
| upstatus | v480 | 3.4.7 |
| upstatus-team-lite | v15 | 3.4.30 |
| upstatus-screen-share-3-1-1-beta10 | v6 | API Normal |
| upstatus-test | v281 | 3.3.28 |

Normal 3.4.7 contém updateURL e downloadURL estáveis apontando para /functions/v1/upstatus/upstatus.user.js. Team Lite 3.4.30 aponta para o arquivo raw da branch team-lite-official.

Nos dois produtos instalados:
- canais Realtime são criados sem private:true;
- não há realtime.setAuth();
- o emissor do broadcast não é autenticado;
- Normal processa remote_command chamando executeRemoteCommand quando o destinatário é o membro local;
- Team Lite verifica a própria sessão e geração de autenticação, mas isso não prova a identidade do publicador;
- call_signal e eventos de voz/tela ainda recebem identidade e dados estruturais do payload público.

## Realtime e confidencialidade

### Trigger de mensagens

A função implantada public.upstatus_broadcast_messages() serializa a linha OLD/NEW completa com to_jsonb e chama realtime.send com private=false. O payload pode conter texto da conversa, URL de mídia, menções, resposta, reações, identificadores e timestamps.

As outras duas funções SECURITY DEFINER:
- upstatus_broadcast_remote_state() publica metadados de comandos e resultados;
- upstatus_broadcast_users() publica estado e metadados de usuários.

### Snapshot de 14 dias

A consulta de realtime.messages retornou 106 eventos, todos private=false:

| Evento | Quantidade |
|---|---:|
| user_status | 72 |
| db_change | 26 |
| remote_result | 4 |
| remote_command | 4 |

Tópico dos triggers: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.  
Tópico dos clientes instalados: upstatus-screen-share-live-3-1-1-beta10.

Os tópicos não coincidem. Os registros do tópico dos triggers não provam entrega aos clientes atuais.

**Classificação:** caminho de publicação pública e payload excessivo confirmados por inspeção de código/catálogo. A configuração Allow public access do Dashboard não foi exposta pelo conector. Não houve reprodução de acesso externo; portanto, não classificar como vazamento externo comprovado.

### Backend server-mediated

As Edge Functions de produção Normal e Team Lite não possuem as rotas de sala/sinalização encontradas na função isolada. O projeto de laboratório possui upstatus-signal-test v32, com rotas /room/*, /signal, /broadcast, /poll e /ack. Não existe função server-mediated de sinalização implantada em produção.

A flag de transporte autenticado dos candidatos permanece desativada por padrão e o endpoint não está configurado. Não apontar clientes de produção para o laboratório.

## PostgreSQL: RLS, grants, SECURITY DEFINER e Storage

Consulta read-only ao catálogo de produção:

| Indicador | Resultado |
|---|---:|
| Tabelas public | 10 |
| Tabelas com RLS | 10 |
| Policies em public | 0 |
| Grants diretos anon/authenticated | 126 |
| Grants TRUNCATE anon/authenticated | 18 |
| Funções SECURITY DEFINER em public | 3 |
| Funções SECURITY DEFINER com search_path=public | 3 |
| Policies em realtime.messages | 0 |
| Grants de cliente em realtime.messages | 6 |
| Policies em storage.objects | 0 |

As três funções SECURITY DEFINER de broadcast têm EXECUTE para anon e authenticated, search_path=public e retorno trigger. Não foi demonstrada invocação direta como RPC PostgREST. O grant amplo continua desnecessário e precisa de revisão.

Default ACL: 24 registros e 300 entradas ACL expandidas. Nove tabelas backend-owned mantêm privilégios amplos para os papéis clientes, inclusive TRUNCATE. RLS sem policies não protege TRUNCATE.

Security Advisor:
- 10 INFO de RLS habilitado sem policy;
- 3 WARN para anon por EXECUTE em SECURITY DEFINER;
- 3 WARN para authenticated pelo mesmo motivo.

Storage:
- chat-images: público, 168 objetos, limite 20 MiB;
- profile-images: público, 20 objetos, limite 20 MiB;
- zero policies próprias em storage.objects.

Não foram realizadas operações de escrita nem tentativas de TRUNCATE.

## AUTH-03, Edge Functions e isolamento

Produção dlfvkawaiqduhlazsszm:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.002;
- 38 Edge Functions ACTIVE;
- 7 migrations;
- zero colunas setup_token_hash/setup_token_expires_at;
- zero RPCs de consumo de setup invite consultadas.

O projeto contém upstatus-test v281 dentro da própria produção; isso não é isolamento independente.

Laboratório bfpjtfqlnypisxljoxkb:
- ACTIVE_HEALTHY, PostgreSQL 17.11.0.003;
- 2 Edge Functions ACTIVE: upstatus-signal-test v32 e upstatus-signal-e2e-once v3;
- 39 migrations;
- duas colunas de setup token e duas RPCs relacionadas a setup invite.

O laboratório está vazio: zero usuários, mensagens, sessões, perfis, salas, membros de sala, eventos, bindings, rate limits, call attempts, voice-room attempts e objetos Storage. Portanto, não é Full-Product TEST.

A branch gerenciada Supabase main continua MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY.

A lista de migrations de produção contém sete versões. Os quatro SQLs recuperados anteriormente aparecem no histórico de produção; esta execução não repetiu a comparação byte a byte dos arquivos recuperados contra o ledger. O gate de proveniência não foi atualizado nesta rodada.

## Issues, reviews e testes manuais

- Issue #78: OPEN, 0/8 critérios físicos marcados. Atualização mais recente do issue em 08/11.
- Issue #79: OPEN, 16 critérios marcados e 19 pendentes.
- Reviews humanas: zero reviews em #74, #75, #76, #82 e #167.
- Nenhum teste manual foi executado nesta auditoria.
- Nenhum teste físico de perda real de internet, reconexão sem F5, microfone, captura de tela, Tampermonkey ou interoperabilidade instalada Normal ↔ Team Lite foi realizado.

## Gates e recomendação

| Gate | Estado |
|---|---|
| RT-01 | BLOCKED — Realtime público, payload completo e backend autenticado ausente em produção |
| TEST-ISOLATION | BLOCKED — laboratório vazio, sem fixtures de produto |
| AUTH-03 | BLOCKED — setup tokens e RPCs ausentes em produção |
| ACL-STORAGE | BLOCKED — grants/Default ACL amplos e buckets públicos sem policies próprias |
| RECONNECT | PENDING — 0/8 testes físicos |
| HUMAN-REVIEW | PENDING — nenhuma review humana ou autorização de release |
| MIGRATION-PROVENANCE | Mantido conforme evidência anterior; não revalidado byte a byte nesta execução |

**NÃO LIBERAR.** Prioridades:
1. Minimizar imediatamente o payload público de mensagens e retirar conteúdo da conversa dos broadcasts.
2. Implementar backend server-mediated autenticado em Normal e Team Lite, validar sessão, membership, destinatário, expiração, replay e rate limit.
3. Tornar o transporte autenticado default seguro e remover listeners públicos sensíveis.
4. Integrar as correções de proveniência dos dois produtos.
5. Corrigir o workflow oficial Team Lite: o arquivo atual publica upstatus em vez de upstatus-team-lite e usa CLI latest.
6. Concluir AUTH-03 e revisar grants, Default ACL e Storage.
7. Provisionar Full-Product TEST.
8. Executar os oito testes físicos e obter aprovação humana explícita.

## Registro de segurança

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva. A única escrita documental desta rodada foi este novo arquivo na branch QA dedicada.
