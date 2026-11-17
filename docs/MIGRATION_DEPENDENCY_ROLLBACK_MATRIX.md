# Matriz de dependências, cobertura e rollback das migrations — 2026-11-17

## Escopo e fontes verificadas

Esta matriz foi montada por leitura dos 22 arquivos em `supabase/migrations/` da cabeça atual da PR #74 (`refs/pull/74/head`), dos 14 arquivos em `supabase/test-migrations/`, do `supabase/test-migrations/README.md`, de `scripts/migration-layout.test.mjs` e do ledger de migrations do projeto Supabase de produção.

Estado consultado nesta rodada:

- Produção `dlfvkawaiqduhlazsszm`: `ACTIVE_HEALTHY`.
- Branch gerenciada `main`: `MIGRATIONS_FAILED`; o conector não fornece a mensagem detalhada da falha.
- Laboratório `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`): `INACTIVE`.
- Ledger de produção: sete versões, a mais recente `20261027155438`.
- PR #74: as 22 migrations abaixo são candidatas; nenhuma delas aparece no ledger de produção consultado.
- PR #176: recupera quatro arquivos SQL de versões que **já aparecem no ledger de produção**. São recuperação do texto executado, não novas migrations para aplicar.

Todas as consultas desta rodada foram somente leitura. Nenhum SQL foi executado, nenhum projeto foi restaurado, nenhuma migration foi aplicada e nenhuma função/configuração foi alterada.

## 1. Histórico aplicado versus migrations candidatas

### Quatro arquivos recuperados do ledger pela PR #176

| Versão | Efeito já registrado em produção | Risco de rollback |
|---|---|---|
| `20261023154754` | Cria `public.upstatus_visual_config`, habilita RLS, revoga acesso de cliente e insere a linha `published` | Dropar a tabela elimina configuração publicada e histórico de versão. Não há rollback seguro sem exportar os dados e definir destino. |
| `20261026195855` | Adiciona `public.messages.file_name` | Remover a coluna perde nomes de anexos já persistidos. |
| `20261027154329` | Atualiza a allowlist MIME do bucket `chat-images` | O SQL não registra a allowlist anterior. Restaurá-la exige uma fonte confiável do valor anterior e análise dos anexos já aceitos. |
| `20261027155438` | Define limite de 20 MiB em `chat-images` e `profile-images` | O limite anterior não está registrado no statement recuperado. Reduzir o limite pode tornar objetos existentes incompatíveis com novas regras de upload. |

A PR #176 recupera os statements armazenados em `supabase_migrations.schema_migrations`. O ledger registra `rollback = null` para essas quatro entradas. A recuperação não comprova que comentários, formatação ou bytes dos arquivos originais foram preservados. **Não reaplicar essas quatro versões em produção.** A aceitação da proveniência ainda depende de revisão e de comparação com eventual arquivo original externo.

As três versões anteriores do ledger são `20261005160000`, `20261005173000` e `20261005180000`. O conjunto de sete versões foi confirmado por consulta ao ledger, não inferido da árvore Git.

### As 22 migrations da PR #74

Todas as versões desta tabela são posteriores à última versão do ledger de produção e não constavam nele na consulta desta rodada. São candidatas ainda não aplicadas à produção.

