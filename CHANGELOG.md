## 2026-10-21

### 3.0.51-beta3
- Fix active-call discovery across stable 3.0.50 and beta test builds by listening on the shared call-presence topic.
- Keep beta3 storage and ringtone identifiers isolated from stable and beta builds.
- Includes beta2 light-theme document styles, animated call indicator, and request-to-join flow.
- Test-only build; production 3.0.50 and Beta 10/11 endpoints remain unchanged.

## 2026-10-21

### 3.0.51-beta2
- Improve light-theme styling for shared documents and document attachments.
- Add animated green phone indicator on team avatars for detected active calls.
- Add targeted request-to-join flow with accept/decline and approval before starting group mesh connection.
- Test-only build; production 3.0.50 and Beta 10/11 endpoints remain unchanged.

## 2026-10-21

### 3.0.50 (stable)
- Promote the current 3.0.50 candidate to the official stable channel.
- Includes document attachment and shared-document UI fixes, the restored WebRTC group-call engine, and active-call discovery/join signaling.
- Limitation: screen-share transmission and remote screen display are not included in this release.
- Production deployment targets `upstatus`; beta10 test endpoint remains unchanged.

## 2026-10-21

### 3.0.50-beta11
- Created isolated beta11 endpoint so beta10 remains untouched.
- Added active-call discovery and the "Entrar na chamada" team-card action.
- Joining an active call requests microphone permission and notifies current participants to establish WebRTC mesh connections.
- Screen sharing is not included in this beta yet.
- Test environment only; production function unchanged.

## 2026-10-21

### 3.0.50-beta10
- Added realtime discovery of active group calls and a visible "Entrar na chamada" action in team member cards.
- Joining an active call requests microphone access and notifies current participants to establish the WebRTC mesh.
- Screen-share streaming is not yet included in this change; it requires the separate display-capture and remote-video integration.
- Test environment only; production function unchanged.

## 2026-10-21

### 3.0.50-beta10
- Fix userscript startup syntax error in chat document rendering.
- Distinguish document icons by file type and fix shared-document list height and scrolling.
- Restore the WebRTC mesh group-call engine, participant invitations, and group-call controls in the test build.
- Test environment only; production function unchanged.

### 3.0.50-beta10
- Fix userscript startup syntax error in chat document rendering.
- Distinguish document icons by file type and improve spreadsheet/CSV labels.
- Fix the shared-document list height so it fills the available library panel and scrolls instead of being capped.
- Test environment only; production function unchanged.

### 3.0.50-beta10
- Fix a duplicated `else` in chat message rendering that caused a JavaScript syntax error and prevented the entire userscript from starting.
- Validate the generated production and test userscripts by parsing the complete artifacts before release.
- Test environment only; production function unchanged.

### 3.0.50-beta1
- Add chat document attachments for PDF, DOC/DOCX, XLS/XLSX, CSV, PPT/PPTX, TXT, and RTF.
- Limit document uploads to 10 MB and retain existing image/video limits.
- Render document cards with the original filename and a download action.
- Based on validated 3.0.49-beta4; test environment only.


## 2026-10-20

### 3.0.48
- Promoted the validated beta17 client behavior to the stable 3.0.48 release.
- Added a media library with sender, upload date, file size, responsive layout, and light/dark theme support.
- Reused the chat image lightbox for library images and added a matching centered video viewer; closing media leaves the library open, with Escape or backdrop click dismissing only the media.
- Improved the library close control and standardized the chat header icon with the floating chat shortcut.
- Preserved the unread-bubble recovery mechanism and fixed userscript syntax issues that could prevent the full script from starting.
- Consolidated chat reliability improvements introduced since 3.0.42, including history synchronization, scroll behavior, notifications, emoji/context menus, media viewing, and empty-chat illustration customization.
- No database schema changes; production backend logic and guest portal/session routes are preserved.

## 2026-10-19

