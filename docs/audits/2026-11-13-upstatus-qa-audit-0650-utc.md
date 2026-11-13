# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-13T06:50:57.897Z  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**HEAD QA verificado antes da escrita:** `0ce0c34779384ae0289f2b8663546a03f9b1be2c`  
**Veredito:** **NOT READY**

## Resumo executivo

Esta execução revalidou os artefatos instalados, as candidatas #74/#76, a PR documental #82, a PR paralela #158, as Issues #78/#79 e os dois projetos Supabase. O trabalho em GitHub e Supabase foi somente leitura, exceto pela criação deste relatório na branch QA e atualização do comentário QA já existente na Issue #79.

**Avanços confirmados**
- A PR #74 passou Validate e Smoke no HEAD exato `dcaf6a072546eda0089e0cee4018c3047011f600`.
- A PR #76 passou Candidate Checks no HEAD exato `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94`, com 16/16 verificações não autenticadas e 110/110 autenticadas.
- A candidata Normal #74 contém o guard de TEST, updater por canal, setup por convite, autorização de limpeza do chat por proprietário + role e tratamento de `remote_command` como aviso para consulta autenticada.

**Bloqueadores ainda ativos**
- O userscript TEST instalado continua usando a API beta10 de produção e compartilha namespace/chave GM com Normal.
- Normal, Team Lite e TEST instalados ainda usam broadcasts públicos; não há endpoint `upstatus-signal` em produção.
- O workflow oficial Team Lite publica o slug Normal `upstatus`.
- AUTH-03, RLS/grants/Storage, proveniência das migrations e aceitação física continuam incompletos.
- A #82 segue com Validate vermelho no HEAD atual da QA; a #158 falha na regressão de anexos staged.

## 1. Heads, comparação e documentação

| Referência | HEAD verificado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `0ce0c34779384ae0289f2b8663546a03f9b1be2c` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90` (prefixo; baseline histórico) |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 | `0ce0c34779384ae0289f2b8663546a03f9b1be2c` |
| PR #158 | `25775192ed5be4197581b55123cd4f2f78386c51` |

A comparação QA contra master retorna **271 commits à frente e 1 atrás**, com 130 arquivos divergentes, todos sob `docs/`. Nenhum arquivo de produto aparece no diff da branch QA.

O arquivo `docs/RELEASE_READINESS.md` foi lido integralmente via conteúdo raw da branch QA: **8.409 linhas e 1.045.105 bytes**. O último checkpoint técnico dentro dele é de **08/11/2026 às 18:30 UTC**. O documento principal foi preservado; esta rodada foi registrada em arquivo separado.

## 2. PRs, CI e revisão humana

| PR | HEAD | Resultado verificado | Leitura QA |
|---|---|---|---|
| #74 Normal | `dcaf6a0` | Validate #43376770142 PASS; Smoke exato #43376770200 PASS | Melhor trilha Normal atual; ainda Draft e sem review |
| #75 Team Lite | `7bbf9b9` | Candidate Checks #41674353127 PASS histórico | Baseline anterior; substituída como trilha ativa pela #76 |
| #76 Team Lite | `83a6cc4` | Candidate Checks #43363871881 PASS, 16/16 + 110/110 | Melhor candidata Team Lite atual; ainda Draft e sem review |
| #82 QA | `0ce0c34` | Validate #43373210867 FAIL | PR documental; falha em `production updateURL mismatch` |
| #158 Normal | `2577519` | Validate #43363857861 FAIL | Falha atual em `files are staged instead of uploaded immediately`; não integrar isoladamente |

### #74 — evidência exata

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- Smoke exato: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- O merge ref `6912c96e51ed150af673093a352650270c4d4fd9` tem como pais master `9d40461` e a candidata `dcaf6a0`.
- Smoke: 19/19 verificações não autenticadas, 136/136 autenticadas, WebRTC de chamada/voz/tela, mesh de três participantes, rate limit com 90 aceitas e uma rejeição HTTP 429, setup-invite, recibos e cleanup das fixtures.
- O Smoke exato do SHA `dcaf6a0` agora concluiu com sucesso. O comentário anterior da Engenharia o registrava como pendente; essa pendência foi resolvida pelo run #43376770200.

### #76 — evidência exata

- Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- O log confirma 16/16 verificações não autenticadas e 110/110 autenticadas, com Playwright, WebRTC, mesh, recuperação de sala, rate limit distribuído, convites e cleanup no laboratório.

### #82 e #158

- #82 no HEAD atual da QA: https://github.com/Reekyi/UpStatus/actions/runs/43373210867. Falha em `scripts/validate.mjs:26`: `production updateURL mismatch`. O diff da #82 é documental; a candidata #74 contém a correção do updater, mas a PR #82 ainda não foi revalidada sobre essa trilha.
- #158: https://github.com/Reekyi/UpStatus/actions/runs/43363857861. A falha atual é a regressão de anexos staged. A #74 contém o fluxo de anexos e as correções de updater/guard, portanto é a trilha Normal preferida; a #158 deve ser rebaseada sobre ela ou encerrada como supersedida após decisão humana.

Nenhuma review humana foi encontrada nas PRs #74, #75, #76, #82 ou #158. Todas permanecem Draft.

## 3. Bundles efetivamente instalados e compatibilidade

Os bundles foram decodificados a partir das Edge Functions que os servem:

| Produto | Edge Function de distribuição | Bundle | Namespace / chave GM | API indicada pelo bundle |
|---|---|---|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` / `upstatus_screen_share_beta8_` | `upstatus-screen-share-3-1-1-beta10` |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` / `upstatus_team_lite_` | `upstatus-team-lite` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` / `upstatus_screen_share_beta8_` | `upstatus-screen-share-3-1-1-beta10` |