| Versão / arquivo | Dependência principal | Efeito | Cobertura encontrada | Estratégia de rollback / cuidado |
|---|---|---|---|---|
| `20261029170500_restrict_trigger_function_execute` | Funções de trigger `upstatus_broadcast_*` já existentes | Revoga EXECUTE de PUBLIC/anon/authenticated nas três funções, preservando execução pelo trigger e backend autorizado | Teste de contrato indireto na test-migration de search_path; falta teste funcional de trigger | Não restaurar grants públicos como rollback. Se houver falha, corrigir em forward e preservar execução pelo trigger/service_role. |
| `20261029183000_revoke_unused_public_table_grants` | Nove tabelas existentes: chat, mensagens, reações, histórico, perfis, sessões, estado, typing e usuários | Revoga todos os privilégios de tabela de PUBLIC/anon/authenticated | **Sem test-migration dedicada** que verifique cada tabela e privilégio | Re-grant amplo reabre exposição. Antes de aplicar, provar que todos os consumidores usam a Edge Function/service_role; rollback só com matriz ACL anterior e justificativa por role/tabela. |
| `20261029205000_server_mediated_signaling` | `public.users` existente; nomes não nulos e únicos | Cria índice único de usuário, salas, membros, eventos, índices, RLS e grants service_role | Cobertura parcial por integração autenticada e testes posteriores de call/voice; falta teste isolado completo do contrato base | Não dropar tabelas após uso: isso elimina salas, membros e eventos. Desativar o caminho novo no cliente/backend e manter dados até expiração/arquivo; remoção futura exige plano próprio. |
| `20261030120000_signal_room_invitation_consent` | Tabela `upstatus_signal_room_members` da migration base | Adiciona status pending/accepted/declined, constraint e índice | Cobertura de convite na integração/browser; sem teste SQL dedicado para todos os estados e default | Remover a coluna apaga estado de consentimento. Não fazer rollback destrutivo enquanto houver convites/membros pendentes. |
| `20261030150000_signal_membership_legacy_default` | Coluna status da migration anterior | Reafirma default `accepted` para preservar inserts legados | Sem teste SQL dedicado | No arquivo atual, a migration anterior também declara default accepted; a alteração é aparentemente redundante. Manter a ordem histórica e confirmar o motivo no histórico do PR antes de consolidar um baseline. |
| `20261030190000_allow_legacy_signaling_envelopes` | Constraint `upstatus_signal_events_event_type_check` da migration base | Substitui a constraint para aceitar `call_signal`, `voice_room_signal` e `screen_signal` como envelopes | Testes de envelope/body no código; sem test-migration SQL específica da constraint | Restaurar a constraint antiga só depois de provar que não há eventos com os três tipos legados. Não apagar eventos para forçar rollback. |
| `20261030192000_signal_room_bindings` | Salas e usuários da migration base | Cria bindings de call/voice/screen, RLS e grants service_role | Cobertura indireta pelos fluxos de voz/chamada; sem test-migration dedicada para constraints, cascades e unicidade | Dropar bindings pode desconectar IDs lógicos das salas. Fazer cutover reverso de cliente/backend e preservar bindings até não haver salas ativas. |
| `20261103160000_minimize_public_chat_broadcast` | Função e trigger de mensagens existentes; cliente precisa tratar `db_change` como hint | Substitui função para enviar somente `op`, sem corpo de mensagem/anexo | Teste de search_path verifica catálogo e vínculo; não executa INSERT/UPDATE/DELETE real para provar o trigger | Reverter para corpo antigo pode reexpor mensagens e anexos no broadcast. Não usar rollback para payload completo; corrigir cliente/trigger por forward fix. |
| `20261103170000_minimize_public_status_broadcasts` | Funções/triggers de usuários e estado remoto; clientes devem refazer leitura autenticada | Substitui broadcasts de presença/comando/resultado por hints mínimos | Teste de search_path verifica catálogo; não comprova execução real de cada trigger nem ausência de regressão de atualização | Repor payloads antigos pode reexpor estado/comandos. Reversão funcional deve preservar payload mínimo e ajustar consumidores. |
| `20261103171000_index_signal_room_bindings_created_by` | Tabela de bindings | Adiciona índice na FK `created_by` | Sem teste SQL específico identificado | Índice pode ser recriado. Remover só após medição de uso/performance e confirmar que não prejudica cascades; sem perda direta de dados. |
| `20261105150000_revoke_public_default_privileges_postgres` | Executor/owner `postgres` | Revoga defaults de tabelas, funções e sequences para roles cliente e EXECUTE de PUBLIC em funções criadas por postgres | Dois test-migrations cobrem defaults postgres, inclusive escopo global de funções | Não reabrir defaults públicos. A migration não cobre owner `supabase_admin`; não ampliar membership nem executar como esse owner por improviso. Resolver por caminho administrativo suportado e teste separado. |
| `20261105160000_merge_chat_read_receipts` | Tabela `public.chat_reads` e chamada autenticada pelo backend | Cria RPC SECURITY INVOKER, search_path vazio, merge monotônico/deduplicado e EXECUTE service_role-only | Há test-migration que recria a função e ajusta grants; integração de receipts existe, mas o SQL de teste não é um verificador puro da migration | Repor a definição anterior requer snapshot exato. Não remover a função nem reduzir dados de receipts; corrigir em forward após comparar semântica e chamadas. |
| `20261105190000_open_voice_room_membership` | Rooms, members e bindings; aliases compartilhados Normal/Team Lite | Substitui RPCs de abrir/sair de sala e controla associação, capacidade, aliases e limpeza de membership/eventos | Cobertura de browser/API de voz parcial; sem test-migration dedicada para execução concorrente de todos os caminhos | Funções podem excluir membership/eventos ao sair. Antes de rollback, preservar definição anterior e fixtures; não apagar tabelas nem reabrir permissões. |
| `20261106080200_call_room_attempt_recovery` | Rooms, bindings, members e RPC de saída | Cria tabela de tentativas de chamada e RPCs prepare/cancel com tombstone e locks | Test-migration de call attempts + integração autenticada | Dropar tabela perde tombstones que impedem prepare atrasado. Primeiro bloquear novas tentativas, esperar TTL, exportar evidência e manter compatibilidade do cliente antigo. |
| `20261106111000_call_attempt_foreign_key_indexes` | Tabela de call attempts anterior | Adiciona índices em created_by, recipient e room_id | Test-migration verifica índices válidos e coluna líder | Remoção é tecnicamente possível, mas pode degradar cascades/lookup. Medir antes; sem rollback de dados. |
| `20261106120500_voice_room_attempt_recovery` | Rooms, members, bindings e RPC de abrir/sair da sala | Cria tabela de tentativas de voz e RPCs open/cancel duráveis | Test-migration de voice attempts + integração autenticada | Dropar tabela perde tentativas/tombstones e pode permitir reabertura atrasada. Preservar registros até expiração e validar cancel-before-open. |
| `20261107010000_setup_invites` | Tabela `public.users` e fluxo de primeiro acesso | Adiciona colunas de token hash/expiração/emissor e RPC atômica de consumo | Test-migration verifica colunas, índice, SECURITY INVOKER e grants; harness testa consumo/expiração | Dropar colunas perde convites pendentes e rastreio. Antes de remover, invalidar/consumir convites por processo aprovado e arquivar metadados necessários. |
| `20261107060000_normalize_setup_invite_role` | RPC criada pela migration anterior | Substitui RPC para normalizar roles nulas/vazias | Teste específico de role normalization | É uma revisão intermediária da mesma RPC. Não reverter sem preservar definição anterior e conferir contas criadas durante a janela. |
| `20261107062000_preserve_setup_invite_roles_verbatim` | RPC da migration anterior | Reemite a mesma expressão de role de `20261107060000`; altera apenas o comentário descritivo | Teste de preservação verifica o texto da definição/ACL; a comparação dos corpos SQL mostra igualdade com `20261107060000` | Migration semanticamente redundante na cadeia atual; preservar o histórico versionado, mas não descrevê-la como nova correção funcional. |
| `20261107170000_pin_empty_search_path_trigger_broadcasts` | Três funções de broadcast e seus corpos schema-qualified | Define search_path vazio nas funções SECURITY DEFINER | Teste de catálogo verifica config, EXECUTE e trigger binding; não executa trigger com fixtures | Manter search_path vazio. Não reverter para caminho implícito; se houver falha, qualificar objetos e corrigir a função. |
| `20261108010000_voice_attempt_singleton` | Tabela/RPC de voice attempts | Substitui RPC para impedir múltiplas tentativas ativas por conta/aliases | Test-migration verifica SECURITY INVOKER, search_path vazio, guarda `VOICE_ATTEMPT_ALREADY_ACTIVE`, `FOR UPDATE` e ACL; integração autenticada cobre concorrência entre aliases | É versão intermediária da RPC. Não voltar a permitir múltiplas tentativas; preservar tombstones e a definição final. |
| `20261108050751_voice_attempt_account_scoped_lock` | Tabela de attempts, RPC de voz e lock compartilhado da sala | Substitui open/cancel para serializar por conta e manter lock compartilhado da sala somente na mutação interna | Test-migration `20261108050802_voice_attempt_account_scoped_lock_test.sql` verifica ordem estática via `pg_get_functiondef`; integração autenticada testa mesma conta, aliases Normal/Team Lite, contas distintas e cancelamentos concorrentes (run exato #43376770200, 136/136) | É a revisão mais recente da RPC nesta cadeia. A chave de conta usa `p_user_name`; validar estabilidade do nome ou migrar para ID imutável antes de consolidar. Reversão para lock anterior pode reintroduzir corrida/deadlock. |

## 2. Grafo de dependências

Ordem parcial observada nos arquivos. Não é uma autorização para aplicar migrations e não substitui validação de dependências no banco limpo.

```text
Hardening de objetos existentes
  20261029170500  revoke EXECUTE das funções de trigger
  20261029183000  revoke grants das 9 tabelas existentes
  20261105150000  revoke default ACLs do owner postgres
  20261103160000  minimiza broadcast de mensagens ─┐
  20261103170000  minimiza broadcast de presença ──┴─> 20261107170000 search_path vazio
                                                        (catálogo + teste de execução real pendente)

Sinalização server-mediated
  20261029205000  users.name unique + rooms/members/events
       ├─> 20261030120000  status/consent
       │      └─> 20261030150000  default accepted (reafirmação)
       ├─> 20261030190000  constraint de envelopes legados
       └─> 20261030192000  room bindings
                ├─> 20261103171000  índice created_by
                └─> 20261105190000  open/leave voice room RPC
                         ├─> 20261106080200  call attempts
                         │      └─> 20261106111000  índices das FKs
                         └─> 20261106120500  voice attempts
                                └─> 20261108010000  singleton por alias/sala
                                       └─> 20261108050751  lock por conta (revisão final atual)

Fluxos independentes ou com dependência própria
  20261105160000  merge_chat_read_receipts -> public.chat_reads
  20261107010000  setup_invites -> public.users
       └─> 20261107060000  normalização intermediária da role
              └─> 20261107062000  preservação literal da role (revisão final atual)
```

A migration `20261029205000` tem preflight explícito para nomes nulos/duplicados em `public.users` antes de criar o índice único. A auditoria anterior encontrou cinco usuários, nenhum nome nulo/vazio e nenhum grupo duplicado naquele instante; isso deve ser reconsultado no ambiente isolado imediatamente antes do teste.


## 2A. Proveniência das RPCs substituídas por migrations posteriores

A revisão abaixo compara as definições SQL efetivas, não apenas os nomes dos arquivos. Todas as versões citadas pertencem à cabeça exata da PR #74 (`dcaf6a072546eda0089e0cee4018c3047011f600`), confirmada idêntica a `refs/pull/74/head` nesta auditoria.

### `public.consume_upstatus_setup_invite(text,text,text)`

| Migration | Alteração observada | Leitura de proveniência |
|---|---|---|
| `20261107010000_setup_invites.sql` | Define `role = coalesce(u.role, 'implementation_user')`. | Só substitui NULL; string vazia ou composta por espaços permanece como está. |
| `20261107060000_normalize_setup_invite_role.sql` | Troca para CASE: NULL ou valor vazio após `btrim(..., E' \\t\\n\\r')` recebe `implementation_user`; qualquer valor não vazio é preservado literalmente. | É a mudança funcional real da cadeia. |
| `20261107062000_preserve_setup_invite_roles_verbatim.sql` | Repete a mesma expressão CASE, o mesmo corpo da função e os mesmos REVOKE/GRANT da migration anterior; muda somente o texto de `COMMENT ON FUNCTION`. | Não introduz nova semântica. É uma reemissão documental/idempotente da definição já instalada pela migration anterior. |

Comparação de conteúdo:
- Blob `07060000`: `5444af10d257e6edec5ec0058ff4cd510248c0bc`.
- Blob `07062000`: `1a29a4baa097ca7108de2982a9f1c0f2a02b7f3b`.
- A comparação linha a linha dos corpos de `consume_upstatus_setup_invite` não encontrou diferenças.
- As test-migrations `20261107060000_setup_invite_role_normalization_test.sql` e `20261107062000_setup_invite_role_preservation_test.sql` inspecionam a definição armazenada e privilégios; isoladamente, não executam a RPC contra registros com NULL/vazio/role explícita. A suíte autenticada do commit abaixo contém a validação comportamental de NULL/vazio/espaços e preservação de role explícita.

### `public.open_upstatus_signal_voice_room_attempt` e `cancel_upstatus_signal_voice_room_attempt`

| Migration | Mudança funcional | Consequência |
|---|---|---|
| `20261106120500_voice_room_attempt_recovery.sql` | Cria open/cancel duráveis, valida owner/logical ID, usa tombstone de cancel-before-open e locks advisory por attempt ID e par de aliases da sala. | Primeira versão com recuperação server-side; o lock compartilhado da sala é adquirido antes da varredura de tentativas. |
| `20261108010000_voice_attempt_singleton.sql` | Adiciona varredura `FOR UPDATE` das tentativas ativas do mesmo `p_user_name`; retorna `VOICE_ATTEMPT_ALREADY_ACTIVE` quando já existe membership ativa válida, inclusive entre aliases Normal/Team Lite. | Corrige múltiplas tentativas por usuário, mas ainda mantém o lock global do par lógico durante a varredura por conta. |
| `20261108050751_voice_attempt_account_scoped_lock.sql` | No open, troca o lock global antecipado por lock advisory `upstatus-voice-account:<p_user_name>`; mantém o lock por attempt ID e delega o lock do par lógico à RPC interna `open_upstatus_signal_voice_room`. No cancel, adquire attempt ID → conta → par lógico → linha da tentativa. | Serializa operações da mesma conta sem manter o lock global da sala durante a varredura; a mutação da sala continua protegida pela RPC interna. A ordem explícita de locks reduz o risco de deadlock entre open/cancel. |

### Cobertura realmente encontrada

- `20261108010000_voice_attempt_singleton_test.sql` verifica catálogo, SECURITY INVOKER, search_path vazio, presença da guarda e ACL; não executa concorrência por si só.
- `20261108050802_voice_attempt_account_scoped_lock_test.sql` compara posições de trechos em `pg_get_functiondef` para garantir a ordem dos locks e verifica SECURITY INVOKER/ACL. É uma asserção estática da ordem, não uma corrida real.
- `scripts/test-signaling-authenticated.mjs` executa os cenários de integração: duas tentativas simultâneas da mesma conta em aliases diferentes; bloqueio da segunda aba; liberação após cancelamento; abertura concorrente por contas distintas na mesma sala lógica; cancelamentos concorrentes sem deadlock.
- O commit exato da PR #74 é `dcaf6a072546eda0089e0cee4018c3047011f600`. A comparação com `refs/pull/74/head` retornou `identical`.
- Nesse SHA, Validate run [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) e Signaling Smoke run [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) concluíram com sucesso. O job de smoke registrou 19/19 checks não autenticados e 136/136 checks autenticados; os cenários de singleton da mesma conta, abertura por contas distintas e cancelamentos concorrentes aparecem como PASS nos logs. Esta é evidência histórica do projeto isolado, não teste físico de Tampermonkey nem validação da produção atual.
- O projeto isolado usado pela suíte está atualmente `INACTIVE`; portanto, a execução não é reproduzível agora sem resolver a quota/estado do projeto.

### Premissa de identidade ainda aberta

A chave de serialização é derivada de `p_user_name`, e a tabela de tentativas armazena `created_by` como texto. A migration base cria unicidade em `public.users.name`, mas isso não equivale a uma identidade imutável. Os runtimes Normal e Team Lite implantados inspecionados não mostram uma rota de renomeação de `users.name`; isso não prova que alterações administrativas/SQL externas sejam impossíveis. Antes de consolidar o modelo, validar que nomes não mudam enquanto houver tentativa ativa ou planejar migração para um identificador imutável.

### Fronteira com produção

Consulta read-only ao catálogo de produção retornou zero linhas para as três RPCs de setup/voice candidatas e zero linhas para as tabelas de sinalização/attempts. O ledger continua com sete migrations até `20261027155438`. Portanto, essas definições são candidatas da PR #74, não funções instaladas na produção. Nenhuma migration foi aplicada nesta auditoria.

## 3. Test-migrations não são fixtures inertes

O README de `supabase/test-migrations/` diz expressamente que os arquivos são DDL executável e só podem ser aplicados ao projeto isolado `bfpjtfqlnypisxljoxkb`. O projeto está `INACTIVE` nesta consulta. O guard JavaScript de fixtures não protege aplicação manual de SQL.

Descobertas relevantes:

1. `20261104152847_atomic_chat_read_receipts_and_visual_config_grants_test.sql` cria/substitui a própria RPC `merge_chat_read_receipts` e revoga grants de cliente em `upstatus_visual_config`. Portanto, não é um teste passivo da migration de produção; aplicá-lo antes da validação pode mascarar a ausência/erro da migration candidata.
2. `20261104154623_distributed_signaling_rate_limit_test.sql` cria `upstatus_signal_rate_limits` e `consume_upstatus_signal_rate_limit`, com grants service_role-only. Essa estrutura aparece apenas em `test-migrations`, não nas 22 migrations de produção da PR #74. A Edge Function `upstatus-signal-test` chama essa RPC. Se esse transporte/proteção for promovido para uma função de produção, será necessária uma migration de produção separada e revisada para tabela, RPC, ACL e limpeza.
3. `20261106191000_bounded_rate_limit_cleanup_test.sql` substitui a RPC de rate limit no ambiente isolado e limita a limpeza oportunista a 100 linhas com `FOR UPDATE SKIP LOCKED`. Continua sendo DDL de teste; não deve ser movido para `supabase/migrations` sem uma decisão explícita de produto e revisão de produção.
4. `20261105150000_postgres_public_default_privileges_test.sql` e `20261105170000_postgres_global_function_default_scope_test.sql` testam defaults criados por `postgres`; não cobrem defaults de objetos criados por `supabase_admin`.
5. `20261107170000_pin_empty_search_path_trigger_broadcasts_test.sql` aplica o ALTER FUNCTION no projeto isolado e verifica catálogo, EXECUTE e vínculo de triggers. Não executa INSERT/UPDATE/DELETE de fixture para comprovar o disparo real do broadcast.
6. Os testes de call/voice attempts verificam catálogo e contratos, com cobertura de integração autenticada descrita nos workflows. Isso não substitui E2E no Full-Product TEST com as duas variantes do produto.

`scripts/migration-layout.test.mjs` verifica que arquivos `*_test.sql` permaneçam fora do diretório descoberto pelo Supabase CLI e faz algumas asserções estáticas. Ele não executa migrations, não comprova rollback e não valida o comportamento do banco.

## 4. Lacunas que precisam virar gates antes de qualquer migração

| Gate | Evidência necessária |
|---|---|
| Proveniência | Revisão independente dos quatro SQLs recuperados do ledger e confirmação se existe arquivo original externo. |
| Base limpa | Aplicar a cadeia candidata em banco isolado novo e validar todas as tabelas, constraints, funções, índices, grants e RLS. |
| ACL de tabelas existentes | Teste explícito das nove tabelas e de todos os privilégios para PUBLIC/anon/authenticated, preservando apenas o acesso necessário a service_role/owner. |
| Default ACL | Resolver o owner `supabase_admin` por procedimento suportado; testar tabela/função/sequence e EXECUTE global sem elevar role improvisadamente. |
| Broadcast | Executar INSERT/UPDATE/DELETE reais em fixtures e verificar que os três triggers enviam somente hints mínimos no tópico correto; confirmar cliente refetch autenticado. |
| Sinalização | Testar convite pendente/aceito/recusado, envelopes legados, binding único, expiração, cancel-before-open e limpeza com concorrência. |
| Rate limit | Se o transporte server-mediated for promovido, adicionar migration de produção própria; testar atomicidade, HTTP 429, Retry-After, limites por sessão/sala e limpeza limitada. |
| Setup invite | Testar token único/expirado, concorrência, hash, role nula/vazia e role explícita, incluindo auditoria de quem emitiu o convite. |
| Rollback | Para cada função substituída, guardar definição anterior exata; para tabelas/colunas, preservar dados/tombstones; demonstrar rollback/forward-fix no banco isolado. |
| Full-Product TEST | Projeto ativo e separado, com funções Normal/Team Lite, tópicos, Storage, secrets e namespaces exclusivos; nenhuma referência a produção. |

## 5. Política de rollback recomendada

Nenhuma das 22 migrations candidatas tem um arquivo de rollback pareado na PR #74. Para esta arquitetura, não tratar `DROP TABLE`, `DROP COLUMN` ou regrant amplo como rollback padrão.

- **Mudança de ACL:** preferir forward-fix; restaurar grants públicos não é rollback aceitável sem necessidade documentada e aprovação de segurança.
- **Substituição de função:** arquivar a definição anterior exata, comparar assinatura/owner/ACL/configuração, e preferir correção aditiva. Repor código antigo pode reabrir exposição de payload ou corrida.
- **Tabela/coluna com estado:** bloquear novas escritas pelo caminho antigo/novo, exportar fixtures e preservar registros até expiração e reconciliação. Não apagar tombstones de tentativas.
- **Constraint:** antes de restaurar, provar que nenhum dado existente viola a constraint anterior.
- **Índice:** pode ser removido em último caso, mas somente após plano de performance e verificação de cascades.
- **Default privileges:** não reintroduzir defaults amplos como resposta a falha de deploy.
- **Migrations já aplicadas:** não replay; para mudança de efeito, criar migration compensatória nova, com backup, preflight e validação isolada.

## 6. Próxima ação técnica

1. Obter um Full-Product TEST ativo e isolado; o laboratório atual está inativo.
2. Criar um banco limpo descartável nesse ambiente e validar a ordem parcial acima, sem tocar em produção.
3. Adicionar testes explícitos para grants das nove tabelas e execução real dos três triggers.
4. Resolver o plano de default ACL de `supabase_admin` com suporte/documentação oficial antes de qualquer tentativa.
5. Decidir se rate limiting do protótipo `upstatus-signal-test` fará parte do produto. Se sim, separar a migration de produção da DDL exclusiva de teste.
6. Só então congelar a sequência de migrations e seu plano de rollback.

**Estado:** matriz documental criada a partir de arquivos e metadados atuais. Não houve execução de SQL, validação de migrations em banco limpo, E2E Full-Product, rollback real ou aprovação humana. A fundação continua em andamento.
