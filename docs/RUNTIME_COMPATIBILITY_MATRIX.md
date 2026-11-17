# UpStatus — matriz de compatibilidade dos runtimes

**Estado:** inspeção estática de fontes implantados, somente leitura  
**Verificado em:** 17/11/2026  
**Projeto Supabase de produção:** `dlfvkawaiqduhlazsszm`  
**Objetivo:** impedir que a reconstrução trate função distribuidora, API efetivamente chamada e cliente embutido como se fossem a mesma versão.

> Esta matriz registra comportamento observado no código. Não substitui testes de integração. Nenhum runtime, banco, segredo, Storage, policy ou configuração de produção foi alterado.

## 1. Identidade e roteamento

| Propriedade | Normal | Team Lite | TEST atual | API legada beta10 |
|---|---|---|---|---|
| Função que distribui o script | `upstatus` | `upstatus-team-lite` | `upstatus-test` | `upstatus-screen-share-3-1-1-beta10` |
| Deploy interno da função | 480 | 15 | 281 | 6 |
| Versão do script embutido | 3.4.7 | 3.4.30 | 3.3.28 | 3.1.1-beta8 |
| Update/download target | `upstatus` | branch `team-lite-official` | `upstatus-test` | `upstatus-screen-share-3-1-1-beta8` |
| API realmente chamada pelo cliente | beta10 | `upstatus-team-lite` | beta10 | beta8 |
| Tópico Realtime do cliente | beta10 | beta10 | beta10 | beta8 |
| Prefixo local | `upstatus_screen_share_beta8_` | `upstatus_team_lite_` | `upstatus_screen_share_beta8_` | `upstatus_screen_share_beta8_` |
| Tampermonkey name | `UpStatus - Sale Smartly` | `UpStatus Team Lite - Sale Smartly` | `UpStatus - Sale Smartly` | `UpStatus Screen Share Beta 3.1.1-beta8 - Sale Smartly` |
| Tampermonkey namespace | `upseller` | `upseller-team-lite` | `upseller` | `upseller-screen-share-beta8` |
| Encoding do script embutido | Base64 | Base64 | Base64 | HEX |
| Caminhos `/api/*` encontrados | 34 | 34 | 34 | 34 |

**Leitura importante:** Normal e TEST distribuem por uma função e usam outra para API. O TEST atual compartilha nome, namespace, tópico e prefixo local com o Normal, e sua API chama beta10. A função beta10, por sua vez, embute um cliente beta8 que aponta para a função beta8. Slug, versão do backend e versão do cliente não são intercambiáveis.

## 2. Contratos efetivos observados

| Contrato | Normal efetivo (beta10) | Team Lite efetivo | TEST efetivo (beta10) | beta10 |
|---|---|---|---|---|
| Senha mínima | 6 caracteres | 4 caracteres | 6 caracteres | 6 caracteres |
| `/api/members` e GET `/api/status` | todos os nomes de `public.users` | allowlist oficial | todos os nomes de `public.users` | todos os nomes de `public.users` |
| Histórico de chat de convidado | sem corte por `joinedAt` | corte por `guestJoinedAt` em `chatRoute` e `chatRows` | sem corte no backend efetivamente chamado | sem corte |
| Ticket de upload assinado | beta10 não valida token/caminho/origem | valida token e caminho; não valida origem/URL pública | beta10 não valida token/caminho/origem | não valida token/caminho/origem |
| MIME no ticket de chat | lista beta10 inclui áudio | lista do source Team Lite não inclui áudio | lista beta10 inclui áudio | lista inclui áudio |
| Upload de áudio | rota separada `/api/chat/audio` via `mediaRoute`; validar no E2E | rota separada; validar no E2E | rota efetiva beta10 | rota separada; limite observado de 5 MB |

Notas:
- O source da função distribuidora `upstatus` tem allowlist de membros, mas o cliente Normal chama beta10, cuja função `members()` retorna todos os nomes da tabela. Portanto, o source distribuidor não representa o comportamento efetivo desses endpoints.
- O source `upstatus-test` tem senha mínima de 4 caracteres e allowlist, mas o cliente TEST chama beta10. A regra efetiva do login TEST atual é a do beta10.
- O source Team Lite mantém diferenças de produto deliberadas: senha mínima, roster e corte temporal de histórico para convidados.
- A diferença de MIME em `signedUploadRoute` não prova quebra de áudio: áudio usa também `/api/chat/audio`, uma rota separada. Não remover nem alterar esse fluxo sem teste.

## 3. Upload assinado: níveis de validação

| Runtime | Token não vazio | Caminho assinado igual ao solicitado | Origem HTTPS / host | URL pública e caminho |
|---|---:|---:|---:|---:|
| `upstatus` 3.4.7 | Sim | Sim | Não | Não |
| `upstatus-team-lite` 3.4.30 | Sim | Sim | Não | Não |
| `upstatus-test` 3.3.28 | Sim | Sim | Não | Não |
| beta10 | Não | Não | Não | Não |
| PR #161 candidata | Sim | Sim | Sim | Sim |

A PR #161 muda o destino de API Normal para `upstatus` e adiciona verificações de origem, caminho, token e URL pública. O HEAD `557814dc31bed779b84a2094358dc6b2a7e67689` teve Validate e Signaling Smoke Tests concluídos com sucesso no CI, mas a PR continua Draft e não foi integrada nem implantada. Isso não é teste Full-Product TEST nem aprovação para produção.

## 4. Famílias históricas

