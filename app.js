(() => {
  const cfg=window.APP_CONFIG||{}; const $=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(Number(n||0));
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const dateTR=s=>new Date(`${s}T12:00:00`).toLocaleDateString('tr-TR');
  const client=window.supabase?.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
  let user=null,types=[],tariffs=[],earnings=[],monthlyGoal=localStorage.getItem('monthly_goal')||5000;
  const say=(id,msg)=>$(id).textContent=msg;
  const show=(id,on)=>$(id).classList.toggle('hidden',!on);
  if(!client){say('authMsg','Bağlantı ayarları yüklenemedi.');return;}
  $('loginBtn').onclick=async()=>{
    try {
      say('authMsg','Giriş yapılıyor…');
      const email = $('email').value.trim();
      const password = $('password').value;
      if(!email || !password) { say('authMsg', 'E-posta ve şifre boş olamaz.'); return; }
      const { error } = await client.auth.signInWithPassword({ email, password });
      if(error) say('authMsg', 'Hata: ' + error.message);
    } catch(err) { say('authMsg', 'Bağlantı hatası: ' + err.message); }
  };
  $('signupBtn').onclick=async()=>{say('authMsg','Hesap oluşturuluyor…');const {data,error}=await client.auth.signUp({email:$('email').value.trim(),password:$('password').value,options:{emailRedirectTo:location.origin+location.pathname}});say('authMsg',error?.message||(data.session?'Hesap oluşturuldu.':'E-posta doğrulama bağlantısı gönderildi. Gelen kutunu kontrol et.'));};
  $('logoutBtn').onclick=()=>client.auth.signOut();
  client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;show('authView',!user);show('appView',!!user);show('logoutBtn',!!user);if(user)loadAll();});
  function setTab(name){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.tabpage').forEach(p=>p.classList.add('hidden'));$(name+'Tab').classList.remove('hidden');}
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  async function loadAll(){
    const [a,b,c]=await Promise.all([client.from('work_types').select('*').order('name'),client.from('tariffs').select('*').order('effective_from',{ascending:false}),client.from('earnings').select('*').order('work_date',{ascending:false}).order('created_at',{ascending:false})]);
    const err=a.error||b.error||c.error;if(err){alert('Veriler alınamadı: '+err.message);return;}types=a.data||[];tariffs=b.data||[];earnings=c.data||[];render();
  }
  function currentTariff(typeId,forDate=today()){return tariffs.filter(t=>t.work_type_id===typeId&&t.effective_from<=forDate).sort((a,b)=>b.effective_from.localeCompare(a.effective_from))[0]||null;}
  function render(){
    const opts='<option value="">İş türü seç</option>'+types.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');$('entryType').innerHTML=opts;$('tariffType').innerHTML=opts;
    $('workDate').value=today();$('tariffDate').value=today();renderStats();renderTypes();renderHistory();calc();renderTariffManagement();renderGoals();
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  $('entryType').onchange=calc;$('quantity').oninput=calc;$('workDate').onchange=calc;
  function calc(){const t=currentTariff($('entryType').value,$('workDate').value||today());const q=Number($('quantity').value||0);if(!t){$('calculated').textContent=money(0);$('rateInfo').textContent='Bu tarih için tarife bulunamadı.';return;}const unit=Number(t.package_price)/Number(t.package_quantity);$('calculated').textContent=money(q*unit);$('rateInfo').textContent=`${t.package_quantity} adet = ${money(t.package_price)} · Birim ${money(unit)}`;}
  
  $('entryForm').onsubmit=async e=>{e.preventDefault();const typeId=$('entryType').value,date=$('workDate').value,q=Number($('quantity').value),t=currentTariff(typeId,date);if(!t){say('entryMsg','Seçilen iş türü ve tarih için tarife yok. Önce tarife ekle.');return;}const unit=Number(t.package_price)/Number(t.package_quantity);const {error}=await client.from('earnings').insert({user_id:user.id,work_type_id:typeId,tariff_id:t.id,quantity:q,unit_rate:unit,total_amount:Number((q*unit).toFixed(2)),work_date:date,note:$('entryNote').value.trim()||null});if(error){say('entryMsg',error.message);return;}say('entryMsg','Kayıt eklendi.');$('quantity').value=1;$('entryNote').value='';await loadAll();};
  $('typeForm').onsubmit=async e=>{e.preventDefault();const name=$('typeName').value.trim();const {error}=await client.from('work_types').insert({user_id:user.id,name});say('typeMsg',error?.message||'İş türü eklendi.');if(!error){$('typeName').value='';await loadAll();}};
  $('tariffForm').onsubmit=async e=>{e.preventDefault();const typeId=$('tariffType').value;const {error}=await client.from('tariffs').insert({user_id:user.id,work_type_id:typeId,package_quantity:Number($('packageQty').value),package_price:Number($('packagePrice').value),effective_from:$('tariffDate').value});say('tariffMsg',error?.message||'Tarife kaydedildi. Eski kayıtların tutarı değişmedi.');if(!error){$('packageQty').value='';$('packagePrice').value='';await loadAll();}};

  function sum(list){return list.reduce((s,x)=>s+Number(x.total_amount),0)}
  
  function renderStats(){
    const d=today(),now=new Date();const monday=new Date(now);monday.setDate(now.getDate()-(now.getDay()+6)%7);const weekStart=`${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;const month=d.slice(0,7);
    const monthTotalVal = sum(earnings.filter(x=>x.work_date.startsWith(month)));
    
    $('todayTotal').textContent=money(sum(earnings.filter(x=>x.work_date===d)));
    $('weekTotal').textContent=money(sum(earnings.filter(x=>x.work_date>=weekStart&&x.work_date<=d)));
    $('monthTotal').textContent=money(monthTotalVal);
    $('allTotal').textContent=money(sum(earnings));

    renderReport();
  }
  
  function renderGoals(){
    const goalNum = Number(monthlyGoal);
    const d=today(), month = d.slice(0, 7);
    const monthTotalVal = sum(earnings.filter(x=>x.work_date.startsWith(month)));
    const percentage = goalNum > 0 ? Math.min(100, Math.round((monthTotalVal / goalNum) * 100)) : 0;
    
    $('monthlyGoalText').textContent = `${money(monthTotalVal)} / ${money(goalNum)}`;
    $('goalPercentage').textContent = `%${percentage} Tamamlandı`;
    $('goalProgressBar').style.width = `${percentage}%`;

    const rows = types.map(t=>{
      const tar = currentTariff(t.id);
      if(!tar || Number(tar.package_quantity)<=0 || Number(tar.package_price)<=0){
        return `<div class="item"><div><strong>${escapeHtml(t.name)}</strong><small>Aktif tarife bulunamadı</small></div><span class="amount">—</span></div>`;
      }
      const unitPrice = Number(tar.package_price) / Number(tar.package_quantity);
      if(unitPrice <= 0) return '';

      const totalUnitsNeededMonthly = goalNum / unitPrice;
      const weeklyUnitsNeeded = totalUnitsNeededMonthly / 4.29; // Aylık ortalama hafta sayısı baz alınarak
      const dailyUnitsNeeded = totalUnitsNeededMonthly / 30; // 30 gün baz alınarak

      return `<div class="item" style="flex-direction:column; align-items:flex-start; gap:6px;">
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
          <strong>${escapeHtml(t.name)}</strong>
          <span class="amount" style="font-size:0.95rem;">Birim: ${money(unitPrice)}</span>
        </div>
        <div style="color:var(--muted); font-size:0.85rem; display:flex; flex-direction:column; gap:3px; width:100%; margin-top:2px;">
          <div>📅 <strong>Ayda girmem gereken:</strong> ${totalUnitsNeededMonthly.toFixed(1)} adet</div>
          <div>📆 <strong>Haftada girmem gereken:</strong> ${weeklyUnitsNeeded.toFixed(1)} adet</div>
          <div>☀️ <strong>Günde girmem gereken:</strong> ${dailyUnitsNeeded.toFixed(1)} adet</div>
        </div>
      </div>`;
    }).join('');

    $('goalBreakdownRows').innerHTML = rows || '<p class="muted">Henüz iş türü veya tarife eklenmemiş.</p>';
  }

  }

  $('reportPeriod').onchange=renderReport;
  function renderReport(){const mode=$('reportPeriod').value,d=today(),year=d.slice(0,4),month=d.slice(0,7);let list=earnings.filter(x=>mode==='all'||(mode==='day'&&x.work_date===d)||(mode==='month'&&x.work_date.startsWith(month))||(mode==='year'&&x.work_date.startsWith(year)));if(mode==='week'){const n=new Date();n.setDate(n.getDate()-(n.getDay()+6)%7);const start=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;list=earnings.filter(x=>x.work_date>=start&&x.work_date<=d);} $('reportTotal').textContent=money(sum(list));$('reportLabel').textContent=({day:'Bugünün toplamı',week:'Bu haftanın toplamı',month:'Bu ayın toplamı',year:'Bu yılın toplamı',all:'Tüm zamanlar'})[mode];const groups={};list.forEach(x=>{const k=mode==='day'?x.work_date:mode==='week'?x.work_date:mode==='month'?x.work_date.slice(0,7):mode==='year'?x.work_date.slice(0,7):x.work_date.slice(0,7);groups[k]=(groups[k]||0)+Number(x.total_amount)});$('reportRows').innerHTML=Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).map(([k,v])=>`<div class="item"><div><strong>${escapeHtml(k)}</strong><small>${mode==='day'||mode==='week'?'Günlük toplam':'Dönem toplamı'}</small></div><span class="amount">${money(v)}</span></div>`).join('')||'<p class="muted">Bu dönemde henüz kayıt yok.</p>';}
  
  function renderTypes(){
    const rows=types.map(t=>{
      const tar=currentTariff(t.id);
      const history=tariffs.filter(x=>x.work_type_id===t.id).length;
      return `<div class="item">
        <div>
          <strong>${escapeHtml(t.name)}</strong>
          <small>${tar?`${tar.package_quantity} adet = ${money(tar.package_price)} · ${history} tarife kaydı`:'Henüz tarife yok'}</small>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="amount">${tar?money(Number(tar.package_price)/Number(tar.package_quantity))+'/adet':'—'}</span>
          <button class="ghost small" style="color:#ff7777;" onclick="window.deleteWorkType('${t.id}')">Sil</button>
        </div>
      </div>`
    });
    $('typeRows').innerHTML=rows.join('')||'<p class="muted">Henüz iş türü eklemedin.</p>';
  }

  // İş Türü Silme Fonksiyonu
  window.deleteWorkType = async (id) => {
    if(!confirm('Bu iş türünü silmek istiyor musunuz? Bu türe ait tüm tarifeler ve geçmiş kayıtlar da silinecektir!')) return;
    await client.from('tariffs').delete().eq('work_type_id', id);
    await client.from('earnings').delete().eq('work_type_id', id);
    const {error} = await client.from('work_types').delete().eq('id', id);
    if(error) alert(error.message);
    else await loadAll();
  };

  function renderTariffManagement(){
    const rows = tariffs.map(t=>{
      const type = types.find(z=>z.id===t.work_type_id);
      return `<div class="item">
        <div>
          <strong>${escapeHtml(type?.name || 'Silinmiş İş Türü')} · ${t.package_quantity} adet / ${money(t.package_price)}</strong>
          <small>Geçerlilik: ${dateTR(t.effective_from)}</small>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="secondary small" onclick="window.editTariff('${t.id}')">Düzenle</button>
          <button class="ghost small" style="color:#ff7777;" onclick="window.deleteTariff('${t.id}')">Sil</button>
        </div>
      </div>`;
    }).join('');
    $('tariffManagementRows').innerHTML = rows || '<p class="muted">Kayıtlı tarife bulunmuyor.</p>';
  }

  function renderHistory(){
    const query = ($('historySearch').value||'').toLowerCase();
    const filtered = earnings.filter(x=>{
      const t = types.find(z=>z.id===x.work_type_id);
      const name = (t?.name||'').toLowerCase();
      const note = (x.note||'').toLowerCase();
      const date = x.work_date;
      return name.includes(query) || note.includes(query) || date.includes(query);
    });

    $('historyRows').innerHTML = filtered.map(x=>{
      const t = types.find(z=>z.id===x.work_type_id);
      return `<div class="item">
        <div>
          <strong>${escapeHtml(t?.name||'Silinmiş iş türü')} · ${x.quantity} adet</strong>
          <small>${dateTR(x.work_date)}${x.note?' · '+escapeHtml(x.note):''} · ${money(x.unit_rate)}/adet</small>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="amount">${money(x.total_amount)}</span>
          <button class="secondary small" onclick="window.editEntry('${x.id}')">Düzenle</button>
          <button class="ghost small" style="color:#ff7777;" onclick="window.deleteEntry('${x.id}')">Sil</button>
        </div>
      </div>`;
    }).join('')||'<p class="muted">Eşleşen kayıt bulunamadı.</p>';
  }

  $('historySearch').oninput = renderHistory;

  $('editGoalBtn').onclick = () => {
    const val = prompt('Aylık kazanç hedefinizi girin (TL):', monthlyGoal);
    if(val !== null && !isNaN(val) && Number(val) > 0){
      monthlyGoal = Number(val);
      localStorage.setItem('monthly_goal', monthlyGoal);
      renderGoals();
    }
  };

  window.deleteEntry = async (id) => {
    if(!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    const {error} = await client.from('earnings').delete().eq('id', id);
    if(error) alert(error.message);
    else await loadAll();
  };

  window.editEntry = (id) => {
    const item = earnings.find(x=>x.id===id);
    if(!item) return;
    $('editEntryId').value = item.id;
    $('editQuantity').value = item.quantity;
    $('editWorkDate').value = item.work_date;
    $('editNote').value = item.note || '';
    show('editModal', true);
  };

  $('closeEditModal').onclick = () => show('editModal', false);

  $('editEntryForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = $('editEntryId').value;
    const item = earnings.find(x=>x.id===id);
    const q = Number($('editQuantity').value);
    const date = $('editWorkDate').value;
    const t = currentTariff(item.work_type_id, date);
    
    if(!t){alert('Seçilen tarih için geçerli bir tarife bulunamadı.');return;}
    const unit = Number(t.package_price)/Number(t.package_quantity);
    
    const {error} = await client.from('earnings').update({
      quantity: q,
      tariff_id: t.id,
      unit_rate: unit,
      total_amount: Number((q*unit).toFixed(2)),
      work_date: date,
      note: $('editNote').value.trim()||null
    }).eq('id', id);

    if(error) alert(error.message);
    else {
      show('editModal', false);
      await loadAll();
    }
  };

  window.deleteTariff = async (id) => {
    if(!confirm('Bu tarifeyi silmek istiyor musunuz?')) return;
    const {error} = await client.from('tariffs').delete().eq('id', id);
    if(error) alert(error.message);
    else await loadAll();
  };

  window.editTariff = (id) => {
    const t = tariffs.find(x=>x.id===id);
    if(!t) return;
    $('editTariffId').value = t.id;
    $('editPackageQty').value = t.package_quantity;
    $('editPackagePrice').value = t.package_price;
    $('editTariffDate').value = t.effective_from;
    show('editTariffModal', true);
  };

  $('closeTariffModal').onclick = () => show('editTariffModal', false);

  $('editTariffForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = $('editTariffId').value;
    const {error} = await client.from('tariffs').update({
      package_quantity: Number($('editPackageQty').value),
      package_price: Number($('editPackagePrice').value),
      effective_from: $('editTariffDate').value
    }).eq('id', id);

    if(error) alert(error.message);
    else {
      show('editTariffModal', false);
      await loadAll();
    }
  };

  $('refreshBtn').onclick=loadAll;
  client.auth.getSession().then(({data})=>{if(data.session){user=data.session.user;show('authView',false);show('appView',true);show('logoutBtn',true);loadAll();}});
})();
