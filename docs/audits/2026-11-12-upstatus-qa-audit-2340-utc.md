# Auditoria independente de qualidade — UpStatus
**Data:** 2026-11-12 23:40 UTC  
**Repositório:** Reekyi/UpStatus  
**Projetos Supabase inspecionados:** produção dlfvkawaiqduhlazsszm; laboratório upstatus-security-test bfpjtfqlnypisxljoxkb.

## Escopo e método

Revalidei os heads de master, QA e team-lite-official; li o blob completo de docs/RELEASE_READINESS.md (8.409 linhas, 1.045.105 bytes); inspecionei PRs #74, #75, #76, #82 e a candidata recente #156; consultei logs existentes de GitHub Actions; decodifiquei os userscripts embutidos nas Edge Functions Normal, Team Lite e TEST; e executei somente SELECT nos catálogos dos dois projetos Supabase.

Não havia checkout local nem ambiente de navegador/Tampermonkey para executar novas suítes ou testes físicos. Não fiz rerun de CI. Resultados de CI abaixo são logs já existentes, não testes executados por esta auditoria.

## Heads e integridade da QA

| Referência | HEAD |
|---|---|
| master | 9d40461babcec8eb8686c2a04be9c675df7da381 |
| QA qa/release-readiness-2026-11-04-master | 4cbfd7b08dc403330ee07f3123301484628476b1 |
| team-lite-official | 9065bc1536fde64f437f6f12b7abb9b072cb8281 |

A QA está 264 commits à frente e 1 atrás de master. A comparação retornou 123 arquivos alterados, todos em docs/; zero arquivos de código e zero workflows. Não fiz rebase nem sincronização automática. O documento RELEASE_READINESS.md termina no checkpoint de 2026-11-08 18:30 UTC; esta auditoria foi registrada em arquivo separado para preservar o histórico.

## PRs obrigatórias e CI

| PR | HEAD / base | Estado observado |
|---|---|---|
| #74 Normal | fb878537 / master | Validate e Smoke PASS |
| #75 Team Lite baseline | 7bbf9b90 / team-lite-official | PASS histórico |
| #76 Team Lite ativa | c4dee8d2 / team-lite-official | 110/110 PASS |
| #82 QA | 4cbfd7b / master | Validate FAIL |
| #156 Team Lite avatar | f1938fa / team-lite/signaling-transport-candidate | Draft; dois workflows push-only PASS |

Evidências:
- #74 Validate: https://github.com/Reekyi/UpStatus/actions/runs/42753434411
- #74 Smoke: https://github.com/Reekyi/UpStatus/actions/runs/42753434336
- #75 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/41674353127
- #76 Candidate Checks: https://github.com/Reekyi/UpStatus/actions/runs/43124413080
- #82 Validate: https://github.com/Reekyi/UpStatus/actions/runs/43303156182
- #156 push run 1: https://github.com/Reekyi/UpStatus/actions/runs/43327054684
- #156 push run 2: https://github.com/Reekyi/UpStatus/actions/runs/43327078567

### Leitura dos logs

**#74:** 136/136 verificações autenticadas passaram. Chromium validou chamada, áudio de voz, vídeo de compartilhamento de tela, mesh de três participantes e teardown. O rate limit de sinalização passou com 90 aceitas e uma rejeitada em HTTP 429. O log mostra autorização/token de setup-invite, mas não encontrei execução do teste distribuído específico de rate limit de emissão de convite.

**#76:** 110/110 verificações autenticadas passaram. O log também confirma chamada, voz, vídeo, mesh, rate limit 90/1, concorrência de consumo de convite e teste distribuído de rate limit de emissão de setup-invite no projeto isolado. São testes automatizados/Chromium; não equivalem a teste físico com navegador e dispositivos reais.

**#75:** PASS histórico de 2026-11-03, versão 3.4.31. Não substitui a linha ativa #76.

**#82:** o job fez build de Normal 3.4.7 e TEST 3.4.7 e falhou em scripts/validate.mjs:26 com VALIDATION FAILED: production updateURL mismatch. Não removi assertion e não fiz rerun.

**#156:** os dois jobs passaram, mas o workflow adicionado pela PR tem somente gatilho push na branch da candidata. Não há gatilho pull_request. O teste scripts/team-lite-avatar-hardening.test.mjs faz assertions estáticas sobre trechos de fonte; não executa Deno, PUT real no Storage nem validação dos bytes. A PR está Draft, mergeable, sem reviews, e é filha da #76, não de team-lite-official.

Não encontrei reviews submetidas nas PRs #74, #75, #76, #82 ou #156.

## P0 — runtime TEST legado hospedado em produção

O inventário retornou apenas dois projetos Supabase: produção e upstatus-security-test. O segundo é um laboratório de sinalização/autenticação, não um ambiente full-product.

