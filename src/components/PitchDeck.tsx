import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Shield, Zap, Droplets, Thermometer, Leaf, Volume2, Users, TrendingUp, Cpu } from 'lucide-react';

interface Slide {
  title: string;
  subtitle: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  image: string;
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

interface Branding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

export function PitchDeck({ branding, onClose }: { branding: Branding, onClose: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      title: `${branding.companyName} Project`,
      subtitle: "Project Overview",
      icon: <Shield className="w-8 h-8" style={{ color: branding.primaryColor }} />,
      image: "https://picsum.photos/seed/northwest-mountains-1/1200/800",
      content: (
        <div className="space-y-4">
          <p className="text-xl text-white/80 leading-relaxed">
            Configure your pitch deck content by uploading project documents in the Settings panel.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="block text-2xl font-black" style={{ color: branding.primaryColor }}>—</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Key Metric 1</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="block text-2xl font-black" style={{ color: branding.secondaryColor }}>—</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Key Metric 2</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Vision",
      subtitle: "Industrial Revitalization",
      icon: <TrendingUp className="w-8 h-8" style={{ color: branding.secondaryColor }} />,
      image: "https://picsum.photos/seed/project-vision-1/1200/800",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-white/70">
            Describe the vision and long-term goals of your project here. Upload your documents in Settings to populate this content.
          </p>
          <ul className="space-y-3 mt-6">
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
              Cleanup of legacy industrial sites
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
              High-paying engineering & HVAC roles
            </li>
            <li className="flex items-center gap-3 text-sm text-white/90">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
              150+ local trade jobs during setup
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "The Magic Loop",
      subtitle: "Closed-Loop Cooling",
      icon: <Droplets className="w-8 h-8 text-blue-500" />,
      image: "https://picsum.photos/seed/cooling-pipes-1/1200/800",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-white/70">
            Imagine a giant reusable water balloon that never pops. Water stays trapped in sealed pipes forever.
          </p>
          <div className="grid grid-cols-1 gap-3 mt-6">
            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: branding.secondaryColor }} />
              <div>
                <p className="text-sm font-bold text-white">The Radiator Effect</p>
                <p className="text-[10px] text-white/40">Liquid soaks up heat from chips and releases it outside via fans.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: branding.secondaryColor }} />
              <div>
                <p className="text-sm font-bold text-white">No "Drinking" from the City</p>
                <p className="text-[10px] text-white/40">We fill the pipes once and reuse the same water indefinitely.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Net-Zero Water",
      subtitle: "Environmental Commitment",
      icon: <Droplets className="w-8 h-8" style={{ color: branding.secondaryColor }} />,
      image: "https://picsum.photos/seed/montana-river-1/1200/800",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-white/70">
            Our facility is designed with environmental responsibility at its core. Upload your project documents to populate specific details.
          </p>
          <div className="grid grid-cols-1 gap-3 mt-6">
            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: branding.secondaryColor }} />
              <div>
                <p className="text-sm font-bold text-white">Zero Discharge</p>
                <p className="text-[10px] text-white/40">No industrial wastewater is released into the environment.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: branding.secondaryColor }} />
              <div>
                <p className="text-sm font-bold text-white">Rainwater Harvesting</p>
                <p className="text-[10px] text-white/40">We use captured rainwater for non-critical facility needs.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Quiet Operations",
      subtitle: "Noise Mitigation",
      icon: <Volume2 className="w-8 h-8" style={{ color: branding.primaryColor }} />,
      image: "https://picsum.photos/seed/sound-barrier-1/1200/800",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-white/70">
            Advanced engineering ensures the facility remains a responsible neighbor to the surrounding community.
          </p>
          <div className="grid grid-cols-1 gap-3 mt-6">
            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: branding.secondaryColor }} />
              <div>
                <p className="text-sm font-bold text-white">Acoustic Enclosures</p>
                <p className="text-[10px] text-white/40">All high-noise equipment is housed in sound-dampening structures.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: branding.secondaryColor }} />
              <div>
                <p className="text-sm font-bold text-white">Strategic Landscaping</p>
                <p className="text-[10px] text-white/40">Natural berms and vegetation act as additional sound barriers.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Community Growth",
      subtitle: "Economic Impact",
      icon: <Users className="w-8 h-8" style={{ color: branding.secondaryColor }} />,
      image: "https://picsum.photos/seed/community-center-1/1200/800",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-white/70">
            The project brings long-term economic stability and investment to the local area.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="block text-2xl font-black" style={{ color: branding.primaryColor }}>$2M+</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Annual Tax Revenue</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="block text-2xl font-black" style={{ color: branding.secondaryColor }}>50+</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Permanent Local Jobs</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Future",
      subtitle: "Phase 2 & Beyond",
      icon: <Cpu className="w-8 h-8" style={{ color: branding.primaryColor }} />,
      image: "https://picsum.photos/seed/future-tech-1/1200/800",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-white/70">
            {branding.companyName} is committed to being a cornerstone of the community's technological and economic future.
          </p>
          <div className="mt-12 flex justify-center">
            <div 
              className="w-24 h-1 rounded-full glow-purple" 
              style={{ background: `linear-gradient(to right, ${branding.primaryColor}, ${branding.secondaryColor})` }}
            />
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-8"
    >
      <div className="relative w-full max-w-6xl aspect-[16/9] bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(147,51,234,0.2)] flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Branding Header */}
        <div className="absolute top-8 left-8 z-10 flex items-center gap-4">
          {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <div 
              className="w-8 h-8 rounded-sm flex items-center justify-center transform rotate-45 glow-purple"
              style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
            >
              <Shield className="w-5 h-5 text-white transform -rotate-45" />
            </div>
          )}
          <div className="flex flex-col">
            <span 
              className="text-xl font-black tracking-tighter uppercase leading-none bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(to right, white, ${branding.primaryColor})` }}
            >
              {branding.companyName}
            </span>
            <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-[0.3em] mt-1">Pitch Deck</span>
          </div>
        </div>

        {/* Left Side: Image */}
        <div className="relative w-full md:w-1/2 h-1/2 md:h-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              src={slides[currentSlide].image}
              alt={slides[currentSlide].title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#050505]" />
          
          {/* Slide Indicator */}
          <div className="absolute bottom-8 left-8 flex gap-2">
            {slides.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1 transition-all duration-300 rounded-full",
                  idx === currentSlide ? "w-8" : "w-2 bg-white/20"
                )}
                style={{ backgroundColor: idx === currentSlide ? branding.primaryColor : undefined }}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full p-8 md:p-16 flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                  {slides[currentSlide].icon}
                </div>
                <div>
                  <h3 
                    className="text-[10px] font-black uppercase tracking-[0.4em]"
                    style={{ color: branding.primaryColor }}
                  >
                    {slides[currentSlide].subtitle}
                  </h3>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
                    {slides[currentSlide].title}
                  </h2>
                </div>
              </div>

              <div className="min-h-[200px]">
                {slides[currentSlide].content}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Back to Main Button */}
          <button 
            onClick={onClose}
            className="absolute bottom-8 left-8 hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Exit Presentation
          </button>

          {/* Navigation */}
          <div className="absolute bottom-8 right-8 flex gap-4">
            <button 
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ borderColor: currentSlide !== 0 ? branding.primaryColor : undefined }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="p-4 border rounded-2xl text-white transition-all glow-purple disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: branding.primaryColor,
                borderColor: branding.primaryColor,
                boxShadow: `0 0 20px ${branding.primaryColor}40`
              }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Page Number */}
          <div className="absolute top-8 left-8 md:left-auto md:right-8 text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">
            Slide {String(currentSlide + 1).padStart(2, '0')} / {slides.length}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
