# Auditoria independente UpStatus — 2026-11-08 21:34 UTC

## 1. Base, heads e integridade

Leitura inicial de `docs/RELEASE_READINESS.md` na branch `qa/release-readiness-2026-11-04-master`:
- Blob SHA antes desta nota: `7cfbd70886df42ce790c078c224b19284a632595`.
- HEAD QA antes desta nota / PR #82: `67590bb2405bc3032a060d77c7777e104e69db09`.
- A leitura integral pelo endpoint de conteúdo é limitada pelo tamanho do arquivo; o blob foi recuperado separadamente e a cauda histórica consultada.

Heads consultados:
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- Normal #74: `9c0133e8cf6bd85ac8993888718a408db2f24a3e`.
- Team Lite baseline #75: `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309`.
- Team Lite #76: `eb28e88325d7e8a6236d9050bebabf794d64a8c4`.
- QA #82: `67590bb2405bc3032a060d77c7777e104e69db09`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.

Comparações:
- QA #82: 138 commits à frente e 1 atrás de master; o commit ausente é documental. Não foi feito rebase.
- Normal #74: 877 à frente e 1 atrás de master.
- Team Lite #76: 364 à frente de `team-lite-official`; 305 commits à frente do baseline #75.
- #104 (guard RT-01) está em linha divergente: seu parent está 108 commits à frente e 887 atrás da linha #101; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não integrar essas linhas sem reconciliação explícita.

PRs #74, #75, #76 e #82 continuam abertas/Draft; nenhuma review humana foi encontrada nessas quatro PRs. Issues #78 e #79 continuam abertas.

## 2. CI: aprovação automatizada não é aprovação de release

- #74, HEAD `9c0133e8`: Validate [42451736696](https://github.com/Reekyi/UpStatus/actions/runs/42451736696) e Signaling Smoke [42451736729](https://github.com/Reekyi/UpStatus/actions/runs/42451736729) SUCCESS. Smoke isolado cobre endpoint autenticado/não autenticado, WebRTC de chamada/voz/tela com tracks remotas, mesh de três membros, concorrência de voice attempts, rate limit 90+1/429 com Retry-After, recibos/convites e cleanup.
- #76, HEAD `eb28e883`: Candidate Checks [42450476433](https://github.com/Reekyi/UpStatus/actions/runs/42450476433) SUCCESS. Log registra 16/16 checks não autenticados, 110/110 autenticados, Full-IIFE Playwright com stubs, WebRTC, mesh, concorrência e cleanup.
- #75: [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico; está superado pelo #76.
- #82, HEAD `67590bb`: Validate [42521375135](https://github.com/Reekyi/UpStatus/actions/runs/42521375135) FAILURE em `scripts/validate.mjs:26`, `production updateURL mismatch`. A falha é herdada do contrato de build de master, não de uma alteração Markdown.
- PR #85, HEAD `b75707b6eaf678d87863144748b9aed8e2866455`: Validate [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) SUCCESS. Corrige updateURL e inclui regressões de stored-role/signed-upload, mas o log ainda imprime `PRODUCTION CUTOVER BLOCKED` por ausência das migrations/testes AUTH-03 obrigatórios. O exit SUCCESS valida o código; não libera cutover.
- PR #101, HEAD `2ef7c3324d2eb5443d31a45bd071d154ebeb4aa7`: source parity + full offline Validate [42513317464](https://github.com/Reekyi/UpStatus/actions/runs/42513317464) SUCCESS; sem chamadas Supabase, secrets ou fixtures.
- PR #102, HEAD `c4a5cae1271147204ab3b0c79b8916235f0799aa`: offline full Validate [42519210669](https://github.com/Reekyi/UpStatus/actions/runs/42519210669) SUCCESS.
- PR #103, HEAD `b3fb66429851024ee513bccb4700c944e50ff0cb`: call-source guard [42519564405](https://github.com/Reekyi/UpStatus/actions/runs/42519564405) SUCCESS.
- PR #104, HEAD `da45e7418a9d9c7719ca447a25024aeb4a553bfc`: RT-01 guard [42524476674](https://github.com/Reekyi/UpStatus/actions/runs/42524476674) SUCCESS, somente Node/offline. Não comprova que o runtime está integrado.

Os workflows #74/#76 usaram o projeto isolado `bfpjtfqlnypisxljoxkb` com allowlist e opt-in explícitos de mutação nos próprios jobs. A auditoria não executou esses scripts. Consulta SELECT-only posterior encontrou zero usuários, mensagens, sessões, salas, memberships, eventos, bindings, rate limits, call attempts e voice attempts no laboratório.

## 3. Realtime e fronteira de confiança

