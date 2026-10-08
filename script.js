const PRODUCTS = window.BUTTER_PRODUCTS || [];
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n).replace(/\s/g,'');
const img = (url, alt='') => `<img src="${url}" alt="${alt.replace(/"/g,'&quot;')}" onerror="this.classList.add('img-fallback')">`;
let cart = JSON.parse(localStorage.getItem('butterRoomCart') || '[]');
let activeFilter = 'All', activeSub = 'All Drinks', promo = null, currentProduct = null, currentQty = 1;
const save = () => localStorage.setItem('butterRoomCart', JSON.stringify(cart));
const subtotal = () => cart.reduce((s,i)=>s+i.price*i.qty,0);
const deliveryFee = () => { const sub=subtotal(); if(sub>=150000) return 0; const type=$('#deliveryType')?.value || 'jakarta'; return type==='pickup'?0:type==='around'?20000:15000; };
const promoDiscount = () => { if(promo==='WELCOME10') return Math.min(Math.round(subtotal()*.10),25000); return 0; };
const total = () => Math.max(0, subtotal()+deliveryFee()-promoDiscount());

function renderProducts(){
  const grid=$('#productGrid');
  let list=PRODUCTS.filter(p=>activeFilter==='All'||p.cat===activeFilter);
  if(activeFilter==='Drinks' && activeSub!=='All Drinks') list=list.filter(p=>p.sub===activeSub);
  grid.innerHTML=list.length ? list.map(p=>`
    <article class="product-card" data-id="${p.id}">
      <div class="product-photo">${img(p.img,p.name)}<span class="product-tag">${p.cat==='Drinks'?p.sub:p.cat}</span></div>
      <div class="product-info"><h3>${p.name}</h3><p>${p.desc}</p><div class="price-row"><span class="price">${money(p.price)}${p.name==='Vanilla Berry Cake'||p.name==='Classic Basque Cheesecake'?' / slice':''}</span><button class="add-mini" data-add="${p.id}">Add to bag</button></div></div>
    </article>`).join('') : '<div class="no-results">Nothing on the counter right now.</div>';
  $$('.product-card').forEach(card=>card.addEventListener('click',e=>{if(e.target.closest('[data-add]'))return;openProduct(card.dataset.id)}));
  $$('[data-add]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();quickAdd(btn.dataset.add)}));
}
function quickAdd(id){
  const p=PRODUCTS.find(x=>x.id===id); if(!p)return;
  addToCart({product:p,qty:1,custom:{size:'Regular',milk:'Fresh Milk',sweetness:'50%',extras:[],note:''}});
}
function addToCart({product,qty=1,custom={}}){
  const key=product.id+'|'+JSON.stringify(custom);
  const existing=cart.find(i=>i.key===key);
  if(existing) existing.qty+=qty; else cart.push({key,id:product.id,name:product.name,price:product.price,img:product.img,qty,...custom});
  save(); updateBag(); flashBag();
}
function updateBag(){
  $('#bagCount').textContent=cart.reduce((s,i)=>s+i.qty,0);
  const items=$('#bagItems');
  items.innerHTML=cart.length ? cart.map((i,idx)=>`
    <div class="bag-item"><img src="${i.img}" alt="${i.name}" onerror="this.classList.add('img-fallback')">
      <div><h4>${i.name}</h4><small>${money(i.price)} each</small>${i.size?`<small> · ${i.size}${i.milk?` · ${i.milk}`:''}</small>`:''}
        <div class="mini-controls"><button data-bagminus="${idx}">−</button><span>${i.qty}</span><button data-bagplus="${idx}">+</button><button class="remove" data-remove="${idx}">Remove</button></div>
      </div><b>${money(i.price*i.qty)}</b>
    </div>`).join('') : '<div class="empty">Your bag is waiting for something sweet.</div>';
  $$('#bagItems [data-bagminus]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.bagminus,-1));
  $$('#bagItems [data-bagplus]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.bagplus,1));
  $$('#bagItems [data-remove]').forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.remove,1);save();updateBag()});
  $('#subtotal').textContent=money(subtotal());
  $('#delivery').textContent=deliveryFee()===0?'Free':money(deliveryFee());
  $('#grandTotal').textContent=money(total());
  $('#freeDelivery').hidden=subtotal()<150000;
  if(subtotal()>=150000) $('#delivery').textContent='Free';
}
function changeQty(idx,delta){cart[idx].qty+=delta;if(cart[idx].qty<=0)cart.splice(idx,1);save();updateBag()}
function flashBag(){const b=$('#bagBtn');b.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:300})}
function openProduct(id){
  const p=PRODUCTS.find(x=>x.id===id); if(!p)return;
  currentProduct=p;currentQty=1;
  $('#productModalContent').innerHTML=`
    <div class="product-detail"><div class="detail-image">${img(p.img,p.name)}</div>
    <div class="detail-copy"><p class="eyebrow">${p.cat==='Drinks'?p.sub:p.cat}</p><h2>${p.name}</h2><p class="detail-desc">${p.desc}</p><div class="detail-price">${money(p.price)}${p.name==='Vanilla Berry Cake'||p.name==='Classic Basque Cheesecake'?' / slice':''}</div>
    ${p.drink?drinkCustomization():''}
    <div class="custom-block"><h4>Quantity</h4><div class="quantity"><button id="qtyMinus">−</button><span id="detailQty">1</span><button id="qtyPlus">+</button></div></div>
    <div class="custom-block"><h4>Special note</h4><textarea id="detailNote" class="detail-note" rows="3" placeholder="Any special notes for your order?"></textarea></div>
    <div class="custom-block"><div class="price-row"><b id="detailTotal">${money(p.price)}</b><button class="btn dark" id="detailAdd">Add to Bag</button></div></div>
    </div></div>`;
  $('#productModal').classList.add('open');$('#productModal').setAttribute('aria-hidden','false');document.body.classList.add('lock');
  $('#qtyMinus').onclick=()=>{currentQty=Math.max(1,currentQty-1);$('#detailQty').textContent=currentQty;updateDetailTotal()};
  $('#qtyPlus').onclick=()=>{currentQty++;$('#detailQty').textContent=currentQty;updateDetailTotal()};
  $$('.option').forEach(o=>o.onclick=()=>{o.parentElement.querySelectorAll('.option').forEach(x=>x.classList.remove('selected'));o.classList.add('selected');updateDetailTotal()});
  $$('input[type=checkbox][data-extra]').forEach(c=>c.onchange=updateDetailTotal);
  $('#detailAdd').onclick=()=>{const custom=getCustom();addToCart({product:p,qty:currentQty,custom});closeModal('product')};
}
function drinkCustomization(){
 return `<div class="custom-block"><h4>Size</h4><div class="option-row">${[['Regular',0],['Large',5000]].map((x,i)=>`<button class="option ${i===0?'selected':''}" data-kind="size" data-value="${x[0]}" data-add="${x[1]}">${x[0]}${x[1]?` + ${money(x[1])}`:''}</button>`).join('')}</div>
 <h4>Milk</h4><div class="option-row">${[['Fresh Milk',0],['Oat Milk',7000],['Almond Milk',7000]].map((x,i)=>`<button class="option ${i===0?'selected':''}" data-kind="milk" data-value="${x[0]}" data-add="${x[1]}">${x[0]}${x[1]?` + ${money(x[1])}`:''}</button>`).join('')}</div>
 <h4>Sweetness</h4><div class="option-row">${['0%','25%','50%','75%','100%'].map(x=>`<button class="option ${x==='50%'?'selected':''}" data-kind="sweetness" data-value="${x}">${x}</button>`).join('')}</div>
 <h4>Extras</h4><div class="check-row">${[['Extra Espresso',8000],['Vanilla Syrup',5000],['Caramel Syrup',5000],['Cold Foam',7000],['Whipped Cream',5000]].map(x=>`<label><input type="checkbox" data-extra="${x[0]}" data-price="${x[1]}"> ${x[0]} +${money(x[1])}</label>`).join('')}</div></div>`;
}
function getCustom(){
 const custom={size:'Regular',milk:'Fresh Milk',sweetness:'50%',extras:[],note:$('#detailNote')?.value||''};
 $$('.option.selected').forEach(o=>{if(o.dataset.kind)custom[o.dataset.kind]=o.dataset.value});
 $$('input[data-extra]:checked').forEach(c=>custom.extras.push({name:c.dataset.extra,price:+c.dataset.price}));
 return custom;
}
function updateDetailTotal(){
 if(!currentProduct)return;
 const c=getCustom();let add=0;
 $$('.option.selected').forEach(o=>add+=+(o.dataset.add||0));
 c.extras.forEach(x=>add+=x.price);
 $('#detailTotal').textContent=money((currentProduct.price+add)*currentQty);
}
function openBag(){updateBag();$('#bagDrawer').classList.add('open');$('#bagDrawer').setAttribute('aria-hidden','false');document.body.classList.add('lock')}
function closeModal(which){const el=which==='bag'?$('#bagDrawer'):$('#'+which+'Modal');el.classList.remove('open');el.setAttribute('aria-hidden','true');document.body.classList.remove('lock')}
function checkout(){
 if(!cart.length){alert('Your bag is empty — add something sweet first.');return}
 closeModal('bag');renderCheckout();$('#checkoutModal').classList.add('open');$('#checkoutModal').setAttribute('aria-hidden','false');document.body.classList.add('lock');
}
function renderCheckout(){
 $('#checkoutSummary').innerHTML=cart.map(i=>`<div class="review-line"><span>${i.name} × ${i.qty}</span><b>${money(i.price*i.qty)}</b></div>`).join('')+
 `<div class="review-line"><span>Subtotal</span><b>${money(subtotal())}</b></div><div class="review-line"><span>Delivery</span><b>${deliveryFee()?money(deliveryFee()):'Free'}</b></div>${promoDiscount()?`<div class="review-line"><span>WELCOME10</span><b>−${money(promoDiscount())}</b></div>`:''}<div class="review-line"><span><strong>Total</strong></span><b>${money(total())}</b></div>`;
}
function orderMessage(orderNo,form){
 const items=cart.map(i=>`${i.name} x${i.qty}`).join(', ');
 return `Hello The Butter Room! I'd like to confirm my order.\n\nOrder: ${orderNo}\nCustomer: ${form.name.value}\nWhatsApp: ${form.phone.value}\nItems: ${items}\nTotal: ${money(total())}\nOrder type: ${form.orderType.value==='pickup'?'Store Pickup':'Delivery'}\nDate: ${form.date.value} ${form.time.value}\nPayment: ${form.payment.value}`;
}
document.addEventListener('DOMContentLoaded',()=>{
 renderProducts();updateBag();
 $$('.filter').forEach(f=>f.onclick=()=>{activeFilter=f.dataset.filter;activeSub='All Drinks';$$('.filter').forEach(x=>x.classList.remove('active'));f.classList.add('active');$('#drinkFilters').classList.toggle('show',activeFilter==='Drinks');renderProducts();document.querySelector('#shop').scrollIntoView({behavior:'smooth'})});
 $$('.subfilter').forEach(f=>f.onclick=()=>{activeSub=f.dataset.sub;$$('.subfilter').forEach(x=>x.classList.remove('active'));f.classList.add('active');renderProducts()});
 $('#bagBtn').onclick=openBag; $('#deliveryType').onchange=updateBag;
 $('#promoBtn').onclick=()=>{const code=$('#promoInput').value.trim().toUpperCase();promo=code==='WELCOME10'?code:null;$('#promoMessage').textContent=promo?'WELCOME10 applied — 10% off, up to Rp25.000.':'That code doesn’t look right.';updateBag()};
 $('#checkoutBtn').onclick=checkout;
 $$('[data-close]').forEach(x=>x.onclick=()=>closeModal(x.dataset.close));
 $$('[data-drinks-link]').forEach(x=>x.onclick=()=>{$('.filter[data-filter="Drinks"]').click()});
 $('#checkoutForm').orderType.forEach?.(()=>{});
 $$('input[name="orderType"]').forEach(r=>r.onchange=()=>{$('#deliveryFields').hidden=r.value!=='delivery';$('#pickupFields').hidden=r.value!=='pickup'});
 $('#checkoutForm').addEventListener('submit',e=>{
   e.preventDefault(); const form=e.currentTarget; const orderNo='TBR-'+Math.random().toString(36).slice(2,8).toUpperCase();
   const date=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
   const type=form.orderType.value==='pickup'?'Store Pickup':'Delivery';
   $('#successDetails').innerHTML=`<div><span>Order number</span><b>${orderNo}</b></div><div><span>Order date</span><b>${date}</b></div><div><span>Pickup / delivery</span><b>${form.date.value}</b></div><div><span>Order type</span><b>${type}</b></div><div><span>Payment</span><b>${form.payment.value}</b></div><div><span>Total payment</span><b>${money(total())}</b></div>`;
   const msg=orderMessage(orderNo,form); $('#successWa').onclick=()=>window.open('https://wa.me/6281234567890?text='+encodeURIComponent(msg),'_blank');
   $('#trackBtn').onclick=()=>alert(`Your order ${orderNo} has been received. We'll update you via WhatsApp.`);
   $('#continueBtn').onclick=()=>{closeModal('success');location.hash='#shop';};
   cart=[];save();updateBag();closeModal('checkout');$('#successModal').classList.add('open');$('#successModal').setAttribute('aria-hidden','false');document.body.classList.add('lock');
 });
 $('.menu-toggle').onclick=()=>$('.nav').classList.toggle('mobile');
 $('#waBtn').onclick=()=>window.open('https://wa.me/6281234567890?text='+encodeURIComponent('Hello The Butter Room! I would like to place an order.'),'_blank');
});
