import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('⚠️ VITE_ANTHROPIC_API_KEY not found in environment variables');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

app.post('/api/anthropic/messages', async (req, res) => {
  try {
    const { model, max_tokens, system, messages } = req.body;

    const response = await anthropic.messages.create({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: max_tokens || 4096,
      system,
      messages,
    });

    res.json(response);
  } catch (error) {
    console.error('Anthropic API error:', error);
    const statusCode = error.status || error.statusCode || 500;
    const errorMessage = error.message || error.error?.message || 'An error occurred while processing the request';
    res.status(statusCode).json({
      error: errorMessage,
      type: 'error',
      details: error.error || error,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Anthropic proxy server running on http://localhost:${PORT}`);
});

