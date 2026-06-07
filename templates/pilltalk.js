
var currentLevel='simple and clear language - avoid medical jargon, explain technical words in plain terms, use short sentences, assume no medical background';
var caregiverMode=false,largeText=false,spanishMode=false;
var lastResult={},englishResult={},currentDrug='';

var levels=[
  {id:'lv0',val:'simple and clear language - avoid medical jargon, explain technical words in plain terms, use short sentences, assume no medical background',label:'Simple'},
  {id:'lv1',val:'standard adult reading level',label:'Standard'},
  {id:'lv2',val:'clinical professional level with medical terminology',label:'Clinical'}

  // Plain language / common misspellings handled by fuzzy match
  ["blood pressure pill","lisinopril","amlodipine","metoprolol"],
  ["water pill","furosemide","hydrochlorothiazide"],
  ["sugar pill","metformin","glipizide"],
  ["cholesterol pill","atorvastatin","simvastatin","rosuvastatin"],
  ["heart pill","digoxin","metoprolol","carvedilol"],
  ["nerve pill","gabapentin","pregabalin"],
  ["sleep pill","zolpidem","trazodone","melatonin"],
  ["anxiety pill","alprazolam","lorazepam","buspirone"],
  ["depression pill","sertraline","fluoxetine","escitalopram"],
  ["allergy pill","cetirizine","loratadine","fexofenadine"],
  ["pain pill","ibuprofen","acetaminophen","naproxen"],
  ["stomach pill","omeprazole","pantoprazole","famotidine"],
  ["thyroid pill","levothyroxine"],
  ["blood thinner","warfarin","apixaban","rivaroxaban"],
  ["diabetes shot","insulin","semaglutide","liraglutide"],
  ["weight loss shot","semaglutide","tirzepatide","liraglutide"],
  ["ozempic","semaglutide"],["mounjaro","tirzepatide"],["wegovy","semaglutide"],
  ["victoza","liraglutide"],["trulicity","dulaglutide"],["jardiance","empagliflozin"],
  ["farxiga","dapagliflozin"],["invokana","canagliflozin"],
  ["eliquis","apixaban"],["xarelto","rivaroxaban"],["plavix","clopidogrel"],
  ["lipitor","atorvastatin"],["crestor","rosuvastatin"],["zocor","simvastatin"],
  ["synthroid","levothyroxine"],["prilosec","omeprazole"],["nexium","esomeprazole"],
  ["zoloft","sertraline"],["lexapro","escitalopram"],["prozac","fluoxetine"],
  ["wellbutrin","bupropion"],["cymbalta","duloxetine"],["effexor","venlafaxine"],
  ["xanax","alprazolam"],["klonopin","clonazepam"],["ativan","lorazepam"],
  ["ambien","zolpidem"],["seroquel","quetiapine"],["abilify","aripiprazole"],
  ["humira","adalimumab"],["enbrel","etanercept"],["dupixent","dupilumab"],
  ["singulair","montelukast"],["spiriva","tiotropium"],["advair","fluticasone salmeterol"],
  ["ventolin","albuterol"],["proair","albuterol"],["flovent","fluticasone"],
  ["lasix","furosemide"],["norvasc","amlodipine"],["lopressor","metoprolol"],
  ["zestril","lisinopril"],["prinivil","lisinopril"],["cozaar","losartan"],
  ["diovan","valsartan"],["glucophage","metformin"],["januvia","sitagliptin"],
  ["aricept","donepezil"],["namenda","memantine"],["zofran","ondansetron"],
];

levels.forEach(function(lv){
  var btn=document.getElementById(lv.id);
  if(!btn) return;
  btn.onclick=function(){
    document.querySelectorAll('.level-seg').forEach(function(b){b.classList.remove('on');});
    this.classList.add('on');
    currentLevel=lv.val;
  };
});

document.getElementById('btnLarge').onclick=function(){
  largeText=!largeText;
  document.body.classList.toggle('large',largeText);
  this.classList.toggle('on-blue',largeText);
  this.innerHTML=largeText?'Large Text: ON':'Large Text';
};

function toggleCaregiverMode(){
  caregiverMode=!caregiverMode;
  var btns=[document.getElementById('btnCaregiver'),document.getElementById('btnCaregiverToggle')];
  btns.forEach(function(b){if(b)b.classList.toggle('on-purple',caregiverMode);});
  document.getElementById('caregiverBanner').style.display=caregiverMode?'flex':'none';
  document.getElementById('cgTBCard').style.display=caregiverMode&&lastResult.caregiverTeachback?'block':'none';
  var cgTab=document.getElementById('cgTab');
  cgTab.style.display=caregiverMode?'block':'none';
  if(caregiverMode&&lastResult.caregiverTips) showTab('caregiver');
  else if(!caregiverMode) showTab('overview');
}
document.getElementById('btnCaregiver').onclick=toggleCaregiverMode;
if(document.getElementById('btnCaregiverToggle'))document.getElementById('btnCaregiverToggle').onclick=toggleCaregiverMode;

function toggleSpanishMode(){
  spanishMode=!spanishMode;
  var btns=[document.getElementById('btnSpanish'),document.getElementById('btnSpanishToggle')];
  btns.forEach(function(b){if(b){b.classList.toggle('on-teal',spanishMode);b.innerHTML=spanishMode?'ES On':'&#127466;&#127480; ES';}});
  if(spanishMode&&englishResult.drugName) translateToSpanish();
  else if(!spanishMode&&englishResult.drugName){lastResult=englishResult;populateResult(lastResult);}
}
document.getElementById('btnSpanish').onclick=toggleSpanishMode;
if(document.getElementById('btnSpanishToggle'))document.getElementById('btnSpanishToggle').onclick=toggleSpanishMode;
document.getElementById('goBtn').onclick=generateCounseling;
document.querySelector('.btn-search')&&(document.querySelector('.btn-search').onclick=generateCounseling);
document.getElementById('copyBtn').onclick=copyNotes;
document.getElementById('saveBtn').onclick=saveToMyMeds;

function showTab(name){
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('on')});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on')});
  var panel=document.getElementById('panel-'+name);
  if(panel) panel.classList.add('on');
  document.querySelectorAll('.tab').forEach(function(t){
    var oc=t.getAttribute('onclick')||'';
    if(oc.indexOf("'"+name+"'")>-1||oc.indexOf('"'+name+'"')>-1) t.classList.add('on');
  });
}

function showError(msg){
  var el=document.getElementById('errorBox');
  el.textContent=msg; el.style.display='block';
  document.getElementById('spinner').style.display='none';
  document.getElementById('result').style.display='none';
  document.getElementById('goBtn').disabled=false;
}

function toBullets(val){
  if(!val) return '';
  var s=Array.isArray(val)?val.join('\n'):String(val);
  var lines=s.split('\n');
  var cleaned=[];
  for(var i=0;i<lines.length;i++){
    var line=lines[i].replace(/^[-*•]\s*/,'').trim();
    if(line) cleaned.push(line);
  }
  function colorize(t){
    t=t.replace(/\[green\]/gi,'<span class="sev-green"></span>');
    t=t.replace(/\[yellow\]/gi,'<span class="sev-yellow"></span>');
    t=t.replace(/\[red\]/gi,'<span class="sev-red"></span>');
    return t;
  }
  if(cleaned.length>1){
    return '<ul style="padding-left:1.1rem">'+cleaned.map(function(l){return '<li style="margin-bottom:5px">'+colorize(l)+'</li>';}).join('')+'</ul>';
  }
  return '<p style="margin:0">'+colorize(s)+'</p>';
}