**P0 — TEST não está isolado.** O userscript TEST servido por `upstatus-test` atualiza a partir da função TEST, mas seu `CLOUD_SERVER` aponta para a API beta10 do projeto de produção. Ele também reutiliza `@name`, `@namespace` e a chave GM do Normal. Isso cria colisão de identidade/armazenamento no Tampermonkey e faz o TEST interagir com o backend Normal de produção.

O projeto de produção possui 38 Edge Functions ACTIVE: 12 slugs `upstatus-test*`, 12 `upstatus-backup*`, dez endpoints screen-share beta1–beta10, `upstatus` e `upstatus-team-lite`. Todas aparecem com `verify_jwt=false`; isso não prova acesso anônimo a todas as operações, pois os handlers usam sessão própria, mas aumenta a dependência de autenticação correta em cada rota. O laboratório possui apenas `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

A candidata #74 corrige a geração futura: namespace TEST próprio, prefixo GM próprio, destino inerte por padrão e rejeição de produção/laboratório. Seu workflow TEST também exige `SUPABASE_TEST_PROJECT_ID`, rejeita os dois projetos existentes e fixa CLI 2.122.1. Porém o projeto full-product TEST ainda não existe e o runtime v281 continua ativo na produção.

## 4. Realtime e sinalização

Produção:
- 125 linhas em `realtime.messages`, todas `private=false`.
- Eventos: 67 `user_status`, 46 `db_change`, 6 `remote_command`, 6 `remote_result`.
- As mensagens persistidas estão no tópico legado `upstatus-live-...`; os clientes atuais assinam `upstatus-screen-share-live-3-1-1-beta10`.
- `realtime.messages` é particionada (7 partições), RLS habilitado, FORCE RLS desabilitado, zero policies e privilégios SELECT/INSERT/UPDATE para anon e authenticated.

Laboratório:
- Zero mensagens e zero partições em `realtime.messages`.
- RLS habilitado, zero policies, FORCE RLS desabilitado e privilégios SELECT/INSERT/UPDATE para anon/authenticated também presentes.

Os três bundles instalados não configuram `private:true` nem `realtime.setAuth()`. Normal e TEST encaminham `remote_command` ao executor remoto; Team Lite v15 também executa o payload recebido. Team Lite verifica sua sessão local, mas não autentica independentemente o emissor do broadcast.

As candidatas #74/#76 mudam `remote_command` para aviso de polling autenticado. Isso é um avanço de código, não uma correção instalada. O transporte autenticado de call/voice/screen continua opt-in e desligado por padrão; com a flag desligada, os sinais continuam no fallback público. Não existe função `upstatus-signal` em produção. Só existe `upstatus-signal-test` no laboratório.

### Contrato HTTP de voz

O RPC instalado `open_upstatus_signal_voice_room_attempt` pode retornar `VOICE_ATTEMPT_ALREADY_ACTIVE`. A função candidata em #74 mapeia esse código para HTTP 409. A Edge Function implantada no laboratório, `upstatus-signal-test` v32, não contém esse mapeamento; ela mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`, deixando o código novo cair no fallback 500.

O teste `scripts/test-signal-test-helper-http-contract.mjs` exercita o helper local `http-contract.mjs`; ele não é uma chamada HTTP real à função v32 implantada. Portanto o contrato candidato está coberto estaticamente, mas a função implantada ainda precisa ser atualizada e testada em runtime.

## 5. RLS, grants, SECURITY DEFINER e Storage

