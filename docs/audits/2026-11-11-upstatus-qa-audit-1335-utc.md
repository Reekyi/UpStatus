# UpStatus — auditoria independente de qualidade

**Data:** 2026-11-11 13:35 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório isolado:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** `not_ready`

## Método e limites

- GitHub: leitura de refs, PRs, patches, reviews, workflows, logs, branches, rulesets e arquivos.
- Supabase: SELECT-only em catálogos, tabelas de metadados, inventário de migrations/funções e Security/Performance Advisors.
- Foram consultados workflows existentes. Nenhum workflow foi iniciado ou repetido pela QA.
- Não houve teste manual em navegador, teste HTTP real, mutação de fixtures, migration, deploy, merge, release ou publicação de userscript.
- A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79.

## 1. Heads e integridade das referências

| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA / PR #82 | `bfe4c053099eff32aeb4b7ac86ba4cc885bb45f5` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `4edfbf25476c7c751741b2e14c2c88fdc554f618` |
| PR #82 | `bfe4c053099eff32aeb4b7ac86ba4cc885bb45f5` |
| PR #131 | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` |
| PR #135 | `98e96cfe59b0db585fd4a322736cbfdd12484ba0` |
| PR #141 | `61d00fb8666f4ca91c5a3c52a415d877b31a10cf` |
| PR #142 | `f4b1a6dbccecf63152bf353fcaaadfcd41357e11` |
| PR #143 | `34cbf5877dc39ad2d2ad57befeefc53c11ceb5aa` |
| PR #144 | `d343ca96fe5853e797ebe5ece449c545ec11fc3d` — fechada, sem merge |

