# Auditoria independente de qualidade — UpStatus
**Data:** 14/11/2026  
**Execução:** 09:45 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## 1. Escopo e método

Foram inspecionados os heads reais, PRs #74, #75, #76, #82 e candidatas relacionadas #85, #124 e #164; workflows e logs de CI; bundles dos userscripts efetivamente embutidos nas Edge Functions implantadas; fontes das funções relevantes; catálogos PostgreSQL; RLS, policies, grants, Default ACL, SECURITY DEFINER, triggers, Realtime, Storage, migrations e inventário de Edge Functions.

As consultas SQL foram exclusivamente `SELECT`/leitura de catálogos. Não foram executados testes manuais no Tampermonkey, chamadas de exploração, uploads reais, broadcasts de teste, migrations, deploys ou alterações de produção. Os resultados de CI são evidência automatizada, não aceitação física.

**Limitação documental:** tentei reler `docs/RELEASE_READINESS.md` na branch QA por leitura integral e por intervalo de linhas. O GitHub connector devolveu o blob SHA `7cfbd70886df42ce790c078c224b19284a632595`, mas conteúdo vazio nas duas tentativas. Portanto, não afirmo ter feito uma nova leitura integral nesta execução. O último checkpoint da Engenharia informa leitura integral desse blob; a auditoria atual utilizou o último relatório QA disponível e revalidou diretamente o código, CI e Supabase. O original não foi alterado.

## 2. Heads e estado das PRs

| Referência | HEAD | Base | Divergência | Estado |
|---|---|---|---|---|
| `master` | `9d40461` | — | — | branch atual |
| `develop` | `6b33e1e` | — | — | branch atual |
| `team-lite-official` | `9065bc1` | — | — | branch atual |
| QA / #82 | `fa658acc` | master `a9288cc` | 302 à frente, 1 atrás | Draft |
| #74 Normal | `dcaf6a0` | master `a9288cc` | 887 à frente, 1 atrás | Draft |
| #75 Team Lite | `7bbf9b9` | team-lite-official | 59 à frente | Draft |
| #76 Team Lite | `83a6cc4` | team-lite-official | 386 à frente | Draft |
| #85 Release guard | `b75707b` | master `a9288cc` | 48 à frente, 1 atrás | Draft |
| #124 Signed upload | `77c9d4c` | develop | 6 à frente | Draft |
| #164 Avatar | `a27ced5` | develop | 30 à frente | Draft |

Todas as PRs listadas continuam abertas e Draft. Não encontrei reviews humanas nas PRs #74, #75, #76, #82, #85, #124 e #164.

### CI por SHA exato

| PR / execução | Resultado | Evidência |
|---|---|---|
| #74 Validate | PASS | [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) |
| #74 Signaling Smoke | PASS | [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| #75 Candidate Checks | PASS histórico | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| #76 Candidate Checks | PASS | [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| #82 Validate | FAIL | [43577155854](https://github.com/Reekyi/UpStatus/actions/runs/43577155854) |
| #85 Validate | PASS | [42475230911](https://github.com/Reekyi/UpStatus/actions/runs/42475230911) |
| #124 Validate | PASS | [42594697302](https://github.com/Reekyi/UpStatus/actions/runs/42594697302) |
| #164 Validate | PASS | [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) |

Contagem desta auditoria: **7 execuções de workflow aprovadas, 1 reprovada e 8 critérios físicos pendentes**. A #75 é evidência histórica no seu SHA atual, não uma nova execução. No Smoke da #74, o passo de rate limit distribuído de emissão de convite foi ignorado; a #76 cobre esse passo e passou.

A #74 confirmou WebRTC de chamada/voz/tela, áudio/vídeo remoto, mesh de três membros e limite de sinalização de 90 aceitas + 1 rejeitada com HTTP 429. A #76 passou 110/110 verificações autenticadas e 16/16 não autenticadas, incluindo Playwright do userscript completo, testes de sala, recuperação, concorrência, convites e rate limit.

### Falha da QA

O Validate da #82 falhou no HEAD `fa658acc`:

`VALIDATION FAILED: production updateURL mismatch`

O builder atual de master constrói o updateURL a partir do endpoint beta10, enquanto o validator exige o endpoint estável `/upstatus/upstatus.user.js`. O manifesto `release.json` já contém `scriptUrl`, mas o builder de master ainda não o utiliza.

