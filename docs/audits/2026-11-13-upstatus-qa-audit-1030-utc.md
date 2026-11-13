# Auditoria independente de qualidade — UpStatus

**Data:** 2026-11-13 10:30 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção:** Supabase `dlfvkawaiqduhlazsszm`  
**Laboratório isolado:** Supabase `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## 1. Escopo e método

Revalidação read-only de heads, PRs #74/#75/#76/#82 e candidatas relacionadas #158/#159/#161, issues #78/#79, workflows, arquivos de build, templates Normal/Team Lite, Edge Functions implantadas, inventário de migrations, advisors, RLS, grants, Default ACL, SECURITY DEFINER, Realtime e Storage.

O blob de `docs/RELEASE_READINESS.md` foi lido integralmente: SHA `7cfbd70886df42ce790c078c224b19284a632595`, 1.045.105 bytes e 8.410 linhas. O último checkpoint técnico interno permanece em 2026-11-08 18:30 UTC; o arquivo não contém a revalidação desta data e foi preservado.

**Classificação:** CI = workflow existente no SHA indicado; inspeção = leitura estática ou catálogo; manual pendente = navegador Tampermonkey, dispositivo, permissões reais ou confirmação humana; bloqueado = dependência não resolvida. Nenhum workflow foi iniciado ou repetido pela QA. Nenhum teste manual foi executado. Todas as consultas SQL desta auditoria foram SELECT-only.

## 2. Heads e integridade da QA

| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `2c52ddd85f514567563a64a5550e5e1e2bb91b1d` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| PR #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |
| PR #82 / head da QA | `2c52ddd85f514567563a64a5550e5e1e2bb91b1d` |
| PR #158 | `2577519…` |
| PR #159 | `0bf5a9b76156dea69380468197f19d6ee4bcffc3` |
| PR #161 | `a1d8dc8409ae894a5fb02acd2014749b7281868f` |

A QA está **276 commits à frente e 1 atrás** de master; a comparação lista 134 arquivos divergentes, todos em `docs/`. O único commit master-only é documental. Não fiz rebase nem incorporei master automaticamente.

`team-lite-official` está **220 commits à frente e 147 atrás** de master; a divergência inclui workflows, scripts, release manifest e arquivos de produto. Não é seguro tratar as duas linhas como intercambiáveis.

As branches master e team-lite-official retornaram `protected=false`. Não encontrei reviews humanas registradas nas PRs #74, #75, #76, #82 e #161. As candidatas continuam abertas/Draft.

## 3. CI observado

| PR / execução | Resultado | Limite |
|---|---|---|
| #74 Validate [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | **PASS** | Validate no HEAD candidato #74 |
| #74 Smoke [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | **PASS**, 19/19 não autenticados e 136/136 autenticados | Chromium/WebRTC e integração no laboratório; não é aceitação física Tampermonkey |
| #75 Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | **PASS histórico** | Baseline anterior, superado pela #76 |
| #76 Candidate Checks [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | **PASS**, 16/16 não autenticados e 110/110 autenticados | Candidata Team Lite no laboratório |
| #82 Validate [43403571410](https://github.com/Reekyi/UpStatus/actions/runs/43403571410) | **FAIL** | `VALIDATION FAILED: production updateURL mismatch` |
| #161 Signaling Smoke [43407101808](https://github.com/Reekyi/UpStatus/actions/runs/43407101808) | **PASS** | Validate completo, integração autenticada e browser E2E no projeto isolado |

### PR #161 — avanço relevante

A #161 é uma candidata consolidada sobre o HEAD da #74, 10 commits à frente e 0 atrás da base. Continua Draft e sem review humana.

O run exato #43407101808 terminou SUCCESS. Os logs confirmam:

- Validate completo do build Normal e TEST.
- 19/19 verificações não autenticadas.
- 136/136 verificações autenticadas.
- Chromium headless: WebRTC de chamada e voz com entrega de áudio remoto; compartilhamento de tela com vídeo remoto; teardown de peers e mídia.
- Mesh autenticado de três participantes, com os três links e teardown.
- Concorrência de sinalização, recibos atômicos de chat e limpeza de fixtures.
- Enrollment de primeiro acesso: tokens malformado, incorreto, expirado e replay negados; concorrência com um único vencedor; fallback de role seguro e preservação de role explícita.
- Rate limit distribuído de convites, isolamento de buckets e cleanup.

O laboratório foi usado pelo CI existente, não por um teste iniciado pela QA. Após o run, consultas read-only encontraram zero linhas nas tabelas de salas, memberships, eventos, tentativas de chamada/voz e buckets de rate limit; o próprio log também confirma cleanup.

### O que a #161 corrige

Na #74, `PROD_FUNCTION="upstatus"` e o workflow publicam `upstatus`, mas o `CLOUD_SERVER` Normal ainda apontava para `upstatus-screen-share-3-1-1-beta10`. O Validate anterior não exigia igualdade entre API e função publicada.

A #161 deriva `CLOUD_SERVER`, `updateURL` e `downloadURL` da mesma configuração e adiciona assertions para exigir que o cliente e o workflow usem o mesmo slug, além de rejeitar beta10 no artefato Normal. **Isso resolve a divergência de destino na candidata #161; não está instalado em produção.**

A #161 também preserva o enrollment por `setupToken` e incorpora o rate limit distribuído da #160. Isso evita a regressão de primeiro acesso observada na #159.

### Rate limit de convites da #161

A migration candidata `20261109230000_setup_invite_rate_limit.sql` cria a tabela de contadores e a RPC com:

- `SECURITY INVOKER` e `search_path = ''`;
- RLS habilitado;
- tabela e RPC sem privilégios para PUBLIC/anon/authenticated;
- acesso concedido somente a `service_role`;
- cinco emissões por administrador a cada 900 segundos;
- resposta 429 no limite e 503 fail-closed se a RPC falhar, antes de ler o corpo do pedido;
- limpeza oportunista limitada a 100 buckets antigos por execução.

O teste concorrente usa o guard de projeto isolado e valida exatamente cinco permissões entre 24 requests concorrentes, isolamento de buckets, reset de janela e cleanup. A migration de produção continua **somente na candidata**; não foi aplicada em produção.

### #82 e #159

A #82 continua falhando no HEAD QA atual, no assertion de `production updateURL mismatch`. A falha foi observada no run #43403571410; não executei rerun.

A #159 passou seus workflows offline, mas removia a exigência de convite no setup. Não recomendo integrá-la isoladamente. A #161 é a candidata mais coerente para a linha Normal, mas ainda precisa de review e incremento de versão.

## 4. Versão e publicação

A #161 mantém `release.json.version = 3.4.7`, igual ao Normal instalado. O workflow de produção herdado da #74 também contém um guard que só permite a versão estável 3.4.7. Portanto, embora o destino da API esteja alinhado, **a candidata ainda não pode entregar uma atualização efetiva ao usuário sem incremento de versão e ajuste do guard**.

O workflow Normal é manual-only, exige master, SHA exato, projeto esperado e CLI 2.122.1; publica `upstatus`. Isso é mais seguro que o workflow Team Lite atual.

### Team Lite

O workflow de produção em `team-lite-official` ainda executa:

`supabase functions deploy upstatus`

O slug correto é `upstatus-team-lite`. O workflow usa CLI `latest`, não exige SHA exato nem valida o projeto esperado. **Não despachar.**

O workflow TEST oficial ainda aceita push em `develop`, usa o secret compartilhado `SUPABASE_PROJECT_ID` e CLI `latest`. A versão candidata #76/#161 do workflow TEST é manual-only, usa `vars.SUPABASE_TEST_PROJECT_ID`, rejeita produção e o laboratório de sinalização, valida o formato do project ref e fixa CLI 2.122.1. Essa proteção só existe na candidata; a branch oficial não foi atualizada.

A release Team Lite candidata indica buildVersion 3.4.31, enquanto o runtime instalado é 3.4.30. O avanço de versão não torna o workflow de produção seguro.

## 5. Runtime efetivamente instalado

As fontes das Edge Functions foram lidas e os userscripts embutidos em base64 foram decodificados.

| Produto | Edge Function | Versão userscript | Namespace | API |
|---|---|---:|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` | beta10 |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` | `upstatus-team-lite` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` | beta10 |

