# Auditoria independente de qualidade — UpStatus
**Data:** 14/11/2026 03:35 UTC  
**Escopo:** GitHub `Reekyi/UpStatus`, Supabase produção `dlfvkawaiqduhlazsszm` e laboratório `bfpjtfqlnypisxljoxkb`.  
**Modo:** inspeção read-only de GitHub/Supabase; documentação nova somente na branch QA.

## Parecer executivo

**Release recommendation: NOT READY.**

A #164 passou no Validate associado ao seu HEAD `a27ced5`, com testes de limite de corpo, MIME, ownership por ID e bloqueio de sobrescrita. A candidata continua baseada em `develop` e não está integrada às linhas oficiais. O runtime Normal instalado tem incompatibilidade determinística no contrato de avatar; o Team Lite instalado não valida ownership do avatar pelo ID. A produção também continua com Realtime público, primeiro acesso sem convite de uso único e ausência de rate limit específico de login.

A PR #82 é documental, mas seu Validate mais recente no HEAD `85802ad` falhou com `production updateURL mismatch`. O build de master gera updateURL para beta10 enquanto `release.json` aponta para a função `upstatus`. A candidata #74 já contém uma correção para alinhar build e manifesto, mas não foi integrada.

Nenhuma produção foi modificada. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags ou operação destrutiva. Consultas SQL foram SELECT-only.

## 1. Documento de prontidão

`docs/RELEASE_READINESS.md` foi lido integralmente na branch `qa/release-readiness-2026-11-04-master`.

- Blob SHA: `7cfbd70886df42ce790c078c224b19284a632595`
- 8.410 linhas; 1.045.105 caracteres.
- Último checkpoint técnico no arquivo: 08/11/2026 18:30 UTC.
- O documento está desatualizado em relação às execuções e mudanças posteriores; os relatórios desta auditoria permanecem em `docs/audits/`, sem sobrescrever o arquivo principal.

## 2. Heads reais e divergência de branches

| Referência | HEAD / base | Relação observada |
|---|---|---|
| master | `9d40461babcec8eb8686c2a04be9c675df7da381` | Base atual |
| team-lite-official | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Base oficial Team Lite |
| QA / PR #82 antes deste relatório | `85802ad9ac4b1c4d488da259cb8d0aea32f4595e` | 295 commits à frente, 1 atrás de master |
| #74 | `dcaf6a072546eda0089e0cee4018c3047011f600` | 887 à frente, 1 atrás de master |
| #75 | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | 59 à frente de team-lite-official |
| #76 | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` | 386 à frente de team-lite-official; 327 à frente de #75 |
| #161 | `557814dc31bed779b84a2094358dc6b2a7e67689` | 12 commits sobre #74 |
| #163 | `00f357b0f5921d1995bb52c7b50f53ef8276e334` | 7 commits sobre #161 |
| #164 | `a27ced56564f3d18948c70138f6d6b2a1f2d0907` | 30 commits; base `develop` |

Todas as PRs auditadas continuam abertas e Draft. Nenhuma das PRs #74, #75, #76, #82, #161, #163 ou #164 possui review humana registrada.

## 3. CI: resultados verificados

| PR / workflow | Execução | Resultado e limite |
|---|---|---|
| #74 Validate | [43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) | PASS; build PROD/TEST 3.4.7 |
| #74 Signaling Smoke | [43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS; 136/136 checks autenticados, WebRTC call/voice/screen, mesh de 3 membros e rate limit |
| #75 Candidate Checks | [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; baseline Team Lite 3.4.31 |
| #76 Candidate Checks | [43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS; 110/110 checks autenticados e 16/16 checks não autenticados; Playwright/IIFE e integração autenticada no laboratório |
| #82 Validate | [43546992142](https://github.com/Reekyi/UpStatus/actions/runs/43546992142) | FAIL no HEAD 85802ad; `production updateURL mismatch` |
| #161 Validate + Smoke | [43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | PASS; Smoke 136/136 autenticados |
| #163 Validate + Voice Contract | [43488822143](https://github.com/Reekyi/UpStatus/actions/runs/43488822143), [43488822237](https://github.com/Reekyi/UpStatus/actions/runs/43488822237) | PASS; contrato offline inclui `VOICE_ATTEMPT_ALREADY_ACTIVE => 409` |
| #164 Validate | [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) | PASS no merge ref associado ao HEAD a27ced5; build candidato 3.0.40 / TEST 3.0.40-beta.22 |

**Classificação:** os resultados acima são CI automatizado. Os cenários WebRTC usam navegador automatizado e o laboratório Supabase; não são aceitação física no Tampermonkey instalado. Nenhum teste manual foi executado nesta rodada.

### #82: causa da falha

O build de master usa `PROD_FUNCTION=upstatus`, mas constrói o updateURL com a função beta10. Já `release.json` aponta para `https://dlfvkawaiqduhlazsszm.supabase.co/functions/v1/upstatus/upstatus.user.js`. O validator compara o artefato gerado com o manifesto e falha.

A PR #74 altera o build para usar `release.scriptUrl` e alinha `PROD_TOPIC` ao tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`. Essa correção está em candidata, não em master. A PR #82 contém apenas documentação e não incorpora a correção de build.

