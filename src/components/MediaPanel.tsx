/**
 * MediaPanel
 * Displays uploaded visual, audio, and video assets as long horizontal buttons.
 * Audio plays inline. Video plays inline or links out. Visuals open a preview modal.
 * Assets are loaded from R2 via the authenticated worker.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Image, FileAudio, Video, Presentation, Play, Pause, ExternalLink, Loader2, Layers, X } from 'lucide-react';

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string;
const UPLOAD_SECRET = import.meta.env.VITE_R2_UPLOAD_SECRET as string;
const BUCKET = import.meta.env.VITE_R2_BUCKET as string;

interface MediaAsset {
  key: string;
  name: string;
  displayName: string;
  assetType: 'visual' | 'audio' | 'video';
  size: number;
  url?: string; // pre-signed or direct URL for playback
}

interface MediaPanelProps {
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
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
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function loadAssets() {
      setLoading(true);
      try {
        const res = await fetch(`${WORKER_URL}/list?prefix=media/`, {
          headers: {
            'X-Upload-Secret': UPLOAD_SECRET,
            'X-Bucket': BUCKET,
          },
        });
        if (!res.ok) throw new Error('Failed to list media');
        const data = await res.json();
        // Worker returns objects with key, name, size, type, displayName, assetType
        const items: MediaAsset[] = (data.files || data.objects || []).map((obj: Record<string, unknown>) => ({
          key: obj.key as string,
          name: obj.name as string,
          displayName: (obj.displayName as string) || (obj.name as string),
          assetType: (obj.assetType as 'visual' | 'audio' | 'video') || 'visual',
          size: obj.size as number,
        }));
        setAssets(items);
      } catch {
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
    if (!res.ok) throw new Error('Failed to fetch asset');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function handleAssetClick(asset: MediaAsset) {
    if (asset.assetType === 'audio') {
      if (playingKey === asset.key) {
        audioRef.current?.pause();
        setPlayingKey(null);
        return;
      }
      try {
        const url = await getAssetUrl(asset.key);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setPlayingKey(asset.key);
        }
      } catch { /* ignore */ }
      return;
    }

    if (asset.assetType === 'video' || asset.assetType === 'visual') {
      try {
        const url = await getAssetUrl(asset.key);
        setPreviewAsset({ ...asset, url });
      } catch { /* ignore */ }
    }
  }

  const isEmpty = !loading && assets.length === 0;

  return (
    <div>
      {/* Hidden audio element for inline playback */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingKey(null)}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4" style={{ color: branding.primaryColor }}>
        <Layers className="w-5 h-5" />
        <h2 className="text-sm font-black uppercase tracking-widest">Media & Assets</h2>
        {!loading && assets.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-white/30 uppercase">
            {assets.length} file{assets.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading assets...</span>
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

      {/* Asset list — long horizontal buttons */}
      <div className="flex flex-col gap-2">
        {assets.map(asset => {
          const Icon = getAssetIcon(asset.assetType);
          const isPlaying = playingKey === asset.key;

          return (
            <button
              key={asset.key}
              onClick={() => handleAssetClick(asset)}
              className="flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.01] group"
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
                {asset.assetType === 'audio' ? (
                  isPlaying ? (
                    <Pause className="w-4 h-4" style={{ color: branding.primaryColor }} />
                  ) : (
                    <Play className="w-4 h-4" style={{ color: branding.primaryColor }} />
                  )
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
                  {asset.assetType} • {formatSize(asset.size)}
                  {asset.assetType === 'audio' && isPlaying && ' • Playing...'}
                </p>
              </div>

              {/* Action hint */}
              {asset.assetType === 'visual' || asset.assetType === 'video' ? (
                <ExternalLink className="w-3 h-3 shrink-0 text-white/20 group-hover:text-white/60" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="relative w-full max-w-2xl rounded-2xl border p-4 bg-black/90 shadow-2xl"
            style={{ borderColor: branding.primaryColor + '50' }}
          >
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-3">
              {previewAsset.displayName}
            </p>

            {previewAsset.assetType === 'video' && previewAsset.url && (
              <video
                src={previewAsset.url}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: '60vh' }}
              />
            )}

            {previewAsset.assetType === 'visual' && previewAsset.url && (
              <img
                src={previewAsset.url}
                alt={previewAsset.displayName}
                className="w-full rounded-lg object-contain"
                style={{ maxHeight: '70vh' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