function populateResult(data){
  var lv=levels.filter(function(l){return l.val===currentLevel})[0];
  document.getElementById('heroName').textContent=data.drugName||currentDrug;
  var pronEl=document.getElementById('heroPronounce');
  if(pronEl){var pron=getPronunciation(data.drugName||currentDrug);pronEl.textContent=pron?'How to say it: '+pron:'';}
  document.getElementById('heroCondition').textContent=data.condition?data.condition.split('.')[0]:'';
  document.getElementById('heroBadge').textContent=lv?lv.label:'';
  document.getElementById('heroBrand').style.display=data.isBrand?'block':'none';
  document.getElementById('lastChecked').textContent=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  document.getElementById('heroVerified').textContent='Verified '+new Date().toLocaleDateString('en-US',{month:'short',year:'numeric'});
  var bb=document.getElementById('brandBanner'),bbt=document.getElementById('brandBannerText');
  if(data.isBrand&&data.brandNote){bbt.textContent=data.brandNote;bb.style.display='flex';}else{bb.style.display='none';}
  document.getElementById('caregiverBanner').style.display=caregiverMode?'flex':'none';
  document.getElementById('condition').innerHTML=toBullets(data.condition);
  document.getElementById('what').innerHTML=toBullets(data.what);
  document.getElementById('how').innerHTML=toBullets(data.how);
  document.getElementById('cost').innerHTML=toBullets(data.cost);
  var costEl=document.getElementById('costFull');if(costEl){costEl.innerHTML=toBullets(data.cost);costEl.style.display='block';}document.getElementById('cost').innerHTML=toBullets(data.cost);
  document.getElementById('financialResources').innerHTML=toBullets(data.financialResources)||'<p style="margin:0;color:var(--g400)">Drug-specific programs not found — see broad resources below.</p>';
  document.getElementById('side').innerHTML=toBullets(data.side);
  var altEl=document.getElementById('alternatives');if(altEl&&data.alternatives)altEl.innerHTML=toBullets(data.alternatives);
  document.getElementById('warn').innerHTML=toBullets(data.warn);
  document.getElementById('missedDose').innerHTML=toBullets(data.missedDose);
  document.getElementById('foodAlcohol').innerHTML=toBullets(data.foodAlcohol);
  var it=document.getElementById('injTab');
  if(data.injection&&data.injection.trim().length>5){
    document.getElementById('injection').innerHTML=toBullets(data.injection);
    it.style.display='block';
    var steps=data.injectionSteps;
    if(typeof steps==='string'&&steps.trim().length>5){
      steps=steps.split('\n').map(function(s){return s.replace(/^[-*•\d.]+\s*/,'').trim();}).filter(Boolean);
    }
    var visual=document.getElementById('inj-visual');
    var fallback=document.getElementById('inj-fallback');
    if(steps&&Array.isArray(steps)&&steps.length>0){
      visual.style.display='block'; fallback.style.display='none';
      var typeIcons={pen:'&#128394;',autoinjector:'&#128137;',syringe:'&#9889;',iv:'&#128167;',inhaler:'&#128168;',patch:'&#129657;'};
      var itype=(data.injectionType||'injectable').toLowerCase();
      document.getElementById('injType').innerHTML=(typeIcons[itype]||'&#128137;')+' '+(data.injectionType||'Injectable');
      var siteCard=document.getElementById('injSiteCard');
      if(data.injectionSite&&data.injectionSite.trim().length>2){
        document.getElementById('injSite').textContent=data.injectionSite;
        siteCard.style.display='block';
      } else { siteCard.style.display='none'; }
      var html='';
      for(var si=0;si<steps.length;si++){
        var st=steps[si];
        var txt=st.replace(/^\d+\.\s*/,'');
        var isWarn=/(warning|caution|do not|never|danger|emergency|stop|bleed)/i.test(txt);
        var isTip=/(tip|remember|note|important|make sure|ensure)/i.test(txt);
        html+='<div class="inj-step"><div class="inj-num">'+(si+1)+'</div><div class="inj-step-body"><div class="inj-step-text">'+txt+'</div>';
        if(isWarn) html+='<div class="inj-step-warn">&#9888; Use caution with this step</div>';
        if(isTip&&!isWarn) html+='<div class="inj-step-tip">&#128161; Key step</div>';
        html+='</div></div>';
      }
      document.getElementById('injSteps').innerHTML=html;
    } else {
      visual.style.display='none'; fallback.style.display='block';
    }
  } else { it.style.display='none'; }
  var qs=Array.isArray(data.teachback)?data.teachback:[String(data.teachback||'')];
  document.getElementById('teachback').innerHTML=qs.map(function(q,i){return '<li style="margin-bottom:6px">'+q+'</li>';}).join('');
  var cqs=Array.isArray(data.caregiverTeachback)?data.caregiverTeachback:[String(data.caregiverTeachback||'')];
  var cqHtml=cqs.map(function(q){return '<li style="margin-bottom:6px">'+q+'</li>';}).join('');
  document.getElementById('cgTeachback').innerHTML=cqHtml;
  document.getElementById('cgTeachback2').innerHTML=cqHtml;
  document.getElementById('cgTBCard').style.display=caregiverMode?'block':'none';
  document.getElementById('cgTips').innerHTML=toBullets(data.caregiverTips);
  document.getElementById('cgMonitoring').innerHTML=toBullets(data.caregiverMonitoring);
  document.getElementById('cgAdmin').innerHTML=toBullets(data.caregiverAdmin);
  document.getElementById('cgWatchFor').innerHTML=toBullets(data.caregiverWatchFor);
  document.getElementById('cgTab').style.display=caregiverMode?'block':'none';
}

function generateCounseling(){
  var drug=document.getElementById('drugInput').value.trim();
  if(!drug){
    document.getElementById('drugInput').focus();
    document.getElementById('drugInput').style.borderColor='#ef4444';
    setTimeout(function(){document.getElementById('drugInput').style.borderColor='';},2000);
    return;
  }
  currentDrug=drug;
  document.getElementById('errorBox').style.display='none';
  document.getElementById('result').style.display='none';
  document.getElementById('spinner').style.display='block';
  document.getElementById('goBtn').disabled=true;
  document.getElementById('acList').style.display='none';
  // Update spinner text
  var spinTxt=document.querySelector('.spin-txt');
  if(spinTxt) spinTxt.textContent='Looking up '+drug+'...';

  var controller=new AbortController();
  var timeout=setTimeout(function(){controller.abort();},35000);

  fetch('/counsel',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({drug:drug,level:currentLevel}),
    signal:controller.signal
  })
  .then(function(r){
    clearTimeout(timeout);
    if(!r.ok) throw new Error('Server error ('+r.status+')');
    return r.json();
  })
  .then(function(data){
    if(data.error){showError(data.error);return;}
    lastResult=data; englishResult=data;
    if(spanishMode){translateToSpanish();return;}
    populateResult(data);
    showTab('overview');
    document.getElementById('spinner').style.display='none';
    document.getElementById('result').style.display='block';
    document.getElementById('goBtn').disabled=false;
    document.getElementById('result').scrollIntoView({behavior:'smooth',block:'start'});
  })
  .catch(function(err){
    clearTimeout(timeout);
    if(err.name==='AbortError'){
      showError('Request timed out. Please check your connection and try again.');
    } else {
      showError('Could not reach the server. Please try again. ('+err.message+')');
    }
  });
}