Runtimes realmente implantados em produção:
- `upstatus` v480, userscript 3.4.7, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`.
- `upstatus-team-lite` v15, userscript 3.4.30, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`.
- Normal beta10 v6; `upstatus-test` v281.
- Os dois userscripts de produção inspecionados não contêm o adapter de sinalização autenticada, não chamam `realtime.setAuth()`, não usam `private:true` e ainda consomem comandos/sinais pelo canal legado.

O cliente assina `upstatus-screen-share-live-3-1-1-beta10`; os triggers de produção publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. São tópicos diferentes. Produção tem 50 linhas em `realtime.messages`, todas `private=false`, em 7 partições. `upstatus_broadcast_messages()` transmite OLD/NEW completos; os triggers de remote-state e users também enviam payloads com `private=false`. A configuração Dashboard `Allow public access` não ficou disponível para inspeção; não foi demonstrado acesso externo nem executado broadcast hostil.

### Novas correções de proveniência

- #102 (Normal) e #103 (Team Lite) corrigem uma falha real dos candidatos #74/#76: `_authenticatedTransport:true` era controlado pelo payload e podia ser forjado por um emissor público. Agora a proveniência é argumento separado: polling/convites autenticados passam `true`, listener público passa `false`, e o marcador foi removido.
- No modo autenticado, descoberta pública fica limitada a propriedades próprias `presence` e `ended`; `ended` só remove entrada do diretório. Esses hints ainda podem enganar/ocultar a lista, mas não autorizam membership nem controle de chamada.
- Importante: #102/#103 são PRs filhas; os HEADs base #74/#76 ainda não incluem as correções. A flag continua default-off e o fallback público de mídia continua ativo nos candidatos.
- #104 fortalece o guard para exigir transporte ligado, endpoint de produção fixo, proveniência fora do payload, allowlist restrita e a migration de rate limit. Porém #104 está numa linha divergente e seu parent não contém os artefatos de #101. O PASS do guard é offline, não integração.

**RT-01 permanece P0.** O backend candidato existe em fonte na #101, mas não em produção. A função de produção `upstatus-signal` ainda não aparece entre as 38 Edge Functions ACTIVE; o catálogo de produção não possui as tabelas/RPCs de sinalização. #101 não altera o workflow de deploy. O workflow #89 implanta beta10 e upstatus, não upstatus-signal. #104 testa uma ordem de três runtimes, mas não está integrado à linha #101.

## 4. Sinalização server-mediated candidata

A #101 adiciona `supabase/functions/upstatus-signal/` e `verify_jwt=false` explícito para autenticação própria. Inspeção estática confirma:
- autenticação por `x-upstatus-token`, hash de sessão e lookup do usuário no servidor;
- remetente derivado da sessão, não de `from` do payload;
- room ativa/expiração e membership aceita verificadas no servidor;
- remoção recursiva de campos de identidade do payload;
- allowlist de eventos/envelopes;
- TTL de evento de 2 min, room TTL de 2 h, body máximo 20 KiB;
- limites 90 writes/min e 240 reads/min, com HTTP 429 e Retry-After 60 s;
- migration de rate-limit com RLS, sem grants a PUBLIC/anon/authenticated, service_role apenas, SECURITY INVOKER e search_path vazio.

A migration `20261108190000_distributed_signaling_rate_limit.sql` é somente fonte candidata. Produção não possui a tabela/RPC; tampouco possui as demais tabelas de sala/eventos/membership/bindings/attempts. Nada foi aplicado.

### Lacuna HTTP 409

O banco do laboratório devolve `VOICE_ATTEMPT_ALREADY_ACTIVE` para tentativa duplicada. A função de produção candidata #101 mapeia esse código para 409. Já o runtime de laboratório `upstatus-signal-test` v32 (SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`) não contém esse mapeamento.

Há também uma lacuna no teste do helper: `http-contract.mjs` cobre o código 409 e o teste offline verifica o helper, mas o ramo real `/room/open` que chama `open_upstatus_signal_voice_room_attempt` mantém mapeamento inline que não inclui `VOICE_ATTEMPT_ALREADY_ACTIVE`. O teste prova o helper, não esse ramo HTTP. Não foi feita chamada HTTP para reproduzir o 500; a conclusão é inspeção estática. O contrato real precisa ser exercitado contra runtime isolado atualizado.

## 5. Supabase: snapshots read-only

- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations, 38 Edge Functions. Branch `main` reporta MIGRATIONS_FAILED; preview ACTIVE_HEALTHY.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 38 migrations, 2 Edge Functions.
- Produção: 5 usuários, 262 mensagens; zero password hash vazio e zero role vazio. Não há colunas `setup_token_*` nem RPC `consume_upstatus_setup_invite`.
- Laboratório: 4 colunas setup-token e RPC AUTH-03 presentes; os fixtures consultados estão zerados.
- Produção: Security Advisor 6 WARN / 10 INFO. Dez tabelas públicas com RLS e zero policies; nove têm grants efetivos excessivos a anon/authenticated, incluindo TRUNCATE. Default ACLs permanecem amplas.
- Laboratório: 0 WARN / 17 INFO; tabelas backend-owned consultadas sem grants diretos a anon/authenticated. Realtime/storage são exceções de catálogo: RLS ligado, zero policies e grants efetivos SELECT/INSERT/UPDATE para anon/authenticated.
- Três funções SECURITY DEFINER de produção (`upstatus_broadcast_messages`, `upstatus_broadcast_remote_state`, `upstatus_broadcast_users`) retornam trigger, estão ligadas a triggers, usam search_path=public e têm EXECUTE para anon/authenticated. O aviso do Advisor não prova RPC direta invocável; os grants continuam desnecessários e o risco concreto é o payload público dos triggers. No laboratório, as funções foram endurecidas com search_path vazio e EXECUTE service_role.
- `storage.objects`: RLS ligado, zero policies e grants efetivos SELECT/INSERT/UPDATE para anon/authenticated; 185 objetos em produção, zero no lab. Buckets `chat-images` e `profile-images` são públicos, 20 MiB cada. Config candidata define chat 25 MB e perfil 2 MB; MIME types também divergem. Exige decisão de privacidade/limite antes de release.

## 6. Deploy e versão

- Master deploy atual usa CLI `latest`, não fixa SHA/projeto no workflow e implanta apenas `upstatus`.
- Workflow Normal candidato #89 é melhor: manual, SHA exato, organização/projeto verificados, CLI 2.122.1, preflight read-only; implanta beta10 e depois upstatus. Ainda não inclui upstatus-signal.
- Workflow Team Lite em `team-lite-official` lê o `release.json` raiz, cujo `preRelease` é `beta.22`; portanto falha fechado no preflight. Se esse guard fosse contornado, o comando implantaria `upstatus`, não `upstatus-team-lite`, usa CLI `latest` e não fixa projeto/SHA. **Não despachar.**
- Team Lite official está em 3.4.30; candidata #76 em 3.4.31. Normal release.json continua 3.4.7, igual ao userscript Normal implantado. É necessário bump estável aprovado antes do corte.

## 7. Issues e aceitação manual

- Issue #78: 0/8 critérios físicos aceitos. Ainda faltam Tampermonkey instalado, perda/retorno real de internet sem F5, reentrada, novas chamadas, microfone/display reais, múltiplas quedas e interoperabilidade instalada Normal ↔ Team Lite.
- Issue #79: 16/35 itens marcados; 19 pendentes.
- Nenhum teste físico foi executado nesta rodada. WebRTC CI/Chromium não substitui dispositivos reais, GM bridge e reconexão física.

## 8. Gates seguintes

1. Reconciliar #101 + #102 + #103 com o guard #104 numa única linha de release revisada; não fazer cherry-pick/rebase cego entre branches divergentes.
2. Integrar deployment manual para upstatus-signal → beta10 → upstatus, com SHA/projeto/organização fixos, migrations obrigatórias em preflight e rollback; nunca aplicar migration automaticamente.
3. Revisar/aprovar a sequência completa de migrations antes de qualquer operação de produção.
4. Tornar sinalização autenticada obrigatória nos dois clientes, fixar endpoint, remover fallback público de offer/answer/ICE/voz/tela e decidir substituição dos hints públicos.
5. Corrigir e testar o ramo HTTP real de VOICE_ATTEMPT_ALREADY_ACTIVE → 409 no laboratório.
6. Concluir AUTH-03 e o corte dos runtimes; hoje a produção ainda aceita o setup legado.
7. Corrigir grants/default ACLs com owner autorizado; decidir Storage privado, limites e MIME.
8. Resolver MIGRATIONS_FAILED, atualizar manifests/versões e corrigir workflow Team Lite.
9. Executar aceitação física #78 e atualizar #79; obter reviews humanas.

## 9. Segurança da auditoria

Todas as consultas SQL desta rodada foram SELECT/catalog-only. Nenhuma migration, escrita SQL, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou fixture foi realizada. Nenhum ataque Realtime, chamada externa, captura de áudio/tela ou teste físico foi executado. A única escrita desta rodada é esta nota nova na branch QA; o arquivo RELEASE_READINESS.md e branches de engenharia foram preservados.
