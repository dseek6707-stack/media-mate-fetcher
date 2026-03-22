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

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the image/media from the remote URL
    const mediaResponse = await fetch(parsedUrl.toString(), {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!mediaResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch media: ${mediaResponse.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = mediaResponse.headers.get("content-type") || "application/octet-stream";
    const mediaData = await mediaResponse.arrayBuffer();

    // Extract filename from URL
    const pathParts = parsedUrl.pathname.split("/");
    let filename = pathParts[pathParts.length - 1] || "download";
    
    // Add extension if missing
    if (!filename.includes(".")) {
      if (contentType.includes("jpeg") || contentType.includes("jpg")) filename += ".jpg";
      else if (contentType.includes("png")) filename += ".png";
      else if (contentType.includes("webp")) filename += ".webp";
      else if (contentType.includes("gif")) filename += ".gif";
      else if (contentType.includes("mp4") || contentType.includes("video")) filename += ".mp4";
      else filename += ".jpg";
    }

    return new Response(mediaData, {
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
