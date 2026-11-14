# Auditoria independente de qualidade — UpStatus
**Execução:** 14/11/2026 13:30–13:45 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY — não liberar**

## 1. Escopo, método e limites

Foram revalidados os heads reais, PRs #74, #75, #76 e #82, issues #78 e #79, workflows, commits, candidatos relacionados, artefatos servidos pelas Edge Functions, catálogo PostgreSQL, Realtime, Storage, migrations e Security Advisor.

Classificação usada:
- **CI:** execução automatizada já registrada no GitHub. Não foi iniciada nova execução manual pela QA.
- **Inspeção estática/read-only:** leitura de código, bundles, metadados, catálogos e ledger.
- **Teste manual:** interação física no Tampermonkey/Sale Smartly com rede, microfone e tela reais. **Não executado nesta rodada.**
- **Pendente:** evidência ainda não produzida.
- **Bloqueado:** dependência técnica ou de governança impede a aprovação.

Todas as consultas SQL foram SELECT-only. Nenhum broadcast foi publicado, nenhum RPC de escrita foi chamado, nenhum fixture foi criado e nenhum teste de upload real foi executado. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, grants, policies, ACL ou configuração de produção.

## 2. Heads e integridade da QA

| Ref | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `develop` | `6b33e1e` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |
| `qa/release-readiness-2026-11-04-master` / PR #82 | `2b95cd784780191a4709a47faa304ac0b35a06c1` |
| PR #74 Normal | `dcaf6a072546eda0089e0cee4018c3047011f600` |
| PR #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` |
| PR #76 Team Lite | `83a6cc4503ddc01254f6a2abbcc7af5c6803eb94` |

A comparação master → QA retorna **307 commits à frente e 1 atrás**. O commit master-only é `9d40461`, documental (`docs: record read-only AUTH-03 migration preflight`), sem alteração de runtime. A PR #82 tem 161 arquivos alterados e todos são documentais.

### RELEASE_READINESS.md

O blob atual é `7cfbd70886df42ce790c078c224b19284a632595`, com 8.410 linhas e 1.045.105 caracteres. Li o conteúdo completo. O último checkpoint dentro do próprio arquivo é **08/11/2026 18:30 UTC**. Não há checkpoint de 14/11 nesse documento; os relatórios recentes estão separados em `docs/audits/`.

Isso corrige a afirmação de rodadas anteriores de que o documento central já continha um checkpoint de 14/11. O arquivo original foi preservado.

## 3. PRs obrigatórias e CI