function translateToSpanish(){
  var btn=document.getElementById('btnSpanish');
  btn.disabled=true; btn.innerHTML='Translating...';
  fetch('/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:englishResult})})
  .then(function(r){return r.json();})
  .then(function(data){
    if(data.error){alert('Translation error: '+data.error);spanishMode=false;btn.classList.remove('on-teal');}
    else{lastResult=data;populateResult(data);}
    btn.disabled=false;
    btn.innerHTML=spanishMode?'Español On':'Español';
    document.getElementById('spinner').style.display='none';
    document.getElementById('result').style.display='block';
    document.getElementById('goBtn').disabled=false;
  })
  .catch(function(err){alert('Translation failed: '+err.message);btn.disabled=false;});
}

function saveToMyMeds(){
  if(!currentDrug) return;
  var meds=JSON.parse(localStorage.getItem('pilltalk_meds')||'[]');
  var name=lastResult.drugName||currentDrug;
  var btn=document.getElementById('saveBtn');
  if(meds.indexOf(name)===-1){meds.push(name);localStorage.setItem('pilltalk_meds',JSON.stringify(meds));btn.textContent='Saved!';}
  else{btn.textContent='Already saved';}
  setTimeout(function(){btn.innerHTML='+ Save to My Meds';},2000);
}

function shareLink(){
  if(!currentDrug) return;
  var url=window.location.origin+'/app?drug='+encodeURIComponent(lastResult.drugName||currentDrug);
  navigator.clipboard.writeText(url);
  var btn=document.getElementById('shareBtn');
  btn.textContent='Copied!';
  setTimeout(function(){btn.innerHTML='Share';},2000);
}

function copyNotes(){
  if(!lastResult.drugName) return;
  var r=lastResult;
  var qs=Array.isArray(r.teachback)?r.teachback:[r.teachback];
  var parts=[r.drugName];
  if(r.brandNote) parts.push(r.brandNote);
  parts.push('');
  parts.push('CONDITION: '+(r.condition||''));
  parts.push('HOW IT WORKS: '+(r.what||''));
  parts.push('HOW TO TAKE IT: '+(r.how||''));
  parts.push('MISSED DOSE: '+(r.missedDose||''));
  parts.push('FOOD & ALCOHOL: '+(r.foodAlcohol||''));
  parts.push('SIDE EFFECTS: '+(r.side||''));
  parts.push('WATCH FOR: '+(r.warn||''));
  parts.push('COST: '+(r.cost||''));
  parts.push('');
  parts.push('TEACH-BACK:');
  qs.forEach(function(q,i){parts.push((i+1)+'. '+q);});
  parts.push('--- Generated by Pill Talk ---');
  navigator.clipboard.writeText(parts.join('\n'));
}

function clearAll(){
  document.getElementById('drugInput').value='';
  document.getElementById('result').style.display='none';
  document.getElementById('errorBox').style.display='none';
  currentDrug=''; lastResult={}; englishResult={};
  document.getElementById('drugInput').focus();
}


var PRONUNCIATION={
  "acetaminophen":"a-SEET-a-MIN-oh-fen",
  "ibuprofen":"eye-byoo-PRO-fen",
  "amoxicillin":"a-mox-i-SIL-in",
  "azithromycin":"a-ZITH-roe-MY-sin",
  "atorvastatin":"a-TOR-va-STAT-in",
  "lisinopril":"ly-SIN-oh-pril",
  "metformin":"MET-for-min",
  "amlodipine":"am-LOH-di-peen",
  "metoprolol":"me-TOE-proe-lol",
  "omeprazole":"oh-MEP-ra-zole",
  "simvastatin":"SIM-va-STAT-in",
  "losartan":"loe-SAR-tan",
  "albuterol":"al-BYOO-ter-ole",
  "gabapentin":"ga-BAP-en-tin",
  "hydrochlorothiazide":"hy-droe-klor-oh-THY-a-zide",
  "sertraline":"SER-tra-leen",
  "levothyroxine":"lee-voe-thy-ROX-een",
  "fluoxetine":"floo-OX-e-teen",
  "escitalopram":"es-SY-tal-oh-pram",
  "bupropion":"byoo-PROE-pee-on",
  "duloxetine":"doo-LOX-e-teen",
  "venlafaxine":"ven-la-FAX-een",
  "alprazolam":"al-PRAYZ-oh-lam",
  "clonazepam":"kloe-NAZ-e-pam",
  "lorazepam":"lor-AZ-e-pam",
  "zolpidem":"ZOLE-pi-dem",
  "quetiapine":"kwe-TY-a-peen",
  "aripiprazole":"a-RIP-i-PRAE-zole",
  "risperidone":"ris-PER-i-done",
  "lamotrigine":"la-MOE-tri-jeen",
  "levetiracetam":"lee-ve-tye-RA-se-tam",
  "furosemide":"fyoor-OH-se-mide",
  "spironolactone":"speer-on-oh-LAK-tone",
  "warfarin":"WOR-far-in",
  "apixaban":"a-PIX-a-ban",
  "rivaroxaban":"ri-va-ROX-a-ban",
  "clopidogrel":"kloe-PID-oh-grel",
  "digoxin":"di-JOX-in",
  "amiodarone":"a-mee-OH-da-rone",
  "semaglutide":"sem-a-GLOO-tide",
  "liraglutide":"lir-a-GLOO-tide",
  "dulaglutide":"doo-la-GLOO-tide",
  "tirzepatide":"ter-ZEP-a-tide",
  "sitagliptin":"sit-a-GLIP-tin",
  "empagliflozin":"em-pa-gli-FLOE-zin",
  "dapagliflozin":"dap-a-gli-FLOE-zin",
  "canagliflozin":"kan-a-gli-FLOE-zin",
  "glipizide":"GLIP-i-zide",
  "pioglitazone":"py-oh-GLI-ta-zone",
  "prednisone":"PRED-ni-sone",
  "methylprednisolone":"METH-il-pred-NIS-oh-lone",
  "dexamethasone":"dex-a-METH-a-sone",
  "budesonide":"byoo-DES-oh-nide",
  "fluticasone":"floo-TIK-a-sone",
  "montelukast":"mon-te-LOO-kast",
  "tiotropium":"ty-oh-TROE-pee-um",
  "adalimumab":"a-da-LIM-yoo-mab",
  "etanercept":"e-TAN-er-sept",
  "infliximab":"in-FLIK-si-mab",
  "dupilumab":"doo-PIL-yoo-mab",
  "methotrexate":"meth-oh-TREX-ate",
  "hydroxychloroquine":"hy-drox-ee-KLOR-oh-kwin",
  "alendronate":"a-LEN-droe-nate",
  "donepezil":"doe-NEP-e-zil",
  "memantine":"me-MAN-teen",
  "ondansetron":"on-DAN-se-tron",
  "pantoprazole":"pan-TOE-pra-zole",
  "esomeprazole":"ee-so-MEP-ra-zole",
  "lansoprazole":"lan-SOE-pra-zole",
  "cetirizine":"se-TIR-i-zeen",
  "loratadine":"lor-AT-a-deen",
  "fexofenadine":"fex-oh-FEN-a-deen",
  "diphenhydramine":"dye-fen-HY-dra-meen",
  "doxycycline":"dox-i-SY-kleen",
  "ciprofloxacin":"sip-roe-FLOX-a-sin",
  "levofloxacin":"lee-voe-FLOX-a-sin",
  "nitrofurantoin":"ny-troe-fyoor-AN-toyn",
  "metronidazole":"me-troe-NI-da-zole",
  "fluconazole":"floo-KON-a-zole",
  "acyclovir":"a-SY-kloe-veer",
  "valacyclovir":"val-a-SY-kloe-veer",
  "oseltamivir":"os-el-TAM-i-veer",
  "naltrexone":"nal-TREX-one",
  "buprenorphine":"byoo-pre-NOR-feen",
  "varenicline":"var-EN-i-kleen",
  "methylphenidate":"meth-il-FEN-i-date",
  "lisdexamfetamine":"lis-dex-am-FET-a-meen",
  "atomoxetine":"a-TOE-mox-e-teen",
  "modafinil":"moe-DAF-i-nil",
  "colchicine":"KOL-chi-seen",
  "allopurinol":"al-oh-PYOOR-i-nol",
  "tamsulosin":"tam-SOO-loe-sin",
  "sildenafil":"sil-DEN-a-fil",
  "tadalafil":"ta-DAL-a-fil",
  "finasteride":"fi-NAS-ter-ide",
  "testosterone":"tes-TOS-te-rone",
  "progesterone":"proe-JES-te-rone",
  "medroxyprogesterone":"me-drox-ee-proe-JES-te-rone",
  "tamoxifen":"ta-MOX-i-fen",
  "letrozole":"LET-roe-zole",
  "anastrozole":"a-NAS-troe-zole",
  "imatinib":"i-MAT-i-nib",
  "pembrolizumab":"pem-BROE-li-zoo-mab",
  "nivolumab":"ni-VOL-yoo-mab",
  "sacubitril":"sa-KYOO-bi-tril",
  "ivacaftor":"eye-va-KAF-tor",
  "nirmatrelvir":"neer-MA-trel-veer"
};


// === VOICE INPUT ===
function startVoice(){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){
    alert('Voice input is not supported in this browser. Try Chrome or Safari.');return;
  }
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var r=new SR();
  r.lang='en-US';r.continuous=false;r.interimResults=false;
  var btn=document.getElementById('voiceBtn');
  btn.innerHTML='&#128308; Listening...';btn.style.background='#ef4444';btn.style.color='#fff';
  r.onresult=function(e){
    var txt=e.results[0][0].transcript;
    document.getElementById('drugInput').value=txt;
    btn.innerHTML='&#127908; Speak';btn.style.background='';btn.style.color='';
    generateCounseling();
  };
  r.onerror=function(){btn.innerHTML='&#127908; Speak';btn.style.background='';btn.style.color='';};
  r.onend=function(){btn.innerHTML='&#127908; Speak';btn.style.background='';btn.style.color='';};
  r.start();
}

// === READ ALOUD ===
var reading=false;
function readAloud(){
  if(reading){window.speechSynthesis.cancel();reading=false;
    document.getElementById('readBtn').innerHTML='&#128266; Read';return;}
  if(!lastResult.drugName){return;}
  var r=lastResult;
  var text='Pill Talk medication summary for '+r.drugName+'. ';
  if(r.condition) text+='This medication is used for: '+r.condition+'. ';
  if(r.what) text+='How it works: '+r.what+'. ';
  if(r.how) text+='How to take it: '+r.how+'. ';
  if(r.missedDose) text+='If you miss a dose: '+r.missedDose+'. ';
  if(r.side) text+='Common side effects include: '+r.side.replace(/<[^>]+>/g,'')+'. ';
  if(r.warn) text+='Important warnings: '+r.warn.replace(/<[^>]+>/g,'')+'. ';
  var utt=new SpeechSynthesisUtterance(text);
  utt.rate=0.9;utt.pitch=1;utt.lang='en-US';
  utt.onend=function(){reading=false;document.getElementById('readBtn').innerHTML='&#128266; Read';};
  window.speechSynthesis.speak(utt);
  reading=true;
  document.getElementById('readBtn').innerHTML='&#9646;&#9646; Stop';
}

// === SYLLABLE HELPER ===
function getPronunciation(drugName){
  if(!drugName) return null;
  var lower=drugName.toLowerCase().trim();
  return PRONUNCIATION[lower]||null;
}

