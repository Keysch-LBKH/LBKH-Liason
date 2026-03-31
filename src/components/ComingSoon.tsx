import React, { useState } from 'react';
import { Shield, Clock, Mail, Globe, Settings, Play, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from './Footer';

const QUIZ_URL = 'https://corporate.lbkh.solutions/quiz';
const VIDEO_ID = 'M-GRWRxEEpw';

interface Branding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

interface ComingSoonProps {
  branding: Branding;
}

export function ComingSoon({ branding }: ComingSoonProps) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen liaison-bg wireframe-grid items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Background Glows */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse"
        style={{ backgroundColor: `${branding.primaryColor}33` }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[80px]"
        style={{ backgroundColor: `${branding.secondaryColor}1a` }}
      />

      <div className="relative z-10 max-w-2xl space-y-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="w-16 h-16 object-contain" />
          ) : (
            <div 
              className="w-16 h-16 rounded-sm flex items-center justify-center transform rotate-45 glow-purple"
              style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
            >
              <Shield className="w-10 h-10 text-white transform -rotate-45" />
            </div>
          )}
          <div className="flex flex-col items-center">
            <h1 
              className="text-6xl font-black tracking-tighter uppercase leading-none bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, white, ${branding.primaryColor})` }}
            >
              {branding.companyName}
            </h1>
            {branding.companyName === 'YOUR COMPANY' && (
              <p className="text-[10px] font-mono uppercase tracking-widest mt-2 px-3 py-1 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-400/80">
                ⚠ Update your branding package in the Control Panel
              </p>
            )}
            <span 
              className="text-xs font-mono uppercase tracking-[0.5em] mt-4"
              style={{ color: branding.secondaryColor }}
            >
              Project Liaison
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-white/60">
            <Clock className="w-4 h-4" style={{ color: branding.primaryColor }} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Status: System Initializing</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-tight">
            Project Liaison <br />
            <span 
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: `linear-gradient(to right, ${branding.primaryColor}, ${branding.secondaryColor})` }}
            >
              Coming Soon
            </span>
          </h1>
          <p className="text-lg text-white/40 leading-relaxed max-w-lg mx-auto">
            This project portal is currently under configuration. Upload your source documents and configure branding in the Control Panel before going live.
          </p>
        </div>

        {/* Watch Video + Quiz CTA */}
        <div className="flex flex-col items-center gap-4">
          {/* Primary: Watch the Video */}
          <button
            onClick={() => setVideoOpen(true)}
            className="group relative w-full md:w-auto px-10 py-5 rounded-2xl text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
              boxShadow: `0 0 40px ${branding.primaryColor}50`,
            }}
          >
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300 rounded-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-white">Watch the Video</span>
            </div>
          </button>

          {/* Secondary: Take the Quiz */}
          <a
            href={QUIZ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all"
            style={{ color: `${branding.primaryColor}99` }}
          >
            <span className="group-hover:text-white transition-colors" style={{ color: 'inherit' }}>See If Liaison Is a Fit for Your Project</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Tertiary: existing buttons */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 pt-2">
            <button className="w-full md:w-auto px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              Notify Me on Launch
            </button>
            <button className="w-full md:w-auto px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all flex items-center justify-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Project Website
            </button>
          </div>
        </div>

        {/* Admin Link (More prominent for development) */}
        <div className="pt-12">
          <Link 
            to="/settings" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
            style={{ 
              color: branding.primaryColor,
              borderColor: `${branding.primaryColor}4d`,
              boxShadow: `0 0 20px ${branding.primaryColor}26`
            }}
          >
            <Settings className="w-4 h-4" />
            Access Project Control Panel
          </Link>
          <p className="text-[9px] font-mono text-white/20 mt-4 uppercase tracking-widest">
            Authorized Personnel Only • Secure Session Required
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0">
        <Footer branding={branding} />
      </div>

      {/* Video Modal */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
            style={{ boxShadow: `0 0 80px ${branding.primaryColor}40` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: `linear-gradient(135deg, ${branding.primaryColor}22, ${branding.secondaryColor}11)`, borderBottom: `1px solid ${branding.primaryColor}30` }}
            >
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5" style={{ color: branding.primaryColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">LBKH Liaison — Overview</span>
              </div>
              <button
                onClick={() => setVideoOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* YouTube embed */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                title="LBKH Liaison Overview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Post-video CTA */}
            <div
              className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ background: '#050505', borderTop: `1px solid ${branding.primaryColor}20` }}
            >
              <p className="text-[11px] text-white/50 uppercase tracking-widest">Ready to see if Liaison fits your project?</p>
              <a
                href={QUIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                style={{
                  background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                  color: '#000',
                  boxShadow: `0 0 20px ${branding.primaryColor}40`,
                }}
              >
                Take the Fit Quiz
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
