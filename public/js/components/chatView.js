window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.chatView = function chatView() {
  return `
    <aside id="groupChat" class="group-chat" aria-label="Chat grupal" data-open="false">
      <section id="groupChatPanel" class="group-chat-panel" aria-labelledby="groupChatTitle" aria-hidden="true">
        <header class="group-chat-header">
          <div>
            <h2 id="groupChatTitle">Chat grupal</h2>
            <span><span class="group-chat-online-dot" aria-hidden="true"></span> Red local · IP visible</span>
          </div>

          <button id="groupChatClose" class="group-chat-icon-button" type="button" aria-label="Minimizar chat">−</button>
        </header>

        <div id="groupChatMessages" class="group-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
          <p id="groupChatEmpty" class="group-chat-empty">Todavía no hay mensajes. Inicia la conversación.</p>
        </div>

        <p id="groupChatStatus" class="group-chat-status" role="status"></p>

        <form id="groupChatForm" class="group-chat-form">
          <label class="sr-only" for="groupChatInput">Mensaje</label>
          <textarea id="groupChatInput" name="message" rows="2" maxlength="500" placeholder="Escribe un mensaje…" autocomplete="off"></textarea>
          <button id="groupChatSend" type="submit" aria-label="Enviar mensaje">Enviar</button>
        </form>
      </section>

      <button id="groupChatToggle" class="group-chat-toggle" type="button" aria-expanded="false" aria-controls="groupChatPanel">
        <span class="group-chat-toggle-icon" aria-hidden="true">✦</span>
        <span>Chat</span>
        <span id="groupChatUnread" class="group-chat-unread" hidden>0</span>
      </button>
    </aside>
  `;
};
