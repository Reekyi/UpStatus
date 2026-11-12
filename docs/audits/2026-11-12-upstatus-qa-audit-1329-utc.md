# Auditoria independente de qualidade do UpStatus — 2026-11-12

**Executada em:** 2026-11-12T13:37:51.888Z  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**Projeto Supabase de produção:** `dlfvkawaiqduhlazsszm`  
**Projeto Supabase de laboratório:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY — não autorizar release/publicação**

## Escopo e limites

Revalidação read-only de heads, PRs #74, #75, #76 e #82, issues #78/#79, workflows, commits, CI, compatibilidade Normal/Team Lite, bundles de Edge Functions, RLS, grants, Default ACL, SECURITY DEFINER, Realtime, Storage e migrations.

Nenhuma chamada mutável foi feita contra produção ou laboratório. Consultas SQL foram SELECT-only. Não foram executados testes físicos, disparados workflows, feitas migrations, deploys, merges, releases, publicações, mudanças de secrets/flags/roles/grants/policies/ACLs ou operações destrutivas. A única escrita desta execução é este arquivo novo na branch QA.

## Heads e integridade documental

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `b34da76e15d10a5e0778dff2209485d1f3c35877` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

Comparação QA → master: **251 commits à frente / 1 atrás**, estado divergente. O commit exclusivo de master é documental; não foi incorporado automaticamente. O HEAD da QA permaneceu inalterado durante a coleta e este relatório foi criado como arquivo novo.

`docs/RELEASE_READINESS.md` foi recuperado pelo Git blob da branch QA: **8.410 linhas** (blob `7cfbd70886df42ce790c078c224b19284a632595`). O último checkpoint interno do documento é de **08/11/2026 às 18:30 UTC**; portanto, o documento principal está desatualizado em relação às candidatas e aos snapshots posteriores. Ele foi preservado, sem edição.

O endpoint de rulesets do repositório retornou lista vazia. O endpoint de detalhes de branch protection respondeu 403 para master e team-lite-official; a configuração detalhada de proteção não pôde ser inspecionada.

## PRs principais e CI

| PR | HEAD / base | Evidência atual | Resultado |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` / master em `a9288cc` | [Validate 42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411), [Smoke 42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) | PASS; Smoke registra 136/136, mas a etapa de rate limit de emissão de convites foi **skipped** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | [run histórico 41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) | PASS histórico; não substitui a candidata #76 |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` / team-lite-official | [Candidate Checks 43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) | 110/110 PASS; inclui rate limit de emissão de convites |
| #82 QA | `b34da76e15d10a5e0778dff2209485d1f3c35877` / master | [Validate 43220775422](https://github.com/Reekyi/UpStatus/actions/runs/43220775422) | **FAIL** em `scripts/validate.mjs:26`: `production updateURL mismatch` |

Comparações de branches:
- #74: 883 commits à frente e 1 atrás do master atual; a base registrada na PR está no merge-base antigo `a9288cc`.
- #76: 384 commits à frente e 0 atrás de `team-lite-official`.
- #82: coincide com o HEAD da QA; 251 commits à frente e 1 atrás de master.

PRs candidatas relacionadas:
- #133 Normal AUTH-03/call-source: HEAD `8d38036ead5e1c3c9cc00db9791f8c9de093ba62`; [Validate 42804903827](https://github.com/Reekyi/UpStatus/actions/runs/42804903827) e [Smoke 42804903887](https://github.com/Reekyi/UpStatus/actions/runs/42804903887) PASS, 136/136.
- #142 Normal beta10 API parity: HEAD `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4`.
- #143 dispatcher Normal: HEAD `c4a04fa755b877bc76b1372170a26e7b974264e6`; [Validate 43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347) PASS. Está 15 commits à frente e 2 atrás de #142.
- #147 updater/chat: [Full Validate 43176202190](https://github.com/Reekyi/UpStatus/actions/runs/43176202190) PASS.
- #149 Team Lite call-source: HEAD `77352d2e3b93722d6b69a9eec31a92bb63158230`; [Guard 43173176077](https://github.com/Reekyi/UpStatus/actions/runs/43173176077) e [Candidate Checks 43173176232](https://github.com/Reekyi/UpStatus/actions/runs/43173176232) PASS; 110/110 e 11/11 verificações offline do helper HTTP.
- #151 admin/chat: [Full Validate 43196245858](https://github.com/Reekyi/UpStatus/actions/runs/43196245858) PASS. É 5 commits à frente de #147, mas não incorpora o fluxo AUTH-03 de convite obrigatório.

