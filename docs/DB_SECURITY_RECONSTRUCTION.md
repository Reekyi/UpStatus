# UpStatus — segurança e reconstrução do banco

**Estado:** inspeção somente leitura  
**Verificado em:** 17/11/2026  
**Projeto:** `dlfvkawaiqduhlazsszm` (produção)  
**Branch de referência das migrations candidatas:** `chore/continuity-foundation`

> Este documento registra o catálogo observado e compara com migrations candidatas. Não é autorização para aplicar SQL. Nenhuma migration, grant, policy, trigger, função ou dado foi alterado.

## 1. Estado atual de RLS e grants

As dez tabelas do schema `public` estão com RLS habilitado, sem FORCE RLS e sem policies:

| Tabela | RLS | FORCE RLS | Policies |
|---|---:|---:|---:|
| `chat_reads` | Sim | Não | 0 |
| `messages` | Sim | Não | 0 |
| `reactions` | Sim | Não | 0 |
| `status_history` | Sim | Não | 0 |
| `upstatus_profiles` | Sim | Não | 0 |
| `upstatus_sessions` | Sim | Não | 0 |
| `upstatus_state` | Sim | Não | 0 |
| `upstatus_typing` | Sim | Não | 0 |
| `upstatus_visual_config` | Sim | Não | 0 |
| `users` | Sim | Não | 0 |

Nove das dez tabelas, todas exceto `upstatus_visual_config`, concedem a `anon` e `authenticated` o mesmo conjunto de privilégios:

`DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`.

A consulta de privilégios efetivos confirmou `has_table_privilege(..., 'TRUNCATE') = true` e `TRIGGER = true` para ambos os roles em `messages`, `users`, `upstatus_sessions` e `upstatus_state`. A RLS filtra operações por linha, mas não transforma `TRUNCATE` em operação filtrada por linha. Isso é uma concessão de privilégio de alto risco e deve ser removida em ambiente de teste antes de qualquer release.

**Limite da evidência:** o catálogo prova que o privilégio foi concedido; esta inspeção não tentou executar TRUNCATE, criar triggers ou acessar dados via PostgREST. Não afirmar que uma exploração remota foi demonstrada. O problema é a combinação de privilégios excessivos com RLS sem policies.

## 2. Default privileges para objetos futuros

A consulta de `pg_default_acl` no schema `public` encontrou defaults amplos para **dois grantors**:

- `postgres`;
- `supabase_admin`.

Para ambos, os defaults incluem:

- Tabelas futuras: privilégios para `anon` e `authenticated` de `DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`.
- Funções futuras: `EXECUTE` para `anon` e `authenticated`.
- Sequences futuras: `SELECT, UPDATE, USAGE` para `anon` e `authenticated`.

Isso é importante porque revogar grants apenas das tabelas existentes não impede que novos objetos voltem a nascer com permissões amplas.

### Migration candidata e lacuna de owner

A migration candidata `20261105150000_revoke_public_default_privileges_postgres.sql`:

- revoga defaults de tabelas, funções e sequences para `anon` e `authenticated` quando o owner é `postgres`;
- revoga também EXECUTE global de funções criadas por `postgres` para `PUBLIC`;
- declara explicitamente que **não trata `supabase_admin`**, pois o executor `postgres` não tem membership nesse role.

A consulta de produção confirma que os defaults de `supabase_admin` continuam presentes. Portanto, aplicar apenas essa migration não fecharia o problema de defaults. É necessário definir um caminho administrativo suportado e uma validação pós-migration para ambos os owners.

## 3. Funções SECURITY DEFINER e triggers

Foram encontradas três funções SECURITY DEFINER em `public`:

| Função | SECURITY DEFINER | EXECUTE anon | EXECUTE authenticated |
|---|---:|---:|---:|
| `upstatus_broadcast_messages()` | Sim | Sim | Sim |
| `upstatus_broadcast_remote_state()` | Sim | Sim | Sim |
| `upstatus_broadcast_users()` | Sim | Sim | Sim |

As três definições atuais declaram `SET search_path TO 'public'`. São funções usadas por triggers, não handlers de negócio para chamada direta do cliente. Ainda assim, o EXECUTE concedido a `PUBLIC/anon/authenticated` é mais amplo que o necessário e deve ser revogado com teste de regressão.

Triggers observados:

| Tabela | Trigger | Evento |
|---|---|---|
| `public.messages` | `upstatus_messages_broadcast` | AFTER INSERT/DELETE/UPDATE |
| `public.users` | `upstatus_users_broadcast` | AFTER UPDATE de status, reason, updated_at, sync |
| `public.upstatus_state` | `upstatus_remote_state_broadcast` | AFTER INSERT/UPDATE de value, apenas para state_key remote-status |

### Payloads atuais

