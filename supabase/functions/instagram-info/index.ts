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
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

    // DP downloads
    if (type === "dp") {
      const usernameMatch = url.match(/instagram\.com\/([^/?#]+)/);
      const username = usernameMatch?.[1] || "unknown";

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
        } catch { /* fall through */ }
      }

      return new Response(
        JSON.stringify({
          title: `@${username}'s Profile Picture`,
          author: username,
          thumbnail: null, mediaUrl: null, downloadAvailable: false,
          message: rapidApiKey
            ? `Could not fetch @${username}'s profile picture. The account may be private.`
            : `Profile picture download requires API integration. Please set up a RapidAPI key.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stories and highlights
    if (type === "stories" || type === "highlights") {
      const usernameMatch = url.match(/instagram\.com\/stories\/([^/?#]+)/);
      const username = usernameMatch?.[1] || "unknown";
      return new Response(
        JSON.stringify({
          title: `${label} from @${username}`,
          author: username,
          thumbnail: null, mediaUrl: null, downloadAvailable: false,
          message: `${label} detected for @${username}. Stories/Highlights require Instagram authentication.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Videos, reels, photos — try instagram-reels-downloader-api first
    if (rapidApiKey) {
      try {
        const apiUrl = `https://instagram-reels-downloader-api.p.rapidapi.com/download?url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl, {
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": "instagram-reels-downloader-api.p.rapidapi.com",
          },
        });

        if (res.ok) {
          const data = await res.json();

          // Extract media URL from the response
          let mediaUrl: string | null = null;
          let thumbUrl: string | null = null;
          let title = label;

          // Handle various response formats
          if (data?.url) {
            mediaUrl = data.url;
          } else if (data?.video_url) {
            mediaUrl = data.video_url;
          } else if (data?.media_url) {
            mediaUrl = data.media_url;
          } else if (data?.download_url) {
            mediaUrl = data.download_url;
          } else if (Array.isArray(data?.urls) && data.urls.length > 0) {
            mediaUrl = data.urls[0]?.url || data.urls[0];
          } else if (Array.isArray(data?.medias) && data.medias.length > 0) {
            // Pick video first, then image
            const videoMedia = data.medias.find((m: any) => m.type === "video");
            const firstMedia = videoMedia || data.medias[0];
            mediaUrl = firstMedia?.url || firstMedia?.download_url || null;
            thumbUrl = firstMedia?.thumbnail || null;
          }

          if (data?.title) title = data.title;
          if (data?.thumbnail) thumbUrl = data.thumbnail;
          if (data?.image_url && !thumbUrl) thumbUrl = data.image_url;

          if (mediaUrl) {
            return new Response(
              JSON.stringify({
                title: (title || label).substring(0, 100),
                author: data?.username || data?.author || "Unknown",
                thumbnail: thumbUrl || mediaUrl,
                mediaUrl,
                downloadAvailable: true,
                message: `${label} found! Click Download to save it.`,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch { /* fall through to scraper API2 */ }

      // Fallback: try instagram-scraper-api2
      try {
        const apiUrl = `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl, {
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.data) {
            const post = data.data;
            const caption = post.caption?.text || label;
            const owner = post.user?.username || "Unknown";
            let mediaUrl: string | null = null;
            let thumbUrl: string | null = null;

            if (post.video_versions?.length > 0) {
              const sorted = [...post.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
              mediaUrl = sorted[0]?.url || null;
              thumbUrl = post.image_versions2?.candidates?.[0]?.url || null;
            } else if (post.carousel_media?.length > 0) {
              const first = post.carousel_media[0];
              if (first.video_versions?.length > 0) {
                mediaUrl = first.video_versions[0]?.url || null;
              } else {
                mediaUrl = first.image_versions2?.candidates?.[0]?.url || null;
              }
              thumbUrl = first.image_versions2?.candidates?.[0]?.url || null;
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
        }
      } catch { /* fall through */ }
    }

    // Final fallback: oEmbed
    let title = label;
    let author = "Unknown";
    let thumbnail: string | null = null;

    try {
      const oembedRes = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || label;
        author = data.author_name || "Unknown";
        thumbnail = data.thumbnail_url || null;
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({
        title, author, thumbnail,
        mediaUrl: thumbnail,
        downloadAvailable: !!thumbnail,
        message: rapidApiKey
          ? `${label} metadata loaded. Ensure your RapidAPI subscription includes Instagram APIs.`
          : `${label} metadata loaded. Add a RapidAPI key for full download support.`,
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
