import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, type = "video" } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Please paste a valid link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isInstagram = /instagram\.com/i.test(url);
    if (!isInstagram) {
      return new Response(
        JSON.stringify({ error: "Not a valid Instagram URL. Please paste an Instagram link." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const label = CONTENT_LABELS[type] || "Instagram Content";

    // For DP downloads
    if (type === "dp") {
      const usernameMatch = url.match(/instagram\.com\/([^/?#]+)/);
      const username = usernameMatch?.[1] || "unknown";

      // Try to get DP via i.instagram.com (public endpoint)
      let dpUrl: string | null = null;
      try {
        const res = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        const text = await res.text();
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          dpUrl = json?.graphql?.user?.profile_pic_url_hd || json?.graphql?.user?.profile_pic_url || null;
        }
      } catch {
        // Failed to get DP
      }

      return new Response(
        JSON.stringify({
          title: `@${username}'s Profile Picture`,
          author: username,
          thumbnail: dpUrl,
          mediaUrl: dpUrl,
          downloadAvailable: !!dpUrl,
          message: dpUrl
            ? "Profile picture found! Click Download to save it."
            : `Could not fetch @${username}'s profile picture. The account may be private.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          mediaUrl: null,
          downloadAvailable: false,
          message: `${label} detected for @${username}. Stories/Highlights require Instagram login to access. This feature needs Instagram authentication to work.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For videos, reels, and photos - try oEmbed first
    let title = label;
    let author = "Unknown";
    let thumbnail: string | null = null;

    try {
      const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
      const oembedRes = await fetch(oembedUrl);
      const text = await oembedRes.text();

      if (oembedRes.ok && text.startsWith("{")) {
        const data = JSON.parse(text);
        title = data.title || label;
        author = data.author_name || "Unknown";
        thumbnail = data.thumbnail_url || null;
      }
    } catch {
      // oEmbed failed
    }

    // Try to extract media URL from page HTML
    let mediaUrl: string | null = null;
    try {
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      const html = await pageRes.text();

      // Try to find video URL in meta tags
      const videoMatch = html.match(/(?:og:video(?::secure_url)?|video_url)["']\s*content=["']([^"']+)/i)
        || html.match(/content=["']([^"']+)["']\s*property=["']og:video/i);
      
      // Try to find image URL in meta tags
      const imageMatch = html.match(/(?:og:image)["']\s*content=["']([^"']+)/i)
        || html.match(/content=["']([^"']+)["']\s*property=["']og:image/i);

      if (type === "video" || type === "reels") {
        mediaUrl = videoMatch?.[1] || imageMatch?.[1] || thumbnail;
      } else {
        mediaUrl = imageMatch?.[1] || thumbnail;
      }
    } catch {
      mediaUrl = thumbnail;
    }

    return new Response(
      JSON.stringify({
        title,
        author,
        thumbnail: thumbnail || mediaUrl,
        mediaUrl,
        downloadAvailable: !!mediaUrl,
        message: mediaUrl
          ? `${label} found! Click Download to save it.`
          : `${label} metadata loaded. The content may be private or require authentication for download.`,
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
