import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, quality, mode } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Please paste a valid YouTube link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const match = url.match(/(?:v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Could not find a valid YouTube video ID in the link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = match[1];
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

    // Get basic info via oEmbed
    let title = "YouTube Video";
    let author = "Unknown";
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        title = oembed.title || title;
        author = oembed.author_name || author;
      }
    } catch { /* ignore */ }

    const thumbnails = [
      { label: "Max Resolution", url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` },
      { label: "HD (720p)", url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
      { label: "Standard", url: `https://img.youtube.com/vi/${videoId}/sddefault.jpg` },
      { label: "Medium", url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
      { label: "Default", url: `https://img.youtube.com/vi/${videoId}/default.jpg` },
    ];

    // Thumbnail-only mode: return thumbnail immediately
    if (mode === "thumbnail") {
      return new Response(
        JSON.stringify({
          videoId, title, author,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          thumbnails,
          quality: "max",
          downloadAvailable: true,
          mediaUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          message: "Thumbnail ready! Click Download to save it.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try RapidAPI for actual video download link
    if (rapidApiKey && rapidApiKey.length > 20) {
      try {
        const apiUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`;
        const res = await fetch(apiUrl, {
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com",
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          // Extract video download links
          const videos = data?.videos?.items || [];
          const audios = data?.audios?.items || [];
          
          // Find best matching quality
          const qualityMap: Record<string, string> = {
            "2160": "2160p", "1080": "1080p", "720": "720p",
            "480": "480p", "360": "360p",
          };
          const targetQ = qualityMap[quality || "1080"] || "720p";
          
          let videoUrl = null;
          // Try exact match first, then fallback to best available
          for (const v of videos) {
            if (v.quality === targetQ && v.url) {
              videoUrl = v.url;
              break;
            }
          }
          if (!videoUrl && videos.length > 0) {
            videoUrl = videos[0]?.url || null;
          }

          // Audio only
          if (quality === "audio" && audios.length > 0) {
            return new Response(
              JSON.stringify({
                videoId, title, author,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                thumbnails,
                quality: quality || "1080",
                downloadAvailable: true,
                mediaUrl: audios[0]?.url || null,
                isAudio: true,
                message: "Audio ready! Click Download to save.",
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (videoUrl) {
            return new Response(
              JSON.stringify({
                videoId, title, author,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                thumbnails,
                quality: quality || "1080",
                downloadAvailable: true,
                mediaUrl: videoUrl,
                message: `Video ready in ${targetQ}! Click Download to save.`,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch { /* fall through to thumbnail-only */ }
    }

    // Fallback: thumbnail download only
    return new Response(
      JSON.stringify({
        videoId, title, author,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        thumbnails,
        quality: quality || "1080",
        downloadAvailable: true,
        mediaUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        message: rapidApiKey
          ? "Thumbnail ready! For full video download, ensure your RapidAPI subscription is active."
          : "Thumbnail ready! Add a RapidAPI key for full video download support.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