| PR | Estado/HEAD | Evidência atual | Classificação |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | Open/Draft · `dcaf6a0` | [Validate 43376770142](https://github.com/Reekyi/UpStatus/actions/runs/43376770142), [Smoke 43376770200](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) | PASS |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | Open/Draft · `7bbf9b9` | [Candidate Checks 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; baseline antiga |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | Open/Draft · `83a6cc4` | [Candidate Checks 43363871881](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) | PASS |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | Open/Draft · `2b95cd7` | [Validate 43596318267](https://github.com/Reekyi/UpStatus/actions/runs/43596318267) | **FAIL** |

### O que os logs realmente provam

- **#74:** 19/19 verificações não autenticadas e 136/136 autenticadas passaram; Chromium negociou chamada, voz e tela, entregou áudio/vídeo remoto e validou mesh de três participantes. Rate limit de sinalização foi testado (90 aceitas, uma HTTP 429). O passo de rate limit distribuído de emissão de convites foi **skipped**, não aprovado.
- **#76:** 16/16 não autenticadas e 110/110 autenticadas passaram. O job inclui Playwright com stubs de Tampermonkey, integração isolada, recuperação de sala/voz/tela, rate limit distribuído, read receipts e emissão de convites. O rate limit de emissão de convites foi executado e passou.
- **#75:** PASS histórico; não substitui #76 como candidato Team Lite atual.
- **#82:** o Validate do HEAD atual falha com `VALIDATION FAILED: production updateURL mismatch`. Não alterei o validator nem fiz rerun.

Nenhuma das quatro PRs obrigatórias tem review humana registrada.

## 4. Candidatos relacionados: progresso real e fragmentação

| PR | Evidência | Resultado e limite |
|---|---|---|
| [#89 AUTH-03](https://github.com/Reekyi/UpStatus/pull/89) | [42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) | CI PASS; guard bloqueia cutover porque release continua 3.4.7 e as três migrations AUTH-03 não constam no ledger de produção |
| [#133 Normal call-source](https://github.com/Reekyi/UpStatus/pull/133) | [Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827), [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) | PASS no HEAD `8d38036`; move proveniência para argumento fora do payload, mas sua base está 4 commits atrás do #74 atual |
| [#146 remote-command](https://github.com/Reekyi/UpStatus/pull/146) | [43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) | PASS; transforma remote_command/remote_result em wake-up para polling autenticado. Não fecha call_signal, voz ou tela |
| [#149 Team Lite call-source](https://github.com/Reekyi/UpStatus/pull/149) | [43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077), [43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232) | PASS; base está 2 commits atrás do #76 atual; requer reconciliação |
| [#157 Team Lite avatar](https://github.com/Reekyi/UpStatus/pull/157) | [43333849082](https://github.com/Reekyi/UpStatus/actions/runs/43333849082) | PASS em candidato; não está implantado nem validado por upload real |
| [#158 updater/API separation](https://github.com/Reekyi/UpStatus/pull/158) | [Validate 43363857861](https://github.com/Reekyi/UpStatus/actions/runs/43363857861) | **FAIL:** `CHAT REGRESSION FAILED: files are staged instead of uploaded immediately` |
| [#161 Normal API/rate limit](https://github.com/Reekyi/UpStatus/pull/161) | [Validate 43479685384](https://github.com/Reekyi/UpStatus/actions/runs/43479685384), [Smoke 43479685445](https://github.com/Reekyi/UpStatus/actions/runs/43479685445) | PASS; muda CLOUD_SERVER para `upstatus` e adiciona rate limit distribuído de emissão de convites; ainda não implantado |
| [#163 HTTP 409 voz](https://github.com/Reekyi/UpStatus/pull/163) | [43488594110](https://github.com/Reekyi/UpStatus/actions/runs/43488594110) | PASS offline; mapeia VOICE_ATTEMPT_ALREADY_ACTIVE para 409, sem chamada HTTP real à função implantada |
| [#164 avatar Normal](https://github.com/Reekyi/UpStatus/pull/164) | [43544570609](https://github.com/Reekyi/UpStatus/actions/runs/43544570609) | Validate PASS com Storage mockado; sem upload real |

A descrição da #158 não corresponde ao erro observado no log: o bloqueio real é a regressão de anexos que exige upload imediato, não apenas uma assertion de papel administrativo.

A #161 e a #158 representam estratégias diferentes:
- #158 separa URL de atualização e mantém a API beta10.
- #161 troca a API Normal para `upstatus`, alinhando o destino ao workflow que publica essa função.

A segunda estratégia exige cutover coordenado de cliente e backend. A função `upstatus` atualmente implantada (v480) ainda não possui rotas server-mediated de sinalização. Os templates Normal e Team Lite dos candidatos também não contêm essas rotas; o helper `upstatus-signal-test` existe apenas no laboratório.

A correção #133 e a #149 não tornam o transporte autenticado default: o marcador `_authenticatedTransport` deixa de ser confiado quando a proveniência é passada fora do payload, mas `signaling_transport_enabled` continua falso por padrão e o endpoint permanece vazio. Não há um único HEAD integrado que reúna todas as correções, os workflows e o backend necessário.

## 5. Código efetivamente instalado: Normal e Team Lite

As fontes foram obtidas diretamente das Edge Functions implantadas e os userscripts embutidos foram decodificados.

| Produto | Distribuição | Userscript instalado | API usada pelo cliente |
|---|---|---|---|
| Normal | `upstatus` v480 | 3.4.7 | `upstatus-screen-share-3-1-1-beta10` v6 |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upstatus-team-lite` v15 |

A função beta10 v6 contém também um userscript legado 3.1.1-beta8 em sua rota de distribuição, mas o updateURL Normal atual aponta para `upstatus` v480. Beta10 é o backend de API usado pelo Normal instalado, não seu feed atual de atualização.

### Realtime nos produtos instalados

- Ambos assinam `upstatus-screen-share-live-3-1-1-beta10`.
- Os canais não são criados com `private:true`.
- Não há `realtime.setAuth()`.
- O Normal instalado processa `remote_command` diretamente.
- O Team Lite instalado verifica sua própria sessão/generation, mas não prova a identidade do publicador.
- O destinatário, remetente, sala e payload de sinalização vêm do evento recebido.

Nos candidatos #74/#76, remote_command já é wake-up/poll autenticado. O #133/#149 move a proveniência de call_signal para fora do payload. Nenhuma dessas mudanças está instalada. Voz e compartilhamento de tela ainda usam fallback público enquanto a flag de transporte autenticado estiver desligada.

### Uploads e avatar

As funções Normal beta10 v6 e Team Lite v15:
- aceitam MIME e tamanho declarados pelo cliente;
- emitem signed upload para buckets com limite de 20 MiB;
- usam `upsert:true`;
- não verificam os bytes reais depois do upload;
- aceitam URL de avatar pelo prefixo público do bucket, sem vincular o objeto ao `users.id` autenticado.

A #164 melhora o avatar Normal com limite de corpo, assinatura MIME e ownership por ID. A #157 faz a correção correspondente no Team Lite. São candidatos separados, não integrados/implantados. Anexos do chat continuam com upload assinado direto; a validação de MIME/tamanho declarado não equivale a inspeção do arquivo recebido.

## 6. Realtime, triggers e segurança do banco

### Realtime de produção

Snapshot read-only dos últimos 14 dias:
- 106 registros, todos `private=false`;
- 72 `user_status`;
- 26 `db_change`;
- 4 `remote_command`;
- 4 `remote_result`.

Os triggers publicam em:

`upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`

Os clientes assinam:

`upstatus-screen-share-live-3-1-1-beta10`

Os tópicos não coincidem. Portanto, os 106 registros do tópico dos triggers não comprovam entrega aos clientes atuais. O trigger `upstatus_broadcast_messages` publica `to_jsonb(OLD/NEW)` completo; os triggers de status remoto enviam metadados de comandos/resultados. A configuração de Dashboard que permite public access não foi exposta pelo conector. Não houve tentativa de exploração.

### RLS e grants

Produção:
- 10 tabelas públicas com RLS habilitado e zero policies;
- 9 dessas tabelas concedem privilégios diretos amplos a anon/authenticated;
- 126 grants em tabelas públicas, dos quais 72 são privilégios mutáveis e 18 são TRUNCATE;
- `realtime.messages`: RLS true, FORCE RLS false, zero policies e SELECT/INSERT/UPDATE para anon/authenticated;
- Storage: 32 grants diretos em sete tabelas.

RLS sem policy bloqueia DML por linha, mas não protege TRUNCATE. Nenhuma operação foi tentada.

### SECURITY DEFINER e Default ACL

As três funções `upstatus_broadcast_*`:
- são SECURITY DEFINER;
- retornam `trigger`;
- usam `search_path=public`;
- têm EXECUTE concedido a PUBLIC, anon, authenticated e service_role.

O Security Advisor reporta três WARN para anon e três para authenticated, além de dez INFO de RLS sem policy. O Advisor descreve chamada via RPC, mas o catálogo confirma retorno `trigger`; não tentei invocação direta. Os grants de cliente continuam desnecessários e o search_path precisa ser endurecido.

Produção possui 24 objetos Default ACL, com privilégios amplos de postgres/supabase_admin em public, storage e schemas GraphQL. O laboratório possui 25 objetos Default ACL; ainda há defaults amplos de supabase_admin em public/GraphQL e de postgres em storage.

### Storage

| Bucket | Objetos | Público | Limite |
|---|---:|---|---:|
| chat-images | 168 | Sim | 20 MiB |
| profile-images | 20 | Sim | 20 MiB |

Zero policies próprias em `storage.objects`. O bucket de chat aceita imagens, vídeo, áudio e documentos. O limite público de 20 MiB e a ausência de ownership por objeto mantêm o risco.

## 7. Edge Functions, ambientes e autenticação

### Projetos

| Projeto | Estado | PostgreSQL | Migrations |
|---|---|---|---:|
| Produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 |
| Laboratório `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 38 |

A organização tem apenas esses dois projetos. O `upstatus-test` v281 continua dentro do projeto de produção; não existe Full-Product TEST independente. O laboratório não tem buckets de produto nem objetos Storage.

Produção possui 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false` na plataforma. Os handlers principais usam autenticação própria por token, mas isso exige revisão endpoint por endpoint. Há diversas funções antigas de teste/backup ainda ACTIVE.

Funções relevantes:
- produção: `upstatus` v480, `upstatus-team-lite` v15, beta10 v6 e `upstatus-test` v281;
- laboratório: `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3.

O branch gerenciado Supabase `main` continua `MIGRATIONS_FAILED`, embora o preview esteja ACTIVE_HEALTHY.

### AUTH-03

Produção:
- 5 usuários, 319 sessões e 5 perfis;
- zero colunas `setup_token_*`;
- RPC `consume_upstatus_setup_invite` ausente;
- rate-limit table/RPC de convite ausente.

Laboratório contém quatro colunas de setup token, RPC de consumo e rate-limit table. A #89 passou em CI e integrou o fluxo de convite no laboratório, mas o preflight bloqueia produção porque as três migrations AUTH-03 não constam no ledger e a versão continua 3.4.7. O rate limit candidato é de emissão de convites, não de tentativas de senha/login.

### HTTP 409 de voz

O helper implantado no laboratório, `upstatus-signal-test` v32, mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não `VOICE_ATTEMPT_ALREADY_ACTIVE`; esse código cai no 500. A #163 corrige o mapper em código e passa no contrato Node offline, mas não foi implantada nem validada por HTTP real.

## 8. Recuperação de migrations

A PR [#135](https://github.com/Reekyi/UpStatus/pull/135) guarda quatro arquivos em `docs/migration-recovery/`, fora de `supabase/migrations/`.

Comparei cada arquivo diretamente com `supabase_migrations.schema_migrations.statements` em produção. Resultado: **4/4 statements coincidem exatamente**:
- `20261023154754_create_upstatus_visual_config`;
- `20261026195855_add_chat_message_file_name`;
- `20261027154329_allow_chat_document_mime_types`;
- `20261027155438_set_upstatus_upload_limits_20mb`.

Cada registro tem uma statement e rollback NULL. Isso comprova recuperação do SQL executado, não dos arquivos originais, comentários, formatação ou commit/blob Git. Os arquivos permanecem documentais e não foram copiados para o diretório de migrations.

## 9. Workflows e regressões de publicação

### Normal

Em master, `scripts/build.mjs` ainda deriva o updateURL do endpoint beta10, enquanto `scripts/validate.mjs` exige `/upstatus/upstatus.user.js`. Isso explica a falha repetida do Validate de #82.

#158 separa URL de distribuição e API, mas falha na regressão de anexos. #161 muda a API para `upstatus`, alinhando-a ao workflow Normal, mas depende de deploy coordenado do backend e não cria as rotas server-mediated de sinalização.

### Team Lite

O workflow oficial em `team-lite-official` ainda executa:

`supabase functions deploy upstatus`

O destino correto do produto é `upstatus-team-lite`. O workflow também usa CLI `latest` e não tem os mesmos guards de projeto/SHA/preflight do Normal. **Não despachar o workflow oficial atual.**

## 10. Issues, aceitação manual e reviews

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, **0/8** critérios físicos marcados. Reconexão Normal/Team Lite sem F5, nova entrada/chamada, áudio sem duplicação e teste manual continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): aberta, **16/35** itens marcados.
- PRs #74, #75, #76 e #82: zero reviews humanas nesta consulta.
- Nenhum teste manual foi executado nesta rodada. Chromium/Playwright em CI não equivale a Tampermonkey instalado com permissões reais, queda física de rede, microfone ou captura de tela.

## 11. Gates de release

| Gate | Estado QA | Motivo |
|---|---|---|
| RT-01 | **blocked** | Realtime público, proveniência incompleta, transporte autenticado default-off e sem endpoint de produção |
| TEST-ISOLATION | **blocked** | Só há produção e laboratório parcial; `upstatus-test` permanece na produção |
| MIGRATION-PROVENANCE | **in_progress** | 4 statements exatos recuperados; fontes originais ainda não provadas |
| AUTH-03 | **blocked** | Migrations/RPC ausentes em produção; cutover guard bloqueia |
| ACL-STORAGE | **blocked** | Grants, TRUNCATE, Default ACL e buckets públicos sem policies |
| RECONNECT | **pending** | Issue #78 segue 0/8; sem teste físico sem F5 |
| HUMAN-REVIEW | **pending** | Sem reviews e sem autorização explícita de release |

## 12. Próximas ações técnicas

1. Integrar #133 com o HEAD atual do #74 e #149 com o HEAD atual do #76; preservar proveniência fora do payload e não confiar em marcador fornecido pelo cliente.
2. Construir e validar no laboratório um endpoint server-mediated de sinalização com autenticação, membership, destinatário, expiração, replay protection e rate limit; só então planejar cutover coordenado.
3. Corrigir updateURL sem reintroduzir regressão de anexos; escolher uma única estratégia de API e alinhar builder, validator, workflow e backend.
4. Corrigir o workflow oficial Team Lite para o slug correto, projeto fixo, SHA exato e CLI pinada.
5. Revisar e planejar AUTH-03 separadamente; não aplicar migrations em produção sem revisão e autorização.
6. Corrigir grants, Default ACL, SECURITY DEFINER e Storage com plano revisado.
7. Criar ambiente Full-Product TEST isolado com Storage e fixtures próprios.
8. Completar os oito testes físicos da #78 e obter aprovação humana.

**Veredito: NOT READY.** Os candidatos demonstram avanço real em CI, mas não há um único candidato integrado que feche segurança, API, workflow, armazenamento e aceitação física nos dois produtos.

---
**Segurança desta execução:** nenhuma alteração em produção, migration, deploy, merge, release, userscript, secret, flag, grant, policy, ACL ou fixture. Todas as consultas SQL foram SELECT-only. A única escrita documental desta rodada é este novo relatório na branch QA; o `RELEASE_READINESS.md` central e as branches de Engenharia foram preservados.
