import Anthropic from '@anthropic-ai/sdk';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn(
    '⚠️ VITE_ANTHROPIC_API_KEY not found. AI parsing will not work. Please add your Anthropic API key to .env.local'
  );
  console.warn('Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
} else {
  console.log('✅ Anthropic API key loaded successfully');
}

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export function isAnthropicAvailable() {
  return anthropic !== null && apiKey !== undefined && apiKey !== null;
}