A #85 corrige o builder usando `release.scriptUrl` e passou Validate no próprio HEAD. Porém, sua base é `a9288cc`, um commit atrás do master atual `9d40461`; precisa ser reconciliada e revalidada. O PASS da #85 não transfere aprovação ao master nem à #82.

A #82 altera somente documentação: 157 arquivos documentais. Nenhum código de produção foi modificado por esta auditoria.

## 3. Realtime e comportamento dos userscripts

### Runtimes instalados

| Produto | Distribuição | API efetivamente chamada |
|---|---|---|
| Normal | `upstatus` v480, userscript 3.4.7 | `upstatus-screen-share-3-1-1-beta10` v6 |
| Team Lite | `upstatus-team-lite` v15, userscript 3.4.30 | `upstatus-team-lite` v15 |

Os bundles implantados foram decodificados diretamente das Edge Functions. Ambos criam canais Realtime sem `private:true` e sem `realtime.setAuth()`.

Nos runtimes instalados:
- `db_change` aplica o registro recebido com `upsertRealtimeMessage`;
- `chat_fast` e `chat_read` aplicam diretamente os payloads recebidos;
- `remote_command` chama `executeRemoteCommand` quando `command.target` corresponde ao membro local;
- os sinais de chamada, voz e compartilhamento de tela são processados a partir dos broadcasts.

O Normal não autentica o emissor do `remote_command`. O Team Lite verifica a sessão local e a geração de autenticação, mas também não prova a identidade do publicador. O comando pode alterar o status do próprio usuário-alvo por meio da sessão dele. Isso é um caminho de manipulação não autorizada do comportamento do cliente se o publicador tiver permissão de enviar ao canal.

A configuração de Allow public access do Dashboard não ficou disponível. Não foi demonstrada exploração externa, nem se afirma que qualquer origem anônima consegue publicar. O achado é estático: o cliente não verifica assinatura/autorização do emissor e confia no payload recebido pelo canal.

### Melhoria real nos candidatos #74 e #76

Os candidatos já tratam:
- `db_change`, `chat_fast` e `chat_read` como avisos para buscar/reconciliar dados autenticados, em vez de aplicar o payload público;
- `remote_command` como aviso para consultar a fila autenticada, em vez de executar o comando recebido no broadcast.

Isso é uma melhoria concreta no código candidato, mas ainda não está nos runtimes implantados.

### Fallback público ainda ativo por padrão

O transporte autenticado usa `signaling_transport_enabled`, cujo padrão é `false`, e um endpoint configurável que começa vazio. Nos candidatos:
- quando a flag está desligada, chamadas continuam aceitando/enviando `call_signal` pelo Realtime legado;
- voz e compartilhamento de tela continuam usando os handlers públicos nesse modo;
- quando a flag está ligada, os handlers exigem transporte autenticado para os sinais de controle, mantendo apenas avisos públicos de descoberta/estado.

Portanto, os candidatos melhoram chat e comandos remotos, mas **não fecham RT-01 por padrão**. O cutover exige endpoint disponível, configuração explícita, testes e remoção do fallback público. Não há endpoint de sinalização autenticada implantado em produção.

### Tópicos e triggers

Os clientes instalados assinam:

`upstatus-screen-share-live-3-1-1-beta10`

Os triggers PostgreSQL atuais publicam em:

`upstatus-live-6f5e7b31-...`

A divergência significa que os broadcasts gerados pelos triggers no tópico antigo não têm entrega comprovada aos clientes atuais. Isso não torna seguro o tópico beta10: os clientes também enviam broadcasts diretamente nesse canal e confiam em vários payloads recebidos.

Nos últimos 14 dias, foram observados 106 registros `private=false` no tópico dos triggers:
- 72 `user_status`;
- 26 `db_change`;
- 4 `remote_command`;
- 4 `remote_result`.

Esses 106 registros não são prova de que os clientes receberam os eventos, devido à divergência de tópicos.

O trigger `upstatus_broadcast_messages` transmite `to_jsonb(OLD/NEW)`, ou seja, a linha completa da mensagem, em vez de um aviso mínimo. Os triggers de estado remoto e usuários também publicam no tópico legado.

### Endpoint autenticado no laboratório

O laboratório possui `upstatus-signal-test` v32:
- autentica por `x-upstatus-token`, hash da sessão e expiração;
- deriva o remetente no servidor;
- exige membership aceita para os eventos da sala;
- remove campos de identidade fornecidos no payload;
- limita o corpo a 20 KiB;
- aplica 90 escritas/minuto e 240 leituras/minuto, com HTTP 429 e `Retry-After: 60`;
- mantém eventos e salas com expiração.

