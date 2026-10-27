# UpStatus Team Lite: abertura por atalho Shift+C

## Objetivo
Criar um userscript separado do UpStatus oficial para Luca e Ícaro, usando a mesma infraestrutura de comunicação existente, sem oferecer ferramentas operacionais ou administrativas. O UpStatus oficial deve permanecer intacto.

## Entrada na interface
- **Não criar botão na barra lateral do Sale Smartly.**
- **Não criar botão de extensão, bolinha flutuante ou portal/site separado para os líderes.**
- O único ponto de entrada será o atalho **Shift + C**, pressionado dentro do Sale Smartly.
- O atalho abre a interface do Team Lite na visão restrita de comunicação dos líderes.
- O atalho deve funcionar apenas nas páginas do Sale Smartly e não quando o foco estiver em campos de texto/editáveis, para não interferir na digitação. Evitar disparo duplo e permitir fechar/minimizar a janela sem encerrar uma chamada ativa.
- A interface disponibilizada deve conter somente chat de texto e chamadas de voz da equipe, com os componentes visuais existentes reaproveitados quando possível.

## Usuários e permissões
- Acesso individual para Luca e Ícaro, com autenticação persistente segura.
- Sem fila de atendimento, configuração, administração, ferramentas de desenvolvimento ou ações administrativas.
- Restrições devem ser validadas no backend, não apenas ocultando elementos da interface.
- A identidade e permissões não podem depender de um nome/ID arbitrário enviado pelo cliente.
- Confirmar a estratégia de autorização, políticas RLS, Edge Function e Realtime antes de habilitar o Team Lite.

## Sessões temporárias
- Cada nova entrada dos líderes inicia uma sessão de chat vazia, sem recuperar mensagens de sessões anteriores.
- Mensagens dos líderes devem aparecer normalmente no chat oficial da implementação durante a sessão.
- Encerrar/expirar uma sessão temporária não pode remover nem alterar o histórico permanente do UpStatus oficial.
- Não realizar exclusões globais; separar mensagens temporárias por sessão e prever expiração de sessões abandonadas.

## Presença
- No UpStatus oficial, presença ativa de Luca deve indicar roxo e Ícaro, laranja. Se ambos estiverem presentes, representar ambos sem substituir silenciosamente uma cor pela outra.
- A presença deve significar que a pessoa está ativa no Team Lite, não apenas conectada ao Sale Smartly.
- Não alterar os estados de disponibilidade já existentes.

## Chamadas
- Reutilizar o mecanismo atual de voz e sinalização.
- Minimizar ou fechar o painel não deve desligar uma chamada ativa. Sair/desligar deve ser ação explícita do usuário.

## Vercel
- Os projetos/sites antigos `upstatus-lucca` e `upstatus-ycaro` não devem fazer parte da arquitetura futura.
- Inspecionar referências e dependências antes de desativar ou excluir qualquer deployment, domínio ou projeto. Não apagar recursos automaticamente.

## Regras de entrega
- Desenvolver primeiro em TEST, sem alterações na Edge Function de produção ou no userscript oficial até validação.
- Manter o userscript Team Lite separado, sem atualizar/substituir o script da equipe de implementação.
- Validar sintaxe, login, restrições backend, mensagens, presença, chamadas, sessão temporária e preservação do histórico oficial antes de considerar concluído.

## Versionamento e distribuição
- O Team Lite permanece um userscript separado, com namespace próprio.
- A versão principal exibida deve acompanhar a versão oficial do UpStatus (no momento, core 3.4.0).
- O gerenciador de userscripts precisa de um identificador de build crescente para reconhecer correções do Team Lite entre lançamentos do core. Por isso, a metadata usa o formato `core.build` (atualmente `3.4.0.1`), enquanto a interface mostra claramente `Core 3.4.0 · build 3.4.0.1`.
- `team-lite/release.json` é o manifesto do canal de teste e alimenta o botão de verificação manual.
- O botão de atualização nunca instala silenciosamente: apresenta a versão disponível e abre o instalador do Tampermonkey para confirmação.
- Alterações comuns de texto/voz devem ser aplicadas aos dois scripts; recursos exclusivos do painel completo não devem ser expostos no Team Lite.

## Implementação inicial em TEST
- O script de teste usa a Edge Function `upstatus-test`; não deve apontar para a função de produção.
- O backend de TEST força o limite de mensagens de convidados para o horário de início da sessão, mesmo que o cliente peça um intervalo anterior.
- O script Team Lite inclui chat de texto, sinalização Realtime e WebRTC de voz, com o mesmo identificador de sala/evento da sala de voz oficial.
- A bolha do userscript oficial no canal TEST pode indicar presença ativa de Luca (roxo), Ícaro (laranja) ou ambos (alternância entre as cores).
- O estado de presença deve expirar quando os heartbeats cessarem. Ocultar o painel não encerra uma chamada; sair da sessão encerra explicitamente a presença.
