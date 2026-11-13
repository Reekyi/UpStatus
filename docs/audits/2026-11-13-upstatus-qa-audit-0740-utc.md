# UpStatus — auditoria independente de qualidade
**Execução:** 2026-11-13 07:40 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Branch documental:** `qa/release-readiness-2026-11-04-master`  
**Projeto Supabase de produção:** `dlfvkawaiqduhlazsszm`  
**Projeto de laboratório consultado:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** `NOT READY`

## 1. Escopo, método e limites

- Conferidos os heads reais de `master`, QA e `team-lite-official`, os metadados/diffs das PRs #74, #75, #76, #82 e #158, os runs e logs de CI, as Issues #78 e #79 e os comentários do Control Center.
- Lido integralmente o blob de `docs/RELEASE_READINESS.md` na QA: 1.045.105 bytes e 8.410 linhas. O último checkpoint técnico interno continua em 2026-11-08 18:30 UTC.
- Inspecionados os arquivos de workflow e os artefatos userscript embutidos nas Edge Functions implantadas. Os bundles Normal, Team Lite e TEST foram decodificados localmente no fluxo de inspeção, sem publicar ou modificar artefatos.
- Consultas Supabase exclusivamente SELECT e leitura de metadados. Nenhuma migration, deploy, alteração de secret/flag, merge ou operação destrutiva.
- Não havia checkout local do projeto, navegador/Tampermonkey controlado ou ambiente full-product TEST. Portanto, não foram executados testes locais, testes físicos ou PUT real no Storage. Foram analisados somente resultados de CI já existentes e inspeção estática/runtime read-only.

## 2. Heads e integridade documental

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA antes deste relatório | `97858a1885b6db4052e5f975179ab7d488dc0939` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

A comparação master → QA retorna **273 commits à frente, 1 atrás e 131 arquivos divergentes**. Os 131 arquivos são exclusivamente `docs/`; nenhum arquivo de produto diverge nessa comparação. A branch QA foi reconsultada imediatamente antes da escrita documental e estava no SHA acima.

O documento `docs/RELEASE_READINESS.md` foi preservado. O relatório desta execução é um arquivo novo, sem substituir relatórios anteriores.

## 3. PRs e CI

| PR | Head | Estado | Evidência desta execução |
|---|---|---|---|
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Draft, aberta | Validate e Smoke SUCCESS |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Draft, aberta | Candidate Checks SUCCESS histórico |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Draft, aberta | Candidate Checks SUCCESS |
| #82 QA | `97858a1885b6db4052e5f975179ab7d488dc0939` | Draft, aberta | Validate FAILURE |
| #158 updater/chat | `25775192ed5be4197581b55123cd4f2f78386c51` | Draft, aberta | Validate FAILURE |

Não foram encontrados reviews humanos nas PRs #74, #75, #76 e #82. Nenhuma foi integrada.

### #74 — Normal

- [Validate run 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142): SUCCESS no merge ref `6912c96e51ed150af673093a352650270c4d4fd9`.
- [Smoke run 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200): SUCCESS; log confirma **136/136 verificações autenticadas** e WebRTC de chamada, voz e compartilhamento de tela, mesh de três participantes, teardown e rate limit distribuído 90 aceitas / 1 rejeitada HTTP 429.
- O Smoke registra explicitamente como SKIPPED tanto o syntax-check do harness de emissão de setup-invite quanto o teste distribuído de rate limit de emissão de setup-invite. Não contar esses dois passos como aprovados nessa execução.
- O Validate cobre guard do build TEST, contratos de upload assinado, autorização de setup-invite, regressões de chat e updater.
- O build candidato usa namespace e prefixo de armazenamento distintos para TEST, sentinel inerte por padrão, rejeita projeto de produção e o laboratório de sinalização e usa topic de produção alinhado ao trigger legado.
- O workflow TEST candidato é manual, exige `vars.SUPABASE_TEST_PROJECT_ID`, rejeita produção e o projeto de sinalização e fixa Supabase CLI 2.122.1.
- O workflow de produção candidato exige master, checkout do SHA exato, projeto esperado, token e CLI 2.122.1. Ainda trava a versão em 3.4.7; `release.json` também permanece em 3.4.7, igual ao Normal instalado. É necessário planejar incremento de versão antes de uma atualização efetiva.
- Os testes de upload aprovam contratos estáticos de cliente/servidor; não foi executado PUT real contra Storage.

### #75 — Team Lite

