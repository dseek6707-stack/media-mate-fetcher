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
    const { url, quality } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Please paste a valid YouTube link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract video ID
    const match = url.match(/(?:v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Could not find a valid YouTube video ID in the link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = match[1];

    // Use YouTube oEmbed API
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    const text = await oembedRes.text();

    if (!oembedRes.ok || !text.startsWith("{")) {
      return new Response(
        JSON.stringify({ 
          error: "Could not fetch video info. Video may be private or unavailable.",
          videoId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oembed = JSON.parse(text);

    // Generate all thumbnail URLs for download
    const thumbnails = [
      { label: "Max Resolution", url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` },
      { label: "HD (720p)", url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
      { label: "Standard", url: `https://img.youtube.com/vi/${videoId}/sddefault.jpg` },
      { label: "Medium", url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
      { label: "Default", url: `https://img.youtube.com/vi/${videoId}/default.jpg` },
    ];

    return new Response(
      JSON.stringify({
        videoId,
        title: oembed.title,
        author: oembed.author_name,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        thumbnails,
        quality: quality || "1080",
        // Thumbnail download is always available
        downloadAvailable: true,
        mediaUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        message: `Video info loaded! You can download the thumbnail. For full video download, a RapidAPI key is needed.`,
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