Na produção:
- 38 Edge Functions estão ACTIVE.
- As 38 reportam verify_jwt=false; isso não prova que cada rota esteja sem autenticação, mas significa que o gateway não valida JWT e que a autorização depende integralmente do código de cada handler.
- 12 funções têm prefixo upstatus-test; todas estão ACTIVE e verify_jwt=false.
- upstatus-test v281 embute userscript 3.3.28.

Decodifiquei o userscript de upstatus-test v281 e comparei com os bundles Normal v480 e Team Lite v15:
- TEST usa @name e @namespace iguais aos do Normal (UpStatus - Sale Smartly / upseller).
- TEST usa o mesmo prefixo de armazenamento GM do Normal.
- TEST aponta CLOUD_SERVER para o endpoint beta10 do projeto de produção.
- TEST usa a mesma URL/chave publicável/tópico Realtime de produção.
- Normal, Team Lite e TEST não configuram private:true nem realtime.setAuth().
- Os três bundles contêm listeners remote_command e call_signal. No Normal, o listener passa o comando recebido diretamente a executeRemoteCommand quando o target corresponde ao membro local. Team Lite verifica a própria sessão e geração, mas não autentica a identidade do emissor do broadcast.

A fonte da função TEST usa SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do projeto em que está hospedada. Não encontrei exposição do valor da service-role key no userscript; o risco é o runtime de teste operar com o projeto/credencial de produção.

A candidata #152/#154 contém um guard que gera TEST com destino inerte por padrão e rejeita o projeto de produção e o laboratório de sinalização. Isso é uma correção de build ainda não integrada. Não retira nem isola o runtime v281 já implantado. Não há terceiro projeto full-product TEST.

## Realtime, sinalização e Edge Functions

### Bundles implantados

| Função | Versão Edge | Userscript |
|---|---:|---:|
| upstatus | v480 | 3.4.7 |
| upstatus-team-lite | v15 | 3.4.30 |
| upstatus-screen-share-3-1-1-beta10 | v6 | API Normal |
| upstatus-test | v281 | 3.3.28 |

Nos bundles Normal e Team Lite, o tópico de clientes é upstatus-screen-share-live-3-1-1-beta10. Os triggers PostgreSQL continuam usando o tópico legado upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0. Os tópicos não coincidem.

Snapshot SELECT de realtime.messages em produção:
- 125 linhas, todas private=false.
- 46 db_change.
- 67 user_status.
- 6 remote_command.
- 6 remote_result.

Não publiquei broadcasts nem tentei exploração. A exposição externa efetiva também depende da configuração de public access do projeto, que não está disponível no conector. O achado é a ausência de autenticação/identidade do emissor no desenho dos clientes e payloads, não um ataque reproduzido.

As três funções public.upstatus_broadcast_* continuam SECURITY DEFINER, com search_path=public e EXECUTE efetivo para anon e authenticated. Elas são funções trigger anexadas a triggers; não demonstrei invocação direta por RPC PostgreSQL comum. O grant continua desnecessário. O trigger de mensagens transmite OLD/NEW completos.

A função de laboratório upstatus-signal-test v32 continua sem mapear VOICE_ATTEMPT_ALREADY_ACTIVE para HTTP 409. Só VOICE_ATTEMPT_CONFLICT e ROOM_FULL recebem 409; o fallback previsto é 500. Não executei requisição HTTP real.

## RLS, grants, Default ACL e Storage

### Produção

- 10 tabelas public com RLS habilitado e zero policies.
- Nove tabelas de aplicação concedem a anon e authenticated SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER e TRUNCATE.
- 18 grants TRUNCATE diretos (nove tabelas para cada papel).
- realtime.messages tem RLS, zero policies e grants SELECT/INSERT/UPDATE para anon/authenticated.
- 120 entradas de Default ACL amplas em public/storage/GraphQL/GraphQL_public.
- Security Advisor: 6 WARN (três funções SECURITY DEFINER para anon e authenticated) e 10 INFO (RLS sem policy).

RLS sem policy bloqueia DML por linha, mas não protege TRUNCATE.

### Laboratório

- 18 tabelas public com RLS e zero policies.
- Nenhum grant direto de anon/authenticated nas tabelas de aplicação public consultadas.
- Três triggers de broadcast usam search_path vazio, EXECUTE restrito a service_role e payload mínimo.
- Ainda há 96 entradas de Default ACL amplas: defaults de postgres em storage e de supabase_admin em public/GraphQL/GraphQL_public.
- Zero mensagens Realtime, zero buckets e zero objetos Storage no snapshot.
- Os triggers do laboratório ainda usam private=false.

O laboratório tem grants diretos mais restritos nas tabelas public, mas não está totalmente endurecido por causa das Default ACLs remanescentes.