### 3.0.45
- Promoted the tested chat reliability and interface updates from the beta build to the official userscript.
- Keep the chat pinned to the latest message after sending and reopening; preserve history position while the user is reading older messages.
- Added a latest-message arrow indicator hook for incoming messages while scrolled up. Known limitation: the blinking dot has not been visually confirmed and may not appear in the current release.
- Fixed the system-health state query so `Alertas e comandos` reports the correct status.
- Fixed emoji picker dismissal when clicking outside or closing the chat, and moved the image lightbox to the page-level overlay.
- No database schema changes or session-lifecycle actions.

## 2026-10-19

### 3.0.44
- Fixed the fast chat endpoint's undefined cutoff, which caused HTTP 500 responses while syncing messages.
- Render cached incoming messages immediately when reopening the chat and force a fresh history load.
- Made retry resilient to an in-flight request and kept a retry action available even when cached messages exist.
- Removed numeric unread counters while retaining a simple red chat indicator.
- Show desktop chat notifications only when the UpStatus tab is hidden or the browser window is not focused.
- No database or session-lifecycle changes.

# Changelog

## 2026-10-17

### 3.0.43
- Allow users to replace the Sale Smartly empty-chat illustration with a local JPEG or animated GIF (up to 5 MB).
- Preserve native GIF animation and transparency; hide the original illustration while a custom image is active.
- Ask for confirmation before removing the custom image and restore the original illustration when removal is confirmed.
- Keep the feature local to the user's browser; no database changes.

## 2026-10-17

### 3.0.42
- Bumped the official release version so userscript managers detect and offer the update.
- Kept the blue Sale Smartly back arrow, native-sized button, 8px spacing, Escape shortcut, and safe conversation deselection.
- Preserved all existing UpStatus functionality and the active Sale Smartly session.

## 2026-10-17

### 3.0.41
- Added a blue back-arrow button beside Sale Smartly's native end-session control to deselect the active conversation and return to the empty-chat screen.
- Matched the arrow button's dimensions to the native control and added spacing between the buttons.
- Added Escape as a keyboard shortcut for the same deselection action, while avoiding text fields and open dialogs.
- Hide the arrow after a successful deselection and restore it when another conversation is selected.
- Preserve the active support session: this action does not close, remove, or end the Sale Smartly session.

## 2026-10-17

### 3.0.40
- Refined the chat experience with stable emoji/context menus, scrolling, message layout, and preserved sharing behavior for Lucca and Ycaro guest sessions.
- Reworked audio messages with a unified player, decoded-audio waveform with an irregular fallback, opacity-only playback progress, normal-weight bars, and no mute button.
- Added closing animations to patch notes, update prompts, profile modal, remote control overlay, and chat image lightbox, respecting reduced-motion preferences.
- Preserved the Ycaro guest chat page and its dedicated password/session/API flow in the production Edge Function.

# Changelog

## 2026-10-16

## 3.0.39
- Polido o modo claro do chat: botões do cabeçalho e área de digitação agora seguem a paleta clara.
- Corrigidas as cores do balão de notificação para respeitar o tema ativo.
- O indicador do chat fica verde quando não há mensagens novas e vermelho pulsante quando há mensagens não lidas.
- Ajustado o microfone no modo claro: branco no estado normal, azul ao passar o mouse e vermelho durante a gravação.
- Mantido o comportamento de abrir o chat pelo indicador e limpar o aviso ao abrir.

## 2026-10-15

## 3.0.36
- Corrigida a rolagem do chat com uma verificação baseada na posição real da última mensagem dentro da área rolável.
- Adicionado acompanhamento de alterações no conteúdo para repetir a rolagem após atualizações e carregamento de elementos.
- Preservada a correção do contador de mensagens não lidas introduzida na versão 3.0.35.

## 2026-10-15

## 3.0.35
- Corrigida a atualização do contador de mensagens não lidas durante as consultas rápidas do chat, sem depender de uma recarga completa.
- Reforçada a rolagem inicial para a mensagem mais recente com novas tentativas após o layout inicial, especialmente em navegadores Chromium.
- Mantidos o fluxo de leitura no servidor e o botão flutuante para abrir e fechar o chat.

# Changelog

## 2026-10-15

