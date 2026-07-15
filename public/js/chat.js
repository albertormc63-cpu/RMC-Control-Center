(function initGroupChat() {
  const POLL_INTERVAL_MS = 3000;
  const OPEN_STORAGE_KEY = "rmc-group-chat-open";
  const state = {
    currentIp: "",
    lastMessageId: 0,
    initialized: false,
    loading: false,
    sending: false,
    unread: 0
  };

  function element(id) {
    return document.getElementById(id);
  }

  function readOpenPreference() {
    try {
      return localStorage.getItem(OPEN_STORAGE_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function saveOpenPreference(value) {
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, String(value));
    } catch (error) {
      // La preferencia es opcional; el chat funciona sin localStorage.
    }
  }

  function isOpen() {
    return element("groupChat")?.dataset.open === "true";
  }

  function setStatus(message, type = "") {
    const status = element("groupChatStatus");

    if (status) {
      status.textContent = message || "";
      status.dataset.type = type;
    }
  }

  function updateUnread() {
    const badge = element("groupChatUnread");

    if (badge) {
      badge.hidden = state.unread === 0;
      badge.textContent = state.unread > 99 ? "99+" : String(state.unread);
    }
  }

  function setOpen(nextOpen, options = {}) {
    const root = element("groupChat");
    const panel = element("groupChatPanel");
    const toggle = element("groupChatToggle");

    if (!root || !panel || !toggle) {
      return;
    }

    root.dataset.open = String(nextOpen);
    panel.setAttribute("aria-hidden", String(!nextOpen));
    toggle.setAttribute("aria-expanded", String(nextOpen));
    saveOpenPreference(nextOpen);

    if (nextOpen) {
      state.unread = 0;
      updateUnread();
      window.setTimeout(() => {
        scrollToLatest();
        if (options.focus !== false) {
          element("groupChatInput")?.focus();
        }
      }, 0);
    }
  }

  function formatTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date).replace(",", " ·");
  }

  function colorIndex(ip) {
    return Array.from(String(ip || "")).reduce((hash, char) => hash + char.charCodeAt(0), 0) % 6;
  }

  function nearBottom(container) {
    return container.scrollHeight - container.scrollTop - container.clientHeight < 72;
  }

  function scrollToLatest() {
    const messages = element("groupChatMessages");

    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }

  function createMessageNode(message) {
    const article = document.createElement("article");
    const meta = document.createElement("div");
    const ip = document.createElement("strong");
    const time = document.createElement("time");
    const body = document.createElement("p");
    const ownMessage = message.client_ip === state.currentIp;

    article.className = `group-chat-message${ownMessage ? " is-own" : ""}`;
    article.dataset.messageId = String(message.id);
    article.dataset.color = String(colorIndex(message.client_ip));
    meta.className = "group-chat-message-meta";
    ip.textContent = ownMessage ? `${message.client_ip} · Tú` : message.client_ip;
    time.dateTime = message.created_at || "";
    time.textContent = formatTime(message.created_at);
    body.textContent = message.message;

    meta.append(ip, time);
    article.append(meta, body);
    return article;
  }

  function appendMessages(items, options = {}) {
    const container = element("groupChatMessages");
    const empty = element("groupChatEmpty");

    if (!container || !Array.isArray(items) || items.length === 0) {
      return;
    }

    const shouldScroll = nearBottom(container) || options.forceScroll;
    let added = 0;

    items.forEach(message => {
      const id = Number(message.id) || 0;

      if (!id || container.querySelector(`[data-message-id="${id}"]`)) {
        state.lastMessageId = Math.max(state.lastMessageId, id);
        return;
      }

      container.appendChild(createMessageNode(message));
      state.lastMessageId = Math.max(state.lastMessageId, id);
      added += 1;
    });

    if (empty && added > 0) {
      empty.remove();
    }

    if (!isOpen() && !options.initial) {
      state.unread += added;
      updateUnread();
    }

    if (shouldScroll) {
      scrollToLatest();
    }
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || data.message || "No se pudo conectar con el chat");
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async function loadMessages(options = {}) {
    if (state.loading || document.hidden) {
      return;
    }

    state.loading = true;

    try {
      const query = state.lastMessageId ? `?after=${state.lastMessageId}&limit=100` : "?limit=50";
      const data = await requestJson(`/api/chat/messages${query}`);
      const initial = !state.initialized;
      state.currentIp = data.viewer_ip || state.currentIp;
      appendMessages(data.messages, { initial, forceScroll: options.forceScroll });
      state.initialized = true;
      setStatus("");
    } catch (error) {
      setStatus("Sin conexión. Reintentando…", "error");
    } finally {
      state.loading = false;
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    const input = element("groupChatInput");
    const button = element("groupChatSend");
    const message = input?.value.trim();

    if (!message || state.sending) {
      if (!message) {
        setStatus("Escribe un mensaje antes de enviar.", "warning");
      }
      return;
    }

    state.sending = true;
    input.disabled = true;
    button.disabled = true;
    setStatus("Enviando…");

    try {
      const data = await requestJson("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      state.currentIp = data.viewer_ip || state.currentIp;
      input.value = "";
      appendMessages([data.message], { forceScroll: true });
      setStatus("");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      state.sending = false;
      input.disabled = false;
      button.disabled = false;
      input.focus();
    }
  }

  function mount() {
    if (!window.RMCComponents?.chatView || element("groupChat")) {
      return;
    }

    document.body.insertAdjacentHTML("beforeend", window.RMCComponents.chatView());
    element("groupChatToggle")?.addEventListener("click", () => setOpen(!isOpen()));
    element("groupChatClose")?.addEventListener("click", () => setOpen(false));
    element("groupChatForm")?.addEventListener("submit", sendMessage);
    element("groupChatInput")?.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        element("groupChatForm")?.requestSubmit();
      }
    });

    setOpen(readOpenPreference(), { focus: false });
    loadMessages({ forceScroll: true });
    window.setInterval(loadMessages, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        loadMessages({ forceScroll: isOpen() });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
