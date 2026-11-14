# UpStatus — auditoria independente de qualidade
**Revalidação 2026-11-08 02:32 UTC (2026-11-07 23:32 BRT)**

Repositório: [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
Produção Supabase: `dlfvkawaiqduhlazsszm`  
Laboratório isolado: `bfpjtfqlnypisxljoxkb`

## Resumo executivo

- **Normal #74:** Validate e Signaling Smoke concluídos com SUCCESS no HEAD exato. O Smoke confirmou 19/19 checks não autenticados e 134/134 autenticados, incluindo WebRTC, concorrência de salas e singleton de voice attempt.
- **Team Lite #76:** o workflow completo agora terminou com SUCCESS no HEAD exato. Confirmados 16/16 checks não autenticados, 108/108 autenticados, browser/WebRTC, rate limit, recibos, enrollment, paridade do adapter e a nova regressão de autorização do chat clear.
- **Correção importante em relação ao relatório 0132:** os achados anteriores de bundle Team Lite desatualizado e ausência de papel administrativo em `/api/chat/clear` foram corrigidos no HEAD atual #76. Não devem continuar classificados como defeitos do candidato. A mesma falha de autorização, porém, permanece nos quatro runtimes implantados em produção.
- **Novo gap de contrato HTTP:** a Edge Function isolada v32 não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. O teste de singleton usa serviceRpc diretamente e não valida o status HTTP.
- **Risco de concorrência por inspeção:** o wrapper de voice attempt adquire um advisory lock global por par de aliases antes da verificação por conta. Não houve teste de carga multi-conta; é um risco de contenção a medir, não um incidente observado.
- Produção continua com autenticação legada, broadcasts públicos, grants/default ACLs amplos e sem as novas RPCs. Não existe projeto TEST full-product.
- Nenhuma escrita em produção/laboratório, deploy, migration, merge, publicação ou alteração de branches de engenharia foi realizada. A única escrita desta rodada é este relatório na branch QA.

## 1. Leitura inicial e heads reais

A leitura de `docs/RELEASE_READINESS.md` na branch QA foi concluída antes das demais inspeções.

- Blob SHA: `1ae48aab678a06b4ff75d061d2355a6449cbe1e0`
- Tamanho: 797.831 caracteres.
- O snapshot final do documento principal ainda é anterior aos resultados desta rodada. O arquivo foi preservado integralmente, sem sobrescrita.

PR #82, branch `qa/release-readiness-2026-11-04-master`, antes deste relatório:
- HEAD: `546291d229f452c17f08744686fea34b72c92b71`
- Base master: `a9288ccfcb0f308d3a587bfca624418a395be07b`
- 115 commits à frente, zero atrás; aberta e Draft.
- O caminho deste relatório foi consultado antes da gravação e não existia.

### PRs auditadas

| PR | HEAD exato | Base | Commits à frente | Arquivos | Estado |
|---|---|---|---:|---:|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `d8914dd8e5867e87107fe3886b2346826122a6d4` | master | 870 | 86 | Open / Draft |
| [#75 Baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | 59 | 10 | Open / Draft |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `c025ae082fc2e8031868694750382d0e92288d51` | team-lite-official | 340 | 44 | Open / Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `546291d229f452c17f08744686fea34b72c92b71` | master | 115 | 24 | Open / Draft |
| [#84 TEST guard](https://github.com/Reekyi/UpStatus/pull/84) | `21341f331270e142bdf7584c1cdf16e6011e41b3` | develop | 30 | 13 | Open / Draft |
| [#85 Updater/security](https://github.com/Reekyi/UpStatus/pull/85) | `17554523ef51bafd503e74b3f1271d55f43a6eda` | master | 21 | 7 | Open / Draft |

Todas as seis PRs permanecem abertas, Draft, sem merge e sem reviews humanas aprovadas. #76 é continuação da baseline #75. #74 e #85 têm arquivos sobrepostos e exigem reconciliação antes da integração.

## 2. CI e testes

### Normal #74 — aprovado no HEAD exato

- [Validate 42437136152](https://github.com/Reekyi/UpStatus/actions/runs/42437136152): SUCCESS.
- [Signaling Smoke 42437136129](https://github.com/Reekyi/UpStatus/actions/runs/42437136129): SUCCESS.
- 19/19 checks não autenticados e 134/134 autenticados.
- Logs confirmam chamada, voz e screen-share WebRTC com faixas remotas; mesh autenticado de três membros; recuperação de ownership/membership; cancelamento antes da abertura; singleton de voice attempt entre aliases; 90 requisições aceitas e uma HTTP 429 com Retry-After 60s; recibos e enrollment concorrentes; cleanup do laboratório.

### Team Lite #76 — aprovado no HEAD exato

- [Candidate Checks 42437153048](https://github.com/Reekyi/UpStatus/actions/runs/42437153048): SUCCESS.
- 16/16 checks não autenticados e 108/108 autenticados.
- Browser call/voice/screen WebRTC, faixas remotas, mesh de três membros, recovery, rate limit, recibos, setup-invite e singleton entre aliases passaram.
- O passo estático final confirmou paridade do adapter, versão 3.4.31, sintaxe dos userscripts/portais e isolamento de sessões Lucca/Ycaro.
- O log final confirma: “Team Lite destructive chat-clear route requires the stored admin role; denied cases perform no message or Storage operations.”

### Baseline, QA e PRs auxiliares

- [#75 Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): PASS histórico; não representa um novo run no HEAD atual de #76.
- [#82 Validate 42434890424](https://github.com/Reekyi/UpStatus/actions/runs/42434890424): FAIL herdado de master, `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`. Não enfraquecer o validador.
- [#84 Validate 42387042361](https://github.com/Reekyi/UpStatus/actions/runs/42387042361): PASS no guard de destino TEST; não houve dispatch nem deploy.
- [#85 Validate 42386047749](https://github.com/Reekyi/UpStatus/actions/runs/42386047749): PASS nas regressões mockadas de updater/upload; não é Storage E2E real.

Os workflows de signaling/candidate usam fila compartilhada `queue: max`, `cancel-in-progress: false`, verificação de isolamento e opt-in explícito `UPSTATUS_SIGNAL_ALLOW_MUTATION=1` para as suites que alteram fixtures. A QA apenas inspecionou os logs; não iniciou nem repetiu esses workflows.

## 3. Autorização do chat: candidato corrigido, produção ainda vulnerável

### Team Lite candidato

- Server template: `src/server/team-lite-index.template.ts`, blob `c2367c8bd5ebdd2d2149803f7dc62c1c5aa6fcac`.
- Checker: `scripts/team-lite-candidate-check.mjs`, blob `ac27329ec8601acef7a25a24a6d358665002a763`.
- Userscript: `team-lite/upstatus-team-lite.user.js`, blob `0351aec0433c6ca7a82a0ccf16011d58d68b2eb7`.

A rota POST `/api/chat/clear` agora exige nome Ricardo **e** `await admin(name)` antes de ler mensagens, apagar registros ou remover objetos do Storage. O botão e o handler `clearChatRicardo` também exigem o papel `implementation_admin`.

O checker executa o guard real em Node VM e confirmou:
- Ricardo com papel rebaixado: HTTP 403, zero acesso a mensagens e Storage.
- Papel com espaços: HTTP 403.
- Outro administrador: HTTP 403, preservando a regra de titularidade explícita.
- Ricardo com papel `implementation_admin`: guard permite a operação.

**Limite do teste:** o VM executa somente o bloco de autorização; não executa o caminho destrutivo autorizado nem um servidor HTTP/Deno completo. A regressão negativa comprova que os casos negados param antes de qualquer leitura/exclusão/Storage.

O `deleteRoute` do candidato consulta o papel armazenado antes de excluir mensagem de outro usuário. A interface ainda pode mostrar a ação de excluir a Ricardo pelo nome em parte do menu contextual, mas o servidor bloqueia a operação sem papel; é uma inconsistência de affordance, não um bypass de autorização confirmado.

### Normal candidato

O Normal também exige Ricardo mais papel administrativo na rota de limpeza global. Sua regressão específica está em `scripts/chat-regression.test.mjs` e o Validate do HEAD atual passou.

### Produção: correção ainda não implantada

A inspeção direta dos quatro runtimes ativos encontrou a verificação antiga `if(name!=="Ricardo")` antes de ler e excluir todas as mensagens:

| Runtime | Versão | SHA implantado |
|---|---:|---|
| `upstatus` | v480 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-test` | v281 | `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a` |
| `upstatus-team-lite` | v15 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

O risco exige sessão válida da conta Ricardo; não é um bypass anônimo. A autorização, porém, sobrevive a um eventual rebaixamento/revogação do papel. **A correção do candidato não altera o estado da produção.** O corte de produção precisa portar a verificação do papel e ter plano de rollback aprovado.

## 4. Voice attempts: singleton aprovado, contrato HTTP ainda incompleto

O laboratório registra as migrations:
- `20261108011520 voice_attempt_singleton_20261108`
- `20261108011524 voice_attempt_singleton_contract_test_20261108`

A função singleton é SECURITY INVOKER, usa search_path vazio, nega EXECUTE a anon/authenticated e permite service_role. Os dois candidatos passaram os testes de mesma conta entre aliases Normal/Team Lite, bloqueio da segunda aba, cancelamento e retry.

### Gap HTTP confirmado por inspeção

A Edge Function isolada `upstatus-signal-test` continua v32, SHA `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`. Seu handler de `/room/open` não inclui `VOICE_ATTEMPT_ALREADY_ACTIVE` no mapeamento HTTP 409; o código cai no status padrão 500.

A fonte candidata #74, blob `67af33ac971410f1d2b1bd88ebc004f423d01623`, já inclui esse erro na lista 409. Mas o runtime v32 implantado no laboratório não foi atualizado.

O teste de singleton em `scripts/test-signaling-authenticated.mjs` chama `serviceRpc("open_upstatus_signal_voice_room_attempt", ...)` diretamente. Ele valida o resultado do RPC, mas não valida o status HTTP da Edge Function. Assim, o CI pode passar enquanto o contrato HTTP implantado continua retornando 500 nesse conflito.

**Gate:** adicionar teste HTTP real no ambiente TEST, verificando primeira abertura e conflito da segunda aba (status 409 + body). Nenhuma Edge Function foi implantada pela QA.

### Advisory lock

A migration `20261108010000_voice_attempt_singleton.sql`, blob `46bf6f473569d6e606a56044c9fdaf10dada0dff`, usa lock `upstatus-open-voice:<par de aliases>` sem incluir a conta antes da busca de tentativa ativa. O lock global também protege a binding da sala compartilhada, então alguma serialização é intencional. O ponto de revisão é que o wrapper mantém a seção global durante a verificação account-specific. Não houve teste de carga multi-conta; não há evidência de gargalo observado.

**Gate de desempenho:** medir concorrência entre contas distintas e revisar se a checagem singleton pode usar lock por conta, mantendo o lock global somente para alterações da sala/bindings e garantindo ordem consistente também no cancelamento.

## 5. Supabase — estado atual read-only

### Projetos, migrations e Edge Functions

| Ambiente | Ref | Estado | PostgreSQL | Migrations | Edge Functions |
|---|---|---|---|---:|---:|
| Produção | `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 | 38 |
| Laboratório | `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 36 | 2 |
| TEST full-product | — | Não existe | — | — | — |

Produção tem 5 usuários, 3 administradores explícitos, zero senha vazia e zero papel vazio.

Catalog-only:
- Produção não possui setup-invite RPC, signaling rate-limit table/RPC, auth rate-limit table/RPC, merge receipt RPC ou voice-attempt singleton RPC.
- Laboratório possui setup-invite RPC, signaling rate limit, merge de chat read receipts e voice-attempt singleton.
- Rate limiter específico de login/setup continua ausente em ambos.

Produção tem 38 Edge Functions ACTIVE e todas reportam `verify_jwt=false`; 36 nomes contêm test/beta/backup. Isso não prova ausência de autenticação customizada: os runtimes UpStatus validam sessões próprias. Exige inventário de rotas/consumidores antes de remover funções antigas.

### Security Advisor, RLS e grants

Security Advisor observado em 2026-11-08 02:39 UTC:
- Produção: 6 WARN (3 anon + 3 authenticated) e 10 INFO de RLS sem policy.
- Laboratório: 0 WARN e 17 INFO de RLS sem policy.

Produção:
- Três funções broadcast SECURITY DEFINER, `search_path=public`, EXECUTE para anon/authenticated.
- Trigger de mensagens executa em INSERT/UPDATE/DELETE; broadcast envia OLD/NEW completo via `to_jsonb`.
- Remote-state executa em INSERT/UPDATE; user-status em UPDATE.
- Broadcasts usam `private=false`.
- Dez tabelas public têm RLS e zero policies; nove têm grants amplos a anon/authenticated, incluindo TRUNCATE. `upstatus_visual_config` não tem esses grants.
- `realtime.messages` tem RLS, zero policies e SELECT/INSERT/UPDATE para anon/authenticated.
- Default ACLs: postgres em public/storage e supabase_admin em public/graphql/graphql_public concedem privilégios amplos a anon/authenticated, inclusive EXECUTE e privilégios de tabela/sequência.

RLS sem policy normalmente impede operações de linha via RLS; isso não torna os grants corretos, e TRUNCATE não é protegido por RLS. A exposição prática de cada privilégio depende do caminho de acesso/role, mas os grants são excessivos e devem ser reduzidos com plano administrativo e rollback.

Laboratório:
- Broadcasts SECURITY DEFINER com search_path vazio, EXECUTE negado a anon/authenticated e permitido a service_role.
- Payload reduzido a `{op}`, mas canais continuam `private=false`.
- Default ACLs amplos permanecem para postgres/storage e supabase_admin em public/graphql/graphql_public.

### Realtime e Storage

- Produção: 7 partições de `realtime.messages`, 50 linhas.
- Laboratório: zero partições e zero linhas. A configuração de triggers foi inspecionada, mas a entrega real por Realtime/WebSocket não está comprovada nesse projeto.
- Buckets `chat-images` e `profile-images` em produção continuam públicos, limite 20 MiB. Upload assinado #85 passou com mocks; não houve upload/download real. Upload assinado protege a escrita, não a leitura.
- `signaling_transport_enabled` permanece false por padrão nos dois clientes; o caminho padrão ainda depende do Realtime legado.

## 6. Workflows e isolamento

### Develop: deploy TEST ativo

`.github/workflows/deploy-test.yml`, blob `d4d44fd3ae78bc1ebe885bd1d5e91fe5b8607839`:
- Gatilho `push` em develop e `workflow_dispatch`.
- Secret compartilhado `SUPABASE_PROJECT_ID`.
- Supabase CLI `latest`.
- Deploy de `upstatus-test`.
- Sem validação independente da identidade do projeto de destino.

Não ler o secret e não executar esse workflow.

### Master: deploy PRODUCTION ativo

`.github/workflows/deploy-production.yml`, blob `8252c6c6e7005c98625603b5b02b14cb1e50a519`:
- Manual-only e environment `production`.
- Exige `release.json` estável na versão 3.4.7.
- Usa `SUPABASE_PROJECT_ID` e Supabase CLI `latest`.
- Não possui guard explícito de branch/SHA nem preflight de identidade do project-ref.

A #74 contém uma versão candidata com checks adicionais e CLI 2.122.1, mas está Draft e não está ativa. A versão candidata de produção também faz deploy somente da função `upstatus`; o corte do Team Lite requer fluxo/escopo separado.

### TEST guard #84

A candidata é manual-only, faz checkout do SHA do dispatch, exige develop, usa `SUPABASE_TEST_PROJECT_ID`, rejeita produção/laboratório, valida organização/host e fixa CLI 2.122.1. Validate PASS não equivale a dispatch/deploy real; não há TEST full-product para receber o deploy.

Os workflows de CI que mutam fixtures usam fila serializada, isolamento explícito e `UPSTATUS_SIGNAL_ALLOW_MUTATION=1`. Os logs confirmam cleanup; a QA não iniciou scripts mutáveis nem workflows.

## 7. Issues e aceitação manual

- [#78 Reconexão](https://github.com/Reekyi/UpStatus/issues/78): OPEN, 0/8 critérios físicos. Faltam queda real de internet, recuperação sem F5, reentrada, novas chamadas, microfone/display permission reais, ausência de peers/pollers órfãos e interoperabilidade instalada. O comentário de engenharia mais recente ainda dizia que o run Team Lite estava pending; o run 42437153048 terminou SUCCESS depois. Comentário precisa ser reconciliado.
- [#79 Release](https://github.com/Reekyi/UpStatus/issues/79): OPEN, 99 comentários; corpo atualizado em 2026-11-08 02:12 UTC ainda cita heads/runs anteriores. O último checkpoint de engenharia é anterior à conclusão do Team Lite 42437153048. Atualizar o checklist após revisar os gates, sem marcar testes físicos como concluídos.

Nenhum teste físico Tampermonkey foi executado nesta rodada.

## 8. Próximos gates

1. Portar a correção de stored-role chat clear dos candidatos para os runtimes de produção, com revisão de corte/rollback; produção ainda está vulnerável à autorização por nome.
2. Adicionar teste HTTP do conflito de voice attempt (HTTP 409 + body) e atualizar o runtime isolado/TEST somente por fluxo autorizado.
3. Medir contenção multi-conta do advisory lock e revisar a seção account-specific sem quebrar a serialização da sala compartilhada.
4. Provisionar TEST full-product, incluindo backend Team Lite, Realtime com partições e buckets Storage.
5. Integrar o guard TEST #84; não executar o workflow atual de develop.
6. Migrar setup legado, aplicar setup-invite e implementar rate limit de login/setup.
7. Migrar broadcasts para autorização privada, eliminar full-row payloads e provar entrega por WebSocket em TEST.
8. Corrigir grants e default ACLs com privilégios administrativos, revisão de dependências e rollback.
9. Decidir Storage público/privado e testar upload/download real, inclusive áudio.
10. Executar os 8 critérios físicos de #78, reconciliar #79 e obter reviews humanas.
11. Resolver a falha herdada de validação QA `production updateURL mismatch` sem enfraquecer o validador.

## 9. Limites de execução e veredito

- SQL executado: somente SELECT/catálogo.
- Nenhuma migration/DDL aplicada.
- Nenhum deploy, merge, release ou publicação de userscript.
- Nenhum secret/token lido.
- Nenhuma alteração de roles, grants, policies, ACLs, flags ou fixtures.
- Nenhum workflow iniciado/repetido manualmente.
- Nenhuma issue ou branch de engenharia alterada.
- Única escrita: este arquivo novo na branch QA dedicada.

**Veredito:** Normal #74 e Team Lite #76 estão aprovados no CI dos HEADs exatos. O defeito de autorização de chat clear foi corrigido nos candidatos e coberto por regressão, mas continua nos quatro runtimes de produção. O release permanece bloqueado por cutover de segurança, ausência de TEST full-product, autenticação legada, Realtime público e gates físicos. Não declarar percentual de progresso.