### Storage de produção

| Bucket | Público | Objetos | Limite |
|---|---:|---:|---:|
| chat-images | Sim | 168 | 20 MiB |
| profile-images | Sim | 20 | 20 MiB |

storage.objects tem RLS, mas zero policies. Ambos os buckets são públicos.

### PR #155 Normal e #156 Team Lite — avatar/upload

A #156 deriva avatarOwnerPrefix de SHA-256 do nome normalizado da sessão (tokenHash(name).slice(0,24)); não usa users.id. Em produção, public.users tem somente PRIMARY KEY(id), sem UNIQUE(name). No laboratório existe UNIQUE(name). Logo, a produção não garante unicidade de nome: nomes duplicados/reutilizados podem compartilhar o prefixo de ownership; renomeação também não foi coberta pelos testes. Isso é risco de identidade/ownership, não takeover reproduzido.

A rota de upload assinado verifica MIME e tamanho declarados no JSON, depois chama createSignedUploadUrl(path,{upsert:true}). O bucket aceita até 20 MiB. Não há validação dos bytes efetivamente enviados nem limite de 2 MiB vinculado ao token assinado. Um cliente que declare size pequeno pode potencialmente obter ticket de avatar e enviar arquivo maior, limitado pelo teto do bucket; não executei esse teste. O MIME também é declarado pelo cliente, sem inspeção de assinatura real.

O teste da #156 verifica strings/ordem no código. Não comprova upload PUT real, conteúdo do arquivo, renomeação/reutilização de nome ou quota/rate limit.

## AUTH-03, migrations e proveniência

Produção:
- 7 migrations.
- Nenhuma coluna setup_token_* em public.users.
- Sem tabela upstatus_setup_invite_rate_limits.
- Sem tabela upstatus_signal_rate_limits.
- Sem RPC de consumo/rate limit de convite.
- public.users tem PRIMARY KEY(id), sem UNIQUE(name).

Laboratório:
- 39 migrations.
- Quatro colunas setup_token_*.
- Tabelas de rate limit.
- RPCs consume_upstatus_setup_invite e consume_upstatus_setup_invite_rate_limit.
- UNIQUE(name) em public.users.

A branch Supabase main de produção continua MIGRATIONS_FAILED, embora o projeto e preview estejam ACTIVE_HEALTHY. Quatro SQLs originais seguem ausentes do histórico Git. A #135 recupera statements do ledger, não os arquivos originais byte a byte.

## Workflows de publicação

O workflow oficial em team-lite-official ainda:
- oferece workflow_dispatch;
- instala Supabase CLI latest;
- lê SUPABASE_PROJECT_ID de secret;
- executa supabase functions deploy upstatus, que é o slug Normal.

O destino Team Lite correto é upstatus-team-lite. A #129 candidata desativa o dispatcher legado, mas não está integrada. A #128 candidata exige aprovação humana vinculada ao SHA exato, mas também não está integrada. Não despachar o workflow oficial atual.

## Issues e aceitação manual

- Issue #78 permanece aberta com 0/8 critérios físicos marcados. Não houve queda real de internet, reconexão sem F5, microfone real, permissões reais de tela ou interoperabilidade instalada nesta execução.
- Issue #79 permanece aberta; o corpo contém 16 itens marcados e 19 pendentes. O comentário QA dedicado foi atualizado, sem duplicata e sem alterar o comentário da Engenharia.

## Veredito e gates

**NOT READY.**

Bloqueadores:
1. Retirar/isolar o runtime TEST legado da produção e provisionar full-product TEST separado.
2. Tornar Realtime privado/autenticado por padrão em Normal e Team Lite; não confiar em remote_command/call_signal público.
3. Corrigir workflow oficial Team Lite antes de qualquer dispatch.
4. Usar identidade imutável (users.id) para ownership de avatar e impor unicidade no modelo, em vez de derivar ownership do nome.
5. Vincular limites de upload ao conteúdo/ticket real, validar bytes/MIME e adicionar rate limit/quota.
6. Fechar grants, Default ACL, RLS e Storage.
7. Aplicar AUTH-03 somente após revisão/autorização apropriada.
8. Recuperar proveniência dos quatro SQLs e diagnosticar MIGRATIONS_FAILED.
9. Validar HTTP 409 em endpoint real no laboratório, sob processo autorizado.
10. Concluir os oito testes físicos e obter aprovação humana no SHA final.

Nenhuma produção foi modificada. Todas as consultas SQL foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACLs ou operações destrutivas. Nenhuma suíte foi executada ou repetida pela auditoria; apenas logs existentes foram inspecionados. A única escrita documental desta rodada é este novo arquivo na branch QA, sem sobrescrever arquivos existentes.
