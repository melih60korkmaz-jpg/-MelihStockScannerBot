/** Görsel coşku: konfeti, uçan sayı, titreme. Tamamen DOM + CSS (kütüphane yok). */
const root = (): HTMLElement => document.getElementById('app') ?? document.body;
export function confetti(adet = 70, renkler = ['#A9875E', '#C6A477', '#43A77B', '#6499C5', '#955B66', '#E6D6C5']): void {
  const k = document.createElement('div'); k.className = 'confetti'; const w = innerWidth;
  for (let i = 0; i < adet; i++) { const p = document.createElement('i'); const s = 6 + Math.random() * 7; p.style.cssText = `left:${Math.random() * w}px;width:${s}px;height:${s * 1.6}px;background:${renkler[i % renkler.length]};animation-duration:${1.6 + Math.random() * 1.8}s;animation-delay:${Math.random() * 0.5}s;--dx:${(Math.random() - 0.5) * 220}px;--r:${Math.random() * 900}deg`; k.appendChild(p); }
  root().appendChild(k); setTimeout(() => k.remove(), 4200);
}
export function ucanYazi(metin: string, x = innerWidth / 2, y = innerHeight / 2, renk = '#C6A477'): void {
  const e = document.createElement('div'); e.className = 'ucan'; e.textContent = metin; e.style.cssText = `left:${x}px;top:${y}px;color:${renk}`; root().appendChild(e); setTimeout(() => e.remove(), 1500);
}
export function titret(el: Element | null): void { if (!el) return; el.classList.remove('titre'); void (el as HTMLElement).offsetWidth; el.classList.add('titre'); }
