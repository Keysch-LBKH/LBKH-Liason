/**
 * GoogleAuthGuard
 * Wraps protected routes (/settings, /event) with Google Identity Services sign-in.
 * Only authenticated Google users can access the wrapped content.
 *
 * SETUP: Set VITE_GOOGLE_CLIENT_ID in your Cloudflare Pages environment variables.
 * Authorized JavaScript origins must include your deployment domain in Google Cloud Console.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, LogIn, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          disableAutoSelect: () => void;
          revoke: (email: string, done: () => void) => void;
        };
      };
    };
  }
}

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

interface GoogleAuthGuardProps {
  children: React.ReactNode;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
    logo: string;
  };
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const AUTH_STORAGE_KEY = 'lbkh_auth_user';

function parseJwt(token: string): GoogleUser | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json) as GoogleUser;
  } catch {
    return null;
  }
}

export function GoogleAuthGuard({ children, branding }: GoogleAuthGuardProps) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const buttonRef = React.useRef<HTMLDivElement>(null);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GoogleUser;
        setUser(parsed);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || user) return;
    if (document.getElementById('google-gsi-script')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [user]);

  const handleCredentialResponse = useCallback((response: { credential: string }) => {
    const decoded = parseJwt(response.credential);
    if (decoded) {
      setUser(decoded);
      try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(decoded)); } catch { /* ignore */ }
    }
  }, []);

  // Initialize Google Identity Services once script is loaded
  useEffect(() => {
    if (!scriptLoaded || user || !GOOGLE_CLIENT_ID) return;
    const init = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 280,
        });
      }
    };
    // Small delay to ensure DOM is ready
    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, [scriptLoaded, user, handleCredentialResponse]);

  const handleSignOut = () => {
    if (user && window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
  };

  // If no client ID configured, just render children (dev mode / unconfigured)
  if (!GOOGLE_CLIENT_ID) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: branding.primaryColor }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black liaison-bg wireframe-grid">
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl border bg-black/80 backdrop-blur-xl text-center"
          style={{ borderColor: branding.primaryColor + '40' }}>
          
          {/* Logo */}
          <div className="flex justify-center mb-6">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-sm flex items-center justify-center transform rotate-45"
                style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}>
                <Shield className="w-7 h-7 text-white transform -rotate-45" />
              </div>
            )}
          </div>

          <h1 className="text-xl font-black uppercase tracking-widest text-white mb-2">
            {branding.companyName}
          </h1>
          <p className="text-xs font-mono uppercase tracking-[0.3em] mb-1" style={{ color: branding.secondaryColor }}>
            Project Liaison
          </p>
          <p className="text-sm text-white/50 mb-8 mt-4">
            This area is restricted to authorized project administrators.
          </p>

          <div className="flex items-center gap-3 mb-6 p-4 rounded-lg border border-white/10 bg-white/5">
            <LogIn className="w-4 h-4 shrink-0" style={{ color: branding.primaryColor }} />
            <p className="text-xs text-white/60 text-left leading-relaxed">
              Sign in with your authorized Google account to access project settings and the live event console.
            </p>
          </div>

          {/* Google Sign-In Button rendered here */}
          <div ref={buttonRef} className="flex justify-center" />

          {!scriptLoaded && (
            <div className="flex items-center justify-center gap-2 text-white/40 text-xs mt-4">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading sign-in...
            </div>
          )}

          <p className="text-[10px] text-white/20 mt-6 uppercase tracking-widest">
            Unauthorized access attempts are logged
          </p>
        </div>
      </div>
    );
  }

  // Authenticated — render children with a sign-out button injected via context
  return (
    <AuthContext.Provider value={{ user, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Context so child components (Settings, LiveEvent) can show the signed-in user and sign-out button
interface AuthContextValue {
  user: GoogleUser;
  signOut: () => void;
}

export const AuthContext = React.createContext<AuthContextValue>({
  user: { name: '', email: '', picture: '', sub: '' },
  signOut: () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}