### Produção

- Dez tabelas do schema public têm RLS habilitado e zero policies.
- Nove tabelas public têm grants para anon/authenticated em operações de tabela; existem 18 grants TRUNCATE (um para cada papel em cada tabela).
- Default ACL mantém privilégios amplos para anon/authenticated nos schemas public, storage, graphql e graphql_public.
- Três funções SECURITY DEFINER de broadcast usam `search_path=public` e têm EXECUTE concedido a PUBLIC, anon, authenticated e service_role. O Security Advisor retorna seis WARN (três por papel cliente) e dez INFO de RLS.
- As funções são trigger-returning; não foi feita invocação RPC. O achado é privilégio excessivo e search_path inseguro para funções de trigger, não exploração reproduzida.
- Buckets `chat-images` e `profile-images` são públicos, limite de 20 MiB, com 168 e 20 objetos respectivamente. Não existem policies próprias em `storage.objects`.

### Laboratório

- Dezoito tabelas public com RLS habilitado e zero policies.
- Zero grants diretos de clientes nas tabelas public de aplicação consultadas.
- As Default ACL de postgres em public foram restringidas, mas as defaults de supabase_admin para public/graphql/graphql_public e as defaults de storage ainda concedem privilégios amplos a anon/authenticated.
- Triggers SECURITY DEFINER usam `search_path=""` e EXECUTE restrito a postgres/service_role.
- Zero buckets e zero objetos Storage.

RLS habilitado sem policies nega acesso por linha aos papéis clientes, mas não substitui a revisão de grants: TRUNCATE e TRIGGER não são protegidos por RLS. Não foi demonstrado acesso destrutivo via REST nesta auditoria.

### Upload assinado

Na candidata #74, `signedUploadRoute` confere `size` e `mime` declarados pelo cliente e emite URL assinada. O limite é 20 MiB tanto para avatar quanto para anexos; o bucket também limita 20 MiB. O handler não verifica a assinatura real dos bytes nem aplica quota/rate limit específico para emissão de tickets. A função de MIME do fluxo legado retorna o MIME declarado quando não reconhece uma assinatura. Isso é inspeção estática; nenhum upload real foi executado. A propriedade do objeto ainda precisa ser vinculada a identidade imutável do usuário.

## 6. Identidade, autorização e AUTH-03

Produção tem cinco usuários: três `implementation_admin` e dois `implementation_user`; todos possuem password_hash. Não foi observado usuário sem senha.

Entretanto:
- `users.id` é a chave primária, mas `users.name` não possui UNIQUE.
- `upstatus_sessions` armazena `user_name`, sem `user_id`, com expiração de 30 dias.
- `upstatus_profiles` também é chaveado por `user_name`.
- O login instalado ainda permite setup quando password_hash está vazio e escolhe role administrativa por nomes conhecidos se role estiver ausente.
- `/api/chat/clear` instalado no Normal beta10 e Team Lite v15 verifica somente `name === "Ricardo"`; não verifica a role persistida. A candidata #74/#76 exige proprietário Ricardo **e** `implementation_admin`.
- Produção tem zero colunas `setup_token_*`, zero tabelas de rate limit de setup e zero RPCs de consumo. O laboratório tem quatro colunas, duas tabelas e duas RPCs.

As candidatas adicionam convite de primeiro acesso e rate limit, mas essas migrations não foram aplicadas em produção. Mesmo nas candidatas, a sessão continua armazenando `user_name`; a identidade ainda não está vinculada de ponta a ponta a `users.id`.

## 7. Workflows e publicação

- `develop/.github/workflows/deploy-test.yml` ainda dispara em push para develop e workflow_dispatch, usa secret compartilhado `SUPABASE_PROJECT_ID`, CLI `latest` e publica `upstatus-test`. Isso não é uma fronteira segura de ambiente.
- A candidata #74/#76 muda TEST para workflow_dispatch, exige `SUPABASE_TEST_PROJECT_ID`, rejeita produção e laboratório de sinalização e fixa CLI 2.122.1. Não pode operar até existir o projeto full-product TEST.
- `team-lite-official/.github/workflows/deploy-production.yml` ainda usa CLI `latest` e executa `supabase functions deploy upstatus`. O destino correto é `upstatus-team-lite`. Não despachar esse workflow.
- O workflow de produção candidato Normal valida branch master, SHA, projeto e CLI 2.122.1, mas `release.json.version` permanece 3.4.7, igual ao bundle Normal instalado. O workflow também não publica o endpoint beta10 nem o endpoint de sinalização autenticada e não executa migrations.

Nenhum workflow de deploy foi despachado.