## 4. Avatar e uploads: divergência Normal / Team Lite

### Runtimes implantados

| Produto | Edge Function | Versão | Userscript embutido |
|---|---|---:|---:|
| Normal | `upstatus` | v480 | 3.4.7 |
| Team Lite | `upstatus-team-lite` | v15 | 3.4.30 |
| TEST legado | `upstatus-test` | v281 | 3.3.28 |
| API beta10 | `upstatus-screen-share-live-3-1-1-beta10` | v6 | beta legado |

Os userscripts embutidos nos runtimes Normal e Team Lite foram decodificados e inspecionados. Ambos chamam `/api/profile/avatar-upload-url` e depois enviam `{avatarUrl: upload.publicUrl}`.

### Defeitos de produção

- **Normal v480:** `profileRoute` espera `dataUrl` e chama `uploadFile(..., p.dataUrl, ...)`. O cliente envia apenas `avatarUrl`. O contrato não fecha; o salvamento do avatar falha ao tentar decodificar um data URL ausente.
- **Team Lite v15:** aceita URL pública sob o prefixo `profile-images`, mas não comprova que o objeto pertence ao ID do usuário autenticado. Conhecer o caminho de outro avatar pode permitir associá-lo ao próprio perfil.
- Ambos os clientes ainda usam upload assinado direto para avatar, com metadados de MIME/tamanho declarados pelo cliente. O bucket permite até 20 MiB.

### Candidata #164

A #164 passou no Validate associado ao HEAD `a27ced5`. O patch implementa:
- leitura progressiva do corpo com limite de 3 MiB antes do parse;
- limite real de 2 MiB após decodificação Base64;
- assinatura MIME para JPEG/PNG/GIF/WebP e rejeição de MP4 `ftyp` declarado como imagem;
- resolução de usuário por nome exigindo exatamente um `users.id`;
- prefixo de objeto derivado de `users.id`;
- validação de origem, bucket, caminho e ownership da URL;
- upload server-mediated e `upsert:false`;
- retorno HTTP 410 para a rota antiga de upload assinado de avatar.

Os testes em VM cobrem corpo acima do limite, MP4 declarado como JPEG, URL de outro usuário, identidade ausente/ambígua e contrato de upload. Não houve upload real no Storage.

**Pendências:** a resolução do ID ainda começa por `users.name`; não há migração completa de sessões/perfis para `user_id`. O patch não faz decodificação e re-encodificação integral da imagem nem limita dimensões/pixels. A proteção ainda não foi portada ao Team Lite. O upload de anexos do chat continua direto por URL assinada, confiando no MIME/tamanho declarados (o bucket aplica seu limite configurado, mas não valida a assinatura do conteúdo).

## 5. Autenticação e Edge Functions

- Produção tem 38 Edge Functions ACTIVE; as 38 reportam `verify_jwt=false`. Isso não prova, isoladamente, ausência de autenticação: os handlers principais usam token próprio da aplicação, que deve ser auditado rota a rota.
- `upstatus` v480 exige senha mínima de 6 caracteres; `upstatus-team-lite` v15 exige 4.
- Os handlers `/api/setup` permitem primeiro setup quando `password_hash` está vazio, sem convite de uso único. A atribuição de role vazia mantém fallback por nomes fixos.
- Não foi encontrado rate limit específico de tentativas de login nos handlers inspecionados.
- `/api/account?name=` retorna `needsSetup`; o login/setup continua separado por nome.
- Sessões e perfis usam `user_name`; não há coluna `user_id` em `upstatus_sessions` ou `upstatus_profiles`.
- O banco tem 5 usuários, 319 sessões e 5 perfis; nenhum hash de senha vazio, role vazia ou nome duplicado foi observado. `users.name` não possui constraint UNIQUE.
- A candidata #161 e a #76 incluem convite de primeiro acesso e rate limit distribuído de **emissão** de convites. Isso não equivale a rate limit de tentativas de senha.

### Voz

A #163 passa no contrato offline de HTTP 409. O helper de laboratório implantado `upstatus-signal-test` v32 ainda usa os códigos antigos `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL`; não foi comprovado que a função implantada reconhece `VOICE_ATTEMPT_ALREADY_ACTIVE`. Nenhuma requisição HTTP real foi feita contra a função implantada.

## 6. Supabase: RLS, grants, Realtime e Storage

### Realtime

Consulta read-only de `realtime.messages` nos últimos 14 dias:
- 106 registros observados, todos `private=false`;
- tópico registrado: `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`;
- RLS habilitado, FORCE RLS desabilitado e zero policies;
- anon/authenticated possuem SELECT e INSERT;
- sete partições.

Os userscripts instalados assinam `upstatus-screen-share-live-3-1-1-beta10`, não o tópico usado pelos triggers. Nenhum bundle contém `private:true` ou `realtime.setAuth()`. O trigger de mensagens transmite a linha completa com `to_jsonb(OLD/NEW)` em broadcast público.

### Banco e funções

- 10 tabelas `public` com RLS habilitado e zero policies.
- 9 tabelas com grants diretos amplos: 126 entradas de privilégios, incluindo 18 concessões TRUNCATE para anon/authenticated.
- 120 entradas Default ACL amplas para anon/authenticated, distribuídas entre owners postgres e supabase_admin.
- Três funções `upstatus_broadcast_*` SECURITY DEFINER com `search_path=public` e EXECUTE concedido a PUBLIC, anon e authenticated. São funções trigger, não RPCs comuns; os grants continuam desnecessários.
- Security Advisor produção: 3 WARN para anon, 3 WARN para authenticated e 10 INFO de RLS sem policies.

### Storage

| Bucket | Público | Limite | Objetos observados |
|---|---|---:|---:|
| chat-images | Sim | 20 MiB | 168 |
| profile-images | Sim | 20 MiB | 20 |

Não foram encontradas policies próprias em `storage.objects`. O laboratório tem zero buckets Storage.

## 7. Projetos, migrations e workflows

- Existem dois projetos Supabase: produção `dlfvkawaiqduhlazsszm` e laboratório signaling/auth `bfpjtfqlnypisxljoxkb`.
- Não existe terceiro projeto Full-Product TEST independente.
- Ledger de migrations: produção 7; laboratório 39.
- A branch gerenciada Supabase `main` continua `MIGRATIONS_FAILED`, enquanto o preview está saudável.
- O documento de prontidão ainda registra a divergência de proveniência entre migrations do ledger e SQLs canônicos. O ledger foi recontado nesta rodada; a árvore inteira de SQLs não foi recontada pelo conector, portanto a contagem de fontes ausentes permanece pendência herdada, não nova medição.

### Workflows de publicação

- **Normal master:** `deploy-production.yml` usa CLI `latest` e bloqueia a versão em 3.4.7. A candidata #74 adiciona validação de branch master, SHA e projeto esperado, e fixa CLI 2.122.1; ainda mantém o guard de versão 3.4.7.
- **Team Lite oficial:** `deploy-production.yml` usa CLI `latest` e executa `supabase functions deploy upstatus`, não `upstatus-team-lite`. Não contém as mesmas validações de projeto/SHA da candidata Normal. Não despachar.
- **TEST:** `deploy-test.yml` usa `SUPABASE_PROJECT_ID` genérico e CLI `latest`, depois publica `upstatus-test`; não contém verificação explícita do destino isolado. O secret não foi lido. Como só existem dois projetos e o laboratório não é Full-Product TEST, o destino não está comprovado.
- **Build/updateURL:** master gera updateURL para beta10, enquanto `release.json` aponta para `upstatus`. O build com `--sync-root-artifact` exige versão estritamente superior ao artefato existente quando o conteúdo muda, mas o workflow de produção permite apenas 3.4.7. É necessário reconciliar a política de versão antes de um release.

## 8. Issues e aceitação manual

- Issue #78: 0/8 critérios físicos aprovados.
- Issue #79: 16/35 itens marcados; 19 permanecem desmarcados.
- Não houve teste manual de reconexão sem F5, microfone real, compartilhamento de tela instalado ou interoperabilidade Normal ↔ Team Lite.
- Nenhuma review humana foi registrada nas PRs auditadas.

## 9. Gates

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | blocked | Realtime ainda público, sem policies privadas/autorizadas |
| TEST-ISOLATION | blocked | Não existe Full-Product TEST independente |
| MIGRATION-PROVENANCE | blocked | Proveniência SQL/ledger não reconciliada |
| AUTH-03 | blocked | Primeiro setup sem convite e sem rate limit de login |
| ACL-STORAGE | blocked | Grants/Default ACL/Storage e funções SECURITY DEFINER pendentes |
| RECONNECT | pending | 8 testes físicos sem confirmação de Ricardo |
| HUMAN-REVIEW | pending | Sem aprovação humana/autorização de release |

## 10. Próximas ações recomendadas

1. Integrar o fluxo de avatar server-mediated de forma compatível em Normal e Team Lite; não publicar a #164 isoladamente.
2. Adicionar decodificação/re-encodificação confiável e limite de pixels/dimensões; testar upload real em Storage isolado.
3. Fechar upload de anexos do chat com validação de conteúdo no servidor.
4. Corrigir o build/updateURL da QA usando a correção candidata, sem remover assertions do validator.
5. Implementar convite de primeiro acesso, identidade por ID e rate limit distribuído de login nas duas linhas.
6. Tornar Realtime privado/autorizado, minimizar payloads e revogar grants/policies desnecessários.
7. Criar Full-Product TEST e alinhar o workflow TEST ao projeto explicitamente allowlisted.
8. Corrigir o workflow Team Lite para publicar somente `upstatus-team-lite`, com CLI fixa e validação de projeto/SHA.
9. Recuperar e reconciliar SQLs históricos com o ledger.
10. Executar os oito testes físicos e obter review/aprovação humana.

## Segurança operacional desta rodada

GitHub e Supabase foram usados somente para leitura, exceto a criação deste relatório novo na branch QA e a atualização do comentário QA existente na Issue #79. Não houve alteração de código, banco, produção, secrets, flags, billing ou deploy.