A identidade ainda é resolvida por `user_name`, não por `users.id`. O helper `upstatus-signal-e2e-once` v3 responde 404. O endpoint `upstatus-signal-test` é exclusivo do laboratório; não existe `upstatus-signal` implantado em produção.

## 4. PostgreSQL, RLS, grants e SECURITY DEFINER

### Produção

Consultas de catálogo confirmaram:
- 10 tabelas do schema `public` com RLS habilitado e sem policies;
- 10 tabelas do schema `storage` com RLS habilitado e sem policies;
- `realtime.messages` com RLS habilitado, sem policies e sem FORCE RLS;
- 92 entradas de ACL diretas por papel (`anon` e também 92 para `authenticated`) em 18 objetos, incluindo 9 privilégios TRUNCATE por papel;
- 120 privilégios em Default ACL, distribuídos em 15 conjuntos e dois papéis proprietários.

O RLS sem policies bloqueia acesso por policy, mas não corrige privilégios desnecessários. TRUNCATE não é protegido por RLS; os grants devem ser removidos após análise de dependências.

`realtime.messages` tem grants SELECT/INSERT/UPDATE para anon e authenticated, mas zero policies. A configuração de canal público é uma camada distinta dos grants SQL; não se afirma que esses grants, isoladamente, permitam publicar em qualquer canal.

### SECURITY DEFINER

Existem três funções de trigger:
- `upstatus_broadcast_messages()`;
- `upstatus_broadcast_remote_state()`;
- `upstatus_broadcast_users()`.

As três são SECURITY DEFINER, têm `search_path=public` e EXECUTE concedido a anon e authenticated. O Security Advisor reporta seis WARN relacionados (três por papel) e dez INFO.

As funções retornam `trigger`; por isso, o alerta do Advisor sobre invocação direta como RPC não é prova de que PostgREST consiga chamá-las como RPC comum. Não foi demonstrada invocação direta. O privilégio amplo continua desnecessário e o search_path deve ser endurecido.

### Laboratório

O laboratório tem 18 tabelas public com RLS sem policies, 96 privilégios Default ACL em 12 conjuntos e dois papéis proprietários. Os grants diretos de cliente foram mais restritos, e as três funções de broadcast usam search_path vazio e não concedem EXECUTE a anon/authenticated. O Security Advisor reporta 18 INFO e nenhum WARN.

O laboratório não deve ser confundido com ambiente Full-Product TEST: não tem usuários, sessões, perfis, mensagens ou buckets de produto.

## 5. Storage e upload de arquivos

### Produção

| Bucket | Público | Limite | Objetos |
|---|---|---:|---:|
| chat-images | Sim | 20 MiB | 168 |
| profile-images | Sim | 20 MiB | 20 |

Não existem policies próprias em `storage.objects`. Os buckets são públicos para leitura.

Os APIs instalados Normal beta10 v6 e Team Lite v15 aceitam `avatarUrl` verificando o prefixo público do bucket, mas não comprovam ownership por `users.id`. O endpoint de upload assinado usa `upsert:true`, tamanho e MIME declarados pelo cliente. O caminho de chat também usa upload assinado direto.

### Candidata #164

No HEAD `a27ced5`, a #164:
- limita o corpo da requisição a 3 MiB antes do parse;
- limita os bytes do avatar a 2 MiB;
- verifica assinaturas JPEG/PNG/GIF/WebP e rejeita MP4 declarado como imagem;
- resolve exatamente um `users.id` pelo nome e deriva prefixo de objeto do ID;
- rejeita URL de avatar fora do prefixo do usuário;
- usa upload server-side com `upsert:false`;
- desativa o antigo endpoint de upload assinado de avatar com HTTP 410;
- mantém upload assinado para chat, com `upsert:false` e validação de origem/token/caminho no cliente.

A candidata passou Validate, mas os testes usam VM e Storage mockado. Não houve upload real. Ainda faltam decoder e re-encode de imagem, limites de dimensões/pixels e validação dos bytes efetivos dos anexos do chat. O upload de chat continua direto, com MIME declarado pelo cliente e sem inspeção server-side da assinatura do arquivo.

A #164 está baseada em develop, não nas linhas oficiais Normal/Team Lite. A correção ainda não chegou aos runtimes implantados.

## 6. Autenticação e identidade