## 8. Migrations, issues e testes manuais

- Ledger Supabase produção: 7 migrations.
- Ledger laboratório: 39 migrations.
- Branch gerenciada `main` do projeto de produção: `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Quatro SQLs históricos continuam sem recuperação original byte a byte no diretório canônico. A recuperação documental da #135 não substitui os arquivos originais.

Issue #78 permanece 0/8 critérios físicos. Não há evidência de reconexão Normal/Team Lite sem F5, microfone real, permissões reais de tela ou interoperabilidade instalada. Não houve teste manual nesta execução: não existe ambiente full-product TEST isolado nem navegador/Tampermonkey controlado disponível.

Issue #79 mantém checklist 16/35. O comentário QA existente foi atualizado; o comentário da Engenharia foi preservado. Não foram criados comentários duplicados.

## 9. Gates QA

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | 125 broadcasts públicos; nenhum endpoint de sinalização em produção |
| TEST-ISOLATION | blocked | TEST v281 usa API beta10 de produção e identidade GM do Normal |
| MIGRATION-PROVENANCE | blocked | quatro SQLs originais ausentes; branch main MIGRATIONS_FAILED |
| AUTH-03 | blocked | setup tokens/rate limit ausentes em produção |
| ACL-STORAGE | blocked | RLS sem policies, grants/default ACL amplos, buckets públicos sem policies |
| RECONNECT | pending | Issue #78 permanece 0/8; depende de teste físico sem F5 |
| HUMAN-REVIEW | pending | PRs Draft sem reviews e sem autorização explícita de release |

## 10. Próximas ações

1. Ricardo decidir se autoriza o terceiro projeto Supabase full-product TEST. A Engenharia informou cotação de US$0/mês na organização atual; a QA não verificou o billing e não criou o projeto.
2. Provisionar TEST separado e planejar retirada do runtime legado, sem tocar produção sem aprovação específica.
3. Implantar e validar `upstatus-signal` em produção antes de habilitar a flag autenticada.
4. Atualizar os bundles Normal/Team Lite; transformar broadcasts públicos em hints apenas.
5. Corrigir o workflow Team Lite e o deploy-test legado.
6. Vincular sessão, perfil e ownership a `users.id`; integrar AUTH-03.
7. Endurecer RLS, grants, Default ACL, SECURITY DEFINER e Storage.
8. Recuperar SQLs originais e resolver `MIGRATIONS_FAILED`.
9. Validar upload real e o HTTP 409 da função implantada.
10. Executar os oito testes físicos e obter review humana vinculada ao SHA final.

## Segurança operacional desta execução

Todas as consultas Supabase foram SELECT-only. Não houve alteração de produção, secrets, flags, migrations, deploy, merge, release ou publicação de userscript. Não foi executado teste de exploração nem upload real. A única escrita no repositório foi este novo relatório na branch QA; a única outra escrita foi a atualização do comentário QA existente na Issue #79.


## 11. Adendo — propriedade de avatar e identidade da sessão

A PR #157 foi reavaliada como candidata relacionada, embora não faça parte do conjunto obrigatório:
- HEAD `b7baf3a98e22b8a9555d667878e49e121d7bcf8c`, Draft, sem reviews humanas.
- Workflow `Team Lite Avatar Hardening` #43333849082 PASS.
- O teste é de helper puro; o próprio PR declara que não fez upload real nem consulta de validação contra Supabase.

A #157 deriva o prefixo de avatar de `users.id`, mas resolve esse ID novamente a partir do nome retornado pela sessão. A sessão continua armazenando `user_name`, não `user_id`. Como `users.name` não é UNIQUE em produção, o fail-closed para zero/mais de um resultado não resolve o caso de nome antigo reutilizado por exatamente uma nova conta: uma sessão antiga ainda vinculada ao nome pode resolver para o novo ID. A correção completa exige vincular `user_id` à sessão no login e invalidar sessões antigas em renomeações/reutilização.

A #157 altera somente o template Team Lite; não fecha a mesma lacuna no Normal. A candidata #74 ainda aceita qualquer caminho canônico de `profile-images` no `profileRoute`, sem validar prefixo/ownership do objeto. O upload assinado cria caminho aleatório sem vínculo ao usuário; o bucket é público. Portanto, a propriedade do avatar continua incompleta nos dois produtos até integrar uma solução consistente baseada em ID de sessão.

Também há diferença de limite no Normal candidato: o caminho legado de avatar limita a 2 MiB, enquanto `signedUploadRoute(kind="avatar")` permite até 20 MiB. O limite do bucket continua 20 MiB. Não foi realizado upload real.
