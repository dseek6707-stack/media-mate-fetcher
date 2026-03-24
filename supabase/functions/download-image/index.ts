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
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'url' parameter" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the image/media from the remote URL with multiple retries
    let mediaResponse: Response | null = null;
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    ];

    for (const ua of userAgents) {
      try {
        mediaResponse = await fetch(parsedUrl.toString(), {
          headers: {
            "User-Agent": ua,
            "Accept": "image/*,video/*,*/*",
            "Referer": parsedUrl.origin,
          },
          redirect: "follow",
        });
        if (mediaResponse.ok) break;
      } catch {
        continue;
      }
    }

    if (!mediaResponse || !mediaResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch media: ${mediaResponse?.status || "network error"}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = mediaResponse.headers.get("content-type") || "application/octet-stream";
    const mediaData = await mediaResponse.arrayBuffer();

    // Reject if response is HTML (login page, error page, etc.)
    if (contentType.includes("text/html")) {
      return new Response(
        JSON.stringify({ error: "The URL returned an HTML page instead of media. The content may be private or require login." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract filename from URL
    const pathParts = parsedUrl.pathname.split("/");
    let filename = pathParts[pathParts.length - 1] || "download";
    
    // Clean query params from filename
    filename = filename.split("?")[0];
    
    // Add extension if missing
    if (!filename.includes(".")) {
      if (contentType.includes("jpeg") || contentType.includes("jpg")) filename += ".jpg";
      else if (contentType.includes("png")) filename += ".png";
      else if (contentType.includes("webp")) filename += ".webp";
      else if (contentType.includes("gif")) filename += ".gif";
      else if (contentType.includes("mp4") || contentType.includes("video")) filename += ".mp4";
      else filename += ".jpg";
    }

    return new Response(new Uint8Array(mediaData), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": mediaData.byteLength.toString(),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
