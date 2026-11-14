# Auditoria independente de qualidade — UpStatus
**Data:** 14/11/2026, 05:40 UTC (02:40 BRT)  
**Repositório:** Reekyi/UpStatus  
**Supabase produção:** dlfvkawaiqduhlazsszm  
**Resultado:** NOT READY

## Escopo e método

Revalidação read-only dos heads, PRs #74, #75, #76 e #82, Issues #78 e #79, workflows, testes, templates Normal/Team Lite, runtimes efetivamente implantados, RLS, grants, Default ACL, SECURITY DEFINER, Realtime, Storage, Edge Functions e migrations.

As consultas SQL executadas foram SELECT-only. Os resultados de CI foram lidos dos runs existentes; nenhum workflow foi iniciado ou repetido manualmente. Não houve teste físico no Tampermonkey, queda real de rede, microfone ou captura de tela.

## Heads reais e divergência

| Referência | HEAD |
|---|---|
| master | a9288ccfcb0f308d3a587bfca624418a395be07b |
| QA / PR #82 | 567eee34f93e14c259f33d297a3a318237e5b3cf |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |
| develop | 6b33e1e26ad105143f00372ae6d0f2fa52df60d6 |
| PR #74 | dcaf6a072546eda0089e0cee4018c3047011f600 |
| PR #75 | 7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309 |
| PR #76 | 83a6cc4503ddc01254f6a2abbcc7af5c6803eb94 |

Comparações consultadas:
- QA está 297 commits à frente e zero atrás de master; os 153 arquivos alterados no PR #82 estão todos em docs/.
- #74 está 887 commits à frente e zero atrás de master, com 90 arquivos alterados.
- #76 está 386 commits à frente e zero atrás de team-lite-official.
- #76 está 327 commits à frente de #75, sem commits atrás.

A branch QA não precisou de rebase nesta rodada. O novo relatório foi criado como arquivo separado, sem editar ou substituir RELEASE_READINESS.md.

## Documento de prontidão

Li integralmente docs/RELEASE_READINESS.md na branch QA:
- 8.410 linhas;
- 1.045.105 caracteres;
- último checkpoint técnico registrado: 08/11/2026, 18:30 UTC.

O documento está desatualizado em relação aos heads e runtimes consultados em 14/11. Seu conteúdo original foi preservado.

## PRs, CI e reviews

| PR | HEAD | Resultado observado |
|---|---|---|
| #74 Normal | dcaf6a0 | Validate e Smoke PASS |
| #75 Team Lite | 7bbf9b9 | PASS histórico |
| #76 Team Lite | 83a6cc4 | Candidate Checks PASS |
| #82 QA | 567eee3 | Validate FAIL |

### #74 Normal

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/43376770142
- Smoke: https://github.com/Reekyi/UpStatus/actions/runs/43376770200
- 136/136 verificações autenticadas e 19/19 não autenticadas.
- O Smoke exercitou negociação WebRTC de chamada, voz e tela, entrega de tracks remotas, mesh de três participantes, recuperação de sala, rate limit distribuído (90 aceitas e uma HTTP 429), concorrência e limpeza das fixtures.
- O passo de teste distribuído de rate limit de emissão de convites foi SKIPPED; o harness correspondente também foi ignorado. Portanto, o PASS da #74 não comprova esse controle.

### #75 Team Lite

- Run histórico: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- PASS histórico no HEAD informado.
- A #75 tem 59 commits e 10 arquivos alterados; está superada pela linha mais recente #76 e não substitui a validação exata da #76.

### #76 Team Lite

- Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43363871881
- 110/110 verificações autenticadas e 16/16 não autenticadas.
- Inclui Playwright com userscript completo e stubs de Tampermonkey, negociação WebRTC de chamada/voz/tela, mesh, recuperação, concorrência, rate limit de sinalização, consumo atômico de convite e rate limit distribuído de emissão de convites.
- O teste de emissão de convites passou nesta candidata. Não existe, porém, rate limit de tentativas de login.

### #82 QA

