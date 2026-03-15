import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HeartPulse, ShieldAlert, Bot, User, ArrowRight, FileText, Paperclip, Send, Download } from 'lucide-react';
import { chatApi } from './lib/api';

// Helper to convert markdown text to JSX
function formatMarkdown(text) {
  if (!text || typeof text !== 'string') return text;

  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Headings
    if (line.startsWith('### ')) {
      return <h4 key={i} style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.75rem', marginBottom: '0.25rem', color: '#1e293b' }}>{formatInline(line.slice(4))}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} style={{ fontWeight: 800, fontSize: '1rem', marginTop: '1rem', marginBottom: '0.25rem', color: '#0f172a' }}>{formatInline(line.slice(3))}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={i} style={{ fontWeight: 900, fontSize: '1.1rem', marginTop: '1rem', marginBottom: '0.25rem', color: '#0f172a' }}>{formatInline(line.slice(2))}</h2>;
    }
    // Bullet list items
    if (/^\s*[-•]\s/.test(line)) {
      return <p key={i} style={{ paddingLeft: '1rem', position: 'relative' }}><span style={{ position: 'absolute', left: '0' }}>•</span> {formatInline(line.replace(/^\s*[-•]\s*/, ''))}</p>;
    }
    // Numbered list
    const numMatch = line.match(/^\s*(\d+)\.\s(.*)/);
    if (numMatch) {
      return <p key={i} style={{ paddingLeft: '1.25rem', position: 'relative' }}><span style={{ position: 'absolute', left: '0', fontWeight: 700 }}>{numMatch[1]}.</span> {formatInline(numMatch[2])}</p>;
    }
    // Empty line = spacing
    if (line.trim() === '') {
      return <br key={i} />;
    }
    // Normal text
    return <p key={i}>{formatInline(line)}</p>;
  });
}