- **Screen-share beta:** 13 funções ativas. beta1–beta8 e beta9 simples são em geral coerentes com seu próprio sufixo. beta9-1 já usa tópico/prefixo beta8; beta9-2 e beta9-3 usam API/tópico/prefixo beta8; beta10 embute cliente beta8 e aponta para beta8.
- **TEST histórico:** 12 funções ativas. As variantes 3.0.52 beta1–beta6 e beta11 têm namespace/tópico/prefixo específicos, mas ainda estão no projeto de produção. Algumas 3.0.51 usam o tópico Realtime de produção. `upstatus-test-backup-032` usa também o prefixo local `upstatus_`.
- **Backups:** 11 funções ativas com hashes de entrypoint distintos. Snapshots 3.1.x–3.3.0 geralmente atualizam por `upstatus` mas chamam API/tópico/prefixo beta8. `upstatus-backup-327-pre328` retorna `index.ts` vazio pela API de inspeção, apesar de SHA não vazio; proveniência não resolvida.

Nenhuma função pode ser classificada como removível apenas pelo nome ou por ausência de log recente. A janela fixa de 24h consultada mostrou registros apenas para beta10 (74.302 respostas 402) e `upstatus` (6 respostas 402 no endpoint do userscript); isso não prova ausência de consumidores nos outros runtimes.

## 5. Dependências de dados e ambiente

Os quatro runtimes atuais consultados usam os mesmos nomes de variáveis de ambiente:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY` (fallback)
- `LUCCA_PASSWORD`
- `YCARO_PASSWORD`

Também compartilham oito tabelas públicas diretamente referenciadas: `users`, `upstatus_sessions`, `status_history`, `upstatus_state`, `messages`, `chat_reads`, `upstatus_typing`, `upstatus_profiles`; `chat-images` é bucket Storage referenciado pelo código. O fluxo de avatar usa também `profile-images`.

O projeto de produção está ACTIVE_HEALTHY. O laboratório `upstatus-security-test` (`bfpjtfqlnypisxljoxkb`) continua INACTIVE e não é Full-Product TEST. Os artefatos TEST atuais ainda não possuem isolamento real de projeto, dados, secrets, Storage, Realtime e identidade Tampermonkey.

## 6. Regras para a reconstrução

1. Definir separadamente distribuição do userscript, API, Realtime, prefixos, namespace e política de produto.
2. PROD e TEST devem usar projetos, secrets, buckets, tópicos e namespaces separados. Não basta trocar o sufixo de um nome.
3. Normal e Team Lite podem compartilhar eventos de produção quando o contrato cross-product exigir; o payload público deve ser mínimo e não carregar dados sensíveis.
4. Preservar explicitamente as diferenças Team Lite de senha, roster e histórico de convidados.
5. Validar em Full-Product TEST os fluxos de login, membros/status, histórico, upload de imagem/vídeo/documento/avatar/áudio, convidados, voz, tela e compatibilidade Normal ↔ Team Lite.
6. Não redirecionar Normal de beta10 para `upstatus`, nem redirecionar TEST para `upstatus-test`, antes dessa validação.
7. Não remover backups ou funções históricas antes de mapear consumidores e política de rollback.

## 7. Limites desta matriz

- Inspeção estática de fontes implantados e candidatas.
- Nenhum build local, teste de navegador, teste de bytes Storage ou Full-Product E2E executado nesta rodada.
- Evidência de CI da PR #161 refere-se somente ao HEAD indicado.
- Nenhum deploy, merge, migration, alteração de secrets, grants, policies, dados ou funções de produção.


## 8. Realtime event contract e divergência de tópicos

Os userscripts Normal, Team Lite e TEST atuais enviam e assinam os mesmos nomes de eventos no tópico `upstatus-screen-share-live-3-1-1-beta10`:

- `call_signal`
- `chat_fast`
- `chat_presence`
- `chat_read`
- `db_change`
- `health_ping` / `health_pong`
- `remote_command` / `remote_result`
- `user_status`

Os mesmos clientes também declaram `VOICE_ROOM_EVENT=voice_room_signal` e `SCREEN_ROOM_EVENT=upstatus_screen_signal_3_1_1_beta8`. O script embutido no runtime beta10 é cliente beta8 e usa o tópico `upstatus-screen-share-live-3-1-1-beta8`.

A inspeção direta do catálogo PostgreSQL confirmou três triggers:

| Tabela | Trigger | Função |
|---|---|---|
| `public.messages` | `upstatus_messages_broadcast` | `upstatus_broadcast_messages` |
| `public.users` | `upstatus_users_broadcast` | `upstatus_broadcast_users` |
| `public.upstatus_state` | `upstatus_remote_state_broadcast` | `upstatus_broadcast_remote_state` |

As três funções publicam em `upstatus-live-6f5e7b31-3f8c-4d8f-ae5a-91c7b2d6e4f0`, usando o último argumento `false` em `realtime.send`. A função de messages serializa o registro OLD/NEW completo; a de users publica presença; a de remote state publica comandos/resultados.

**Consequência:** o tópico dos triggers do banco não coincide com o tópico assinado pelos clientes atuais. Isso é um split-brain verificável por inspeção. Eventos broadcast enviados diretamente entre clientes no tópico beta10 podem continuar fluindo entre eles, mas os eventos emitidos pelos triggers no tópico `upstatus-live-...` não chegam aos listeners que assinam beta10. O impacto funcional precisa ser validado em ambiente isolado.

Não trocar o tópico em produção como correção imediata. A reconstrução deve definir um contrato de eventos mínimo por ambiente, remover payload sensível de broadcasts públicos e coordenar a troca de triggers e clientes.
