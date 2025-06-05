# Deployment Guide for Solve for AI

This guide provides detailed instructions for deploying the Solve for AI website and content engine to Cloudflare.

## Table of Contents

1. [GitHub Repository Setup](#github-repository-setup)
2. [Cloudflare Account Setup](#cloudflare-account-setup)
3. [Domain Configuration](#domain-configuration)
4. [Cloudflare Pages Setup](#cloudflare-pages-setup)
5. [Cloudflare Workers Setup](#cloudflare-workers-setup)
6. [Cloudflare R2 Storage Setup](#cloudflare-r2-storage-setup)
7. [Environment Variables](#environment-variables)
8. [Security Configurations](#security-configurations)
9. [Testing Your Deployment](#testing-your-deployment)
10. [Monitoring and Analytics](#monitoring-and-analytics)

## GitHub Repository Setup

1. Create a new GitHub repository:
   - Go to [GitHub](https://github.com)
   - Click "New repository"
   - Name: `solve-for-ai`
   - Set visibility (private recommended initially)
   - Initialize with README
   - Add `.gitignore` for Node.js

2. Clone the repository locally:
   ```bash
   git clone https://github.com/yourusername/solve-for-ai.git
   cd solve-for-ai
   ```

3. Copy your project files:
   ```bash
   # Copy all website files and content-engine
   cp -r /path/to/your/existing/project/* .
   ```

4. Create/update `.gitignore` to exclude sensitive files:
   ```
   node_modules/
   .env
   content-engine/logs/
   content-engine/content-engine/logs/
   # etc.
   ```

5. Commit and push:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

## Cloudflare Account Setup

1. Create a Cloudflare account at [cloudflare.com](https://cloudflare.com)
2. On the dashboard, navigate to "Workers & Pages" in the sidebar
3. Enable Cloudflare Workers with your account
4. Enable Cloudflare R2 storage in the "R2" section

## Domain Configuration

1. Register your domain (solveforai.com) with Cloudflare or transfer it to Cloudflare:
   - In dashboard, click "Add a Site"
   - Enter your domain name
   - Select the Free plan
   - Follow the instructions to update nameservers with your registrar

2. Basic DNS Setup:
   - DNS records will be automatically created when you set up Cloudflare Pages
   - If needed, add email records:
     ```
     Type: MX
     Name: @
     Priority: 10
     Target: Your email provider's server
     ```

## Cloudflare Pages Setup

1. In the Cloudflare dashboard, go to "Workers & Pages"
2. Click "Create application" then "Pages"
3. Connect your GitHub account
4. Select the `solve-for-ai` repository
5. Configure build settings:
   - Project name: `solve-for-ai`
   - Production branch: `main`
   - Build command: Leave blank (we're hosting static files)
   - Build output directory: `/` (root directory)
   - Root directory: `/` (root directory)

6. Environment variables (if needed):
   - Add any required environment variables for build
   - Note: Sensitive API keys should not be included here

7. Click "Save and Deploy"
8. After deployment, click "Continue to project"

9. Configure custom domain:
   - In your Pages project, go to "Custom domains"
   - Click "Set up a custom domain"
   - Enter your domain (solveforai.com)
   - Also add the www subdomain
   - Cloudflare will automatically configure DNS records

## Cloudflare Workers Setup

Now we'll convert the content engine to serverless functions:

1. Install Wrangler (Cloudflare Workers CLI):
   ```bash
   npm install -g wrangler
   ```

2. Create a new directory for Workers:
   ```bash
   mkdir -p workers/content-engine
   cd workers/content-engine
   ```

3. Initialize a new Workers project:
   ```bash
   wrangler init
   ```

4. Create API endpoints for the content engine:
   - Create a file `src/index.js`:

   ```javascript
   // Example Worker that handles content generation requests
   export default {
     async fetch(request, env, ctx) {
       try {
         const url = new URL(request.url);
         
         // Handle different endpoints
         if (url.pathname === "/api/generate-content" && request.method === "POST") {
           return await generateContent(request, env);
         } else if (url.pathname === "/api/generate-image" && request.method === "POST") {
           return await generateImage(request, env);
         } else {
           return new Response("Not found", { status: 404 });
         }
       } catch (error) {
         return new Response(`Error: ${error.message}`, { status: 500 });
       }
     }
   };
   
   // Content generation function
   async function generateContent(request, env) {
     const data = await request.json();
     const { topic } = data;
     
     // Your content generation logic
     // Replace with actual API calls to OpenAI/Anthropic
     
     const result = {
       title: `Tutorial about ${topic}`,
       content: "Generated content would go here",
       metadata: {
         slug: topic.toLowerCase().replace(/\s+/g, '-'),
         audience: "Intermediate",
         readingTime: 15
       }
     };
     
     return new Response(JSON.stringify(result), {
       headers: { "Content-Type": "application/json" }
     });
   }
   
   // Image generation function
   async function generateImage(request, env) {
     // Image generation logic
     return new Response(JSON.stringify({ url: "image-url" }), {
       headers: { "Content-Type": "application/json" }
     });
   }
   ```

5. Configure environment variables:
   - Create a `.dev.vars` file for local development
   - In Cloudflare dashboard, add environment variables for production

6. Deploy the Worker:
   ```bash
   wrangler publish
   ```

7. Test your API endpoints:
   ```bash
   curl -X POST https://content-engine.yourusername.workers.dev/api/generate-content \
     -H "Content-Type: application/json" \
     -d '{"topic":"Machine Learning Basics"}'
   ```

## Cloudflare R2 Storage Setup

1. In Cloudflare dashboard, go to "R2"
2. Click "Create bucket"
3. Name: `solve-for-ai-content`
4. Select region closest to you
5. Click "Create bucket"

6. Create access keys:
   - Go to "R2" → "Manage R2 API Tokens"
   - Create a new API token
   - Copy the Access Key ID and Secret Access Key

7. Configure Workers to use R2:
   - Update your `wrangler.toml`:
   ```toml
   [[r2_buckets]]
   binding = "CONTENT_BUCKET"
   bucket_name = "solve-for-ai-content"
   ```

8. Update your Worker to store and retrieve content:
   ```javascript
   // Example of storing to R2
   async function storeContent(request, env) {
     const data = await request.json();
     const { slug, html } = data;
     
     await env.CONTENT_BUCKET.put(`tutorials/${slug}.html`, html);
     
     return new Response(JSON.stringify({ success: true }), {
       headers: { "Content-Type": "application/json" }
     });
   }
   ```

## Environment Variables

Set these environment variables in Cloudflare Pages and Workers:

1. For OpenAI:
   - `OPENAI_API_KEY`: Your OpenAI API key

2. For Anthropic:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

3. For R2:
   - Automatically configured via Wrangler

## Security Configurations

1. Configure security headers:
   - In Cloudflare Pages, go to Settings → Functions
   - Add headers in `_headers` file in your repository:
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```

2. Set up WAF (Web Application Firewall):
   - In Cloudflare dashboard, go to "Security" → "WAF"
   - Enable recommended rule sets

3. Enable Email Security:
   - Add SPF record:
   ```
   Type: TXT
   Name: @
   Content: v=spf1 include:_spf.mx.cloudflare.net ~all
   ```
   
   - Add DMARC record:
   ```
   Type: TXT
   Name: _dmarc
   Content: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

## Testing Your Deployment

1. Test the static website:
   - Visit your domain: https://solveforai.com
   - Test all links and pages
   - Verify SSL is working

2. Test the content engine API:
   ```bash
   curl -X POST https://content-engine.yourusername.workers.dev/api/generate-content \
     -H "Content-Type: application/json" \
     -d '{"topic":"Machine Learning Basics"}'
   ```

3. Verify content storage:
   - Generate content through the API
   - Check R2 storage for the saved files

## Monitoring and Analytics

1. Set up Cloudflare Analytics:
   - In dashboard, go to "Analytics"
   - View metrics for Pages, Workers, and R2

2. Set up alerts:
   - In dashboard, go to "Notifications"
   - Set up alerts for Worker errors and performance issues

3. Monitor costs:
   - In dashboard, go to "Billing"
   - Monitor usage of paid services like R2 and Workers

---

## Next Steps

1. Consider CI/CD pipelines for automated deployments
2. Implement automated testing
3. Set up backup strategies for content
4. Consider adding Cloudflare KV for metadata storage
5. Implement rate limiting for API endpoints
