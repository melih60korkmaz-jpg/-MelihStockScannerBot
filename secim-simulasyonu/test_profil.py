# Kalıcı profil: rozet kalıcılığı, oyun sonu kaydı, menü ve kayıt sekmesi görünümü. python3 test_profil.py
from playwright.sync_api import sync_playwright
import sys
with sync_playwright() as pw:
    br=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'],headless=True)
    pg=br.new_page(viewport={'width':390,'height':780});e=[];pg.on('pageerror',lambda x:e.append(str(x)[:120]))
    pg.goto('file:///home/claude/game/dist/index.html');pg.wait_for_timeout(300)
    pg.evaluate("()=>{try{localStorage.removeItem('secimsim_profil')}catch(e){}}")
    pg.evaluate("()=>document.querySelectorAll('.in-skip,.gec').forEach(b=>b.click())");pg.wait_for_timeout(400)
    pg.add_style_tag(content='*{animation:none!important;transition:none!important}')
    res=[True]
    def chk(c,m):
        if not c: res[0]=False;print('BAŞARISIZ:',m)
    pg.evaluate("()=>{document.querySelectorAll('.ov,.in,.intro,.splash').forEach(x=>x.remove());S=newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:5});kadroInit(S);asama2Init(S);ilisInit(S);S.stat.uye=600000;S.ay=40;rozetKontrol();TAB='kayit';render()}")
    p=pg.evaluate("()=>profilOku()");print('rozet (oyun içi):',sorted(p['rozet'].keys()))
    chk('u500' in p['rozet'] and 'ay36' in p['rozet'],'oyun içi rozetler profile yazılmadı')
    pg.evaluate("()=>{S.bitti=1;profilKaydet();profilKaydet()}")
    p=pg.evaluate("()=>profilOku()");print('oyun',p['oyun'],'son',len(p['son']))
    chk(p['oyun']==1,'profilKaydet iki kez çağrıldı ama oyun sayısı 1 olmalı')
    # kayıt sekmesi profili göstermeli
    pg.evaluate("()=>{S.bitti=0;TAB='kayit';render()}");pg.wait_for_timeout(200)
    chk(pg.evaluate("()=>/Kariyer profili/.test(document.getElementById('sc').innerText)"),'kayıt sekmesinde profil yok')
    pg.screenshot(path='/tmp/profil.png')
    # menüden profil
    pg.evaluate("()=>{closeSheet(true);S=null;menu()}");pg.wait_for_timeout(600)
    pg.evaluate("()=>{var b=[...document.querySelectorAll('button')].find(x=>x.textContent==='Profil');if(b)b.click()}");pg.wait_for_timeout(500)
    chk(pg.evaluate("()=>/Rozet koleksiyonu/.test((document.querySelector('.sh')||{textContent:''}).textContent)"),'menüden profil açılmadı')
    print('hata',e);br.close();sys.exit(0 if res[0] and not e else 1)
