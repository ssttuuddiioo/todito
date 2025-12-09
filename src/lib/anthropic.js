// In production, we use Vercel serverless function - no client-side API key needed
// In development, we use local proxy server

const isProduction = import.meta.env.PROD;

// Only check for API key in development (local proxy needs it configured)
if (!isProduction) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      '⚠️ VITE_ANTHROPIC_API_KEY not found. Make sure the local proxy server has access to the API key.'
    );
  } else {
    console.log('✅ Anthropic API key loaded for development');
  }
} else {
  console.log('✅ Production mode - using Vercel serverless function for AI');
}

// In production, AI is always "available" via serverless function
// In development, we assume the proxy server has the key
export function isAnthropicAvailable() {
  return true; // Always try - serverless function handles auth in production
}
