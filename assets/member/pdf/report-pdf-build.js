/* Smart Upkeep visit report PDF builder (US Letter, real selectable text, Khand + Hind embedded).
   Loaded on demand by /member/report-pdf.js. Reads the member page's own report data
   (VISITS, M, T, NEXT, SYS, rpBundles, suTaskSteps, PH, SRC, photoCap, TECH). */
(function(){
  "use strict";
  var LOGO=[{"f":"#0A0A0A","d":"m84.4,243.2 c84.4,232.5,87.6,224.5,94.1,219.1 c100.6,213.7,111.0,211.0,125.4,211.0 c135.3,211.0,143.4,212.0,149.8,214.0 l149.8,240.6 c143.8,238.6,137.2,237.6,130.1,237.6 c123.0,237.6,118.4,238.2,116.5,239.4 c114.6,240.6,113.6,242.5,113.6,245.2 l113.6,246.8 c113.6,248.4,114.1,249.8,115.1,250.9 c116.1,252.0,118.3,253.7,121.6,256.0 l137.8,266.8 c142.9,270.1,146.8,273.8,149.5,277.8 c152.2,281.8,153.6,286.8,153.6,292.8 l153.6,297.8 c153.6,319.9,139.1,331.0,110.0,331.0 c99.9,331.0,91.2,330.1,84.0,328.4 l84.0,301.4 c90.3,303.3,97.2,304.2,104.8,304.2 c112.4,304.2,117.4,303.6,119.9,302.3 c122.4,301.0,123.6,299.1,123.6,296.6 l123.6,294.8 c123.6,292.8,122.9,291.2,121.6,290.0 c120.0,288.4,112.3,283.1,98.6,274.0 c89.1,267.6,84.4,259.1,84.4,248.4 h m235.8,218.2 c244.5,213.7,253.0,211.4,261.3,211.4 c269.6,211.4,276.1,213.5,280.7,217.7 c285.3,221.9,287.6,228.2,287.6,236.6 l287.6,330.0 l257.0,330.0 l257.0,244.0 c257.0,240.8,255.2,239.2,251.7,239.2 c248.2,239.2,244.9,240.1,242.0,241.8 c242.1,242.1,242.2,242.7,242.2,243.8 l242.2,330.0 l211.6,330.0 l211.6,244.0 c211.6,240.8,209.9,239.2,206.4,239.2 c202.9,239.2,199.7,240.1,196.8,241.8 l196.8,330.0 l166.6,330.0 l166.6,212.0 l195.0,212.0 l195.0,217.2 c202.1,213.3,209.5,211.4,217.3,211.4 c225.1,211.4,231.3,213.7,235.8,218.2 h m329.0,295.8 l329.0,301.4 c329.0,305.9,331.3,308.2,336.0,308.2 c340.0,308.2,343.3,307.5,346.0,306.0 l346.0,281.8 l336.8,284.2 c333.5,285.1,331.3,286.3,330.4,287.8 c329.5,289.3,329.0,291.9,329.0,295.8 h m305.6,214.8 c312.9,212.3,323.4,211.0,337.0,211.0 c350.6,211.0,360.3,214.0,366.2,219.9 c372.1,225.8,375.0,234.8,375.0,246.8 l375.0,330.0 l346.8,330.0 l346.8,321.4 c342.9,327.4,336.2,330.4,326.6,330.4 c317.0,330.4,310.1,328.1,305.8,323.5 c301.5,318.9,299.4,311.5,299.4,301.4 l299.4,294.6 c299.4,285.7,301.4,278.8,305.3,274.0 c309.2,269.2,315.6,265.6,324.4,263.2 l346.2,257.6 l346.2,246.6 c346.1,243.1,345.1,240.7,343.2,239.3 c341.3,237.9,337.9,237.2,333.0,237.2 c321.9,237.2,312.8,238.6,305.6,241.4 h m443.0,211.4 l446.4,211.4 l446.4,239.2 l441.8,239.2 c434.3,239.2,427.8,240.5,422.2,243.2 l422.2,330.0 l392.0,330.0 l392.0,212.0 l420.4,212.0 l420.4,220.0 c427.2,215.9,432.0,213.4,434.7,212.6 c437.4,211.8,440.2,211.4,443.0,211.4 h m496.8,304.6 c500.9,304.6,504.7,303.7,508.2,301.8 l508.2,328.6 c503.7,330.7,497.7,331.8,490.4,331.8 c479.1,331.8,471.0,329.1,466.2,323.8 c461.4,318.5,459.0,310.7,459.0,300.6 l459.0,237.4 l448.4,237.4 l448.4,212.0 l460.4,212.0 l469.6,191.6 l489.2,191.6 l489.2,212.0 l507.0,212.0 l507.0,237.4 l489.2,237.4 l489.2,297.4 c489.2,302.2,491.7,304.6,496.8,304.6 h"},{"f":"#737373","d":"m577.4,212.0 l607.6,212.0 l607.6,330.0 l579.2,330.0 l579.2,324.6 c572.7,328.2,565.2,330.0,556.9,330.0 c548.6,330.0,542.2,327.7,537.8,323.2 c533.4,318.7,531.2,312.1,531.2,303.6 l531.2,212.0 l561.8,212.0 l561.8,297.6 c561.8,301.1,563.7,302.8,567.6,302.8 c571.5,302.8,574.7,302.0,577.4,300.4 h m671.6,244.0 c671.6,240.8,669.7,239.2,665.9,239.2 c662.1,239.2,658.7,240.1,655.8,241.8 l655.8,302.2 l663.8,302.2 c669.0,302.2,671.6,300.1,671.6,295.8 h m654.0,217.2 c661.1,213.3,668.6,211.4,676.5,211.4 c684.4,211.4,690.7,213.5,695.3,217.7 c699.9,221.9,702.2,228.2,702.2,236.6 l702.2,300.6 c702.2,310.6,699.4,318.0,693.9,322.8 c688.4,327.6,680.9,330.0,671.6,330.0 l655.8,330.0 l655.8,359.8 l625.6,359.8 l625.6,212.0 l654.0,212.0 h"},{"f":"#0A0A0A","d":"m759.4,330.0 l730.2,330.0 l730.2,180.6 l759.4,180.6 l759.4,261.0 l774.2,212.0 l804.0,212.0 l787.0,267.8 l807.0,330.0 l775.4,330.0 l759.4,272.0 h m815.0,296.4 l815.0,242.2 c815.0,232.1,818.1,224.2,824.4,218.5 c830.7,212.8,840.1,210.0,852.8,210.0 c877.2,210.0,889.4,220.7,889.4,242.2 l889.4,282.8 l844.0,282.8 l844.0,294.0 c844.0,298.0,845.1,300.8,847.3,302.5 c849.5,304.2,854.4,305.0,861.9,305.0 c869.4,305.0,877.7,303.7,886.6,301.0 l886.6,327.4 c877.3,329.9,867.3,331.2,856.6,331.2 c828.9,331.2,815.0,319.6,815.0,296.4 h m844.0,259.8 l861.6,259.8 l861.6,242.6 c861.6,237.5,858.7,235.0,852.8,235.0 c846.9,235.0,844.0,237.5,844.0,242.6 h m901.4,296.4 l901.4,242.2 c901.4,232.1,904.5,224.2,910.8,218.5 c917.1,212.8,926.5,210.0,939.2,210.0 c963.6,210.0,975.8,220.7,975.8,242.2 l975.8,282.8 l930.4,282.8 l930.4,294.0 c930.4,298.0,931.5,300.8,933.7,302.5 c935.9,304.2,940.8,305.0,948.3,305.0 c955.8,305.0,964.1,303.7,973.0,301.0 l973.0,327.4 c963.7,329.9,953.7,331.2,943.0,331.2 c915.3,331.2,901.4,319.6,901.4,296.4 h m930.4,259.8 l948.0,259.8 l948.0,242.6 c948.0,237.5,945.1,235.0,939.2,235.0 c933.3,235.0,930.4,237.5,930.4,242.6 h m1035.8,244.0 c1035.8,240.8,1033.9,239.2,1030.1,239.2 c1026.3,239.2,1022.9,240.1,1020.0,241.8 l1020.0,302.2 l1028.0,302.2 c1033.2,302.2,1035.8,300.1,1035.8,295.8 h m1018.2,217.2 c1025.3,213.3,1032.8,211.4,1040.7,211.4 c1048.6,211.4,1054.9,213.5,1059.5,217.7 c1064.1,221.9,1066.4,228.2,1066.4,236.6 l1066.4,300.6 c1066.4,310.6,1063.6,318.0,1058.1,322.8 c1052.6,327.6,1045.1,330.0,1035.8,330.0 l1020.0,330.0 l1020.0,359.8 l989.8,359.8 l989.8,212.0 l1018.2,212.0 h"},{"roof":[[519.2,188.0],[616.2,132.0],[713.2,188.0]]}];
  var FONTS=[["Khand-SemiBold.ttf","Khand","semibold"],["Khand-Bold.ttf","Khand","bold"],["Hind-Regular.ttf","Hind","normal"],["Hind-Medium.ttf","Hind","medium"],["Hind-SemiBold.ttf","Hind","semibold"]];
  var ACCENTS={Complete:"#05668D",Plus:"#A8431F",Essentials:"#0B6E4F"};
  var INK="#1A1A1A", INK2="#4A4A4A", MUTED="#6B6B6B", LINE="#DCDCDC", SOFT="#F4F4F4";
  var EMPTY="Added At First Visit";
  var W=612, H=792, MX=44, CW=W-2*MX;
  var fontData=null;
  function g(n){ var D=null; try{ D=window.SU_REPORT_DATA&&window.SU_REPORT_DATA(); }catch(e){} return (D&&D[n]!=null)?D[n]:undefined; }
  function b64(buf){ var u=new Uint8Array(buf), s="", i, n=0x8000; for(i=0;i<u.length;i+=n) s+=String.fromCharCode.apply(null,u.subarray(i,i+n)); return btoa(s); }
  function init(base,ver){
    if(fontData) return Promise.resolve();
    return Promise.all(FONTS.map(function(f){
      return fetch(base+"fonts/"+f[0]+"?v="+ver).then(function(r){ if(!r.ok) throw new Error("font "+f[0]); return r.arrayBuffer(); }).then(b64);
    })).then(function(list){ fontData=list; });
  }
  function hex(c){ c=c.replace("#",""); return [parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)]; }
  function mix(c,t){ var a=hex(c); return "#"+a.map(function(v){ var x=Math.round(255-(255-v)*t); return ("0"+x.toString(16)).slice(-2); }).join(""); }
  var UP={ac:"AC",co:"CO",gfci:"GFCI",hvac:"HVAC",ii:"II",iii:"III"};
  function titleCase(s){
    return String(s||"").replace(/[A-Za-z][A-Za-z']*/g,function(w){
      var k=w.toLowerCase(); if(UP[k]) return UP[k];
      if(w.length>1&&w===w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase()+w.slice(1);
    });
  }
  function clean(s){ return String(s==null?"":s).replace(/[\u2010\u2011]/g,"-").replace(/\s+/g," ").trim(); }
  var MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  function dt(iso){ var d=new Date(String(iso||"")+"T12:00:00"); return isNaN(+d)?null:d; }
  function longDate(iso){ var d=dt(iso); return d?MONTHS[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear():clean(iso); }
  function weekdayDate(iso){ var d=dt(iso); return d?d.toLocaleDateString("en-US",{weekday:"long"})+", "+longDate(iso):clean(iso); }
  function shortDate(s){
    s=clean(s); var d=/^\d{4}-\d\d-\d\d$/.test(s)?dt(s):new Date(s);
    if(!d||isNaN(+d)) return s;
    return MONTHS[d.getMonth()].slice(0,3)+" "+d.getDate()+", "+d.getFullYear();
  }
  function seasonOf(iso){ var d=dt(iso); if(!d) return ""; var m=d.getMonth(); return m<2||m===11?"Winter":m<5?"Spring":m<8?"Summer":"Fall"; }
  function planName(v){
    var p=v&&v.plan; if(!p){ var T=g("T"); p=T&&T.label; }
    p=clean(p||"Plus"); if(/complete|platinum/i.test(p)) return "Complete"; if(/essential|silver/i.test(p)) return "Essentials"; if(/plus|gold/i.test(p)) return "Plus"; return titleCase(p);
  }
  /* Per-plan label rule: Complete = month + year, Plus = season + year, Essentials = "Fall Visit 2026". */
  function labelParts(plan, iso, season){
    var d=dt(iso), y=d?String(d.getFullYear()):"", s=clean(season)||seasonOf(iso)||"Visit";
    if(plan==="Complete") return {when:d?MONTHS[d.getMonth()]:s, year:y, label:"Complete \u00b7 "+(d?MONTHS[d.getMonth()]+" "+y:s+" "+y).trim()};
    if(plan==="Essentials") return {when:s, year:y, label:(s+" Visit "+y).trim()};
    return {when:s, year:y, label:(plan+" \u00b7 "+s+" "+y).trim()};
  }
  function reportLabel(v){
    var plan=planName(v), p=labelParts(plan, v.date, v.season), vl=g("visitLabel");
    if(typeof vl==="function"){
      try{ var x=clean(vl(v)); if(x&&/\d{4}/.test(x)){ if(plan!=="Essentials"&&x.indexOf(plan)<0) x=plan+" \u00b7 "+x; p.label=x; } }catch(e){}
    }
    return p;
  }
  function nextLabel(plan){
    var N=g("NEXT"); if(!N||!N.date) return "";
    var p=labelParts(plan, N.date, N.season);
    return plan==="Essentials"?p.label:p.label.replace(/^[^\u00b7]+\u00b7\s*/,"");
  }
  function member(){ var M=g("M")||{}; return {name:clean([M.first,M.last].filter(Boolean).join(" ")), last:clean(M.last||"Member"), addr:clean(M.addr), city:clean(M.city)}; }
  function techName(){ var T=g("TECH"); var n=clean(T&&T.name); return (!n||/your technician|^tech(nician)?$/i.test(n))?"":n; }
  function startTime(v){ var t=v.start||v.startTime||v.arrive||v.arrival||v.time; return t?clean(t):""; }
  function timeRange(s){ return clean(s).replace(/(\d)\s+to\s+(\d)/i,"$1\u2013$2"); }
  function slug(s){ return clean(s).replace(/&/g,"And").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,""); }
  function fileName(list){
    var m=member(), v=list[0], plan=planName(v), p=labelParts(plan, v.date, v.season);
    var last=slug(m.last)||"Member";
    if(list.length===1) return "SmartUpkeep-"+last+"-"+plan+"-"+slug(p.when)+"-"+p.year+".pdf";
    var ys=list.map(function(x){return (x.date||"").slice(0,4)}).filter(Boolean).sort();
    var span=ys.length?(ys[0]===ys[ys.length-1]?ys[0]:ys[0]+"-"+ys[ys.length-1]):"";
    return "SmartUpkeep-"+last+"-"+plan+"-"+list.length+"-Reports"+(span?"-"+span:"")+".pdf";
  }

  /* ---------- report data ---------- */
  function bundles(v){
    var fn=g("rpBundles"), out=null;
    if(typeof fn==="function"){ try{ out=fn(v); }catch(e){ out=null; } }
    if(!out){ out=(v.tasks||[]).map(function(t){ return {task:t, finds:[], photos:[], notes:[]}; }); out._unmapped={finds:(v.finds||[]).slice(), photos:(v.photos||[]).slice(), notes:v.note?[v.note]:[]}; }
    return out;
  }
  function steps(task){
    var fn=g("suTaskSteps");
    if(typeof fn==="function"){
      try{
        var s=fn(task,"did"), alt=String(task||"").replace(/\s+\d+(?=\s|$)/g,"");
        /* "Furnace 1 Filter Changed" -> try "Furnace Filter Changed" when the numbered name only hits the generic steps */
        if(alt!==task){ var s2=fn(alt,"did"), gen=fn("\u0000","did"); if(s2&&s2.length&&String(s2)!==String(gen)&&String(s)===String(gen)) s=s2; }
        if(s&&s.length) return s;
      }catch(e){}
    }
    return ["Completed this task during the visit","Checked the related system or area","Noted anything that needed a follow-up"];
  }
  function photoSrc(k){ var S=g("SRC")||{}, P=g("PH")||{}; return (S[k]&&P[k])?S[k]:null; }
  function photoCaption(k){ var fn=g("photoCap"); try{ if(typeof fn==="function") return clean(fn(k)); }catch(e){} return clean(k); }
  var FIND_TAG={ok:"Checked", fixed:"Fixed", flag:"Needs Attention", watch:"To Watch"};
  function systems(){
    var fn=g("SYS"), list=[];
    if(typeof fn==="function"){ try{ list=fn()||[]; }catch(e){ list=[]; } }
    var groups=[], byKey={};
    list.forEach(function(s){
      var t=clean(s.t||s.label||"System"), base=t.replace(/\s+\d+$/,"");
      var key=(s.ic||"")+"|"+base.toLowerCase();
      if(!byKey[key]){ byKey[key]={title:base, units:[]}; groups.push(byKey[key]); }
      byKey[key].units.push(s);
    });
    return groups.map(function(gp){
      if(gp.units.length===1) gp.title=clean(gp.units[0].t||gp.title);
      gp.extra=gp.units.some(isExtra);
      return gp;
    });
  }
  function isExtra(s){ return !!(s&&(s.extra||s.isExtra||s.addOn||s.addon||s.sizeExtra||s.paidExtra||(s.kind&&/extra/i.test(s.kind)))); }
  function fieldsOf(s){
    var sub=clean(s.s), m;
    var brand=clean(s.brand||s.make)||EMPTY;
    var age="";
    if(s.installed) age="Installed "+clean(s.installed);
    else if((m=/installed\s+(\d{4})/i.exec(sub))) age="Installed "+m[1];
    else if((m=/home built\s+(\d{4})/i.exec(sub))) age="Home Built "+m[1];
    else if(s.age&&!/^(yearly|spring|fall|summer|winter|on file)$/i.test(clean(s.age))) age=titleCase(clean(s.age).replace(/\byrs?\b/i,function(x){return /s$/.test(x)?"Years":"Year"}));
    var cond=clean(s.condition||s.flag||"");
    var last=clean(s.lastServiced||"");
    if(!last&&s.lastCare&&!/see visits/i.test(s.lastCare)) last=clean(s.lastCare);
    if(!last&&(m=/(?:last checked|tune-up|flushed|tested|cleaned|replaced|inspected|serviced)\s+([A-Z][a-z]{2,8}\.? \d{1,2}, \d{4})/.exec(sub))) last=m[1];
    return [["Brand",brand],["Age",age?titleCase(age):EMPTY],["Condition",cond?titleCase(cond):EMPTY],["Last Serviced",last?shortDate(last):EMPTY]];
  }

  /* ---------- drawing ---------- */
  function Doc(){
    var J=window.jspdf.jsPDF;
    var d=new J({unit:"pt", format:"letter", orientation:"portrait", compress:true, putOnlyUsedFonts:true});
    FONTS.forEach(function(f,i){ d.addFileToVFS(f[0], fontData[i]); d.addFont(f[0], f[1], f[2]); });
    return d;
  }
  function font(d, fam, st, size, color){ d.setFont(fam, st); d.setFontSize(size); d.setTextColor(color||INK); }
  function drawLogo(d, x, y, w, accent){
    var bx=84, by=132, bw=1066.4-84, bh=360-132, s=w/bw;
    function X(v){ return x+(v-bx)*s; } function Y(v){ return y+(v-by)*s; }
    LOGO.forEach(function(p){
      if(p.roof){
        d.setDrawColor(accent); d.setLineWidth(15*s); d.setLineCap("round"); d.setLineJoin("round");
        d.lines(p.roof.slice(1).map(function(pt,i){ var pr=p.roof[i]; return [(pt[0]-pr[0])*s,(pt[1]-pr[1])*s]; }), X(p.roof[0][0]), Y(p.roof[0][1]), [1,1], "S", false);
        return;
      }
      var ops=[];
      p.d.split(" ").forEach(function(tok){
        var op=tok.charAt(0), n=tok.length>1?tok.slice(1).split(",").map(Number):[];
        if(op==="h"){ ops.push({op:"h",c:[]}); return; }
        var c=[]; for(var i=0;i<n.length;i+=2){ c.push(X(n[i]),Y(n[i+1])); }
        ops.push({op:op,c:c});
      });
      d.setFillColor(p.f==="#737373"?"#737373":INK);
      d.path(ops); d.fill();
    });
    return bh*s;
  }
  function pill(d, text, xr, y, accent){
    font(d,"Hind","semibold",7.5,accent);
    var tw=d.getTextWidth(text), w=tw+14, h=13;
    d.setFillColor(mix(accent,.10)); d.setDrawColor(mix(accent,.45)); d.setLineWidth(.6);
    d.roundedRect(xr-w, y, w, h, 6.5, 6.5, "FD");
    d.text(text, xr-w/2, y+9.2, {align:"center"});
  }

  function loadImage(src){
    return new Promise(function(res){
      var im=new Image(); im.decoding="async";
      im.onload=function(){
        try{
          var max=1400, r=Math.min(1, max/Math.max(im.naturalWidth,im.naturalHeight));
          var c=document.createElement("canvas"); c.width=Math.round(im.naturalWidth*r); c.height=Math.round(im.naturalHeight*r);
          var x=c.getContext("2d"); x.fillStyle="#FFFFFF"; x.fillRect(0,0,c.width,c.height); x.drawImage(im,0,0,c.width,c.height);
          res({data:c.toDataURL("image/jpeg",.84), w:c.width, h:c.height});
        }catch(e){ res(null); }
      };
      im.onerror=function(){ res(null); };
      im.src=src;
    });
  }
  function preload(list){
    var keys={}, out={};
    list.forEach(function(v){ (v.photos||[]).forEach(function(k){ if(photoSrc(k)) keys[k]=1; }); });
    return Promise.all(Object.keys(keys).map(function(k){ return loadImage(photoSrc(k)).then(function(r){ if(r) out[k]=r; }); })).then(function(){ return out; });
  }

  function Report(d, v, imgs){
    var m=member(), plan=planName(v), accent=ACCENTS[plan]||ACCENTS.Plus, lab=reportLabel(v);
    var bs=bundles(v), y=0, first=0;
    var VERSO=lab.label+" \u00b7 "+m.name;
    function newPage(){ if(d.__used) d.addPage("letter","portrait"); d.__used=true; }
    function header(){
      drawLogo(d, MX, 44, 112, accent);
      var xr=W-MX;
      font(d,"Khand","bold",19,INK); d.text(lab.label, xr, 58, {align:"right"});
      font(d,"Hind","normal",8,INK2);
      d.text("Visit Report \u00b7 "+m.name, xr, 72, {align:"right"});
      if(m.addr||m.city) d.text([m.addr,m.city].filter(Boolean).join(", "), xr, 83, {align:"right"});
      var st=startTime(v); d.text(longDate(v.date)+(st?" \u00b7 "+st:""), xr, 94, {align:"right"});
      pill(d, plan, xr, 100, accent);
      d.setDrawColor(accent); d.setLineWidth(1.6); d.line(MX, 124, W-MX, 124);
      y=146;
    }
    function page(){ newPage(); header(); }
    function ensure(h){ if(y+h>H-58) page(); }
    /* Keep-with-next: the heading, its subline and the first block/tile row (next = the space that block asks ensure() for) share a page. */
    function heading(t, sub, next){
      var hb=(y>150?12:0)+16+(sub?12:0);
      if(y+hb+(next||0)>H-58) page();
      if(y>150) y+=12;
      font(d,"Khand","semibold",15,INK); d.text(t, MX, y); y+=8;
      if(sub){ font(d,"Hind","normal",9,MUTED); y+=8; d.text(sub, MX, y); y+=4; }
      y+=8;
    }
    function wrap(text, w, fam, st, size){ d.setFont(fam,st); d.setFontSize(size); return d.splitTextToSize(clean(text), w); }

    /* ---- cover: Full Cover (A) ---- */
    newPage();
    first=d.getNumberOfPages();
    drawLogo(d, MX+4, 70, 168, accent);
    d.setDrawColor(accent); d.setLineWidth(3); d.line(MX, 176, MX+112, 176);
    font(d,"Hind","medium",8.5,MUTED); d.text("Visit Report", MX, 196);
    var tsize=40; font(d,"Khand","bold",tsize,INK); while(d.getTextWidth(lab.label)>CW&&tsize>24){ tsize-=2; d.setFontSize(tsize); }
    d.text(lab.label, MX, 232);
    font(d,"Khand","semibold",13,INK2); d.text("Smart Upkeep \u00b7 "+plan+" Plan", MX, 254);
    var facts=[["Member",[m.name]],["Address",[m.addr,m.city].filter(Boolean)],["Visit Date",[longDate(v.date)+(startTime(v)?" \u00b7 "+startTime(v):"")]],["Plan",[plan]]];
    if(v.min) facts.push(["Time On Site",[v.min+" Min"]]);
    if(bs.length) facts.push(["Tasks Done",[bs.length+" Of "+bs.length]]);
    var tn=techName(); if(tn) facts.push(["Technician",[tn]]);
    var fy=300;
    facts.forEach(function(f){
      if(!f[1].length||!f[1][0]) return;
      font(d,"Hind","semibold",8,MUTED); d.text(f[0], MX, fy);
      font(d,"Hind","normal",11,INK); f[1].forEach(function(l,i){ d.text(l, MX+112, fy+i*15); });
      fy+=Math.max(1,f[1].length)*15+9;
    });

    /* ---- summary + Task Cards (B) ---- */
    page();
    if(v.note){
      var nl=wrap(v.note, CW, "Hind","normal",10);
      heading("Visit Summary", null, nl.length*14+6);
      ensure(nl.length*14+6); font(d,"Hind","normal",10,INK2); d.text(nl, MX, y, {lineHeightFactor:1.4}); y+=nl.length*14+10;
    }
    (v.finds||[]).forEach(function(f){
      var tag=FIND_TAG[f[0]]||"Finding", t=tag+" \u00b7 "+titleCase(clean(f[1]));
      var tl=wrap(t, CW-26, "Khand","semibold",11), bl=f[2]?wrap(f[2], CW-26, "Hind","normal",9.5):[];
      var h=14+tl.length*13+(bl.length?bl.length*13.5+4:0)+6;
      ensure(h+8);
      d.setFillColor("#FFFFFF"); d.setDrawColor(LINE); d.setLineWidth(.7); d.roundedRect(MX, y, CW, h, 4, 4, "FD");
      d.setFillColor(accent); d.rect(MX, y, 3, h, "F");
      font(d,"Khand","semibold",11,accent); d.text(tl, MX+14, y+16, {lineHeightFactor:1.15});
      if(bl.length){ font(d,"Hind","normal",9.5,INK); d.text(bl, MX+14, y+18+tl.length*13, {lineHeightFactor:1.4}); }
      y+=h+10;
    });
    function taskBox(b){
      var name=titleCase(clean(b.task)), st=steps(b.task);
      var tl=wrap(name, CW-44, "Khand","semibold",12);
      var rows=st.map(function(s){ return wrap(s, CW-46, "Hind","normal",9); });
      var notes=(b.notes||[]).filter(function(n){ return clean(n)!==clean(v.note); }).map(function(n){ return wrap(n, CW-24, "Hind","normal",9); });
      var moist=b.moist&&b.moist.length?b.moist:null;
      var h=12+tl.length*14+4;
      rows.forEach(function(r){ h+=r.length*12.5+3; });
      notes.forEach(function(n){ h+=n.length*12.5+6; });
      if(moist) h+=10+moist.length*15+14;
      h+=8;
      return {tl:tl, rows:rows, notes:notes, moist:moist, h:h};
    }
    heading("What We Did", null, bs.length?taskBox(bs[0]).h+8:0);
    bs.forEach(function(b,i){
      var tb=taskBox(b), tl=tb.tl, rows=tb.rows, notes=tb.notes, moist=tb.moist, h=tb.h;
      ensure(h+8);
      d.setFillColor("#FFFFFF"); d.setDrawColor(LINE); d.setLineWidth(.7); d.roundedRect(MX, y, CW, h, 5, 5, "FD");
      var yy=y+12+11;
      font(d,"Khand","semibold",12,accent); d.text((i+1)+".", MX+12, yy);
      font(d,"Khand","semibold",12,INK); d.text(tl, MX+28, yy, {lineHeightFactor:1.15});
      yy+=(tl.length-1)*14+6;
      rows.forEach(function(r,j){
        yy+=12.5;
        font(d,"Hind","semibold",8.5,accent); d.text(String(j+1), MX+14, yy);
        font(d,"Hind","normal",9,INK); d.text(r, MX+28, yy, {lineHeightFactor:1.38});
        yy+=(r.length-1)*12.5+3;
      });
      notes.forEach(function(n){ yy+=15; font(d,"Hind","normal",9,INK2); d.text(n, MX+14, yy, {lineHeightFactor:1.38}); yy+=(n.length-1)*12.5; });
      if(moist){
        yy+=18; font(d,"Hind","semibold",8,MUTED); d.text("Moisture Readings", MX+14, yy); yy+=4;
        moist.forEach(function(r){
          yy+=15; d.setDrawColor(SOFT); d.setLineWidth(.6); d.line(MX+14, yy-11, W-MX-14, yy-11);
          font(d,"Hind","normal",9,INK); d.text(titleCase(clean(r[0])), MX+14, yy);
          font(d,"Hind","semibold",9,INK); d.text(clean(r[1]), MX+240, yy);
          font(d,"Hind","medium",8.5,r[2]==="Dry"?MUTED:accent); d.text(titleCase(clean(r[2])), MX+300, yy);
        });
        yy+=12; font(d,"Hind","normal",7.5,MUTED); d.text("Pinless Meter Plus Thermal Camera. Dry Is Under 15%. Not A Lab Mold Test.", MX+14, yy);
      }
      y+=h+8;
    });

    /* ---- Photos By Task (B) ---- */
    var groups=[];
    bs.forEach(function(b){ var ph=(b.photos||[]).filter(function(k){return imgs[k]}); if(ph.length) groups.push({t:titleCase(clean(b.task)), ph:ph}); });
    var um=(bs._unmapped&&bs._unmapped.photos||[]).filter(function(k){return imgs[k]});
    if(um.length) groups.push({t:"More Photos From This Visit", ph:um});
    if(!groups.length){
      heading("Visit Photos", null, 20);
      ensure(20); font(d,"Hind","normal",9.5,INK2); d.text("No Photos On This Visit.", MX, y); y+=18;
    } else {
      var pcw=(CW-24-10)/2;
      function photoRows(gp){
        var rowsH=[];
        for(var i=0;i<gp.ph.length;i+=2){
          var hs=gp.ph.slice(i,i+2).map(function(k){ var im=imgs[k]; return Math.min(190, pcw*im.h/im.w); });
          rowsH.push(Math.max.apply(null,hs)+22);
        }
        return rowsH;
      }
      var r0=photoRows(groups[0]), g0=34+r0.reduce(function(a,b){return a+b},0)+4;
      heading("Visit Photos", "Photos From Your Technician, Grouped By Task.", Math.min(g0, 34+r0[0]+8)+8);
      groups.forEach(function(gp){
        var cw=pcw, rowsH=photoRows(gp);
        var h=34+rowsH.reduce(function(a,b){return a+b},0)+4;
        ensure(Math.min(h, 34+rowsH[0]+8)+8);
        if(y+h>H-58){ page(); }
        d.setFillColor("#FFFFFF"); d.setDrawColor(LINE); d.setLineWidth(.7); d.roundedRect(MX, y, CW, h, 5, 5, "FD");
        font(d,"Khand","semibold",12,INK); d.text(gp.t, MX+12, y+22);
        var yy=y+34;
        rowsH.forEach(function(rh,ri){
          gp.ph.slice(ri*2,ri*2+2).forEach(function(k,ci){
            var im=imgs[k], iw=cw, ih=Math.min(190, cw*im.h/im.w);
            if(ih===190) iw=190*im.w/im.h;
            var x=MX+12+ci*(cw+10)+(cw-iw)/2;
            d.addImage(im.data, "JPEG", x, yy, iw, ih, undefined, "FAST");
            d.setDrawColor(LINE); d.setLineWidth(.5); d.rect(x, yy, iw, ih);
            font(d,"Hind","normal",8,INK2); d.text(titleCase(photoCaption(k)), MX+12+ci*(cw+10)+cw/2, yy+ih+12, {align:"center", maxWidth:cw});
          });
          yy+=rh;
        });
        y+=h+8;
      });
    }

    /* ---- System Tiles (B) ---- */
    var sys=systems();
    if(sys.length){
      var gap=8, tw=(CW-2*gap)/3, rowBuf=[];
      function tileHeight(units){ return 12+16+units*0+4*13.5+10; }
      function groupHeight(gp){ return 12+16+Math.ceil(gp.units.length/3)*(14+4*13.5+6)+4; }
      var now=new Date(); heading("Systems Snapshot", "Your Systems As Of "+MONTHS[now.getMonth()]+" "+now.getDate()+", "+now.getFullYear()+".", (sys[0].units.length===1?tileHeight(1):groupHeight(sys[0]))+gap);
      function drawFields(s, x, yy, w){
        fieldsOf(s).forEach(function(f){
          font(d,"Hind","semibold",7.5,MUTED); d.text(f[0], x, yy);
          var empty=f[1]===EMPTY;
          font(d,"Hind",empty?"normal":"medium",8.5,empty?MUTED:INK); d.text(f[1], x+58, yy, {maxWidth:w-62});
          yy+=13.5;
        });
      }
      function frame(x, yy, w, h, extra){
        d.setFillColor("#FFFFFF");
        if(extra){ d.setDrawColor(accent); d.setLineWidth(1.3); } else { d.setDrawColor(LINE); d.setLineWidth(.7); }
        d.roundedRect(x, yy, w, h, 5, 5, "FD");
        d.setFillColor(accent); d.rect(x+2, yy, w-4, 2.6, "F");
      }
      function flush(){
        if(!rowBuf.length) return;
        var h=tileHeight(1); ensure(h+gap);
        rowBuf.forEach(function(gp,i){
          var x=MX+i*(tw+gap), s=gp.units[0];
          frame(x, y, tw, h, gp.extra);
          font(d,"Khand","semibold",11,INK); d.text(titleCase(gp.title), x+9, y+19, {maxWidth:tw-18});
          drawFields(s, x+9, y+34, tw-9);
        });
        y+=h+gap; rowBuf=[];
      }
      sys.forEach(function(gp){
        if(gp.units.length===1){ rowBuf.push(gp); if(rowBuf.length===3) flush(); return; }
        flush();
        var per=3, nrow=Math.ceil(gp.units.length/per), uw=(CW-18-(per-1)*12)/per;
        var h=groupHeight(gp);
        ensure(h+gap);
        frame(MX, y, CW, h, gp.extra);
        font(d,"Khand","semibold",11,INK); d.text(titleCase(gp.title), MX+9, y+19);
        var tw2=d.getTextWidth(titleCase(gp.title));
        font(d,"Hind","medium",8,MUTED); d.text(gp.units.length+" Units", MX+9+tw2+8, y+19);
        gp.units.forEach(function(u,i){
          var r=Math.floor(i/per), c=i%per, x=MX+9+c*(uw+12), yy=y+34+r*(14+4*13.5+6);
          if(c>0){ d.setDrawColor(SOFT); d.setLineWidth(.7); d.line(x-6, yy-8, x-6, yy+4*13.5+2); }
          font(d,"Hind","semibold",9,INK); d.text(titleCase(clean(u.t||gp.title)), x, yy);
          drawFields(u, x, yy+14, uw);
        });
        y+=h+gap;
      });
      flush();
    }

    /* ---- Accent Closing (B) ---- */
    var N=g("NEXT"), latest=(function(){ var fn=g("VISITS"); var il=g("isLatestVisit"); try{ if(il) return !!il(v); }catch(e){} return !!(fn&&fn[0]&&fn[0].id===v.id); })();
    y+=8;
    if(latest&&N&&N.date){
      var recs=(v.finds||[]).filter(function(f){return f[0]==="flag"||f[0]==="watch"}).map(function(f){ var t=clean(f[1]); return titleCase(t.indexOf(":")>=0?t.split(":")[0]:t); });
      var nh=20+18+20+14+recs.length*14+10;
      var prep=(N.prep||[]).map(function(p){ return wrap(p, CW-40, "Hind","normal",9.5); });
      var ph=prep.length?26+prep.reduce(function(a,p){return a+p.length*13.5+3},0)+10:0;
      ensure(nh+ph+60);
      d.setFillColor(mix(accent,.07)); d.setDrawColor(mix(accent,.28)); d.setLineWidth(.8); d.roundedRect(MX, y, CW, nh, 5, 5, "FD");
      font(d,"Khand","semibold",13.5,accent); d.text("What\u2019s Next", MX+14, y+22);
      font(d,"Khand","bold",17,INK); d.text(nextLabel(plan)||"Next Visit", MX+14, y+42);
      font(d,"Hind","normal",10,INK2); d.text(weekdayDate(N.date)+(N.win?" \u00b7 "+timeRange(N.win):""), MX+14, y+58);
      recs.forEach(function(r,i){ font(d,"Hind","medium",9,accent); d.text("Recheck: "+r, MX+14, y+74+i*14); });
      y+=nh+10;
      if(prep.length){
        d.setFillColor("#FFFFFF"); d.setDrawColor(LINE); d.setLineWidth(.7); d.roundedRect(MX, y, CW, ph, 5, 5, "FD");
        font(d,"Khand","semibold",12,INK); d.text("Before The Visit", MX+14, y+20);
        var yy=y+26;
        prep.forEach(function(p){ yy+=13.5; d.setFillColor(accent); d.circle(MX+18, yy-3.2, 1.6, "F"); font(d,"Hind","normal",9.5,INK); d.text(p, MX+26, yy, {lineHeightFactor:1.42}); yy+=(p.length-1)*13.5+3; });
        y+=ph+12;
      }
    }
    ensure(40);
    d.setDrawColor(accent); d.setLineWidth(1.6); d.line(MX, y, W-MX, y); y+=18;
    font(d,"Khand","semibold",11,INK); d.text("Questions About This Visit? Reach Us At smartupkeep.ai", MX, y);
    font(d,"Hind","normal",8.5,MUTED); d.text("Or Tap Ask A Question In Your Smart Upkeep App.", MX, y+13);

    return {first:first, last:d.getNumberOfPages(), verso:VERSO};
  }

  function footers(d, parts){
    parts.forEach(function(p){
      var n=p.last-p.first+1;
      for(var i=p.first;i<=p.last;i++){
        d.setPage(i);
        d.setDrawColor(LINE); d.setLineWidth(.6); d.line(MX, H-40, W-MX, H-40);
        font(d,"Hind","normal",7.5,MUTED);
        d.text(p.verso, MX, H-28);
        d.text("Page "+(i-p.first+1)+" Of "+n, W-MX, H-28, {align:"right"});
      }
    });
  }

  function build(list){
    if(!fontData) return Promise.reject(new Error("fonts not loaded"));
    return preload(list).then(function(imgs){
      var d=Doc(), parts=[];
      list.forEach(function(v){ parts.push(Report(d, v, imgs)); });
      footers(d, parts);
      var m=member(), lab=reportLabel(list[0]).label;
      var title=list.length===1?"Smart Upkeep Visit Report \u00b7 "+lab:"Smart Upkeep Visit Reports \u00b7 "+m.name;
      d.setProperties({title:title, subject:"Visit Report \u00b7 "+m.name, author:"Smart Upkeep", creator:"Smart Upkeep", keywords:"Smart Upkeep, Visit Report"});
      d.setLanguage && d.setLanguage("en-US");
      return {blob:d.output("blob"), name:fileName(list), title:title, pages:d.getNumberOfPages()};
    });
  }

  window.SUReportPdfBuild={init:init, build:build, _label:reportLabel, _fileName:fileName};
})();
