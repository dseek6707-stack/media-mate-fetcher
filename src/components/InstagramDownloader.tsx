import { useState } from "react";
import { Download, Film, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const InstagramDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    title: string;
    author: string;
    thumbnail: string | null;
    message: string;
  } | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("instagram-info", {
        body: { url },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResult({
        title: data.title,
        author: data.author,
        thumbnail: data.thumbnail,
        message: data.message,
      });
    } catch (e: any) {
      setError(e.message || "Failed to fetch reel info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-instagram/10 mb-2">
          <Film className="w-7 h-7 text-instagram" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Instagram Reels</h1>
        <p className="text-muted-foreground text-sm">Download any public Instagram reel</p>
      </div>

      <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_hsl(220_25%_10%/0.06)] p-5 space-y-4">
        <input
          type="url"
          placeholder="https://instagram.com/reel/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow duration-150"
        />

        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="w-full bg-instagram text-primary-foreground font-semibold rounded-xl px-6 py-3 transition-all duration-200 ease-out hover:shadow-[0_4px_20px_0_hsl(330_80%_55%/0.3)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Fetching…
            </span>
          ) : (
            "Fetch Reel"
          )}
        </button>
      </div>

      {result && (
        <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_hsl(220_25%_10%/0.06)] p-4 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
          {result.thumbnail && (
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={result.thumbnail}
                alt="Reel preview"
                className="w-full aspect-[9/16] max-h-64 object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center">
                  <Film className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </div>
          )}
          <p className="font-medium text-sm leading-snug">{result.title}</p>
          <p className="text-xs text-muted-foreground">by {result.author}</p>
          <div className="bg-accent/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{result.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramDownloader;