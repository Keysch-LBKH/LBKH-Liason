import React, { useState, useEffect, useRef } from 'react';
import { Shield, Upload, Link as LinkIcon, FileText, BarChart3, Palette, Globe, Eye, EyeOff, Save, Plus, Trash2, CheckCircle2, Search, Scissors, FlaskConical, ChevronRight, X, Lock, Unlock, Download, Radio, Layout, Zap, MessageCircle, ChevronDown, Palette as PaletteIcon, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Footer } from './Footer';
import { uploadDocument, listDocuments, deleteDocument, R2Document } from '../services/r2Service';

interface Branding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

interface ProjectSettingsProps {
  isLive: boolean;
  setIsLive: (val: boolean) => void;
  branding: Branding;
  setBranding: (branding: Branding) => void;
}

type SiloTab = 'sources' | 'benchmarks' | 'visuals' | 'testing' | 'branding';

interface SourceFile {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'ready' | 'processing' | 'redacted';
  content?: string;
}

export function ProjectSettings({ isLive, setIsLive, branding, setBranding }: ProjectSettingsProps) {
  const [activeTab, setActiveTab] = useState<SiloTab>('sources');
  const [showSaved, setShowSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);
  const [redactionMode, setRedactionMode] = useState(false);
  const [showModeSwitcher, setShowModeSwitcher] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // --- Source Material (company's own internal/public project docs) ---
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);

  // --- Benchmark Sources (oppositional/comparison project docs) ---
  const [benchmarkFiles, setBenchmarkFiles] = useState<SourceFile[]>([]);
  const [benchmarksLoading, setBenchmarksLoading] = useState(false);
  const [benchmarksError, setBenchmarksError] = useState<string | null>(null);
  const benchmarkFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBenchmarkFile, setSelectedBenchmarkFile] = useState<SourceFile | null>(null);

  const mapDocs = (docs: import('../services/r2Service').R2Document[]): SourceFile[] =>
    docs.map((d) => ({
      id: d.key,
      name: d.name,
      type: d.type,
      size: d.size > 0 ? `${(d.size / 1024).toFixed(1)} KB` : '—',
      status: 'ready' as const,
      content: '',
    }));

  // Load both folders from R2 on mount
  useEffect(() => {
    setSourcesLoading(true);
    listDocuments('sources')
      .then((docs) => { setSources(mapDocs(docs)); setSourcesError(null); })
      .catch((err) => setSourcesError(err.message))
      .finally(() => setSourcesLoading(false));

    setBenchmarksLoading(true);
    listDocuments('benchmarks')
      .then((docs) => { setBenchmarkFiles(mapDocs(docs)); setBenchmarksError(null); })
      .catch((err) => setBenchmarksError(err.message))
      .finally(() => setBenchmarksLoading(false));
  }, []);

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSourcesLoading(true);
    try {
      for (const file of files) await uploadDocument(file, 'sources');
      const docs = await listDocuments('sources');
      setSources(mapDocs(docs));
      setSourcesError(null);
    } catch (err: any) {
      setSourcesError(err.message);
    } finally {
      setSourcesLoading(false);
      if (sourceFileInputRef.current) sourceFileInputRef.current.value = '';
    }
  };

  const handleBenchmarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBenchmarksLoading(true);
    try {
      for (const file of files) await uploadDocument(file, 'benchmarks');
      const docs = await listDocuments('benchmarks');
      setBenchmarkFiles(mapDocs(docs));
      setBenchmarksError(null);
    } catch (err: any) {
      setBenchmarksError(err.message);
    } finally {
      setBenchmarksLoading(false);
      if (benchmarkFileInputRef.current) benchmarkFileInputRef.current.value = '';
    }
  };

  const handleDeleteSourceFile = async (key: string) => {
    try {
      await deleteDocument(key);
      setSources((prev) => prev.filter((s) => s.id !== key));
      if (selectedFile?.id === key) setSelectedFile(null);
    } catch (err: any) { setSourcesError(err.message); }
  };

  const handleDeleteBenchmarkFile = async (key: string) => {
    try {
      await deleteDocument(key);
      setBenchmarkFiles((prev) => prev.filter((s) => s.id !== key));
      if (selectedBenchmarkFile?.id === key) setSelectedBenchmarkFile(null);
    } catch (err: any) { setBenchmarksError(err.message); }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      for (const file of sources) await deleteDocument(file.id);
      for (const file of benchmarkFiles) await deleteDocument(file.id);
      setSources([]);
      setBenchmarkFiles([]);
      setSelectedFile(null);
      setSelectedBenchmarkFile(null);
      setIsLive(false);
      setShowResetConfirm(false);
    } catch (err: any) {
      setSourcesError(err.message);
    } finally {
      setResetting(false);
    }
  };

  // (legacy benchmarks table removed — replaced by R2-backed benchmark file silo)

  const [visuals, setVisuals] = useState<{ id: string; name: string; type: 'logo' | 'chart' | 'render' }[]>([
    { id: '1', name: 'Project_Logo.svg', type: 'logo' },
    { id: '2', name: 'Project_Visual.png', type: 'render' }
  ]);

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const filteredSources = sources.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBenchmarkFiles = benchmarkFiles.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleRedact = (fileId: string, wordIndex: number) => {
    if (!redactionMode) return;
    
    setSources(prev => prev.map(file => {
      if (file.id === fileId && file.content) {
        const words = file.content.split(' ');
        const wordToRedact = words[wordIndex];
        words[wordIndex] = "-".repeat(wordToRedact.length);
        return {
          ...file,
          content: words.join(' '),
          status: 'redacted' as const
        };
      }
      return file;
    }));
    
    if (selectedFile?.id === fileId && selectedFile.content) {
      const words = selectedFile.content.split(' ');
      const wordToRedact = words[wordIndex];
      words[wordIndex] = "-".repeat(wordToRedact.length);
      setSelectedFile({
        ...selectedFile,
        content: words.join(' '),
        status: 'redacted'
      });
    }
  };

  return (
    <div className="flex flex-col h-screen krambu-bg wireframe-grid overflow-hidden">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md text-white p-6 border-b border-teal-400/30 flex justify-between items-center shadow-2xl relative z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div 
              className="w-8 h-8 rounded-sm flex items-center justify-center transform rotate-45 transition-transform group-hover:scale-110"
              style={{ 
                background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                boxShadow: `0 0 20px ${branding.primaryColor}40`
              }}
            >
              <Shield className="w-5 h-5 text-white transform -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter uppercase leading-none bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
                {branding.companyName}
              </span>
              {branding.companyName === 'YOUR COMPANY' && (
                <span className="text-[8px] font-mono uppercase tracking-widest text-yellow-400/80">
                  ⚠ Update branding package
                </span>
              )}
              <span 
                className="text-[9px] font-mono uppercase tracking-[0.3em] mt-1"
                style={{ color: branding.secondaryColor }}
              >
                Project Control
              </span>
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
              <Zap className="w-4 h-4" />
              Mode: Develop
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
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left"
                      style={{ 
                        backgroundColor: `${branding.primaryColor}20`,
                        color: branding.primaryColor 
                      }}
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

          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status:</span>
            <button 
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }`}
            >
              {isLive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {isLive ? 'Live' : 'Coming Soon'}
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 text-white px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all hover:opacity-90"
            style={{ 
              backgroundColor: branding.primaryColor,
              boxShadow: `0 0 20px ${branding.primaryColor}40`
            }}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <aside className="w-64 bg-black/40 border-r border-white/10 p-6 flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Management Silos</p>
          {[
            { id: 'sources', label: 'Source Data', icon: Globe },
            { id: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
            { id: 'visuals', label: 'Visual Assets', icon: Palette },
            { id: 'branding', label: 'Brand Identity', icon: Zap },
            { id: 'testing', label: 'Testing Lab', icon: FlaskConical },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SiloTab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'text-white' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
              style={{ 
                backgroundColor: activeTab === tab.id ? branding.primaryColor : undefined,
                boxShadow: activeTab === tab.id ? `0 0 20px ${branding.primaryColor}40` : undefined
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          
          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2">Security Notice</p>
              <p className="text-[10px] text-white/40 leading-relaxed">
                All data in silos is encrypted. Use the redaction tool before enabling public access.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
          {showSaved && (
            <div className="fixed top-24 right-8 z-50 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Silo Data Synchronized</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'sources' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Source Data Silo</h2>
                      <p className="text-sm text-white/40 mt-1 uppercase tracking-widest">Internal & Public Project Documentation</p>
                      <div className="mt-3 p-3 bg-teal-500/5 border border-teal-500/20 rounded-xl max-w-2xl">
                        <p className="text-[11px] text-teal-300/80 leading-relaxed">
                          <span className="font-black uppercase tracking-widest text-teal-400">Purpose: </span>
                          Upload your company’s own internal and public documentation about this project — environmental reports, engineering specs, permits, FAQs, community letters, and any material that accurately represents your project. This is the AI’s primary knowledge base for answering questions and generating visuals. Documents can only be redacted — redaction is permanent and cannot be reversed.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input 
                          type="text"
                          placeholder="Search documents..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-xs text-white focus:outline-none focus:border-teal-400 w-64"
                        />
                      </div>
                      <input ref={sourceFileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" className="hidden" onChange={handleSourceUpload} />
                      <button
                        onClick={() => sourceFileInputRef.current?.click()}
                        disabled={sourcesLoading}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-cyan-500/50 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {sourcesLoading ? 'Uploading...' : 'Upload Source Docs'}
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        disabled={sourcesLoading || resetting}
                        className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        title="Wipe all documents and reset to Coming Soon"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset Demo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-[calc(100vh-250px)]">
                    {/* File List */}
                    <div className="xl:col-span-1 data-card overflow-y-auto border-white/10 p-0">
                      <div className="p-4 border-b border-white/10 bg-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Repository Files ({filteredSources.length})</p>
                      </div>
                      {sourcesError && (
                        <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-[10px] font-mono text-red-400 uppercase tracking-widest">
                          ⚠ {sourcesError}
                        </div>
                      )}
                      {sourcesLoading && sources.length === 0 && (
                        <div className="p-6 text-center text-white/30 text-[10px] font-mono uppercase tracking-widest">
                          Loading from R2...
                        </div>
                      )}
                      {!sourcesLoading && sources.length === 0 && !sourcesError && (
                        <div className="p-6 text-center text-white/20 text-[10px] font-mono uppercase tracking-widest">
                          No source documents yet — upload your project files
                        </div>
                      )}
                      <div className="divide-y divide-white/5">
                        {filteredSources.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            className={`w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-all text-left ${selectedFile?.id === file.id ? 'bg-teal-500/10 border-l-4 border-teal-400' : ''}`}
                          >
                            <div className={`p-2 rounded-lg ${file.status === 'redacted' ? 'bg-red-500/10' : 'bg-cyan-500/10'}`}>
                              <FileText className={`w-5 h-5 ${file.status === 'redacted' ? 'text-red-400' : 'text-cyan-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{file.name}</p>
                              <p className="text-[10px] font-mono text-white/30 uppercase">{file.type} • {file.size}</p>
                            </div>
                            {file.status === 'redacted' && <Lock className="w-3 h-3 text-red-400" />}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSourceFile(file.id); }}
                              className="p-1 text-white/20 hover:text-red-400 transition-colors"
                              title="Delete file"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Document Viewer / Redaction */}
                    <div className="xl:col-span-2 data-card border-white/10 flex flex-col p-0 overflow-hidden">
                      {selectedFile ? (
                        <>
                          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-cyan-400" />
                              <span className="text-xs font-bold text-white uppercase tracking-widest">{selectedFile.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedFile.status === 'redacted' && (
                                <button 
                                  onClick={() => window.location.reload()}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/40 hover:text-white"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Reload
                                </button>
                              )}
                              <button 
                                onClick={() => setRedactionMode(!redactionMode)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  redactionMode ? 'bg-red-600 text-white glow-red' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'
                                }`}
                              >
                                <Scissors className="w-3 h-3" />
                                {redactionMode ? 'Exit Redaction' : 'Redact Mode'}
                              </button>
                              <button className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white">
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="px-4 py-3 bg-red-950/40 border-b border-red-500/30 flex items-start gap-3">
                              <Lock className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-400 leading-relaxed">
                                Permanent Redaction Notice — Redaction destroys the underlying information. It cannot be undone or recovered. To re-introduce redacted material, the original document must be deleted and re-uploaded.
                              </p>
                            </div>

                  {redactionMode && (
                            <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
                              <Scissors className="w-4 h-4 text-red-400" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                                Redaction mode active — click any word to redact it permanently.
                              </p>
                            </div>
                          )}

                          <div className="flex-1 p-8 overflow-y-auto font-mono text-sm leading-relaxed text-white/70 bg-black/20">
                            <div className="max-w-2xl mx-auto flex flex-wrap gap-x-1 gap-y-2">
                              {selectedFile.content?.split(' ').map((word, i) => (
                                <span 
                                  key={i}
                                  onClick={() => handleRedact(selectedFile.id, i)}
                                  className={redactionMode ? 'hover:bg-red-500/20 cursor-crosshair transition-colors px-1 rounded' : ''}
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
                          <FileText className="w-16 h-16 opacity-10" />
                          <p className="text-xs font-black uppercase tracking-[0.2em]">Select a document to view or redact</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'benchmarks' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex-1">
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Benchmark Source Silo</h2>
                      <p className="text-sm text-white/40 mt-1 uppercase tracking-widest">Oppositional & Comparative Project Documentation</p>
                      <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl max-w-3xl">
                        <p className="text-[11px] text-amber-300/80 leading-relaxed">
                          <span className="font-black uppercase tracking-widest text-amber-400">Purpose: </span>
                          Upload documentation from other projects that your community may already have negative experience with — failed developments, environmental violations, broken promises, or poor community engagement. The AI uses these as contrast material: when Benchmark Mode is active, it compares your project’s source data directly against these cases to highlight what makes your project different and better. Together, both data sets power real-time Q&amp;A and visual generation.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="text"
                          placeholder="Search benchmarks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400 w-56"
                        />
                      </div>
                      <input ref={benchmarkFileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" className="hidden" onChange={handleBenchmarkUpload} />
                      <button
                        onClick={() => benchmarkFileInputRef.current?.click()}
                        disabled={benchmarksLoading}
                        className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {benchmarksLoading ? 'Uploading...' : 'Upload Benchmark Docs'}
                      </button>
                    </div>
                  </div>

                  {/* Two-column layout: file list + viewer */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8" style={{ height: 'calc(100vh - 320px)' }}>
                    {/* File List */}
                    <div className="xl:col-span-1 data-card overflow-y-auto border-amber-500/20 p-0">
                      <div className="p-4 border-b border-amber-500/20 bg-amber-500/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Comparison Files ({filteredBenchmarkFiles.length})</p>
                      </div>
                      {benchmarksError && (
                        <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-[10px] font-mono text-red-400 uppercase tracking-widest">
                          ⚠ {benchmarksError}
                        </div>
                      )}
                      {benchmarksLoading && benchmarkFiles.length === 0 && (
                        <div className="p-6 text-center text-white/30 text-[10px] font-mono uppercase tracking-widest">Loading from R2...</div>
                      )}
                      {!benchmarksLoading && benchmarkFiles.length === 0 && !benchmarksError && (
                        <div className="p-6 text-center text-white/20 text-[10px] font-mono uppercase tracking-widest leading-relaxed">
                          No benchmark documents yet — upload comparison project files to enable contrast analysis
                        </div>
                      )}
                      <div className="divide-y divide-white/5">
                        {filteredBenchmarkFiles.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => setSelectedBenchmarkFile(file)}
                            className={`w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-all text-left ${
                              selectedBenchmarkFile?.id === file.id ? 'bg-amber-500/10 border-l-4 border-amber-400' : ''
                            }`}
                          >
                            <div className="p-2 rounded-lg bg-amber-500/10">
                              <FileText className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{file.name}</p>
                              <p className="text-[10px] font-mono text-white/30 uppercase">{file.type} • {file.size}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteBenchmarkFile(file.id); }}
                              className="p-1 text-white/20 hover:text-red-400 transition-colors"
                              title="Delete benchmark file"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Viewer / Info Panel */}
                    <div className="xl:col-span-2 data-card border-amber-500/20 flex flex-col p-0 overflow-hidden">
                      {selectedBenchmarkFile ? (
                        <>
                          <div className="p-4 border-b border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
                            <FileText className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-widest">{selectedBenchmarkFile.name}</span>
                            <span className="ml-auto text-[9px] font-mono text-amber-400/60 uppercase tracking-widest">Benchmark / Comparison</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 p-8">
                            <BarChart3 className="w-16 h-16 opacity-10" />
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-center">{selectedBenchmarkFile.name}</p>
                            <p className="text-[10px] font-mono text-white/30 text-center max-w-sm leading-relaxed">
                              This document is indexed as comparison material. When Benchmark Mode is active in the Chat Liaison, the AI will reference it to contrast against your source documents.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 p-8">
                          <BarChart3 className="w-16 h-16 opacity-10" />
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-center">Select a benchmark document to preview</p>
                          <p className="text-[10px] font-mono text-white/30 text-center max-w-sm leading-relaxed">
                            Benchmark documents are used by the AI to compare and contrast against your source material during live Q&amp;A and visual generation.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'visuals' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Visual Assets Silo</h2>
                    <p className="text-sm text-white/40 mt-1 uppercase tracking-widest">Branding, Renders & Technical Diagrams</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {visuals.map((v) => (
                      <div key={v.id} className="data-card p-0 border-white/10 group overflow-hidden aspect-square flex flex-col">
                        <div className="flex-1 bg-white/5 flex items-center justify-center relative">
                          {v.type === 'logo' ? (
                            <Shield className="w-16 h-16 text-teal-400/40" />
                          ) : (
                            <Globe className="w-16 h-16 text-cyan-500/40" />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button className="p-2 bg-white/10 rounded-lg hover:bg-red-500/40 text-white">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-3 border-t border-white/10 bg-black/40">
                          <p className="text-[10px] font-bold text-white truncate uppercase tracking-widest">{v.name}</p>
                          <p className="text-[8px] font-mono text-white/30 uppercase mt-1">{v.type}</p>
                        </div>
                      </div>
                    ))}
                    <button className="data-card border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-teal-400/50 hover:bg-white/5 transition-all group aspect-square">
                      <Upload className="w-8 h-8 text-white/10 group-hover:text-teal-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white">Upload Asset</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'branding' && (
              <div className="space-y-8 max-w-2xl">
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white">Brand Identity</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest">Configure project-specific branding for the pitch</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Project Logo</label>
                    <div className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center group hover:border-teal-400/50 transition-colors cursor-pointer relative overflow-hidden">
                      {branding.logo ? (
                        <img src={branding.logo} alt="Project Logo" className="max-h-full object-contain" />
                      ) : (
                        <>
                          <div className="p-4 bg-white/5 rounded-full mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-white/20" />
                          </div>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Drop logo here or click to upload</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Color Configuration */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Company Name</label>
                      <input 
                        type="text" 
                        value={branding.companyName}
                        onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-400/50 transition-colors"
                        placeholder="e.g. YOUR COMPANY"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Primary Brand Color</label>
                      <div className="flex gap-3">
                        <input 
                          type="color" 
                          value={branding.primaryColor}
                          onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={branding.primaryColor}
                          onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Secondary Accent Color</label>
                      <div className="flex gap-3">
                        <input 
                          type="color" 
                          value={branding.secondaryColor}
                          onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={branding.secondaryColor}
                          onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-teal-500/10 border border-teal-400/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3 text-teal-300">
                    <PaletteIcon className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Branding Preview</h3>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black"
                      style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
                    >
                      {branding.companyName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tighter">{branding.companyName}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest">Project Liaison</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'testing' && (
                <div className="space-y-8 h-full flex flex-col">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Client Testing Lab</h2>
                    <p className="text-sm text-white/40 mt-1 uppercase tracking-widest">Sandbox Environment for Liaison Verification</p>
                  </div>

                  <div className="flex-1 data-card border-teal-400/20 bg-black/40 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Isolated Sandbox Instance</span>
                      </div>
                      <button className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Reset Session</button>
                    </div>
                    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-6">
                      <FlaskConical className="w-16 h-16 text-teal-400/20" />
                      <div className="max-w-md space-y-4">
                        <h3 className="text-lg font-black uppercase tracking-widest text-white">Ready for Testing</h3>
                        <p className="text-sm text-white/40 leading-relaxed">
                          This sandbox uses the current silo data (Source, Benchmarks, Visuals) to simulate the public Liaison experience. Test your redactions and data grounding here.
                        </p>
                        <button className="px-8 py-3 bg-teal-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest glow-cyan hover:bg-teal-400 transition-all">
                          Launch Sandbox Session
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {/* Reset Demo Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-950 border border-red-500/40 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <RotateCcw className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Reset Demo</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">This action cannot be undone</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <p className="text-sm text-white/70 leading-relaxed">
                  This will permanently delete all uploaded documents from R2 storage and set the app back to <span className="text-orange-400 font-bold">Coming Soon</span> mode.
                </p>
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 leading-relaxed">
                    ⚠ All source documents, redactions, and grounding data will be wiped. The AI will have no knowledge base until new documents are uploaded.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetDemo}
                  disabled={resetting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-500 transition-all disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset Demo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer branding={branding} />
    </div>
  );
}