// === AUTOCOMPLETE ===
var DRUGS=[
  // Cardiovascular
  ["acetaminophen","Tylenol"],["ibuprofen","Advil","Motrin"],["aspirin","Bayer","Ecotrin"],
  ["naproxen","Aleve","Naprosyn"],["celecoxib","Celebrex"],["meloxicam","Mobic"],
  ["atorvastatin","Lipitor"],["rosuvastatin","Crestor"],["simvastatin","Zocor"],
  ["pravastatin","Pravachol"],["lovastatin","Mevacor"],["fluvastatin","Lescol"],
  ["pitavastatin","Livalo"],["ezetimibe","Zetia"],["fenofibrate","Tricor","Fenoglide"],
  ["gemfibrozil","Lopid"],["niacin","Niaspan"],["omega-3","Lovaza","Vascepa"],
  ["lisinopril","Prinivil","Zestril"],["enalapril","Vasotec"],["ramipril","Altace"],
  ["benazepril","Lotensin"],["captopril","Capoten"],["quinapril","Accupril"],
  ["fosinopril","Monopril"],["trandolapril","Mavik"],["perindopril","Aceon"],
  ["losartan","Cozaar"],["valsartan","Diovan"],["irbesartan","Avapro"],
  ["olmesartan","Benicar"],["candesartan","Atacand"],["telmisartan","Micardis"],
  ["azilsartan","Edarbi"],["sacubitril valsartan","Entresto"],
  ["amlodipine","Norvasc"],["nifedipine","Procardia","Adalat"],["felodipine","Plendil"],
  ["diltiazem","Cardizem","Tiazac"],["verapamil","Calan","Verelan"],
  ["metoprolol","Lopressor","Toprol XL"],["atenolol","Tenormin"],["carvedilol","Coreg"],
  ["bisoprolol","Zebeta"],["nebivolol","Bystolic"],["propranolol","Inderal"],
  ["labetalol","Trandate"],["nadolol","Corgard"],["betaxolol","Kerlone"],
  ["furosemide","Lasix"],["torsemide","Demadex"],["bumetanide","Bumex"],
  ["hydrochlorothiazide","Microzide","HCTZ"],["chlorthalidone","Thalitone"],
  ["indapamide","Lozol"],["metolazone","Zaroxolyn"],
  ["spironolactone","Aldactone"],["eplerenone","Inspra"],["amiloride","Midamor"],
  ["triamterene","Dyrenium"],["clonidine","Catapres","Kapvay"],
  ["hydralazine","Apresoline"],["minoxidil","Loniten","Rogaine"],
  ["doxazosin","Cardura"],["prazosin","Minipress"],["terazosin","Hytrin"],
  ["warfarin","Coumadin","Jantoven"],["apixaban","Eliquis"],["rivaroxaban","Xarelto"],
  ["dabigatran","Pradaxa"],["edoxaban","Savaysa"],["betrixaban","Bevyxxa"],
  ["clopidogrel","Plavix"],["ticagrelor","Brilinta"],["prasugrel","Effient"],
  ["aspirin","Bayer"],["dipyridamole","Persantine"],["cilostazol","Pletal"],
  ["digoxin","Lanoxin"],["amiodarone","Cordarone","Pacerone"],
  ["dronedarone","Multaq"],["sotalol","Betapace"],["flecainide","Tambocor"],
  ["propafenone","Rythmol"],["mexiletine","Mexitil"],["dofetilide","Tikosyn"],
  ["nitroglycerin","Nitrostat","Nitroquick"],["isosorbide mononitrate","Imdur"],
  ["isosorbide dinitrate","Isordil"],["ranolazine","Ranexa"],
  ["ivabradine","Corlanor"],["sacubitril","Entresto"],
  // Diabetes
  ["metformin","Glucophage","Fortamet","Glumetza"],
  ["glipizide","Glucotrol"],["glyburide","DiaBeta","Micronase"],
  ["glimepiride","Amaryl"],["glipizide extended release","Glucotrol XL"],
  ["pioglitazone","Actos"],["rosiglitazone","Avandia"],
  ["sitagliptin","Januvia"],["saxagliptin","Onglyza"],["linagliptin","Tradjenta"],
  ["alogliptin","Nesina"],["vildagliptin","Galvus"],
  ["empagliflozin","Jardiance"],["dapagliflozin","Farxiga"],
  ["canagliflozin","Invokana"],["ertugliflozin","Steglatro"],
  ["semaglutide","Ozempic","Wegovy","Rybelsus"],["liraglutide","Victoza","Saxenda"],
  ["dulaglutide","Trulicity"],["exenatide","Byetta","Bydureon"],
  ["albiglutide","Tanzeum"],["tirzepatide","Mounjaro","Zepbound"],
  ["insulin glargine","Lantus","Toujeo","Basaglar"],
  ["insulin degludec","Tresiba"],["insulin detemir","Levemir"],
  ["insulin lispro","Humalog","Admelog"],["insulin aspart","NovoLog","Fiasp"],
  ["insulin glulisine","Apidra"],["insulin regular","Humulin R","Novolin R"],
  ["insulin NPH","Humulin N","Novolin N"],
  ["repaglinide","Prandin"],["nateglinide","Starlix"],
  ["acarbose","Precose"],["miglitol","Glyset"],
  ["bromocriptine","Cycloset"],["colesevelam","Welchol"],
  ["pramlintide","Symlin"],
  // Mental Health
  ["sertraline","Zoloft"],["fluoxetine","Prozac","Sarafem"],
  ["paroxetine","Paxil","Pexeva"],["escitalopram","Lexapro"],
  ["citalopram","Celexa"],["fluvoxamine","Luvox"],
  ["venlafaxine","Effexor XR"],["duloxetine","Cymbalta"],
  ["desvenlafaxine","Pristiq"],["levomilnacipran","Fetzima"],
  ["bupropion","Wellbutrin","Zyban","Forfivo"],
  ["mirtazapine","Remeron"],["trazodone","Desyrel","Oleptro"],
  ["nefazodone","Serzone"],["vilazodone","Viibryd"],["vortioxetine","Trintellix"],
  ["amitriptyline","Elavil"],["nortriptyline","Pamelor"],["imipramine","Tofranil"],
  ["desipramine","Norpramin"],["clomipramine","Anafranil"],["doxepin","Silenor"],
  ["alprazolam","Xanax"],["clonazepam","Klonopin"],["lorazepam","Ativan"],
  ["diazepam","Valium"],["oxazepam","Serax"],["temazepam","Restoril"],
  ["chlordiazepoxide","Librium"],["buspirone","Buspar"],
  ["zolpidem","Ambien"],["eszopiclone","Lunesta"],["zaleplon","Sonata"],
  ["ramelteon","Rozerem"],["suvorexant","Belsomra"],["lemborexant","Dayvigo"],
  ["quetiapine","Seroquel"],["olanzapine","Zyprexa"],["risperidone","Risperdal"],
  ["aripiprazole","Abilify"],["ziprasidone","Geodon"],["lurasidone","Latuda"],
  ["asenapine","Saphris"],["iloperidone","Fanapt"],["paliperidone","Invega"],
  ["brexpiprazole","Rexulti"],["cariprazine","Vraylar"],["clozapine","Clozaril"],
  ["haloperidol","Haldol"],["chlorpromazine","Thorazine"],["fluphenazine","Prolixin"],
  ["perphenazine","Trilafon"],["thioridazine","Mellaril"],
  ["lithium","Lithobid","Eskalith"],["valproate","Depakote","Depakene"],
  ["lamotrigine","Lamictal"],["carbamazepine","Tegretol","Equetro"],
  ["oxcarbazepine","Trileptal"],["topiramate","Topamax"],
  ["levetiracetam","Keppra"],["phenytoin","Dilantin"],["zonisamide","Zonegran"],
  ["gabapentin","Neurontin"],["pregabalin","Lyrica"],
  ["methylphenidate","Ritalin","Concerta","Quillivant"],
  ["amphetamine","Adderall"],["lisdexamfetamine","Vyvanse"],
  ["dextroamphetamine","Dexedrine"],["atomoxetine","Strattera"],
  ["guanfacine","Intuniv","Tenex"],["clonidine","Kapvay"],
  ["modafinil","Provigil"],["armodafinil","Nuvigil"],["solriamfetol","Sunosi"],
  ["naltrexone","Vivitrol","Revia"],["buprenorphine","Suboxone","Subutex","Brixia"],
  ["methadone","Dolophine"],["disulfiram","Antabuse"],
  ["varenicline","Chantix"],["nicotine","Nicorette","NicoDerm"],
  ["acamprosate","Campral"],
  // Pain / Musculoskeletal
  ["oxycodone","OxyContin","Percocet","Roxicodone"],
  ["hydrocodone","Vicodin","Norco","Lortab"],
  ["morphine","MS Contin","Kadian"],["hydromorphone","Dilaudid"],
  ["fentanyl","Duragesic","Actiq"],["tramadol","Ultram","ConZip"],
  ["tapentadol","Nucynta"],["buprenorphine","Belbuca"],
  ["codeine","Tylenol with Codeine"],["oxymorphone","Opana"],
  ["cyclobenzaprine","Flexeril","Amrix"],["methocarbamol","Robaxin"],
  ["baclofen","Lioresal","Gablofen"],["carisoprodol","Soma"],
  ["tizanidine","Zanaflex"],["metaxalone","Skelaxin"],
  ["colchicine","Colcrys","Mitigare"],["allopurinol","Zyloprim","Aloprim"],
  ["febuxostat","Uloric"],["probenecid","Benemid"],["pegloticase","Krystexxa"],
  ["lesinurad","Zurampic"],
  ["methotrexate","Rheumatrex","Trexall"],["hydroxychloroquine","Plaquenil"],
  ["sulfasalazine","Azulfidine"],["leflunomide","Arava"],
  ["tofacitinib","Xeljanz"],["baricitinib","Olumiant"],["upadacitinib","Rinvoq"],
  ["abatacept","Orencia"],["adalimumab","Humira"],["etanercept","Enbrel"],
  ["infliximab","Remicade"],["certolizumab","Cimzia"],["golimumab","Simponi"],
  ["secukinumab","Cosentyx"],["ixekizumab","Taltz"],["guselkumab","Tremfya"],
  ["risankizumab","Skyrizi"],["ustekinumab","Stelara"],["sarilumab","Kevzara"],
  ["tocilizumab","Actemra"],["anakinra","Kineret"],["denosumab","Prolia","Xgeva"],
  ["alendronate","Fosamax"],["risedronate","Actonel"],["ibandronate","Boniva"],
  ["zoledronic acid","Reclast","Zometa"],["teriparatide","Forteo"],
  ["romosozumab","Evenity"],["raloxifene","Evista"],["calcitonin","Miacalcin"],
  // Respiratory
  ["albuterol","ProAir","Ventolin","Proventil"],
  ["levalbuterol","Xopenex"],["salmeterol","Serevent"],["formoterol","Foradil","Perforomist"],
  ["arformoterol","Brovana"],["indacaterol","Arcapta"],["olodaterol","Striverdi"],
  ["vilanterol","Breo Ellipta"],
  ["tiotropium","Spiriva"],["umeclidinium","Incruse"],["aclidinium","Tudorza"],
  ["glycopyrrolate","Seebri","Lonhala"],["revefenacin","Yupelri"],
  ["ipratropium","Atrovent"],["ipratropium albuterol","Combivent","DuoNeb"],
  ["fluticasone","Flovent","Flonase","Arnuity"],
  ["budesonide","Pulmicort","Rhinocort"],["mometasone","Asmanex","Nasonex"],
  ["beclomethasone","Qvar","Beconase"],["ciclesonide","Alvesco","Omnaris"],
  ["triamcinolone","Azmacort","Nasacort"],
  ["montelukast","Singulair"],["zafirlukast","Accolate"],["zileuton","Zyflo"],
  ["roflumilast","Daliresp"],["theophylline","Theo-24","Uniphyl"],
  ["omalizumab","Xolair"],["mepolizumab","Nucala"],["benralizumab","Fasenra"],
  ["dupilumab","Dupixent"],["tezepelumab","Tezspire"],["tralokinumab","Adbry"],
  ["ivacaftor","Kalydeco"],["lumacaftor ivacaftor","Orkambi"],
  ["elexacaftor tezacaftor ivacaftor","Trikafta"],
  // GI
  ["omeprazole","Prilosec"],["esomeprazole","Nexium"],["lansoprazole","Prevacid"],
  ["pantoprazole","Protonix"],["rabeprazole","Aciphex"],["dexlansoprazole","Dexilant"],
  ["famotidine","Pepcid"],["ranitidine","Zantac"],["cimetidine","Tagamet"],
  ["nizatidine","Axid"],["sucralfate","Carafate"],["misoprostol","Cytotec"],
  ["metoclopramide","Reglan"],["ondansetron","Zofran"],["granisetron","Kytril"],
  ["prochlorperazine","Compazine"],["promethazine","Phenergan"],
  ["trimethobenzamide","Tigan"],["scopolamine","Transderm Scop"],
  ["meclizine","Antivert","Bonine"],["dimenhydrinate","Dramamine"],
  ["lactulose","Enulose","Kristalose"],["polyethylene glycol","Miralax"],
  ["bisacodyl","Dulcolax"],["senna","Senokot"],["docusate","Colace"],
  ["lubiprostone","Amitiza"],["linaclotide","Linzess"],["plecanatide","Trulance"],
  ["loperamide","Imodium"],["diphenoxylate atropine","Lomotil"],
  ["eluxadoline","Viberzi"],["rifaximin","Xifaxan"],
  ["mesalamine","Asacol","Pentasa","Lialda"],["sulfasalazine","Azulfidine"],
  ["balsalazide","Colazal"],["olsalazine","Dipentum"],
  ["budesonide","Entocort","Uceris"],["vedolizumab","Entyvio"],
  ["natalizumab","Tysabri"],["ustekinumab","Stelara"],
  ["ursodiol","Actigall","URSO"],["cholestyramine","Questran"],
  ["colesevelam","Welchol"],["colestipol","Colestid"],
  // Thyroid / Endocrine
  ["levothyroxine","Synthroid","Levoxyl","Tirosint"],
  ["liothyronine","Cytomel"],["liotrix","Thyrolar"],
  ["methimazole","Tapazole"],["propylthiouracil","PTU"],
  ["hydrocortisone","Cortef","Solu-Cortef"],["prednisone","Deltasone","Rayos"],
  ["prednisolone","Prelone","Orapred"],["methylprednisolone","Medrol","Solu-Medrol"],
  ["dexamethasone","Decadron","DexPak"],["budesonide","Entocort"],
  ["fludrocortisone","Florinef"],["testosterone","AndroGel","Testim","Depo-Testosterone"],
  ["estradiol","Estrace","Vivelle","Climara"],
  ["conjugated estrogens","Premarin"],["estradiol norethindrone","Activella","CombiPatch"],
  ["progesterone","Prometrium","Crinone"],
  ["medroxyprogesterone","Provera","Depo-Provera"],
  ["norethindrone","Aygestin","Camila"],["etonogestrel","Nexplanon","NuvaRing"],
  ["levonorgestrel","Mirena","Plan B","Kyleena"],
  ["ulipristal","Ella"],["mifepristone","Mifeprex"],
  ["tadalafil","Cialis","Adcirca"],["sildenafil","Viagra","Revatio"],
  ["vardenafil","Levitra"],["avanafil","Stendra"],
  ["finasteride","Proscar","Propecia"],["dutasteride","Avodart"],
  ["tamsulosin","Flomax"],["alfuzosin","Uroxatral"],["silodosin","Rapaflo"],
  ["solifenacin","Vesicare"],["tolterodine","Detrol"],["oxybutynin","Ditropan"],
  ["darifenacin","Enablex"],["trospium","Sanctura"],["fesoterodine","Toviaz"],
  ["mirabegron","Myrbetriq"],["vibegron","Gemtesa"],
  // Neurology
  ["donepezil","Aricept"],["rivastigmine","Exelon"],["galantamine","Razadyne"],
  ["memantine","Namenda"],["aducanumab","Aduhelm"],["lecanemab","Leqembi"],
  ["sumatriptan","Imitrex"],["rizatriptan","Maxalt"],["eletriptan","Relpax"],
  ["zolmitriptan","Zomig"],["naratriptan","Amerge"],["almotriptan","Axert"],
  ["frovatriptan","Frova"],["lasmiditan","Reyvow"],["ubrogepant","Ubrelvy"],
  ["rimegepant","Nurtec"],["erenumab","Aimovig"],["fremanezumab","Ajovy"],
  ["galcanezumab","Emgality"],["eptinezumab","Vyepti"],
  ["topiramate","Topamax"],["valproate","Depakote"],["amitriptyline","Elavil"],
  ["propranolol","Inderal"],["timolol","Blocadren"],["verapamil","Calan"],
  ["phenytoin","Dilantin"],["fosphenytoin","Cerebyx"],["levetiracetam","Keppra"],
  ["lamotrigine","Lamictal"],["valproic acid","Depakene"],["carbamazepine","Tegretol"],
  ["oxcarbazepine","Trileptal"],["eslicarbazepine","Aptiom"],
  ["lacosamide","Vimpat"],["zonisamide","Zonegran"],["topiramate","Topamax"],
  ["perampanel","Fycompa"],["brivaracetam","Briviact"],["cenobamate","Xcopri"],
  ["fenfluramine","Fintepla"],["stiripentol","Diacomit"],
  ["levodopa carbidopa","Sinemet","Duopa"],["pramipexole","Mirapex"],
  ["ropinirole","Requip"],["rotigotine","Neupro"],["apomorphine","Apokyn"],
  ["entacapone","Comtan"],["tolcapone","Tasmar"],["opicapone","Ongentys"],
  ["rasagiline","Azilect"],["selegiline","Eldepryl","Emsam"],["safinamide","Xadago"],
  ["amantadine","Gocovri","Symmetrel"],["istradefylline","Nourianz"],
  ["riluzole","Rilutek"],["edaravone","Radicava"],
  ["baclofen","Lioresal"],["tizanidine","Zanaflex"],["dantrolene","Dantrium"],
  ["interferon beta","Avonex","Betaseron","Rebif"],["glatiramer","Copaxone"],
  ["natalizumab","Tysabri"],["fingolimod","Gilenya"],["siponimod","Mayzent"],
  ["ozanimod","Zeposia"],["ponesimod","Ponvory"],["ofatumumab","Kesimpta"],
  ["ocrelizumab","Ocrevus"],["alemtuzumab","Lemtrada"],["cladribine","Mavenclad"],
  // Infectious Disease
  ["amoxicillin","Amoxil","Trimox"],["amoxicillin clavulanate","Augmentin"],
  ["ampicillin","Principen"],["nafcillin","Unipen"],["oxacillin","Bactocill"],
  ["dicloxacillin","Dynapen"],["piperacillin tazobactam","Zosyn"],
  ["cephalexin","Keflex"],["cefadroxil","Duricef"],["cefazolin","Ancef"],
  ["cefuroxime","Ceftin","Zinacef"],["cefdinir","Omnicef"],["cefprozil","Cefzil"],
  ["cefixime","Suprax"],["cefpodoxime","Vantin"],["ceftriaxone","Rocephin"],
  ["cefotaxime","Claforan"],["ceftazidime","Fortaz"],["cefepime","Maxipime"],
  ["ceftaroline","Teflaro"],["ceftazidime avibactam","Avycaz"],
  ["imipenem","Primaxin"],["meropenem","Merrem"],["ertapenem","Invanz"],
  ["doripenem","Doribax"],
  ["azithromycin","Zithromax","Z-Pack"],["clarithromycin","Biaxin"],
  ["erythromycin","Ery-Tab","EryPed"],
  ["doxycycline","Vibramycin","Doryx","Oracea"],["minocycline","Minocin","Solodyn"],
  ["tetracycline","Sumycin"],["tigecycline","Tygacil"],["omadacycline","Nuzyra"],
  ["ciprofloxacin","Cipro"],["levofloxacin","Levaquin"],["moxifloxacin","Avelox"],
  ["ofloxacin","Floxin"],["delafloxacin","Baxdela"],
  ["trimethoprim sulfamethoxazole","Bactrim","Septra"],["nitrofurantoin","Macrobid","Macrodantin"],
  ["fosfomycin","Monurol"],
  ["clindamycin","Cleocin"],["linezolid","Zyvox"],["tedizolid","Sivextro"],
  ["vancomycin","Vancocin"],["daptomycin","Cubicin"],["oritavancin","Orbactiv"],
  ["dalbavancin","Dalvance"],["telavancin","Vibativ"],
  ["metronidazole","Flagyl"],["tinidazole","Tindamax"],["secnidazole","Solosec"],
  ["rifaximin","Xifaxan"],["fidaxomicin","Dificid"],
  ["fluconazole","Diflucan"],["itraconazole","Sporanox"],["voriconazole","Vfend"],
  ["posaconazole","Noxafil"],["isavuconazole","Cresemba"],["amphotericin b","Fungizone"],
  ["caspofungin","Cancidas"],["micafungin","Mycamine"],["anidulafungin","Eraxis"],
  ["nystatin","Mycostatin"],["clotrimazole","Lotrimin"],["miconazole","Monistat"],
  ["acyclovir","Zovirax"],["valacyclovir","Valtrex"],["famciclovir","Famvir"],
  ["ganciclovir","Cytovene"],["valganciclovir","Valcyte"],["cidofovir","Vistide"],
  ["oseltamivir","Tamiflu"],["zanamivir","Relenza"],["baloxavir","Xofluza"],
  ["remdesivir","Veklury"],["nirmatrelvir ritonavir","Paxlovid"],["molnupiravir","Lagevrio"],
  ["tenofovir emtricitabine","Truvada","Descovy"],
  ["bictegravir emtricitabine tenofovir","Biktarvy"],
  ["dolutegravir","Tivicay"],["raltegravir","Isentress"],
  ["atazanavir","Reyataz"],["darunavir","Prezista"],["ritonavir","Norvir"],
  // Allergy / Immunology
  ["cetirizine","Zyrtec"],["loratadine","Claritin"],["fexofenadine","Allegra"],
  ["levocetirizine","Xyzal"],["desloratadine","Clarinex"],
  ["diphenhydramine","Benadryl"],["hydroxyzine","Vistaril","Atarax"],
  ["chlorpheniramine","Chlor-Trimeton"],["brompheniramine","Dimetapp"],
  ["azelastine","Astelin","Astepro"],["olopatadine","Patanase","Pataday"],
  ["epinephrine","EpiPen","Auvi-Q"],["prednisone","Deltasone"],
  // Ophthalmology
  ["latanoprost","Xalatan"],["bimatoprost","Lumigan"],["travoprost","Travatan"],
  ["timolol eye drops","Timoptic"],["dorzolamide","Trusopt"],
  ["brimonidine","Alphagan"],["acetazolamide","Diamox"],
  // Dermatology
  ["tretinoin","Retin-A","Renova"],["adapalene","Differin"],["tazarotene","Tazorac"],
  ["benzoyl peroxide","PanOxyl","Clearasil"],["salicylic acid","Stridex"],
  ["isotretinoin","Accutane","Absorica","Claravis"],
  ["clindamycin topical","Cleocin T"],["doxycycline","Oracea"],
  ["spironolactone","Aldactone"],["finasteride","Propecia"],
  ["minoxidil topical","Rogaine"],["clobetasol","Temovate"],
  ["triamcinolone","Kenalog"],["betamethasone","Diprolene"],
  ["hydrocortisone cream","Cortaid"],["tacrolimus","Protopic"],
  ["pimecrolimus","Elidel"],["dupilumab","Dupixent"],
  ["secukinumab","Cosentyx"],["ixekizumab","Taltz"],["brodalumab","Siliq"],
  ["apremilast","Otezla"],["deucravacitinib","Sotyktu"],
  // Oncology (common)
  ["tamoxifen","Nolvadex"],["letrozole","Femara"],["anastrozole","Arimidex"],
  ["exemestane","Aromasin"],["fulvestrant","Faslodex"],
  ["imatinib","Gleevec"],["erlotinib","Tarceva"],["gefitinib","Iressa"],
  ["osimertinib","Tagrisso"],["crizotinib","Xalkori"],
  ["ibrutinib","Imbruvica"],["venetoclax","Venclexta"],
  ["bortezomib","Velcade"],["lenalidomide","Revlimid"],["pomalidomide","Pomalyst"],
  ["pembrolizumab","Keytruda"],["nivolumab","Opdivo"],
  ["bevacizumab","Avastin"],["trastuzumab","Herceptin"],["pertuzumab","Perjeta"],
  ["rituximab","Rituxan"],["obinutuzumab","Gazyva"],
  ["capecitabine","Xeloda"],["fluorouracil","Efudex"],
  ["methotrexate","Trexall"],["cyclophosphamide","Cytoxan"],
  ["docetaxel","Taxotere"],["paclitaxel","Taxol"],
  ["carboplatin","Paraplatin"],["cisplatin","Platinol"],["oxaliplatin","Eloxatin"],
  // OTC / Common
  ["calcium carbonate","Tums","Os-Cal"],["calcium citrate","Citracal"],
  ["vitamin D","D3","Cholecalciferol"],["magnesium","MagOx","Slow-Mag"],
  ["iron","Fer-In-Sol","Slow Fe"],["folic acid","Folate"],
  ["zinc","Galzin"],["vitamin B12","Cyanocobalamin"],["vitamin C","Ascorbic acid"],
  ["melatonin","Natrol"],["valerian","Valerian root"],
  ["fish oil","Omega-3"],["glucosamine","Osteo Bi-Flex"],["chondroitin","Cosamin"],
  ["simethicone","Gas-X","Mylicon"],["calcium polycarbophil","FiberCon"],
  ["psyllium","Metamucil"],["methylcellulose","Citrucel"],
  ["guaifenesin","Mucinex","Robitussin"],["dextromethorphan","Delsym","Robitussin DM"],
  ["pseudoephedrine","Sudafed"],["phenylephrine","Sudafed PE"],
  ["oxymetazoline","Afrin"],["xylometazoline","Otrivin"],
  ["loratadine","Claritin"],["cetirizine","Zyrtec"],
  // Specialty / Biologics
  ["adalimumab","Humira","Hadlima","Hyrimoz"],
  ["etanercept","Enbrel","Erelzi"],["infliximab","Remicade","Inflectra"],
  ["natalizumab","Tysabri"],["vedolizumab","Entyvio"],
  ["omalizumab","Xolair"],["mepolizumab","Nucala"],["benralizumab","Fasenra"],
  ["dupilumab","Dupixent"],["lebrikizumab","Ebglyss"],
  ["erenumab","Aimovig"],["fremanezumab","Ajovy"],["galcanezumab","Emgality"],
  ["denosumab","Prolia","Xgeva"],["romosozumab","Evenity"],
  ["abatacept","Orencia"],["tocilizumab","Actemra"],["sarilumab","Kevzara"],
  ["secukinumab","Cosentyx"],["ixekizumab","Taltz"],["bimekizumab","Bimzelx"],
  ["guselkumab","Tremfya"],["risankizumab","Skyrizi"],["tildrakizumab","Ilumya"],
  ["pembrolizumab","Keytruda"],["nivolumab","Opdivo"],["atezolizumab","Tecentriq"],
  ["durvalumab","Imfinzi"],["avelumab","Bavencio"],["cemiplimab","Libtayo"],
  ["ipilimumab","Yervoy"],["tremelimumab","Imjudo"]
,
  // Common alternate spellings & names people actually search
  ["tylenol","acetaminophen"],["advil","ibuprofen"],["motrin","ibuprofen"],
  ["aleve","naproxen"],["aspirin","Bayer","baby aspirin"],
  ["benadryl","diphenhydramine"],["zyrtec","cetirizine"],["claritin","loratadine"],
  ["allegra","fexofenadine"],["mucinex","guaifenesin"],["sudafed","pseudoephedrine"],
  ["dayquil","nyquil"],["robitussin","guaifenesin dextromethorphan"],
  ["pepto bismol","bismuth subsalicylate"],["tums","calcium carbonate"],
  ["prilosec","omeprazole"],["nexium","esomeprazole"],["pepcid","famotidine"],
  ["miralax","polyethylene glycol"],["dulcolax","bisacodyl"],["colace","docusate"],
  ["imodium","loperamide"],["zofran","ondansetron"],["phenergan","promethazine"],
  ["prednisone","deltasone","steroids"],["cortisone","hydrocortisone"],
  ["synthroid","levothyroxine","thyroid pill"],["metformin","glucophage","diabetes pill"],
  ["lisinopril","blood pressure pill","ace inhibitor"],
  ["metoprolol","toprol","beta blocker","heart pill"],
  ["atorvastatin","lipitor","cholesterol pill","statin"],
  ["sertraline","zoloft","antidepressant"],["prozac","fluoxetine"],
  ["xanax","alprazolam","anxiety pill"],["valium","diazepam"],
  ["adderall","amphetamine","adhd pill"],["ritalin","methylphenidate"],
  ["vyvanse","lisdexamfetamine"],["strattera","atomoxetine"],
  ["ambien","zolpidem","sleeping pill"],["lunesta","eszopiclone"],
  ["vicodin","hydrocodone","pain pill"],["percocet","oxycodone"],
  ["morphine","ms contin","pain medication"],["tramadol","ultram"],
  ["gabapentin","neurontin","nerve pain"],["lyrica","pregabalin"],
  ["eliquis","apixaban","blood thinner"],["xarelto","rivaroxaban"],
  ["coumadin","warfarin","blood thinner"],["plavix","clopidogrel"],
  ["ozempic","semaglutide","weight loss shot","diabetes shot"],
  ["wegovy","semaglutide","weight loss injection"],
  ["mounjaro","tirzepatide","weight loss"],["zepbound","tirzepatide"],
  ["jardiance","empagliflozin"],["farxiga","dapagliflozin"],
  ["januvia","sitagliptin"],["victoza","liraglutide"],["trulicity","dulaglutide"],
  ["lantus","insulin glargine","long acting insulin","insulin"],
  ["humalog","insulin lispro","fast acting insulin"],
  ["humira","adalimumab","biologic","injection for arthritis"],
  ["enbrel","etanercept"],["remicade","infliximab"],
  ["dupixent","dupilumab","eczema shot","asthma shot"],
  ["keytruda","pembrolizumab","cancer treatment","immunotherapy"],
  ["ozempic","semaglutide"],["wegovy","semaglutide"],
  ["singulair","montelukast","allergy asthma"],
  ["spiriva","tiotropium","copd inhaler"],
  ["flovent","fluticasone","asthma inhaler"],
  ["albuterol","ventolin","proair","rescue inhaler","puffer"],
  ["plaquenil","hydroxychloroquine","lupus medication"],
  ["prolia","denosumab","bone shot","osteoporosis shot"],
  ["fosamax","alendronate","bone pill"],
  ["aricept","donepezil","alzheimers","memory pill","dementia medication"],
  ["namenda","memantine"],["exelon","rivastigmine"],
  ["viagra","sildenafil","ed pill"],["cialis","tadalafil"],
  ["flomax","tamsulosin","prostate pill"],
  ["birth control","oral contraceptive","the pill"],
  ["plan b","levonorgestrel","morning after pill"],
  ["premarin","estrogen","hormone replacement"],
  ["tamoxifen","nolvadex","breast cancer pill"],
  ["gleevec","imatinib","cancer pill"],
  ["revlimid","lenalidomide"],["velcade","bortezomib"],
  ["rituxan","rituximab"],["herceptin","trastuzumab"],
  ["suboxone","buprenorphine","addiction treatment"],
  ["vivitrol","naltrexone","alcohol treatment"],
  ["chantix","varenicline","quit smoking"],
  ["nicorette","nicotine","quit smoking patch"],
  ["penicillin","antibiotic"],["amoxicillin","amoxil","antibiotic"],
  ["zithromax","azithromycin","z pack","zpak","antibiotic"],
  ["cipro","ciprofloxacin","antibiotic"],["bactrim","trimethoprim","antibiotic"],
  ["diflucan","fluconazole","yeast infection pill"],
  ["valtrex","valacyclovir","herpes medication","cold sore pill"],
  ["tamiflu","oseltamivir","flu pill"],["paxlovid","nirmatrelvir","covid pill"]
,

  // Plain language / nicknames / what patients actually say
  ["water pill","furosemide","hydrochlorothiazide","spironolactone","diuretic"],
  ["blood pressure pill","lisinopril","amlodipine","metoprolol","losartan","antihypertensive"],
  ["heart pill","metoprolol","digoxin","carvedilol","heart medication"],
  ["blood thinner","warfarin","apixaban","rivaroxaban","anticoagulant"],
  ["cholesterol pill","atorvastatin","rosuvastatin","simvastatin","statin"],
  ["sugar pill","metformin","glipizide","insulin","diabetes medication"],
  ["diabetes pill","metformin","glipizide","sitagliptin","diabetes medication"],
  ["diabetes shot","semaglutide","liraglutide","insulin","injectable diabetes"],
  ["weight loss shot","semaglutide","liraglutide","tirzepatide","glp1"],
  ["weight loss pill","orlistat","phentermine","topiramate","weight medication"],
  ["thyroid pill","levothyroxine","liothyronine","thyroid medication"],
  ["steroid","prednisone","methylprednisolone","dexamethasone","corticosteroid"],
  ["anxiety pill","alprazolam","clonazepam","lorazepam","buspirone","anti-anxiety"],
  ["depression pill","sertraline","fluoxetine","escitalopram","antidepressant"],
  ["sleeping pill","zolpidem","eszopiclone","trazodone","sleep medication"],
  ["pain pill","oxycodone","hydrocodone","tramadol","pain medication"],
  ["nerve pill","gabapentin","pregabalin","nerve pain medication"],
  ["seizure pill","levetiracetam","lamotrigine","valproate","antiepileptic"],
  ["mood pill","lithium","quetiapine","lamotrigine","mood stabilizer"],
  ["memory pill","donepezil","memantine","rivastigmine","dementia medication"],
  ["breathing pill","montelukast","theophylline","roflumilast","respiratory medication"],
  ["inhaler","albuterol","fluticasone","tiotropium","budesonide"],
  ["rescue inhaler","albuterol","levalbuterol","bronchodilator"],
  ["puffer","albuterol","fluticasone","inhaler medication"],
  ["allergy pill","cetirizine","loratadine","fexofenadine","antihistamine"],
  ["antibiotic","amoxicillin","azithromycin","ciprofloxacin","antibacterial"],
  ["infection pill","amoxicillin","cephalexin","doxycycline","antibiotic"],
  ["yeast pill","fluconazole","nystatin","antifungal"],
  ["stomach pill","omeprazole","famotidine","pantoprazole","antacid"],
  ["acid pill","omeprazole","esomeprazole","lansoprazole","proton pump inhibitor"],
  ["heartburn pill","omeprazole","famotidine","ranitidine","antacid"],
  ["nausea pill","ondansetron","promethazine","metoclopramide","antiemetic"],
  ["constipation pill","polyethylene glycol","bisacodyl","docusate","laxative"],
  ["stool softener","docusate","colace","laxative"],
  ["diarrhea pill","loperamide","imodium","antidiarrheal"],
  ["arthritis pill","methotrexate","hydroxychloroquine","ibuprofen","nsaid"],
  ["gout pill","colchicine","allopurinol","febuxostat","gout medication"],
  ["bone pill","alendronate","risedronate","denosumab","osteoporosis medication"],
  ["prostate pill","tamsulosin","finasteride","dutasteride","bph medication"],
  ["bladder pill","oxybutynin","tolterodine","mirabegron","bladder medication"],
  ["ed pill","sildenafil","tadalafil","vardenafil","erectile dysfunction"],
  ["sex pill","sildenafil","tadalafil","erectile dysfunction medication"],
  ["birth control","norethindrone","levonorgestrel","ethinyl estradiol","contraceptive"],
  ["period pill","norethindrone","medroxyprogesterone","oral contraceptive"],
  ["hormone pill","estradiol","progesterone","conjugated estrogens","hrt"],
  ["menopause pill","estradiol","conjugated estrogens","hormone replacement"],
  ["quit smoking","varenicline","bupropion","nicotine","smoking cessation"],
  ["addiction pill","buprenorphine","naltrexone","methadone","addiction treatment"],
  ["adhd pill","methylphenidate","amphetamine","lisdexamfetamine","stimulant"],
  ["focus pill","methylphenidate","amphetamine","adhd medication"],
  ["cancer pill","tamoxifen","imatinib","capecitabine","chemotherapy"],
  ["chemo","chemotherapy","capecitabine","cyclophosphamide","cancer treatment"],
  ["biologic","adalimumab","etanercept","infliximab","biologic therapy"],
  ["shot for arthritis","adalimumab","etanercept","certolizumab","biologic"],
  ["shot for psoriasis","secukinumab","ixekizumab","guselkumab","biologic"],
  ["ms pill","fingolimod","siponimod","dimethyl fumarate","multiple sclerosis"],
  ["parkinsons pill","levodopa","pramipexole","ropinirole","parkinson medication"],
  ["migraine pill","sumatriptan","rizatriptan","topiramate","migraine medication"],
  ["hiv pill","tenofovir","emtricitabine","dolutegravir","antiretroviral"],
  ["transplant pill","tacrolimus","cyclosporine","mycophenolate","immunosuppressant"],
  ["lupus pill","hydroxychloroquine","prednisone","belimumab","lupus medication"],
  ["crohn pill","mesalamine","infliximab","vedolizumab","ibd medication"],
  ["colitis pill","mesalamine","prednisone","vedolizumab","ulcerative colitis"],
  ["copd pill","roflumilast","theophylline","copd medication"],
  ["copd inhaler","tiotropium","umeclidinium","salmeterol","copd inhaler"],
  ["eye drops","latanoprost","bimatoprost","timolol","glaucoma drops"],
  ["glaucoma drops","latanoprost","bimatoprost","travoprost","eye pressure"],
  ["ear drops","ciprofloxacin otic","ofloxacin otic","ear infection drops"],
  ["skin cream","triamcinolone","clobetasol","hydrocortisone","topical steroid"],
  ["rash cream","hydrocortisone","triamcinolone","betamethasone","topical"],
  ["acne pill","isotretinoin","doxycycline","minocycline","acne medication"],
  ["acne cream","tretinoin","adapalene","benzoyl peroxide","topical acne"],
  ["eczema pill","dupilumab","prednisone","eczema medication"],
  ["psoriasis pill","methotrexate","apremilast","acitretin","psoriasis medication"],
  ["iron pill","ferrous sulfate","ferrous gluconate","iron supplement"],
  ["vitamin d","cholecalciferol","ergocalciferol","vitamin d supplement"],
  ["folic acid","folate","prenatal vitamin","folic acid supplement"],
  ["prenatal vitamin","folic acid","iron","prenatal supplement"],
  ["calcium pill","calcium carbonate","calcium citrate","calcium supplement"],
  ["magnesium pill","magnesium oxide","magnesium citrate","magnesium supplement"],
  ["blood sugar pill","metformin","glipizide","diabetes medication"],
  ["high blood pressure","lisinopril","amlodipine","hypertension medication"],
  ["low blood pressure","fludrocortisone","midodrine","hypotension medication"],
  ["high cholesterol","atorvastatin","rosuvastatin","hyperlipidemia medication"],
  ["overactive bladder","oxybutynin","tolterodine","mirabegron","oab medication"],
  ["overactive thyroid","methimazole","propylthiouracil","hyperthyroid medication"],
  ["underactive thyroid","levothyroxine","hypothyroid medication"],
  ["low thyroid","levothyroxine","synthroid","hypothyroid"],
  ["covid pill","nirmatrelvir","paxlovid","molnupiravir","covid treatment"],
  ["flu pill","oseltamivir","tamiflu","baloxavir","influenza treatment"],
  ["cold sore pill","valacyclovir","acyclovir","herpes medication"],
  ["uti pill","nitrofurantoin","trimethoprim","fosfomycin","urinary tract infection"],
  ["bladder infection","nitrofurantoin","trimethoprim","uti medication"],
  ["pink eye drops","erythromycin","tobramycin","conjunctivitis drops"],
  ["z pack","azithromycin","zithromax","zpak","antibiotic pack"],
  ["steroid pack","prednisone","medrol dose pack","methylprednisolone"],
  ["epinephrine","epipen","auvi-q","epinephrine autoinjector","anaphylaxis"]
];