QA está 220 commits à frente e 1 atrás de master. O merge-base é `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não foi feito rebase.

A leitura integral de `docs/RELEASE_READINESS.md` foi feita via blob `7cfbd70886df42ce790c078c224b19284a632595`: 1.045.105 caracteres e 8.410 linhas. O último checkpoint interno é 2026-11-08 18:30 UTC; não contém esta revalidação de 11/11. O endpoint de conteúdo por faixa retornou vazio, mas o blob completo foi recuperado e inspecionado.

A lista de rulesets do repositório retornou vazia. A leitura do endpoint de branch protection retornou 403 por permissão da integração; portanto, esta QA não consegue afirmar independentemente se a proteção de branch está desativada.

## 2. PRs, CI e revisão humana

| PR | Evidência atual | Classificação |
|---|---|---|
| #74 Normal | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS no HEAD exato | AUTOMATED PASS; não é aceitação física |
| #75 Team Lite baseline | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | PASS histórico; baseline antiga |
| #76 Team Lite | Candidate Checks [42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) SUCCESS, 110/110 checks autenticados | AUTOMATED PASS em laboratório |
| #82 QA | Validate [43021704263](https://github.com/Reekyi/UpStatus/actions/runs/43021704263) FAILURE no HEAD exato | BLOCKED por `production updateURL mismatch` |
| #131 AUTH-03 Normal | Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) SUCCESS, 136/136 checks autenticados | AUTOMATED PASS em laboratório |
| #135 recuperação de migrations | Validate [42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) FAILURE | BLOCKED pelo mesmo `production updateURL mismatch` |
| #141 updater/chat | Validate [42936993580](https://github.com/Reekyi/UpStatus/actions/runs/42936993580) SUCCESS no HEAD exato | AUTOMATED PASS; PR Draft |
| #142 API Normal | Nenhum workflow PR-triggered retornado para o HEAD `f4b1a6d` | NOT VERIFIED no HEAD exato |
| #143 dispatcher | Validate [42984668622](https://github.com/Reekyi/UpStatus/actions/runs/42984668622) SUCCESS em evento pull_request; offline guard [42984657754](https://github.com/Reekyi/UpStatus/actions/runs/42984657754) SUCCESS em evento push | PASS parcial; guard não foi demonstrado em evento PR para a base empilhada |
| #144 updater | Fechada sem merge; sem review | Encerrada como redundante |

As PRs #74, #75, #76, #82, #131, #135, #141, #142, #143 e #144 retornaram zero reviews submetidas. Nenhuma aprovação humana foi encontrada.

### #76 Team Lite

O log do run [42993916169](https://github.com/Reekyi/UpStatus/actions/runs/42993916169) registra 110/110 checks autenticados, negociação WebRTC em Chromium para chamada, voz e tela, malha de três participantes, rate limit de endpoint, recibos atômicos, enrollment, rate limit de convite e testes de recuperação/saída de sala. São testes automatizados com ambiente isolado; não substituem Tampermonkey e rede física.

### #131 Normal AUTH-03

O log do run [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) registra 136/136 checks autenticados, chamada/voz/tela em Chromium, mesh de três participantes, rate limit de endpoint e de sinalização, recibos atômicos, setup enrollment e limpeza. O teste de rate limit de convites executou 24 chamadas concorrentes: cinco permitidas e 19 negadas; um segundo bucket independente permitiu cinco e negou a sexta; a janela foi reiniciada e as fixtures foram removidas.

A migration candidata é SECURITY INVOKER, search_path vazio, RLS habilitado, EXECUTE apenas para service_role e sem grants de tabela para anon/authenticated. O código chama a RPC após autenticar o administrador e retorna 429 no limite ou 503 se a RPC falhar.

Limites: a rota HTTP da Edge Function não foi exercitada ponta a ponta com o backend candidato real; a PR cobre rate limit de emissão de convite, não rate limit completo de tentativas de login.

### #141, #142 e #143: cadeia Normal

A #141 corrige a causa concreta do updateURL: master usa o slug beta10 da API para montar também a URL de atualização, enquanto `release.json` aponta para a função de distribuição `upstatus`. O validator exige `/upstatus/upstatus.user.js`; por isso #82 e #135 falham na linha 26 de `scripts/validate.mjs`. A #141 separa `PROD_API_FUNCTION` da função de distribuição e usa `release.scriptUrl` para update/download. O Validate da #141 passou. A mesma PR adiciona leitura/persistência de `file_name`, anexos staged e troca a limpeza do chat de comparação nominal com Ricardo para verificação de papel `implementation_admin`. É inspeção de código e CI candidato, não comportamento implantado.

A #141 não contém `consume_upstatus_setup_invite_rate_limit`. A #131 está baseada na linha #74 e a comparação entre #131 e #141 é divergente (884 commits à frente e 18 atrás, merge-base master). Não fazer merge/cherry-pick cego.

A #142 está corretamente baseada no HEAD da #141 e acrescenta a geração do runtime beta10. Porém, seu workflow candidato filtra pull_request para a própria branch de paridade, enquanto a PR #142 tem como base a branch staged-chat. Nenhum run PR-triggered foi encontrado para o HEAD atual.

A #143 está 13 commits à frente e 1 atrás do HEAD atual da #142; seu base SHA é `6fa53bd8246862e6fd5613787e5fa9bea4cdaefa`, enquanto a #142 está em `f4b1a6d`. O Validate da #143 passou como PR, mas o offline guard observado passou em push. O workflow dispatcher filtra pull_request para master, não para a base empilhada da #143. A PR continua Draft. `release.json` em master continua 3.4.7; o dispatcher exige versão estável superior para release.

### #135: proveniência das migrations

A #135 preserva o texto de quatro statements recuperados de `supabase_migrations.schema_migrations`. A própria README da PR afirma que isso não prova recuperação byte-a-byte dos arquivos originais, comentários, formatação, blob ou commit original. Cada registro tinha um statement e rollback NULL. Os arquivos estão em `docs/migration-recovery/`, fora de `supabase/migrations/`; não devem ser movidos para a pasta de descoberta nem aplicados. O Validate da PR falhou por updateURL mismatch.

## 3. Supabase — produção

### Inventário

- Projeto principal: 7 migrations no ledger; branch gerenciada `main` em `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- 38 Edge Functions ACTIVE. Funções operacionais observadas: `upstatus` v480, `upstatus-team-lite` v15, `upstatus-screen-share-3-1-1-beta10` v6 e `upstatus-test` v281. Todas as 38 reportam `verify_jwt=false`; isso não prova ausência de autenticação, pois os handlers principais usam token customizado. Não existe `upstatus-signal` em produção.
- `release.json` em master: versão 3.4.7 e URL de distribuição `/functions/v1/upstatus/upstatus.user.js`.

### Realtime e bundles implantados

A consulta read-only encontrou 71 mensagens em `realtime.messages`, todas `private=false`, no tópico legado:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

| Evento | Quantidade |
|---|---:|
| user_status | 39 |
| db_change | 20 |
| remote_command | 6 |
| remote_result | 6 |

Os userscripts embutidos em `upstatus` v480 e `upstatus-team-lite` v15 foram decodificados diretamente das Edge Functions. Ambos assinam `upstatus-screen-share-live-3-1-1-beta10`; não encontrei `private:true` nem `setAuth()`. Os listeners encaminham eventos para handlers de comandos remotos, chamadas, voz em sala e compartilhamento de tela. Team Lite condiciona parte dos listeners à sessão local atual, mas isso não autentica o remetente do broadcast.

`realtime.messages`: RLS true, FORCE RLS false, zero policies e privilégios efetivos SELECT/INSERT/UPDATE para anon e authenticated.

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, têm `search_path=public`, retornam `trigger`, estão ligadas a triggers e possuem EXECUTE para anon/authenticated. O Security Advisor reporta três WARN para anon, três WARN para authenticated e dez INFO de RLS sem policy. Como retornam `trigger`, esta auditoria não demonstrou invocação direta como RPC comum; o achado concreto é o broadcast público, o payload e os grants desnecessários.

