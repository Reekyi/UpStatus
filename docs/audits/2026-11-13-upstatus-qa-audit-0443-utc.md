# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-13 04:43 UTC  
**Escopo:** GitHub `Reekyi/UpStatus`, branch QA `qa/release-readiness-2026-11-04-master`; Supabase produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.

## Veredito
**NOT READY.** A #74 é a trilha Normal mais completa, mas ainda precisa de revalidação no merge ref atual e de incremento de versão. A #76 tem boa cobertura automatizada e correções de Team Lite, mas o workflow de produção continua publicando o slug Normal. O transporte autenticado de sinalização existe somente como candidato/opt-in; não há Edge Function `upstatus-signal` em produção. O runtime TEST instalado continua usando identidade local e API/Realtime de produção.

## Integridade e heads
| Referência | HEAD observado |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA | `93dc6cc683b0defb95b7d607c52b6437bd0bf4d0` |
| `team-lite-official` | `9065bc1` |
| PR #74 | `fb878537` |
| PR #75 | `7bbf9b90` |
| PR #76 | `83a6cc4` |
| PR #82 | `93dc6cc` |
| PR #158 | `2577519` |

QA está 269 commits à frente e 1 atrás de master; os 128 arquivos divergentes são todos documentais. GitHub informa `protected=false` para QA, master e team-lite-official. Não alterei proteção de branch. O arquivo RELEASE_READINESS.md foi lido integralmente (1.045.105 bytes, 8.410 linhas); último checkpoint interno ainda é 08/11/2026 18:30 UTC. O arquivo principal foi preservado.

## CI e PRs
| PR | Resultado observado | Classificação |
|---|---|---|
| #74 Normal | Validate + Smoke PASS no HEAD `fb878537`; Smoke registra 136/136 verificações autenticadas | CI aprovado no HEAD, mas base do último run é `a9288cc`, um commit documental atrás do master atual |
| #75 Team Lite | Candidate Checks PASS no HEAD histórico `7bbf9b90` | Evidência histórica; baseline substituído pela #76 |
| #76 Team Lite | Candidate Checks SUCCESS no HEAD `83a6cc4`; 110/110 autenticadas e 16/16 não autenticadas | CI aprovado no HEAD exato |
| #82 QA | Validate FAIL no HEAD `93dc6cc` | Falha: `production updateURL mismatch`, `scripts/validate.mjs:26` |
| #158 Normal | Validate FAIL no HEAD `2577519` | As assertions owner+role passam; falha posterior na regressão de anexos staged porque a base master não contém o fluxo presente na #74 |