- Validate: https://github.com/Reekyi/UpStatus/actions/runs/43557257226
- Falhou no HEAD exato 567eee34 com: VALIDATION FAILED: production updateURL mismatch.
- A comparação de commits confirma 153 arquivos alterados, todos dentro de docs/. A falha é do build/validator herdado de master, não de um teste manual ou de runtime.

Nenhuma review humana foi encontrada em #74, #75, #76 ou #82. Todas permanecem abertas e Draft.

## Correção importante sobre o endpoint Normal

A auditoria anterior classificou incorretamente o contrato de avatar do Normal ao comparar o cliente com a função de distribuição v480.

A inspeção do userscript embutido confirmou:
- A função upstatus v480 é o endpoint de distribuição do userscript 3.4.7.
- O userscript Normal chama a API em upstatus-screen-share-3-1-1-beta10.
- A função API beta10 v6 aceita avatarUrl no profileRoute.

Portanto, o contrato efetivamente chamado pelo Normal é compatível. A alegação anterior de incompatibilidade cliente/backend Normal não se sustenta e fica corrigida neste relatório.

O risco real é outro: beta10 v6 valida somente o prefixo público do bucket profile-images, sem vincular o caminho ao users.id autenticado.

## Runtimes efetivamente implantados

| Função | Versão | Papel observado |
|---|---:|---|
| upstatus | v480 | Distribuição do userscript Normal 3.4.7 |
| upstatus-screen-share-3-1-1-beta10 | v6 | API Normal chamada pelo userscript |
| upstatus-team-lite | v15 | API Team Lite; userscript 3.4.30 |
| upstatus-test | v281 | TEST legado dentro do projeto de produção; userscript 3.3.28 |
| upstatus-signal-test (laboratório) | v32 | Helper de sinalização isolado |
| upstatus-signal-e2e-once (laboratório) | v3 | Helper E2E isolado |

Produção tem 38 Edge Functions ACTIVE; todas reportam verify_jwt=false no nível da plataforma. Isso não prova, isoladamente, ausência de autenticação: os handlers principais implementam token próprio. O ponto de controle é revisar autorização por rota, sobretudo login/setup e handlers de mídia.

O laboratório tem duas Edge Functions ACTIVE. O helper v32 ainda não contém VOICE_ATTEMPT_ALREADY_ACTIVE; o contrato HTTP 409 da candidata não foi comprovado no runtime implantado.

## Avatar, anexos e paridade Normal/Team Lite

### Produção Normal — API beta10 v6

- O cliente envia avatarUrl depois de solicitar upload assinado.
- profileRoute aceita URL com prefixo público de profile-images.
- Não valida ownership por users.id.
- signedUploadRoute confere MIME e tamanho declarados pelo cliente, com limite declarado de 20 MiB.
- createSignedUploadUrl usa upsert:true.

### Produção Team Lite — v15

- O cliente também envia avatarUrl.
- profileRoute aceita o prefixo público de profile-images sem comprovar ownership por users.id.
- signedUploadRoute usa limite declarado de 20 MiB e upsert:true.

### Candidatas #74 e #76

- #74 restringe origem, bucket e caminho do avatar a um único componente, mas não vincula o objeto ao usuário autenticado. Seu signedUploadRoute continua com upsert:true e limite de 20 MiB baseado em metadados.
- #76 aceita URL pelo prefixo do bucket, sem ownership por ID; o upload assinado também usa upsert:true.
- As duas linhas ainda permitem que a decisão de tamanho/MIME dependa dos valores declarados pelo cliente.
- Os anexos do chat continuam usando upload assinado direto; não houve comprovação de inspeção dos bytes reais no servidor.
- Buckets públicos tornam os objetos acessíveis por URL; não existe isolamento por usuário comprovado.

A candidata de upload server-mediated discutida separadamente não está integrada às linhas oficiais #74/#76. Um PASS em outra branch não fecha a lacuna de paridade nem comprova upload real no Storage.

## AUTH-03 e identidade

### Produção

Consultas de catálogo confirmaram ausência de:
- colunas setup_token_* em users;
- RPC consume_upstatus_setup_invite;
- tabela de rate limit de emissão de convites;
- tabela de rate limit de login.

