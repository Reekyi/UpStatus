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