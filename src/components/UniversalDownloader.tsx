import { useState, useCallback } from "react";
import { Download, AlertCircle, Link2, X, Search, Play, Film, Camera, User, BookOpen, Clock, Video, ImageIcon, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FeatureTab } from "./FeatureTabs";

interface DownloaderConfig {
  title: string;
  subtitle: string;
  placeholder: string;
  icon: React.ElementType;
  color: string;
  buttonColor: string;
  shadowColor: string;
}

const CONFIG: Record<FeatureTab, DownloaderConfig> = {
  "ig-video": {
    title: "Instagram Video Downloader",
    subtitle: "Paste any public Instagram video link to download",
    placeholder: "https://instagram.com/p/...",
    icon: Video,
    color: "text-instagram",
    buttonColor: "bg-instagram",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(330_80%_55%/0.3)]",
  },
  "ig-reels": {
    title: "Instagram Reels Downloader",
    subtitle: "Download any public Instagram reel instantly",
    placeholder: "https://instagram.com/reel/...",
    icon: Film,
    color: "text-instagram",
    buttonColor: "bg-instagram",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(330_80%_55%/0.3)]",
  },
  "ig-photo": {
    title: "Instagram Photo Downloader",
    subtitle: "Save any public Instagram photo in full quality",
    placeholder: "https://instagram.com/p/...",
    icon: Camera,
    color: "text-instagram",
    buttonColor: "bg-instagram",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(330_80%_55%/0.3)]",
  },
  "ig-dp": {
    title: "Instagram DP Downloader",
    subtitle: "Download any profile picture in HD quality",
    placeholder: "https://instagram.com/username",
    icon: User,
    color: "text-instagram",
    buttonColor: "bg-instagram",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(330_80%_55%/0.3)]",
  },
  "ig-stories": {
    title: "Instagram Stories Downloader",
    subtitle: "Save stories before they disappear",
    placeholder: "https://instagram.com/stories/username/...",
    icon: BookOpen,
    color: "text-instagram",
    buttonColor: "bg-instagram",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(330_80%_55%/0.3)]",
  },
  "ig-highlights": {
    title: "Instagram Highlights Downloader",
    subtitle: "Download any public story highlight",
    placeholder: "https://instagram.com/stories/highlights/...",
    icon: Clock,
    color: "text-instagram",
    buttonColor: "bg-instagram",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(330_80%_55%/0.3)]",
  },
  youtube: {
    title: "YouTube Video Downloader",
    subtitle: "Download YouTube videos in multiple qualities",
    placeholder: "https://youtube.com/watch?v=...",
    icon: Play,
    color: "text-youtube",
    buttonColor: "bg-youtube",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(0_100%_50%/0.3)]",
  },
  image: {
    title: "Image Downloader",
    subtitle: "Download any image from URL directly",
    placeholder: "https://example.com/image.jpg",
    icon: ImageIcon,
    color: "text-image-blue",
    buttonColor: "bg-image-blue",
    shadowColor: "hover:shadow-[0_4px_20px_0_hsl(210_80%_55%/0.3)]",
  },
};

const QUALITY_OPTIONS = [
  { label: "4K (2160p)", value: "2160" },
  { label: "1080p", value: "1080" },
  { label: "720p", value: "720" },
  { label: "480p", value: "480" },
  { label: "360p", value: "360" },
  { label: "Audio Only", value: "audio" },
];

interface Result {
  title: string;
  author?: string;
  thumbnail: string | null;
  mediaUrl?: string | null;
  message?: string;
  downloadAvailable?: boolean;
  type: string;
}

interface UniversalDownloaderProps {
  activeTab: FeatureTab;
}

