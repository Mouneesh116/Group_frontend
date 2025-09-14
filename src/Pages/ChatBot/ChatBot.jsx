// src/components/ChatBot/ChatBot.jsx
import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import "./ChatBot.css";
import { AuthContext } from "../../Context/AuthContext";

const ChatBot = () => {
  const { userId } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [retrying, setRetrying] = useState(false);
  const messagesEndRef = useRef(null);

  // Adjust this base URL as needed for your environment
  const API_BASE = "http://16.171.124.12:8000";

  // Utility: format value as Indian Rupees
  const formatINR = (value) => {
    if (value === null || value === undefined || value === "") return "₹0.00";
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);
  };

  // scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // initial welcome
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        text: "Hello! I'm your ShopBot. Choose an option below or type your question:",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  // send a message to backend chatbot endpoint
  const sendMessageToBackend = async (messageText) => {
    if (!messageText || messageText.trim() === "") return;

    const userMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // optimistic add user message
    setMessages((prev) => [...prev, userMessage]);
    setIsBotTyping(true);
    setInputValue("");

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const resp = await axios.post(
        `${API_BASE}/api/chatbot`,
        { message: messageText, userId: userId, token },
        { headers }
      );

      // response fields
      const replyText = resp?.data?.reply ?? "I'm sorry, I couldn't get a clear response.";
      const orders = resp?.data?.orders ?? null;
      const cart = resp?.data?.cart ?? null;
      const rawCart = resp?.data?.rawCart ?? null;
      const subtotal = resp?.data?.subtotal ?? null;
      const intent = resp?.data?.intent ?? null;

      // append bot message with structured payloads if any
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      if (orders) botMessage.orders = orders;
      if (cart) botMessage.cart = cart;
      if (rawCart) botMessage.rawCart = rawCart;
      if (subtotal !== undefined) botMessage.subtotal = subtotal;
      if (intent) botMessage.intent = intent;

      // If server returned an error payload (structured) include it so UI can show Retry/Contact
      if (resp?.data?.error) {
        botMessage.error = resp.data.error;
        // preserve original user message so Retry knows what to send
        botMessage.originalUserText = messageText;
      }
      if (resp?.data?._debugOpenAIError) {
        botMessage._debugOpenAIError = resp.data._debugOpenAIError;
      }
      if (resp?.data?.requestId) {
        botMessage.requestId = resp.data.requestId;
      }

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Error sending message to backend:", err);

      // Prefer server-provided error payload if available
      const serverErr = err?.response?.data;
      const replyText = serverErr?.reply ?? "Oops! Something went wrong. Please try again later.";

      const botMessage = {
        id: (Date.now() + 2).toString(),
        text: replyText,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        // attach error info for retry/contact UI
        error: serverErr?.error || (serverErr ? { errorCode: "UNKNOWN", message: "Server error" } : null),
        originalUserText: messageText,
      };

      if (serverErr?._debugOpenAIError) botMessage._debugOpenAIError = serverErr._debugOpenAIError;
      if (serverErr?.requestId) botMessage.requestId = serverErr.requestId;

      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsBotTyping(false);
    }
  };

  // Retry handler (re-sends the original user text)
  const handleRetry = async (originalText) => {
    if (!originalText || retrying) return;
    setRetrying(true);
    try {
      // re-send original user message (will add a new optimistic user message)
      await sendMessageToBackend(originalText);
    } finally {
      setRetrying(false);
    }
  };

  // Quick options
  const quickOptions = [
    { id: "track", label: "Track My Order", message: "track order" },
    { id: "recent", label: "My Recent Orders", message: "my orders" },
    { id: "cart", label: "My Cart", message: "my cart" },
    { id: "faq1", label: "Return Policy", message: "return policy" },
    { id: "faq2", label: "Shipping Costs", message: "shipping cost" },
    { id: "faq3", label: "Payment Methods", message: "payment methods" },
    { id: "hello", label: "Say Hello 👋", message: "hello" },
  ];

  // order selection button clicked
  const handleSelectOrder = (orderId) => {
    if (!orderId) return;
    sendMessageToBackend(`track order ${orderId}`);
  };

  // checkout clicked
  const handleCheckout = () => {
    sendMessageToBackend("checkout");
  };

  // remove cart item at index (1-based index)
  const handleRemoveCartItem = (index) => {
    if (!index) return;
    sendMessageToBackend(`remove ${index}`);
  };

  // submit input
  const handleSend = (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    sendMessageToBackend(text);
  };

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="chatbot-container-wrapper">
      <div className="chatbot-container">
        <div className="chatbot-header">
          <h1 className="chatbot-title">ShopBot</h1>
        </div>

        <div className="chatbot-messages-area custom-scrollbar" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === "user" ? "user-message-row" : "bot-message-row"}`}
            >
              <div className={`message-bubble ${msg.sender === "user" ? "user-message-bubble" : "bot-message-bubble"}`}>
                <p className="message-text" style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                <span className="message-timestamp">{msg.timestamp}</span>

                {/* If bot returned orders -> allow selection */}
                {msg.sender === "bot" && Array.isArray(msg.orders) && msg.orders.length > 0 && (
                  <div className="orders-list">
                    <p className="orders-list-heading">Select an order:</p>
                    {msg.orders.map((o, idx) => (
                      <button
                        key={o.id}
                        className="order-select-button"
                        onClick={() => handleSelectOrder(o.id)}
                        disabled={isBotTyping}
                        title={`Order id: ${o.id}`}
                      >
                        {idx + 1}. {o.itemsSummary || o.items || "No items"} — {o.status} — {formatINR(o.totalAmount)} — {o.orderedAt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Normalized cart rendering */}
                {msg.sender === "bot" && Array.isArray(msg.cart) && msg.cart.length > 0 && (
                  <div className="orders-list">
                    <p className="orders-list-heading">Your cart</p>
                    {msg.cart.map((c, i) => (
                      <div key={c.id || i} className="cart-item">
                        <div className="cart-item-left">
                          <div className="cart-item-title">{c.title}</div>
                          <div className="cart-item-meta">
                            {c.qty} × {c.price != null ? formatINR(c.price) : "N/A"}
                            {c.lineTotal != null ? ` = ${formatINR(c.lineTotal)}` : ""}
                          </div>
                        </div>
                        <div className="cart-item-actions">
                          <button
                            className="cart-remove-button"
                            onClick={() => handleRemoveCartItem(c.idx ?? (i + 1))}
                            disabled={isBotTyping}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="cart-subtotal">Subtotal: {typeof msg.subtotal === "number" ? formatINR(msg.subtotal) : (msg.subtotal ? formatINR(msg.subtotal) : "N/A")}</div>

                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button className="quick-option-button" onClick={handleCheckout} disabled={isBotTyping}>Checkout</button>
                      <button className="quick-option-button" onClick={() => sendMessageToBackend("save cart")} disabled={isBotTyping}>Save Cart</button>
                    </div>
                  </div>
                )}

                {/* Helpful tip when cart empty */}
                {msg.sender === "bot" && (!Array.isArray(msg.cart) || msg.cart.length === 0) && (!Array.isArray(msg.rawCart) || msg.rawCart.length === 0) && msg.text && msg.text.toLowerCase().includes("cart is empty") && (
                  <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13 }}>
                    Tip: If you added items while logged out they may be in localStorage. Log in and use "Save Cart" on the site to persist them.
                  </div>
                )}

                {/* Display retry/contact UI when server flagged an error (e.g., OPENAI_ERROR) */}
                {msg.sender === "bot" && msg.error && (
                  <div className="bot-error-actions" style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {msg.error.errorCode === "OPENAI_ERROR" ? (
                      <>
                        <button
                          className="quick-option-button"
                          onClick={() => handleRetry(msg.originalUserText)}
                          disabled={isBotTyping || retrying}
                        >
                          {retrying ? "Retrying..." : "Retry"}
                        </button>
                        <a
                          className="quick-option-button"
                          href="mailto:loyaltymethods@gmail.com?subject=Chatbot%20support%20issue"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Contact Support
                        </a>
                        {msg.error.requestId && (
                          <div className="request-id" style={{ fontSize: 12, opacity: 0.85 }}>
                            Reference: {msg.error.requestId}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          className="quick-option-button"
                          onClick={() => handleRetry(msg.originalUserText)}
                          disabled={isBotTyping || retrying}
                        >
                          {retrying ? "Retrying..." : "Retry"}
                        </button>
                        <a
                          className="quick-option-button"
                          href="mailto:loyaltymethods@gmail.com?subject=Chatbot%20support%20issue"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Contact Support
                        </a>
                      </>
                    )}

                    {isDev && msg._debugOpenAIError && (
                      <details style={{ marginTop: 6, fontSize: 12 }}>
                        <summary>Debug info</summary>
                        <pre style={{ whiteSpace: "pre-wrap" }}>{msg._debugOpenAIError}</pre>
                      </details>
                    )}
                  </div>
                )}

                {/* Optionally show requestId if top-level (some backends include it at root) */}
                {msg.sender === "bot" && !msg.error && msg.requestId && (
                  <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>Ref: {msg.requestId}</div>
                )}
              </div>
            </div>
          ))}

          {isBotTyping && (
            <div className="message-row bot-message-row">
              <div className="message-bubble bot-message-bubble typing-indicator-bubble">
                <div className="typing-indicator">
                  <span className="dot dot1">.</span>
                  <span className="dot dot2">.</span>
                  <span className="dot dot3">.</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input + quick buttons */}
        <div className="chatbot-input-area">
          <form onSubmit={handleSend} className="chatbot-input-form" style={{ flex: 1, display: "flex", gap: 8 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message or pick an option..."
              disabled={isBotTyping}
              className="chatbot-text-input"
              aria-label="Chat message"
            />
            <button type="submit" className="chatbot-send-button" disabled={isBotTyping}>Send</button>
          </form>

          <div className="chatbot-buttons-area" style={{ marginTop: 8 }}>
            {quickOptions.map(opt => (
              <button
                key={opt.id}
                className="quick-option-button"
                onClick={() => sendMessageToBackend(opt.message)}
                disabled={isBotTyping}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
