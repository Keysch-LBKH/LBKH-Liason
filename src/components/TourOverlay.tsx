import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Map } from 'lucide-react';
import { useTour, TOUR_STEPS } from './TourContext';

export function TourOverlay() {
  const { isTourActive, currentStep, currentStepIndex, nextStep, prevStep, endTour, goToStep } = useTour();
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    const target = document.querySelector(`[data-tour-id="${currentStep.targetId}"]`);
    if (!target) return;

    // Scroll target into view smoothly
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    const reposition = () => {
      const rect = target.getBoundingClientRect();
      const tooltipW = tooltipRef.current?.offsetWidth || 340;
      const tooltipH = tooltipRef.current?.offsetHeight || 180;
      const margin = 16;
      const pos = currentStep.position || 'bottom';

      let top = 0;
      let left = 0;

      if (pos === 'bottom') {
        top = rect.bottom + margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
      } else if (pos === 'top') {
        top = rect.top - tooltipH - margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
      } else if (pos === 'right') {
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.right + margin;
      } else if (pos === 'left') {
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left - tooltipW - margin;
      }

      // Clamp to viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      left = Math.max(margin, Math.min(left, vw - tooltipW - margin));
      top = Math.max(margin, Math.min(top, vh - tooltipH - margin));

      setTooltipPos({ top, left });
    };

    // Small delay to let scroll settle
    const timer = setTimeout(reposition, 350);
    window.addEventListener('resize', reposition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', reposition);
    };
  }, [isTourActive, currentStep, currentStepIndex]);

  if (!isTourActive || !currentStep) return null;

  const isLast = currentStepIndex === TOUR_STEPS.length - 1;
  const isFirst = currentStepIndex === 0;

  return (
    <>
      {/* Dim overlay */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.45)' }}
      />

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 8 }}
          transition={{ duration: 0.2 }}
          className="fixed z-50 w-[340px] rounded-2xl border shadow-2xl"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            background: 'rgba(10, 10, 20, 0.97)',
            borderColor: 'rgba(168, 85, 247, 0.5)',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.25), 0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-purple-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400">
                Guided Tour — Step {currentStepIndex + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <button
              onClick={endTour}
              className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-3">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-purple-500 rounded-full"
                animate={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-4 space-y-2">
            <h3 className="text-sm font-black text-white uppercase tracking-tight leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-[12px] text-white/60 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Step dots */}
          <div className="px-5 pb-3 flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === currentStepIndex ? 16 : 6,
                  height: 6,
                  backgroundColor: i === currentStepIndex ? 'rgb(168,85,247)' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="px-5 pb-5 flex items-center justify-between gap-3">
            <button
              onClick={prevStep}
              disabled={isFirst}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/40 hover:text-white hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3 h-3" />
              Back
            </button>
            <button
              onClick={nextStep}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, rgb(168,85,247), rgb(6,182,212))',
                boxShadow: '0 0 20px rgba(168,85,247,0.4)',
              }}
            >
              {isLast ? 'Finish Tour' : 'Next'}
              {!isLast && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// Wrapper component that adds the glowing highlight border to any element
interface TourSpotlightProps {
  tourId: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
}

export function TourSpotlight({ tourId, children, className = '', style = {}, as: Tag = 'div' }: TourSpotlightProps) {
  const { isHighlighted } = useTour();
  const highlighted = isHighlighted(tourId);

  return (
    <Tag
      data-tour-id={tourId}
      className={`${className} transition-all duration-300`}
      style={{
        ...style,
        position: 'relative',
        zIndex: highlighted ? 45 : undefined,
        borderRadius: highlighted ? undefined : undefined,
        outline: highlighted ? '2px solid rgba(168, 85, 247, 0.9)' : undefined,
        boxShadow: highlighted
          ? '0 0 0 4px rgba(168, 85, 247, 0.2), 0 0 40px rgba(168, 85, 247, 0.35)'
          : undefined,
      }}
    >
      {children}
    </Tag>
  );
}

// Floating "Start Tour" button
export function TourLaunchButton() {
  const { isTourActive, startTour, endTour } = useTour();

  return (
    <button
      onClick={isTourActive ? endTour : startTour}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
      style={isTourActive ? {
        background: 'rgba(168,85,247,0.2)',
        borderColor: 'rgba(168,85,247,0.6)',
        color: 'rgb(216,180,254)',
        boxShadow: '0 0 15px rgba(168,85,247,0.3)',
      } : {
        background: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.5)',
      }}
    >
      <Map className="w-3.5 h-3.5" />
      {isTourActive ? 'Exit Tour' : 'Guided Tour'}
    </button>
  );
}