Evidências:
- [#74 Validate](https://github.com/Reekyi/UpStatus/actions/runs/42753434411)
- [#74 Smoke](https://github.com/Reekyi/UpStatus/actions/runs/42753434336)
- [#75 histórico](https://github.com/Reekyi/UpStatus/actions/runs/41674353127)
- [#76 Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/43363871881)
- [#82 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43360054757)
- [#158 Validate](https://github.com/Reekyi/UpStatus/actions/runs/43363857861)

### Avaliação da trilha Normal
A #74 já contém a autorização owner+role para limpar o chat, o fluxo de anexos staged e o guard de build TEST. O build exige `UPSTATUS_TEST_PROJECT_ID`, rejeita o projeto de produção e o laboratório de sinalização e usa sentinel inerte quando não há projeto configurado. O updater usa `release.json.scriptUrl` e valida a URL exata.

A base do último CI da #74 está um commit atrás do master atual; a comparação mostra que esse único commit é documental. Ainda assim, o merge ref atualizado precisa de Validate/Smoke. `release.json` continua em 3.4.7, igual ao Normal instalado, e o workflow trava explicitamente em 3.4.7. É necessário incrementar a versão e atualizar o gate de release antes de distribuir um artefato novo.

### Avaliação da #158
A #158 duplica a regra owner+role já presente na #74, mas não traz o fluxo de anexos staged e o build TEST ainda usa o project ref de produção. Não integrar isoladamente. Manter como referência até a #74 ser atualizada e revalidada; depois pode ser marcada como supersedida.

### Avaliação da Team Lite
A #76 candidata exige owner+role no backend e na UI para limpar o chat e tem regressão VM específica. Os testes também verificam que broadcasts públicos de `remote_command` carreguem apenas um hint, sem o comando, e que o transporte autenticado seja usado quando habilitado.

O workflow TEST candidato é manual, fixa Supabase CLI 2.122.1 e exige `vars.SUPABASE_TEST_PROJECT_ID`, rejeitando produção e o laboratório. Como não existe projeto full-product TEST na organização conectada, deve falhar fechado até provisionamento.

O workflow de produção da #76 é idêntico ao da branch oficial: usa CLI `latest` e executa `supabase functions deploy upstatus`. O slug correto é `upstatus-team-lite`. Não executar.

## Autorização do chat e identidade
Os bundles Normal v480, Team Lite v15 e TEST v281 instalados ainda têm o endpoint `/api/chat/clear` autorizado somente por `name === "Ricardo"`; não consultam a role nesse handler. O bootstrap legado também atribui `implementation_admin` por lista de nomes quando a role está vazia.

As candidatas #74 e #76 exigem a conta Ricardo **e** a role persistida `implementation_admin`, com testes de regressão. A correção não está instalada.

Consulta agregada de produção: 5 usuários, 0 roles vazias e 0 hashes de senha vazios. Isso significa que não foi observado usuário atualmente sem role; o risco é o caminho legado no código implantado. `users.id` é a PK, `users.name` não possui índice UNIQUE; `upstatus_sessions` armazena `user_name` e não possui `user_id`; `upstatus_profiles` também usa `user_name`. Sessões têm expiração de 30 dias. A autorização por nome continua frágil para renomeação, reutilização de nome e revogação. Próxima correção: vincular sessão e perfil a `users.id`, invalidar sessões antigas e migrar perfis.

## TEST instalado e isolamento
O userscript servido por `upstatus-test` é v3.3.28, `@name UpStatus - Sale Smartly`, namespace `upseller`, chave GM `upstatus_screen_share_beta8_`. É a mesma identidade local/chave do Normal v3.4.7. O bundle TEST também define:
- `CLOUD_SERVER` para `upstatus-screen-share-3-1-1-beta10` no projeto de produção;
- URL e tópico Realtime no mesmo projeto/tópico beta10;
- `remote_command` que executa o payload quando o destino corresponde ao membro.

Team Lite usa namespace e chave próprios, mas também o tópico beta10. Há 12 Edge Functions com prefixo `upstatus-test` ACTIVE no projeto de produção. O runtime TEST v281 não é isolado e pode colidir com Normal no Tampermonkey e acessar a API/Realtime de produção.

A #74 tem o guard de build correto, mas não substitui o runtime legado. Só existem dois projetos Supabase conectados: produção e laboratório de sinalização/auth. O laboratório não contém o produto completo (chat/Storage). TEST-ISOLATION permanece bloqueado.

## Realtime e transporte autenticado
Os bundles instalados Normal, Team Lite e TEST não configuram `private:true` nem `realtime.setAuth()`. Normal e TEST executam diretamente o `remote_command` recebido; Team Lite valida a própria sessão antes de executar, mas não autentica independentemente o emissor. Os 125 registros persistidos em `realtime.messages` estão com `private=false`: 67 `user_status`, 46 `db_change`, 6 `remote_command`, 6 `remote_result`.

Os triggers PostgreSQL publicam no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, enquanto os bundles instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. A entrega de mudanças do banco aos clientes está desalinhada.

A trilha autenticada das PRs #74/#76 é opt-in: `signaling_transport_enabled` e endpoint ficam vazios/desativados por padrão. O cutover plan afirma que `upstatus-signal-test` existe apenas no laboratório e que não há `upstatus-signal` em produção. O inventário atual confirma zero funções de produção com slug contendo `signal`. Portanto, os testes de transporte autenticado no laboratório não comprovam cutover de produção. RT-01 permanece bloqueado.

## Supabase — fotografia read-only
### Produção
- Projeto ACTIVE_HEALTHY; 38 Edge Functions ACTIVE, todas com `verify_jwt=false` no gateway. Isso não significa que todas sejam sem autenticação: os handlers usam tokens próprios, mas a validação de sessão passa a ser responsabilidade do código.
- Funções principais: `upstatus` v480, `upstatus-team-lite` v15, `upstatus-test` v281 e `upstatus-screen-share-3-1-1-beta10` v6. Não existe `upstatus-signal`.
- 10 tabelas public com RLS e zero policies; 9 tabelas com grants diretos para anon/authenticated; 18 grants TRUNCATE.
- 120 entradas de Default ACL para anon/authenticated nos schemas public, storage, graphql e graphql_public; 48 delas em public.
- `realtime.messages`: RLS habilitado, zero policies e seis grants de clientes (SELECT/INSERT/UPDATE).
- Três funções de broadcast SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated. O trigger de mensagens envia OLD/NEW completos.
- Security Advisor: 6 WARN e 10 INFO.
- Dois buckets públicos (`chat-images`, `profile-images`), 188 objetos (168 e 20), zero policies próprias em `storage.objects`. Buckets públicos permitem leitura por URL; ausência de policies não comprova upload público irrestrito.

### Laboratório
- Projeto ACTIVE_HEALTHY; 39 migrations; 18 tabelas public com RLS sem policies; zero grants diretos equivalentes para clientes nas tabelas public de aplicação consultadas; 96 entradas Default ACL para papéis clientes.
- Triggers endurecidos com `search_path=""`, EXECUTE restrito e payload mínimo.
- Zero mensagens Realtime persistidas e zero buckets/objetos Storage. Não há evidência de entrega de eventos Realtime em execução.
- O laboratório é isolado, mas não é full-product TEST.

### AUTH-03, voz e migrations
Produção não tem colunas `setup_token_*`, tabelas de rate limit de convite nem RPCs de consumo; o laboratório tem quatro colunas setup_token, duas tabelas de rate limit e duas RPCs. AUTH-03 permanece bloqueado para release.

A RPC de voz no laboratório retorna `VOICE_ATTEMPT_ALREADY_ACTIVE`. O Edge Function v32 atualmente implantado ainda mapeia `VOICE_ATTEMPT_CONFLICT`/ `ROOM_FULL` para 409, deixando `VOICE_ATTEMPT_ALREADY_ACTIVE` cair no fallback 500 por inspeção estática. A fonte Normal candidata #74 já mapeia esse código para 409; a fixture HTTP da #76 também testa o mapper. Isso é drift entre runtime implantado e fonte/fixture candidata; não foi feita chamada HTTP real nesta auditoria.

Produção tem 7 migrations; laboratório 39. Os quatro SQLs ausentes em `master/supabase/migrations` são:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A #135 recupera os statements do ledger em `docs/migration-recovery/`, fora do diretório canônico. O README e manifest explicitam que não são os arquivos originais byte a byte. A branch Supabase gerenciada `main` continua `MIGRATIONS_FAILED`; preview está saudável.

## Issues
- [#78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos aceitos. Não houve teste manual de reconexão Normal/Team Lite sem F5, microfone, permissões de tela ou interoperabilidade instalada nesta rodada. Os testes Chromium são CI, não aceitação física.
- [#79](https://github.com/Reekyi/UpStatus/issues/79): comentário QA existente atualizado, comentário da Engenharia preservado, JSON válido, sete gates e até oito atividades. Checklist no corpo continua 16/35; isso não é percentual de release.

## Gates
| Gate | Estado |
|---|---|
| RT-01 | blocked |
| TEST-ISOLATION | blocked |
| MIGRATION-PROVENANCE | blocked |
| AUTH-03 | blocked |
| ACL-STORAGE | blocked |
| RECONNECT | pending |
| HUMAN-REVIEW | pending |

## Próximas prioridades
1. Usar #74 como trilha Normal; atualizar/revalidar o merge ref e incrementar a versão.
2. Não integrar #158 isoladamente; manter como referência até a #74 estar validada.
3. Provisionar projeto full-product TEST e planejar substituição do runtime v281 sem alterar produção nesta auditoria.
4. Criar e versionar endpoint de produção `upstatus-signal`; coordenar deploy com Normal e Team Lite antes de habilitar a flag.
5. Corrigir workflow Team Lite para publicar exclusivamente `upstatus-team-lite`, com CLI fixa, SHA e projeto esperados.
6. Vincular sessões e perfis a `users.id`; remover fallback de role por nome e aplicar role persistida em todas as operações destrutivas.
7. Fechar RLS, grants, Default ACL, SECURITY DEFINER e Storage; definir políticas de leitura/escrita.
8. Recuperar proveniência dos quatro SQLs e resolver MIGRATIONS_FAILED em branch/preview antes de qualquer produção.
9. Atualizar a função de laboratório v32 para o contrato 409 e validar a resposta HTTP real.
10. Executar os oito testes físicos e obter aprovação humana vinculada ao SHA final.

## Limitações e segurança da execução
- GitHub Actions foram inspecionados; nenhum workflow foi disparado manualmente nesta auditoria.
- Nenhum teste local/browser/Tampermonkey foi executado; não havia ambiente físico controlado.
- Supabase foi usado somente com operações de leitura: inventário, advisors e SELECTs de catálogo/agregados.
- Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags ou operação destrutiva.
- Escrita limitada a este novo relatório na branch QA e atualização do comentário QA existente na Issue #79.
