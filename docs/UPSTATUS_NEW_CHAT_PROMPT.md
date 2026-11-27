# UpStatus — Prompt de continuidade para novos chats

**Antes de responder à demanda ou alterar qualquer coisa, faça o onboarding técnico abaixo. Não pule esta etapa.**

1. Leia `AGENTS.md` na raiz do repositório `Reekyi/UpStatus`.
2. Leia integralmente `docs/UPSTATUS_RELEASE_PROTOCOL.md`.
3. Consulte no GitHub o estado atual de `master`, commits recentes, branches, tags/releases, `release.json`, `CHANGELOG.md`, README, scripts, workflows e o código relacionado à demanda.
4. Consulte no Supabase a saúde, Edge Functions e estrutura relevante dos dois projetos:
   - Produção: `upstatus-normal`, ref `mvjqunhjxkbfcrxkjtgf`.
   - Staging: `UpStatus Staging`, ref `akbgmmpnnpwcwgcfrltw`.
5. Determine a versão oficial lendo o manifesto e verificando o runtime. Determine a beta atual verificando branches/tags/manifestos e o runtime no projeto/slug definido para aquele ciclo (Staging ou integração de dados reais). Determine a próxima beta sem reutilizar número.
6. Compare tudo com o protocolo. Informe divergências, não invente estado, não comece implementação antes de concluir a contextualização.

## Estado conhecido no checkpoint de 27/11/2026
- Oficial até a última verificação: **3.5.0**; a promoção estável aprovada para **3.5.2** aguarda a execução/verificação do workflow de produção.
- Candidata ativa em desenvolvimento: **3.5.1-beta.2**, branch `beta/3.5.1-beta.2-agenda-status-mirror`.
- A candidata foi projetada para uma nova função dedicada `upstatus-351-test` no projeto de produção, compartilhando dados reais, mas mantendo namespace, storage e rota próprios.
- Install URL prevista: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-351-test/upstatus.user.js`.
- A oficial `upstatus` v6 e a Beta 5 de produção `upstatus-test` v4 devem permanecer intocadas.
- Versão oficial anterior: **3.4.9**.
- Isso é um checkpoint, não substitui a consulta ao estado atual do GitHub e Supabase.

## Função de teste Beta 5, mantida separada da versão oficial
- Branch Beta 4: `beta/3.5.0-beta.1-remove-lucca-ycaro`.
- TEST function: `upstatus-test`, implantação dedicada no projeto original `mvjqunhjxkbfcrxkjtgf`.
- Install/test URL: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-test/upstatus.user.js`.
- O beta compartilha banco, Storage, tópico Realtime e coordenação de ringtone com a instalação oficial, para que status, chat, anexos e chamadas cruzem versões.
- A função oficial `upstatus`, o userscript estável, o namespace `upseller` e o prefixo de armazenamento local estável permanecem intactos.
- O namespace e prefixo locais do beta são separados. A API beta filtra os usuários expostos para Ricardo, Lohan e Guilherme.
- O projeto Staging `akbgmmpnnpwcwgcfrltw` existe, mas não é o destino runtime desta beta integrada.

## Registro de integração Beta 5 (manual acceptance concluída)
- Branch: `beta/3.5.0-beta.5-realtime-native-status`; PR #184 foi mesclada em `master` como commit oficial `a9019ada2ab4dae05540520eda04211b38a301c7`.
- A Beta 5 foi validada por Ricardo: alteração do próprio status e alteração remota no Sale Smartly do Guilherme funcionaram sem F5.
- A função beta `upstatus-test` permanece separada e ACTIVE no projeto `mvjqunhjxkbfcrxkjtgf`, deployment version 4, `3.5.0-beta.5`, hash `71c0446cfb0608b831088f8782f883198758561f809c496e82f0ed7c77f798b7`.
- A função oficial `upstatus` foi promovida a deployment version 6, ACTIVE, e serve oficialmente `3.5.0`; health e update-info confirmaram a versão. Usuárioscript estável tem namespace `upseller`; beta mantém `upseller-test`.
- A oficial inclui avisos temporários com timeout de 3 segundos e animação fade/slide; indicador persistente de conexão do Sale Smartly permanece visível.
- Validação GitHub Actions: PR run #2362 aprovada e master post-merge run #2363 aprovada.
- Snapshot de quotas antes do deploy oficial: Egress 0.56/5 GB; DB 38/500 MB; MAU 0/50.000; Storage 0/1 GB; Log Ingestion 0.53/1 GB (53%); Log Query 1.37/100 GB. Não há leitura pós-deploy.

## Processo obrigatório
Por padrão, toda alteração começa em beta no Staging. Quando Ricardo solicita integração com a equipe real, pode ser usada a função separada `upstatus-test` dentro do projeto de produção, com autorização explícita e mantendo a função estável `upstatus` intocada. A versão oficial só muda após aprovação explícita de Ricardo. Beta rejeitada não reutiliza número. Execute build, validações, testes de regressão, revisão de diff e verificação do deploy antes de entregar a beta. Só depois do aceite explícito promova para oficial.

