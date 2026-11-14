# UpStatus — auditoria independente de QA
**Data:** 14/11/2026 · **janela de inspeção:** aproximadamente 16:29–16:39 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## 1. Escopo, método e limites

Foram feitas inspeções read-only no GitHub e Supabase: branches/commits, PRs, reviews, workflows/jobs/logs, arquivos candidatos, código-fonte das Edge Functions implantadas, migrations, catálogos PostgreSQL, Security/Performance Advisors, Storage e Realtime.

O documento `docs/RELEASE_READINESS.md` foi recuperado integralmente pelo blob GitHub: **1.045.105 caracteres e 8.410 linhas**. O último checkpoint interno continua em **08/11/2026 às 18:30 UTC**. As auditorias de 14/11 estão em arquivos separados; o documento central não foi alterado.

Os userscripts servidos foram decodificados a partir de `USERSCRIPT_BASE64` embutido no código das Edge Functions de produção. A tentativa de fetch HTTP direto dos dois artefatos falhou duas vezes com `target_unreachable`; a inspeção do conteúdo embutido foi concluída via Management API.

**Não houve teste manual**, execução local de suíte, Tampermonkey real, microfone, captura de tela ou queda física de rede. CI citado abaixo é resultado de workflow existente, não execução desta auditoria.

## 2. Heads e integridade do repositório

| Referência | HEAD | Estado observado |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | base estável |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | 147 à frente / 114 atrás de master |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | linha oficial separada |
| QA / PR #82 | `150fd93b546d1fdaf7b7d8af7f20f33643fa9ec5` | 311 à frente / 1 atrás de master |

A PR #82 tem **164 arquivos alterados, todos sob `docs/`**. O único commit master-only observado na comparação é documental. Nenhuma mudança de runtime foi adicionada pela QA nesta rodada.

### PRs obrigatórias

