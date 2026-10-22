## 2026-10-22

### 3.0.61 (stable)
- Add bounded automatic peer recovery on WebRTC connection/ICE disconnection or failure, using backoff and the existing deterministic offer initiator.
- Clear retry timers and attempt counters when leaving the voice room to avoid stale retries or reconnect loops.

### 3.0.60 (stable)
- Restore the ICE candidate-to-remote-description matcher required by WebRTC signaling; the missing helper caused `voiceRoomCandidateMatchesRemote is not defined` and stopped audio negotiation.

### 3.0.59 (stable)
- Add per-tab voice session IDs and ignore stale presence/leave events so older broadcasts cannot remove a participant from a newer session.
- Keep each remote audio stream stable across track events, create one analyser per peer, and clean up peer audio resources on disconnect.
- Disable automatic gain control and browser noise suppression for voice capture to reduce audio pumping and voice gating; keep echo cancellation enabled.
- Extend the participant heartbeat expiry window to 30 seconds to tolerate transient missed broadcasts.

### 3.0.58 (stable)
- Style the empty-room message as subdued, left-aligned supporting copy instead of a centered bold heading.
- Restore bullet separators between connection state, call duration, and ping.
- Queue ICE candidates until a remote description is ready and discard candidates whose ICE ufrag belongs to a stale negotiation, reducing intermittent WebRTC negotiation failures.

### 3.0.57 (stable)
- Use ASCII-safe voice-room labels and separators to prevent replacement glyphs in the empty state and call status.
- Disable accidental text selection across UpStatus controls while preserving selection in inputs, textareas, editable fields and chat message text.
- Align the minimized call control panel with the floating UpStatus bubble and add a small connector tail toward the avatar.
- Preserve the 3.0.56 compact empty-state layout and stable participant DOM reuse.

### 3.0.56 (stable)
- Compact the empty Chat de Voz card into a three-row layout with the join button aligned beside the empty-state text.
- Reconcile participant chips by identity and update only changed state, preventing the shared timer from rebuilding avatars and names every second.
- Use the handset hang-up icon consistently in maximized and minimized call controls, with red treatment in light and dark themes.
- Fine-tune the minimized call-control bubble alignment and retain existing voice analysis, wave, WebRTC and Realtime behavior.
- Preserve existing production namespace, storage keys, Realtime topic, chat, documents, status management and other features.

### 3.0.55 (stable)
- Replace the floating call-status badge with a compact call-control bubble to the left of the UpStatus avatar while minimized.
- Add microphone and hang-up controls to the floating call bubble, plus the current speaker avatar with an organic audio wave behind it.
- Drive the speaker wave from existing local and remote audio analysis; keep it subtle when nobody speaks and muted when the microphone is silenced.
- Animate call-card transitions between joining, connected, and idle states, and animate the floating controls as the panel is minimized or restored.
- Size participant chips to their names while retaining a single row for up to three participants.
- Preserve existing production namespace, storage keys, realtime topic, call negotiation, chat and other features.

## 2026-10-21

### 3.0.54 (stable)
- Redesign the empty Chat de Voz state with an inviting message and prominent join action.
- Add short synthesized join/leave sound cues for active voice-chat participants through the existing realtime room channel.
- Show connecting/connected status and WebRTC round-trip latency when available; remove the normal in-room status sentence.
- Keep up to three participant chips on one row with responsive name truncation.
- Add a voice activity badge to the minimized UpStatus bubble, including a distinct muted-microphone state.
- Preserve the production namespace, storage keys, realtime topic, chat, documents, status management, and call features.

## 2026-10-21

### 3.0.53 (stable)
- Rename the shared team voice room to “Chat de Voz” for a clearer, more natural label.
- Preserve the 3.0.52 synchronized voice-room timer, compact layout, member version labels, and centered hang-up icon.
- Voice join/leave sound cues are being prepared separately for testing before stable inclusion.

## 2026-10-21

### 3.0.52 (stable)
- Promote the validated Beta 6 team voice-room interface and synchronized session timer to the official release.
- Tighten spacing between Sale Smartly sync status and the voice room; hide empty message space.
- Place member version labels beside names and center the red hang-up handset icon.
- Preserve the 3.0.51 call-discovery/request-to-join flow, chat reliability, and document styling improvements.
- Production deployment targets `upstatus`; the isolated `upstatus-test-3-0-52-beta6` endpoint remains available for testing.
- Real-time voice audio and timer synchronization should still be verified with multiple live participants.

## 2026-10-21

### 3.0.51 (stable)
- Added an animated green phone indicator on team avatars when an active group call is detected.
- Added targeted requests to join an existing group call, with accept/decline handling before attempting to connect.
- Improved cross-version active-call discovery using the shared Realtime presence topic.
- Strengthened light-mode document card gradients in chat messages and the shared-document library, with distinct blue, red and green file-type treatments.
- Preserved the vivid dark-mode document styling and improved light-mode contrast for icons and download controls.
- Production stable release. Call admission and audio still require validation with multiple live users; this release does not claim screen-share forwarding support.

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
## 2026-10-21

### 3.0.53 (stable)
- Rename the shared team voice room to “Chat de Voz” for a clearer, more natural label.
- Preserve the 3.0.52 synchronized voice-room timer, compact layout, member version labels, and centered hang-up icon.
- Voice join/leave sound cues are being prepared separately for testing before stable inclusion.

## 2026-10-21

### 3.0.52 (stable)
- Promote the validated Beta 6 team voice-room interface and synchronized session timer to the official release.
- Tighten spacing between Sale Smartly sync status and the voice room; hide empty message space.
- Place member version labels beside names and center the red hang-up handset icon.
- Preserve the 3.0.51 call-discovery/request-to-join flow, chat reliability, and document styling improvements.
- Production deployment targets `upstatus`; the isolated `upstatus-test-3-0-52-beta6` endpoint remains available for testing.
- Real-time voice audio and timer synchronization should still be verified with multiple live participants.

## 2026-10-21

### 3.0.51 (stable)
- Added an animated green phone indicator on team avatars when an active group call is detected.
- Added targeted requests to join an existing group call, with accept/decline handling before attempting to connect.
- Improved cross-version active-call discovery using the shared Realtime presence topic.
- Strengthened light-mode document card gradients in chat messages and the shared-document library, with distinct blue, red and green file-type treatments.
- Preserved the vivid dark-mode document styling and improved light-mode contrast for icons and download controls.
- Production stable release. Call admission and audio still require validation with multiple live users; this release does not claim screen-share forwarding support.

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