### RLS, grants e Storage

- Dez tabelas públicas têm RLS habilitado e zero policies.
- Nove tabelas concedem a anon e authenticated o ACL `arwdDxtm`: INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN. Isso corresponde a 144 concessões (9 tabelas × 2 papéis × 8 privilégios). `upstatus_visual_config` não concede esses privilégios aos papéis clientes.
- RLS sem policy bloqueia operações por linha, mas não protege TRUNCATE nem MAINTAIN.
- Default ACL: 120 entradas para anon/authenticated, envolvendo defaults em public, storage, graphql e graphql_public.
- Storage: `chat-images` e `profile-images` públicos, 20 MiB cada; zero policies em `storage.objects`. A tabela `storage.objects` tem RLS true e FORCE RLS false.

### Chat e onboarding

A tabela `messages` tem 279 linhas; cinco são documentos e as cinco têm `file_name IS NULL`. O campo existe no schema, mas os bundles implantados não o utilizam. Os runtimes implantados ainda restringem `/api/chat/clear` literalmente ao nome Ricardo. `/api/setup` continua no fluxo antigo sem consumo de token de convite. A #141 contém uma candidata de correção por papel e anexos, ainda não implantada.

## 4. Supabase — laboratório isolado

- 39 migrations e duas Edge Functions ACTIVE: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- 18 tabelas públicas com RLS e zero policies; zero tabelas públicas com privilégios efetivos para anon/authenticated.
- Default ACL: 96 entradas.
- Zero mensagens Realtime e zero buckets Storage.
- A tabela `upstatus_setup_invite_rate_limits` e as RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` existem no laboratório. A tabela não concede SELECT/INSERT a anon/authenticated; a RPC de rate limit é SECURITY INVOKER, search_path vazio e EXECUTE apenas para service_role.
- As três funções broadcast do laboratório continuam SECURITY DEFINER, mas usam search_path vazio e EXECUTE false para anon/authenticated; service_role mantém EXECUTE.
- Security Advisor: 18 INFO de RLS sem policies e nenhum WARN de SECURITY DEFINER. Performance Advisor: cinco INFO de índices não utilizados. Não remover índices somente por esse aviso.
- A função `upstatus-signal-test` v32 não contém o marcador `VOICE_ATTEMPT_ALREADY_ACTIVE`; o mapeamento HTTP 409 do candidato não foi comprovado por HTTP real.

O laboratório está isolado e útil para testes de contrato, mas não é um ambiente full-product TEST.

## 5. Issues, governança e gates

- Issue #78 está aberta com 0/8 critérios físicos marcados. Não houve queda real de internet, recuperação sem F5, reentrada em sala ou teste instalado Normal ↔ Team Lite nesta rodada.
- Issue #79 está aberta; o corpo mostra 16 itens marcados e 19 pendentes.
- Issue #79 tem um comentário dedicado `<!-- UPCONTROL:QA -->` e um comentário separado `<!-- UPCONTROL:ENGINEERING -->`. A QA atualizou somente o comentário QA existente, sem duplicatas e sem alterar o comentário da Engenharia.
- Rulesets: lista vazia. Endpoint de branch protection retornou 403 por permissão da integração; estado efetivo de proteção de branch permanece NOT VERIFIED.

| Gate | Estado QA |
|---|---|
| RT-01 | blocked |
| TEST-ISOLATION | in_progress |
| MIGRATION-PROVENANCE | blocked |
| AUTH-03 | in_progress |
| ACL-STORAGE | blocked |
| RECONNECT | pending |
| HUMAN-REVIEW | pending |

## 6. Veredito e próximos passos

**NOT READY.** Prioridades:

1. Tornar Realtime privado/server-mediated com identidade, membership, destinatário, replay/expiry e rate limit validados no servidor; eliminar broadcasts públicos de conteúdo sensível.
2. Reconciliar #141 → #142 → #143 e integrar AUTH-03 #131 deliberadamente, sem perder as correções de updater/chat.
3. Recuperar proveniência original dos quatro SQLs (ou formalmente aceitar statements do ledger como evidência distinta); diagnosticar `MIGRATIONS_FAILED`.
4. Endurecer grants, Default ACL e Storage com owner/revisão apropriados.
5. Corrigir workflow oficial Team Lite: alvo `upstatus-team-lite`, CLI pinada e preflight equivalente ao Normal.
6. Completar validação HTTP real de AUTH-03 e erro 409 de voz em ambiente isolado.
7. Executar os oito testes físicos da #78 e obter reviews/aprovação humana.

Nenhuma alteração de produção foi feita. Todas as consultas SQL foram SELECT-only. Não houve migration, fixture mutation, deploy, merge, release, publicação de userscript, alteração de secret/flag ou operação destrutiva.
