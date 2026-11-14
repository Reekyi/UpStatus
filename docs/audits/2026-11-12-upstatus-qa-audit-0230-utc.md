# UpStatus — auditoria independente de qualidade
**Execução:** 2026-11-12 02:30 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Produção Supabase:** `dlfvkawaiqduhlazsszm`  
**Laboratório Supabase:** `bfpjtfqlnypisxljoxkb`  
**Veredito:** **NOT READY**

## 1. Método e classificação

Esta rodada foi de inspeção read-only em GitHub e Supabase, revisão de logs de CI, leitura de código-fonte das candidatas e bundles das Edge Functions implantadas, consultas SQL exclusivamente SELECT e leitura integral de `docs/RELEASE_READINESS.md`.

- **CI:** resultado de workflow no SHA exato informado.
- **Inspeção de código:** comportamento observado estaticamente em fonte, bundle ou configuração; não equivale a exploração nem a teste de runtime.
- **Manual pendente:** exige navegador real, dispositivo ou confirmação humana.
- **Bloqueado:** dependência objetiva ainda não satisfeita.

Não executei testes manuais, não rodei scripts localmente, não repeti workflows e não alterei código de produto.

## 2. Heads reais e governança

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| QA `qa/release-readiness-2026-11-04-master` | `8f6a3f437557c6ad9c67a5a2c79beeed03486e55` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

QA está **235 commits à frente e 1 atrás** de master. Não fiz rebase.

As três branches consultadas estão sem proteção e a API de rulesets retornou `[]`. Também não há required status checks configurados.

As PRs principais permanecem abertas e Draft. A consulta de reviews retornou zero submissões para #74, #75, #76, #82, #89, #131, #143 e #146.

## 3. Documento de prontidão

Li o arquivo inteiro `docs/RELEASE_READINESS.md`: **8.410 linhas**. O último checkpoint dentro desse documento ainda é de **2026-11-08 18:30 UTC**. O conteúdo é histórico e precisa ser combinado com os heads e estados de runtime reconsultados nesta rodada.

O arquivo original não foi alterado. Este relatório é um arquivo novo.

## 4. PRs e CI no HEAD exato

| PR | HEAD consultado | CI observado | Classificação |
|---|---|---|---|
| #74 Normal | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) e Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) SUCCESS | Smoke passou, mas a etapa de rate limit de emissão de convite ficou **SKIPPED** |
| #75 Team Lite baseline | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) SUCCESS | PASS histórico |
| #76 Team Lite | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Candidate Checks [43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) SUCCESS | PASS no HEAD atual |
| #82 QA | `8f6a3f437557c6ad9c67a5a2c79beeed03486e55` | Validate [43136072199](https://github.com/Reekyi/UpStatus/actions/runs/43136072199) FAILURE | Falha em `production updateURL mismatch` |
| #89 AUTH-03 Normal | `5c46eea3e4c9f909d3e0992bacfbd2263c2d8024` | Guard [42840853509](https://github.com/Reekyi/UpStatus/actions/runs/42840853509) SUCCESS | Guard e enrollment candidato aprovados |
| #131 AUTH-03 rate limit | `17169a30a9b93d1b6f870d1632e3fd0502cb1a8b` | Smoke [42760281798](https://github.com/Reekyi/UpStatus/actions/runs/42760281798) SUCCESS | Log registra **136/136** verificações autenticadas |
| #141 updater/chat | `4dba48196a1a605557ac7a853f6ae4adff0ea555` | Validate [43085700956](https://github.com/Reekyi/UpStatus/actions/runs/43085700956) SUCCESS | PASS |
| #142 API Normal | `2ffb8d9e78f7dea9b057de9b4079c4aeb3aaf6c4` | Validate [43085494740](https://github.com/Reekyi/UpStatus/actions/runs/43085494740) SUCCESS | PASS |
| #143 dispatcher | `c4a04fa755b877bc76b1372170a26e7b974264e6` | Validate [43093687347](https://github.com/Reekyi/UpStatus/actions/runs/43093687347) SUCCESS | Contrato offline passou |
| #145 remote hints | `bbfda9dfe53f25535c697586fce63917ee674e1f` | Validate [43100913884](https://github.com/Reekyi/UpStatus/actions/runs/43100913884) SUCCESS | PASS |
| #146 remote hints + recovery | `71c5ce2f730ade8ee3e8b090498202933809ce5c` | Validate [43108250452](https://github.com/Reekyi/UpStatus/actions/runs/43108250452) SUCCESS | PASS |

