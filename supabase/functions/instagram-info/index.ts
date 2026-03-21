import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'url' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate it looks like an Instagram URL
    const isInstagram = /instagram\.com\/(reel|p|reels)\//i.test(url);
    if (!isInstagram) {
      return new Response(
        JSON.stringify({ error: "Not a valid Instagram reel URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to get oEmbed data from Instagram (works for public posts)
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl);

    if (oembedRes.ok) {
      const data = await oembedRes.json();
      return new Response(
        JSON.stringify({
          title: data.title || "Instagram Reel",
          author: data.author_name || "Unknown",
          thumbnail: data.thumbnail_url,
          downloadAvailable: false,
          message: "Reel info fetched. Actual downloading requires Instagram API access or a dedicated scraping service.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback if oEmbed fails
    return new Response(
      JSON.stringify({
        title: "Instagram Reel",
        author: "Unknown",
        thumbnail: null,
        downloadAvailable: false,
        message: "Could not fetch reel metadata. The post may be private. Downloading requires a dedicated media service.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});