Não foram encontradas reviews humanas nas PRs #74, #75, #76, #82, #133, #142, #143, #147, #149 e #151. Todas permanecem abertas/Draft na consulta desta execução.

## Achados de release e segurança

### P0 — workflow oficial Team Lite aponta para o runtime Normal

O workflow `.github/workflows/deploy-production.yml` na branch `team-lite-official` contém:

```bash
supabase functions deploy upstatus --project-ref "$SUPABASE_PROJECT_ID" --use-api
```

O slug correto do produto é `upstatus-team-lite`. O workflow também instala Supabase CLI `latest`, sem pin de versão, e não faz validação equivalente de SHA/projeto/migrations.

O workflow de master também usa CLI `latest` e publica somente `upstatus`; não coordena o runtime beta10. A PR #143 propõe dispatcher dual-runtime com CLI 2.122.1 e preflight, mas sua branch está divergente de #142.

As PRs #125/#128 propõem dispatcher Team Lite com SHA exato, aprovação humana no head exato, CLI fixada e preflight. A #129 propõe desabilitar o workflow legado. São candidatas Draft; não estão na branch oficial.

**Não despachar o workflow Team Lite atual.** Nenhum dispatch foi realizado nesta auditoria.

### P0 — bundles instalados ainda confiam em broadcasts públicos

Fontes das Edge Functions implantadas foram recuperadas e os userscripts embutidos foram decodificados:

| Função | Versão Edge | Userscript | SHA da fonte |
|---|---:|---:|---|
| `upstatus` | v480 | 3.4.7 | `bb2713ceb5543a780e2ed9b56422abe21ac13cf6a4a4da6184ac6ec31f7cc9dd` |
| `upstatus-team-lite` | v15 | 3.4.30 | `2c13414a011f458a1b3761c3d84aa425b51d1875b63e68ec61fc99561a8e0dfb` |
| `upstatus-screen-share-3-1-1-beta10` | v6 | API Normal auxiliar | `f6c5f8a4e32ecb1e4331c71c733e0d841f3538c24fd9d4bcfbba07ad1f05ad29` |

Nos dois userscripts instalados:
- `remote_command` chama diretamente `executeRemoteCommand(c)` com o comando do payload;
- `call_signal`, eventos de voice-room e screen-share são entregues aos respectivos handlers sem identidade autenticada independente do emissor;
- não há `private:true` nem `setAuth()` no canal Realtime;
- Team Lite verifica a própria sessão/generation, mas isso não autentica o emissor.

O código de primeiro setup dos dois runtimes também preserva o fallback nominal para Ricardo, Lohan e Guilherme quando o papel armazenado está vazio. A produção possui cinco contas, nenhuma sem senha ou papel, três com papel administrativo; isso reduz o risco de uma conta atual desconfigurada, mas não corrige o fluxo de provisionamento.

Não foi reproduzido ataque, publicação externa de broadcast, oferta/ICE, captura de áudio ou tela. Classificação P0 é bloqueador de release por desenho de confiança não autenticada, não incidente explorado comprovado.

### P1 — tópico do banco e tópico dos clientes não coincidem

Snapshot read-only de `realtime.messages` em produção: **114 linhas**, todas `private=false`, no tópico legado `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`:
- 62 `user_status`;
- 40 `db_change`;
- 6 `remote_command`;
- 6 `remote_result`.

