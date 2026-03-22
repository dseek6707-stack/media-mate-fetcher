import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTENT_LABELS: Record<string, string> = {
  video: "Instagram Video",
  reels: "Instagram Reel",
  photo: "Instagram Photo",
  dp: "Profile Picture",
  stories: "Instagram Story",
  highlights: "Story Highlight",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, type = "video" } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'url' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isInstagram = /instagram\.com/i.test(url);
    if (!isInstagram) {
      return new Response(
        JSON.stringify({ error: "Not a valid Instagram URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const label = CONTENT_LABELS[type] || "Instagram Content";

    // For DP downloads, try to extract username
    if (type === "dp") {
      const usernameMatch = url.match(/instagram\.com\/([^/?#]+)/);
      const username = usernameMatch?.[1] || "unknown";
      return new Response(
        JSON.stringify({
          title: `${username}'s Profile Picture`,
          author: username,
          thumbnail: null,
          downloadAvailable: false,
          message: `Profile picture download for @${username}. Full HD DP download requires Instagram API access with proper authentication.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For stories and highlights
    if (type === "stories" || type === "highlights") {
      const usernameMatch = url.match(/instagram\.com\/stories\/([^/?#]+)/);
      const username = usernameMatch?.[1] || "unknown";
      return new Response(
        JSON.stringify({
          title: `${label} from @${username}`,
          author: username,
          thumbnail: null,
          downloadAvailable: false,
          message: `${label} download requires Instagram API access. Stories are only available for 24 hours and require authentication to access.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For videos, reels, and photos - try oEmbed
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl);

    if (oembedRes.ok) {
      const data = await oembedRes.json();
      return new Response(
        JSON.stringify({
          title: data.title || label,
          author: data.author_name || "Unknown",
          thumbnail: data.thumbnail_url,
          downloadAvailable: false,
          message: `${label} info fetched successfully. Direct download requires a dedicated media processing service.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        title: label,
        author: "Unknown",
        thumbnail: null,
        downloadAvailable: false,
        message: `Could not fetch ${label.toLowerCase()} metadata. The content may be private or require authentication.`,
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