| PR | HEAD | Base | Estado |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a072546eda0089e0cee4018c3047011f600` | master | aberta, Draft |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | team-lite-official | aberta, Draft |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | team-lite-official | aberta, Draft |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `150fd93b546d1fdaf7b7d8af7f20f33643fa9ec5` | master | aberta, Draft |

Não há reviews registradas nas quatro PRs. #76 está 327 commits à frente de #75; ambas são uma pilha sobre Team Lite, não duas aprovações independentes.

As correções de proveniência de sinalização também estão separadas:
- [#133 Normal](https://github.com/Reekyi/UpStatus/pull/133), HEAD `8d38036ead5e1c3c9cc00db9791f8c9de093ba62`, aberta/Draft; 14 commits à frente e 4 atrás da base #74.
- [#149 Team Lite](https://github.com/Reekyi/UpStatus/pull/149), HEAD `77352d2e3b93722d6b69a9eec31a92bb63158230`, aberta/Draft; 10 à frente e 2 atrás da base #76.

Ambas passaram seus workflows específicos, mas estão divergidas das linhas-pai e não estão integradas.

## 3. CI, workflows e testes

| Alvo | Workflow | Resultado | Limite |
|---|---|---|---|
| #74 | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | PASS | candidato Normal |
| #74 | [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS | etapa de rate limit distribuído de emissão de convite foi ignorada |
| #75 | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico | baseline antiga, não substitui #76 |
| #76 | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS | testes automatizados de candidato |
| #82 | [Validate 43610582868](https://github.com/Reekyi/UpStatus/actions/runs/43610582868) | **FAIL** | `production updateURL mismatch` em `scripts/validate.mjs:26` |
| #133 | [Normal API Target 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) e [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | PASS | candidato de proveniência |
| #149 | [Source Guard 43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) e [Candidate Checks 43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232) | PASS | candidato de proveniência |

O Validate #82 foi executado no HEAD exato `150fd93...`. O log confirma build Normal/TEST 3.4.7 seguido de falha de updateURL.

### UpdateURL: diagnóstico refinado

O userscript Normal efetivamente servido tem `@updateURL` e `@downloadURL` corretos, apontando para `/functions/v1/upstatus/upstatus.user.js`. O defeito está no builder de master, não no header já instalado. O builder candidato #74 usa `release.scriptUrl` para a distribuição estável e separa a URL de API.

Há, porém, um problema de coordenação no workflow #74: o build Normal mantém a API em `upstatus-screen-share-3-1-1-beta10`, enquanto `.github/workflows/deploy-production.yml` da candidata publica somente `upstatus`. O workflow não atualiza o backend beta10 que o userscript chama. Existe um workflow de cutover na linha separada #89 que publica beta10 antes de upstatus, mas essa linha está divergida da #74 (94 commits à frente e 887 atrás) e continua Draft; não é uma correção integrada.

### Team Lite

O workflow oficial em `team-lite-official` ainda executa `supabase functions deploy upstatus`, usa Supabase CLI `latest` e não verifica SHA/projeto de destino. O slug correto da linha é `upstatus-team-lite`. O workflow candidato #76 não corrige o workflow oficial de produção. A PR #125 adiciona um dispatcher candidato, mas seu Validate está vermelho ([42598656421](https://github.com/Reekyi/UpStatus/actions/runs/42598656421)); o check do dispatcher isolado passou ([42598656306](https://github.com/Reekyi/UpStatus/actions/runs/42598656306)).

## 4. Normal e Team Lite: instalado versus candidato

As fontes implantadas foram inspecionadas e os userscripts embutidos decodificados:

| Runtime | Função | Versão da função | Userscript embutido | SHA da fonte |
|---|---|---:|---:|---|
| Normal | `upstatus` | v480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| Team Lite | `upstatus-team-lite` | v15 | 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |

### Realtime instalado

Nos dois userscripts instalados:
- `realtimeClient.channel(UP_REALTIME_TOPIC)` é criado sem `private: true`.
- Não há `realtime.setAuth()`.
- O tópico é `upstatus-screen-share-live-3-1-1-beta10`.
- O listener público `remote_command` chama `executeRemoteCommand` diretamente.
- Team Lite valida a sessão local e a geração de autenticação, mas isso não autentica o emissor do broadcast.

O Normal aponta sua API para `upstatus-screen-share-3-1-1-beta10`; Team Lite aponta para `upstatus-team-lite`. O updateURL Normal instalado é estável; Team Lite aponta para o artefato raw da branch oficial.

### Realtime candidato

#74 e #76 melhoram o comando remoto: o broadcast vira apenas um aviso e o cliente consulta a fila autenticada. Os builders candidatos também usam `PROD_TOPIC = upstatus-live-6f5e7b31-...`, que coincide com o tópico dos triggers do banco; os artefatos instalados ainda usam o tópico antigo.

Há outro bypass nos candidatos #74/#76: `receiveCallSignal` confia em `_authenticatedTransport` dentro do próprio payload. Um publicador pode forjar esse campo. As PRs #133/#149 corrigem a proveniência fora do payload:
- evento público chama `receiveCallSignal(payload, false)`;
- polling autenticado chama `receiveCallSignal(payload, true)`.

Essas correções passaram seus checks específicos, mas permanecem em branches divergidas e Draft. Não devem ser tratadas como integradas.

### Sinalização server-mediated incompleta

O helper `src/userscript/signaling-transport.mjs` usa token de sessão em `x-upstatus-token` e espera rotas como `/signal`, `/broadcast` e `/room/create`. O recurso permanece opt-in:
- `signaling_transport_enabled` default false;
- endpoint configurável começa vazio;
- com a flag desligada, os listeners públicos de voz e compartilhamento continuam ativos;
- a flag ligada não resolve a ausência do backend correspondente nos templates de produção.

Os templates `src/server/index.template.ts` e `src/server/team-lite-index.template.ts` não implementam as rotas server-mediated. A única função com esse contrato é `upstatus-signal-test` v32 no laboratório. O cliente ainda exige que o endpoint de sinalização tenha a mesma origem do servidor de sessão; portanto não pode simplesmente apontar o usuário de produção para o host do laboratório.

**Conclusão RT-01:** o transporte autenticado não está pronto para cutover em nenhuma das duas linhas. O caminho público legado permanece funcional e sensível.

## 5. Realtime e PostgreSQL

### Eventos observados

Nos últimos 14 dias, `realtime.messages` registrou 106 eventos, todos `private=false`, no tópico dos triggers:

| Evento | Quantidade |
|---|---:|
| `user_status` | 72 |
| `db_change` | 26 |
| `remote_result` | 4 |
| `remote_command` | 4 |

Primeiro evento: 10/11/2026 12:23 UTC. Último: 13/11/2026 20:52 UTC.

O tópico dos triggers é `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, diferente do tópico dos clientes instalados. Os candidatos alinham o tópico do build ao banco, mas ainda não foram publicados.