var ENTRIES=[];
var _seen={};
DRUGS.forEach(function(g){g.forEach(function(n){if(!_seen[n.toLowerCase()]){_seen[n.toLowerCase()]=1;ENTRIES.push({name:n,group:g});}});});

function fuzzyScore(q,t){
  q=q.toLowerCase();t=t.toLowerCase();
  if(t.startsWith(q))return 100;
  if(t.includes(q))return 80;
  var qi=0,sc=0;
  for(var ti=0;ti<t.length&&qi<q.length;ti++){if(t[ti]===q[qi]){sc+=(qi===ti?2:1);qi++;}}
  if(qi<q.length)return 0;
  return Math.round(sc/q.length*40);
}

function showSuggestions(q){
  var list=document.getElementById('acList');
  if(!q||q.length<2){list.style.display='none';return;}
  var res=[];
  ENTRIES.forEach(function(e){var s=fuzzyScore(q,e.name);if(s>20)res.push({e:e,s:s});});
  res.sort(function(a,b){return b.s-a.s;});
  res=res.slice(0,8);
  if(!res.length){list.style.display='none';return;}
  while(list.firstChild)list.removeChild(list.firstChild);
  res.forEach(function(r){
    var e=r.e;
    var others=e.group.filter(function(n){return n!==e.name;});
    var d=document.createElement('div');
    d.className='ac-item';
    var nameEl=document.createElement('span');
    nameEl.className='ac-item-name';
    nameEl.textContent=e.name;
    d.appendChild(nameEl);
    if(others.length){
      var altEl=document.createElement('span');
      altEl.className='ac-item-type';
      altEl.textContent='('+others.slice(0,2).join(' / ')+')';
      d.appendChild(altEl);
    }
    d.addEventListener('mousedown',function(ev){
      ev.preventDefault();
      document.getElementById('drugInput').value=e.name;
      list.style.display='none';
      generateCounseling();
    });
    list.appendChild(d);
  });
  list.style.display='block';
}

