# UpStatus Team Lite (canal TEST)

## Instalação para teste
1. Abra o link do userscript Team Lite no navegador com o Tampermonkey instalado.
2. Confirme a instalação do script **UpStatus Team Lite**. Ele tem namespace próprio e não substitui o UpStatus oficial.
3. Entre no Sale Smartly e pressione **Shift + C**.
4. Selecione Lucca ou Ycaro, informe a senha individual e entre.
5. Teste mensagens, entrada/saída da sala de voz, microfone mutado e retorno à página depois de ocultar o painel. O painel pode ser movido pelo cabeçalho e redimensionado pelo canto inferior direito; posição e tamanho são lembrados neste navegador.
6. Para testar o anel de presença na bolha oficial em computadores de teste, instale também o userscript auxiliar **UpStatus Team Lite Presence (TEST)**. Ele não cria botões nem abre sites e consulta apenas a presença no backend TEST. Remova-o depois do teste ou mantenha-o desativado até a validação.

## Versões
- Core atual: `3.4.0`.
- Build do userscript: `3.4.0.3`. O sufixo identifica correções específicas do Team Lite para que o gerenciador consiga atualizar mesmo quando a versão do core não muda.
- O botão ↻ consulta `release.json` e lê a versão do userscript oficial em produção. Se o manifesto Team Lite não estiver sincronizado com a versão oficial, bloqueia a instalação e avisa. Se houver uma build superior sincronizada, abre o instalador para confirmação, sem atualizar silenciosamente.
- Releases de chat/voz precisam ser refletidos neste script e no manifesto antes de divulgar a atualização para os líderes.

## Segurança e limites
- O script se conecta somente à Edge Function `upstatus-test`, não à função de produção.
- O servidor TEST força o filtro de mensagens dos convidados pelo início da sessão; não confia apenas no filtro visual do navegador.
- Mensagens novas dos líderes continuam compartilhadas com o chat da equipe. O início de uma sessão futura não recupera mensagens anteriores e não apaga histórico.
- Ocultar com × não encerra a chamada nem a sessão. Use **Sair** para encerrar a sessão e a presença; use **Sair da voz** para desligar a chamada.
- O indicador roxo/laranja no balão do UpStatus oficial tem um helper temporário separado para teste. Ele ainda precisa de validação visual no Sale Smartly antes de integrar a alteração ao userscript oficial.
- A voz usa o canal Supabase Realtime e o protocolo da sala de voz oficial; chamadas WebRTC dependem das permissões do microfone e da rede dos participantes.
