import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { krambuService } from '../services/krambuService';
import ReactMarkdown from 'react-markdown';
import { Send, Shield, Info, AlertTriangle, FileText, ChevronRight, Loader2, Mail, Clock, CheckCircle2, Podcast, Presentation, Network, ExternalLink, Settings, Radio, Zap, Layout, MessageCircle, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MindMap } from './MindMap';
import { PitchDeck } from './PitchDeck';
import { Footer } from './Footer';
import { AnimatePresence, motion } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Branding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

interface DashboardProps {
  branding: Branding;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  showForm?: boolean;
}

export function Dashboard({ branding }: DashboardProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "I am the Project Liaison. I am here to provide technical data regarding this project. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [benchmarkMode, setBenchmarkMode] = useState(false);
  const [showPitchDeck, setShowPitchDeck] = useState(false);
  const [showModeSwitcher, setShowModeSwitcher] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseResponse = (text: string) => {
    const suggestionMatch = text.match(/SUGGESTIONS:\s*(\[.*\])/);
    let suggestions: string[] = [];
    let cleanText = text;

    if (suggestionMatch) {
      try {
        suggestions = JSON.parse(suggestionMatch[1]);
        cleanText = text.replace(suggestionMatch[0], '').trim();
      } catch (e) {
        console.error("Failed to parse suggestions", e);
      }
    }

    const isInternalReview = cleanText.includes("That specific data point is currently under internal review");

    return { cleanText, suggestions, isInternalReview };
  };

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const responseText = await krambuService.chat(messageText, history, benchmarkMode);
      const { cleanText, suggestions, isInternalReview } = parseResponse(responseText || "");
      
      const modelMessage: Message = {
        role: 'model',
        text: cleanText || "I encountered an error processing your request.",
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        showForm: isInternalReview
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: "System communication error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const InquiryForm = ({ question }: { question: string }) => {
    const [email, setEmail] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setFormSubmitted(true);
    };

    if (formSubmitted) {
      return (
        <div className="mt-6 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center gap-4 text-cyan-400 glow-cyan backdrop-blur-xl">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div className="text-xs">
            <p className="font-black uppercase tracking-[0.2em]">Inquiry Logged Successfully</p>
            <p className="mt-2 text-white/70 leading-relaxed">
              {isAnonymous 
                ? "Your anonymous inquiry has been queued. Please check back in 72 hours for an updated response." 
                : `A notification will be sent to ${email} once our engineering team has reviewed the technical data.`}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6 p-6 bg-white/5 border border-purple-500/30 rounded-xl shadow-2xl backdrop-blur-xl">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-4 flex items-center gap-3">
          <Mail className="w-4 h-4" />
          Submit Technical Inquiry
        </h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-[12px] italic text-white/60 leading-relaxed">
            "{question}"
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={cn(
                "w-5 h-5 border-2 rounded flex items-center justify-center transition-all",
                isAnonymous ? "bg-purple-600 border-purple-500" : "border-white/20 group-hover:border-purple-500"
              )}>
                {isAnonymous && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <input 
                type="checkbox" 
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="hidden"
              />
              <span className="text-[11px] uppercase font-black tracking-widest text-white/70">Submit Anonymously</span>
            </label>
          </div>

          {!isAnonymous && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 block">Contact Email for Notification</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mickey@lbkhsolutions.com"
                  className="w-full pl-12 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder:text-white/20"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
              <Clock className="w-4 h-4" />
              <span className="uppercase tracking-widest">EST. RESPONSE: 72 HOURS</span>
            </div>
            <button 
              type="submit"
              className="bg-purple-600 text-white px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-purple-500 transition-all rounded-lg glow-purple"
            >
              Log Inquiry
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen krambu-bg wireframe-grid">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md text-white p-6 border-b border-purple-500/30 flex justify-between items-center shadow-2xl relative z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div 
                className="w-8 h-8 rounded-sm flex items-center justify-center transform rotate-45 glow-purple group-hover:scale-110 transition-transform"
                style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
              >
                <Shield className="w-5 h-5 text-white transform -rotate-45" />
              </div>
            )}
            <div className="flex flex-col">
              <span 
                className="text-2xl font-black tracking-tighter uppercase leading-none bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, white, ${branding.primaryColor})` }}
              >
                {branding.companyName}
              </span>
              <span 
                className="text-[9px] font-mono uppercase tracking-[0.3em] mt-1"
                style={{ color: branding.secondaryColor }}
              >
                Project Liaison
              </span>
            </div>
          </Link>
        </div>
        <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-white/70">
          <Link to="/" className="transition-colors" style={{ color: branding.primaryColor }}>Home</Link>
          <a href="#" className="transition-colors hover:text-white">Colocation</a>
          <a href="#" className="transition-colors hover:text-white">AI GPU Clusters</a>
          <a href="#" className="transition-colors hover:text-white">Services</a>
          <a href="#" className="transition-colors hover:text-white">Shop</a>
          <a href="#" className="transition-colors hover:text-white">Press</a>
          <Link to="/settings" className="transition-colors flex items-center gap-2 hover:text-white">
            <Settings className="w-3 h-3" style={{ color: branding.primaryColor }} />
            Settings
          </Link>
          <Link to="/event" className="transition-colors flex items-center gap-2 hover:text-white">
            <Radio className="w-3 h-3" style={{ color: branding.primaryColor }} />
            Live Event
          </Link>
        </nav>
        <div className="flex items-center gap-6">
          {/* Mode Switcher Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowModeSwitcher(!showModeSwitcher)}
              className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all group hover:bg-white/10"
              style={{ color: branding.primaryColor }}
            >
              <MessageCircle className="w-4 h-4" />
              Mode: Chat
              <ChevronDown className={`w-3 h-3 transition-transform ${showModeSwitcher ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showModeSwitcher && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { navigate('/settings'); setShowModeSwitcher(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest text-left transition-colors"
                    >
                      <Layout className="w-4 h-4" />
                      Develop
                    </button>
                    <button 
                      onClick={() => { navigate('/event'); setShowModeSwitcher(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest text-left transition-colors"
                    >
                      <Radio className="w-4 h-4" />
                      Live Event
                    </button>
                    <button 
                      onClick={() => { navigate('/'); setShowModeSwitcher(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left"
                      style={{ 
                        backgroundColor: `${branding.primaryColor}20`,
                        color: branding.primaryColor 
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat Liaison
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setBenchmarkMode(!benchmarkMode)}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg border transition-all group",
              benchmarkMode 
                ? "bg-red-500/10 border-red-500/50 text-red-400 glow-red" 
                : "bg-white/5 border-white/10 text-white/40 hover:border-white/30"
            )}
            style={{ 
              borderColor: benchmarkMode ? undefined : branding.primaryColor + '20',
              color: benchmarkMode ? undefined : branding.primaryColor + '60'
            }}
          >
            <AlertTriangle className={cn("w-4 h-4", benchmarkMode ? "animate-pulse" : "opacity-50")} />
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-black uppercase tracking-widest">Benchmark Mode</span>
              <span className="text-[8px] font-mono opacity-60 uppercase">{benchmarkMode ? 'Engaged' : 'Siloed'}</span>
            </div>
          </button>
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <div 
                className="w-2 h-2 rounded-full animate-pulse" 
                style={{ 
                  backgroundColor: branding.secondaryColor,
                  boxShadow: `0 0 8px ${branding.secondaryColor}`
                }}
              />
              <span style={{ color: branding.secondaryColor }}>GROUNDED MODE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1800px] mx-auto w-full p-6 gap-6 relative z-10">
        {/* Left Sidebar Info */}
        <aside className="hidden xl:flex w-80 flex-col gap-6">
          <div 
            className="data-card p-6 border-opacity-20"
            style={{ borderColor: branding.primaryColor }}
          >
            <div 
              className="flex items-center gap-3 mb-4"
              style={{ color: branding.secondaryColor }}
            >
              <Info className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Protocol</h2>
            </div>
            <ul className="space-y-4 text-[11px] text-white/60 font-medium">
              <li className="flex gap-3">
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: branding.primaryColor }} />
                <span>Strictly derived from verified project documentation.</span>
              </li>
              <li className="flex gap-3">
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: branding.primaryColor }} />
                <span>Mandatory citations for all technical claims.</span>
              </li>
              <li className="flex gap-3">
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: branding.primaryColor }} />
                <span>No speculation on non-disclosed phases.</span>
              </li>
            </ul>
          </div>

          <div 
            className="data-card p-6 bg-opacity-10 border-opacity-40"
            style={{ 
              backgroundColor: branding.primaryColor,
              borderColor: branding.primaryColor,
              boxShadow: `0 0 20px ${branding.primaryColor}20`
            }}
          >
            <div 
              className="flex items-center gap-3 mb-4"
              style={{ color: branding.primaryColor }}
            >
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Disclaimer</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-white/80 italic">
              LBKH Solutions provides the ability for the public to ask questions and those will be answered by the Agent based on the source material. The source material is provided by parties interested in bringing the project to fruition.
            </p>
          </div>

          <div className="mt-auto p-4 border-t border-white/10">
            <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
              <FileText className="w-4 h-4" />
              <span className="uppercase tracking-widest">LOGGED: {process.env.USER_EMAIL || 'ANONYMOUS'}</span>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col data-card overflow-hidden border-white/10 min-w-0">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
          >
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex flex-col max-w-[90%]",
                  m.role === 'user' ? "ml-auto items-end" : "items-start"
                )}
              >
                <div 
                  className={cn(
                    "p-6 text-[15px] leading-relaxed shadow-2xl relative",
                    m.role === 'user' 
                      ? "text-white rounded-2xl rounded-tr-none" 
                      : "bg-white/5 border border-white/10 text-white/90 rounded-2xl rounded-tl-none backdrop-blur-md"
                  )}
                  style={{ 
                    backgroundColor: m.role === 'user' ? branding.primaryColor : undefined,
                    boxShadow: m.role === 'user' ? `0 0 30px ${branding.primaryColor}40` : undefined
                  }}
                >
                  <div className={cn(
                    "prose prose-sm max-w-none prose-invert",
                    m.role === 'user' ? "prose-p:text-white" : "prose-p:text-white/90"
                  )}>
                    <ReactMarkdown>
                      {m.text}
                    </ReactMarkdown>
                  </div>
                  
                  {m.role === 'model' && m.suggestions && (
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                      <p 
                        className="text-[10px] font-black uppercase tracking-[0.2em]"
                        style={{ color: branding.secondaryColor }}
                      >
                        Suggested Follow-ups
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {m.suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(s)}
                            disabled={isLoading}
                            className="text-[11px] bg-white/5 border border-white/20 px-4 py-2 rounded-full transition-all text-left font-bold hover:opacity-80"
                            style={{ 
                              borderColor: branding.primaryColor + '40',
                              color: branding.secondaryColor
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.role === 'model' && m.showForm && (
                    <InquiryForm question={messages[i-1]?.text || "General Inquiry"} />
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/30 mt-2 uppercase tracking-widest">
                  {m.role === 'user' ? 'Resident' : 'Liaison'} • {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isLoading && (
              <div 
                className="flex items-center gap-3 text-[11px] font-mono animate-pulse"
                style={{ color: branding.secondaryColor }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="uppercase tracking-widest">Consulting Engineering Repository...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-white/10 bg-black/40">
            <div className="relative flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Enter technical inquiry or project concern..."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-6 py-4 pr-16 text-sm focus:outline-none transition-all text-white placeholder:text-white/30"
                  style={{ 
                    borderColor: branding.primaryColor + '40',
                    boxShadow: `0 0 20px ${branding.primaryColor}10`
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                  style={{ 
                    backgroundColor: branding.primaryColor,
                    boxShadow: `0 0 15px ${branding.primaryColor}60`
                  }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-white/20 mt-4 text-center uppercase tracking-[0.3em] font-bold">
              Grounded Response Protocol Active • Secure Archive Enabled
            </p>
          </div>
        </section>

        {/* Right Sidebar - Extras */}
        <aside className="w-full lg:w-96 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          {/* Mind Map Section */}
          <div 
            className="data-card p-6 border-opacity-20"
            style={{ borderColor: branding.primaryColor }}
          >
            <div 
              className="flex items-center gap-3 mb-4"
              style={{ color: branding.secondaryColor }}
            >
              <Network className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Knowledge Map</h2>
            </div>
            <div className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
              <MindMap />
            </div>
            <p className="text-[10px] text-white/40 mt-3 italic leading-relaxed">
              Hover nodes to view technical citations and relationship data.
            </p>
          </div>

          {/* Podcast Section */}
          <div 
            className="data-card p-6 border-opacity-20"
            style={{ borderColor: branding.primaryColor }}
          >
            <div 
              className="flex items-center gap-3 mb-4"
              style={{ color: branding.primaryColor }}
            >
              <Podcast className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Project Podcast</h2>
            </div>
            <div className="space-y-3">
              {[
                { title: "Ep 01: Project Overview", duration: "12:45", date: "" },
                { title: "Ep 02: Coming Soon", duration: "", date: "" },
                { title: "Ep 03: Coming Soon", duration: "", date: "" }
              ].map((p, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 transition-all cursor-pointer group"
                  style={{ borderColor: branding.primaryColor + '20' }}
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white/80 group-hover:text-white" style={{ color: branding.primaryColor }}>{p.title}</span>
                    <span className="text-[9px] font-mono text-white/30 uppercase">{p.date} • {p.duration}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-white/20 group-hover:opacity-100" style={{ color: branding.primaryColor }} />
                </div>
              ))}
            </div>
          </div>

          {/* Pitch Deck Section */}
          <div 
            className="data-card p-6 border-opacity-20"
            style={{ borderColor: branding.primaryColor }}
          >
            <div 
              className="flex items-center gap-3 mb-4"
              style={{ color: branding.secondaryColor }}
            >
              <Presentation className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Pitch Deck</h2>
            </div>
            <div 
              onClick={() => setShowPitchDeck(true)}
              className="relative aspect-video bg-white/5 rounded-lg border border-white/10 flex items-center justify-center group cursor-pointer overflow-hidden"
              style={{ borderColor: branding.primaryColor + '40' }}
            >
              <img 
                src="https://picsum.photos/seed/project-deck/400/225" 
                alt="Pitch Deck Preview" 
                className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <FileText className="w-8 h-8 mb-2" style={{ color: branding.primaryColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest">View Full Deck</span>
              </div>
              <div 
                className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 rounded text-[8px] font-mono uppercase"
                style={{ color: branding.secondaryColor }}
              >
                Phase 1: Regenerative Infrastructure
              </div>
            </div>
          </div>
        </aside>
      </main>

      <AnimatePresence>
        {showPitchDeck && (
          <PitchDeck branding={branding} onClose={() => setShowPitchDeck(false)} />
        )}
      </AnimatePresence>

      <Footer branding={branding} />
    </div>
  );
}
