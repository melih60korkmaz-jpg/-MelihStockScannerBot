# O3: animasyon kapalıyken ay sonu akışı takılmadan biter. python3 test_anim_kapali.py
from playwright.sync_api import sync_playwright
import sys
CLICK="""()=>{var o=document.querySelectorAll('.sh .opt');var p=document.querySelector('.sh .btn.pri');if(o.length&&(!p||p.disabled)){o[0].click();return}var b=p||document.querySelector('.splash .sp-d')||document.querySelector('.splash .gec')||document.querySelector('.sh .btn')||document.querySelector('.ov');if(b)b.click()}"""
with sync_playwright() as pw:
    br=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--disable-gpu'],headless=True)
    pg=br.new_page(viewport={'width':390,'height':780});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:150]))
    pg.goto('file:///home/claude/game/dist/index.html');pg.wait_for_timeout(300)
    pg.evaluate("()=>document.querySelectorAll('.in-skip,.gec').forEach(b=>b.click())");pg.wait_for_timeout(400)
    pg.add_style_tag(content='*{animation:none!important;transition:none!important}')
    pg.evaluate("()=>{document.querySelectorAll('.ov,.in,.intro,.splash').forEach(e=>e.remove());ANIM='kapali';S=newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:7});kadroInit(S);asama2Init(S);ilisInit(S);TAB='genel';render()}")
    a0=pg.evaluate("()=>S.ay");ok=True
    for k in range(3):
        pg.evaluate("()=>{if(S.aksiyon)S.aksiyon.kalan=0;ayBitirTikla()}")
        hedef=a0+k+1
        for _ in range(40):
            pg.wait_for_timeout(300)
            if pg.evaluate("()=>S.ay")>=hedef and pg.evaluate("()=>document.querySelectorAll('.splash,.ov,.sh').length")==0:break
            pg.evaluate(CLICK)
        pg.wait_for_timeout(1500)
        for _ in range(12):
            if pg.evaluate("()=>document.querySelectorAll('.splash,.ov,.sh').length")==0:break
            pg.evaluate(CLICK);pg.wait_for_timeout(300)
        if pg.evaluate("()=>S.ay")<hedef or pg.evaluate("()=>document.querySelectorAll('.splash,.ov,.sh').length"):ok=False;print('ay',k,'takıldı')
    a1=pg.evaluate("()=>S.ay");print('ay',a0,'→',a1,'| hatalar',errs[:2])
    br.close();sys.exit(0 if ok and a1==a0+3 and not errs else 1)
