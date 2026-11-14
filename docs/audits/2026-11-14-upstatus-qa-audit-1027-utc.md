# Auditoria independente de qualidade — UpStatus

**Data:** 14/11/2026 10:39:00 UTC  
**Execução:** revalidação após o checkpoint de 09:45 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## 1. Escopo e método

Revalidei heads e metadados das PRs #74, #75, #76 e #82; PRs relacionadas #85, #124 e #164; Issues #78 e #79; workflows e logs de CI; o documento consolidado de prontidão; bundles dos userscripts realmente servidos pelas Edge Functions; fontes de Edge Functions; catálogos PostgreSQL, RLS, policies, grants, Default ACL, SECURITY DEFINER, triggers, Realtime, Storage, migrations e inventário de funções.

O documento `docs/RELEASE_READINESS.md` foi lido integralmente pelo blob Git: **8.410 linhas, 1.045.105 caracteres**, blob SHA `7cfbd70886df42ce790c078c224b19284a632595`. O checkpoint consolidado mais recente dentro dele é **14/11/2026 às 09:45 UTC**. O presente relatório complementa aquele checkpoint sem substituir o arquivo original.

As consultas SQL foram somente SELECT e leitura de catálogos. Não executei testes manuais, exploração, upload real, broadcast de teste, migration, deploy, merge ou publicação. Não há checkout local do repositório neste ambiente; a única escrita documental desta execução é este novo arquivo na branch QA e a atualização do comentário QA já existente na Issue #79.

## 2. Heads reais e estado das PRs

| Referência | HEAD observado | Estado |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | Base atual |
| QA / #82 | `b6de882a69030f55deec7dcc7d76cf49be88ad02` | Open / Draft |
| `develop` | `6b33e1e26ad105143f00372ae6d0f2fa52df60d6` | Base de #124/#164 |
| `team-lite-official` | `9065bc1` | Base oficial Team Lite |
| #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` | Open / Draft |
| #75 Team Lite | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft; baseline histórica |
| #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | Open / Draft |
| #85 release/cutover | `b75707b6eaf678d87863144748b9aed8e2866455` | Open / Draft |
| #124 signed upload | `77c9d4c3b525325996db973cbec609ae2ddb0d83` | Open / Draft |
| #164 avatar server-mediated | `a27ced56564f3d18948c70138f6d6b2a1f2d0907` | Open / Draft |

A comparação atual de QA com master retorna **303 commits à frente e 1 atrás**. A #82 tem 158 arquivos alterados e todos os caminhos do diff são `docs/`; não encontrei alteração de runtime nessa branch. O HEAD de #82 permaneceu `b6de882` durante a revalidação.

Não há reviews humanas registradas nas PRs obrigatórias #74, #75, #76 e #82.

## 3. CI: resultados por HEAD

