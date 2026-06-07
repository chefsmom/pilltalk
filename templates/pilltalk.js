
function startVoice(){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){
    alert('Voice input not supported. Try Safari on iPhone or Chrome on Android.');return;
  }
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var r=new SR();
  r.lang='en-US';r.continuous=false;r.interimResults=false;
  var btn=document.getElementById('voiceBtn');
  if(btn){btn.innerHTML='&#128308;';btn.style.background='#ef4444';btn.style.color='#fff';}
  r.onresult=function(e){
    var txt=e.results[0][0].transcript;
    document.getElementById('drugInput').value=txt;
    showSuggestions(txt);
    if(btn){btn.innerHTML='&#127908;';btn.style.background='';btn.style.color='';}
    generateCounseling();
  };
  r.onerror=r.onend=function(){
    if(btn){btn.innerHTML='&#127908;';btn.style.background='';btn.style.color='';}
  };
  r.start();
}

function readAloud(){
  if(!window.speechSynthesis){alert('Text-to-speech not supported in this browser.');return;}
  if(window.speechSynthesis.speaking){
    window.speechSynthesis.cancel();
    var rb=document.getElementById('readBtn');
    if(rb)rb.innerHTML='&#128266; Read';
    return;
  }
  if(!lastResult.drugName){alert('Search for a medication first.');return;}
  var r=lastResult;
  var text='Medication summary for '+r.drugName+'. ';
  if(r.condition) text+='Used for: '+r.condition+'. ';
  if(r.how) text+='How to take it: '+r.how.replace(/<[^>]+>/g,'')+'. ';
  if(r.missedDose) text+='If you miss a dose: '+r.missedDose+'. ';
  if(r.side) text+='Common side effects: '+r.side.replace(/<[^>]+>/g,'')+'. ';
  if(r.warn) text+='Important warnings: '+r.warn.replace(/<[^>]+>/g,'')+'. ';
  var utt=new SpeechSynthesisUtterance(text);
  utt.rate=0.88;utt.pitch=1;utt.lang='en-US';
  var rb=document.getElementById('readBtn');
  if(rb)rb.innerHTML='&#9646;&#9646; Stop';
  utt.onend=function(){if(rb)rb.innerHTML='&#128266; Read';};
  window.speechSynthesis.speak(utt);
}

var currentLevel='simple and clear language - avoid medical jargon, explain technical words in plain terms, use short sentences, assume no medical background';
var caregiverMode=false,largeText=false,spanishMode=false;
var lastResult={},englishResult={},currentDrug='';

var levels=[
  {id:'lv0',val:'simple and clear language - avoid medical jargon, explain technical words in plain terms, use short sentences, assume no medical background',label:'Simple'},
  {id:'lv1',val:'standard adult reading level',label:'Standard'},
  {id:'lv2',val:'clinical professional level with medical terminology',label:'Clinical'}
];