Os handlers instalados não apresentam rate limit de tentativas de senha. O primeiro acesso continua sem convite de uso único. A rota pública needsSetup revela se uma conta está configurada. O setup legado mantém fallback de role por nome para contas operacionais.

O login instalado exige seis caracteres no Normal e quatro no Team Lite. Sessões e perfis continuam associados por user_name, não por users.id.

### Candidatas

- #74 usa setupToken e RPC de consumo único, mas não contém o RPC de rate limit de emissão observado em #76; o passo correspondente no Smoke foi skipped.
- #76 implementa rate limit distribuído de emissão de convites, cinco por administrador em quinze minutos, e passou no teste isolado.
- Nenhuma das duas candidatas implementa rate limit de tentativas de login.
- A emissão de convites e a tentativa de autenticação são controles distintos; o primeiro não substitui o segundo.

### Laboratório

O laboratório contém a RPC consume_upstatus_setup_invite como SECURITY INVOKER, search_path vazio e EXECUTE restrito a service_role, além de consume_upstatus_setup_invite_rate_limit. A tabela upstatus_setup_invite_rate_limits existe; upstatus_login_rate_limits não existe. Não há uma tabela separada upstatus_setup_invites; os dados de convite são mantidos nas colunas de users.

## Supabase: RLS, grants, Default ACL e SECURITY DEFINER

Produção:
- 10 tabelas públicas com RLS habilitado e zero policies.
- Nove tabelas concedem privilégios diretos amplos a anon e authenticated; a consulta retornou 126 linhas de grants.
- 18 concessões TRUNCATE aparecem no inventário de privilégios.
- 120 entradas Default ACL amplas para anon/authenticated, abrangendo defaults de postgres em public/storage e de supabase_admin em public/graphql/graphql_public.
- Security Advisor: 6 WARN e 10 INFO.

Três funções de broadcast são SECURITY DEFINER, retornam trigger, usam search_path=public e têm EXECUTE amplo. Como retornam trigger, não foi demonstrada invocação como RPC PostgREST comum. O grant continua desnecessário e o search_path precisa ser endurecido.

O risco concreto de dados está no trigger upstatus_broadcast_messages: ele transmite to_jsonb(OLD/NEW) completo em broadcast público. As outras funções publicam estado de usuário e metadados de comandos/resultados.

Laboratório:
- Security Advisor: zero WARN e 18 INFO de RLS sem policies.
- Os grants diretos de tabela estão mais restritos que em produção, mas isso não elimina os alertas de Default ACL nem substitui políticas de acesso.

## Realtime

Snapshot read-only dos últimos 14 dias:
- 106 mensagens;
- 106/106 com private=false;
- tópico dos triggers: upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0.

Os userscripts Normal e Team Lite embutidos assinam upstatus-screen-share-live-3-1-1-beta10. Não configuram private:true nem realtime.setAuth(). O tópico dos triggers não coincide com o tópico assinado pelos clientes.

realtime.messages tem RLS habilitado, FORCE RLS desabilitado, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.

Não foi possível consultar a configuração de Dashboard Allow public access pelo conector; não houve subscribe externo nem tentativa de exploração. O achado é uma arquitetura sem autenticação de transporte comprovada, não uma exploração reproduzida.

## Storage

| Bucket | Público | Limite | Objetos |
|---|---|---:|---:|
| chat-images | Sim | 20 MiB | 168 |
| profile-images | Sim | 20 MiB | 20 |

Não foram encontradas policies próprias em storage.objects. A ausência de policy não deve ser confundida com permissão irrestrita de escrita: RLS também participa da decisão. A exposição pública de leitura decorre da configuração dos buckets.

## Migrations e isolamento TEST

Existem somente dois projetos Supabase, ambos ACTIVE_HEALTHY:
- produção dlfvkawaiqduhlazsszm;
- laboratório upstatus-security-test bfpjtfqlnypisxljoxkb.

Migrations:
- produção: 7 no ledger;
- laboratório: 39 no ledger;
- master: 3 SQLs canônicos em supabase/migrations.

