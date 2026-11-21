(function(){
  var P=[['index.html','خانه'],['styles.html','سبک‌های فیلم'],['prompts.html','پرامپت‌ها'],['library.html','کتابخانه‌ی ابزار'],['assets.html','دارایی‌های سه‌بعدی'],['splat.html','نمایشگر Splat'],['brush.html','قلم‌مو'],['codevember.html','Codevember']];
  var cur=(location.pathname.split('/').pop()||'index.html');
  var bar=document.createElement('nav');bar.className='site-bar';bar.setAttribute('aria-label','ناوبری سایت');
  bar.innerHTML='<a class="brand" href="index.html">Opuscar <b>Studio</b></a><div class="links">'+P.map(function(p){return '<a href="'+p[0]+'"'+(p[0]===cur?' class="on" aria-current="page"':'')+'>'+p[1]+'</a>';}).join('')+'</div>';
  document.body.insertBefore(bar,document.body.firstChild);
  var on=bar.querySelector('a.on');if(on&&on.scrollIntoView)try{on.scrollIntoView({block:'nearest',inline:'center'});}catch(e){}
  if(!document.body.classList.contains('full')){var f=document.createElement('div');f.className='site-foot';f.innerHTML='Opuscar Studio · آزمایشگاه شخصی ابزار و ورک‌فلوی خلاق · <a href="library.html#log">آخرین تغییرات</a>';document.body.appendChild(f);}
})();
