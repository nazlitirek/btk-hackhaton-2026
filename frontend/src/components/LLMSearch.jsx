import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Loader2, Send, RotateCcw } from 'lucide-react';
import ProductCard from './ProductCard';

const SUGGESTIONS = [
  "200 TL altında mavi erkek gömlek",
  "Yazlık kadın elbise göster",
  "Ucuz spor ayakkabı istiyorum",
  "Siyah çanta arıyorum",
];

const LLMSearch = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // messages: [ { role: 'user'|'ai', content: string, products?: [], totalCount?: number, filters?: {} } ]
  const [messages, setMessages] = useState([]);
  // Gemini-format history for backend
  const [chatHistory, setChatHistory] = useState([]);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e, overrideQuery = null) => {
    e?.preventDefault();
    const query = overrideQuery || input.trim();
    if (!query || loading) return;

    setInput('');

    // Add user message immediately
    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/search/llm', {
        query,
        history: chatHistory,
      });

      const { products, total_count, parsed_filters, ai_summary } = response.data;

      // Add AI message with results
      const aiMsg = {
        role: 'ai',
        content: ai_summary,
        products: products || [],
        totalCount: total_count,
        filters: parsed_filters,
      };
      setMessages(prev => [...prev, aiMsg]);

      // Update chat history for next turn (plain text summaries)
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: query },
        { role: 'model', content: ai_summary },
      ]);
    } catch (error) {
      console.error('Chat search error:', error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '⚠️ Bir hata oluştu. Lütfen tekrar deneyin.',
        products: [],
        totalCount: 0,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setChatHistory([]);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="llm-chat-wrapper">
      {/* Chat window */}
      <div className="chat-window glass">
        {messages.length === 0 && !loading ? (
          /* Empty state */
          <div className="chat-empty-state">
            <div className="chat-empty-icon">
              <Sparkles size={40} />
            </div>
            <h2>Yapay Zeka ile Alışveriş</h2>
            <p>Aklınızdaki ürünü doğal dille anlatın. Renk, fiyat, tarz — her şeyi anlıyorum. Önceki mesajlarınızı da hatırlıyorum!</p>
            <div className="suggestion-grid">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={(e) => handleSubmit(e, s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message-group ${msg.role}`}>
                {msg.role === 'user' ? (
                  <div className="user-bubble">
                    {msg.content}
                  </div>
                ) : (
                  <div className="ai-message">
                    <div className="ai-avatar">
                      <Sparkles size={16} />
                    </div>
                    <div className="ai-content">
                      {/* AI summary text */}
                      <div className="ai-bubble">
                        {msg.content}
                      </div>

                      {/* Parsed filter tags */}
                      {msg.filters && Object.keys(msg.filters).length > 0 && (
                        <div className="ai-filter-pills">
                          {Object.entries(msg.filters).map(([k, v]) =>
                            v ? <span key={k} className="ai-filter-pill">{k}: {v}</span> : null
                          )}
                        </div>
                      )}

                      {/* Product results */}
                      {msg.products && msg.products.length > 0 ? (
                        <>
                          <div className="chat-product-grid">
                            {msg.products.slice(0, 6).map(p => (
                              <ProductCard key={p.id} product={p} />
                            ))}
                          </div>
                          {msg.totalCount > 6 && (
                            <p className="more-results-hint">
                              +{msg.totalCount - 6} daha fazla sonuç mevcut
                            </p>
                          )}
                        </>
                      ) : msg.products && msg.products.length === 0 ? (
                        <div className="chat-no-results">
                          Kriterlere uyan ürün bulunamadı. Farklı bir şey deneyin.
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-message-group ai">
                <div className="ai-message">
                  <div className="ai-avatar">
                    <Sparkles size={16} />
                  </div>
                  <div className="ai-content">
                    <div className="ai-bubble typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <form className="chat-input-bar glass" onSubmit={handleSubmit}>
        {messages.length > 0 && (
          <button
            type="button"
            className="chat-reset-btn"
            onClick={handleReset}
            title="Sohbeti Sıfırla"
          >
            <RotateCcw size={18} />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={messages.length > 0 ? "Devam edin... (ör. kırmızısı var mı?)" : "Ne arıyorsunuz? (ör. 200 TL altında mavi gömlek)"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          {loading ? <Loader2 size={20} className="spinner" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};

export default LLMSearch;