Quatro migrations registradas em produção não têm correspondência no diretório canônico master. A branch Supabase main está MIGRATIONS_FAILED, embora o preview esteja ACTIVE_HEALTHY.

O projeto de laboratório não é Full-Product TEST: não tem buckets de produto e é usado para signaling/auth. upstatus-test v281 está dentro do projeto de produção, não em um terceiro projeto isolado.

O deploy-test candidato Normal/#76 exige SUPABASE_TEST_PROJECT_ID dedicado, rejeita produção e laboratório e fixa CLI 2.122.1. Como o terceiro projeto não existe, o workflow falha fechado, como deveria. O workflow TEST oficial Team Lite continua usando SUPABASE_PROJECT_ID genérico e gatilho push em develop.

## Workflows e release

### Normal

Master:
- release.json permanece em 3.4.7;
- build.mjs constrói updateURL a partir do endpoint beta10;
- validate.mjs exige /upstatus/upstatus.user.js;
- essa divergência explica o Validate vermelho da #82.

Candidato #74:
- usa release.scriptUrl e valida o endpoint de distribuição correto;
- deploy-production exige master, SHA exato, projeto dlfvkawaiqduhlazsszm e CLI 2.122.1;
- o guard ainda exige exatamente 3.4.7;
- o workflow publica somente upstatus.

O userscript, porém, continua chamando beta10 para API. Publicar apenas upstatus não atualiza automaticamente o backend beta10. O cutover precisa coordenar distribuição e API.

O build candidato também exige versão superior à do artefato rastreado para sincronizar UpStatus.user.js quando o conteúdo muda, enquanto o workflow de produção continua preso a 3.4.7. A política de versão precisa ser reconciliada antes de release.

### Team Lite

O workflow oficial deploy-production.yml:
- não verifica branch/SHA/projeto com a mesma rigidez do Normal;
- usa CLI latest;
- publica upstatus, não upstatus-team-lite.

O arquivo deploy-production.yml da candidata #76 tem o mesmo blob do oficial; portanto #76 não corrige o alvo de publicação. Não despachar esse workflow.

O deploy-test oficial usa SUPABASE_PROJECT_ID genérico, CLI latest e push em develop. O deploy-test candidato #76 tem guard de projeto dedicado, mas não está integrado à branch oficial.

## Issues e aceitação

- Issue #78: aberta, 0/8 critérios físicos aprovados. O último comentário de engenharia confirma que não houve teste físico de queda real de rede, reconexão sem F5, microfone/display permissions ou interoperabilidade instalada.
- Issue #79: 16/35 itens marcados, 19 pendentes.
- Reviews humanas: nenhuma nas PRs #74, #75, #76 e #82.

CI automatizado de Chromium/Playwright e testes HTTP isolados não substituem o Tampermonkey instalado, rede física, microfone real, captura de tela real ou interoperabilidade Normal ↔ Team Lite.

## Veredito

**NOT READY.** Bloqueadores prioritários:
1. Tornar Realtime privado/autenticado e validar emissor, sala, membership e destinatário no servidor.
2. Integrar ownership de avatar por users.id às linhas Normal e Team Lite; eliminar upload assinado com upsert:true para conteúdo que exige validação server-side.
3. Proteger anexos do chat com validação real de bytes/tamanho/MIME, não somente metadados do cliente.
4. Implementar rate limit de login; alinhar AUTH-03 e emissão de convites entre Normal e Team Lite.
5. Corrigir o workflow de produção Team Lite para upstatus-team-lite e proteger destino/SHA/CLI.
6. Coordenar distribuição Normal upstatus e API beta10; corrigir o updateURL do build master sem enfraquecer o validator.
7. Criar Full-Product TEST isolado e recuperar as quatro fontes SQL históricas.
8. Endurecer grants, Default ACL, SECURITY DEFINER, Realtime e Storage.
9. Executar os oito testes físicos da #78 e obter reviews/aprovação humana.

## Limites e segurança

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, grants, policies, ACL ou operação destrutiva. Nenhum teste físico foi executado. A única escrita desta rodada é este relatório novo na branch QA e a atualização do comentário QA dedicado na Issue #79.
