/* DGX Meu Dia — Saúde & Humor v1.
   Dados de saúde fornecidos voluntariamente pelo usuário, armazenados no Neon.
   Sem conexão automática com Huawei Saúde; importação CSV local e registro manual.
*/
(function(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="dgx_health_daily_v1";
const TZ="America/Sao_Paulo";
const labels={heartAvg:"FC média",heartRest:"FC em repouso",sleepHours:"Sono",steps:"Passos",spo2:"SpO₂",stress:"Estresse"};
const units={heartAvg:"bpm",heartRest:"bpm",sleepHours:"h",steps:"passos",spo2:"%",stress:""};
const validRange={heartAvg:[25,240],heartRest:[25,180],sleepHours:[0,24],steps:[0,100000],spo2:[50,100],stress:[0,100]};
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatNum=(num,digits=0)=>Number(num).toLocaleString("pt-BR",{minimumFractionDigits:digits,maximumFractionDigits:digits});
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const data=()=>window.DGXStore?.read(KEY,[])||[];
const moods=()=>window.DGXStore?.read("dgx_moods_v1",[])||[];
const notify=s=>window.DGXtoast?.(s);
const validDay=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T12:00:00Z"))&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
const dateBR=s=>s?s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4):"—";
const formatMetric=(k,n)=>n==null?"—":formatNum(n,k==="sleepHours"?1:(k==="heartAvg"||k==="heartRest"?0:0))+" "+units[k];
const normalizeHeader=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"").toLowerCase();
let importedRows=[],importColumns=[],fileName="";
function safeValue(key,raw){
 if(raw==null||raw==="")return null;
 const number=typeof raw==="number"?raw:Number(String(raw).trim().replace(/\./g,"").replace(",","."));
 // JS decimal dot without commas needs preserving; e.g. 7.5, 74.2
 const parsed=typeof raw==="number"?raw: String(raw).includes(",")?Number(String(raw).trim().replace(/\./g,"").replace(",",".")):Number(String(raw).trim());
 const value=Number.isFinite(parsed)?parsed:number;
 if(!Number.isFinite(value))return null;
 const [low,high]=validRange[key]||[-Infinity,Infinity];
 return value>=low&&value<=high?Math.round(value*100)/100:null;
}
function updateRecords(rows){
 const merged=new Map(data().map(r=>[r.day,{...r}]));
 for(const row of rows){
  if(!validDay(row.day))continue;
  const prior=merged.get(row.day)||{day:row.day};
  merged.set(row.day,{...prior,...row,day:row.day,updatedAt:new Date().toISOString()});
 }
 const out=[...merged.values()].sort((a,b)=>a.day.localeCompare(b.day));
 if(out.length>730){notify("Limite de 730 dias de registros atingido.");return}
 window.DGXStore?.write(KEY,out);
 draw();
}
function completeRows(){
 return data().filter(x=>x&&validDay(x.day)).slice().sort((a,b)=>a.day.localeCompare(b.day));
}
function moodValue(day){
 const list=moods().filter(m=>m.day===day&&Number.isInteger(m.mood)&&m.mood>=0&&m.mood<=4);
 return list.length?list.reduce((n,m)=>n+m.mood+1,0)/list.length:null;
}
function pearson(pairs){
 if(pairs.length<7)return null;
 const n=pairs.length,sx=pairs.reduce((s,p)=>s+p[0],0),sy=pairs.reduce((s,p)=>s+p[1],0);
 const mx=sx/n,my=sy/n;
 const numerator=pairs.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0);
 const a=pairs.reduce((s,p)=>s+(p[0]-mx)**2,0),b=pairs.reduce((s,p)=>s+(p[1]-my)**2,0);
 if(a<=0||b<=0)return null;
 return numerator/Math.sqrt(a*b);
}
function computeCorrelation(rows,metric){
 const pairs=rows.map(r=>[r[metric],moodValue(r.day)]).filter(p=>p.every(Number.isFinite));
 return{r:pearson(pairs),n:pairs.length};
}
function recentAverage(rows,key,days=7){
 const recent=rows.slice(-days).filter(r=>Number.isFinite(r[key]));
 return recent.length?recent.reduce((a,r)=>a+r[key],0)/recent.length:null;
}
function latestValue(rows,key){
 return rows.slice().reverse().find(r=>Number.isFinite(r[key]))?.[key]??null;
}
function drawCards(rows){
 const defs=[
  {key:"heartAvg",title:"FC média",sub:"Último dia registrado"},
  {key:"heartRest",title:"FC em repouso",sub:"Último dia registrado"},
  {key:"sleepHours",title:"Sono",sub:"Média dos últimos 7 registros"},
  {key:"steps",title:"Passos",sub:"Média dos últimos 7 registros"}
 ];
 $("healthCards").innerHTML=defs.map(d=>{
  const value=d.key==="sleepHours"||d.key==="steps"?recentAverage(rows,d.key):latestValue(rows,d.key);
  return '<div class="health-kpi"><span class="health-kpi-label">'+esc(d.title)+'</span>'+
  '<strong>'+ (value==null?"—":esc(formatMetric(d.key,value))) +'</strong><small>'+esc(d.sub)+'</small></div>';
 }).join("");
}
function chart(rows){
 const key=$("healthChartMetric").value;
 const selected=rows.slice(-21).filter(r=>Number.isFinite(r[key]));
 const container=$("healthChart");
 if(selected.length<2){
  container.innerHTML='<div class="empty">Registre ao menos dois dias com esta medição para visualizar a evolução.</div>';
  return;
 }
 const values=selected.map(r=>r[key]),lowest=Math.min(...values),highest=Math.max(...values);
 const min=Math.max(0,lowest-(highest-lowest)*0.18-1),max=highest+(highest-lowest)*0.18+1,range=max-min;
 const width=660,height=196,padding=32;
 const coords=selected.map((r,i)=>({
  x:padding+i*(width-2*padding)/(selected.length-1),
  y:height-padding-(r[key]-min)/range*(height-2*padding),r
 }));
 const points=coords.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
 const marks=coords.map(p=>'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="#65dfc6"><title>'+dateBR(p.r.day)+": "+formatMetric(key,p.r[key])+'</title></circle>').join("");
 const ticks=[0,0.5,1].map(t=>{
  const y=height-padding-t*(height-2*padding);
  return '<line x1="'+padding+'" y1="'+y+'" x2="'+(width-padding)+'" y2="'+y+'" stroke="#315064" stroke-dasharray="4 5"/>'+
  '<text x="4" y="'+(y+3)+'" fill="#9eb7c9" font-size="10">'+esc(formatNum(min+t*range,0))+'</text>';
 }).join("");
 container.innerHTML='<svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Evolução de '+esc(labels[key])+' de '+dateBR(selected[0].day)+' a '+dateBR(selected.at(-1).day)+'" style="width:100%;height:auto;display:block">'+ticks+
 '<polyline fill="none" stroke="#64dfc7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="'+points+'"/>'+marks+
 '<text x="'+padding+'" y="'+(height-5)+'" font-size="11" fill="#a9c4d4">'+dateBR(selected[0].day)+'</text>'+
 '<text x="'+(width-padding)+'" y="'+(height-5)+'" text-anchor="end" font-size="11" fill="#a9c4d4">'+dateBR(selected.at(-1).day)+'</text></svg>';
}
function drawAnalysis(rows){
 const matched=rows.filter(r=>moodValue(r.day)!=null);
 $("healthJoinedCount").textContent=matched.length+" dia(s) com humor e medições";
 if(!matched.length){
  $("healthAnalysis").innerHTML='<div class="empty">Registre seu humor e uma medição no mesmo dia. Quando houver dados suficientes, veremos tendências de sono, batimentos e atividade.</div>';
  return;
 }
 const averageMood=matched.reduce((n,r)=>n+moodValue(r.day),0)/matched.length;
 const fields=["sleepHours","heartRest","heartAvg","steps"];
 const display=fields.map(key=>{
  const {r,n}=computeCorrelation(rows,key);
  return '<div class="health-analysis-row"><div><strong>'+esc(labels[key])+' × humor</strong>'+
    '<div class="small">'+n+' dias coincidentes</div></div>'+
    '<strong>'+ (r==null?'Aguardando dados':('r = '+formatNum(r,2))) +'</strong></div>';
 }).join("");
 $("healthAnalysis").innerHTML='<div class="health-joined"><span>Humor médio nos dias com medições</span><strong>'+formatNum(averageMood,1)+' / 5</strong></div>'+
 display+
 '<p class="small" style="margin-top:12px">As correlações aparecem com pelo menos 7 dias coincidentes e variação nos dados. Valores próximos de +1 ou −1 indicam associação estatística, não causa nem diagnóstico. Sono é associado à data em que você acordou.</p>';
}
function drawHistory(rows){
 $("healthCount").textContent=rows.length+" dias";
 $("healthHistory").innerHTML=rows.length?rows.slice().reverse().slice(0,20).map(r=>{
  const mood=moodValue(r.day);
  return '<div class="health-history-row"><div><strong>'+dateBR(r.day)+'</strong><div class="small">'+
    (mood!=null?"Humor: "+formatNum(mood,1)+"/5 · ":"")+
    (Number.isFinite(r.heartAvg)?"FC: "+formatNum(r.heartAvg)+" bpm · ":"")+
    (Number.isFinite(r.sleepHours)?"Sono: "+formatNum(r.sleepHours,1)+" h · ":"")+
    (Number.isFinite(r.steps)?"Passos: "+formatNum(r.steps)+"":"")+'</div></div>'+
    '<div style="display:flex;gap:5px"><button class="roundbtn" data-health-edit="'+esc(r.day)+'" title="Editar registros deste dia" aria-label="Editar '+dateBR(r.day)+'">✎</button>'+
    '<button class="roundbtn" data-health-remove="'+esc(r.day)+'" title="Excluir registros deste dia" aria-label="Excluir '+dateBR(r.day)+'">✕</button></div></div>';
 }).join(""):'<div class="empty">Nenhuma medição registrada. Importe um CSV ou use o formulário.</div>';
 $("healthHistory").querySelectorAll("[data-health-edit]").forEach(b=>b.onclick=()=>{
  fillForm(rows.find(r=>r.day===b.dataset.healthEdit));
  window.DGXgoto?.("health");
  $("healthForm").scrollIntoView({block:"start",behavior:"smooth"});
 });
 $("healthHistory").querySelectorAll("[data-health-remove]").forEach(b=>b.onclick=()=>{
  if(!confirm("Excluir definitivamente as medições de "+dateBR(b.dataset.healthRemove)+"? Seu registro de humor não será apagado."))return;
  window.DGXStore?.write(KEY,rows.filter(r=>r.day!==b.dataset.healthRemove));draw();
 });
}
function draw(){
 const rows=completeRows();
 drawCards(rows);chart(rows);drawAnalysis(rows);drawHistory(rows);
 $("healthSyncState").textContent="Dados privados salvos na sua conta DGX. Sem conexão automática com Huawei Saúde.";
}
function fillForm(row){
 $("healthDay").value=row?.day||today();
 for(const key of Object.keys(labels))$("health-"+key).value=Number.isFinite(row?.[key])?String(row[key]).replace(".",","):"";
}
$("healthForm").addEventListener("submit",e=>{
 e.preventDefault();
 const date=$("healthDay").value;
 if(!validDay(date)||date>today()){notify("Escolha uma data válida, não futura.");return}
 const patch={day:date,source:"manual"};
 let count=0,invalid=[];
 for(const key of Object.keys(labels)){
  const input=$("health-"+key).value.trim();
  if(!input)continue;
  const val=safeValue(key,input);
  if(val===null)invalid.push(labels[key]);
  else{patch[key]=val;count++}
 }
 if(invalid.length){notify("Verifique os valores: "+invalid.join(", "));return}
 if(!count){notify("Preencha ao menos uma medição.");return}
 updateRecords([patch]);notify("Medições enviadas para o banco DGX.");
});
$("healthClearForm").onclick=()=>fillForm();
$("healthChartMetric").onchange=()=>chart(completeRows());