// Helper to format inline markdown: **bold** and *italic*
function formatInline(text) {
  if (!text) return text;
  const parts = [];
  // Match **bold** and *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // **bold**
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: '#0f172a' }}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={key++}>{match[3]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

export default function PatientChat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickButtons, setQuickButtons] = useState([]);
  const [emergencyWarning, setEmergencyWarning] = useState(null);
  const [user, setUser] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am MediBot, your intelligent multilingual medical assistant. I see I have your profile ready. What brings you in today?',
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    const savedUser = localStorage.getItem('medisync_user');
    if (savedUser) {
      const activeProfile = localStorage.getItem('activeProfile');
      let u = JSON.parse(savedUser);
      if (activeProfile) {
        const profileInfo = JSON.parse(activeProfile);
        u = { ...u, ...profileInfo };
      }
      setUser(u);

      // Fetch history from DB
      const fetchHistory = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/chat/history/${u.id}`);
          const history = await res.json();
          if (history.length > 0) {
            setMessages(history.map(m => ({
              id: m.id,
              sender: m.sender,
              text: m.message,
              type: 'text',
              timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })));
          }
        } catch (err) {
          console.error("Failed to fetch chat history:", err);
        }
      };
      fetchHistory();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const simulateAIResponse = async (userText, updatedMessages) => {
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          conversationHistory: updatedMessages,
          patientId: user?.userId || user?.id,
          patientProfile: user
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'AI Service Error');
      }

      const text = data.reply || "";

      setQuickButtons(data.buttons || []);

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'ai',
        text: text,
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      // Extract and save medical summary if present
      if (text.includes('[SUMMARY_START]')) {
        const summaryContent = text.split('[SUMMARY_START]')[1] || text;
        localStorage.setItem('pending_medical_summary', summaryContent.trim());
        console.log('MediSync: Saved medical summary to localStorage');
      }
    } catch (error) {
      console.error("MediSync: Failed to fetch from backend:", error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'ai',
        text: error.message.includes('rate_limit')
          ? "I'm a bit overwhelmed with requests right now! Please wait a few seconds and try again. 🕒🧠"
          : "I'm having trouble connecting to my AI brain! Please check your internet connection or try again in a few moments. 🧠⚡",
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const newUserMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputText,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setInputText('');
    setQuickButtons([]);

    simulateAIResponse(inputText, newMessages);
  };

  const clearChat = () => {
    const initialMsg = [{
      id: 1,
      sender: 'ai',
      text: `Hello ${user?.name || ''}! I am MediBot. I have your profile here. What brings you in today?`,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
    setMessages(initialMsg);
    setQuickButtons([]);
    setEmergencyWarning(null);
    localStorage.removeItem('medisync_chat_history');
  };

  const handleQuickReply = (buttonText) => {
    // Handle "Proceed to Booking" specially — navigate to recommendations
    if (buttonText.includes('Proceed to Booking')) {
      console.log('MediSync: Navigating to doctor recommendations...');
      navigate('/doctor-recommendations');
      return;
    }

    const newUserMsg = {
      id: Date.now(),
      sender: 'user',
      text: buttonText,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setQuickButtons([]);

    simulateAIResponse(buttonText, newMessages);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newUserMsg = {
      id: Date.now(),
      sender: 'user',
      text: `Uploaded document: ${file.name}`,
      type: 'file',
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(1) + ' KB',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('document', file);
      const accountId = user?.userId || user?.id;
      if (accountId) {
        formData.append('patientId', accountId);
      } else {
        formData.append('patientId', 'anonymous');
      }

      if (user) {
        formData.append('patientProfile', JSON.stringify(user));
      }

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Store file reference for later booking
      const pendingRecords = JSON.parse(localStorage.getItem('pending_medical_records') || '[]');
      pendingRecords.push({
        name: data.originalName,
        url: data.fileUrl,
        id: data.fileName
      });
      localStorage.setItem('pending_medical_records', JSON.stringify(pendingRecords));

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'ai',
        text: data.reply || "I received your document but couldn't analyze it properly.",
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      // Append extracted text to the shared summary context so doctors see it
      if (data.documentText) {
        const existingSummary = localStorage.getItem('pending_medical_summary') || "";
        localStorage.setItem('pending_medical_summary',
          existingSummary + "\n\nEXTRACTED FROM UPLOADED DOCUMENT (" + data.name + "):\n" + data.documentText
        );
      }
    } catch (error) {
      console.error("Failed to upload document to backend:", error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'ai',
        text: "Sorry, there was an error analyzing your document. Make sure the backend server is running.",
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen">
      {/* Background Ornaments */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-mediteal/5 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-mediblue/5 rounded-full blur-3xl opacity-60"></div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/patient-dashboard')}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mediteal/10 rounded-xl flex items-center justify-center text-mediteal">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">MediSync Intake</h1>
              <p className="text-sm text-mediteal font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-mediteal animate-pulse"></span>
                AI Assistant Active
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearChat}
            className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
          >
            Clear Chat
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => navigate('/doctor-recommendations', { state: { skipFilter: true } })}
              className="text-xs font-bold text-mediteal hover:text-mediblue transition-colors uppercase tracking-widest bg-mediteal/5 px-3 py-1.5 rounded-lg border border-mediteal/10"
            >
              Skip to Doctors
            </button>
            <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full items-center gap-2 flex">
              <ShieldAlert className="w-4 h-4" />
              End-to-end encrypted
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
        {messages && messages.length > 0 && messages.map((msg) => {
          if (!msg) return null;
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
                ${msg.sender === 'ai' ? 'bg-gradient-to-br from-mediblue to-mediteal text-white' : 'bg-slate-200 text-slate-600'}
              `}>
                {msg.sender === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>

              <div className={`flex flex-col gap-1 max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-[15px] leading-relaxed relative
                  ${msg.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                  }
                `}>
                  {msg.type === 'text' && (
                    <div className="whitespace-pre-wrap">
                      {(msg.text && typeof msg.text === 'string' && (msg.text.includes('SUMMARY PREPARED') || msg.text.includes('[SUMMARY_START]'))) ? (
                        <div className="space-y-4 py-1">
                          {(() => {
                            const lines = msg.text.replace('[SUMMARY_START]', 'SUMMARY PREPARED').split('\n');
                            const renderedLines = lines.map((line, i) => {
                              const isHeader = /^[A-Z\s]{5,}$/.test(line.trim());
                              const isBookingTrigger = line.includes('[Proceed to Booking]');

                              if (isBookingTrigger) {
                                return (
                                  <div key={i} className="mt-6 pt-6 border-t border-slate-100 italic font-medium text-mediteal-dark flex flex-col gap-4">
                                    <p>{line.replace('[Proceed to Booking]', '').trim() || "Ready to find your specialist?"}</p>
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                      <button
                                        onClick={() => {
                                          const blob = new Blob([msg.text.replace('[SUMMARY_START]', '').replace('[SUMMARY_END]', '').trim()], { type: 'text/plain' });
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `MediSync_Summary_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                        }}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-4 rounded-2xl not-italic shadow-sm hover:bg-slate-200 transition-all transform active:scale-[0.98] font-black"
                                      >
                                        <Download className="w-5 h-5" /> Download
                                      </button>
                                      <button
                                        onClick={() => {
                                          localStorage.setItem('pending_medical_summary', msg.text);
                                          navigate('/doctor-recommendations');
                                        }}
                                        className="w-full flex-1 flex items-center justify-between bg-mediteal text-white px-8 py-4 rounded-2xl not-italic shadow-lg shadow-mediteal/20 hover:bg-mediblue hover:shadow-mediblue/20 transition-all transform active:scale-[0.98] group"
                                      >
                                        <span className="font-black text-lg">Proceed to Booking</span>
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              if (isHeader) {
                                return <h3 key={i} className="font-black text-slate-900 text-sm tracking-widest uppercase mt-6 mb-2 border-b-2 border-slate-50 pb-1 inline-block">{line}</h3>;
                              }
                              return <p key={i} className={line.trim().startsWith('-') ? "ml-3 font-medium text-slate-600" : "text-slate-600"}>{formatInline(line)}</p>;
                            });

                            // Fallback: If no booking trigger was rendered manually, ensure it's there for any message containing [SUMMARY_START]
                            const hasBookingTrigger = msg.text.includes('[Proceed to Booking]');

                            if (!hasBookingTrigger) {
                              renderedLines.push(
                                <div key="fallback-booking" className="mt-6 pt-6 border-t border-slate-100 italic font-medium text-mediteal-dark flex flex-col gap-4">
                                  <p className="not-italic text-slate-500 text-sm">Based on your summary, I've identified the best specialists for your condition.</p>
                                  <div className="flex flex-col sm:flex-row items-center gap-3">
                                      <button
                                        onClick={() => {
                                          const blob = new Blob([msg.text.replace('[SUMMARY_START]', '').replace('[SUMMARY_END]', '').trim()], { type: 'text/plain' });
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `MediSync_Summary_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                        }}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-4 rounded-2xl not-italic shadow-sm hover:bg-slate-200 transition-all transform active:scale-[0.98] font-black"
                                      >
                                        <Download className="w-5 h-5" /> Download
                                      </button>
                                      <button
                                        onClick={() => {
                                          localStorage.setItem('pending_medical_summary', msg.text);
                                          navigate('/doctor-recommendations');
                                        }}
                                        className="w-full flex-1 flex items-center justify-between bg-mediteal text-white px-8 py-4 rounded-2xl not-italic shadow-lg shadow-mediteal/20 hover:bg-mediblue hover:shadow-mediblue/20 transition-all transform active:scale-[0.98] group"
                                      >
                                        <span className="font-black text-lg">Proceed to Booking</span>
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                      </button>
                                    </div>
                                </div>
                              );
                            }

                            return renderedLines;
                          })()}
                        </div>
                      ) : (
                        <>{formatMarkdown(msg.text || "")}</>
                      )}
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 bg-white/10 p-2 rounded-xl border border-white/20">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm line-clamp-1">{msg.fileName}</p>
                        <p className="text-xs text-white/70">{msg.fileSize} • Uploaded Document</p>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-400 px-1 font-medium">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start gap-4 animate-in fade-in">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-mediblue to-mediteal text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-mediteal/50 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-mediteal/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-mediteal/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}

        {emergencyWarning && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="text-red-800 font-bold text-sm">MEDICAL SAFETY WARNING</p>
              <p className="text-red-700 text-sm leading-relaxed">{emergencyWarning}</p>
            </div>
          </div>
        )}

        {quickButtons && quickButtons.length > 0 && !isTyping && (
          <div className="flex flex-wrap gap-2 justify-end animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
            {quickButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickReply(btn)}
                className="px-4 py-2 bg-white border border-mediteal/20 text-mediteal-dark hover:bg-mediteal/10 hover:border-mediteal text-sm font-semibold rounded-full transition-all shadow-sm active:scale-95"
              >
                {btn}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
        <div className="max-w-4xl mx-auto relative">
          <form
            onSubmit={handleSend}
            className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 pl-4 rounded-full focus-within:ring-2 focus-within:ring-mediteal/20 focus-within:border-mediteal transition-all shadow-sm"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-mediteal hover:bg-mediteal/10 rounded-full transition-colors"
              title="Upload Medical Records"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-3 rounded-full flex items-center justify-center transition-all shadow-md
                ${inputText.trim()
                  ? 'bg-gradient-to-r from-mediblue to-mediteal text-white hover:shadow-lg hover:shadow-mediteal/20 hover:scale-105'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
              `}
            >
              <Send className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" />
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-xs text-slate-400 font-medium">
              MediSync AI analyzes your input and uploaded documents to prepare for your appointment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