O log atual da #76 confirma negociação WebRTC com entrega de áudio e vídeo remotos, mesh de três participantes, rate limit de sinalização (90 aceitos e 1 HTTP 429), consumo atômico de convite, rate limit de emissão, recuperação do scheduler após `SUBSCRIBED` e rejeição de sessão obsoleta. O comentário da Engenharia reporta 110/110; o log baixado nesta auditoria confirma o job SUCCESS, mas não imprime esse contador numérico. Por isso, a QA registra o SUCCESS e as verificações visíveis, sem tratar o número como contador independente do log.

A #76 está **325 commits à frente e 0 atrás** da #75; #75 é baseline histórica, não uma segunda linha de release independente.

A comparação #142 → #143 está divergente (**15 à frente / 2 atrás**). A comparação #142 → #146 mostra #146 **8 à frente / 0 atrás**. Portanto, o dispatcher #143 não contém a correção posterior #146. A comparação entre a linha #89 e #131 também é divergente (**884 à frente / 94 atrás**); não fazer cherry-pick cego entre elas.

## 5. Falha recorrente do Validate QA

A falha foi reproduzida pelo workflow automático no HEAD exato da QA. O log de [43136072199](https://github.com/Reekyi/UpStatus/actions/runs/43136072199) mostra:

`VALIDATION FAILED: production updateURL mismatch`

A causa está no código de build herdado de master:

- `scripts/build.mjs` em master monta o `updateURL` de produção usando o runtime beta10.
- `scripts/validate.mjs` em master exige que o userscript de distribuição seja servido por `/functions/v1/upstatus/upstatus.user.js`.
- `release.json` da candidata #141 já aponta para a URL correta de distribuição `upstatus`.
- #141 usa `release.scriptUrl` para o updater e mantém `PROD_API_FUNCTION` separado para tráfego de API; seu Validate passou.

A correção deve ser integrada à linha QA/master. Não enfraquecer o validator.

## 6. Comandos remotos e compatibilidade Normal / Team Lite

### Runtimes implantados

A inspeção dos bundles efetivamente embutidos nas Edge Functions encontrou:

| Runtime | Edge Function | Userscript embutido | Achado |
|---|---|---|---|
| Normal | `upstatus` v480 | 3.4.7 | Listener de `remote_command` executa o payload recebido pelo broadcast |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | Listener valida a própria sessão, mas executa o comando recebido no broadcast |
| API beta10 | `upstatus-screen-share-3-1-1-beta10` v6 | 3.1.1-beta8 | Bundle embutido é beta8 e aponta seu `CLOUD_SERVER` para o slug beta8 |

A configuração de plataforma `verify_jwt=false` está em **38/38** Edge Functions de produção. Isso, isoladamente, não prova que todos os handlers sejam anônimos: os handlers principais também implementam autenticação customizada por token de sessão. O risco confirmado nesta rodada é o processamento de payload Realtime público e o caminho antigo de primeiro acesso.

### Candidatas

- #145/#146 tratam `remote_command` e `remote_result` como hints e recuperam dados por API autenticada.
- #76 Team Lite também usa o broadcast apenas como aviso para polling autenticado e vincula o scheduler à sessão ativa.
- #143 ainda não contém #146 e conserva o handler antigo na linha do dispatcher. Não publicar o HEAD atual de #143.
- #76 usa tópico legado, alinhado aos triggers atuais.
- #146 Normal usa tópico beta10 no build atual; não está alinhado ao tópico legado dos triggers.
- #143 limita o evento `pull_request` do workflow do dispatcher à base `master`. Como a PR #143 tem base #142, seu Guard próprio não é executado como check de PR nessa branch empilhada; o Validate separado passou.

## 7. Voz e compartilhamento de tela

A candidata Team Lite #76 contém transporte server-mediated, mas ele é opt-in:

- `signaling_transport_enabled` começa em `false`.
- `signaling_transport_endpoint` começa vazio.
- Com a flag desligada, o envio e a recepção continuam usando broadcasts públicos.
- Com a flag ligada, o código passa a exigir o transporte autenticado e rejeita sinalização pública não autenticada, com exceções limitadas de descoberta.

O Normal #146 não contém esse adapter de voz/tela. Assim, a mitigação de comandos remotos não resolve a sinalização pública de `call_signal`, voice-room e screen-share.

A candidata Team Lite e o Normal candidato também não estão alinhados no tópico Realtime. Os clientes instalados Normal/Team Lite usam beta10; os triggers de produção usam o tópico legado; Team Lite #76 usa legado e Normal #146 usa beta10.

## 8. Supabase — fotografia read-only

### Produção `dlfvkawaiqduhlazsszm`

- Projeto `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- **7 migrations** aplicadas.
- **109** registros em `realtime.messages`, todos `private=false`, no tópico `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`.
- Dez tabelas públicas com RLS habilitado e sem policies: `chat_reads`, `messages`, `reactions`, `status_history`, `upstatus_profiles`, `upstatus_sessions`, `upstatus_state`, `upstatus_typing`, `upstatus_visual_config`, `users`.
- Nove dessas tabelas têm grants diretos para `anon` e `authenticated`: 126 entradas no total, cobrindo DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE. RLS não protege TRUNCATE.
- `realtime.messages`: RLS habilitado, FORCE RLS desabilitado, zero policies e SELECT/INSERT/UPDATE para anon e authenticated.
- 166 grants diretos de cliente somando os schemas: 126 em `public`, 32 em `storage` e 8 em `realtime`.
- **120 itens Default ACL** para anon/authenticated, distribuídos entre `graphql`, `graphql_public`, `public` e `storage`, incluindo defaults de sequences, functions e tables. Parte desse inventário está em schemas gerenciados pelo Supabase; não atribuir tudo ao código UpStatus.
- Dois buckets públicos: `chat-images` e `profile-images`, limite de 20 MiB cada; 188 objetos no total; zero policies próprias em `storage.objects`.
- `public.messages`: 296 linhas; `file_name` está NULL nas 296.
- As três funções públicas `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, têm `search_path=public) e EXECUTE para anon/authenticated. O Advisor retorna três WARN para anon e três WARN para authenticated.
- O trigger de mensagens publica a linha OLD/NEW completa em `db_change`; os triggers de remote-state publicam metadados de comando/resultado; todos usam `private=false` e o tópico legado.

**Correção de contagem:** a consulta atual encontrou 120 itens Default ACL, não 75. O número 75 das rodadas anteriores estava subcontado.

### Laboratório `bfpjtfqlnypisxljoxkb`

- Projeto `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- **39 migrations**.
- 18 tabelas públicas com RLS e sem policies, mas zero grants diretos para anon/authenticated em tabelas do schema public.
- 96 itens Default ACL.
- `realtime.messages` tem RLS, zero policies e ainda concede SELECT/INSERT/UPDATE a anon/authenticated.
- Zero fixtures nas tabelas de aplicação consultadas; sem buckets ou objetos Storage.
- A tabela `upstatus_setup_invite_rate_limits` e as RPCs `consume_upstatus_setup_invite` e `consume_upstatus_setup_invite_rate_limit` existem. As duas RPCs são SECURITY INVOKER, usam search_path vazio e concedem EXECUTE somente a postgres/service_role.
- `upstatus-signal-test` v32 e `upstatus-signal-e2e-once` v3 são as duas Edge Functions do laboratório. O handler v32 mapeia `VOICE_ATTEMPT_ALREADY_ACTIVE` para HTTP 409.

A organização tem somente **dois projetos**: produção e laboratório de segurança. Não existe terceiro projeto full-product TEST. O laboratório está isolado e limpo, mas não substitui um ambiente completo de teste.

## 9. AUTH-03 e proveniência das migrations

- Produção não possui a tabela de rate limit de convites nem as duas RPCs de consumo.
- #89 implementa enrollment por convite no Normal, mas seu server template não chama o rate limit de emissão.
- #131 adiciona rate limit ao Normal.
- #76 Team Lite contém enrollment e rate limit.
- A migration de rate limit tem o mesmo Git blob SHA nas candidatas #76 e #131: `ab73b5cd8200147a449327d21798eef588834d50`.
- O teste de migration também é idêntico: `bd12f37dc464c3b1ab322494914d0763fa733d49`.
- A integração de #89, #131 e #76 ainda precisa ser reconciliada na API e no release; produção continua sem AUTH-03.

O diretório `supabase/migrations` de master contém somente três arquivos SQL, enquanto o ledger de produção contém sete migrations. Quatro fontes originais permanecem ausentes e estão classificadas no dispatcher como `ledger-recovered-only`. #143 falha fechado quando a proveniência não pode ser verificada, o que é correto, mas seu manifesto ainda não inclui a migration de rate limit `20261109230000_setup_invite_rate_limit.sql`.

A branch gerenciada Supabase `main` está em `MIGRATIONS_FAILED`; o preview está `ACTIVE_HEALTHY`.

## 10. Workflow Team Lite

O workflow oficial em `team-lite-official/.github/workflows/deploy-production.yml`:

- é apenas `workflow_dispatch`;
- usa Supabase CLI `latest`;
- executa `supabase functions deploy upstatus`;
- não aponta para o slug `upstatus-team-lite`.

**Não despachar esse workflow.** Nenhum deploy foi executado nesta auditoria.

## 11. Issues e aceitação manual

- Issue [#78](https://github.com/Reekyi/UpStatus/issues/78): todos os oito critérios físicos continuam desmarcados. Não houve teste de queda real de internet, reconexão sem F5, reentrada em sala ou interoperabilidade instalada.
- Issue [#79](https://github.com/Reekyi/UpStatus/issues/79): comentário dedicado QA atualizado; comentário da Engenharia preservado.

CI de Chromium/WebRTC é evidência automatizada, não aceitação manual com microfone, compartilhamento de tela e rede reais.

## 12. Gates finais

| Gate | Estado | Motivo |
|---|---|---|
| RT-01 | **blocked** | 109 broadcasts públicos, tópicos divergentes e SECURITY DEFINER expostas |
| TEST-ISOLATION | **blocked** | Laboratório limpo, mas sem terceiro projeto full-product TEST |
| MIGRATION-PROVENANCE | **blocked** | Quatro SQLs originais ausentes; manifesto precisa incluir AUTH-03 |
| AUTH-03 | **in_progress** | Candidatas e testes existem; produção ainda não tem schema/RPCs |
| ACL-STORAGE | **blocked** | Grants amplos, Default ACL, buckets públicos e zero policies |
| RECONNECT | **pending** | Falta confirmação física Normal e Team Lite sem F5 |
| HUMAN-REVIEW | **pending** | Nenhuma aprovação humana registrada nos candidatos consultados |

## 13. Próximas prioridades

1. Integrar #146 ao dispatcher #143 e executar Guard no evento PR correto.
2. Tornar voz/tela autenticadas por padrão em Normal e Team Lite.
3. Alinhar tópico Realtime, payloads e triggers.
4. Reconciliar AUTH-03 completo, incluindo rate limit, nas duas APIs.
5. Recuperar os quatro SQLs originais e atualizar o manifesto de proveniência.
6. Endurecer grants, Default ACL e Storage com plano revisado.
7. Criar ambiente full-product TEST separado.
8. Corrigir build/Validate da QA sem enfraquecer o validator.
9. Executar aceitação física #78 e obter aprovação humana.

## 14. Registro de segurança

Todas as consultas SQL desta rodada foram SELECT-only. GitHub foi usado para leitura de refs, arquivos, PRs, workflows e logs, com escrita somente no novo relatório da branch QA e no comentário QA dedicado da Issue #79.

Não houve merge, deploy, migration, release, publicação de userscript, alteração de secrets/flags/roles/grants/policies/ACL, operação destrutiva ou teste físico. Nenhuma branch de Engenharia e nenhum comentário da Engenharia foi alterado.