function csvParse(content,limit=20000){
 const s=content.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
 const first=s.split("\n").find(x=>x.trim())||"";
 const delimiters=[";",",","\t"];
 const delimiter=delimiters.map(d=>[d,(first.match(new RegExp(d==="\t"?"\t":d===";"?";":",","g"))||[]).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=[];let row=[],cell="",inside=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='"'){
   if(inside&&s[i+1]==='"'){cell+='"';i++}else inside=!inside;
  }else if(c===delimiter&&!inside){row.push(cell.trim());cell=""}
  else if(c==="\n"&&!inside){row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";if(rows.length>limit)throw Error("Arquivo muito grande; limite de 20 mil linhas.");}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell.trim());if(row.some(Boolean))rows.push(row)}
 if(rows.length<2)throw Error("CSV precisa de cabeçalho e pelo menos uma linha.");
 return rows;
}
function parseDate(str){
 const s=String(str||"").trim();
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m){const d=m[1]+"-"+m[2]+"-"+m[3];return validDay(d)?d:null}
 m=s.match(/^(\d{2})[\/.](\d{2})[\/.](\d{4})/);
 if(m){const d=m[3]+"-"+m[2]+"-"+m[1];return validDay(d)?d:null}
 return null;
}
function setSelect(select,choices){
 select.innerHTML=choices.map(x=>'<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>').join("");
}
function guessColumn(headers,pattern){
 const n=headers.map(normalizeHeader);const i=n.findIndex(x=>pattern.test(x));return i>=0?String(i):"";
}
$("healthCsvFile").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 $("healthCsvStatus").textContent="Lendo o arquivo no navegador...";
 if(file.size>2_500_000){notify("Arquivo acima de 2,5 MB. Exporte um período menor.");return}
 try{
  const raw=csvParse(await file.text());importColumns=raw[0];importedRows=raw.slice(1);
  fileName=file.name;
  const options=importColumns.map((name,i)=>[String(i),name||"Coluna "+(i+1)]);
  setSelect($("healthCsvDate"),options);setSelect($("healthCsvValue"),options);
  $("healthCsvDate").value=guessColumn(importColumns,/^(date|data|day|dia|timestamp|datetime|starttime|dateonly|recordedat)/)||"0";
  $("healthCsvValue").value=guessColumn(importColumns,/(heartrate|batimento|bpm|heartavg|sleep|sono|steps|passos|spo2|oxygen|stress)/)||String(Math.min(1,options.length-1));
  $("healthCsvMapping").classList.remove("hide");
  $("healthCsvStatus").textContent=importedRows.length+" linhas lidas localmente. Confirme as colunas e a métrica antes de importar.";
 }catch(error){$("healthCsvStatus").textContent=error.message;notify(error.message)}
});
$("healthCsvMetric").onchange=()=>{
 const key=$("healthCsvMetric").value;
 $("healthCsvUnit").value=key==="sleepHours"?"hours":"raw";
 $("healthCsvAggregate").value=["steps","sleepHours"].includes(key)?"sum":"average";
};
$("healthCsvImport").onclick=()=>{
 if(!importedRows.length){notify("Selecione primeiro um CSV.");return}
 const dateCol=Number($("healthCsvDate").value),valueCol=Number($("healthCsvValue").value);
 const key=$("healthCsvMetric").value,unit=$("healthCsvUnit").value,agg=$("healthCsvAggregate").value;
 if(dateCol===valueCol){notify("Selecione colunas diferentes para data e valor.");return}
 const groups=new Map();let skipped=0;
 for(const row of importedRows){
  const date=parseDate(row[dateCol]),value=safeValue(key,row[valueCol]);
  if(!date||date>today()||value==null){skipped++;continue}
  let converted=value;
  if(key==="sleepHours"&&unit==="minutes")converted=value/60;
  // Aceita sessões de sono de até 24 h sem permitir quantidades fisicamente impossíveis
  const group=groups.get(date)||[];group.push(converted);groups.set(date,group);
 }
 const records=[];
 for(const [day,values] of groups.entries()){
  let value=agg==="sum"?values.reduce((s,v)=>s+v,0):agg==="last"?values.at(-1):values.reduce((s,v)=>s+v,0)/values.length;
  value=Math.round(value*100)/100;
  if(safeValue(key,value)==null){skipped+=values.length;continue}
  records.push({day,[key]:value,source:"CSV: "+fileName.slice(0,70)});
 }
 if(!records.length){notify("Nenhum dia válido identificado. Revise formato das datas, coluna de valores e unidade.");return}
 if(!confirm("Importar "+records.length+" dia(s) de "+labels[key]+"? Se houver dados dessa métrica nos mesmos dias, serão substituídos. Outras medições e humor serão preservados."))return;
 updateRecords(records);
 $("healthCsvStatus").textContent=records.length+" dias importados de "+fileName+(skipped?" · "+skipped+" valores ignorados":"")+".";
 notify("CSV importado para o DGX.");
};
$("healthExampleCsv").onclick=()=>{
 const content="data;fc_media;fc_repouso;sono_horas;passos\n2026-11-01;74;61;7,5;7400\n2026-11-02;78;64;6,8;5800\n";
 const blob=new Blob(["\uFEFF"+content],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="dgx-modelo-saude.csv";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.DGXhealthRefresh=draw;
fillForm();
draw();
})();