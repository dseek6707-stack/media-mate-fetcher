import { useState } from "react";
import { Download, Play, ChevronDown } from "lucide-react";

const QUALITY_OPTIONS = [
  { label: "4K (2160p)", value: "2160" },
  { label: "1080p", value: "1080" },
  { label: "720p", value: "720" },
  { label: "480p", value: "480" },
  { label: "360p", value: "360" },
  { label: "Audio Only", value: "audio" },
];

const YouTubeDownloader = () => {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("1080");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; thumbnail: string } | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setResult({
      title: "Sample Video — Great Content Here",
      thumbnail: `https://img.youtube.com/vi/${extractVideoId(url) || "dQw4w9WgXcQ"}/hqdefault.jpg`,
    });
    setLoading(false);
  };

  const extractVideoId = (u: string) => {
    const match = u.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };

  const handleDownload = () => {
    // In production, this would call your backend API
    alert(`Download would start for quality: ${quality}p\nEndpoint: POST /api/youtube/download\nBody: { url: "${url}", quality: "${quality}" }`);
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-youtube/10 mb-2">
          <Play className="w-7 h-7 text-youtube" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">YouTube Downloader</h1>
        <p className="text-muted-foreground text-sm">Paste a YouTube link to get started</p>
      </div>

      <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_hsl(220_25%_10%/0.06)] p-5 space-y-4">
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow duration-150"
        />

        <div className="relative">
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow duration-150 pr-10"
          >
            {QUALITY_OPTIONS.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        <button
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="w-full bg-youtube text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out hover:shadow-[0_4px_20px_0_hsl(0_100%_50%/0.3)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Fetching…
            </span>
          ) : (
            "Fetch Video Info"
          )}
        </button>
      </div>

      {result && (
        <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_hsl(220_25%_10%/0.06)] p-4 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={result.thumbnail}
              alt="Video thumbnail"
              className="w-full aspect-video object-cover"
            />
            <div className="absolute inset-0 bg-foreground/10" />
          </div>
          <p className="font-medium text-sm leading-snug">{result.title}</p>
          <p className="text-xs text-muted-foreground">
            Selected quality: {QUALITY_OPTIONS.find((q) => q.value === quality)?.label}
          </p>
          <button
            onClick={handleDownload}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out hover:shadow-[0_4px_20px_0_hsl(349_72%_52%/0.35)] active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      )}
    </div>
  );
};

export default YouTubeDownloader;