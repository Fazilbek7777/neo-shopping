# NEO SHOPPING — AI Shopping Assistant

An animated marketing site with a working AI chat assistant that talks to customers,
asks about size/color/budget, and recommends products from a catalog — powered by
Claude.

## How it's structured

```
neo-shopping/
├── public/          → the website (HTML/CSS/JS) — edit freely
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/logo.jpg
└── server/           → tiny backend that talks to Claude (keeps your API key private)
    ├── server.js
    ├── products.json  → demo product catalog — replace with your real products
    ├── package.json
    └── .env.example
```

The browser can never hold your API key safely (anyone can view page source), so
`server.js` sits in between: the widget sends chat messages to your server, your
server calls Claude, and only the reply comes back to the browser.

## Run it locally

You'll need [Node.js](https://nodejs.org) 18 or newer.

1. Open a terminal in the `server` folder:
   ```
   cd server
   npm install
   ```
2. Copy `.env.example` to `.env` and add your Anthropic API key:
   ```
   cp .env.example .env
   ```
   Get a key at [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys.
3. Start the server:
   ```
   npm start
   ```
4. Open **http://localhost:3000** — the whole site, including the chat bubble in
   the bottom-right corner, is live.

## Swap in your real products

Edit `server/products.json`. Each product needs: `id` (unique, no spaces), `name`,
`category`, `price`, `colors`, `sizes`, `description`. The AI only recommends
products listed here — it won't invent items or prices.

## Connecting real leads

Right now, when someone leaves their email in the chat, it just shows a thank-you
message — nothing is saved. Look for the `TODO` comment in `public/script.js`
(`addLeadCapture` function) and connect it to wherever you want leads to land:
a database, a CRM like HubSpot, or an email tool like Mailchimp. The waitlist form
lower on the page has the same kind of `TODO` in the same file.

## Deploying it live

This needs actual server hosting (not a static host like GitHub Pages, since it
runs Node code). Easiest options:
- **Railway** or **Render** — connect your GitHub repo, add `ANTHROPIC_API_KEY` as
  an environment variable in their dashboard, deploy.
- **Fly.io** — similar, works well for small Node apps.

In all cases: never commit your `.env` file or put the API key anywhere in the
`public/` folder.
