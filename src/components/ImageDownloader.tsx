import { useState } from "react";
import { Download, ImageIcon, ExternalLink } from "lucide-react";

const ImageDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handlePreview = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);

    // Validate it looks like an image URL
    try {
      new URL(url);
      await new Promise((r) => setTimeout(r, 600));
      setPreview(url);
    } catch {
      setError("Please enter a valid URL");
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!preview) return;
    // In production this would proxy through your backend
    const link = document.createElement("a");
    link.href = preview;
    link.target = "_blank";
    link.download = "downloaded-image";
    link.click();
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-image-blue/10 mb-2">
          <ImageIcon className="w-7 h-7 text-image-blue" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Image Downloader</h1>
        <p className="text-muted-foreground text-sm">Enter any image URL to preview & save</p>
      </div>

      <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_hsl(220_25%_10%/0.06)] p-5 space-y-4">
        <input
          type="url"
          placeholder="https://example.com/photo.jpg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow duration-150"
        />

        {error && <p className="text-destructive text-xs">{error}</p>}

        <button
          onClick={handlePreview}
          disabled={loading || !url.trim()}
          className="w-full bg-image-blue text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out hover:shadow-[0_4px_20px_0_hsl(210_80%_55%/0.3)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Loading…
            </span>
          ) : (
            "Preview Image"
          )}
        </button>
      </div>

      {preview && (
        <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_hsl(220_25%_10%/0.06)] p-4 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="relative rounded-xl overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-72 object-contain"
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
            onClick={handleDownload}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out hover:shadow-[0_4px_20px_0_hsl(349_72%_52%/0.35)] active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Save Image
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageDownloader;