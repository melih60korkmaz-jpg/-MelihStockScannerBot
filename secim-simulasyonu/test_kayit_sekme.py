# Kayıt sekmesi: kaydet, üzerine yaz onayı, sil onayı. python3 test_kayit_sekme.py
from playwright.sync_api import sync_playwright
import sys
with sync_playwright() as pw:
    br=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'],headless=True)
    pg=br.new_page(viewport={'width':390,'height':780});e=[];pg.on('pageerror',lambda x:e.append(str(x)[:120]))
    pg.goto('file:///home/claude/game/dist/index.html');pg.wait_for_timeout(300)
    pg.evaluate("()=>document.querySelectorAll('.in-skip,.gec').forEach(b=>b.click())");pg.wait_for_timeout(400)
    pg.add_style_tag(content='*{animation:none!important;transition:none!important}')
    pg.evaluate("()=>{document.querySelectorAll('.ov,.in,.intro,.splash').forEach(x=>x.remove());S=newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:5});kadroInit(S);asama2Init(S);ilisInit(S);TAB='kayit';render()}")
    ok=True
    def n(): return pg.evaluate("()=>kayitlar().filter(k=>k.ok&&k.slot!=='auto').length")
    n0=n()
    pg.click('.kyb[data-e=sv][data-s="1"]');pg.wait_for_timeout(300)
    ok&=(n()==n0+1) or print('kaydet başarısız')
    pg.click('.kyb[data-e=sv][data-s="1"]');pg.wait_for_timeout(200)
    ok&=pg.evaluate("()=>document.querySelector('.kyb[data-e=sv][data-s=\"1\"]').classList.contains('onay')") or print('üzerine yaz onayı yok')
    pg.click('.kyb[data-e=dl][data-s="1"]');pg.wait_for_timeout(200)
    ok&=(n()==n0+1) or print('ilk dokunuşta silinmemeli')
    pg.click('.kyb[data-e=dl][data-s="1"]');pg.wait_for_timeout(300)
    ok&=(n()==n0) or print('silme başarısız')
    print('hata',e);br.close();sys.exit(0 if ok and not e else 1)