## 3.0.34
- Corrigido o registro de leitura do chat mesmo quando o cache local está vazio e após atualizações do histórico sem mudança no conteúdo.
- Corrigida a validação do cache de renderização para verificar a lista DOM atual, evitando que a conversa fique presa no histórico antigo.
- Reforçada a rolagem inicial para a mensagem mais recente, inclusive enquanto imagens e outros elementos terminam de carregar.
- Mantido o comportamento do botão flutuante de chat para abrir e fechar a conversa.

## 2026-10-15

## 3.0.33
- Corrigido o recebimento de mensagens do chat sem precisar recarregar a página, mantendo a consulta periódica como fallback quando o Realtime não cobre o ambiente de origem.
- Corrigido o reaparecimento de notificações já lidas após F5, persistindo os identificadores das mensagens notificadas e estabelecendo corretamente a referência inicial do histórico.
- Melhorada a rolagem do chat para ir diretamente à mensagem mais recente ao abrir a conversa.
- O botão flutuante do chat agora alterna entre abrir e fechar a conversa.



## 2026-10-08

## 3.0.27
- Chamadas em grupo com múltiplas conexões WebRTC e convite de participantes.
- Mini dock de chamada mais compacta, com avatar do participante ativo e destaque dinâmico conforme a voz detectada.
- Melhorias de estabilidade na sinalização WebRTC pelo Supabase Realtime.
- Chat com envio de áudio exibido imediatamente para o próprio remetente.
- Formas de onda dos áudios do chat calculadas a partir do volume real e reutilizadas entre renderizações.
- Correções de encoding UTF-8 para acentos e emojis.
- Produção permanece isolada do ambiente TEST durante o desenvolvimento.


## 3.0.27-beta.7
- Otimizado o carregamento das formas de onda do chat.
- A forma de onda de cada áudio é calculada uma vez e reutilizada nas renderizações seguintes, evitando que os áudios antigos aparentem recarregar ao enviar uma nova mensagem.
- Não altera a lógica de chamadas WebRTC, chamadas em grupo ou sinalização de chamadas.

## 3.0.27-beta.6
- Corrigido o áudio enviado pelo próprio usuário para aparecer imediatamente no chat, sem depender do eco do Realtime.
- Barra de áudio agora gera uma forma de onda baseada no volume real do arquivo, substituindo a barra fixa.
- Durante a reprodução, o progresso continua sendo destacado sobre a forma de onda.
- Não altera a lógica de chamadas WebRTC, chamadas em grupo ou sinalização de chamadas.

## 3.0.27-beta.5
- Corrigido o envio de áudio no chat para o próprio remetente.
- Após o servidor criar a mensagem de áudio, o remetente recebe a mesma mensagem pelo canal rápido do chat e a exibe imediatamente.
- Não altera a lógica de chamadas WebRTC, chamadas em grupo ou sinalização de chamadas.

### Release pipeline v1
- Established `3.0.26` as the production baseline.
- Added `develop` as the TEST/integration branch.
- Added a single release configuration file.
- Extracted the userscript into a readable source template.
- Extracted the Edge Function into a generated source template.
- Added reproducible build and validation scripts.
- Isolated TEST storage, Realtime signaling, and ringtone coordination.
- Added validation, manual TEST deployment, and manual production workflows.
- Automatic TEST deployment is intentionally paused until GitHub Actions Supabase secrets are configured.
- Production runtime was not modified by the pipeline refactor.

### 3.0.27-beta.1
- Iniciada a nova linha de desenvolvimento para chamadas em grupo.
- Preparado o primeiro ciclo beta para evoluir o motor de chamadas WebRTC sem alterar a produção.

### 3.0.27-beta.2
- Corrigido o encoding UTF-8 do userscript para restaurar acentos e emojis corretamente.

### 3.0.27-beta.4
- Reformulada a mini dock da chamada em grupo para ficar mais compacta e discreta.
- Adicionado avatar único do participante ativo, alternando automaticamente conforme a voz detectada.
- Adicionado destaque dinâmico do falante com escala e brilho proporcionais ao nível de áudio.
- Mantidos os controles de microfone, adição de participante, saída e contador da chamada.

### 3.0.27-beta.3
- Reforçado o envio de sinalização WebRTC pelo Supabase Realtime.
- Ativada confirmação de broadcast e diagnóstico explícito de falhas do canal.
