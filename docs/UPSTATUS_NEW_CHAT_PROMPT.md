# UpStatus — Prompt de continuidade para novos chats

**Antes de responder à demanda ou alterar qualquer coisa, faça o onboarding técnico abaixo. Não pule esta etapa.**

1. Leia `AGENTS.md` na raiz do repositório `Reekyi/UpStatus`.
2. Leia integralmente `docs/UPSTATUS_RELEASE_PROTOCOL.md`.
3. Consulte no GitHub o estado atual de `master`, commits recentes, branches, tags/releases, `release.json`, `CHANGELOG.md`, README, scripts, workflows e o código relacionado à demanda.
4. Consulte no Supabase a saúde, Edge Functions e estrutura relevante dos dois projetos:
   - Produção: `upstatus-normal`, ref `mvjqunhjxkbfcrxkjtgf`.
   - Staging: `UpStatus Staging`, ref `akbgmmpnnpwcwgcfrltw`.
5. Determine a versão oficial lendo o manifesto e verificando o runtime. Determine a beta atual verificando branches/tags/manifestos e runtime de Staging. Determine a próxima beta sem reutilizar número.
6. Compare tudo com o protocolo. Informe divergências, não invente estado, não comece implementação antes de concluir a contextualização.

## Estado conhecido no checkpoint de 27/11/2026
- Oficial: **3.4.9**
- Beta ativa: **3.5.0-beta.3**
- Próxima beta se esta tentativa for rejeitada: **3.5.0-beta.4**
- Isso é um checkpoint, não substitui a consulta ao estado atual do GitHub e Supabase.

## Beta atual com integração ao ambiente original
- Branch: `beta/3.5.0-beta.1-remove-lucca-ycaro`.
- TEST function: `upstatus-test`, implantação dedicada no projeto original `mvjqunhjxkbfcrxkjtgf`.
- Install/test URL: `https://mvjqunhjxkbfcrxkjtgf.supabase.co/functions/v1/upstatus-test/upstatus.user.js`.
- O beta compartilha banco, Storage, tópico Realtime e coordenação de ringtone com a instalação oficial, para que status, chat, anexos e chamadas cruzem versões.
- A função oficial `upstatus`, o userscript estável, o namespace `upseller` e o prefixo de armazenamento local estável permanecem intactos.
- O namespace e prefixo locais do beta são separados. A API beta filtra os usuários expostos para Ricardo, Lohan e Guilherme.
- O projeto Staging `akbgmmpnnpwcwgcfrltw` existe, mas não é o destino runtime desta beta integrada.

## Processo obrigatório
Toda alteração começa em beta no Staging, nunca diretamente em produção. A versão oficial só muda após aprovação explícita do Ricardo. Beta rejeitada não reutiliza número. Execute build, validações, testes de regressão, revisão de diff e verificação do deploy antes de entregar a beta. Só depois do aceite explícito promova para oficial.

## Proteção do limite gratuito Supabase
O plano é Free e o usuário exige não exceder os limites. Leia a seção “Supabase Free-plan quota protection” no protocolo. Snapshot enviado em 27/11/2026: Egress 0.43/5 GB; Database 37/500 MB; MAU 0/50.000; File Storage 0/1 GB; Log Ingestion 0.45/1 GB (45%); Log Query 1.37/100 GB. Logs são a maior preocupação.
- Sem logs de sucesso por request/mensagem/heartbeat ou loops; sem dumps de log largos; sem polling desnecessário.
- Nunca incluir conteúdo de chat, PII, tokens, credenciais ou payloads sensíveis nos logs.
- Restringir consultas de log por serviço e janela de tempo.
- Avaliar impacto de cada alteração em banco, egress, storage, log ingestion e log query.
- Aplicar os limites de alerta/parada definidos no protocolo. Se não for possível confirmar o consumo e a mudança puder aumentá-lo materialmente, não faça deploy sem um snapshot recente.
- Não criar projeto ou branch Supabase com custo sem autorização explícita.

## Resumo obrigatório antes de trabalhar
Apresente: versão oficial, beta ativa, próxima beta, branch/commit, status Staging, status Produção, consumo/risco de quotas, divergências e próximo passo seguro.

Se o chat não tiver acesso real ao GitHub/Supabase, diga isso claramente e peça que o usuário conecte ou forneça acesso. Nunca finja que leu os dados.