- [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127): SUCCESS histórico, versão 3.4.31 e testes de updater/guest portal.
- Não substitui a cobertura mais recente da #76.

### #76 — Team Lite

- [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881): SUCCESS; **110/110 verificações autenticadas** e **16/16 não autenticadas**.
- Logs confirmam testes de chamada, voz, compartilhamento de tela, WebRTC, mesh de três participantes, ownership de sala, rate limit distribuído, setup-invite, singleton de tentativa de voz, recuperação/rejoin e updater.
- O teste de emissão distribuída de setup-invite passou no projeto isolado.
- A candidata usa o topic legado que corresponde aos triggers atuais, transforma `remote_command` em hint para polling autenticado e inclui adapter de sinalização autenticada.
- A flag `signaling_transport_enabled` continua **false por padrão**. Com a flag desligada, o fallback de `call_signal` continua público. A candidata não prova cutover de produção.
- A versão candidata é 3.4.31; a instalada é 3.4.30.

### #82 — QA

- [Validate 43381673651](https://github.com/Reekyi/UpStatus/actions/runs/43381673651): FAILURE.
- Erro reproduzido: `VALIDATION FAILED: production updateURL mismatch`, em `scripts/validate.mjs:26`.
- A PR está 1 commit atrás de master; a diferença entre QA e master é exclusivamente documental. A falha é herdada do contrato de build/updater da base, não causada por alteração de produto no relatório.

### #158 — updater e limpeza do chat

- [Validate 43363857861](https://github.com/Reekyi/UpStatus/actions/runs/43363857861): FAILURE em `scripts/chat-regression.test.mjs`.
- Erro: `files are staged instead of uploaded immediately`. A candidata parte de master e não contém o fluxo de anexos staged que a #74 valida.
- A alteração separa corretamente URL de distribuição do endpoint beta10 e corrige a autorização candidata de limpeza do chat para exigir identidade proprietária e role administrativa. Não integrar isoladamente; portar a correção necessária para a trilha Normal completa ou rebasear sobre a candidata que contém anexos e reexecutar a suíte inteira.

## 4. Artefatos efetivamente implantados

| Produto | Edge Function | Versão do bundle | Namespace | API do bundle |
|---|---|---:|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` | beta10 de produção |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` | função Team Lite |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` | beta10 de produção |

O bundle TEST servido pela função de produção tem o mesmo `@name`, `@namespace`, chave GM `upstatus_screen_share_beta8_`, tópico beta10 e `CLOUD_SERVER` do Normal. O `@updateURL` aponta para a rota `upstatus-test`, mas o backend/API do userscript aponta para o endpoint beta10 do projeto de produção. A função TEST usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEYS.default`) do projeto onde está implantada; portanto, seu runtime opera sobre a infraestrutura de produção.

O inventário do projeto de produção contém **38 Edge Functions ACTIVE**, todas com `verify_jwt=false` no gateway; 12 têm prefixo `upstatus-test`. Não existe slug `upstatus-signal` em produção. `verify_jwt=false` não prova, isoladamente, ausência de autenticação: os handlers usam token de sessão próprio. Porém, aumenta a importância de revisar cada rota pública e seu controle de sessão.

**TEST-ISOLATION permanece bloqueado.** O guard da #74 protege builds futuros, mas não substitui o runtime v281 nem cria um projeto full-product TEST. O projeto separado `upstatus-security-test` é laboratório de autenticação/sinalização, não ambiente completo de chat e Storage.

## 5. Realtime e compatibilidade Normal/Team Lite

- Os bundles instalados Normal, Team Lite e TEST não contêm `private:true` nem `realtime.setAuth()`.
- Normal e TEST recebem `remote_command` público e executam diretamente o comando se `target===member`.
- Team Lite também executa o comando recebido; adicionalmente confere sua própria sessão/generation local, mas não autentica independentemente o emissor do broadcast.
- Os handlers de `call_signal`, `voice_room_signal` e `screen_share_signal` aceitam payloads de broadcast público. O guard local do Team Lite não comprova a identidade do remetente.
- As candidatas #74/#76 melhoram `remote_command` para simples hint/polling autenticado e adicionam adapter server-mediated para voz/tela, mas a flag começa desligada e o endpoint de produção ainda não existe.
- Os clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`; os triggers PostgreSQL atuais publicam no topic legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Há divergência de topic entre cliente e trigger.
- Consulta agregada dos últimos 14 dias: **125 mensagens com `private=false`**: 67 `user_status`, 46 `db_change`, 6 `remote_command` e 6 `remote_result`.
- O trigger de mensagens transmite OLD/NEW completos. O trigger de estado remoto transmite campos de comando/resultado. Todos usam `realtime.send(..., false)`.
- A configuração do Dashboard que controla publicação em canais públicos não foi exposta pela leitura disponível; não foi reproduzida exploração externa. A exposição estrutural do payload público e a ausência de identidade autenticada do emissor estão confirmadas.

**RT-01 permanece bloqueado.** Não habilitar flag antes de existir endpoint de produção, tópico coordenado, autorização de membro/recipient e testes E2E de cutover/rollback.

## 6. PostgreSQL, RLS, grants, SECURITY DEFINER e Storage

Fotografia read-only do projeto `dlfvkawaiqduhlazsszm`:

| Indicador | Resultado |
|---|---:|
| Tabelas public com RLS e sem policies | 10 |
| Tabelas public com grants diretos para anon/authenticated | 9 |
| Grants TRUNCATE de anon/authenticated nas tabelas consultadas | 18 |
| Entradas Default ACL para anon/authenticated em public/graphql/graphql_public/storage | 120 |
| Entradas Default ACL em public | 48 |
| Buckets públicos | 2 |
| Objetos nos buckets públicos | 188 |
| Policies em `storage.objects` | 0 |
| Funções de broadcast SECURITY DEFINER | 3 |

- Os nove objetos public concedem sete privilégios por papel cliente nas consultas: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Foi confirmado que anon e authenticated têm SELECT e TRUNCATE em `public.messages`.
- TRUNCATE não é protegido por RLS. Isso é privilégio excessivo; não foi demonstrado caminho externo de execução SQL/TRUNCATE pela API.
- `realtime.messages` é particionada, tem RLS habilitado, zero policies e grants SELECT/INSERT/UPDATE para anon. A ausência de policies nega acesso direto por RLS, mas não substitui a configuração de autorização dos canais Broadcast.
- Os buckets públicos são `chat-images` (168 objetos) e `profile-images` (20 objetos), com limite de 20 MiB. Objetos em bucket público são acessíveis por URL pública; não há policies próprias em `storage.objects`.
- As três funções de broadcast são SECURITY DEFINER, com `search_path=public` e EXECUTE concedido a anon/authenticated. São funções de trigger (retorno trigger); não foi demonstrada invocação direta por RPC. Ainda assim, grants desnecessários e search_path mutável devem ser restringidos.
- Security Advisor de produção: 3 WARN para execução de SECURITY DEFINER por anon, 3 WARN para authenticated e 10 INFO de RLS sem policy.
- Laboratório: 18 INFO de RLS habilitado sem policy e nenhum WARN no advisor consultado. Isso não comprova o produto completo, porque o laboratório não tem buckets nem mensagens de chat.

## 7. AUTH-03, identidade e autorização do chat

No banco de produção:
- 5 usuários, 5 nomes distintos, nenhum nome duplicado, zero password_hash vazio e zero role vazia na fotografia atual.
- `users` tem PK `id`, mas nenhuma constraint UNIQUE em `name`.
- `upstatus_sessions`: 319 linhas, 5 nomes distintos e 161 linhas expiradas; colunas `token_hash`, `user_name`, `expires_at`, `created_at`; sem `user_id`.
- `upstatus_profiles` usa `user_name`, sem `user_id`.

O código implantado Normal/Team Lite/TEST ainda:
- Persiste sessão por `user_name` e cria sessão de 30 dias.
- Expõe `POST /api/setup` que chama `login(req,true)`; se uma conta existente estiver sem password_hash, a primeira pessoa que conhecer o nome pode definir a senha sem token de convite. Hoje não há conta sem hash, mas o caminho de bootstrap futuro continua sem AUTH-03.
- Mantém fallback de role administrativa por nomes no setup quando a role está vazia.
- Protege `POST /api/chat/clear` somente por `name === "Ricardo"`, sem consultar a role. A #74 candidata corrige para identidade proprietária + `implementation_admin`; a produção instalada ainda não recebeu essa correção.

AUTH-03 permanece bloqueado. A sessão deve carregar `user_id` imutável, o perfil deve ser migrado para ID estável, bootstrap precisa de convite único com rate limit e a autorização de limpeza deve usar a role persistida.

## 8. Edge Functions, laboratório e voz

- Produção: 38/38 Edge Functions ACTIVE, todas com gateway JWT desabilitado; os handlers usam token próprio e service role interno.
- Laboratório `upstatus-security-test`: ACTIVE_HEALTHY, 39 migrations, `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.
- Não existe `upstatus-signal` em produção.
- A função de laboratório v32 mapeia `VOICE_ATTEMPT_CONFLICT` para HTTP 409, mas não mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE`; por inspeção, esse código cai no fallback 500. Os logs CI comprovam a resposta do RPC de singleton, não um request HTTP real que valide o mapeamento desse código.
- Nenhuma chamada HTTP manual foi executada nesta rodada.

## 9. Migrations e proveniência

- Supabase production ledger: 7 migrations.
- Diretório `supabase/migrations/` em master: apenas 3 arquivos.
- Quatro entradas do ledger não têm SQL correspondente no diretório canônico: visual config, nome de arquivo de mensagem, MIME types de documentos e limite de upload.
- A branch gerenciada Supabase `main` permanece `MIGRATIONS_FAILED`; preview `ACTIVE_HEALTHY`.
- Statements recuperados de logs/ledger não equivalem aos arquivos originais byte a byte.

**MIGRATION-PROVENANCE permanece bloqueado.** Recuperar os quatro SQLs, validar checksum/origem e reconciliar o histórico antes de novas migrations.

## 10. Issues e aceitação manual

- Issue #78 está aberta com **8/8 critérios de aceitação desmarcados**. Nenhum teste físico de reconexão sem F5, microfone, permissões reais de tela ou interoperabilidade instalada foi executado nesta rodada.
- Issue #79 permanece aberta. O comentário QA existente `6744331652` foi atualizado; o comentário da Engenharia `6744711778` foi preservado. Há um único marcador QA e um único marcador Engenharia.
- CI Chromium não equivale a teste físico no navegador Sale Smartly com Tampermonkey instalado.

## 11. Gates

| Gate | Estado | Evidência |
|---|---|---|
| RT-01 | blocked | Broadcast público instalado; endpoint autenticado ausente em produção |
| TEST-ISOLATION | blocked | TEST v281 ainda usa projeto/API de produção |
| MIGRATION-PROVENANCE | blocked | 3 SQLs no repositório vs 7 no ledger |
| AUTH-03 | blocked | setup sem convite e sessões sem user_id |
| ACL-STORAGE | blocked | grants/default ACL amplos, buckets públicos e zero policies Storage |
| RECONNECT | pending | 8 critérios físicos da Issue #78 sem evidência |
| HUMAN-REVIEW | pending | PRs Draft e sem reviews humanas |

## 12. Próximas ações recomendadas

1. Provisionar ambiente full-product TEST independente; só então planejar substituição/retirada do runtime TEST legado.
2. Implantar `upstatus-signal` em produção com autorização por sessão, sala, membro e destinatário; testar cutover e rollback antes de habilitar flag.
3. Manter #74 como trilha Normal; incorporar a correção updater necessária e revalidar merge ref atualizado. Incrementar a versão antes de qualquer release.
4. Não integrar #158 isoladamente; resolver a regressão de anexos staged sobre a base que contém a implementação completa.
5. Corrigir workflow Team Lite: slug `upstatus-team-lite`, CLI fixa, validação de projeto/SHA e remover o dispatcher legado.
6. Vincular sessões e perfis a `users.id`; eliminar bootstrap por nome e proteger `/api/setup` com convite de uso único e rate limit.
7. Endurecer RLS/grants/Default ACL/SECURITY DEFINER/Storage; limitar privilégios e definir policies por objeto/bucket.
8. Recuperar os quatro SQLs originais e resolver `MIGRATIONS_FAILED`.
9. Corrigir e testar HTTP 409 para `VOICE_ATTEMPT_ALREADY_ACTIVE`.
10. Executar os oito testes físicos da Issue #78 e obter aprovação humana do SHA exato.

## 13. Veredito

**NOT READY.** O CI de #74 e #76 é evidência positiva de qualidade das candidatas, mas não representa o estado instalado. O runtime TEST ainda usa produção, o Realtime instalado continua público, AUTH-03 e identidade por ID não estão implantados, o workflow oficial Team Lite aponta para o slug Normal e a proveniência das migrations não está fechada.

Nenhuma produção foi modificada. Nenhum merge, deploy, release, migration, publicação de userscript ou alteração de secret/flag foi executado. A única escrita desta rodada foi este relatório novo na branch QA e as atualizações do comentário QA existente na Issue #79.