Produção:
- 5 usuários;
- 319 sessões;
- 5 perfis;
- 302 mensagens;
- zero password_hash vazio;
- zero role vazia;
- zero constraint UNIQUE em `users.name`.

`upstatus_sessions` e `upstatus_profiles` usam `user_name`; não há `user_id` nessas relações.

Os handlers de login Normal e Team Lite não têm rate limit de tentativas. O primeiro acesso ainda permite definir senha pelo caminho `setup` sem convite de uso único. O Normal exige senha mínima de 6 caracteres; Team Lite, 4. Há fallback de role administrativa por nome fixo (`Ricardo`, `Lohan`, `Guilherme`) quando a role está ausente.

Produção não tem as estruturas de rate limit de setup-invite ou signaling consultadas. O laboratório tem as tabelas de rate limit e constraint UNIQUE de nome, mas zero usuários/sessões/perfis/mensagens. A rate limit de sinalização não substitui rate limit de login.

O endpoint `upstatus-signal-test` autentica sessão por token hash e `user_name`; não usa identidade imutável por ID.

## 7. Edge Functions

| Projeto | Funções ACTIVE | verify_jwt=false |
|---|---:|---:|
| Produção | 38 | 38 |
| Laboratório | 2 | 2 |

Produção contém 12 nomes com `backup`, 12 com `test` e 23 com `beta` (categorias sobrepostas). Funções relevantes:
- `upstatus` v480 (distribuição Normal);
- `upstatus-screen-share-3-1-1-beta10` v6 (API Normal);
- `upstatus-team-lite` v15;
- `upstatus-test` v281, ainda dentro do projeto de produção.

