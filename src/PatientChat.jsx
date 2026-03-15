import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HeartPulse, ShieldAlert, Bot, User, Users, ArrowRight, ChevronRight, FileText, Paperclip, Send, Download, Plus, MessageSquare, Menu, X as CloseIcon } from 'lucide-react';
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
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

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

      // Fetch all sessions for this user
      const fetchSessions = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/chat/sessions/${u.userId || u.id}`);
          if (res.ok) {
            const data = await res.json();
            setSessions(data);
          }
        } catch (err) {
          console.error("Failed to fetch sessions:", err);
        }
      };
      fetchSessions();
    }
  }, []);

  const loadSession = async (sessionId) => {
    try {
      setCurrentSessionId(sessionId);
      setIsTyping(false);
      const res = await fetch(`http://localhost:5000/api/chat/session/${sessionId}`);
      if (res.ok) {
        const history = await res.json();
        if (history.length > 0) {
          setMessages(history.map(m => ({
            id: m.id,
            sender: m.sender,
            text: m.message,
            type: 'text',
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        } else {
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([{
      id: Date.now(),
      sender: 'ai',
      text: `Hello ${user?.name || 'there'}! I am MediBot. How can I help you today?`,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setQuickButtons([]);
    setEmergencyWarning(null);
  };

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
          patientProfile: user,
          sessionId: currentSessionId
        }),
      });

      const data = await response.json();
      
      // Update sessionId if a new one was created
      if (data.sessionId && !currentSessionId) {
        setCurrentSessionId(data.sessionId);
        // Refresh sessions list
        const res = await fetch(`http://localhost:5000/api/chat/sessions/${user?.userId || user?.id}`);
        if (res.ok) {
          const sessionsData = await res.json();
          setSessions(sessionsData);
        }
      }

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
    <div className="min-h-screen bg-white flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${showSidebar ? 'w-80' : 'w-0'} bg-slate-900 transition-all duration-300 flex flex-col relative shrink-0 overflow-hidden z-20`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <button 
            onClick={startNewChat}
            className="flex-1 flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 px-4 transition-all shadow-sm border border-slate-700 group"
          >
            <Plus className="w-5 h-5 text-mediteal group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm">New Consultation</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Past Conversations</p>
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-slate-500 text-xs italic">
              No previous chats found
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left group animate-in slide-in-from-left-2 
                  ${currentSessionId === session.id 
                    ? 'bg-mediteal text-white shadow-lg shadow-mediteal/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center 
                  ${currentSessionId === session.id ? 'bg-white/20' : 'bg-slate-800'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${currentSessionId === session.id ? 'text-white' : 'text-slate-300'}`}>
                    {session.title}
                  </p>
                  <p className={`text-[10px] font-bold ${currentSessionId === session.id ? 'text-white/60' : 'text-slate-500'}`}>
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
           <button 
             onClick={() => navigate('/patient-dashboard')}
             className="w-full flex items-center gap-3 text-slate-400 hover:text-white transition-colors p-2 text-sm font-bold"
           >
             <ArrowLeft className="w-4 h-4" /> Back to Dashboard
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
        {/* Background Ornaments */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-mediteal/5 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-mediblue/5 rounded-full blur-3xl opacity-60"></div>
        </div>

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all active:scale-95"
              title={showSidebar ? "Close Sidebar" : "Open History"}
            >
              {showSidebar ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-mediteal/10 rounded-xl flex items-center justify-center text-mediteal shadow-inner">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">MediSync AI</h1>
                <p className="text-[10px] text-mediteal font-black uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-mediteal animate-pulse"></span>
                  Advanced Medical Engine
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Skip AI Bypass Button */}
            <button
              onClick={() => navigate('/doctor-recommendations', { state: { skipFilter: true } })}
              className="group relative flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-mediteal transition-all duration-300 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-mediteal/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Users className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Skip to Doctors</span>
              <ChevronRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="hidden sm:flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
              <div className="px-4 py-2 bg-white rounded-xl shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Profile</p>
                 <p className="text-sm font-black text-slate-900">{user?.name || 'Patient'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-10 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-10">
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-24 h-24 bg-gradient-to-br from-mediteal/20 to-mediblue/20 rounded-3xl flex items-center justify-center text-mediteal shadow-inner">
                  <Bot size={48} className="animate-bounce" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">How can I help you today?</h2>
                  <p className="text-slate-500 font-bold mt-2">Start a conversation with our medical intelligence system</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mt-10">
                   {['Check symptoms', 'Discuss lab results', 'Health advice', 'Book a checkup'].map((item) => (
                     <button key={item} onClick={() => setInputText(item)} className="p-4 bg-white border-2 border-slate-50 rounded-2xl text-left hover:border-mediteal/30 transition-all group">
                        <p className="font-black text-slate-900 text-sm group-hover:text-mediteal transition-colors">{item}</p>
                        <p className="text-xs text-slate-400 font-bold mt-1">Ready to assist • 24/7</p>
                     </button>
                   ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg
                  ${msg.sender === 'ai' ? 'bg-gradient-to-br from-mediblue to-mediteal text-white' : 'bg-slate-900 text-white'}
                `}>
                  {msg.sender === 'ai' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>

                <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-6 py-4 rounded-[2rem] shadow-sm text-[15px] leading-relaxed relative
                    ${msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
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
                                if (isHeader) {
                                  return <h3 key={i} className="font-black text-slate-900 text-sm tracking-widest uppercase mt-6 mb-2 border-b-2 border-slate-50 pb-1 inline-block">{line}</h3>;
                                }
                                return <p key={i} className={line.trim().startsWith('-') ? "ml-3 font-medium text-slate-600" : "text-slate-600"}>{formatInline(line)}</p>;
                              });

                              renderedLines.push(
                                <div key="booking-trigger" className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-5">
                                  <div className="px-4 py-3 bg-mediteal/5 rounded-2xl border border-mediteal/10">
                                    <p className="text-mediteal-dark font-black text-sm flex items-center gap-2">
                                      <ShieldAlert size={16} /> Specialist Identification Complete
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-bold mt-1">Choose your preferred consultation method to proceed with booking.</p>
                                  </div>
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
                                          URL.revokeObjectURL(url);
                                        }}
                                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-100 text-slate-700 px-6 py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98] font-black group"
                                      >
                                        <Download className="w-5 h-5 group-hover:scale-110 transition-transform" /> Download
                                      </button>
                                      <button
                                        onClick={() => {
                                          localStorage.setItem('pending_medical_summary', msg.text);
                                          localStorage.setItem('pending_appointment_type', 'Video Call');
                                          navigate('/doctor-recommendations');
                                        }}
                                        className="w-full flex-1 flex items-center justify-between bg-mediteal text-white px-8 py-4 rounded-2xl shadow-xl shadow-mediteal/20 hover:bg-mediblue transition-all active:scale-[0.98] group"
                                      >
                                        <div className="flex flex-col items-start leading-tight">
                                          <span className="font-black text-base">Video Call</span>
                                          <span className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Digital Healthcare</span>
                                        </div>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          localStorage.setItem('pending_medical_summary', msg.text);
                                          localStorage.setItem('pending_appointment_type', 'Offline Visit');
                                          navigate('/doctor-recommendations');
                                        }}
                                        className="w-full flex-1 flex items-center justify-between bg-white border-2 border-slate-100 text-slate-700 px-8 py-4 rounded-2xl hover:border-mediteal hover:text-mediteal transition-all active:scale-[0.98] group"
                                      >
                                        <div className="flex flex-col items-start leading-tight">
                                          <span className="font-black text-base">In-Person</span>
                                          <span className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Hospital Visit</span>
                                        </div>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                      </button>
                                  </div>
                                </div>
                              );
                              return renderedLines;
                            })()}
                          </div>
                        ) : (
                          <>{formatMarkdown(msg.text || "")}</>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-4 sm:gap-6 animate-in fade-in transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-mediblue to-mediteal text-white shadow-lg">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="bg-white border border-slate-100 px-6 py-5 rounded-[2rem] rounded-tl-sm shadow-sm flex gap-2 items-center">
                  <span className="w-2 h-2 bg-mediteal/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-mediteal/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-mediteal/50 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}

            {quickButtons.length > 0 && !isTyping && (
              <div className="flex flex-wrap gap-3 justify-end pt-4">
                {quickButtons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(btn)}
                    className="px-6 py-3 bg-white border-2 border-slate-50 text-slate-700 hover:border-mediteal/30 hover:text-mediteal text-[13px] font-black rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    {btn}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Input Area */}
        <footer className="bg-white/80 backdrop-blur-md border-t border-slate-100 p-6 sm:p-8 shrink-0 relative z-10">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-4 bg-slate-50 border-2 border-slate-100 p-2.5 pl-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-mediteal/5 focus-within:border-mediteal/20 focus-within:bg-white transition-all shadow-inner"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe your symptoms or ask a medical question..."
                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-bold text-[15px] py-2"
              />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              />

              <div className="flex items-center gap-1 sm:gap-2 pr-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-400 hover:text-mediteal hover:bg-white hover:shadow-sm rounded-2xl transition-all active:scale-95"
                  title="Upload Medical Records"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg
                    ${inputText.trim()
                      ? 'bg-gradient-to-r from-mediblue to-mediteal text-white hover:shadow-mediteal/30 hover:scale-105 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                  `}
                >
                  <Send className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" />
                </button>
              </div>
            </form>
            <p className="text-center mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
               <ShieldAlert size={12} className="text-mediteal" />
               Clinical Intelligence System • HIPAA Compliant • End-to-End Encrypted
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
