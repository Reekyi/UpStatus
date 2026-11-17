# Auditoria independente de QA do UpStatus — 2026-11-09 23:32 UTC

## Escopo e método

Revalidação read-only de GitHub e Supabase para UpStatus integrado ao Sale Smartly. Foram consultados heads e diffs das PRs #74, #75, #76, #82 e #130; issues #78 e #79; workflows e logs nos SHAs atuais; runtimes Edge Functions implantados; inventário de migrations; tabelas, policies, grants, Default ACLs, funções SECURITY DEFINER, triggers, Realtime, Storage e Security Advisor.

O documento `docs/RELEASE_READINESS.md` foi lido integralmente a partir do conteúdo bruto do GitHub na branch QA. Blob: `7cfbd70886df42ce790c078c224b19284a632595`, aproximadamente 1,05 milhão de caracteres. O último checkpoint dentro do documento é de 2026-11-08 18:30 UTC; o documento principal está desatualizado em relação aos eventos de 09/11. Ele foi preservado, sem edição.

Classificação:
- **CI PASS/FAIL:** workflow concluído no SHA exato indicado.
- **Inspeção de código:** leitura estática de fonte, diff ou runtime implantado; não equivale a teste de execução.
- **Manual pendente:** exige navegador/dispositivo real e aceitação humana.
- **Bloqueado:** dependência não satisfeita ou risco confirmado.
- **Sem evidência:** nenhuma execução/check foi encontrada para o SHA.

Nenhum workflow foi iniciado ou repetido pela auditoria. Nenhuma migration, SQL write, deploy, merge, release, alteração de secrets/flags/roles/policies/grants/ACLs ou publicação de userscript foi realizada.

## Heads reais e PRs

- QA `qa/release-readiness-2026-11-04-master`: `27564ccab2916e0a888dcf92e04de71e7b458f9c`.
- `master`: `9d40461babcec8eb8686c2a04be9c675df7da381`.
- `team-lite-official`: `9065bc1536fde64f437f6f12b7abb9b072cb8281`.
- QA está 173 commits à frente e 1 atrás de master; merge-base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Não houve rebase.