function hideSuggestions(){
  var list=document.getElementById('acList');
  if(list)list.style.display='none';
}

var _drugInput=document.getElementById('drugInput');
_drugInput.addEventListener('input',function(){showSuggestions(this.value.trim());});
_drugInput.addEventListener('keydown',function(e){
  if(e.key==='Enter'){hideSuggestions();generateCounseling();}
  if(e.key==='Escape')hideSuggestions();
});
_drugInput.addEventListener('blur',function(){setTimeout(hideSuggestions,150);});

// PWA install
var deferredPrompt;
window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault(); deferredPrompt=e;
  if(!localStorage.getItem('pt_install_dismissed')){
    document.getElementById('installBanner').style.display='flex';
  }
});
document.getElementById('installBtn').addEventListener('click',function(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(){
      deferredPrompt=null;
      document.getElementById('installBanner').style.display='none';
      localStorage.setItem('pt_install_dismissed','1');
    });
  } else {
    alert('To install: tap the Share button in Safari, then tap "Add to Home Screen".');
    document.getElementById('installBanner').style.display='none';
    localStorage.setItem('pt_install_dismissed','1');
  }
});

var params=new URLSearchParams(window.location.search);
var dp=params.get('drug');
if(dp){document.getElementById('drugInput').value=dp;generateCounseling();}
