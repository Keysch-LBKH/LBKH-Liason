import React from 'react';
import { Shield, Clock, Mail, Globe, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from './Footer';

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
  return (
    <div className="flex flex-col h-screen krambu-bg wireframe-grid items-center justify-center p-8 text-center relative overflow-hidden">
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

        {/* Actions */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <button className="w-full md:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3">
            <Mail className="w-4 h-4" />
            Notify Me on Launch
          </button>
          <button className="w-full md:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all flex items-center justify-center gap-3">
            <Globe className="w-4 h-4" />
            Project Website
          </button>
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
    </div>
  );
}