## Proteção do limite gratuito Supabase
O plano é Free e o usuário exige não exceder os limites. Leia a seção “Supabase Free-plan quota protection” no protocolo. Último snapshot enviado em 27/11/2026 antes do deploy oficial: Egress 0.56/5 GB; Database 38/500 MB; MAU 0/50.000; File Storage 0/1 GB; Log Ingestion 0.53/1 GB (53%); Log Query 1.37/100 GB. Um snapshot anterior no mesmo dia mostrava Log Ingestion em 45%. Logs seguem como principal ponto de atenção.
- Sem logs de sucesso por request/mensagem/heartbeat ou loops; sem dumps de log largos; sem polling desnecessário.
- Nunca incluir conteúdo de chat, PII, tokens, credenciais ou payloads sensíveis nos logs.
- Restringir consultas de log por serviço e janela de tempo.
- Avaliar impacto de cada alteração em banco, egress, storage, log ingestion e log query.
- Aplicar os limites de alerta/parada definidos no protocolo. Se não for possível confirmar o consumo e a mudança puder aumentá-lo materialmente, não faça deploy sem um snapshot recente.
- Não criar projeto ou branch Supabase com custo sem autorização explícita.

## Resumo obrigatório antes de trabalhar
Apresente: versão oficial, beta ativa, próxima beta, branch/commit, status Staging, status Produção, consumo/risco de quotas, divergências e próximo passo seguro.

Se o chat não tiver acesso real ao GitHub/Supabase, diga isso claramente e peça que o usuário conecte ou forneça acesso. Nunca finja que leu os dados.


## Candidata 3.5.1-beta.1 (ciclo de correções de 27/11/2026)
- Branch: beta/3.5.1-beta.1-ui-fixes.
- Destino exclusivo: Staging akbgmmpnnpwcwgcfrltw, função upstatus-test.
- Install URL: https://akbgmmpnnpwcwgcfrltw.supabase.co/functions/v1/upstatus-test/upstatus.user.js.
- A Beta 5 no projeto de produção continua como referência de integração em tempo real e não deve ser substituída por esta beta isolada.
- Não modificar a função upstatus de produção, a função upstatus-test de produção, nem a função upstatus do Staging.
- O ciclo cobre allowlist da equipe, arte da tela vazia, rodapé de atualização, controles de chamada no tema claro e botão de cancelar gravação.
- Sem migrações ou exclusões de dados; o histórico existente permanece preservado.

### Deployment checkpoint 3.5.1-beta.1
- GitHub Actions validation run #2367 passed.
- Staging `upstatus-test` deployment version 8 is ACTIVE; source hash `66451104ef80f36919d19bc34e9628eb52d3b23446a354fa83a7a74924afc130`.
- Runtime health/update-info and served userscript header were checked; `/api/members` returns only Guilherme, Lohan and Ricardo.
- Production stable `upstatus` v6 and production `upstatus-test` v4 remain unchanged. Ricardo's manual acceptance is still pending.


## Beta 2 — regras de negócio e destino
- Sale Smartly é a fonte da verdade para Online/Ocupado/Ausente. O backend deve rejeitar status POST sem confirmação explícita após a ação nativa ter sido aceita.
- O observador de Pinia deve espelhar alterações diretas do Sale Smartly; ações disparadas pelo UpStatus precisam ser marcadas para não gerar eco.
- A agenda é visível para Ricardo, Guilherme e Lohan. Cada um só edita seu próprio almoço (12h ou 13h). Todos veem treinamentos e Aulão, mas somente Ricardo pode editar essas atribuições.
- Quatro slots diários começam vazios: 10h, 11h, 15h e 16h. Slot vazio não afeta nenhuma fila. Aulão tem responsável semanal, segunda a sexta, 15h–17h. Sem ativação de entrada automática; fim do expediente em dias úteis às 18h.
- Ao voltar de suspensão, o sistema calcula o estado desejado atual, sem reproduzir tarefas passadas. A ação só ocorre com a sessão Sale Smartly do próprio usuário ativa.
- Destino de runtime: função nova `upstatus-351-test`, projeto `mvjqunhjxkbfcrxkjtgf`. Ela compartilha DB/Storage/Realtime de produção para testar chat, fotos e chamadas reais. Não substituir stable `upstatus` nem a Beta 5 `upstatus-test`.

### Beta 2 deployment verification
- GitHub Actions validation run #2372 passed, including schedule regression tests.
- Production project function `upstatus-351-test` is deployment v1 ACTIVE, `verify_jwt=false`, source hash `65f799972b086081304e1e0895b41f2ce385c61b46545bb43f231d42ff8ae2af`.
- `/health`, `/api/update-info`, served userscript header and `/api/members` were verified. The served script reports `3.5.1-beta.2`, namespace `upseller-test`; member API lists only Guilherme, Lohan and Ricardo.
- Stable production `upstatus` v6 and existing Beta 5 `upstatus-test` v4 remain unchanged. Manual testing by Ricardo is pending.

## Promoção aprovada 3.5.2
- Branch: `release/3.5.2-agenda-status-mirror`.
- Versão estável aprovada por Ricardo: `3.5.2`, sem sufixo beta.
- Installer oficial: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus/upstatus.user.js`.
- Manter o artefato de regressão Beta 2 em `3.5.1-beta.2` e a função dedicada `upstatus-351-test`; o build estável não deve sobrescrevê-la.
- O Aulão permanece atribuído durante toda a semana, inclusive sábado e domingo, pois usa a segunda-feira como chave semanal. Uma nova atribuição começa na segunda-feira seguinte.
- A validação inclui a compatibilidade da comparação de versão com instalações 3.4.7, 3.4.8 e 3.5.0.
- O ajuste geral dos controles de chamada no Modo Claro continua pendente e não deve ser descrito como corrigido nesta versão.
- Após a execução do workflow, atualizar este checkpoint com versão/hash do runtime, health, updater e status dos projetos.