Os dois userscripts instalados assinam `upstatus-screen-share-live-3-1-1-beta10`; os triggers SQL publicam no tópico legado. #133 Normal e #149 Team Lite candidatos usam o tópico legado; #142 usa beta10. Isso exige uma escolha de transporte coordenada, sem alinhar tópicos antes de fechar autenticação e minimização de payload.

### P1 — divergência HTTP 409/500 na sinalização de voz do laboratório

A RPC PostgreSQL `open_upstatus_signal_voice_room_attempt` retorna `VOICE_ATTEMPT_ALREADY_ACTIVE` quando a mesma conta já possui tentativa ativa.

No branch candidato #149:
- `supabase/test-functions/upstatus-signal-test/http-contract.mjs` mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409;
- o teste offline `scripts/test-signal-test-helper-http-contract.mjs` verifica status e corpo e confirma que a função **do repositório** importa o helper;
- CI reportou 11/11 verificações offline e 110/110 checks autenticados.

Na Edge Function efetivamente implantada no laboratório, `upstatus-signal-test` v32, o mapeamento só trata `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` como 409. `VOICE_ATTEMPT_ALREADY_ACTIVE` cai no 500. O source SHA implantado é `f893360a4e0021a0d608e6cb58b8644c68f7389bce685c3177c025eb376b8712`.

**Conclusão:** o helper candidato está correto, mas o endpoint implantado não está em paridade com o código testado. O teste estático não valida a cópia implantada nem uma resposta HTTP real. Nenhuma chamada HTTP mutável foi feita.

### P1 — AUTH-03 está nos candidatos, não na produção

Produção:
- sete migrations registradas;
- zero colunas `setup_token_*`;
- RPC `consume_upstatus_setup_invite` ausente;
- RPC `consume_upstatus_setup_invite_rate_limit` ausente;
- cinco usuários, zero sem senha e zero sem papel.

Laboratório:
- quatro colunas `users.setup_token_*`;
- RPC `consume_upstatus_setup_invite`;
- RPC `consume_upstatus_setup_invite_rate_limit`.

#133 Normal e #76/#149 Team Lite contêm convite obrigatório e rate limit. O Smoke da #74, embora 136/136, teve a etapa de rate limit de emissão de convite **skipped**. #151 remove fallback nominal, mas não exige `setupToken`; é hardening parcial, não substitui AUTH-03.

### P1 — RLS, grants, SECURITY DEFINER e Default ACL

Produção:
- 10 tabelas em `public` com RLS e zero policies;
- nove dessas tabelas têm privilégios efetivos amplos para anon e authenticated, incluindo SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER;
- `upstatus_visual_config` é a exceção sem grants diretos de cliente;
- RLS não protege TRUNCATE;
- `realtime.messages`: RLS true, FORCE RLS false, zero policies, SELECT/INSERT/UPDATE efetivos para anon/authenticated;
- `storage.objects`: zero policies próprias.

As três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public`, retornam `trigger` e têm EXECUTE concedido a anon/authenticated/service_role. Security Advisor: 6 WARN e 10 INFO. Por retornarem `trigger`, não foi demonstrada invocação direta como RPC comum; o grant amplo é desnecessário e o search_path deve ser endurecido.

Default ACL de produção: **120 entradas de privilégios para clientes** distribuídas entre objetos futuros de postgres em public/storage e supabase_admin em public/graphql/graphql_public. Incluem EXECUTE, SELECT/UPDATE/USAGE e privilégios de tabela como DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.

Laboratório:
- 18 tabelas public com RLS e zero policies, sem grants diretos anon/authenticated nas tabelas consultadas;
- triggers SECURITY DEFINER usam search_path vazio, EXECUTE somente service_role e payload minimizado a `{op: TG_OP}`;
- Default ACL de postgres em public está restrita, mas storage e objetos futuros de supabase_admin em public/graphql/graphql_public ainda mantêm privilégios amplos;
- Security Advisor: 0 WARN e 18 INFO.

### P1 — Storage e limites

Produção tem dois buckets públicos, sem policies próprias em `storage.objects`:
- `chat-images`: 168 objetos;
- `profile-images`: 20 objetos;
- ambos com limite de 20 MiB.

Na candidata Normal #133, o caminho direto de imagem de chat aceita até 25 MiB, enquanto o bucket limita 20 MiB; o caminho assinado usa 20 MiB. Isso cria divergência entre validação da rota e limite efetivo do Storage. A política de privacidade dos buckets continua sem decisão.

### P1 — migrations e proveniência

Produção tem 7 migrations; laboratório tem 39. Quatro arquivos originais continuam ausentes do Git:
- `20261023154754_create_upstatus_visual_config.sql`;
- `20261026195855_add_chat_message_file_name.sql`;
- `20261027154329_allow_chat_document_mime_types.sql`;
- `20261027155438_set_upstatus_upload_limits_20mb.sql`.

A PR #135 arquiva statements recuperados do ledger de produção, mas declara explicitamente que não são os arquivos originais byte a byte. A PR #127 mantém manifesto de hashes para as três fontes originais presentes e deixa as quatro ausentes fora do manifesto. O dispatcher deve continuar falhando fechado. A branch gerenciada Supabase `main` permanece `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

