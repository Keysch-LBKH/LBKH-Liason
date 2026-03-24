import React, { useState, useEffect, useRef } from 'react';
import { Shield, MessageSquare, QrCode, TrendingUp, Users, Radio, Send, Phone, Download, Play, Mic, Activity, ChevronRight, Search, CheckCircle2, Zap, Layout, MessageCircle, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { krambuService } from '../services/krambuService';
import { Footer } from './Footer';

interface Branding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

interface LiveEventProps {
  branding: Branding;
}

interface SMSQuestion {
  id: string;
  phone: string;
  text: string;
  timestamp: Date;
  status: 'queued' | 'processing' | 'answered';
  answer?: string;
}

interface Topic {
  name: string;
  count: number;
  color: string;
}

export function LiveEvent({ branding }: LiveEventProps) {
  const [questions, setQuestions] = useState<SMSQuestion[]>([
    { id: '1', phone: '406-XXX-1234', text: 'How will the cooling system affect the Blackfoot River?', timestamp: new Date(), status: 'answered', answer: 'The system is 100% closed-loop and secondary-contained, meaning zero industrial discharge into the river or ground.' },
    { id: '2', phone: '406-XXX-5678', text: 'What about the noise levels for the school across the street?', timestamp: new Date(), status: 'processing' },
    { id: '3', phone: '406-XXX-9012', text: 'Will my property taxes go down?', timestamp: new Date(), status: 'queued' },
  ]);

  const [topics, setTopics] = useState<Topic[]>([
    { name: 'Water Usage', count: 45, color: '#22d3ee' },
    { name: 'Noise Pollution', count: 32, color: '#a855f7' },
    { name: 'Grid Stability', count: 28, color: '#f59e0b' },
    { name: 'Local Jobs', count: 15, color: '#10b981' },
    { name: 'Property Value', count: 12, color: '#ef4444' },
  ]);

  const [isRecordingRequested, setIsRecordingRequested] = useState(false);
  const [showModeSwitcher, setShowModeSwitcher] = useState(false);
  const navigate = useNavigate();
  const heatmapRef = useRef<SVGSVGElement>(null);

  // Simulate incoming questions
  useEffect(() => {
    const interval = setInterval(() => {
      const newQuestion: SMSQuestion = {
        id: Math.random().toString(36).substr(2, 9),
        phone: `406-XXX-${Math.floor(1000 + Math.random() * 9000)}`,
        text: 'Simulated community question about ' + topics[Math.floor(Math.random() * topics.length)].name,
        timestamp: new Date(),
        status: 'queued'
      };
      setQuestions(prev => [newQuestion, ...prev].slice(0, 20));
      
      // Update topics
      setTopics(prev => prev.map(t => {
        if (newQuestion.text.includes(t.name)) {
          return { ...t, count: t.count + 1 };
        }
        return t;
      }));
    }, 15000);

    return () => clearInterval(interval);
  }, [topics]);

  // D3 Heatmap Logic
  useEffect(() => {
    if (!heatmapRef.current) return;

    const svg = d3.select(heatmapRef.current);
    svg.selectAll('*').remove();

    const width = 400;
    const height = 400;

    const pack = d3.pack<Topic>()
      .size([width, height])
      .padding(10);

    const root = d3.hierarchy({ children: topics } as any)
      .sum((d: any) => d.count);

    const nodes = pack(root as any).leaves();

    const leaf = svg.selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    leaf.append('circle')
      .attr('r', d => d.r)
      .attr('fill', (d: any) => d.data.color)
      .attr('fill-opacity', 0.2)
      .attr('stroke', (d: any) => d.data.color)
      .attr('stroke-width', 2)
      .attr('class', 'animate-pulse');

    leaf.append('text')
      .attr('dy', '.3em')
      .style('text-anchor', 'middle')
      .style('font-size', d => Math.min(d.r / 3, 12) + 'px')
      .style('font-weight', '900')
      .style('fill', 'white')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.1em')
      .text((d: any) => d.data.name);

    leaf.append('text')
      .attr('dy', '1.5em')
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', 'white')
      .style('opacity', 0.5)
      .text((d: any) => d.data.count + ' Qs');

  }, [topics]);

  const handleRequestRecording = () => {
    setIsRecordingRequested(true);
    setTimeout(() => setIsRecordingRequested(false), 5000);
  };

  return (
    <div className="flex flex-col h-screen krambu-bg wireframe-grid overflow-hidden">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md text-white p-6 border-b border-purple-500/30 flex justify-between items-center shadow-2xl relative z-20">
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
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-[0.3em] mt-1">Live Event Liaison</span>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Mode Switcher Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowModeSwitcher(!showModeSwitcher)}
              className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all group hover:bg-white/10"
              style={{ color: branding.primaryColor }}
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Mode: Live
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
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left"
                      style={{ 
                        backgroundColor: `${branding.primaryColor}20`,
                        color: branding.primaryColor 
                      }}
                    >
                      <Radio className="w-4 h-4" />
                      Live Event
                    </button>
                    <button 
                      onClick={() => { navigate('/'); setShowModeSwitcher(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest text-left transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat Liaison
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/settings" className="text-white/40 hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: QR & Queue */}
        <aside 
          className="w-96 border-r flex flex-col overflow-hidden"
          style={{ 
            backgroundColor: `${branding.primaryColor}05`,
            borderColor: `${branding.primaryColor}20`
          }}
        >
          {/* QR Code Section */}
          <div 
            className="p-8 border-b text-center space-y-6"
            style={{ 
              backgroundColor: `${branding.primaryColor}05`,
              borderColor: `${branding.primaryColor}20`
            }}
          >
            <div className="inline-block p-4 bg-white rounded-2xl shadow-2xl glow-white">
              <QRCodeSVG 
                value="sms:+14065550199?body=I have a question about..." 
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Scan to Ask</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Text your question to</p>
              <p 
                className="text-lg font-mono font-black tracking-tighter"
                style={{ color: branding.secondaryColor }}
              >
                (406) 555-0199
              </p>
            </div>
          </div>

          {/* Incoming Queue */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div 
              className="p-4 border-b sticky top-0 backdrop-blur-sm z-10 flex justify-between items-center"
              style={{ 
                backgroundColor: `${branding.primaryColor}10`,
                borderColor: `${branding.primaryColor}20`
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Live Question Queue</span>
              <span 
                className="text-[10px] font-mono"
                style={{ color: branding.secondaryColor }}
              >
                {questions.length} Active
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {questions.map((q) => (
                <div key={q.id} className="p-4 space-y-2 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-white/30">{q.phone}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      q.status === 'answered' ? 'bg-emerald-500/20 text-emerald-400' :
                      q.status === 'processing' ? 'bg-purple-500/20 text-purple-400 animate-pulse' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">{q.text}</p>
                  {q.answer && (
                    <div 
                      className="mt-2 p-3 bg-opacity-10 border-l-2 rounded-sm"
                      style={{ 
                        backgroundColor: branding.primaryColor,
                        borderColor: branding.primaryColor 
                      }}
                    >
                      <p className="text-[10px] italic" style={{ color: branding.primaryColor }}>"{q.answer}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Panel: Heatmap & AI Work Area */}
        <main 
          className="flex-1 flex flex-col overflow-hidden relative"
          style={{ backgroundColor: `${branding.primaryColor}02` }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Topic Heatmap */}
            <div 
              className="p-8 border-r flex flex-col items-center justify-center space-y-8"
              style={{ 
                backgroundColor: `${branding.primaryColor}03`,
                borderColor: `${branding.primaryColor}20`
              }}
            >
              <div className="text-center space-y-2">
                <div 
                  className="flex items-center justify-center gap-3"
                  style={{ color: branding.primaryColor }}
                >
                  <TrendingUp className="w-6 h-6" />
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Topic Heatmap</h2>
                </div>
                <p 
                  className="text-xs uppercase tracking-widest"
                  style={{ color: `${branding.primaryColor}60` }}
                >
                  Real-time Community Interest Analysis
                </p>
              </div>
              
              <div className="relative w-full max-w-[400px] aspect-square">
                <svg ref={heatmapRef} width="400" height="400" className="w-full h-full" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div 
                    className="w-full h-full border rounded-full animate-ping opacity-20" 
                    style={{ borderColor: branding.primaryColor }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                {topics.map(t => (
                  <div 
                    key={t.name} 
                    className="flex items-center gap-3 p-3 bg-white/5 border rounded-xl"
                    style={{ borderColor: `${branding.primaryColor}20` }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white truncate">{t.name}</p>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ backgroundColor: t.color, width: `${(t.count / 50) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Liaison Work Area */}
            <div 
              className="p-8 flex flex-col space-y-8"
              style={{ backgroundColor: `${branding.primaryColor}05` }}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div 
                    className="flex items-center gap-3"
                    style={{ color: branding.primaryColor }}
                  >
                    <Activity className="w-6 h-6" />
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Liaison Engine</h2>
                  </div>
                  <p 
                    className="text-xs uppercase tracking-widest"
                    style={{ color: `${branding.primaryColor}60` }}
                  >
                    Processing Hot Topics & Generating Answers
                  </p>
                </div>
                <div 
                  className="p-3 bg-opacity-20 border rounded-xl"
                  style={{ 
                    backgroundColor: branding.primaryColor,
                    borderColor: branding.primaryColor 
                  }}
                >
                  <Activity 
                    className="w-6 h-6 animate-pulse"
                    style={{ color: branding.primaryColor }}
                  />
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-4">
                <div 
                  className="data-card p-6 border-opacity-30 space-y-4"
                  style={{ 
                    borderColor: `${branding.primaryColor}40`,
                    backgroundColor: `${branding.primaryColor}10`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 bg-opacity-20 rounded-lg"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      <Search className="w-4 h-4" style={{ color: branding.primaryColor }} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Current Focus: Water Usage</h3>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed italic">
                    "Analyzing community concerns regarding the Blackfoot River. Cross-referencing technical specifications MT-BNR-2026-041..."
                  </p>
                  <div className="space-y-2">
                    <div 
                      className="flex justify-between text-[10px] font-mono uppercase"
                      style={{ color: `${branding.primaryColor}60` }}
                    >
                      <span>Grounding Verification</span>
                      <span>85%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        className="h-full"
                        style={{ 
                          backgroundColor: branding.primaryColor,
                          boxShadow: `0 0 10px ${branding.primaryColor}`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p 
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: `${branding.primaryColor}60` }}
                  >
                    Latest Generated Answers
                  </p>
                  {[
                    { topic: 'Noise Levels', answer: 'Krambu uses liquid cooling and multi-stage rubber dampeners, reducing noise to 36 dBA (whisper-level) at 1000 feet.' },
                    { topic: 'Grid Impact', answer: 'Krambu utilizes a direct PPA with Energy Keepers and an on-site BESS (Battery) system to "peak-shave," protecting the local residential grid.' }
                  ].map((a, i) => (
                    <div 
                      key={i} 
                      className="data-card p-4 space-y-2"
                      style={{ borderColor: `${branding.primaryColor}20` }}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" style={{ color: branding.primaryColor }} />
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: branding.primaryColor }}>{a.topic} Verified</span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">{a.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div 
                className="pt-6 border-t"
                style={{ borderColor: `${branding.primaryColor}20` }}
              >
                <div 
                  className="data-card p-6 border-opacity-30 bg-opacity-5 space-y-4"
                  style={{ 
                    borderColor: branding.secondaryColor,
                    backgroundColor: `${branding.secondaryColor}10`
                  }}
                >
                  <div 
                    className="flex items-center gap-3"
                    style={{ color: branding.secondaryColor }}
                  >
                    <Download className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Event Summary & Bot Access</h3>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Text your number to <span className="font-bold" style={{ color: branding.secondaryColor }}>(406) 555-0199</span> to receive a full recording of all answers generated during this event, plus permanent access to the AI Liaison.
                  </p>
                  <button 
                    onClick={handleRequestRecording}
                    disabled={isRecordingRequested}
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      isRecordingRequested 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'text-white hover:opacity-90'
                    }`}
                    style={{ 
                      backgroundColor: !isRecordingRequested ? branding.secondaryColor : undefined,
                      boxShadow: !isRecordingRequested ? `0 0 20px ${branding.secondaryColor}40` : undefined
                    }}
                  >
                    {isRecordingRequested ? (
                      <div className="flex items-center justify-center gap-2" style={{ color: branding.primaryColor }}>
                        <CheckCircle2 className="w-4 h-4" />
                        Request Sent
                      </div>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        Request Event Recording
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer branding={branding} />
    </div>
  );
}