levels.forEach(function(lv){
  document.getElementById(lv.id).onclick=function(){
    document.querySelectorAll('.level-seg').forEach(function(b){b.classList.remove('on')});
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

document.getElementById('btnCaregiver').onclick=function(){
  caregiverMode=!caregiverMode;
  this.classList.toggle('on-purple',caregiverMode);
  document.getElementById('caregiverBanner').style.display=caregiverMode?'flex':'none';
  document.getElementById('cgTBCard').style.display=caregiverMode&&lastResult.caregiverTeachback?'block':'none';
  var cgTab=document.getElementById('cgTab');
  cgTab.style.display=caregiverMode?'block':'none';
  if(caregiverMode&&lastResult.caregiverTips) showTab('caregiver');
  else if(!caregiverMode) showTab('overview');
};

document.getElementById('btnSpanish').onclick=function(){
  spanishMode=!spanishMode;
  this.classList.toggle('on-teal',spanishMode);
  this.innerHTML=spanishMode?'Español On':'Español';
  if(spanishMode&&englishResult.drugName) translateToSpanish();
  else if(!spanishMode&&englishResult.drugName){lastResult=englishResult;populateResult(lastResult);}
};

document.getElementById('goBtn').onclick=generateCounseling;
document.getElementById('copyBtn').onclick=copyNotes;
document.getElementById('saveBtn').onclick=saveToMyMeds;

function showTab(name){
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  var panel=document.getElementById('panel-'+name);
  if(panel) panel.classList.add('on');
  document.querySelectorAll('.tab').forEach(function(t){
    var oc=t.getAttribute('onclick')||'';
    if(oc.indexOf(name)>-1) t.classList.add('on');
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
  document.getElementById('costFull').innerHTML=toBullets(data.cost);
  document.getElementById('financialResources').innerHTML=toBullets(data.financialResources)||'<p style="margin:0;color:var(--g400)">Drug-specific programs not found — see broad resources below.</p>';
  // Teachback
  var tqs=Array.isArray(data.teachback)?data.teachback:[String(data.teachback||'')];
  var tbEl=document.getElementById('teachback');
  if(tbEl) tbEl.innerHTML=tqs.map(function(q,i){return '<li style="margin-bottom:8px">'+q+'</li>';}).join('');
  var cqs=Array.isArray(data.caregiverTeachback)?data.caregiverTeachback:[String(data.caregiverTeachback||'')];
  var cqHtml=cqs.map(function(q,i){return '<li style="margin-bottom:8px">'+q+'</li>';}).join('');
  var cgt=document.getElementById('cgTeachback');if(cgt)cgt.innerHTML=cqHtml;
  var cgt2=document.getElementById('cgTeachback2');if(cgt2)cgt2.innerHTML=cqHtml;
  var cgTB=document.getElementById('cgTBCard');if(cgTB)cgTB.style.display=caregiverMode?'block':'none';
  // Caregiver fields
  var cgTips=document.getElementById('cgTips');if(cgTips)cgTips.innerHTML=toBullets(data.caregiverTips);
  var cgMon=document.getElementById('cgMonitoring');if(cgMon)cgMon.innerHTML=toBullets(data.caregiverMonitoring);
  var cgAdm=document.getElementById('cgAdmin');if(cgAdm)cgAdm.innerHTML=toBullets(data.caregiverAdmin);
  var cgWF=document.getElementById('cgWatchFor');if(cgWF)cgWF.innerHTML=toBullets(data.caregiverWatchFor);
  document.getElementById('side').innerHTML=toBullets(data.side);
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
  document.getElementById('teachback').innerHTML=qs.map(function(q){return '<li style="margin-bottom:6px">'+q+'</li>';}).join('');
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
  if(!drug) return;
  currentDrug=drug;
  document.getElementById('errorBox').style.display='none';
  document.getElementById('result').style.display='none';
  document.getElementById('spinner').style.display='block';
  document.getElementById('goBtn').disabled=true;
  document.getElementById('acList').classList.remove('show');

  fetch('/counsel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drug:drug,level:currentLevel})})
  .then(function(r){return r.json();})
  .then(function(data){
    if(data.error){showError(data.error);return;}
    lastResult=data; englishResult=data;
    if(spanishMode){translateToSpanish();return;}
    populateResult(data);
    showTab('overview');
    document.getElementById('spinner').style.display='none';
    document.getElementById('result').style.display='block';
    document.getElementById('goBtn').disabled=false;
    document.getElementById('result').scrollIntoView({behavior:'smooth',block:'nearest'});
  })
  .catch(function(err){showError('Could not reach the server. ('+err.message+')');});
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
  btn.textContent='Link copied!';
  setTimeout(function(){btn.innerHTML='Share';},2000);
}

function copyNotes(){
  if(!lastResult.drugName) return;
  var r=lastResult;
  var qs=Array.isArray(r.teachback)?r.teachback:[r.teachback];
  var parts=[r.drugName];
  if(r.brandNote) parts.push(r.brandNote);
  parts.push('CONDITION: '+(r.condition||''));
  parts.push('HOW IT WORKS: '+(r.what||''));
  parts.push('HOW TO TAKE IT: '+(r.how||''));
  parts.push('MISSED DOSE: '+(r.missedDose||''));
  parts.push('SIDE EFFECTS: '+(r.side||''));
  parts.push('WATCH FOR: '+(r.warn||''));
  parts.push('COST: '+(r.cost||''));
  parts.push('TEACH-BACK:');
  qs.forEach(function(q,i){parts.push((i+1)+'. '+q);});
  parts.push('--- Pill Talk ---');
  navigator.clipboard.writeText(parts.join('\n'));
}

function clearAll(){
  document.getElementById('drugInput').value='';
  document.getElementById('result').style.display='none';
  document.getElementById('errorBox').style.display='none';
  currentDrug=''; lastResult={}; englishResult={};
  document.getElementById('drugInput').focus();
}

// === AUTOCOMPLETE ===
var DRUGS=[["acetaminophen","Tylenol"],["ibuprofen","Advil","Motrin"],["aspirin","Bayer"],["metformin","Glucophage"],["atorvastatin","Lipitor"],["lisinopril","Prinivil","Zestril"],["amlodipine","Norvasc"],["metoprolol","Lopressor","Toprol"],["omeprazole","Prilosec"],["simvastatin","Zocor"],["losartan","Cozaar"],["albuterol","ProAir","Ventolin"],["gabapentin","Neurontin"],["hydrochlorothiazide","Microzide"],["sertraline","Zoloft"],["levothyroxine","Synthroid","Levoxyl"],["amoxicillin","Amoxil"],["azithromycin","Zithromax"],["fluoxetine","Prozac"],["escitalopram","Lexapro"],["bupropion","Wellbutrin"],["duloxetine","Cymbalta"],["venlafaxine","Effexor"],["citalopram","Celexa"],["alprazolam","Xanax"],["clonazepam","Klonopin"],["lorazepam","Ativan"],["zolpidem","Ambien"],["trazodone","Desyrel"],["quetiapine","Seroquel"],["aripiprazole","Abilify"],["risperidone","Risperdal"],["lamotrigine","Lamictal"],["levetiracetam","Keppra"],["atenolol","Tenormin"],["carvedilol","Coreg"],["furosemide","Lasix"],["spironolactone","Aldactone"],["ramipril","Altace"],["valsartan","Diovan"],["rosuvastatin","Crestor"],["warfarin","Coumadin"],["apixaban","Eliquis"],["rivaroxaban","Xarelto"],["clopidogrel","Plavix"],["semaglutide","Ozempic","Wegovy","Rybelsus"],["liraglutide","Victoza","Saxenda"],["dulaglutide","Trulicity"],["sitagliptin","Januvia"],["empagliflozin","Jardiance"],["dapagliflozin","Farxiga"],["glipizide","Glucotrol"],["insulin glargine","Lantus","Toujeo"],["insulin lispro","Humalog"],["insulin aspart","NovoLog"],["prednisone","Deltasone"],["methylprednisolone","Medrol"],["budesonide","Pulmicort"],["fluticasone","Flonase","Flovent"],["montelukast","Singulair"],["tiotropium","Spiriva"],["adalimumab","Humira"],["etanercept","Enbrel"],["infliximab","Remicade"],["methotrexate","Rheumatrex"],["hydroxychloroquine","Plaquenil"],["alendronate","Fosamax"],["levothyroxine","Synthroid"],["donepezil","Aricept"],["memantine","Namenda"],["ondansetron","Zofran"],["pantoprazole","Protonix"],["esomeprazole","Nexium"],["famotidine","Pepcid"],["cetirizine","Zyrtec"],["loratadine","Claritin"],["fexofenadine","Allegra"],["diphenhydramine","Benadryl"],["doxycycline","Vibramycin"],["ciprofloxacin","Cipro"],["levofloxacin","Levaquin"],["trimethoprim","Bactrim"],["nitrofurantoin","Macrobid"],["cephalexin","Keflex"],["clindamycin","Cleocin"],["metronidazole","Flagyl"],["fluconazole","Diflucan"],["acyclovir","Zovirax"],["valacyclovir","Valtrex"],["oseltamivir","Tamiflu"],["naltrexone","Vivitrol"],["buprenorphine","Suboxone"],["oxycodone","OxyContin","Percocet"],["hydrocodone","Vicodin","Norco"],["tramadol","Ultram"],["cyclobenzaprine","Flexeril"],["baclofen","Lioresal"],["methylphenidate","Ritalin","Concerta"],["amphetamine","Adderall","Vyvanse"],["modafinil","Provigil"],["colchicine","Colcrys"],["allopurinol","Zyloprim"],["sildenafil","Viagra","Revatio"],["tadalafil","Cialis"],["finasteride","Proscar","Propecia"],["tamsulosin","Flomax"],["testosterone","AndroGel"],["estradiol","Estrace"],["progesterone","Prometrium"],
  ["water pill","furosemide","hydrochlorothiazide","lasix","diuretic"],
  ["blood pressure pill","lisinopril","amlodipine","metoprolol","losartan","bp medicine"],
  ["heart pill","metoprolol","digoxin","carvedilol","heart medicine"],
  ["blood thinner","warfarin","apixaban","eliquis","xarelto","coumadin"],
  ["cholesterol pill","atorvastatin","lipitor","rosuvastatin","statin"],
  ["sugar pill","metformin","diabetes pill","glucophage"],
  ["diabetes shot","ozempic","semaglutide","trulicity","insulin"],
  ["weight loss shot","ozempic","wegovy","mounjaro","semaglutide","tirzepatide"],
  ["thyroid pill","levothyroxine","synthroid","thyroid medicine"],
  ["steroid","prednisone","methylprednisolone","dexamethasone","cortisone"],
  ["anxiety pill","xanax","alprazolam","klonopin","ativan","valium"],
  ["depression pill","zoloft","sertraline","prozac","lexapro","antidepressant"],
  ["sleeping pill","ambien","zolpidem","lunesta","sleep medicine"],
  ["pain pill","vicodin","percocet","oxycodone","hydrocodone","pain medicine"],
  ["nerve pill","gabapentin","neurontin","lyrica","pregabalin","nerve pain"],
  ["seizure pill","keppra","levetiracetam","lamictal","antiepileptic"],
  ["mood stabilizer","lithium","depakote","lamictal","mood medicine"],
  ["memory pill","aricept","donepezil","namenda","alzheimers medicine"],
  ["inhaler","albuterol","ventolin","proair","rescue inhaler","puffer"],
  ["allergy pill","zyrtec","cetirizine","claritin","loratadine","benadryl"],
  ["antibiotic","amoxicillin","zithromax","cipro","bactrim","z-pack"],
  ["stomach pill","prilosec","omeprazole","nexium","pepcid","antacid"],
  ["heartburn pill","prilosec","nexium","pepcid","tums","antacid"],
  ["nausea pill","zofran","ondansetron","phenergan","anti-nausea"],
  ["constipation pill","miralax","dulcolax","stool softener","laxative"],
  ["diarrhea pill","imodium","loperamide","antidiarrheal"],
  ["arthritis pill","methotrexate","hydroxychloroquine","plaquenil","humira"],
  ["bone pill","fosamax","alendronate","prolia","osteoporosis medicine"],
  ["prostate pill","flomax","tamsulosin","proscar","finasteride"],
  ["bladder pill","detrol","tolterodine","oxybutynin","bladder medicine"],
  ["quit smoking","chantix","varenicline","nicorette","nicotine patch"],
  ["adhd pill","adderall","ritalin","vyvanse","concerta","focus medicine"],
  ["birth control","the pill","lo loestrin","sprintec","contraceptive"],
  ["hormone pill","estradiol","premarin","progesterone","menopause pill"],
  ["cancer pill","tamoxifen","gleevec","imatinib","keytruda","chemo"],
  ["biologic","humira","enbrel","remicade","dupixent","biologic shot"],
  ["ms medicine","copaxone","tecfidera","gilenya","multiple sclerosis"],
  ["hiv medicine","truvada","biktarvy","antiretroviral","prep"],
  ["addiction medicine","suboxone","buprenorphine","methadone","vivitrol"],
  ["covid medicine","paxlovid","nirmatrelvir","covid pill","covid treatment"],
  ["flu pill","tamiflu","oseltamivir","flu medicine"],
  ["uti medicine","macrobid","nitrofurantoin","bactrim","bladder infection"],
  ["yeast pill","diflucan","fluconazole","yeast infection medicine"],
  ["cold sore pill","valtrex","valacyclovir","herpes medicine"],
  ["gout medicine","colchicine","colcrys","allopurinol","zyloprim"],
  ["eye drops","xalatan","latanoprost","glaucoma drops","eye pressure drops"],
  ["acne pill","accutane","isotretinoin","doxycycline","minocycline"],
  ["psoriasis medicine","humira","cosentyx","otezla","skyrizi"],
  ["eczema medicine","dupixent","dupilumab","hydrocortisone cream"],
  ["lupus medicine","plaquenil","hydroxychloroquine","benlysta"],
  ["copd medicine","spiriva","tiotropium","symbicort","copd inhaler"],
  ["iron pill","ferrous sulfate","iron supplement","slow fe"],
  ["vitamin d","cholecalciferol","vitamin d3","vitamin d supplement"],
  ["prenatal vitamin","folic acid","prenatal","pregnancy vitamin"],
  ["blood sugar","glucose","metformin","insulin","diabetes"],
  ["high blood pressure","hypertension","lisinopril","amlodipine"],
  ["low blood sugar","hypoglycemia","glucose","glucagon"],
  ["chest pain","nitroglycerin","nitrostat","angina medicine"],
  ["migraine pill","imitrex","sumatriptan","maxalt","migraine medicine"],
  ["parkinsons medicine","sinemet","levodopa","carbidopa","parkinson"],
  ["overactive thyroid","methimazole","tapazole","hyperthyroid"],
  ["underactive thyroid","levothyroxine","synthroid","hypothyroid"],
  ["blood clot medicine","eliquis","xarelto","warfarin","lovenox"],
  ["transplant medicine","tacrolimus","prograf","cyclosporine","immunosuppressant"],
  ["crohns medicine","humira","remicade","entyvio","ibd medicine"],
  ["colitis medicine","mesalamine","asacol","prednisone","uc medicine"],
  ["pneumonia medicine","amoxicillin","azithromycin","levofloxacin","pneumonia antibiotic"],
  ["skin infection","keflex","cephalexin","dicloxacillin","skin antibiotic"],
  ["muscle relaxer","flexeril","cyclobenzaprine","baclofen","robaxin"],
  ["nerve damage","gabapentin","lyrica","pregabalin","neuropathy medicine"],
  ["fibromyalgia","lyrica","pregabalin","cymbalta","duloxetine"],
  ["shingles medicine","valtrex","valacyclovir","acyclovir","shingles treatment"],
  ["rash medicine","prednisone","hydrocortisone","benadryl","rash treatment"],
  ["ear infection","amoxicillin","augmentin","cipro ear drops","ear medicine"],
  ["sinus infection","amoxicillin","augmentin","azithromycin","sinus medicine"],
  ["strep throat","amoxicillin","penicillin","azithromycin","strep medicine"],
  ["pink eye","erythromycin eye drops","tobramycin drops","conjunctivitis drops"],
  ["ozempic","semaglutide"],["wegovy","semaglutide"],["rybelsus","semaglutide"],
  ["mounjaro","tirzepatide"],["zepbound","tirzepatide"],
  ["jardiance","empagliflozin"],["farxiga","dapagliflozin"],["invokana","canagliflozin"],
  ["januvia","sitagliptin"],["tradjenta","linagliptin"],["onglyza","saxagliptin"],
  ["trulicity","dulaglutide"],["victoza","liraglutide"],["byetta","exenatide"],
  ["lantus","insulin glargine"],["toujeo","insulin glargine"],["basaglar","insulin glargine"],
  ["tresiba","insulin degludec"],["levemir","insulin detemir"],
  ["humalog","insulin lispro"],["novolog","insulin aspart"],["fiasp","insulin aspart"],
  ["eliquis","apixaban"],["xarelto","rivaroxaban"],["pradaxa","dabigatran"],["savaysa","edoxaban"],
  ["plavix","clopidogrel"],["brilinta","ticagrelor"],["effient","prasugrel"],
  ["lipitor","atorvastatin"],["crestor","rosuvastatin"],["zocor","simvastatin"],
  ["pravachol","pravastatin"],["livalo","pitavastatin"],["zetia","ezetimibe"],
  ["norvasc","amlodipine"],["toprol xl","metoprolol"],["lopressor","metoprolol"],
  ["coreg","carvedilol"],["bystolic","nebivolol"],["tenormin","atenolol"],
  ["lasix","furosemide"],["demadex","torsemide"],["aldactone","spironolactone"],
  ["inspra","eplerenone"],["microzide","hydrochlorothiazide"],
  ["cozaar","losartan"],["diovan","valsartan"],["benicar","olmesartan"],
  ["avapro","irbesartan"],["atacand","candesartan"],["micardis","telmisartan"],
  ["entresto","sacubitril valsartan"],["corlanor","ivabradine"],
  ["zestril","lisinopril"],["prinivil","lisinopril"],["vasotec","enalapril"],
  ["altace","ramipril"],["lotensin","benazepril"],["accupril","quinapril"],
  ["zoloft","sertraline"],["prozac","fluoxetine"],["lexapro","escitalopram"],
  ["celexa","citalopram"],["paxil","paroxetine"],["luvox","fluvoxamine"],
  ["effexor","venlafaxine"],["cymbalta","duloxetine"],["pristiq","desvenlafaxine"],
  ["wellbutrin","bupropion"],["remeron","mirtazapine"],["trintellix","vortioxetine"],
  ["viibryd","vilazodone"],["desyrel","trazodone"],
  ["seroquel","quetiapine"],["abilify","aripiprazole"],["risperdal","risperidone"],
  ["zyprexa","olanzapine"],["geodon","ziprasidone"],["latuda","lurasidone"],
  ["vraylar","cariprazine"],["rexulti","brexpiprazole"],["clozaril","clozapine"],
  ["lamictal","lamotrigine"],["depakote","valproate"],["tegretol","carbamazepine"],
  ["trileptal","oxcarbazepine"],["topamax","topiramate"],["keppra","levetiracetam"],
  ["dilantin","phenytoin"],["neurontin","gabapentin"],["lyrica","pregabalin"],
  ["xanax","alprazolam"],["klonopin","clonazepam"],["ativan","lorazepam"],
  ["valium","diazepam"],["buspar","buspirone"],
  ["ambien","zolpidem"],["lunesta","eszopiclone"],["belsomra","suvorexant"],
  ["adderall","amphetamine"],["vyvanse","lisdexamfetamine"],["ritalin","methylphenidate"],
  ["concerta","methylphenidate"],["strattera","atomoxetine"],["intuniv","guanfacine"],
  ["provigil","modafinil"],["nuvigil","armodafinil"],
  ["synthroid","levothyroxine"],["levoxyl","levothyroxine"],["tirosint","levothyroxine"],
  ["tapazole","methimazole"],["cytomel","liothyronine"],
  ["deltasone","prednisone"],["medrol","methylprednisolone"],["decadron","dexamethasone"],
  ["pulmicort","budesonide"],["flovent","fluticasone"],["flonase","fluticasone"],
  ["singulair","montelukast"],["spiriva","tiotropium"],["incruse","umeclidinium"],
  ["proair","albuterol"],["ventolin","albuterol"],["xopenex","levalbuterol"],
  ["daliresp","roflumilast"],["xolair","omalizumab"],["nucala","mepolizumab"],
  ["fasenra","benralizumab"],["dupixent","dupilumab"],["tezspire","tezepelumab"],
  ["prilosec","omeprazole"],["nexium","esomeprazole"],["prevacid","lansoprazole"],
  ["protonix","pantoprazole"],["aciphex","rabeprazole"],["pepcid","famotidine"],
  ["zofran","ondansetron"],["phenergan","promethazine"],["reglan","metoclopramide"],
  ["miralax","polyethylene glycol"],["dulcolax","bisacodyl"],["colace","docusate"],
  ["imodium","loperamide"],["lomotil","diphenoxylate"],["xifaxan","rifaximin"],
  ["asacol","mesalamine"],["pentasa","mesalamine"],["lialda","mesalamine"],
  ["entyvio","vedolizumab"],["stelara","ustekinumab"],["remicade","infliximab"],
  ["humira","adalimumab"],["enbrel","etanercept"],["cimzia","certolizumab"],
  ["orencia","abatacept"],["actemra","tocilizumab"],["kevzara","sarilumab"],
  ["cosentyx","secukinumab"],["taltz","ixekizumab"],["tremfya","guselkumab"],
  ["skyrizi","risankizumab"],["xeljanz","tofacitinib"],["olumiant","baricitinib"],
  ["rinvoq","upadacitinib"],["plaquenil","hydroxychloroquine"],
  ["fosamax","alendronate"],["actonel","risedronate"],["boniva","ibandronate"],
  ["prolia","denosumab"],["xgeva","denosumab"],["evenity","romosozumab"],
  ["evista","raloxifene"],["forteo","teriparatide"],
  ["aricept","donepezil"],["namenda","memantine"],["exelon","rivastigmine"],
  ["aimovig","erenumab"],["ajovy","fremanezumab"],["emgality","galcanezumab"],
  ["nurtec","rimegepant"],["ubrelvy","ubrogepant"],["reyvow","lasmiditan"],
  ["imitrex","sumatriptan"],["maxalt","rizatriptan"],["relpax","eletriptan"],
  ["sinemet","levodopa carbidopa"],["mirapex","pramipexole"],["requip","ropinirole"],
  ["azilect","rasagiline"],["eldepryl","selegiline"],["gocovri","amantadine"],
  ["copaxone","glatiramer"],["tysabri","natalizumab"],["gilenya","fingolimod"],
  ["ocrevus","ocrelizumab"],["tecfidera","dimethyl fumarate"],["mavenclad","cladribine"],
  ["amoxil","amoxicillin"],["augmentin","amoxicillin clavulanate"],
  ["keflex","cephalexin"],["omnicef","cefdinir"],["ceftin","cefuroxime"],
  ["rocephin","ceftriaxone"],["zithromax","azithromycin"],["biaxin","clarithromycin"],
  ["vibramycin","doxycycline"],["minocin","minocycline"],
  ["cipro","ciprofloxacin"],["levaquin","levofloxacin"],["avelox","moxifloxacin"],
  ["bactrim","trimethoprim sulfamethoxazole"],["macrobid","nitrofurantoin"],
  ["flagyl","metronidazole"],["diflucan","fluconazole"],["nystatin","mycostatin"],
  ["zovirax","acyclovir"],["valtrex","valacyclovir"],["famvir","famciclovir"],
  ["tamiflu","oseltamivir"],["xofluza","baloxavir"],["paxlovid","nirmatrelvir"],
  ["zyrtec","cetirizine"],["claritin","loratadine"],["allegra","fexofenadine"],
  ["xyzal","levocetirizine"],["benadryl","diphenhydramine"],["vistaril","hydroxyzine"],
  ["nolvadex","tamoxifen"],["femara","letrozole"],["arimidex","anastrozole"],
  ["aromasin","exemestane"],["gleevec","imatinib"],["tagrisso","osimertinib"],
  ["keytruda","pembrolizumab"],["opdivo","nivolumab"],["yervoy","ipilimumab"],
  ["avastin","bevacizumab"],["herceptin","trastuzumab"],["rituxan","rituximab"],
  ["revlimid","lenalidomide"],["velcade","bortezomib"],["xeloda","capecitabine"],
  ["taxol","paclitaxel"],["taxotere","docetaxel"],["cytoxan","cyclophosphamide"],
  ["vivitrol","naltrexone"],["suboxone","buprenorphine"],["dolophine","methadone"],
  ["chantix","varenicline"],["zyban","bupropion"],
  ["viagra","sildenafil"],["cialis","tadalafil"],["levitra","vardenafil"],
  ["proscar","finasteride"],["avodart","dutasteride"],["flomax","tamsulosin"],
  ["detrol","tolterodine"],["ditropan","oxybutynin"],["myrbetriq","mirabegron"],
  ["premarin","conjugated estrogens"],["vivelle","estradiol"],["climara","estradiol"],
  ["prometrium","progesterone"],["provera","medroxyprogesterone"],
  ["epipen","epinephrine"],["auvi-q","epinephrine"]];

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
