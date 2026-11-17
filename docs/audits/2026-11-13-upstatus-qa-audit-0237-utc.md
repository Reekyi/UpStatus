# Auditoria independente de qualidade do UpStatus

**Data:** 2026-11-13 02:37 UTC  
**Repositório:** `Reekyi/UpStatus`  
**Supabase produção:** `dlfvkawaiqduhlazsszm`  
**Supabase laboratório:** `bfpjtfqlnypisxljoxkb`  
**Recomendação:** **NOT READY**

## 1. Método e limites

Esta rodada foi uma inspeção read-only de GitHub, workflows, artefatos das Edge Functions, catálogo PostgreSQL, migrations e advisors Supabase. Os resultados de CI abaixo são logs existentes, executados nos SHAs indicados. Não executei scripts de produto, novos workflows, chamadas HTTP de voz, upload real no Storage, exploração de Realtime ou testes físicos no navegador/Tampermonkey.

Não houve escrita SQL, alteração de produção, migration, deploy, merge, release, publicação de userscript, alteração de secret/flag/role/grant/policy/ACL ou limpeza de fixtures. A única escrita desta rodada é este relatório novo na branch QA.

Vocabulário:
- **CI PASS/FAIL:** resultado observado no workflow e SHA indicados.
- **CODE INSPECTION:** conclusão de leitura estática de código/configuração.
- **MANUAL PENDING:** depende de navegador, dispositivo, permissões ou confirmação humana.
- **BLOCKED:** existe dependência ou risco que impede liberar.

## 2. Heads e integridade das branches

| Referência | HEAD |
|---|---|
| `master` | `9d40461babcec8eb8686c2a04be9c675df7da381` |
| `qa/release-readiness-2026-11-04-master` | `e593205e35b6caffcfa8a6051e93d4d2fc3f3872` |
| `team-lite-official` | `9065bc1536fde64f437f6f12b7abb9b072cb8281` |

O compare entre QA e master retornou 267 commits à frente, 1 atrás, com merge base `a9288ccfcb0f308d3a587bfca624418a395be07b`. Os 126 arquivos divergentes são todos de `docs/`; não encontrei divergência de código de produto na branch QA.

Li integralmente `docs/RELEASE_READINESS.md` na branch QA: 8.410 linhas e 1.045.105 bytes. O último checkpoint técnico dentro desse documento continua em 2026-11-08 18:30 UTC. O documento principal não foi alterado.

## 3. PRs obrigatórias e candidatas relevantes

