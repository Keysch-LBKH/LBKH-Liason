import React, { createContext, useContext, useState, useCallback } from 'react';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetId: string; // matches data-tour-id on the element
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Project Liaison',
    description: 'This is the LBKH Solutions Project Liaison — a done-for-you AI-powered community engagement platform. Let\'s take a quick tour of what your clients will experience.',
    targetId: 'tour-header',
    position: 'bottom',
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer & Grounding Notice',
    description: 'This panel explains to the public that all answers are grounded in source material provided by the project team — not speculation. Builds immediate trust.',
    targetId: 'tour-disclaimer',
    position: 'right',
  },
  {
    id: 'chatbot',
    title: 'Live AI Chatbot',
    description: 'This is the heart of the platform. Community members type their questions here and receive instant, cited answers pulled directly from your uploaded documents.',
    targetId: 'tour-chat',
    position: 'top',
  },
  {
    id: 'mindmap',
    title: 'Interactive Mind Map',
    description: 'A visual overview of the project\'s key topics and how they connect. Auto-generated from your source documents. Great for visual learners.',
    targetId: 'tour-mindmap',
    position: 'left',
  },
  {
    id: 'pitchdeck',
    title: 'Embedded Pitch Deck',
    description: 'Your project presentation lives right inside the app. Clients can flip through slides without leaving the portal.',
    targetId: 'tour-pitchdeck',
    position: 'left',
  },
  {
    id: 'podcast',
    title: 'Project Podcast / Media',
    description: 'Link to audio or video content about the project. Keeps community members engaged beyond the chatbot.',
    targetId: 'tour-podcast',
    position: 'left',
  },
  {
    id: 'benchmark',
    title: 'Benchmark Mode',
    description: 'When activated, the AI compares your project against national case studies — turning objections into data-driven rebuttals. This is a powerful tool for skeptical audiences.',
    targetId: 'tour-benchmark',
    position: 'bottom',
  },
  {
    id: 'settings',
    title: 'Source Material & Settings',
    description: 'This area is for your team only — not visible to the public. Upload documents, redact sensitive information, configure branding, and flip the portal live when ready.',
    targetId: 'tour-settings-link',
    position: 'bottom',
  },
];

interface TourContextType {
  isTourActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  isHighlighted: (id: string) => boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = isTourActive ? TOUR_STEPS[currentStepIndex] : null;

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsTourActive(false);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(i => i + 1);
    } else {
      endTour();
    }
  }, [currentStepIndex, endTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  const isHighlighted = useCallback((id: string) => {
    return isTourActive && currentStep?.targetId === id;
  }, [isTourActive, currentStep]);

  return (
    <TourContext.Provider value={{
      isTourActive,
      currentStepIndex,
      currentStep,
      startTour,
      endTour,
      nextStep,
      prevStep,
      goToStep,
      isHighlighted,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
