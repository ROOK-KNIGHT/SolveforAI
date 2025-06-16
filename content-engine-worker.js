/**
 * Content Engine Automation Worker
 * 
 * This Cloudflare Worker runs on a schedule to automatically trigger
 * content generation for the Solve for AI website.
 */

// Main handler for scheduled events (cron triggers)
export default {
  // This runs when the Worker is triggered by the cron schedule
  async scheduled(event, env, ctx) {
    console.log("Content Engine automation triggered by schedule");
    
    try {
      // Call content generation API
      const result = await generateContent(env);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error(`Error in scheduled task: ${error.message}`);
      return new Response(JSON.stringify({ success: false, error: error.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  
  // This handles direct HTTP requests to the Worker
  async fetch(request, env, ctx) {
    // For security, check for authorization token
    if (!isAuthorized(request, env)) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    console.log("Content Engine automation triggered by HTTP request");
    
    try {
      // Call content generation API
      const result = await generateContent(env);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error(`Error in fetch handler: ${error.message}`);
      return new Response(JSON.stringify({ success: false, error: error.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

/**
 * Generate content by calling the content engine API
 */
async function generateContent(env) {
  console.log("Calling content generation API");
  
  // Call the content engine API endpoint
  const response = await fetch("http://localhost:3000/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.API_KEY}`
    },
    body: JSON.stringify({
      generateNow: true,
      topic: getRandomTopic(), // Optional: Generate a random topic or let the API choose
      options: {
        provider: Math.random() > 0.5 ? "openAI" : "anthropic", // Randomly alternate AI providers
        apiKeys: {
          openai: env.OPENAI_API_KEY,
          anthropic: env.ANTHROPIC_API_KEY
        }
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned error: ${response.status} ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`Content generation ${result.success ? "succeeded" : "failed"}`);
  
  if (result.success) {
    console.log(`Generated tutorial: ${result.topic}`);
    console.log(`Published at: ${result.url}`);
  }
  
  return result;
}

/**
 * Verify that the request is authorized
 */
function isAuthorized(request, env) {
  // Get the authorization header
  const authHeader = request.headers.get("Authorization");
  
  // Check if the header exists and matches the expected format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  
  // Extract the token
  const token = authHeader.split("Bearer ")[1];
  
  // Compare with the stored API key
  return token === env.API_KEY;
}

/**
 * Generate a random topic for content generation
 */
function getRandomTopic() {
  const topics = [
    "Advanced Reinforcement Learning Techniques",
    "Building Neural Networks from Scratch",
    "Computer Vision for Medical Imaging",
    "Deep Learning for Natural Language Processing",
    "Ethical Considerations in AI Development",
    "Explainable AI Frameworks",
    "Generative Adversarial Networks in Practice",
    "Hyperparameter Tuning Strategies",
    "Implementing Transformer Architectures",
    "Knowledge Graphs and Semantic Networks"
  ];
  
  return topics[Math.floor(Math.random() * topics.length)];
}
