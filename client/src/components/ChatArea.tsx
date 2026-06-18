import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Send, Copy, ThumbsUp, ThumbsDown, Menu, User, Bot, Check, Loader2 } from 'lucide-react';
import { getSessionMessages, createSession, chatWithAgent } from '../lib/api';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { useLayout } from '../App';
import { useToast } from '../context/ToastContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

export default function ChatArea() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleMobileSidebar } = useLayout();
  const { showToast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Selamat datang! Saya adalah **Pandan Wangi**, Asisten AI Pemerintah Kabupaten Cianjur. Silakan ajukan pertanyaan seputar Pemerintah Kabupaten Cianjur."
    }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Teks berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const location = useLocation();
  
  // Load session messages when ID changes
  useEffect(() => {
    if (id) {
        // If we navigated here with preserved state, use it first!
        const preservedState = location.state as { preservedMessages?: Message[] };
        if (preservedState?.preservedMessages) {
            setMessages(preservedState.preservedMessages);
            // Clear state so refresh works normally later
            window.history.replaceState({}, document.title);
        } else {
             // Otherwise fetch from DB
             setThinking(true);
             getSessionMessages(id)
                .then((history) => {
                    if (history && history.length > 0) {
                        setMessages(history.map((h: any) => ({
                            id: h.id,
                            role: h.role,
                            content: h.content,
                            sources: h.sources
                        })));
                    } else {
                        setMessages([]);
                    }
                })
                .catch(console.error)
                .finally(() => setThinking(false));
        }
    } else {
        // Reset to welcome for new chat
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: "Selamat datang! Saya adalah **Pandan Wangi**, Asisten AI Pemerintah Kabupaten Cianjur. Silakan ajukan pertanyaan seputar Pemerintah Kabupaten Cianjur."
        }]);
    }
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const queryClient = useQueryClient();

  const handleSend = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || thinking) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setThinking(true);
    
    // Create placeholder for AI response
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = { 
        id: aiMessageId, 
        role: 'assistant', 
        content: '', // Start empty
        sources: []
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // 1. Send Atomic Request (No Streaming)
      const response = await chatWithAgent(userMessage.content, id);
      
      const { content: answer, sessionId: newSessionId, sources } = response as any;

      // 2. Update AI Message with full answer
      setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
              ? { ...msg, content: answer, sources: sources }
              : msg
      ));
      
      // 3. Navigate if New Session
      if (newSessionId && newSessionId !== id) {
           // Pass current messages to the new route so it doesn't blink/blank out
           // Since we are in a 'new chat' flow here, history is just User + AI.
           const finalMessages = [
                userMessage,
                { id: aiMessageId, role: 'assistant', content: answer, sources: sources }
           ];

           navigate(`/chat/${newSessionId}`, { 
               replace: true,
               state: { preservedMessages: finalMessages }
           });
           queryClient.invalidateQueries({ queryKey: ['sessions'] });
      }
      
    } catch (error: any) {
       console.error(error);
       showToast("Terjadi kesalahan: " + (error.message || "Server Error"), 'error');
       
       setMessages(prev => prev.map(msg => 
           msg.id === aiMessageId 
               ? { ...msg, content: `⚠️ **Gagal:** ${error.message || "Koneksi terputus."}` }
               : msg
       ));
    } finally {
       setThinking(false);
    }
  };


  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title-group">
            <button 
              className="md-hidden mobile-menu-btn"
              onClick={toggleMobileSidebar}
            >
              <Menu size={24} />
            </button>
            <div className="chat-icon-box" style={{ background: 'transparent' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <div className="chat-title-info">
                <span className="chat-title">Pandan Wangi</span>
                <span className="chat-subtitle">Asisten AI Pemerintah Kabupaten Cianjur</span>
            </div>
        </div>
        <div className="status-indicator">
            <span className="status-dot"/>
            <span className="status-text hidden md-inline">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-area">
        <div className="message-list">
            {messages.map((msg) => {
                // Don't render empty assistant messages (wait for stream or thinking state)
                if (msg.role === 'assistant' && !msg.content) return null;

                return (
                <div 
                  key={msg.id}
                  className={clsx(
                    "message-row",
                    msg.role === 'user' ? "user" : "assistant"
                  )}
                >
                <div className="message-avatar">
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                </div>
                
                <div className="message-content-wrapper">
                    <div className="message-meta">
                        <span className="meta-role">
                            {msg.role === 'user' ? 'Anda' : 'Pandan Wangi'}
                        </span>
                    </div>

                    <div className="message-bubble">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    
                    {msg.role === 'assistant' && (
                        <div className="message-actions">
                            <button 
                                className="action-btn" 
                                onClick={() => handleCopy(msg.content, msg.id)}
                                title="Copy"
                            >
                                {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button className="action-btn" title="Suka">
                                <ThumbsUp size={14} />
                            </button>
                            <button className="action-btn" title="Tidak Suka">
                                <ThumbsDown size={14} />
                            </button>
                        </div>
                    )}
                </div>
                </div>
            )})}

            {thinking && (
                <div className="message-row assistant">
                <div className="message-avatar">
                    <Bot size={16}/>
                </div>
                <div className="thinking-box">
                    <Loader2 className="animate-spin" size={16} color="var(--brand-500)"/>
                    <div className="thinking-text">
                        <span className="thinking-title">Sedang Berpikir</span>
                        <span className="thinking-sub">Menganalisis dokumen...</span>
                    </div>
                </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="input-wrapper">
            <form onSubmit={handleSend} className="input-form">
                <textarea
                    value={input}
                    onChange={e => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Ajukan pertanyaan..."
                    className="chat-input"
                    disabled={thinking}
                    rows={1}
                    style={{ resize: 'none', overflowY: 'auto' }}
                />
                <button 
                    type="submit" 
                    disabled={!input.trim() || thinking}
                    className="chat-submit"
                >
                    <Send size={18} />
                </button>
            </form>
            <div className="input-disclaimer">
                Informasi yang dihasilkan mengacu pada dokumen yang tersedia pada Knowlegde Base Pandanwangi. Verifikasi lagi pada dokumen asli.
            </div>
        </div>
      </div>
    </div>
  );
}
