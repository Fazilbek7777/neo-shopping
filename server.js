// NEO SHOPPING — backend server
// Serves the site and proxies chat messages to Claude, keeping the API key private.

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    '\n⚠  ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.\n'
  );
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8')
);

// Serve the catalog so the frontend can render product cards
app.get('/api/products', (req, res) => {
  res.json(products);
});

function buildSystemPrompt() {
  const catalog = products
    .map(
      (p) =>
        `- id:${p.id} | ${p.name} | category:${p.category} | price:$${p.price} | colors:${p.colors.join(', ')} | sizes:${p.sizes.join(', ')} | ${p.description}`
    )
    .join('\n');

  return `You are NEO, the AI shopping assistant for NEO SHOPPING, a demo store.

Your job:
1. Understand what the customer wants: item type, size, color, and budget.
2. Ask short, specific follow-up questions ONE AT A TIME when key details are missing. Don't interrogate — ask like a helpful in-store assistant.
3. Only recommend products from the catalog below. Never invent products, prices, sizes, or colors that aren't listed.
4. When you recommend a product, add a line with exactly [PRODUCT:product-id] for each one, in addition to your normal reply. Example:
   "The Pulse Runner looks like a great fit for that.
   [PRODUCT:pulse-runner]
   Want me to check if it comes in your size?"
5. Once the customer shows real interest in a specific product, warmly offer to take their email so the team can follow up with checkout details. Ask once, don't repeat it, and never block the conversation on it.
6. Keep replies short: 2-4 sentences plus any product tags. No walls of text.

Catalog:
${catalog}`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: buildSystemPrompt(),
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(500).json({ error: 'AI request failed. Check your API key and server logs.' });
    }

    const text = (data.content || [])
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`NEO SHOPPING running at http://localhost:${PORT}`);
});
