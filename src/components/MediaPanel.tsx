/**
 * MediaPanel
 * Displays uploaded visual, audio, and video assets as long horizontal buttons.
 * Audio plays inline. Video and images open a full preview modal.
 *
 * Assets are loaded from R2 via the authenticated worker.
 * The panel is collapsible — click the header to open/close.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Image, FileAudio, Video, Play, Pause, ExternalLink,
  Loader2, Layers, X, ChevronDown, ChevronUp,
} from 'lucide-react';

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string;
const UPLOAD_SECRET = import.meta.env.VITE_R2_UPLOAD_SECRET as string;
const BUCKET = import.meta.env.VITE_R2_BUCKET as string;

interface MediaAsset {
  key: string;
  name: string;
  displayName: string;
  assetType: 'visual' | 'audio' | 'video';
  size: number;
  url?: string;
}

interface MediaPanelProps {
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
}

/** Derive asset type from file extension when metadata is missing */
function inferAssetType(name: string): 'visual' | 'audio' | 'video' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  return 'visual';
}

function getAssetIcon(type: 'visual' | 'audio' | 'video') {
  if (type === 'audio') return FileAudio;
  if (type === 'video') return Video;
  return Image;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPanel({ branding }: MediaPanelProps) {
  const [open, setOpen] = useState(true);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function loadAssets() {
      setLoading(true);
      setLoadError(null);
      try {
        // Fetch all files without a prefix param (prefix param causes empty response in some envs)
        // then filter client-side to the media/ folder.
        const res = await fetch(`${WORKER_URL}/list`, {
          headers: {
            'X-Upload-Secret': UPLOAD_SECRET,
            'X-Bucket': BUCKET,
          },
        });
        if (!res.ok) throw new Error(`Worker returned ${res.status}`);
        const data = await res.json();
        const allFiles: Record<string, unknown>[] = data.files || data.objects || [];

        // Keep only media/ keys that are actual files (not folder placeholders)
        const mediaFiles = allFiles.filter((obj) => {
          const key = obj.key as string;
          return key.startsWith('media/') && !key.endsWith('/');
        });

        const items: MediaAsset[] = mediaFiles.map((obj) => {
          const rawName = (obj.name as string) || (obj.key as string).split('/').pop() || '';
          const cleanName = rawName.replace(/^\d+-/, '');
          const metaAssetType = obj.assetType as string;
          const assetType: 'visual' | 'audio' | 'video' =
            metaAssetType === 'visual' || metaAssetType === 'audio' || metaAssetType === 'video'
              ? metaAssetType
              : inferAssetType(cleanName);
          return {
            key: obj.key as string,
            name: cleanName,
            displayName: (obj.displayName as string) || cleanName,
            assetType,
            size: obj.size as number,
          };
        });

        setAssets(items);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load media');
        setAssets([]);
      } finally {
        setLoading(false);
      }
    }
    loadAssets();
  }, []);

  async function getAssetUrl(key: string): Promise<string> {
    const res = await fetch(`${WORKER_URL}/get/${encodeURIComponent(key)}`, {
      headers: {
        'X-Upload-Secret': UPLOAD_SECRET,
        'X-Bucket': BUCKET,
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch asset (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function handleAssetClick(asset: MediaAsset) {
    if (loadingKey === asset.key) return; // already fetching

    if (asset.assetType === 'audio') {
      if (playingKey === asset.key) {
        audioRef.current?.pause();
        setPlayingKey(null);
        return;
      }
      setLoadingKey(asset.key);
      try {
        const url = await getAssetUrl(asset.key);
        if (audioRef.current) {
          audioRef.current.src = url;
          await audioRef.current.play();
          setPlayingKey(asset.key);
        }
      } catch { /* ignore */ }
      finally { setLoadingKey(null); }
      return;
    }

    // Visual or video — open preview modal
    setLoadingKey(asset.key);
    try {
      const url = await getAssetUrl(asset.key);
      setPreviewAsset({ ...asset, url });
    } catch { /* ignore */ }
    finally { setLoadingKey(null); }
  }

  const isEmpty = !loading && assets.length === 0 && !loadError;

  return (
    <div>
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={() => setPlayingKey(null)} className="hidden" />

      {/* ── Header (click to toggle) ──────────────────────────────────────── */}
      <button
        className="flex items-center gap-3 w-full mb-1 group"
        onClick={() => setOpen(o => !o)}
        style={{ color: branding.primaryColor }}
      >
        <Layers className="w-5 h-5 shrink-0" />
        <h2 className="text-sm font-black uppercase tracking-widest flex-1 text-left">
          Media &amp; Assets
        </h2>
        {!loading && assets.length > 0 && (
          <span className="text-[10px] font-mono text-white/30 uppercase mr-1">
            {assets.length} file{assets.length !== 1 ? 's' : ''}
          </span>
        )}
        {open
          ? <ChevronUp className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          : <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
        }
      </button>

      {/* ── Collapsible body ─────────────────────────────────────────────── */}
      {open && (
        <div className="mt-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-6 gap-2 text-white/30">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading assets...</span>
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-xs text-red-400">{loadError}</span>
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Layers className="w-7 h-7 text-white/10 mb-2" />
              <p className="text-xs text-white/30 leading-relaxed">
                No media assets uploaded yet.<br />
                Add visuals, audio, or video in Settings.
              </p>
            </div>
          )}

          {assets.map(asset => {
            const Icon = getAssetIcon(asset.assetType);
            const isPlaying = playingKey === asset.key;
            const isLoading = loadingKey === asset.key;

            return (
              <button
                key={asset.key}
                onClick={() => handleAssetClick(asset)}
                disabled={isLoading}
                className="flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.01] group disabled:opacity-60 disabled:cursor-wait"
                style={{
                  borderColor: branding.primaryColor + '30',
                  backgroundColor: branding.primaryColor + '08',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = branding.primaryColor + '70')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = branding.primaryColor + '30')}
              >
                {/* Icon / Play indicator */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: branding.primaryColor + '20' }}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: branding.primaryColor }} />
                  ) : asset.assetType === 'audio' ? (
                    isPlaying
                      ? <Pause className="w-4 h-4" style={{ color: branding.primaryColor }} />
                      : <Play className="w-4 h-4" style={{ color: branding.primaryColor }} />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: branding.primaryColor }} />
                  )}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white/80 truncate group-hover:text-white">
                    {asset.displayName}
                  </p>
                  <p className="text-[9px] font-mono text-white/30 uppercase">
                    {asset.assetType} · {formatSize(asset.size)}
                    {asset.assetType === 'audio' && isPlaying && ' · Playing…'}
                  </p>
                </div>

                {/* Action hint */}
                {(asset.assetType === 'visual' || asset.assetType === 'video') && !isLoading && (
                  <ExternalLink className="w-3 h-3 shrink-0 text-white/20 group-hover:text-white/60 transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────────────── */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl border overflow-hidden shadow-2xl"
            style={{
              borderColor: branding.primaryColor + '50',
              backgroundColor: '#0a0a0a',
              boxShadow: `0 0 60px ${branding.primaryColor}20`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: branding.primaryColor + '20' }}
            >
              <div className="flex items-center gap-2" style={{ color: branding.primaryColor }}>
                {previewAsset.assetType === 'video'
                  ? <Video className="w-4 h-4" />
                  : <Image className="w-4 h-4" />
                }
                <span className="text-xs font-black uppercase tracking-widest truncate max-w-[300px]">
                  {previewAsset.displayName}
                </span>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media content */}
            <div className="p-4">
              {previewAsset.assetType === 'video' && previewAsset.url && (
                <video
                  src={previewAsset.url}
                  controls
                  autoPlay
                  className="w-full rounded-xl"
                  style={{ maxHeight: '65vh' }}
                />
              )}
              {previewAsset.assetType === 'visual' && previewAsset.url && (
                <img
                  src={previewAsset.url}
                  alt={previewAsset.displayName}
                  className="w-full rounded-xl object-contain"
                  style={{ maxHeight: '72vh' }}
                />
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-2.5 flex items-center justify-between border-t"
              style={{ borderColor: branding.primaryColor + '15' }}
            >
              <span className="text-[9px] font-mono text-white/20 uppercase">
                {previewAsset.assetType} · {formatSize(previewAsset.size)}
              </span>
              <button
                onClick={() => setPreviewAsset(null)}
                className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