| PR / execução | Resultado observado | Interpretação |
|---|---|---|
| [#74 Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | PASS | Build/validator no HEAD #74 |
| [#74 Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS | Integração autenticada, sinalização, read receipts e consumo atômico de convite |
| [#75 Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico | Baseline anterior; não substitui #76 |
| [#76 Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS | Browser/Playwright, helper autenticado isolado, recuperação de voz/tela, rate limits e fixtures |
| [#82 Validate 43581770984](https://github.com/Reekyi/UpStatus/actions/runs/43581770984) | **FAIL** | `production updateURL mismatch` no HEAD b6de882 |
| [#85 Validate 42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) | PASS | Correção candidata do builder; não integrada |
| [#124 Validate 42594697302](https://github.com/Reekyi/UpStatus/actions/runs/42594697302) | PASS | Não prova segurança do Storage real |
| [#164 Validate 43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) | PASS | Testes de avatar com mocks; não prova Storage real |

Na Smoke da #74, a etapa **“Verify distributed setup-invite issuance rate limit” foi SKIPPED**. O consumo atômico de convite passou, mas isso não equivale a rate limit de emissão. A #76 passou também a etapa de rate limit distribuído de emissão.

O log da #82 confirma que o build terminou como `UpStatus 3.4.7 / TEST 3.4.7` e falhou em `scripts/validate.mjs:26` com `production updateURL mismatch`. O checkout do workflow foi o merge ref `58b4bd31`; o HEAD da PR continua `b6de882`.

### Causa do Validate da QA

Em master, `scripts/build.mjs` monta o updateURL de produção a partir do endpoint beta10. Já `scripts/validate.mjs` exige `/upstatus/upstatus.user.js`. O `release.json` contém o endereço estável correto, mas o builder de master não usa `release.scriptUrl`.

A #85 contém uma correção candidata que lê `release.scriptUrl` e passou no Validate. Ela permanece Draft e não foi integrada. Seu preflight de cutover exige versão estável superior a 3.4.7, alinhamento de distribuição/API, AUTH-03 e as migrations de enrollment; o `release.json` da candidata ainda está em 3.4.7. O guard falha fechado, portanto não há cutover aprovado.

## 4. Runtimes realmente implantados

Produção está `ACTIVE_HEALTHY`, com 38 Edge Functions ACTIVE. Todas reportam `verify_jwt=false` na plataforma. Isso, isoladamente, não prova ausência de autenticação: os handlers principais usam token próprio do UpStatus. A revisão precisa continuar sendo feita por rota.

| Função de produção | Versão | Papel |
|---|---:|---|
| `upstatus` | v480 | Distribui o userscript Normal 3.4.7 |
| `upstatus-screen-share-3-1-1-beta10` | v6 | API usada pelo Normal instalado |
| `upstatus-team-lite` | v15 | API e userscript Team Lite 3.4.30 |
| `upstatus-test` | v281 | TEST ainda dentro do projeto de produção |

O bundle servido por `upstatus` v480 contém o Normal 3.4.7 e aponta `CLOUD_SERVER` para beta10, com tópico `upstatus-screen-share-live-3-1-1-beta10`. O bundle servido por `upstatus-team-lite` v15 contém Team Lite 3.4.30 e usa o mesmo tópico.

A função beta10 v6 também contém um artefato de userscript embutido antigo que aponta para beta8. A distribuição oficial atual do Normal é `upstatus` v480; o artefato embutido na API beta10 é uma fonte adicional de drift e deve ser reconciliado para evitar instalações manuais pelo endpoint legado.

O laboratório está `ACTIVE_HEALTHY` e tem apenas duas Edge Functions ACTIVE:
- `upstatus-signal-test` v32.
- `upstatus-signal-e2e-once` v3.

Nenhuma função de sinalização server-mediated equivalente está implantada em produção.

## 5. Realtime: risco e divergência funcional

### Código instalado

Os bundles efetivamente servidos por Normal e Team Lite criam canais com a publishable key, sem `private:true` e sem `realtime.setAuth()`.

- Normal: o listener `remote_command` encaminha o payload recebido para `executeRemoteCommand` quando o alvo corresponde ao membro local; não valida o emissor.
- Team Lite: verifica que a própria sessão local está autenticada e que a geração de sessão continua atual, mas não comprova a identidade do publicador.
- Ambos mantêm listeners para sinalização de chamada, voz e compartilhamento de tela em canais públicos; os handlers fazem validação estrutural de campos, não uma prova de identidade/membership emitida pelo servidor.

O setting de Dashboard `Allow public access` não está exposto pelo conector. Não executei broadcast, injeção de SDP/ICE, exploração ou captura de áudio/tela. Assim, o risco de spoofing é confirmado estaticamente, mas a exploração externa não foi reproduzida.

### Candidatas #74 e #76

As candidatas melhoram o comando remoto: o broadcast público passa a ser um wake-up hint e o cliente consulta o estado por endpoint autenticado. Isso reduz o risco de executar diretamente o payload recebido.

Entretanto, o transporte autenticado de voz/tela continua opt-in:
- `signaling_transport_enabled` inicia como `false`.
- `signaling_transport_endpoint` inicia vazio.
- Com a flag desligada, o fallback público legado continua ativo.
- O adapter envia o token da sessão em `x-upstatus-token`, mas os templates Normal e Team Lite não implementam as rotas que o adapter chama (`/room/*`, `/signal`, `/broadcast`, `/poll`, `/ack`).
- As rotas correspondentes existem somente no helper de laboratório `upstatus-signal-test` v32.

Logo, ainda não há endpoint de sinalização autenticada pronto para ativação em produção. Não se deve apontar clientes de produção para o projeto de laboratório.

### Divergência de tópicos dos triggers

Consulta SELECT atual em `realtime.messages` retornou **106 mensagens**, todas `private=false`, no tópico:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

| Evento | Linhas |
|---|---:|
| `user_status` | 72 |
| `db_change` | 26 |
| `remote_command` | 4 |
| `remote_result` | 4 |

Os clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`, que não coincide com o tópico dos triggers. Portanto, as 106 linhas observadas não provam entrega aos clientes atuais; a divergência também pode quebrar notificações de chat/status e o wake-up de comandos.

O trigger `upstatus_broadcast_messages` envia `to_jsonb(OLD/NEW)` completo no evento `db_change`. O trigger `upstatus_broadcast_remote_state` publica os campos de comando/resultado. O trigger `upstatus_broadcast_users` publica estado do usuário. Os três usam `private=false`.

## 6. PostgreSQL, RLS, grants, SECURITY DEFINER e Storage

Snapshot read-only atual de produção:

- Dez tabelas públicas com RLS habilitado e zero policies.
- Nove tabelas públicas com grants efetivos amplos para anon/authenticated.
- 126 grants diretos no schema public; 18 concessões TRUNCATE (9 tabelas × 2 papéis). RLS não protege TRUNCATE.
- 120 entradas Default ACL amplas.
- `realtime.messages`: RLS true, FORCE RLS false, zero policies, sete partições; anon/authenticated possuem SELECT/INSERT/UPDATE.
- Zero policies próprias em `storage.objects`.
- Três funções `upstatus_broadcast_*` SECURITY DEFINER, `search_path=public`, EXECUTE efetivo para anon/authenticated; todas retornam `trigger` e estão anexadas a triggers. Não foi demonstrada invocação direta via PostgREST; os grants são excessivos e o broadcast público é o risco concreto.

Buckets de produção:

| Bucket | Objetos | Público | Limite |
|---|---:|---|---:|
| `chat-images` | 168 | Sim | 20 MiB |
| `profile-images` | 20 | Sim | 20 MiB |

O Security Advisor de produção retorna 6 WARN e 10 INFO. O aviso de EXECUTE para as funções trigger-returning não prova que sejam RPCs comuns; não classifiquei isso como invocação direta demonstrada.

Laboratório:
- 18 tabelas públicas, todas com RLS e zero policies; não há grants diretos de tabela para anon/authenticated.
- `realtime.messages` sem linhas, RLS true, zero policies; grants SELECT/INSERT/UPDATE continuam.
- Zero buckets Storage e zero objetos de produto.
- Security Advisor: 0 WARN / 17 INFO; Performance Advisor: 4 INFO de índices não utilizados.
- Três funções de broadcast no laboratório têm `search_path` vazio e EXECUTE revogado para anon/authenticated, ao contrário da produção.

## 7. Uploads, avatar e compatibilidade Normal/Team Lite

### Runtimes instalados

Normal e Team Lite usam upload assinado direto para avatar e anexos. O cliente valida MIME pelo `File.type` ou extensão e tamanho declarado, solicita ticket ao servidor e faz PUT ao Storage com `x-upsert:true`. O servidor cria a URL assinada com `upsert:true`. O Storage público recebe os bytes sem inspeção server-side.

A rota de perfil aceita URL pública do bucket `profile-images`, mas não comprova que o objeto pertence ao usuário autenticado. A validação de prefixo/bucket não equivale a ownership por `users.id`.

### PR #124

O Validate passou, mas a inspeção do cliente e servidor confirmou:
- `resolveFileMime` confia em MIME declarado/extensão.
- O cliente envia `x-upsert:true`.
- O servidor emite signed URL com `upsert:true`.
- O servidor não inspeciona os bytes depois do PUT.
- A associação de avatar não prova ownership pelo ID.

Não integrar #124 como substituta segura da #164 sem corrigir overwrite, validação de conteúdo e ownership.

### PR #164

A candidata de avatar é materialmente melhor:
- Limite do corpo antes do parse: 3 MiB.
- Limite de bytes do avatar: 2 MiB.
- Verificação de assinatura JPEG/PNG/GIF/WebP.
- MP4 declarado como imagem é rejeitado.
- Caminho vinculado ao ID do usuário.
- Upload com `upsert:false`.
- Endpoint antigo de upload assinado de avatar retorna 410.

Limitações restantes:
- Sem decoder/re-encodificação integral da imagem.
- Sem limite de dimensões/pixels.
- Sem teste contra Storage real.
- Não está portada para Team Lite.
- Anexos do chat continuam no fluxo assinado direto e não recebem a mesma validação.

## 8. AUTH-03 e identidade

Produção:
- Sete migrations no ledger.
- Cinco usuários.
- Zero password hashes vazios e zero papéis vazios.
- Zero colunas `setup_token_*`.
- RPC `consume_upstatus_setup_invite` ausente.
- Sessões/perfis continuam vinculados por nome, não por ID imutável; `users.name` não tem constraint UNIQUE.
- Os runtimes instalados ainda permitem primeiro acesso sem convite único e não possuem rate limit de tentativas de login nos handlers inspecionados.

Candidatas:
- #74 implementa consumo atômico de convite, mas a etapa de rate limit de emissão foi SKIPPED no Smoke.
- #76 implementa rate limit distribuído de emissão (5 por 900 segundos) e passou no teste correspondente.
- Isso não equivale a rate limit de login/senha e nada disso está implantado em produção.

Laboratório tem 39 migrations, quatro colunas `setup_token_*` e a RPC `consume_upstatus_setup_invite`; permanece sem usuários/fixtures de produto.

## 9. Migrations, branches Supabase e TEST

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Migrations remotas | 7 | 39 |
| Edge Functions ACTIVE | 38 | 2 |
| Buckets de produto | 2 | 0 |
| Usuários/fixtures | 5 | 0 |

Master contém apenas três fontes SQL canônicas para o histórico original. Quatro migrations aplicadas em produção continuam sem suas fontes originais versionadas:
- `20261023154754_create_upstatus_visual_config.sql`
- `20261026195855_add_chat_message_file_name.sql`
- `20261027154329_allow_chat_document_mime_types.sql`
- `20261027155438_set_upstatus_upload_limits_20mb.sql`

A branch Supabase gerenciada `main` permanece `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`. O histórico da Issue #79 registra o erro `Remote migration versions not found in local migrations directory`. Não reconstruir SQL ausente a partir do schema atual e não aplicar migrations automaticamente em produção.

O projeto de laboratório é signaling/auth fixture, não Full-Product TEST. Não possui buckets, usuários, mensagens ou dados completos de chat. O `upstatus-test` v281 continua dentro do projeto de produção.

## 10. Workflows de publicação

- Master `deploy-production.yml`: CLI `latest`, sem validação explícita de projeto/SHA, deploya somente `upstatus`; não coordena a atualização da API beta10.
- #85 candidata: fixa CLI 2.122.1, valida projeto e SHA, executa preflight e publica beta10 antes de `upstatus`; continua Draft e o guard exige versão estável superior a 3.4.7 e migrations de AUTH-03.
- Team Lite oficial: `deploy-production.yml` ainda executa `supabase functions deploy upstatus`, em vez de `upstatus-team-lite`; usa CLI `latest` e não valida projeto/SHA. **Não despachar.**
- Master e Team Lite oficial `deploy-test.yml` usam `SUPABASE_PROJECT_ID` genérico e CLI `latest`, sem guarda explícita contra produção.
- #76 candidata melhora o deploy TEST com `vars.SUPABASE_TEST_PROJECT_ID`, rejeita explicitamente produção e o laboratório signaling/auth e fixa CLI 2.122.1. O projeto Full-Product TEST ainda não existe.

## 11. Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos marcados. Reconexão Normal/Team Lite sem F5, microfone real, compartilhamento real e interoperabilidade instalada continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): corpo com 16 itens marcados e 19 pendentes.
- Não executei teste manual no Tampermonkey, microfone, captura de tela, queda/retorno de rede ou reconexão sem F5. Os resultados citados neste relatório são CI ou inspeção estática/SQL.

## 12. Gates e recomendação

**NOT READY.** Nenhum gate de release foi concluído nesta execução.

1. **RT-01 — bloqueado:** construir endpoint server-mediated em ambiente isolado, autenticar token/sessão, validar membership/destinatário, replay/expiry e rate limit; alinhar tópico de triggers e clientes; remover o fallback público somente após E2E físico.
2. **TEST-ISOLATION — bloqueado:** provisionar Full-Product TEST independente com Storage, usuários, dados e Edge Functions próprios.
3. **MIGRATION-PROVENANCE — bloqueado:** recuperar as quatro fontes SQL originais e reconciliar ledger sem sintetizar migrations.
4. **AUTH-03 — bloqueado:** primeiro acesso com convite único, rate limit de login, identidade por ID e roles persistidas em produção.
5. **ACL-STORAGE — bloqueado:** revisar grants, Default ACL, SECURITY DEFINER e decidir buckets privados; validar conteúdo de uploads antes de publicar.
6. **RECONNECT — pendente:** executar os oito critérios físicos de #78 em Normal e Team Lite; não considerar CI como substituto.
7. **HUMAN-REVIEW — pendente:** obter reviews e autorização explícita antes de release.

Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL ou operação destrutiva. As consultas SQL foram SELECT-only. Não executei testes manuais nem reruns de CI.
