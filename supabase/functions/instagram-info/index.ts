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

    // Check if RapidAPI key is available for full download support
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

    // For DP downloads
    if (type === "dp") {
      const usernameMatch = url.match(/instagram\.com\/([^/?#]+)/);
      const username = usernameMatch?.[1] || "unknown";

      // Try RapidAPI first if available
      if (rapidApiKey) {
        try {
          const res = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`, {
            headers: {
              "x-rapidapi-key": rapidApiKey,
              "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
            },
          });
          const data = await res.json();
          const dpUrl = data?.data?.hd_profile_pic_url_info?.url || data?.data?.profile_pic_url_hd || data?.data?.profile_pic_url || null;
          if (dpUrl) {
            return new Response(
              JSON.stringify({
                title: `@${username}'s Profile Picture`,
                author: username,
                thumbnail: dpUrl,
                mediaUrl: dpUrl,
                downloadAvailable: true,
                message: "HD Profile picture found! Click Download to save it.",
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch {
          // Fall through to basic method
        }
      }

      return new Response(
        JSON.stringify({
          title: `@${username}'s Profile Picture`,
          author: username,
          thumbnail: null,
          mediaUrl: null,
          downloadAvailable: false,
          message: rapidApiKey
            ? `Could not fetch @${username}'s profile picture. The account may be private.`
            : `Profile picture download requires RapidAPI integration. Please set up a RapidAPI key.`,
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
          message: `${label} detected for @${username}. Stories/Highlights require Instagram authentication. Set up RapidAPI for full support.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For videos, reels, and photos
    // Try RapidAPI first for full media download
    if (rapidApiKey) {
      try {
        const apiUrl = `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl, {
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
          },
        });
        const data = await res.json();
        
        if (data?.data) {
          const post = data.data;
          const caption = post.caption?.text || label;
          const owner = post.user?.username || "Unknown";
          
          // Get media URL based on type
          let mediaUrl: string | null = null;
          let thumbUrl: string | null = null;

          if (post.video_versions && post.video_versions.length > 0) {
            // Sort by quality (width) descending
            const sorted = [...post.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
            mediaUrl = sorted[0]?.url || null;
            thumbUrl = post.image_versions2?.candidates?.[0]?.url || null;
          } else if (post.carousel_media && post.carousel_media.length > 0) {
            // Carousel - get first item
            const first = post.carousel_media[0];
            if (first.video_versions?.length > 0) {
              mediaUrl = first.video_versions[0]?.url || null;
              thumbUrl = first.image_versions2?.candidates?.[0]?.url || null;
            } else {
              mediaUrl = first.image_versions2?.candidates?.[0]?.url || null;
              thumbUrl = mediaUrl;
            }
          } else if (post.image_versions2?.candidates?.length > 0) {
            mediaUrl = post.image_versions2.candidates[0]?.url || null;
            thumbUrl = mediaUrl;
          }

          if (mediaUrl) {
            return new Response(
              JSON.stringify({
                title: caption.substring(0, 100),
                author: owner,
                thumbnail: thumbUrl || mediaUrl,
                mediaUrl,
                downloadAvailable: true,
                message: `${label} found! Click Download to save it.`,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch {
        // Fall through to oEmbed
      }
    }

    // Fallback: oEmbed for metadata
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

      const videoMatch = html.match(/(?:og:video(?::secure_url)?|video_url)["']\s*content=["']([^"']+)/i)
        || html.match(/content=["']([^"']+)["']\s*property=["']og:video/i);
      
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

    const hasRapidApi = !!rapidApiKey;
    return new Response(
      JSON.stringify({
        title,
        author,
        thumbnail: thumbnail || mediaUrl,
        mediaUrl,
        downloadAvailable: !!mediaUrl,
        message: mediaUrl
          ? `${label} found! Click Download to save it.`
          : hasRapidApi
            ? `${label} metadata loaded. The content may be private.`
            : `${label} metadata loaded. For full video/reel downloads, set up RapidAPI integration.`,
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