| PR | HEAD | Base | Estado | Evidência |
|---|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `5939b57027748eb9af08327d2a8c712fd5046484` | master | Draft, aberta, não mergeada | Validate [42689757655](https://github.com/Reekyi/UpStatus/actions/runs/42689757655) PASS; Signaling Smoke [42689757169](https://github.com/Reekyi/UpStatus/actions/runs/42689757169) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | Draft, aberta, não mergeada | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| [#76 Team Lite candidata](https://github.com/Reekyi/UpStatus/pull/76) | `86736e3eb70ecb7dd9dce498c03f58e65cee06c3` | team-lite-official | Draft, aberta, não mergeada | Candidate Checks [42698289332](https://github.com/Reekyi/UpStatus/actions/runs/42698289332) PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `27564ccab2916e0a888dcf92e04de71e7b458f9c` | master | Draft, aberta, não mergeada | Validate [42712721171](https://github.com/Reekyi/UpStatus/actions/runs/42712721171) FAIL |
| [#130 AUTH-03](https://github.com/Reekyi/UpStatus/pull/130) | `606aaff264c081bb19e974c23a48b71ece27cec1` | chore/continuity-foundation (HEAD da #74) | Draft, aberta, não mergeada | Nenhum combined status ou run PR-triggered associado ao SHA foi retornado |

### CI dos candidatos

**Normal #74**
- Validate e Signaling Smoke concluíram SUCCESS no HEAD indicado.
- O Smoke confirma 136/136 verificações autenticadas; negociação WebRTC e entrega de áudio de chamada, áudio de sala e vídeo de tela; mesh de três participantes; teardown; concorrência de voz; rate limit distribuído (90 aceitos e 1 HTTP 429); recibos de leitura atômicos; consumo concorrente de convite de primeiro acesso e limpeza das fixtures.
- O Validate passou pelos guards de build TEST, layout de migrations, setup enrollment, regressões de chat e testes VM de signed upload. Os testes de upload são mocks/VM, não upload de bytes reais em Storage.

**Team Lite #76**
- Candidate Checks concluiu SUCCESS no HEAD indicado.
- O log confirma 110/110 verificações autenticadas; WebRTC de chamada/voz/tela com tracks remotos; mesh de três participantes; teardown; rate limit; recibos atômicos; setup invite isolado; recuperação lógica de sala e testes de logout/leave.
- O commit `86736e3` sincronizou o bundle com a fonte compartilhada para tratar `VOICE_ATTEMPT_ALREADY_ACTIVE` e `VOICE_ATTEMPT_CONFLICT`. A correção foi validada no candidato, não implantada em produção.

**#75** é baseline histórica e não substitui a candidata #76.

**#82 QA** falhou no SHA exato `27564cc` em `scripts/validate.mjs:26`, com `production updateURL mismatch`. Não foi alterado o validator nem iniciado rerun.

### PR #130 — rate limit de emissão de convites

Inspeção estática do diff e dos arquivos do HEAD `606aaff`:
- `issueSetupInvite` verifica o papel armazenado do administrador e chama `consume_upstatus_setup_invite_rate_limit` antes de ler os dados do alvo.
- Limite candidato: cinco emissões por administrador em quinze minutos. A chave usa SHA-256 do nome do administrador.
- Erro do RPC falha fechado com HTTP 503; limite excedido retorna HTTP 429.
- A migration candidata cria tabela com RLS, revoga privilégios de PUBLIC/anon/authenticated, concede acesso apenas a service_role e cria RPC `SECURITY INVOKER` com `search_path = ''` e EXECUTE apenas para service_role.
- O script de integração pretende testar 24 chamadas concorrentes, com cinco permitidas e 19 negadas, e depois reset da janela. O script contém guard de mutação para o projeto isolado e cleanup do bucket de teste.
- A migration e o teste correspondente ainda não foram aplicados no laboratório ou em produção.
- A PR cobre somente o template Normal; não inclui Team Lite.
- O workflow alterado tem `pull_request.branches: master`, mas a PR é baseada em `chore/continuity-foundation`; esse filtro não casa com a base atual. Existe trigger push específico para a branch da PR, mas nenhum check/status de conclusão no SHA foi encontrado nas consultas disponíveis. O checkpoint da Engenharia relata testes estáticos de rota aprovados, mas o teste concorrente real ainda aguarda janela segura no laboratório.
- A PR permanece Draft e sem review humana.

Conclusão: avanço parcial em AUTH-03, não correção completa nem CI aprovado. Não aplicar a migration antes de revisão e janela de teste autorizada.

## Supabase — fotografia read-only

### Projetos e migrations

A organização possui somente dois projetos:
- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003.

Produção:
- 7 migrations remotas: `20261005160000`, `20261005173000`, `20261005180000`, `20261023154754`, `20261026195855`, `20261027154329`, `20261027155438`.
- Branch gerenciada `main` permanece `MIGRATIONS_FAILED`.
- Os quatro arquivos originais abaixo retornaram 404 em `master`:
  1. `20261023154754_create_upstatus_visual_config.sql`
  2. `20261026195855_add_chat_message_file_name.sql`
  3. `20261027154329_allow_chat_document_mime_types.sql`
  4. `20261027155438_set_upstatus_upload_limits_20mb.sql`
- Não foram reconstruídos a partir do schema atual.

Laboratório:
- 38 migrations e duas Edge Functions de teste.
- Zero grants diretos de tabela para anon/authenticated nas tabelas public consultadas; zero tabelas públicas com TRUNCATE para papéis clientes.
- Zero usuários, mensagens, sessões, salas, memberships, eventos de sinalização, objetos Storage e mensagens Realtime nas consultas desta rodada.
- As quatro colunas de setup-invite e RPC `consume_upstatus_setup_invite` existem; a nova tabela/RPC de rate limit da #130 ainda não existe.
- É laboratório de segurança/sinalização, não ambiente full-product TEST independente.

### Edge Functions e AUTH-03

Produção tem 38/38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Esse atributo sozinho não prova falta de autenticação. Foram inspecionados os três runtimes operacionais principais:
- Normal `upstatus` v480, SHA `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd`; userscript embutido 3.4.7.
- API Normal `upstatus-screen-share-3-1-1-beta10` v6, SHA `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29`.
- Team Lite `upstatus-team-lite` v15, SHA `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb`; userscript embutido 3.4.30.

Nos runtimes implantados Normal e Team Lite:
- `POST /api/setup` continua roteando para `login(req,true)`, sem token de convite.
- RPC `consume_upstatus_setup_invite`, colunas de setup-token e a nova RPC de rate limit não existem em produção.
- Não há rate limit de emissão de convite implantado.
- O fallback nominal de administrador do fluxo legado permanece.

Os dois userscripts embutidos foram decodificados:
- Ambos assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Ambos não usam `private:true` nem `realtime.setAuth()`.
- Ambos mantêm handlers para eventos de chamada, voz, tela e comando remoto.

### Realtime e SECURITY DEFINER

SELECT-only encontrou 48 mensagens em `realtime.messages`, todas `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.

O tópico dos triggers não coincide com o tópico assinado pelos clientes instalados (`upstatus-screen-share-live-3-1-1-beta10`). Não foi feita reprodução em navegador nem publicação externa de eventos.

`realtime.messages`:
- RLS habilitado, zero policies.
- anon e authenticated têm SELECT, INSERT e UPDATE efetivos.

Triggers e funções:
- `upstatus_broadcast_messages` envia `to_jsonb(OLD/NEW)` completo em `db_change`, com `private=false`.
- `upstatus_broadcast_remote_state` emite campos de comando/resultado.
- `upstatus_broadcast_users` emite estado do usuário.
- As três funções são `SECURITY DEFINER`, `search_path=public`, retornam `trigger`, estão anexadas a triggers e têm EXECUTE efetivo para anon/authenticated.
- O Advisor reporta 6 WARN e 10 INFO. Como as funções retornam `trigger`, não foi demonstrada invocação direta como RPC comum; o problema concreto confirmado é o broadcast público e o payload.

### RLS, grants, Default ACLs e Storage

Produção:
- 10 tabelas public com RLS e zero policies.
- 9 tabelas public com grants diretos para anon/authenticated, incluindo TRUNCATE; `upstatus_visual_config` não apareceu com esses grants diretos.
- Default ACLs amplas para objetos futuros: 24 entradas por owner no schema public para postgres e 24 para supabase_admin; também há defaults amplos em storage e nos schemas GraphQL.
- `storage.objects`: zero policies; anon e authenticated têm SELECT, INSERT, UPDATE e DELETE efetivos.
- Buckets `chat-images` e `profile-images` são públicos, 20 MiB cada.

Upload:
- `signedUploadRoute` valida MIME/tamanho/nome declarados, cria URL assinada e retorna URL pública sem receber/inspecionar os bytes.
- O helper legado `sniffMime` retorna o MIME declarado quando não reconhece a assinatura.
- Não houve upload real nem validação de bytes em Storage.

## Issues e revisão humana

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) permanece aberta, com 0/8 critérios físicos marcados. Não houve teste Tampermonkey, queda real de internet, recuperação sem F5, permissões reais de microfone/tela ou interoperabilidade instalada.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) continua com corpo desatualizado: 16/35 itens marcados e 19 pendentes. O comentário dedicado QA foi atualizado separadamente; o comentário da Engenharia foi preservado.
- Não foram encontradas reviews humanas submetidas em #74, #75, #76, #82 ou #130. Todas permanecem Draft.

## Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Broadcast público, sem identidade do remetente verificada, tópico divergente e transporte autenticado não ativo nos runtimes implantados. |
| TEST-ISOLATION | in_progress | Laboratório isolado e limpo; falta ambiente full-product TEST independente. |
| MIGRATION-PROVENANCE | blocked | Quatro fontes SQL originais ausentes em master; branch Supabase main MIGRATIONS_FAILED. |
| AUTH-03 | blocked | PR #130 é apenas candidato Normal, sem CI/concor­rência confirmados; Team Lite e produção continuam sem rate limit de convite. |
| ACL-STORAGE | blocked | Grants, Default ACLs e Storage continuam excessivos/públicos. |
| RECONNECT | pending | Issue #78 continua 0/8 e exige teste físico sem F5. |
| HUMAN-REVIEW | pending | Nenhuma review humana ou autorização explícita de release. |

## Próximos passos

1. Completar CI exato e teste concorrente isolado da #130; portar a proteção equivalente ao Team Lite.
2. Recuperar os quatro SQLs originais de backup/artefatos revisados; não reconstruir migrations pelo schema.
3. Corrigir AUTH-03 nos dois produtos e coordenar as migrations somente após revisão/autorização.
4. Migrar sinalização para transporte autenticado server-mediated ou Realtime privado com JWT/policies adequados; remover listeners públicos sensíveis e alinhar o tópico.
5. Restringir grants/Default ACLs e definir política de Storage; validar upload com bytes reais em quarentena privada.
6. Provisionar ambiente full-product TEST independente.
7. Executar os oito critérios físicos da #78 em Normal e Team Lite.
8. Obter reviews humanas e autorização explícita antes de qualquer merge, deploy ou publicação.

**Veredito: NÃO LIBERAR (`not_ready`).** O CI dos candidatos #74 e #76 é positivo, e #130 é avanço parcial. Segurança de produção, migrations, ambiente TEST completo, reconexão física e revisão humana permanecem pendentes/bloqueados.

Todas as consultas SQL desta execução foram SELECT-only. Nenhuma migration, SQL write, deploy, merge, release, alteração de secret/flag/role/grant/policy/ACL ou fixture foi realizada. A única escrita é este novo relatório na branch QA e a atualização do comentário QA existente na Issue #79.