## Projetos e Edge Functions

- Produção `dlfvkawaiqduhlazsszm`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false`. Isso não significa automaticamente ausência de autenticação: os handlers principais usam sessão customizada e precisam ser avaliados por rota.
- Laboratório `bfpjtfqlnypisxljoxkb`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations, duas Edge Functions (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3).
- Não existe terceiro projeto full-product TEST.
- Não existe função server-mediated de sinalização implantada em produção.

## Issues e aceitação manual

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): aberta, **0/8** critérios físicos marcados. Nenhum teste manual de queda real, reconexão sem F5, microfone, permissões reais de tela ou interoperabilidade instalada foi realizado nesta execução.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): comentário QA dedicado atualizado separadamente; comentário da Engenharia preservado.

## Recomendações prioritárias

1. Escolher uma única arquitetura Normal. Reconciliar AUTH-03 de #133 com chat staged/signed upload de #142/#151 e guard de publicação #143, sem merge cego de branches divergentes.
2. Portar a paridade de HTTP contract para a Edge Function efetivamente implantada no laboratório e adicionar verificação de endpoint real/status/body ao processo de validação.
3. Alinhar Normal e Team Lite em uma única estratégia de tópico, com transporte autenticado privado/server-mediated como padrão seguro; remover listeners públicos sensíveis.
4. Corrigir o workflow oficial Team Lite para o slug `upstatus-team-lite`, SHA exato, project ref validado, CLI fixada e aprovação humana no head exato. Não executar o workflow atual.
5. Integrar AUTH-03 às duas APIs e validar consumo/limite por HTTP real no laboratório antes de qualquer plano de produção.
6. Corrigir grants, Default ACL, funções SECURITY DEFINER e políticas de Storage com plano revisado pelo owner.
7. Recuperar/validar proveniência das quatro migrations originais; diagnosticar `MIGRATIONS_FAILED`.
8. Corrigir Validate da QA sem remover assertions.
9. Executar os oito testes físicos da #78 e obter review/aprovação humana explícita.

## Classificação final

- **CI aprovado:** #74 Validate/Smoke (com etapa de rate limit de convite skipped), #76 110/110, #133 136/136, #143 Validate, #147 Full Validate, #149 Guard + Candidate Checks (110/110 e 11/11 helper HTTP), #151 Full Validate.
- **CI falhou:** #82 Validate no HEAD QA atual, por `production updateURL mismatch`.
- **Inspeção de código/banco:** bundles implantados, tópicos, triggers, grants, RLS, Default ACL, Storage, migrations e contrato HTTP do laboratório.
- **Teste manual:** nenhum realizado.
- **Pendente/bloqueado:** integração Normal/Team Lite, RT-01, AUTH-03 em produção, ACL/Storage, proveniência, HTTP parity implantado, reconexão física e aprovação humana.

**Veredito: NOT READY.** Não publicar nem executar os workflows de produção atuais.