Normal e TEST compartilham `@name`, namespace `upseller`, chave GM `upstatus_screen_share_beta8_`, projeto Supabase e tópico Realtime. O `@updateURL` do TEST aponta para `upstatus-test`, mas seu `CLOUD_SERVER` aponta para beta10 de produção.

Team Lite tem namespace e API próprios, mas ainda assina o mesmo tópico Realtime beta10.

Os três userscripts instalados não contêm `private:true` nem `realtime.setAuth()`. Normal e TEST executam diretamente `remote_command` quando o target corresponde ao membro local. Team Lite verifica a própria sessão e geração de autenticação antes de executar, mas não autentica independentemente o emissor. Os eventos de voz/tela continuam no transporte broadcast legado.

Produção tem 38 Edge Functions ACTIVE e todas reportam `verify_jwt=false`. Isso não é, isoladamente, prova de falha: o produto usa token customizado. Porém, cada rota precisa aplicar autorização própria; o setup público abaixo é um exemplo de caminho que não está protegido.

Há 12 funções com prefixo `upstatus-test` ACTIVE em produção, incluindo backups e versões antigas. Não existe projeto Supabase full-product TEST: a organização consultada tem produção e o laboratório `upstatus-security-test`, que contém apenas infraestrutura de sinalização/auth, sem buckets e objetos de Storage de produto.

