(function initGroupChat() {
  const POLL_INTERVAL_MS = 3000;
  const OPEN_STORAGE_KEY = "rmc-group-chat-open";
  const REACTIONS = [
    { key: "like", emoji: "👍", label: "Me gusta" },
    { key: "love", emoji: "❤️", label: "Me encanta" },
    { key: "haha", emoji: "😂", label: "Me divierte" },
    { key: "wow", emoji: "😮", label: "Me asombra" },
    { key: "sad", emoji: "😢", label: "Me entristece" },
    { key: "angry", emoji: "😡", label: "Me enoja" }
  ];
  const REACTION_BY_KEY = Object.fromEntries(REACTIONS.map(reaction => [reaction.key, reaction]));
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

  function createReactionControls() {
    const footer = document.createElement("div");
    const control = document.createElement("div");
    const trigger = document.createElement("button");
    const picker = document.createElement("div");
    const summary = document.createElement("div");

    footer.className = "group-chat-message-reactions";
    control.className = "group-chat-reaction-control";
    trigger.type = "button";
    trigger.className = "group-chat-reaction-trigger";
    trigger.dataset.reactionTrigger = "";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    picker.className = "group-chat-reaction-picker";
    picker.setAttribute("role", "menu");
    picker.setAttribute("aria-label", "Elegir reaccion");
    summary.className = "group-chat-reaction-summary";
    summary.setAttribute("aria-label", "Resumen de reacciones");

    REACTIONS.forEach(reaction => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "group-chat-reaction-option";
      button.dataset.chatReaction = reaction.key;
      button.textContent = reaction.emoji;
      button.title = reaction.label;
      button.setAttribute("aria-label", reaction.label);
      button.setAttribute("role", "menuitem");
      picker.appendChild(button);
    });

    control.append(trigger, picker);
    footer.append(control, summary);
    return footer;
  }

  function renderReactionState(article, data = {}) {
    if (!article) {
      return;
    }

    const trigger = article.querySelector("[data-reaction-trigger]");
    const summary = article.querySelector(".group-chat-reaction-summary");
    const counts = data.counts || {};
    const viewerReaction = REACTION_BY_KEY[data.viewer_reaction] ? data.viewer_reaction : "";
    const selected = REACTION_BY_KEY[viewerReaction];

    article.dataset.viewerReaction = viewerReaction;

    if (trigger) {
      trigger.textContent = selected ? `${selected.emoji} ${selected.label}` : "Reaccionar";
      trigger.classList.toggle("is-active", Boolean(selected));
      trigger.setAttribute(
        "aria-label",
        selected ? `${selected.label}. Pulsa para cambiar la reaccion` : "Reaccionar al mensaje"
      );
    }

    if (!summary) {
      return;
    }

    summary.textContent = "";

    REACTIONS.forEach(reaction => {
      const count = Number(counts[reaction.key]) || 0;

      if (!count) {
        return;
      }

      const button = document.createElement("button");

      button.type = "button";
      button.className = "group-chat-reaction-count";
      button.classList.toggle("is-active", reaction.key === viewerReaction);
      button.dataset.chatReaction = reaction.key;
      button.textContent = `${reaction.emoji} ${count}`;
      button.title = `${reaction.label}: ${count}`;
      button.setAttribute("aria-label", `${reaction.label}: ${count}`);
      summary.appendChild(button);
    });
  }

  function closeReactionPickers(exceptArticle = null) {
    document.querySelectorAll(".group-chat-reaction-control.is-open").forEach(control => {
      if (exceptArticle && exceptArticle.contains(control)) {
        return;
      }

      control.classList.remove("is-open");
      control.querySelector("[data-reaction-trigger]")?.setAttribute("aria-expanded", "false");

      if (control.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    });
  }

  function toggleReactionPicker(article) {
    const control = article?.querySelector(".group-chat-reaction-control");
    const trigger = control?.querySelector("[data-reaction-trigger]");

    if (!control || !trigger) {
      return;
    }

    const nextOpen = !control.classList.contains("is-open");
    closeReactionPickers(article);
    control.classList.toggle("is-open", nextOpen);
    trigger.setAttribute("aria-expanded", String(nextOpen));
  }

  async function applyReaction(article, reaction) {
    const messageId = Number(article?.dataset.messageId) || 0;

    if (!messageId || !REACTION_BY_KEY[reaction] || article.dataset.reactionPending === "true") {
      return;
    }

    article.dataset.reactionPending = "true";
    article.querySelectorAll("[data-chat-reaction]").forEach(button => {
      button.disabled = true;
    });

    try {
      const data = await requestJson(`/api/chat/messages/${messageId}/reaction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction })
      });

      state.currentIp = data.viewer_ip || state.currentIp;
      renderReactionState(article, data.reactions);
      closeReactionPickers();
      setStatus("");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      article.dataset.reactionPending = "false";
      article.querySelectorAll("[data-chat-reaction]").forEach(button => {
        button.disabled = false;
      });
    }
  }

  async function refreshReactions() {
    const articles = [...document.querySelectorAll(".group-chat-message[data-message-id]")].slice(-100);
    const messageIds = articles.map(article => article.dataset.messageId).filter(Boolean);

    if (!messageIds.length) {
      return;
    }

    const data = await requestJson(`/api/chat/reactions?message_ids=${encodeURIComponent(messageIds.join(","))}`);
    state.currentIp = data.viewer_ip || state.currentIp;

    articles.forEach(article => {
      const reactions = data.reactions?.[article.dataset.messageId];

      if (reactions) {
        renderReactionState(article, reactions);
      }
    });
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
    body.className = "group-chat-message-body";
    body.textContent = message.message;

    meta.append(ip, time);
    article.append(meta, body, createReactionControls());
    renderReactionState(article, message.reactions);
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

      const existing = id ? container.querySelector(`[data-message-id="${id}"]`) : null;

      if (!id || existing) {
        if (existing) {
          renderReactionState(existing, message.reactions);
        }
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
      await refreshReactions();
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
    element("groupChatMessages")?.addEventListener("click", event => {
      const article = event.target.closest(".group-chat-message[data-message-id]");

      if (!article) {
        return;
      }

      if (event.target.closest("[data-reaction-trigger]")) {
        toggleReactionPicker(article);
        return;
      }

      const reactionButton = event.target.closest("[data-chat-reaction]");

      if (reactionButton) {
        applyReaction(article, reactionButton.dataset.chatReaction);
      }
    });
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
    document.addEventListener("click", event => {
      if (!event.target.closest(".group-chat-reaction-control")) {
        closeReactionPickers();
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeReactionPickers();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