### RLS, grants e funções

- Dez tabelas de `public` têm RLS habilitado e zero policies; FORCE RLS está desligado.
- Nove dessas tabelas concedem a `anon` e `authenticated` sete privilégios cada: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. Total: 126 linhas de grants diretos.
- TRUNCATE não é filtrado por RLS; os 18 grants TRUNCATE (nove tabelas × dois papéis) precisam de revisão prioritária.
- `realtime.messages`: RLS true, FORCE false, zero policies; anon/authenticated têm SELECT, INSERT e UPDATE.
- Default ACL: 24 definições e 300 entradas ACL expandidas no total. Anon e authenticated têm 60 entradas cada em graphql, graphql_public, public e storage. Nem todas as entradas são grants de objetos atuais; separar defaults de privilégios efetivos é necessário.

Três funções SECURITY DEFINER de broadcast:
- `public.upstatus_broadcast_messages()`
- `public.upstatus_broadcast_remote_state()`
- `public.upstatus_broadcast_users()`

Todas usam `search_path=public`, retornam `trigger` e têm EXECUTE para anon/authenticated. O Security Advisor registra três WARN para anon e três para authenticated. Como o retorno é `trigger`, a alegação de invocação direta via PostgREST não foi demonstrada; os grants continuam desnecessários e devem ser revistos/revogados com owner autorizado.

Security Advisor: 10 INFO de RLS sem policy e 6 WARN associados às três funções. Performance Advisor: zero findings.

## 6. Edge Functions, AUTH-03 e Storage

### Edge Functions e migrations

| Projeto | Edge Functions ACTIVE | Migrations |
|---|---:|---:|
| Produção | 38 | 7 |
| Laboratório | 2 | 39 |

Produção:
- `upstatus` v480;
- `upstatus-screen-share-3-1-1-beta10` v6;
- `upstatus-team-lite` v15;
- `upstatus-test` v281 e várias variantes antigas/backup.

As 38 funções reportam `verify_jwt=false` no nível da plataforma. Isso não prova ausência de autenticação: os handlers principais usam token próprio; é necessária revisão por rota.

Laboratório:
- `upstatus-signal-test` v32;
- `upstatus-signal-e2e-once` v3.

A função isolada valida token de sessão customizado, membership, destinatário, TTL e rate limit. Seu limite de corpo é 20 KiB; o código define 90 eventos/minuto e 240 leituras/minuto. Isso é evidência de protótipo isolado, não de produção.

A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

### AUTH-03

Produção tem cinco usuários, 319 sessões e cinco perfis; zero hashes vazios e zero nomes duplicados no snapshot.

A consulta de catálogo confirmou:
- sem colunas `setup_token_*`;
- sem RPC `consume_upstatus_setup_invite`;
- sem tabela `upstatus_auth_rate_limits`;
- `upstatus_sessions` e `upstatus_profiles` sem `user_id`.

Os runtimes instalados ainda expõem o fluxo legado `GET /api/account`, `POST /api/setup` e `POST /api/login`. Os templates candidatos têm setup-invite, mas a infraestrutura de produção ainda não foi migrada.

### Storage e upload

Buckets de produção:

| Bucket | Público | Limite | Objetos |
|---|---|---:|---:|
| `chat-images` | sim | 20 MiB | 168 |
| `profile-images` | sim | 20 MiB | 20 |

Não há policies próprias em `storage.objects`.

Diferenças encontradas nos runtimes:
- Normal `profileRoute`: valida bytes/MIME por assinatura e limita avatar a 2 MiB.
- Team Lite `profileRoute`: aceita qualquer URL com prefixo do bucket público `profile-images`, sem comprovar ownership do objeto; upload via data URL aceita até 20 MiB.
- `signedUploadRoute` nas duas linhas confia no MIME/tamanho declarados pelo cliente e cria signed upload URL com `upsert:true`; não há verificação server-side dos bytes finais nesse fluxo.
- `uploadFile` faz sniff de bytes, verifica tamanho e usa `upsert:false`.
- Normal `mediaRoute` aceita imagem até 25 MiB, mas o bucket está limitado a 20 MiB; arquivos entre 20 e 25 MiB podem passar pela validação da função e falhar no Storage.