const UniversalDownloader = ({ activeTab }: UniversalDownloaderProps) => {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("1080");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const config = CONFIG[activeTab];
  const Icon = config.icon;
  const isInstagram = activeTab.startsWith("ig-");
  const isYoutube = activeTab === "youtube";
  const isImage = activeTab === "image";

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      // Clipboard not available
    }
  }, []);

  const handleClear = useCallback(() => {
    setUrl("");
    setResult(null);
    setPreview(null);
    setError("");
    setSuccess("");
  }, []);

  const handleSearch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setResult(null);
    setPreview(null);

    try {
      if (isImage) {
        new URL(url);
        setPreview(url);
        setLoading(false);
        return;
      }

      if (isYoutube) {
        const { data, error: fnError } = await supabase.functions.invoke("youtube-info", {
          body: { url, quality },
        });
        if (fnError) {
          setError("Could not connect to server. Please try again.");
          return;
        }
        if (data?.error) {
          setError(data.error);
          return;
        }
        setResult({
          title: data.title,
          author: data.author,
          thumbnail: data.thumbnail,
          mediaUrl: data.mediaUrl,
          message: data.message,
          downloadAvailable: data.downloadAvailable,
          type: "youtube",
        });
      } else {
        const contentType = activeTab.replace("ig-", "");
        const { data, error: fnError } = await supabase.functions.invoke("instagram-info", {
          body: { url, type: contentType },
        });
        if (fnError) {
          setError("Could not connect to server. Please try again.");
          return;
        }
        if (data?.error) {
          setError(data.error);
          return;
        }
        setResult({
          title: data.title,
          author: data.author,
          thumbnail: data.thumbnail,
          mediaUrl: data.mediaUrl,
          message: data.message,
          downloadAvailable: data.downloadAvailable,
          type: contentType,
        });
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch media info. Please check the link and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (downloadUrl: string, filename?: string) => {
    setDownloading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ url: downloadUrl }),
        }
      );

      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        const json = await response.json();
        throw new Error(json.error || "Download failed");
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Empty response received");

      const cleanFilename = filename || downloadUrl.split("/").pop()?.split("?")[0] || "download";
      // Add extension based on content type if missing
      let finalFilename = cleanFilename;
      if (!finalFilename.match(/\.\w{3,4}$/)) {
        if (contentType.includes("jpeg") || contentType.includes("jpg")) finalFilename += ".jpg";
        else if (contentType.includes("png")) finalFilename += ".png";
        else if (contentType.includes("webp")) finalFilename += ".webp";
        else if (contentType.includes("mp4")) finalFilename += ".mp4";
        else finalFilename += ".jpg";
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setSuccess("Download started! Check your downloads folder.");
    } catch (e: any) {
      setError(e.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      {/* Title Section */}
      <div className="text-center space-y-2 mb-8">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 ${
            isInstagram ? "bg-instagram/10" : isYoutube ? "bg-youtube/10" : "bg-image-blue/10"
          }`}
        >
          <Icon className={`w-8 h-8 ${config.color}`} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
          {config.title}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">{config.subtitle}</p>
      </div>

      {/* Input Section */}
      <div className="bg-card rounded-2xl shadow-[0_2px_24px_0_hsl(220_25%_10%/0.07)] p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <Link2 className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="url"
              placeholder={config.placeholder}
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); setSuccess(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-xl border border-border bg-background pl-10 pr-20 py-3 md:py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-200"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {!url && (
                <button
                  onClick={handlePaste}
                  className="px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors active:scale-95"
                >
                  Paste
                </button>
              )}
              {url && (
                <button
                  onClick={handleClear}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isYoutube && (
          <div className="relative">
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 pr-10"
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs animate-slide-down">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-[hsl(var(--success))] text-xs animate-slide-down">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={loading || !url.trim()}
          className={`w-full ${config.buttonColor} text-primary-foreground font-semibold rounded-xl px-6 py-3 md:py-3.5 transition-all duration-200 ease-out ${config.shadowColor} active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm md:text-base`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Searching…
            </span>
          ) : (
            <>
              <Search className="w-4 h-4" />
              SEARCH
            </>
          )}
        </button>
      </div>

      {/* Image Preview & Download */}
      {isImage && preview && (
        <div className="mt-6 bg-card rounded-2xl shadow-[0_2px_24px_0_hsl(220_25%_10%/0.07)] p-4 space-y-4 animate-scale-in">
          <div className="relative rounded-xl overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-80 object-contain"
              onError={() => {
                setError("Could not load image. Check the URL.");
                setPreview(null);
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{url}</span>
          </div>
          <button
            onClick={() => handleDownload(preview)}
            disabled={downloading}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out hover:shadow-[0_4px_20px_0_hsl(220_90%_56%/0.35)] active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Downloading…
              </span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Save Image
              </>
            )}
          </button>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-6 bg-card rounded-2xl shadow-[0_2px_24px_0_hsl(220_25%_10%/0.07)] p-4 md:p-5 space-y-4 animate-scale-in">
          {result.thumbnail && (
            <div className="relative rounded-xl overflow-hidden bg-muted">
              <img
                src={result.thumbnail}
                alt="Media preview"
                className={`w-full object-cover ${
                  result.type === "youtube" ? "aspect-video" : "aspect-square max-h-80"
                }`}
              />
              {(result.type === "youtube" || result.type === "reels" || result.type === "video") && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <p className="font-semibold text-sm md:text-base leading-snug">{result.title}</p>
            {result.author && result.author !== "Unknown" && (
              <p className="text-xs text-muted-foreground">by @{result.author}</p>
            )}
          </div>

          {isYoutube && (
            <p className="text-xs text-muted-foreground">
              Quality: {QUALITY_OPTIONS.find((q) => q.value === quality)?.label}
            </p>
          )}

          {result.message && (
            <div className="bg-accent rounded-xl p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{result.message}</p>
            </div>
          )}

          {/* Download Button */}
          {result.downloadAvailable && result.mediaUrl ? (
            <button
              onClick={() => handleDownload(result.mediaUrl!, `${result.title || "download"}`)}
              disabled={downloading}
              className={`w-full ${config.buttonColor} text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out ${config.shadowColor} active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Downloading…
                </span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Now
                </>
              )}
            </button>
          ) : result.thumbnail ? (
            <button
              onClick={() => handleDownload(result.thumbnail!, `${result.title || "download"}`)}
              disabled={downloading}
              className={`w-full ${config.buttonColor} text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out ${config.shadowColor} active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Downloading…
                </span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Thumbnail
                </>
              )}
            </button>
          ) : null}
        </div>
      )}

      {/* How it works */}
      <div className="mt-10 space-y-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <h2 className="text-lg font-bold text-center">How to Download?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Copy Link", desc: "Copy the link of the media you want to download from Instagram or YouTube" },
            { step: "2", title: "Paste & Search", desc: "Paste the link in the input box above and click Search" },
            { step: "3", title: "Download", desc: "Click the Download button to save the media to your device" },
          ].map((item) => (
            <div key={item.step} className="bg-card rounded-xl p-4 space-y-2 shadow-[0_1px_8px_0_hsl(220_25%_10%/0.04)]">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{item.step}</span>
              </div>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mt-8 mb-8 space-y-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
        <h2 className="text-lg font-bold text-center">Supported Features</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Video, label: "IG Videos", color: "text-instagram" },
            { icon: Film, label: "IG Reels", color: "text-instagram" },
            { icon: Camera, label: "IG Photos", color: "text-instagram" },
            { icon: User, label: "IG DP (HD)", color: "text-instagram" },
            { icon: BookOpen, label: "IG Stories", color: "text-instagram" },
            { icon: Clock, label: "IG Highlights", color: "text-instagram" },
            { icon: Play, label: "YouTube", color: "text-youtube" },
            { icon: ImageIcon, label: "Any Image", color: "text-image-blue" },
          ].map((f) => {
            const FIcon = f.icon;
            return (
              <div key={f.label} className="bg-card rounded-xl p-3 flex items-center gap-2.5 shadow-[0_1px_6px_0_hsl(220_25%_10%/0.03)]">
                <FIcon className={`w-4 h-4 ${f.color} shrink-0`} />
                <span className="text-xs font-medium">{f.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UniversalDownloader;
