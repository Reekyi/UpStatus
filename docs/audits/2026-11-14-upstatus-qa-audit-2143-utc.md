# Auditoria independente de qualidade — UpStatus

**Data:** 14/11/2026 · 21:43 UTC  
**Repositório:** [Reekyi/UpStatus](https://github.com/Reekyi/UpStatus)  
**QA:** `qa/release-readiness-2026-11-04-master`  
**Veredito:** **NOT READY**

## 1. Classificação e limites

- **CI:** resultados de workflows existentes inspecionados por SHA e logs. Nenhum workflow foi iniciado ou repetido pela auditoria.
- **Inspeção de código:** templates, userscripts candidatos, workflows, artefatos servidos pelas Edge Functions, funções PostgreSQL, triggers, grants e Advisors.
- **Teste manual:** nenhum. Não havia navegador/Tampermonkey nem ambiente local de execução integrado disponível.
- **Pendente:** reconexão física sem F5, microfone, captura real de tela, interoperabilidade instalada e revisão humana.
- **Bloqueado:** transporte autenticado completo em produção, Full-Product TEST, AUTH-03 em produção, hardening de ACL/Storage e workflow Team Lite.

GitHub e Supabase foram usados somente para leitura, exceto a criação deste arquivo novo na branch QA e a atualização do comentário QA dedicado na Issue #79. Não houve escrita SQL.

## 2. Heads, PRs e documentação

| Referência | HEAD | Resultado / observação |
|---|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` | Base atual |
| `develop` | `6b33e1e` | Linha divergente |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` | Workflow de deploy incorreto |
| QA | `aaff38e3e3129ce66354565da145f0b92dccbfe9` | 319 commits à frente e 1 atrás de master |

A comparação master → QA mostra 169 arquivos alterados na PR #82, todos sob `docs/`. Não há alteração de runtime na QA.

| PR | HEAD auditado | Estado | Evidência |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `dcaf6a0` | CI Validate + Smoke PASS | [Validate](https://github.com/Reekyi/UpStatus/actions/runs/43376770142) · [Smoke](https://github.com/Reekyi/UpStatus/actions/runs/43376770200) |
| [#75 Team Lite](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b9` | PASS histórico, não substitui a #76 | [Candidate Checks](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `83a6cc4` | Candidate Checks PASS | [Run](https://github.com/Reekyi/UpStatus/actions/runs/43363871881) |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `aaff38e3` | Validate FAIL | [Run 43638104230](https://github.com/Reekyi/UpStatus/actions/runs/43638104230) |
| [#167 Builder/Chat](https://github.com/Reekyi/UpStatus/pull/167) | `d100b082` | Validate PASS, sem Smoke | [Run 43635704388](https://github.com/Reekyi/UpStatus/actions/runs/43635704388) |

As PRs obrigatórias continuam abertas e Draft, sem reviews humanas observadas. A #82 falhou no SHA exato `aaff38e3`: `production updateURL mismatch`, em `scripts/validate.mjs:26`. O log constrói PROD/TEST 3.4.7 e falha antes de concluir a validação.

### CI de candidatos adicionais

- [#165 Normal](https://github.com/Reekyi/UpStatus/pull/165): guard de proveniência e contrato HTTP 409 passaram em CI de branch. [Run](https://github.com/Reekyi/UpStatus/actions/runs/43619801133). Não equivale a Smoke integrado em produção.
- [#166 Team Lite](https://github.com/Reekyi/UpStatus/pull/166): guard offline de origem autenticada passou. [Run](https://github.com/Reekyi/UpStatus/actions/runs/43624572780).
- #74 registrou 136/136 checks autenticados, WebRTC de chamada/voz/tela, malha de três participantes e rate limit distribuído (90 aceitos, próximo HTTP 429). A etapa de rate limit de emissão de convites foi ignorada.
- #76 registrou 110/110 checks autenticados, WebRTC de chamada/voz/tela, malha, rate limit distribuído, rate limit de convites isolado e testes de ciclo de vida Team Lite.
- #167 passou no Validate offline e nos testes de regressão do composer, link cards, compartilhamento de tela, mute, cores de remetente, notificações e unread. Não houve Smoke Supabase ou teste manual.

## 3. Builder, chat e autorização

A #167 separa o URL de distribuição do endpoint de API. O builder usa `release.scriptUrl` e exige correspondência exata com o endpoint estável `/upstatus/upstatus.user.js`. O userscript Normal já servido em produção possui `@updateURL` e `@downloadURL` estáveis corretos; o erro estava na geração do próximo artefato, não no header instalado.

A #167 também altera o composer: anexos ficam pendentes até o envio da mensagem, com preview e remoção; a regressão anterior de anexos staged em vez de enviados imediatamente foi substituída por um fluxo explícito de anexo pendente. A validação passou, mas o novo comportamento ainda precisa de teste manual no Sale Smartly.

A limpeza global do chat agora exige a conta Ricardo e o papel persistido `implementation_admin` tanto no cliente quanto no servidor. O servidor reconsulta o papel no banco. A checagem de nome é uma restrição adicional hardcoded e deve ser mantida consistente com a política administrativa.

O builder deixou de apagar recursivamente a pasta da função antes de escrever `index.ts`. A inspeção da árvore da #167 encontrou arquivos auxiliares rastreados (`backend_v25_bundle.ts` e `index_v25_loader.ts`) nessa pasta; removê-los destruiria dependências do runtime. O build atual preserva esses arquivos e reescreve o entrypoint.

## 4. Normal e Team Lite: instalados versus candidatos

Decodifiquei o userscript Base64 embutido nos artefatos efetivamente servidos:

| Produto | Edge Function | Versão instalada |
|---|---|---:|
| Normal | `upstatus` v480 | 3.4.7 |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 |

Os dois clientes instalados criam `channel(UP_REALTIME_TOPIC)` sem `private:true` e sem `realtime.setAuth()`. O tópico dos clientes é `upstatus-screen-share-live-3-1-1-beta10`; o tópico usado pelos triggers PostgreSQL é `upstatus-live-6f5e7b31-...`.

Normal encaminha `remote_command` diretamente a `executeRemoteCommand` e encaminha `call_signal`, voz e tela aos respectivos handlers. Team Lite verifica a sessão local e a geração de autenticação, mas não comprova a identidade do emissor do broadcast.

Nos candidatos #74/#76, a propriedade `_authenticatedTransport` ainda aparece dentro do payload de `call_signal`, permitindo falsificação por quem publica no canal público. As PRs #165/#166 corrigem a proveniência passando a origem autenticada fora do payload; eventos públicos são tratados como não autenticados. Essas correções continuam em branches separadas, abertas e não integradas às linhas #74/#76.

Mesmo nos candidatos, `signalTransportFlag` permanece desativada por padrão e o endpoint configurável fica vazio. Os templates `src/server/index.template.ts` e `src/server/team-lite-index.template.ts` não implementam as rotas server-mediated correspondentes. Não existe função de sinalização equivalente implantada em produção; `upstatus-signal-test` existe apenas no laboratório.

### Workflow oficial Team Lite

O workflow `.github/workflows/deploy-production.yml` na branch `team-lite-official` executa `supabase functions deploy upstatus`, em vez de `upstatus-team-lite`; usa CLI `latest` e não faz as verificações de projeto/SHA/preflight presentes no fluxo Normal. **Não despachar esse workflow.**

### Contrato HTTP de voz

O CI de #165 testa o mapeamento de `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409. A função implantada no laboratório `upstatus-signal-test` v32 ainda mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para 409, mas não contém `VOICE_ATTEMPT_ALREADY_ACTIVE`. O contrato do helper candidato passou; o handler implantado ainda não corresponde. Nenhuma chamada HTTP foi feita pela auditoria.

## 5. Realtime e PostgreSQL de produção

Os três triggers de broadcast estão habilitados:

- `upstatus_messages_broadcast`: AFTER INSERT/UPDATE/DELETE em `public.messages`.
- `upstatus_remote_state_broadcast`: AFTER INSERT/UPDATE OF value em `public.upstatus_state`, para `remote-status`.
- `upstatus_users_broadcast`: AFTER UPDATE de status, reason, updated_at e sync em `public.users`.

`upstatus_broadcast_messages()` serializa a linha OLD/NEW inteira com `to_jsonb` e chama `realtime.send(..., 'db_change', ..., false)`. Isso pode incluir texto da mensagem, URL de anexo, menções, resposta, reações e nome de arquivo. `upstatus_broadcast_remote_state()` envia metadados de comando/resultado; `upstatus_broadcast_users()` envia nome, status, reason, updated_at e sync.

Snapshot de 14 dias em `realtime.messages`: 72 `user_status`, 26 `db_change`, 4 `remote_command` e 4 `remote_result`; todos os 106 registros observados têm `private=false` e estão no tópico dos triggers. Os tópicos dos triggers e dos clientes instalados não coincidem.

**Impacto:** há um caminho de divulgação potencial de conteúdo de chat e metadados por broadcast público. A configuração de acesso público efetivo do Dashboard não foi exposta pelo conector e não foi reproduzido acesso externo; portanto, não classifico como vazamento externo comprovado. Não foram publicados broadcasts de teste.

`realtime.messages` tem RLS habilitado, FORCE RLS desabilitado, zero policies e grants SELECT/INSERT/UPDATE para anon e authenticated.

## 6. RLS, grants, SECURITY DEFINER e Storage

| Indicador de produção | Resultado |
|---|---:|
| Tabelas públicas com RLS | 10 |
| Policies em public/realtime/storage | 0 |
| Tabelas com grants amplos a anon/authenticated | 9 |
| Grants diretos observados | 126 |
| Registros Default ACL | 24 |
| Entradas Default ACL expandidas | 300 |

Os nove objetos concedem SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER a anon e authenticated. RLS sem policies não protege TRUNCATE. Nenhuma operação destrutiva foi tentada.

As três funções `upstatus_broadcast_*` são SECURITY DEFINER, `search_path=public` e têm EXECUTE para PUBLIC, anon, authenticated e service_role. O Security Advisor de produção reporta três WARN para anon e três WARN para authenticated, descrevendo execução via `/rest/v1/rpc/<função>`. A auditoria não tentou invocar essas RPCs.

Storage: `chat-images` e `profile-images` são públicos, limite de 20 MiB cada, com 168 e 20 objetos respectivamente. `storage.objects` não tem policies próprias. A leitura pública depende da URL do objeto; não há isolamento por usuário comprovado nesta auditoria.

## 7. AUTH-03, Edge Functions e ambiente isolado

**Produção** (`dlfvkawaiqduhlazsszm`): ACTIVE_HEALTHY, PostgreSQL 17.11.0.002, 7 migrations e 38 Edge Functions ACTIVE; todas reportam `verify_jwt=false` no nível da plataforma. Os handlers core usam token customizado, então esse campo sozinho não prova ausência de autorização. Produção tem 5 usuários, 319 sessões, 5 perfis e 302 mensagens.

Produção não tem colunas `setup_token_*`, tabela de rate limit de convite, tabela `upstatus_auth_rate_limits` ou RPC de consumo de convite. As sessões e perfis consultados não têm `user_id`.

**Laboratório** (`bfpjtfqlnypisxljoxkb`): ACTIVE_HEALTHY, PostgreSQL 17.11.0.003, 39 migrations e duas Edge Functions ACTIVE (`upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3). Possui colunas de setup token, tabela `upstatus_setup_invite_rate_limits` e RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit`; ambas SECURITY INVOKER, `search_path` vazio e EXECUTE somente para postgres/service_role. Não há rate limit genérico de login.

O laboratório tem 18 tabelas públicas com RLS e zero policies, sem grants diretos de tabela para anon/authenticated, mas permanece vazio: zero usuários, mensagens, sessões, perfis, buckets e objetos. É um projeto isolado, porém **não é Full-Product TEST**.

A branch Supabase gerenciada `main` no projeto de produção continua `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`; a causa não foi determinada.

Security Advisor: produção 10 INFO de RLS sem policy e 6 WARN de SECURITY DEFINER (3 anon + 3 authenticated); laboratório 18 INFO e zero WARN. Health Advisor de produção retornou lista vazia.

## 8. Issues e aceitação física

- [Issue #78](https://github.com/Reekyi/UpStatus/issues/78): 0/8 critérios físicos concluídos. Reconexão sem F5, microfone, tela e interoperabilidade instalada continuam pendentes.
- [Issue #79](https://github.com/Reekyi/UpStatus/issues/79): corpo com 16 itens marcados e 19 pendentes.
- Nenhum teste físico/manual foi executado nesta rodada.

## 9. Gates e recomendação

| Gate | Estado | Justificativa |
|---|---|---|
| RT-01 | blocked | Broadcast público, payload completo, proveniência não integrada e backend server-mediated ausente em produção |
| TEST-ISOLATION | blocked | Laboratório isolado, mas vazio e sem fixtures Full-Product |
| AUTH-03 | blocked | Setup tokens e rate limit existem parcialmente apenas no laboratório; produção sem estruturas correspondentes |
| ACL-STORAGE | blocked | Grants/Default ACL amplos, SECURITY DEFINER executáveis por papéis cliente, buckets públicos sem policies |
| RECONNECT | pending | Issue #78 continua 0/8; nenhum teste físico sem F5 |
| HUMAN-REVIEW | pending | PRs obrigatórias continuam Draft e sem aprovação humana |

**Recomendação: NOT READY.** Prioridades: minimizar payloads públicos de Realtime e restringir EXECUTE; integrar a proveniência autenticada e implementar backend server-mediated nos dois produtos; corrigir o workflow Team Lite; concluir AUTH-03 e hardening de ACL/Storage; provisionar Full-Product TEST; executar os testes físicos e obter aprovação humana.

## 10. Segurança da execução

Todas as consultas SQL desta rodada foram SELECT-only. Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags, alteração de grants/policies/ACL ou operação destrutiva. Não foi iniciado workflow manual. A única escrita no GitHub foi este arquivo novo na branch QA e a atualização do comentário dedicado `<!-- UPCONTROL:QA -->` na Issue #79; o comentário da Engenharia foi preservado.