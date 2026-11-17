# Auditoria independente UpStatus — 2026-11-12 19:39 BRT / 22:39 UTC

## Escopo e limites

Auditoria read-only do repositório `Reekyi/UpStatus`, dos projetos Supabase de produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb), das PRs obrigatórias, de candidatas de segurança/release e das issues #78/#79.

Nenhuma migration, escrita SQL, alteração de secret/flag/grant/policy, deploy, workflow dispatch, merge, release ou publicação foi executada. Todas as consultas SQL foram SELECT-only. Não foi realizado teste físico no Tampermonkey nem requisição de exploração ao Realtime.

## Heads e integridade documental

| Referência | HEAD observado |
|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `ca88312f6101de8e4ff576b71232dac425b54d91` |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

A comparação QA vs master reporta 263 commits à frente e 1 atrás. O commit master-only é documental. Não houve rebase. A QA HEAD foi revalidada antes deste novo arquivo; o relatório foi criado como arquivo novo, sem sobrescrever conteúdo concorrente.

`docs/RELEASE_READINESS.md` foi consultado integralmente: 1.045.105 caracteres / 8.410 linhas. O último checkpoint nele continua em 2026-11-08 15:30 BRT / 18:30 UTC. Esta auditoria fica em arquivo separado; o documento histórico não foi sobrescrito.

## PRs obrigatórias e CI

| PR | HEAD observado | Evidência | Classificação |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | CI PASS nos dois workflows |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico, não substitui #76 |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) | 110/110 autenticados; CI PASS |
| #82 QA | `ca88312f6101de8e4ff576b71232dac425b54d91` | [Validate 43314108497](https://github.com/Reekyi/UpStatus/actions/runs/43314108497) | CI FAIL: `production updateURL mismatch`, `scripts/validate.mjs:26` |

### Candidatas recentes

- **#155** `8500eefd211b716139ff71d30a48404176f18ad4`, Draft, mergeable, base #152 `766e614`. [Push 43317056219](https://github.com/Reekyi/UpStatus/actions/runs/43317056219) e [Pull Request 43317061462](https://github.com/Reekyi/UpStatus/actions/runs/43317061462) passaram no SHA exato/merge ref. O log confirma guard TEST, contratos de release/chat, regressões de chat, paridade estática de upload e build 3.4.7. Não houve Deno runtime, PUT real no Storage nem teste físico.
- **#154** é candidata intermediária, já incorporada na cadeia da #155; não integrar isoladamente. Seu CI [43308787548](https://github.com/Reekyi/UpStatus/actions/runs/43308787548) passou.
- **#153** continua aberta como candidata anterior, mas #155 é a cadeia mais completa para revisão.
- **#145/#146 Normal**: os contratos de remote-command/result como wake-up hints passaram em [43100913884](https://github.com/Reekyi/UpStatus/actions/runs/43100913884) e [43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452). São candidatas Draft, não instaladas.
- **#149 Team Lite**: guard de proveniência de call-signal e Candidate Checks passaram em PR runs [43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) e [43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232). A política só rejeita sinais públicos não permitidos quando `signalTransportFlag` está habilitada; o transporte autenticado permanece opt-in/desabilitado por padrão. Portanto não fecha RT-01.
- **#151**: hardening candidato de papel administrativo passou em [43196245858](https://github.com/Reekyi/UpStatus/actions/runs/43196245858), mas permanece Draft e fora da cadeia #152/#155.
- **#135**: os quatro SQLs executados recuperados do ledger foram arquivados em `docs/migration-recovery/`, não em `supabase/migrations/`. [Validate 42805693777](https://github.com/Reekyi/UpStatus/actions/runs/42805693777) falhou na assertion herdada `production updateURL mismatch`; isso não é falha de execução dos statements.

## Achados prioritários

### P0 — runtime TEST instalado dentro do projeto de produção