As candidatas #157 (Team Lite) e #164 (Normal) melhoram ownership/validação de avatar, mas não estão integradas aos runtimes instalados e não resolvem todos os anexos assinados do chat.

## 7. Migrations recuperadas

A PR [#135](https://github.com/Reekyi/UpStatus/pull/135) arquiva quatro statements recuperados do ledger. Comparei cada arquivo com `supabase_migrations.schema_migrations.statements` em produção, por versão. **Os quatro conteúdos coincidem exatamente**:
1. `20261023154754_create_upstatus_visual_config.sql`
2. `20261026195855_add_chat_message_file_name.sql`
3. `20261027154329_allow_chat_document_mime_types.sql`
4. `20261027155438_set_upstatus_upload_limits_20mb.sql`

O gate de recuperação/proveniência dos statements pode ser considerado concluído. Isso não transforma os arquivos em migrations executáveis: continuam arquivados em `docs/migration-recovery/`, não foram movidos para `supabase/migrations/` e nenhum foi executado nesta auditoria.

## 8. Issues, aceitação física e aprovação

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, **0/8** critérios físicos marcados.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, **16/35** itens marcados.

Pendente:
- reconexão física sem F5 em Normal e Team Lite;
- Tampermonkey real com perfis separados;
- microfone, áudio bidirecional e permissões;
- captura real de tela/aba;
- interoperabilidade Normal ↔ Team Lite nos dois sentidos;
- aprovação humana das PRs e autorização explícita de release.

Nenhum desses testes manuais foi executado nesta rodada.

## 9. Gates e próximos passos

| Gate | Estado QA | Evidência/razão |
|---|---|---|
| RT-01 | **blocked** | Realtime público; provenance spoofável em #74/#76; #133/#149 não integradas; backend ausente em produção |
| TEST-ISOLATION | **blocked** | laboratório sem usuários, sessões, perfis, buckets, objetos ou mensagens Realtime |
| MIGRATION-PROVENANCE | **done** | quatro arquivos comparados exatamente com os statements do ledger |
| AUTH-03 | **blocked** | produção sem setup tokens, RPC de convite e rate limit |
| ACL-STORAGE | **blocked** | RLS sem policies, grants amplos, Default ACLs e buckets públicos |
| RECONNECT | **pending** | Issue #78 0/8; sem teste físico |
| HUMAN-REVIEW | **pending** | PRs obrigatórias sem reviews; sem autorização de Ricardo |

Prioridades:
1. Integrar #133/#149 nas linhas-pai, eliminar proveniência vinda do payload e reexecutar os testes completos.
2. Implementar as rotas server-mediated nos dois backends de produção; validar sessão, membership, destinatário, replay, expiry e rate limit.
3. Tornar a sinalização autenticada o caminho padrão e remover os listeners públicos sensíveis, não apenas deixá-los atrás de flag opt-in.
4. Alinhar tópicos, endpoints de API e workflows: Normal precisa coordenar beta10 antes de distribuição; Team Lite precisa publicar `upstatus-team-lite` com SHA/projeto/CLI fixados.
5. Aplicar AUTH-03 somente após revisão e autorização separada.
6. Remover grants desnecessários, revisar Default ACL e proteger Storage/ownership/bytes.
7. Provisionar Full-Product TEST separado e executar testes físicos.
8. Obter reviews humanas e autorização explícita antes de qualquer release.

## 10. Registro de segurança desta execução

- Todas as consultas SQL foram SELECT-only.
- Não houve escrita em produção, migrations, grants, policies, ACLs, secrets ou flags.
- Não houve merge, deploy, release, publicação de userscript ou operação destrutiva.
- Nenhum workflow foi iniciado ou repetido manualmente pela auditoria.
- A única escrita documental desta rodada é este novo relatório na branch QA; `docs/RELEASE_READINESS.md` foi preservado.
- O comentário dedicado QA da Issue #79 foi atualizado; o comentário da Engenharia não foi alterado.

**Conclusão: NÃO LIBERAR.** O CI dos candidatos é promissor, mas o código instalado ainda não recebeu as correções críticas; o transporte autenticado não possui backend de produção; e a validação da QA continua vermelha.