- `upstatus_broadcast_messages` envia `to_jsonb(OLD/NEW)` completo no evento público `db_change`.
- `upstatus_broadcast_users` envia name, status, reason, updated_at e sync no evento público `user_status`.
- `upstatus_broadcast_remote_state` envia campos de comandos/resultados nos eventos `remote_command` e `remote_result`.
- As três funções usam o tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0` e passam `false` como último argumento de `realtime.send`.

Isso contrasta com os clientes atuais, que escutam o tópico beta10. Além do roteamento divergente, o payload atual de messages expõe conteúdo completo em um broadcast público. O contrato candidato minimiza os eventos para hints de operação, exigindo refetch autenticado para dados canônicos.

## 4. Storage

As tabelas `storage.buckets` e `storage.objects` têm RLS habilitado, FORCE RLS desabilitado e nenhuma policy registrada. `anon` e `authenticated` têm SELECT/INSERT/UPDATE/DELETE no catálogo dessas tabelas; sem policies, as operações por linha não são liberadas por RLS.

Buckets observados:

| Bucket | Público | Limite | MIME |
|---|---:|---:|---|
| `chat-images` | Sim | 20 MB | imagem, vídeo, áudio, PDF, Office, CSV e texto |
| `profile-images` | Sim | 20 MB | PNG, JPEG, WebP e GIF |

Como os buckets são públicos, objetos conhecidos podem ser lidos por URL pública. Isso pode ser intencional para anexos do chat e avatares, mas precisa ser tratado como contrato de privacidade. O fluxo de upload usa URLs assinadas emitidas pelo backend; não há policy de escrita pública observada.

Não tornar buckets privados sem plano de compatibilidade para URLs já gravadas em `messages` e `upstatus_profiles`.

## 5. Migrations candidatas já versionadas

As seguintes migrations existem na branch `chore/continuity-foundation`, mas não aparecem no histórico de migrations de produção:

| Migration | SHA do arquivo | Intenção |
|---|---|---|
| `20261029170500_restrict_trigger_function_execute.sql` | `8a06ab56fce1b1d91a5bd1edba3542db5e58578d` | Revogar EXECUTE público/anon/authenticated das três funções trigger |
| `20261029183000_revoke_unused_public_table_grants.sql` | `53f8bd28e46b82fb8ee77ff793d147e492f99eda` | Revogar grants de nove tabelas para PUBLIC/anon/authenticated |
| `20261103160000_minimize_public_chat_broadcast.sql` | `3500b6ffc27b0342621a17badd70c94a2428175e` | Publicar apenas operação, não corpo/registro da mensagem |
| `20261103170000_minimize_public_status_broadcasts.sql` | `28db49abe3022d61185c6f8f94af1aa153dbd8` | Minimizar eventos de status e remote command/result |
| `20261105150000_revoke_public_default_privileges_postgres.sql` | `73b21d39f617f254d293ad55839679f0c7fecf4d` | Revogar defaults de objetos futuros criados por postgres |
| `20261107170000_pin_empty_search_path_trigger_broadcasts.sql` | `650efd2ab325ef3924ce9e95e83b72c0510a3f3f` | Definir search_path vazio nas funções trigger |

A migration de default privileges declara explicitamente que não cobre `supabase_admin`. Essa lacuna precisa de tratamento separado. As migrations de broadcast exigem deploy coordenado dos clientes que tratam eventos como hints e refazem fetch autenticado.

### Histórico real de migrations em produção

O projeto registra apenas sete versões:

- `20261005160000` — upstatus_cloud
- `20261005173000` — remote_realtime
- `20261005180000` — client_presence
- `20261023154754` — create_upstatus_visual_config
- `20261026195855` — add_chat_message_file_name
- `20261027154329` — allow_chat_document_mime_types
- `20261027155438` — set_upstatus_upload_limits_20mb

Nenhuma das seis migrations de hardening acima está registrada como aplicada em produção.

## 6. Sequência recomendada para reconstrução

1. **Snapshot e provenance:** guardar schema, grants, default ACL, triggers, funções, policies, buckets e migration ledger com hashes antes de qualquer mudança.
2. **Ambiente isolado:** obter um Full-Product TEST ativo, separado em projeto, dados, secrets, Storage e Realtime.
3. **Role matrix:** definir exatamente o que anon, authenticated e service_role precisam fazer por tabela, função, sequence e bucket.
4. **Revoke controlado:** aplicar revogação de grants existentes e default privileges em TEST, incluindo owners postgres e supabase_admin por caminho administrativo suportado.
5. **Trigger hardening:** revogar EXECUTE desnecessário, fixar search_path vazio e testar que os triggers continuam funcionando.
6. **Payload minimization:** publicar somente hints não sensíveis e garantir que clientes refaçam fetch autenticado.
7. **Storage compatibility:** decidir se os buckets permanecem públicos; preservar leitura de URLs existentes ou planejar migração explícita.
8. **Testes de segurança:** verificar anon/authenticated sem acesso a tabelas/sessões, ausência de TRUNCATE/CREATE TRIGGER, grants futuros, upload assinado, URLs públicas, triggers e rollback.
9. **Produção:** somente depois de CI, Full-Product E2E, backup, plano de rollback e aprovação explícita de Ricardo. Nenhuma etapa de produção está autorizada neste momento.

## 7. Limitações e segurança operacional

- As consultas foram somente leitura.
- Não foram feitas tentativas de TRUNCATE, DML, criação de triggers, chamadas de função, uploads ou downloads de objetos.
- O catálogo prova grants e configurações; não demonstra uma exploração remota.
- Não foram aplicadas migrations, grants, policies, alterações de search_path, alterações de buckets ou mudanças de billing.
