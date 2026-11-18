'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let bag = [];
try { bag = JSON.parse(sessionStorage.getItem('xth-preview-bag') || '[]'); } catch { bag = []; }
if (!Array.isArray(bag)) bag = [];
const dialog = $('#bag');
function renderBag() {
  try { sessionStorage.setItem('xth-preview-bag', JSON.stringify(bag)); } catch { /* The preview still works without browser storage. */ }
  $$('.bag-count').forEach(el => el.textContent = bag.length);
  const container = $('#bag-items');
  container.replaceChildren();
  if (!bag.length) { const p = document.createElement('p'); p.textContent = 'Your bag is empty.'; container.append(p); }
  bag.forEach((item, i) => {
    const row = document.createElement('div'); row.className = 'bag-row';
    const name = document.createElement('strong'); name.textContent = item.name;
    const detail = document.createElement('small'); detail.textContent = `${item.code} / ${item.size}${item.color ? ' / ' + item.color : ''} / $--`;
    const remove = document.createElement('button'); remove.className = 'remove-item'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { bag.splice(i, 1); renderBag(); });
    row.append(name, detail, remove); container.append(row);
  });
}
renderBag();
$('.bag-toggle').addEventListener('click', () => { renderBag(); dialog.showModal(); });
$('#bag-close').addEventListener('click', () => dialog.close());
$('#newsletter').addEventListener('submit', e => {
  e.preventDefault(); $('#newsletter-status').textContent = 'Preview only — your email has not been submitted.';
});
const form = $('#purchase-form');
if (form) form.addEventListener('submit', e => {
  e.preventDefault();
  const data = new FormData(form);
  bag.push({code: $('.product-page').dataset.product, name: $('h1').textContent, size: data.get('size'), color: data.get('color')});
  renderBag(); dialog.showModal();
});
function filter(category) {
  const known = ['All', 'Jeans', 'Denim Jackets', 'Casual Pants'];
  if (!known.includes(category)) category = 'All';
  $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === category));
  $$('.shop-grid .product-card').forEach(card => card.hidden = category !== 'All' && card.dataset.category !== category);
  $('#result-count').textContent = `${$$('.shop-grid .product-card:not([hidden])').length} styles`;
}
if ($('.shop-grid')) {
  filter(new URLSearchParams(location.search).get('category') || 'All');
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter(button.dataset.filter);
    history.replaceState(null, '', 'shop.html' + (button.dataset.filter === 'All' ? '' : '?category=' + encodeURIComponent(button.dataset.filter)));
  }));
}
if (!reduced && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), {threshold:.05});
  $$('.reveal').forEach((el, i) => { el.classList.add('ready'); el.style.transitionDelay = `${(i % 3) * 65}ms`; observer.observe(el); });
  const categories = $$('.category');
  const categoryObserver = new IntersectionObserver(entries => entries.forEach(e => {
    e.target.style.setProperty('--drift', e.isIntersecting ? '0px' : '12px');
  }), {threshold:.4});
  categories.forEach(el => categoryObserver.observe(el));
}
const canvas = $('#atmosphere');
if (canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = 320; canvas.height = 240;
  let timer, phase = 0;
  function paint() {
    phase += .025;
    const gradient = ctx.createLinearGradient(0, 0, 320, 240);
    gradient.addColorStop(0, '#16294b'); gradient.addColorStop(1, '#080c12');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 320, 240);
    const glow = ctx.createRadialGradient(100 + Math.sin(phase)*65, 120, 0, 130, 120, 210);
    glow.addColorStop(0, '#496b8d77'); glow.addColorStop(1, '#16294b00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#f5f3ed09';
    for(let i=0;i<150;i++) ctx.fillRect(Math.random()*320,Math.random()*240,1,1);
  }
  function stop() { clearInterval(timer); timer = null; }
  let visible = true;
  function sync() { stop(); if (!reduced && visible && !document.hidden) timer = setInterval(paint, 100); }
  paint();
  new IntersectionObserver(entries => {visible = entries[0].isIntersecting;sync();}).observe(canvas);
  document.addEventListener('visibilitychange', sync);
}