| PR | HEAD | Estado | Evidência observada |
|---|---|---|---|
| [#74 Normal](https://github.com/Reekyi/UpStatus/pull/74) | `fb878537d95db9097cce6d29a14260b9fd8d2e3d` | Open / Draft | Validate [42753434411](https://github.com/Reekyi/UpStatus/actions/runs/42753434411) PASS; Smoke [42753434336](https://github.com/Reekyi/UpStatus/actions/runs/42753434336) PASS |
| [#75 Team Lite baseline](https://github.com/Reekyi/UpStatus/pull/75) | `7bbf9b90b3a7a04301cf4f7ed32d340dce3d4309` | Open / Draft | Candidate Checks [41674353127](https://github.com/Reekyi/UpStatus/actions/runs/41674353127) PASS histórico |
| [#76 Team Lite](https://github.com/Reekyi/UpStatus/pull/76) | `c4dee8d2c502499de5f95932ac14a90cffb56196` | Open / Draft | Candidate Checks [43124413080](https://github.com/Reekyi/UpStatus/actions/runs/43124413080) PASS, 110/110 checks autenticados |
| [#82 QA](https://github.com/Reekyi/UpStatus/pull/82) | `e593205e35b6caffcfa8a6051e93d4d2fc3f3872` | Open / Draft | Validate [43345603478](https://github.com/Reekyi/UpStatus/actions/runs/43345603478) FAIL |
| [#157 avatar Team Lite](https://github.com/Reekyi/UpStatus/pull/157) | `b7baf3a98e22b8a9555d667878e49e121d7bcf8c` | Open / Draft | Push [43333821827](https://github.com/Reekyi/UpStatus/actions/runs/43333821827) e PR [43333849082](https://github.com/Reekyi/UpStatus/actions/runs/43333849082) PASS somente no job `avatar-contract` |

### #74 Normal

O Validate executou o guard de destino TEST e o build. O Smoke executou verificações não autenticadas, integração autenticada, navegador Chromium, negociação WebRTC de chamada/voz/tela, malha de três participantes, teardown, rate limit distribuído, recibos de chat e consumo de convite. O log registra 136/136 verificações autenticadas aprovadas, entrega de áudio/vídeo remoto, 90 requisições aceitas e uma rejeitada com HTTP 429 e `Retry-After: 60s`.

### #75 e #76 Team Lite

A #75 é baseline histórico e não deve ser somada como payload independente à #76. A #76 é a linha atual de Team Lite. Seu log registra 110/110 verificações autenticadas, WebRTC em Chromium, mesh de três participantes, teardown, rate limit distribuído, consumo atômico de convite e rate limit de emissão. O mesmo job executa testes de recuperação offline/online e contratos de saída/reentrada, mas isso não é teste físico de perda de rede em Tampermonkey.

### #82 QA

O Validate falhou no HEAD atual da branch QA com:

`VALIDATION FAILED: production updateURL mismatch`

O log aponta a assertion em `scripts/validate.mjs:26`. Não removi a assertion e não executei rerun manual.

### #157 avatar Team Lite

A PR está baseada na #156, permanece Draft e não possui reviews humanas. Os dois workflows executaram apenas `avatar-contract`; não são o Validate completo e não fazem PUT real no Storage.

A candidata melhora o prefixo de avatar para derivar de `users.id`, mas a inspeção do template confirma:
- `createSession()` ainda grava somente `user_name` em `upstatus_sessions`.
- `userFromToken()` recupera e devolve somente `user_name`.
- `avatarUserId(name)` resolve o ID novamente pelo nome, não por um ID vinculado ao token.
- `upstatus_profiles` continua identificado por `user_name`, sem `user_id`.

No banco de produção, `users.name` não possui UNIQUE. O prefixo por ID, isoladamente, não torna a sessão imutável e não resolve rename, reutilização de nome ou perfil herdado por nome.

### Candidatas de publicação e migrations

- [#128](https://github.com/Reekyi/UpStatus/pull/128) e [#129](https://github.com/Reekyi/UpStatus/pull/129) continuam Open / Draft e não integradas à branch oficial.
- [#129](https://github.com/Reekyi/UpStatus/pull/129) propõe desativar o dispatcher legado Team Lite sem capacidade de deploy.
- [#128](https://github.com/Reekyi/UpStatus/pull/128) propõe aprovação humana allowlisted no SHA exato, mas depende da variável `UPSTATUS_RELEASE_REVIEWERS` e de proteção do ambiente ainda não verificada.
- [#135](https://github.com/Reekyi/UpStatus/pull/135) continua Open / Draft. Arquiva statements recuperados do ledger em `docs/migration-recovery/`; não restaura os quatro SQLs ao diretório canônico `supabase/migrations/` nem prova identidade byte a byte dos originais.
- [#152](https://github.com/Reekyi/UpStatus/pull/152) e [#154](https://github.com/Reekyi/UpStatus/pull/154) continuam Open / Draft. A #154 depende da cadeia #152, cuja base QA é anterior ao HEAD atual.

## 4. Artefatos realmente instalados

Decodifiquei o userscript embutido nos códigos das Edge Functions implantadas.

| Produto | Edge Function | Versão do userscript | Namespace |
|---|---|---:|---|
| Normal | `upstatus` v480 | 3.4.7 | `upseller` |
| Team Lite | `upstatus-team-lite` v15 | 3.4.30 | `upseller-team-lite` |
| TEST | `upstatus-test` v281 | 3.3.28 | `upseller` |
| API beta10 | `upstatus-screen-share-3-1-1-beta10` v6 | auxiliar | n/a |

### TEST compartilha identidade local com Normal

O userscript TEST v281 tem:
- Mesmo `@name` do Normal.
- Mesmo namespace `upseller`.
- Mesma chave GM `upstatus_screen_share_beta8_`.
- Mesmo projeto Supabase de produção.
- Mesmo tópico Realtime beta10.
- `@updateURL` e `@downloadURL` apontando para a Edge Function `upstatus-test`.

Isso cria risco de colisão de estado local entre TEST e Normal no Tampermonkey, além da ausência de isolamento do backend. O guard de build das candidatas é uma proteção para builds futuros; não remove o runtime v281 já ativo.

### Realtime nos clientes

Normal, Team Lite e TEST criam o canal com `channel(UP_REALTIME_TOPIC)`, sem `private:true` e sem chamada a `realtime.setAuth()`. Todos recebem eventos `remote_command` e `call_signal`.

- Normal e TEST encaminham o comando recebido ao executor quando o alvo corresponde ao membro local.
- Team Lite verifica a própria sessão e a geração de autenticação, mas isso não autentica independentemente a identidade do emissor do broadcast.

A inspeção confirma um caminho de confiança no remetente que não é autenticado pelo cliente. Não foi executada exploração e não há afirmação de invasão reproduzida.

## 5. Workflows de publicação

Na branch oficial `team-lite-official`, `.github/workflows/deploy-production.yml` continua instalando Supabase CLI `latest`, lendo secrets de produção e executando:

`supabase functions deploy upstatus`

O slug `upstatus` é o backend Normal; Team Lite deveria publicar `upstatus-team-lite`. Não execute o workflow legado.

O workflow `deploy-test.yml` mantém `workflow_dispatch` e push automático em `develop`, lê `SUPABASE_PROJECT_ID` compartilhado e publica `upstatus-test`. O runtime v281 confirma que esse caminho colocou TEST no projeto de produção.

Nenhum workflow de publicação foi executado.

## 6. Supabase: projetos, Edge Functions e migrations

Existem somente dois projetos:

| Projeto | Estado | PostgreSQL | Migrations |
|---|---|---|---:|
| UpStatus produção `dlfvkawaiqduhlazsszm` | ACTIVE_HEALTHY | 17.11.0.002 | 7 |
| `upstatus-security-test` `bfpjtfqlnypisxljoxkb` | ACTIVE_HEALTHY | 17.11.0.003 | 39 |

Não existe projeto full-product TEST independente. O projeto laboratório é voltado a sinalização/autenticação e não possui buckets/objetos de chat/perfil.

A branch gerenciada `main` do projeto de produção está em `MIGRATIONS_FAILED`, embora o preview esteja `ACTIVE_HEALTHY`.

Produção tem 38 Edge Functions ACTIVE e todas reportam `verify_jwt=false`. Isso não significa automaticamente ausência de autenticação: os handlers implementam autenticação própria de sessão. Porém, aumenta a dependência de que cada rota valide corretamente o token e o contexto.

Funções relevantes:
- Normal `upstatus` v480.
- Team Lite `upstatus-team-lite` v15.
- TEST `upstatus-test` v281.
- Laboratório `upstatus-signal-test` v32.

## 7. Realtime, RLS, grants, SECURITY DEFINER e Storage

### Realtime em produção

A consulta SELECT retornou 125 mensagens persistidas, todas com `private=false` no tópico legado:

| Evento | Quantidade |
|---|---:|
| `user_status` | 67 |
| `db_change` | 46 |
| `remote_command` | 6 |
| `remote_result` | 6 |

Os triggers PostgreSQL publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, enquanto os clientes instalados assinam `upstatus-screen-share-live-3-1-1-beta10`. Os tópicos não coincidem.

`realtime.messages` tem RLS habilitado, FORCE RLS desabilitado, zero policies e privilégios SELECT/INSERT/UPDATE para anon e authenticated.

### SECURITY DEFINER e triggers

As três funções `upstatus_broadcast_messages`, `upstatus_broadcast_remote_state` e `upstatus_broadcast_users` são SECURITY DEFINER, usam `search_path=public` e têm EXECUTE efetivo para anon e authenticated.

- O trigger de mensagens transmite a linha OLD/NEW completa usando `to_jsonb` e `private=false`.
- O trigger de remote state transmite metadados de comando e resultado com `private=false`.
- O trigger de users transmite status, reason, updated_at e sync com `private=false`.

O Security Advisor de produção encontrou três WARN para anon, três WARN para authenticated e dez INFO de RLS sem policy.

### RLS, grants e Default ACL em produção

- Dez tabelas public com RLS habilitado e sem policies.
- Nove tabelas public concedem privilégios amplos a anon/authenticated; 18 grants TRUNCATE somados entre os dois papéis.
- 300 itens de ACL expandida em Default ACL; 120 privilégios concedidos a anon/authenticated.
- FORCE RLS não está habilitado nessas tabelas.

### Storage em produção

| Bucket | Público | Limite | Objetos |
|---|---|---:|---:|
| `chat-images` | Sim | 20 MiB | 168 |
| `profile-images` | Sim | 20 MiB | 20 |

Não há policies próprias em `storage.objects`. Os buckets somam 188 objetos públicos.

### Laboratório

O laboratório tem:
- 18 tabelas public com RLS e sem policies.
- Zero grants diretos de tabela para anon/authenticated nas tabelas public consultadas.
- 277 itens de ACL expandida; 96 privilégios para anon/authenticated.
- Três triggers SECURITY DEFINER com `search_path=""` e EXECUTE sem anon/authenticated.
- Zero mensagens em `realtime.messages`.
- `realtime.messages` ainda tem RLS, zero policies e SELECT/INSERT para anon/authenticated.

O laboratório está mais restrito que produção, mas não fecha RT-01 e não valida o produto completo.

## 8. Identidade, AUTH-03 e upload

No banco de produção:
- `users.name` não tem constraint UNIQUE.
- `upstatus_sessions` contém `token_hash`, `user_name`, `expires_at`, `created_at`; não contém `user_id`.
- `upstatus_profiles` contém `user_name`, `avatar_url`, `updated_at`; não contém `user_id`.

O laboratório tem UNIQUE em `users.name` e quatro colunas `setup_token_*`, mas ainda não tem vínculo imutável `user_id` na sessão/perfil.

Produção continua sem as colunas de setup token, rate limit de convite e RPC de consumo de convite presentes no laboratório. AUTH-03 permanece bloqueado.

As Edge Functions Normal e Team Lite implantadas possuem handlers de upload assinado. Entretanto, o template Normal da branch QA atual não contém `signedUploadRoute`; a candidata #154 restaura a paridade, mas permanece Draft e não está integrada. Os testes de paridade candidatos são offline/estáticos ou mockados; não houve PUT real no Storage nesta rodada.

Na #157, o prefixo de avatar deriva de `users.id`, mas a sessão ainda é resolvida pelo nome e o perfil continua chaveado por nome. A identidade imutável não está completa.

## 9. Voz e reconexão

A Edge Function de laboratório `upstatus-signal-test` v32 mapeia `VOICE_ATTEMPT_CONFLICT` e `ROOM_FULL` para HTTP 409, mas não reconhece `VOICE_ATTEMPT_ALREADY_ACTIVE`. Esse código cai no fallback HTTP 500. É inspeção estática; nenhuma chamada HTTP real foi executada.

A Issue [#78](https://github.com/Reekyi/UpStatus/issues/78) continua aberta com 0/8 critérios físicos aprovados. Não houve teste real de queda/retorno de internet, reentrada sem F5, microfone, captura de tela ou interoperabilidade instalada Normal ↔ Team Lite.

## 10. Issue #79 e gates

A Issue [#79](https://github.com/Reekyi/UpStatus/issues/79) permanece aberta, com 16 itens marcados e 19 pendentes no corpo. O comentário QA dedicado existente foi atualizado; o comentário da Engenharia foi preservado.

| Gate | Estado |
|---|---|
| RT-01 | BLOCKED |
| TEST-ISOLATION | BLOCKED |
| MIGRATION-PROVENANCE | BLOCKED |
| AUTH-03 | BLOCKED |
| ACL-STORAGE | BLOCKED |
| RECONNECT | MANUAL PENDING |
| HUMAN-REVIEW | PENDING |

## 11. Próximas prioridades

1. Provisionar um ambiente full-product TEST independente e tratar o runtime legado instalado em produção por plano revisado.
2. Desativar o dispatcher Team Lite legado e integrar um fluxo de release que valide slug, projeto, SHA, CLI pinada e aprovação humana.
3. Tornar broadcasts privados/autenticados e remover listeners públicos sensíveis como fonte de comandos/sinalização.
4. Alinhar tópicos dos triggers e clientes.
5. Vincular token de sessão a `users.id` e migrar perfis com tratamento de nomes ambíguos.
6. Completar validação de bytes, ownership, rate limit e teste real de upload nos dois produtos.
7. Fechar grants, Default ACL, RLS, SECURITY DEFINER e política de privacidade do Storage.
8. Integrar AUTH-03 e recuperar proveniência dos quatro SQLs originais; diagnosticar `MIGRATIONS_FAILED`.
9. Corrigir o mapeamento HTTP 409 da voz.
10. Executar os oito testes físicos da #78 e obter aprovação humana no SHA final.

## 12. Veredito

**NOT READY.** CI verde em #74/#76 e os testes direcionados de #157 não substituem isolamento full-product, autenticação Realtime, identidade imutável, segurança de Storage, workflow Team Lite seguro e aceitação física. Nenhuma produção foi modificada nesta rodada.
