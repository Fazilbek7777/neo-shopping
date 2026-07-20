// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach(el => io.observe(el));

// Cursor-following ambient orb (desktop only, respects reduced motion)
const orb = document.getElementById('cursorOrb');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (orb && !prefersReducedMotion && window.matchMedia('(min-width: 901px)').matches){
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let orbX = mouseX, orbY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateOrb(){
    orbX += (mouseX - orbX) * 0.06;
    orbY += (mouseY - orbY) * 0.06;
    orb.style.left = orbX + 'px';
    orb.style.top = orbY + 'px';
    requestAnimationFrame(animateOrb);
  }
  animateOrb();
}

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');
if (menuToggle){
  menuToggle.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display = open ? 'none' : 'flex';
    navLinks.style.cssText += open ? '' : `
      position: absolute; top: 64px; left: 24px; right: 24px;
      flex-direction: column; gap: 18px; padding: 22px;
      background: rgba(247,249,255,0.95); backdrop-filter: blur(18px);
      border-radius: 20px; box-shadow: 0 20px 40px -10px rgba(11,27,63,0.2);
    `;
  });
}

// ============================================
// AI Shopping Assistant widget
// ============================================
(function () {
  const launcher = document.getElementById('chatLauncher');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  if (!launcher) return;

  let productCatalog = [];
  let history = []; // sent to backend: [{role, content}]
  let leadAsked = false;

  fetch('/api/products').then(r => r.json()).then(data => { productCatalog = data; }).catch(() => {});

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    launcher.classList.add('open');
    if (messagesEl.children.length === 0) {
      addNeoMessage("Hi, I'm NEO. Tell me what you're shopping for — item, size, color, budget, whatever you've got — and I'll find your best options.");
    }
    chatInput.focus();
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.classList.remove('open');
  }

  launcher.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg msg-user';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addNeoMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg msg-neo';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'msg msg-neo typing';
    div.id = 'typingIndicator';
    div.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }
  function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function addProductCards(ids) {
    const matches = ids.map(id => productCatalog.find(p => p.id === id)).filter(Boolean);
    if (matches.length === 0) return;
    const wrap = document.createElement('div');
    wrap.className = 'msg-products';
    matches.forEach(p => {
      const card = document.createElement('div');
      card.className = 'msg-product-card';
      card.innerHTML = `
        <div class="msg-product-thumb"></div>
        <div class="msg-product-info">
          <span class="msg-product-name">${p.name}</span>
          <span class="msg-product-meta">${p.category} · ${p.colors.join(', ')}</span>
        </div>
        <span class="msg-product-price">$${p.price}</span>
      `;
      wrap.appendChild(card);
    });
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function addLeadCapture() {
    if (leadAsked) return;
    leadAsked = true;
    const row = document.createElement('div');
    row.className = 'chat-lead-row';
    row.innerHTML = `
      <input type="email" placeholder="you@email.com" aria-label="Email for follow-up">
      <button type="button">Send</button>
    `;
    const input = row.querySelector('input');
    const btn = row.querySelector('button');
    btn.addEventListener('click', () => {
      if (!input.value) return;
      // TODO: send this lead to your CRM / email tool / database.
      row.innerHTML = `<span style="font-size:0.85rem;color:var(--ink);">Thanks — we'll follow up at ${input.value}.</span>`;
    });
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  // Parses [PRODUCT:id] tags out of the AI's reply and returns clean text + ids
  function parseReply(raw) {
    const ids = [];
    const clean = raw.replace(/\[PRODUCT:([a-z0-9-]+)\]/gi, (_, id) => {
      ids.push(id);
      return '';
    }).trim();
    return { clean, ids };
  }

  async function sendMessage(text) {
    addUserMessage(text);
    history.push({ role: 'user', content: text });
    addTypingIndicator();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      removeTypingIndicator();

      if (!res.ok) {
        addNeoMessage("Something went wrong on my end — check that the server has a valid API key configured.");
        return;
      }

      const { clean, ids } = parseReply(data.reply || '');
      if (clean) addNeoMessage(clean);
      if (ids.length) addProductCards(ids);
      if (ids.length && !leadAsked) addLeadCapture();

      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      removeTypingIndicator();
      addNeoMessage("I couldn't reach the server. Make sure it's running.");
    }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    sendMessage(text);
  });
})();

// Waitlist form — front-end only.
// Replace this handler with a real request to your email/CRM provider
// (e.g. Mailchimp, ConvertKit, a Supabase table) before going live.
const form = document.getElementById('waitlistForm');
const note = document.getElementById('waitlistNote');
if (form){
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('waitlistEmail').value;
    if (!email) return;

    // TODO: send `email` to your backend / email service here.
    note.textContent = `You're on the list — we'll email ${email} when it's your turn.`;
    note.classList.add('success');
    form.reset();
  });
}