O laboratório contém `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3. As APIs principais usam autenticação própria por token; `verify_jwt=false` é configuração da plataforma e não prova, isoladamente, que cada rota seja anônima. Ainda assim, 38 funções ativas com verificação JWT da plataforma desligada, incluindo backups e versões antigas, exigem inventário e revisão individual.

## 8. Workflows, branches e publicação

As branches consultadas `master`, `develop` e `team-lite-official` retornam `protected=false`. Não há proteção que imponha reviews ou status checks obrigatórios.

### Master atual

`.github/workflows/deploy-production.yml`:
- manual-only;
- exige versão estável 3.4.7;
- usa CLI `latest`;
- usa `SUPABASE_PROJECT_ID` genérico;
- implanta somente `upstatus`, não a API beta10 chamada pelo userscript.

`.github/workflows/deploy-test.yml`:
- manual-only;
- usa o mesmo secret genérico `SUPABASE_PROJECT_ID`;
- usa CLI `latest`;
- implanta `upstatus-test`.
A função `upstatus-test` está atualmente no projeto de produção, então esse workflow não prova isolamento.

### Candidatas

A #85 melhora o workflow de produção:
- checkout de SHA exato;
- exige master;
- verifica projeto e organização via Management API read-only;
- fixa Supabase CLI 2.122.1;
- exige cutover;
- implanta API beta10 antes de `upstatus`;
- não aplica migrations automaticamente.

Mas a #85 está um commit atrás do master atual. Além disso, `verify-production-cutover.mjs` exige três fontes de migration (`20261107010000_setup_invites.sql`, `20261107060000_normalize_setup_invite_role.sql`, `20261107062000_preserve_setup_invite_roles_verbatim.sql`) que não estão na árvore de migrations do branch master/#85. O preflight real de deploy, se executado nesse branch, falharia. O teste do guard usa fixtures sintéticas e não prova que o repositório atual passa no preflight. Mesmo depois de adicionar os arquivos, o script verifica presença local, não comprova que o schema já foi aplicado em produção.

A #74 tem workflow com projeto e CLI fixados, mas ainda implanta apenas `upstatus`, não beta10. Não implanta endpoint de sinalização de produção.

A #76 melhora `deploy-test.yml` com `SUPABASE_TEST_PROJECT_ID`, rejeita produção e laboratório, fixa CLI 2.122.1 e exige um terceiro projeto. Porém, esse projeto Full-Product TEST não existe e o workflow faz checkout de `develop` por nome, sem conferir explicitamente que o SHA obtido é igual a `GITHUB_SHA`.

Team Lite é servido diretamente pelo raw URL de `team-lite-official`. Essa branch está desprotegida; um push pode alterar o userscript distribuído. O workflow candidato Team Lite executa testes em push/PR, mas não substitui proteção de branch nem é um workflow de deploy do backend Team Lite.

## 9. Migrations e ambientes

| Indicador | Produção | Laboratório |
|---|---:|---:|
| Migrations no ledger | 7 | 39 |
| Usuários/sessões/perfis/mensagens | 5/319/5/302 | 0/0/0/0 |
| Buckets de produto | 2 | 0 |

A árvore `master/supabase/migrations` contém somente três SQLs canônicos. Quatro versões registradas no ledger de produção não têm fonte correspondente em master:
- `20261023154754_create_upstatus_visual_config.sql`;
- `20261026195855_add_chat_message_file_name.sql`;
- `20261027154329_allow_chat_document_mime_types.sql`;
- `20261027155438_set_upstatus_upload_limits_20mb.sql`.

A #74 adiciona novas migrations de convite, signaling e segurança, mas não recupera essas quatro fontes históricas.

A branch Supabase `main` está `MIGRATIONS_FAILED`; o preview aparece `ACTIVE_HEALTHY`. O projeto de laboratório não é Full-Product TEST.

## 10. Aceitação manual e governança

A Issue #78 continua com **0/8 critérios físicos aprovados**. O último checkpoint físico encontrado é de 08/11. Não houve nesta execução teste no Tampermonkey, perda real de internet, reconexão sem F5, microfone, compartilhamento de tela ou interoperabilidade instalada.

A Issue #79 recebeu atualização no comentário dedicado `<!-- UPCONTROL:QA -->`; o comentário da Engenharia foi preservado. O feed contém atividades desta execução e os sete gates revisados.

## 11. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | BLOCKED | Runtimes instalados ainda usam Realtime legado; transporte autenticado opt-in, sem endpoint de produção |
| TEST-ISOLATION | BLOCKED | Não existe terceiro projeto Full-Product TEST |
| MIGRATION-PROVENANCE | BLOCKED | Quatro SQLs do ledger sem fonte canônica |
| AUTH-03 | BLOCKED | Sem rate limit de login, convite de primeiro acesso e identidade por ID em produção |
| ACL-STORAGE | BLOCKED | Grants, Default ACL, SECURITY DEFINER e buckets públicos |
| RECONNECT | PENDING | 0/8 testes físicos; requer confirmação física de Ricardo |
| HUMAN-REVIEW | PENDING | Nenhuma review humana nem autorização explícita de release |

## 12. Prioridades recomendadas

1. Remover a execução de payloads públicos de remote_command, chat e sinalização dos runtimes instalados.
2. Implantar e validar um endpoint de sinalização autenticado em projeto isolado; habilitar o transporte e remover o fallback público antes do release.
3. Alinhar o tópico dos triggers com o cliente e reduzir payloads a avisos mínimos.
4. Portar as correções de chat/remote_command e ownership de avatar para Normal e Team Lite.
5. Completar validação de imagem e anexos; incluir decoder, re-encode e limites de pixels.
6. Implementar AUTH-03 em produção: convite único, rate limit de login, stored-role e identidade por ID.
7. Reconciliar #85 com master, adicionar as migrations requeridas e validar o schema aplicado antes do deploy; não aplicar migrations automaticamente.
8. Criar Full-Product TEST e fixar projeto/SHA no workflow.
9. Remover grants desnecessários, endurecer Default ACL, search_path e Storage após revisão de dependências.
10. Proteger master, develop e team-lite-official com reviews e checks obrigatórios.
11. Executar os oito critérios físicos e obter aprovação humana.

## 13. Segurança e limitações desta execução

- Nenhum merge, deploy, release, migration, publicação de userscript ou alteração de secrets/flags.
- Nenhuma operação destrutiva.
- Todas as consultas SQL foram somente leitura.
- Não houve upload real, broadcast de teste ou exploração.
- Não houve checkout local nem execução local de testes; foram inspecionados logs de CI existentes e fontes remotas.
- O único trabalho de escrita foi este relatório na branch QA e a atualização do comentário QA dedicado na Issue #79.
- O conteúdo de `docs/RELEASE_READINESS.md` não pôde ser recuperado pelo conector nesta execução; o blob SHA foi confirmado, mas o retorno de conteúdo veio vazio. O arquivo original permanece intacto.

**Conclusão: NOT READY.** O CI candidato é útil, mas o runtime instalado continua confiando em broadcasts públicos, o cutover autenticado não está implantado, os controles de autenticação e ACL estão incompletos e a QA ainda falha no Validate.
