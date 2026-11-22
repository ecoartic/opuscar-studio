(function(){
  var P=[
    ['index.html','خانه','🏠','معرفی و نقطه‌ی شروع'],
    ['library.html','کتابخانه‌ی ابزار','🧭','نقشه‌ی ورک‌فلو و ابزارهای بررسی‌شده'],
    ['styles.html','سبک‌های فیلم','🎞️','۹۸ سبک فیلم با کد و سازنده‌ی پرامپت'],
    ['prompts.html','پرامپت‌ها','💬','۷۰۳ پرامپت واقعی ویدیو'],
    ['videos.html','گالری ویدیو','📺','۵۹۱ ویدیوی واقعی ساخته‌شده با Claude'],
    ['animation.html','انیمیشن آبرنگی','🎥','شخصیت لنزو با p5.brush و خروجی MP4'],
    ['assets.html','دارایی‌های سه‌بعدی','📦','۳۴۸۹ مدل GLB رایگان'],
    ['artarget.html','AR روی کارت خودت','📇','عکس از هر سطح → تارگت AR، بدون ARCore'],
    ['armap.html','AR بدون تارگت','🗺️','نقشه‌ی ابرنقاط (COLMAP) + مکان‌یابی PnP'],
    ['xr.html','اتاق XR','🥽','مدل در VR/AR با اندازه‌ی واقعی (Quest، اندروید)'],
    ['depth.html','آزمایشگاه عمق','🌗','عمق از عکس، پارالاکس 2.5D، DoF، استریو'],
    ['splat.html','نمایشگر Splat','✨','Gaussian splat با pixel و کروما'],
    ['gsbrush.html','ساخت Splat (Brush)','🧩','آموزش Gaussian splat در مرورگر'],
    ['supersplat/','ویرایشگر SuperSplat','✂️','تمیزکاری و ترکیب splat (نسخه‌ی خود سایت)'],
    ['brush.html','قلم‌مو','🖌️','پس‌زمینه و loop آبرنگی'],
    ['codevember.html','Codevember','🧪','۲۱ صحنه‌ی تعاملی three.js']];
  var cur=(location.pathname.split('/').pop()||'index.html'),me=P.find(function(p){return p[0]===cur;})||P[0];
  var bar=document.createElement('nav');bar.className='site-bar';bar.setAttribute('aria-label','ناوبری سایت');
  bar.innerHTML='<a class="brand" href="index.html">Behrang <b>Lab</b></a><span class="here">'+me[2]+' '+me[1]+'</span>'+
    '<button class="burger" aria-label="منو" aria-expanded="false"><i></i><i></i><i></i></button>'+
    '<div class="menu" hidden>'+P.map(function(p){return '<a href="'+p[0]+'"'+(p[0]===cur?' class="on" aria-current="page"':'')+'><span class="ic">'+p[2]+'</span><span><b>'+p[1]+'</b><small>'+p[3]+'</small></span></a>';}).join('')+'</div>';
  document.body.insertBefore(bar,document.body.firstChild);
  var btn=bar.querySelector('.burger'),menu=bar.querySelector('.menu');
  function set(o){menu.hidden=!o;btn.setAttribute('aria-expanded',o);bar.classList.toggle('open',o);}
  btn.onclick=function(e){e.stopPropagation();set(menu.hidden);};
  document.addEventListener('click',function(e){if(!bar.contains(e.target))set(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});
  if(!document.body.classList.contains('full')){var f=document.createElement('div');f.className='site-foot';f.innerHTML='Behrang Lab · آزمایشگاه شخصی ابزار و ورک‌فلوی خلاق';document.body.appendChild(f);}
})();
