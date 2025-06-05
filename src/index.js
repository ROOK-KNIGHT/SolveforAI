/**
 * Solve for AI - Main Worker Script
 * 
 * This worker handles both static asset serving and API endpoints
 * for the content generation engine.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle API requests to the content engine
    if (path.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }

    // For all other requests, serve static assets
    return handleStaticAsset(request, env, ctx);
  }
};

/**
 * Handle API requests for content generation
 */
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Example API endpoints
  if (path === '/api/generate-tutorial' && request.method === 'POST') {
    // This would integrate with your content generation logic
    return new Response(JSON.stringify({
      success: true,
      message: "Tutorial generation endpoint (placeholder)"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path === '/api/generate-image' && request.method === 'POST') {
    // This would integrate with your image generation logic
    return new Response(JSON.stringify({
      success: true,
      message: "Image generation endpoint (placeholder)"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Return 404 for undefined API routes
  return new Response(JSON.stringify({
    success: false,
    error: "API endpoint not found"
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle requests for static assets
 */
async function handleStaticAsset(request, env, ctx) {
  // This is a placeholder for static asset handling
  // In a real implementation, this would use Cloudflare's static asset handling
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Serve index.html for the root path
  if (path === '/' || path === '') {
    return new Response("Serve index.html here", {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // This is a simplified example
  // In practice, Cloudflare Pages handles this automatically
  return new Response(`Static asset would be served from: ${path}`, {
    headers: { 'Content-Type': 'text/plain' }
  });
}