A build #161 rejeita tanto o project ref de produção quanto o laboratório de sinalização e usa sentinel inerte quando não há `UPSTATUS_TEST_PROJECT_ID`. O workflow TEST exige terceiro projeto. Essa é a proteção correta para builds futuros, mas não remove o runtime v281 já instalado.

## 6. Realtime e signaling

Snapshot read-only de `realtime.messages` em produção:

| Evento | private=false |
|---|---:|
| `user_status` | 67 |
| `db_change` | 46 |
| `remote_command` | 6 |
| `remote_result` | 6 |
| **Total** | **125** |

As três funções de broadcast publicam no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`; os clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. O tópico dos triggers não coincide com o tópico dos clientes.

`upstatus_broadcast_messages` transmite a linha OLD/NEW completa. `upstatus_broadcast_remote_state` transmite campos de comando/resultado. `upstatus_broadcast_users` transmite estado limitado do usuário. Todas usam `realtime.send(..., false)`.

Não há `upstatus-signal` em produção. O laboratório tem `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. A função v32 não contém o código `VOICE_ATTEMPT_ALREADY_ACTIVE` no mapeamento HTTP 409; mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`, mas não o código esperado pelo helper candidato.

O setting Dashboard de acesso público do Realtime não está disponível na inspeção conectada. Não foi reproduzido acesso externo nem ataque. O que está confirmado é um caminho de transporte sem identidade autenticada do emissor no código instalado, mais o snapshot persistido `private=false`. Os clientes candidatos tornam `remote_command` wake-up-only, mas a flag de transporte server-mediated continua desligada por padrão; voz e tela ainda podem cair no caminho público. **RT-01 permanece bloqueado.**

## 7. Supabase: RLS, grants, SECURITY DEFINER e Storage

### Produção

- Projeto `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.
- 10 tabelas public com RLS habilitado e zero policies.
- Nove dessas tabelas concedem a anon e authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER.
- 18 grants TRUNCATE no total, nove para cada papel cliente.
- RLS sem policies nega DML por linha, mas RLS não protege TRUNCATE. Não tentei executar TRUNCATE.
- `realtime.messages` tem RLS, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.
- `storage.objects` não possui policies próprias.

Três funções `upstatus_broadcast_*` são SECURITY DEFINER, owner postgres, `search_path=public`, EXECUTE para anon/authenticated/service_role e retornam tipo `trigger`. Por retornarem trigger, não há evidência de invocação direta como RPC PostgREST comum; os grants continuam desnecessários e o risco principal observado é o payload Realtime público.

Default ACLs: 120 entradas de privilégios para papéis clientes, distribuídas entre defaults de postgres em public/storage e supabase_admin em public/graphql/graphql_public.

Storage: `chat-images` público, 168 objetos; `profile-images` público, 20 objetos. Ambos têm limite de 20 MiB e zero policies próprias. O acesso por URL pública não demonstra isolamento por usuário. A decisão de tornar buckets privados e a compatibilidade dos limites continuam pendentes.

### Laboratório