O projeto Supabase de produção contém `upstatus-test` v281 ACTIVE, `verify_jwt=false`, source SHA `7b5dfb1279f388d20a72ecf30f2c1e1f6104c7942017f81362e7857d6a16cb0a`. O código usa `Deno.env.SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do próprio projeto onde está implantado: produção.

Decodifiquei o userscript embutido. Ele se apresenta como `UpStatus - Sale Smartly`, namespace `upseller`, versão 3.3.28, com update/download URL em `dlfvkawaiqduhlazsszm`. Usa o mesmo tópico Realtime beta10 e a mesma publishable key dos bundles Normal/Team Lite; não contém `private:true` nem `realtime.setAuth()`; o listener público `remote_command` chama diretamente `executeRemoteCommand(c)`.

O build guard das candidatas #152/#154/#155 agora gera TEST inerte por padrão e rejeita produção/laboratório de sinalização, mas isso só protege builds futuros. Não substitui nem isola o runtime v281 já instalado. A organização tem apenas dois projetos: produção e laboratório de segurança/sinalização; o laboratório não tem buckets, objetos nem fixtures de produto completo.

A lista do projeto de produção contém 38 Edge Functions ACTIVE, incluindo funções TEST e backups antigos; todas reportam `verify_jwt=false`. Isso não prova que cada handler seja anônimo, mas exige inventário/justificativa de cada endpoint e aumenta a superfície operacional.

Evidência direta do runtime TEST: https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus-test/upstatus.user.js

### P0 — workflow oficial Team Lite ainda pode publicar no slug Normal

O arquivo `.github/workflows/deploy-production.yml` em `team-lite-official` continua com `workflow_dispatch`, secrets do ambiente `production`, Supabase CLI `latest` e comando `supabase functions deploy upstatus`. O slug correto do Team Lite é `upstatus-team-lite`. Um dispatch com a ref Team Lite pode sobrescrever o runtime Normal.

#129 propõe substituir o workflow legado por um guard read-only; #128 exige reviewer humano allowlisted e aprovação no SHA exato. Ambos permanecem Draft/não integrados. A variável `UPSTATUS_RELEASE_REVIEWERS` precisa ser configurada pelo owner e a proteção do environment `production` não foi verificada. Nenhum workflow de deploy foi despachado.

### P1 — Realtime público e incompatibilidade de tópico

Consulta SELECT-only em produção encontrou 125 linhas em `realtime.messages`, todas `private=false`, todas no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 67 `user_status`
- 46 `db_change`
- 6 `remote_command`
- 6 `remote_result`

Os bundles instalados Normal v480 (3.4.7) e Team Lite v15 (3.4.30) assinam `upstatus-screen-share-live-3-1-1-beta10`, sem `private:true` ou `setAuth()`. O Normal executa diretamente `remote_command`; Team Lite verifica sessão local, mas não comprova identidade do emissor do broadcast. O TEST v281 também executa diretamente o comando público.

Os três triggers `upstatus_broadcast_*` em produção são SECURITY DEFINER, `search_path=public`, com EXECUTE efetivo para anon/authenticated. O trigger de mensagens transmite OLD/NEW completo. Os triggers ainda publicam no tópico legado, diferente do tópico dos clientes.

`realtime.messages`: RLS habilitado, zero policies, FORCE RLS desabilitado e grants SELECT/INSERT/UPDATE para anon/authenticated. A ausência de policies impede acesso por linha normal, mas os grants continuam amplos e devem ser revistos.

No laboratório, os três triggers usam `search_path=""`, EXECUTE não concedido a anon/authenticated e payload mínimo; porém continuam `private=false`, e o laboratório tem zero mensagens/partições. Não há prova de entrega trigger-to-Realtime nesse projeto. O hardening não chegou à produção.

Nenhuma exploração, broadcast forjado, chamada ou captura de tela foi executada. A configuração externa de public access não está exposta pelo conector; a conclusão é de desenho não autenticado, não de ataque reproduzido.

### P1 — upload assinado: progresso na #155, lacunas e paridade incompleta

#155 restaura as rotas `/api/chat/upload-url` e `/api/profile/avatar-upload-url`, limita avatar a 2 MiB e chat a 20 MiB, passa `ctx.name` ao handler e deriva o prefixo de propriedade do nome normalizado da sessão. O teste `signed-upload-parity.test.mjs` é estático/offline.

Limites ainda abertos:
- MIME/tamanho são declarados pelo cliente; não há inspeção de assinatura real dos bytes.
- Sem rate limit/quota específica para emissão de tickets.
- Ownership é derivado de nome de sessão, não de identificador imutável; renomeação/colisão semântica precisa ser validada.
- Buckets continuam públicos; o prefixo não torna os objetos privados nem impede leitura por quem conhece a URL.
- A correção #155 altera somente `src/server/index.template.ts` (Normal). Team Lite v15 continua com avatar legado de 20 MiB e aceita URL de qualquer objeto no bucket `profile-images` sem prefixo de ownership. O handler assinado implantado também usa 20 MiB para avatar em ambos os runtimes.
- `release.json` continua 3.4.7, igual ao Normal instalado; não há incremento de versão nesta candidata.

### P1 — autorização administrativa ainda baseada em nome nos runtimes atuais

A fonte implantada Normal v480, Team Lite v15 e o template QA ainda:
- atribui `implementation_admin` no primeiro setup quando o nome é Ricardo/Lohan/Guilherme e o papel persistido está vazio;
- autoriza `healthRoute` por lista de nomes;
- permite `/api/chat/clear` por nome Ricardo sem exigir papel administrativo persistido.

Consulta atual em produção: 5 usuários, 3 com papel admin, zero password_hash nulo/vazio, zero role nulo/vazio e zero contas nomeadas sem configuração. Portanto não há conta nomeada atualmente desconfigurada; o risco é de desenho/alteração futura e o health/chat-clear não respeitam revogação do papel.

#151 remove o fallback de primeiro setup, usa papel persistido em health e exige papel para limpar chat. É correção parcial, Draft, fora da cadeia #155 e ainda não exige `setupToken`. AUTH-03 completo continua ausente em produção.

### AUTH-03, RLS/grants/ACL e Storage

Produção:
- zero colunas `setup_token_*`, zero tabelas de rate limit e zero RPCs de consumo de convite/rate limit;
- 10 tabelas public com RLS e zero policies; 9 têm grants diretos amplos para anon/authenticated, inclusive TRUNCATE (18 privilégios TRUNCATE somados);
- Default ACLs amplas para anon/authenticated em public, storage, graphql e graphql_public;
- buckets `chat-images` e `profile-images` públicos, limite de 20 MiB cada, 168 + 20 objetos, zero policies próprias em `storage.objects`.

Laboratório:
- quatro colunas `setup_token_*`, tabelas `upstatus_setup_invite_rate_limits` e `upstatus_signal_rate_limits`;
- cinco RPCs relevantes SECURITY INVOKER, `search_path=""`, EXECUTE somente service_role;
- 18 tabelas public com RLS e zero policies, sem grants diretos equivalentes para anon/authenticated;
- zero buckets/objetos Storage;
- 39 migrations, contra 7 em produção.

### P1 — proveniência de migrations parcial, não original

#135 recupera o texto de quatro statements armazenados em `supabase_migrations.schema_migrations.statements`. A própria PR declara que não recupera arquivos originais byte a byte, comentários, formatação, rollback ou commit/blob original. Os arquivos ficam em `docs/migration-recovery/`, fora de `supabase/migrations/`, e não devem ser aplicados. O branch Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview esteja ACTIVE_HEALTHY. MIGRATION-PROVENANCE permanece bloqueado.

### Voz — HTTP 409/500 não comprovado por HTTP real

A Edge Function isolada `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`; o fallback previsto é 500. A divergência foi confirmada por inspeção da fonte implantada. Nenhuma requisição HTTP real foi executada.

## Issues e aceitação física

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78) continua aberta com 0/8 critérios físicos aprovados. Sem confirmação de queda real de rede/reconexão sem F5, permissões reais de microfone/tela ou interoperabilidade instalada Normal ↔ Team Lite.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79) recebeu atualização no comentário QA existente. O comentário da Engenharia foi preservado. O JSON de Control Center contém sete gates e atividades desta execução.

## Classificação final

- **CI PASS:** #74 Validate + Smoke; #75 histórico; #76 110/110; #155 push + pull_request; candidatas #145/#146/#149/#151 nos respectivos PR runs.
- **CI FAIL:** #82 (updateURL mismatch); #135 (falha herdada do mesmo validator).
- **Inspeção de código/SQL:** runtime TEST em produção, bundles públicos, triggers/grants, Storage, AUTH-03, upload e workflow Team Lite.
- **Teste manual/físico:** não executado.
- **Pendente:** oito critérios físicos e revisão/aprovação humana.
- **Bloqueado:** RT-01, TEST-ISOLATION, MIGRATION-PROVENANCE, AUTH-03 e ACL-STORAGE.

## Veredito

**NOT READY.** Não integrar/publicar #155 ainda; revisar ownership por identidade estável, validação de bytes, rate limit/quota e paridade Team Lite. Prioridades P0: retirar o runtime TEST da infraestrutura de produção por meio de plano autorizado e corrigir/desativar o dispatcher Team Lite antes de qualquer dispatch. Em paralelo, migrar Realtime para transporte autenticado como padrão, corrigir grants/ACL/Storage, completar AUTH-03 e recuperar proveniência original das migrations.

Nenhuma alteração de produção, deploy, migration, merge, release ou publicação ocorreu nesta auditoria.