- Projeto `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003.
- 39 migrations.
- 18 tabelas public com RLS e zero policies.
- Zero mensagens Realtime no snapshot.
- Zero objetos/buckets Storage de produto.
- 96 entradas Default ACL amplas: postgres em storage e supabase_admin em public/graphql/graphql_public. Os defaults de postgres em public estão mais restritos que em produção.
- Advisor: 0 WARN e 18 INFO; os INFO incluem RLS habilitado sem policy.

## 8. AUTH-03, sessões e autorização de chat

Produção não possui colunas `setup_token_*`, RPC `consume_upstatus_setup_invite`, tabela `upstatus_setup_invite_rate_limits` ou RPC de rate limit. O laboratório tem quatro colunas de setup token, RPC de consumo e tabela/RPC de rate limit.

Os runtimes Normal e Team Lite instalados ainda permitem `POST /api/setup` para conta sem senha sem exigir token de uso único. O fallback de role por nome pode promover Ricardo, Lohan ou Guilherme a `implementation_admin` se a role estiver vazia. O snapshot atual tem cinco usuários, nenhum password hash vazio, nenhuma role vazia e nenhum nome duplicado; isso não elimina o caminho inseguro para futuras contas.

A rota instalada `/api/chat/clear` no Normal e Team Lite autoriza apenas por `name === "Ricardo"`. A candidata #161 exige Ricardo **e** `implementation_admin`. É uma melhoria estática, ainda não implantada.

A tabela `users` tem somente a PK `id`; não há constraint UNIQUE para `name`. `upstatus_sessions` e `upstatus_profiles` continuam identificados por `user_name`, não `user_id`. O snapshot registrou 158 sessões ativas e 161 expiradas. A #161 ainda cria sessões por nome; a identidade imutável por ID permanece pendente.

## 9. Migrations e proveniência

Produção registra sete migrations no ledger, mas `master/supabase/migrations` contém apenas três arquivos. A PR #135 arquiva quatro statements recuperados do ledger em `docs/migration-recovery/`; seu README e manifest declaram explicitamente que são statements executados, não recuperação byte a byte dos arquivos originais, comentários, formatação ou commit/blob original. Os arquivos não estão em `supabase/migrations/` e a PR #135 permanece Draft.

A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`. A causa ainda não foi identificada.

O novo rate-limit de setup-invite da #161 também está somente na candidata. Produção continua sem AUTH-03. **MIGRATION-PROVENANCE e AUTH-03 permanecem bloqueados.**

## 10. Issues e aceitação manual

- Issue #78 está OPEN, 0/8 critérios físicos marcados. O contexto original registra falha de reentrada em sala após queda/retorno de internet sem F5. Nenhuma aceitação física nova foi apresentada.
- Issue #79 permanece OPEN; o checklist no corpo registra 16 itens marcados e 19 pendentes.
- O comentário de Engenharia #79 informou que #161 estava em execução; o run #43407101808 agora está concluído SUCCESS.
- Não houve teste Tampermonkey instalado, perda real de rede, microfone físico, permissão real de captura de tela ou interoperabilidade Normal ↔ Team Lite nesta auditoria.

## 11. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | **BLOCKED** | Clientes instalados sem Realtime privado/auth; endpoint server-mediated ausente em produção |
| TEST-ISOLATION | **BLOCKED** | Runtime TEST v281 usa API de produção; terceiro projeto full-product não existe |
| MIGRATION-PROVENANCE | **BLOCKED** | Quatro statements recuperados não provam arquivo original byte a byte e seguem fora de migrations |
| AUTH-03 | **BLOCKED** | Setup token e rate limit só existem no laboratório/candidatas |
| ACL-STORAGE | **BLOCKED** | Grants, Default ACL, SECURITY DEFINER e buckets públicos sem policy continuam |
| RECONNECT | **PENDING** | 0/8 critérios físicos; depende de teste manual |
| HUMAN-REVIEW | **PENDING** | PRs Draft, sem review e sem autorização explícita de release |

## 12. Próximas prioridades

1. Fazer review independente da #161; manter Draft até review e versionamento. Ela é a melhor consolidação Normal atual, mas não deve ser integrada sem incremento de versão e revisão do workflow.
2. Provisionar terceiro projeto full-product TEST somente após autorização de Ricardo; depois substituir o runtime v281 por procedimento de cutover aprovado.
3. Implementar endpoint server-mediated de sinalização em produção, validar token/membership/destinatário/replay/expiry/rate-limit, tornar o transporte autenticado default e remover listeners públicos sensíveis.
4. Corrigir workflow Team Lite para `upstatus-team-lite`, CLI pinada, SHA/projeto esperado e preflight; proteger branches.
5. Aplicar AUTH-03 somente após revisão e autorização explícita; vincular sessões/perfis a `users.id` e definir unicidade de nome.
6. Corrigir grants, Default ACL, policies RLS, SECURITY DEFINER e Storage com owner autorizado; decidir buckets privados e alinhar limites.
7. Recuperar proveniência original das quatro migrations e diagnosticar `MIGRATIONS_FAILED`.
8. Corrigir o contrato HTTP 409 de `VOICE_ATTEMPT_ALREADY_ACTIVE` e validar contra a função real.
9. Executar os oito critérios físicos da #78 em Normal e Team Lite.
10. Obter aprovação humana do SHA final antes de qualquer release.

## 13. Integridade e operações

Nenhuma alteração em produção. Nenhum merge, deploy, migration, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou operação destrutiva. Todas as consultas SQL foram SELECT-only. A única escrita desta execução é este relatório novo na branch QA e a atualização do comentário QA existente na Issue #79. O comentário da Engenharia foi preservado.
