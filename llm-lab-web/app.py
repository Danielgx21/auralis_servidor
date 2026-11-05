from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from collections import defaultdict, Counter
from urllib import request, parse
import ast, json, os, re, hmac
from dgx_conversation import reply as demo_reply

PORT = int(os.environ.get("PORT", "8000"))
BASE = os.environ.get("LLM_BASE_URL", "").rstrip("/")
MODEL = os.environ.get("LLM_MODEL", "")
KEY = os.environ.get("LLM_API_KEY", "")
ACCESS_PIN = os.environ.get("DGX_ACCESS_PIN", "")
CORPUS = ("""A inteligência artificial aprende padrões dos dados.
A ciência testa hipóteses e busca evidências.
Um modelo de linguagem prevê unidades de texto.
Uma rede neural ajusta seus parâmetros com o treinamento.
O raciocínio exige inferências e verificação dos resultados.
Uma boa resposta precisa ser fundamentada e transparente.
O ser humano aprende observando, experimentando e discutindo ideias.
A tecnologia pode ajudar a estudar, investigar e realizar tarefas.
""") * 40
STATS = defaultdict(Counter)
for a,b,c in zip(CORPUS,CORPUS[1:],CORPUS[2:]):
    STATS[a+b][c] += 1

def compute(s):
    s=s.replace("×","*").replace("÷","/")
    if len(s)>95: raise ValueError()
    t=ast.parse(s,mode="eval")
    def go(n,d=0):
        if d>15: raise ValueError()
        if isinstance(n,ast.Expression): return go(n.body,d+1)
        if isinstance(n,ast.Constant) and type(n.value) in (int,float) and abs(n.value)<1e10: return n.value
        if isinstance(n,ast.UnaryOp) and isinstance(n.op,(ast.UAdd,ast.USub)):
            v=go(n.operand,d+1)
            return v if isinstance(n.op,ast.UAdd) else -v
        if isinstance(n,ast.BinOp) and isinstance(n.op,(ast.Add,ast.Sub,ast.Mult,ast.Div,ast.Pow)):
            a,b=go(n.left,d+1),go(n.right,d+1)
            if isinstance(n.op,ast.Add): v=a+b
            elif isinstance(n.op,ast.Sub): v=a-b
            elif isinstance(n.op,ast.Mult): v=a*b
            elif isinstance(n.op,ast.Div): v=a/b
            else:
                if abs(b)>10: raise ValueError()
                v=a**b
            if isinstance(v,complex) or abs(v)>1e13: raise ValueError()
            return v
        raise ValueError()
    return round(go(t),7)

def get_prediction(s):
    pair=str(s)[-2:]
    cnt=STATS.get(pair)
    if not cnt: cnt=Counter(CORPUS)
    total=sum(cnt.values())
    return [{"token":c,"pct":round(100*n/total,1)} for c,n in cnt.most_common(7)]

def chat(body, supplied_pin=""):
    msg = str(body.get("message", "")).strip()[:2000]
    if not msg:
        return {"reply": "Digite uma mensagem.", "engine": "Sistema", "mode": "system"}
    hist = body.get("history", [])
    if not isinstance(hist, list):
        hist = []
    hist = [
        {"role": h["role"], "content": h["content"][:2000]}
        for h in hist[-18:]
        if isinstance(h, dict)
        and h.get("role") in ("user", "assistant")
        and isinstance(h.get("content"), str)
    ]
    m = re.match(r"^(?:calcule|calcular|quanto [ée]|resolver?)\s*:?\s*(.+?)\??$", msg, re.I)
    if m:
        try:
            return {"reply": "Resultado: " + str(compute(m.group(1))),
                    "engine": "Calculadora segura · sem LLM", "mode": "tool"}
        except Exception:
            return {"reply": "Não consegui calcular. Use números, parênteses e + - * / **.",
                    "engine": "Calculadora segura · sem LLM", "mode": "tool"}

    # Sem modelo configurado, não fingimos respostas de LLM.
    if not (BASE and MODEL and ACCESS_PIN):
        return demo_reply(msg, hist)

    # A API pode gerar custos. Nunca permitir o endpoint público sem autenticação.
    if not hmac.compare_digest(str(supplied_pin), ACCESS_PIN):
        return {"reply": "Digite o código de acesso configurado pelo administrador.",
                "engine": "Acesso protegido", "mode": "auth"}

    messages = [{"role": "system", "content":
        "Você é DGX LLM, um assistente experimental em português brasileiro. "
        "Seja útil, claro e cuidadoso; mantenha o contexto da conversa. "
        "Explique seus limites e nunca alegue ter executado ações não realizadas. "
        "Você está sendo executado por um modelo externo ou open-weight configurado pelo administrador; "
        "não afirme que seus pesos foram treinados pelo usuário."}]
    messages.extend(hist)
    messages.append({"role": "user", "content": msg})
    endpoint = BASE.rstrip("/")
    if not endpoint.endswith("/chat/completions"):
        endpoint += "/chat/completions" if endpoint.endswith("/v1") else "/v1/chat/completions"
    payload = json.dumps({
        "model": MODEL, "messages": messages, "temperature": 0.6, "max_tokens": 650
    }).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if KEY:
        headers["Authorization"] = "Bearer " + KEY
    try:
        resp = request.urlopen(request.Request(endpoint, data=payload, headers=headers), timeout=55)
        data = json.loads(resp.read(1500000))
        answer = data["choices"][0]["message"]["content"]
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError("empty model output")
        return {"reply": answer.strip(), "engine": "Modelo de linguagem · " + MODEL,
                "mode": "llm"}
    except Exception:
        return {"reply": "Não consegui consultar o modelo configurado. Confira o endpoint, a chave e o status do servidor de inferência. Seus históricos locais continuam preservados.",
                "engine": "Modelo temporariamente indisponível", "mode": "error"}


PAGE = r'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DGX LLM — IA em construção</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#edf4f2;background:#0b1417;--line:#263c40;--muted:#92aaa9;--green:#6ee6bb}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top right,#143f35,transparent 46%),#0b1417}.app{display:grid;grid-template-columns:245px 1fr;min-height:100dvh}.side{background:#0c181cd9;border-right:1px solid var(--line);padding:25px 16px;display:flex;flex-direction:column;gap:28px}.brand{font-size:21px;font-weight:800;letter-spacing:-1px}.brand em{font-style:normal;color:var(--green)}.hint{font-size:12px;color:var(--muted);line-height:1.6}.nav{display:grid;gap:8px}button{cursor:pointer;font:inherit}.nav button{text-align:left;color:#a5bbb7;border:1px solid transparent;border-radius:11px;padding:12px;background:transparent}.nav .active{background:#173b32;color:#8ff7d0;border-color:#295e4c;font-weight:700}.sidefoot{margin-top:auto;border:1px solid var(--line);border-radius:13px;padding:12px;font-size:12px;color:#c8d7d3;background:#101f22}.light{display:inline-block;width:8px;height:8px;background:#eeb968;border-radius:50%;margin-right:6px}main{display:flex;flex-direction:column;max-height:100dvh;min-width:0}.head{padding:20px 5%;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.kicker{font-size:10px;color:var(--green);letter-spacing:2px;font-weight:700}.head b{font-size:16px}.status{font-size:11px;background:#203b31;border:1px solid #385d4c;border-radius:30px;padding:8px 11px;color:#b6ebd3}.content{padding:28px 5%;display:flex;flex-direction:column;flex:1;min-height:0;overflow:auto}.view{display:none;flex:1;flex-direction:column;min-height:0}.view.on{display:flex}h1{font-size:clamp(28px,4vw,45px);letter-spacing:-1.5px;line-height:1.13;margin:3px 0 12px}h1 span{color:var(--green)}p{color:var(--muted);font-size:14px;line-height:1.65}.intro{max-width:730px}.messages{flex:1;min-height:220px;overflow:auto;display:flex;flex-direction:column;gap:15px;padding:16px 0}.msg{max-width:85%;border:1px solid var(--line);border-radius:15px;padding:13px 16px;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.msg.bot{align-self:flex-start;background:#18282d;border-top-left-radius:3px}.msg.me{align-self:flex-end;background:#20463a;border-top-right-radius:3px}.who{font-size:10px;color:#86b7a7;margin-bottom:8px}.composer{border-top:1px solid var(--line);padding-top:14px}.shortcuts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:13px}.shortcuts button{padding:8px 12px;color:#c0e4d5;background:#172c29;border:1px solid #335b4c;border-radius:30px;font-size:12px}.input{display:flex;gap:9px;background:#1b3030;border:1px solid #35564c;border-radius:16px;padding:9px}textarea{background:transparent;border:0;outline:none;resize:none;flex:1;color:white;padding:12px;min-height:43px;font:inherit}textarea::placeholder{color:#93aaa4}.send{border:0;border-radius:11px;background:#77eac1;color:#07271b;font-weight:800;padding:0 18px}.tiny{font-size:11px;color:#829c99}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin:12px 0 22px}.card{background:#142328;border:1px solid #2c4547;border-radius:16px;padding:17px}.card small{font-size:11px;color:var(--muted)}.value{font-size:25px;font-weight:800;margin:9px 0}.labcard{background:#15252a;border:1px solid #2c4547;border-radius:18px;padding:22px;margin:8px 0}.labcard h2{font-size:18px;margin:0}.labcard input{width:100%;padding:14px;border-radius:11px;background:#0b191c;border:1px solid #3b5e56;color:#fff;font:inherit}.barline{display:flex;align-items:center;gap:12px;margin:12px 0;font-size:12px}.token{width:72px}.track{flex:1;background:#2b3b42;height:12px;border-radius:15px;overflow:hidden}.fill{height:100%;background:linear-gradient(90deg,#39a49b,#87edba);border-radius:12px}.pct{width:48px;text-align:right}.steps{display:grid;grid-template-columns:1fr 1fr;gap:14px}.step{border:1px solid #2d4c42;border-radius:15px;padding:17px;background:#142527}.step b{color:var(--green)}.tag{color:#83dbb2;font-size:11px;border:1px solid #3b6852;padding:5px 9px;border-radius:20px;display:inline-block}@media(max-width:780px){.app{display:block}.side{height:63px;padding:9px;flex-direction:row;align-items:center;justify-content:space-between;gap:4px;border-right:0;border-bottom:1px solid var(--line)}.brand{font-size:15px}.side .hint,.sidefoot{display:none}.nav{display:flex;gap:2px}.nav button{font-size:11px;padding:9px}.head{padding:11px 17px}.head b{font-size:14px}.content{padding:21px 16px}main{height:calc(100dvh - 63px)}.msg{max-width:96%}.grid{grid-template-columns:1fr 1fr}.grid .card:last-child{grid-column:span 2}.steps{grid-template-columns:1fr}}
</style></head><body><div class="app"><aside class="side"><div><div class="brand">✦ DGX <em>LLM</em></div><div class="hint">Nossa inteligência em construção · v0.2</div></div><nav class="nav"><button class="active" data-v="chat">◉ Conversar</button><button data-v="lab">◇ Laboratório</button><button data-v="plan">▤ Evolução</button></nav><div class="sidefoot"><span class="light" id="light"></span><span id="smallStatus">Verificando...</span><div class="hint">Tarefas e cálculos são ferramentas locais. Conversa livre precisa de um modelo.</div></div></aside><main><header class="head"><div><div class="kicker">DGX · LABORATÓRIO DE IA</div><b id="ptitle">Assistente experimental</b></div><span class="status" id="status">Verificando</span></header><div class="content"><section class="view on" id="chat"><div class="intro"><h1>Converse com a <span>DGX LLM.</span></h1><p>Uma assistente experimental que evolui com o projeto. No modo didático, ela usa regras e contexto. Ao conectarmos uma LLM, poderá manter conversas abertas. A origem de cada resposta é identificada.</p></div><div class="messages" id="messages"></div><div class="composer"><div class="shortcuts"><button data-example="Como uma LLM aprende?">◇ Conversar sobre IA</button><button data-example="calcule (15+7)*3">✳ Cálculo</button><button data-example="Crie tarefa estudar Transformers">＋ Tarefas</button><button id="newchat" type="button">↺ Nova conversa</button></div><div class="input"><textarea id="msg" rows="1" maxlength="2000" placeholder="Digite sua mensagem..."></textarea><button class="send" id="send">Enviar ↗</button></div><div id="accessbox" style="display:none;margin-top:10px"><label for="pin" class="tiny">Código privado de acesso ao modelo:</label> <input id="pin" type="password" autocomplete="off" placeholder="Código de acesso" style="background:#162928;border:1px solid #3c5c50;color:#fff;border-radius:9px;padding:9px;margin-left:8px;max-width:180px"></div><p class="tiny" id="privacy">Histórico e tarefas são armazenados somente neste navegador. Não compartilhe dados sensíveis nesta versão experimental.</p></div></section><section class="view" id="lab"><div class="intro"><h1>Entenda a <span>previsão.</span></h1><p>Aqui vemos um preditor de caracteres por frequência. <b>Ele não é nossa mini-LLM Transformer.</b> Serve para comparar um método simples com o aprendizado de redes neurais.</p></div><div class="grid"><div class="card"><small>Texto do experimento</small><div class="value" id="chars">—</div><small>caracteres</small></div><div class="card"><small>Contexto usado</small><div class="value">2</div><small>caracteres anteriores</small></div><div class="card"><small>Transformer independente</small><div class="value">~243 mil</div><small>parâmetros no pacote de treinamento</small></div></div><div class="labcard"><h2>Qual o próximo caractere?</h2><p>Digite um texto para ver probabilidades aprendidas com o pequeno corpus de demonstração.</p><input id="prompt" value="A inteligência"><div id="bars"></div><p class="tiny">As probabilidades são empíricas e não demonstram raciocínio.</p></div><div class="labcard"><h2>Treinando nossa própria rede</h2><p>O código da mini-LLM Transformer está no pacote do projeto. Treinar pesos aleatórios de uma rede neural é diferente deste preditor estatístico. Para treinar e hospedar um modelo maior, precisaremos de uma GPU separada da hospedagem da página.</p></div></section><section class="view" id="plan"><div class="intro"><h1>Rumo à <span>independência.</span></h1><p>O motor de IA é desacoplado do site: podemos substituir um provedor temporário por infraestrutura e pesos nossos, sem reconstruir a interface.</p></div><div class="steps"><div class="step"><b>01 · Página e ferramentas</b><p>Chat, calculadora e tarefas no navegador; laboratório de probabilidades.</p><span class="tag">Implementado</span></div><div class="step"><b>02 · Conversa com modelo aberto</b><p>Configurar endpoint privado de modelo hospedado em GPU.</p><span class="tag">A configurar</span></div><div class="step"><b>03 · Nosso Transformer</b><p>Treinar do zero, acompanhar perda e avaliar a generalização.</p><span class="tag">Código experimental disponível</span></div><div class="step"><b>04 · Modelo e infraestrutura próprios</b><p>Ampliar dados e parâmetros, testar qualidade e gradualmente substituir o motor externo.</p><span class="tag">Meta de longo prazo</span></div></div><div class="labcard"><h2>Diferença importante</h2><p>Hospedar pesos abertos por conta própria elimina a dependência de uma API. Ter uma LLM com pesos realmente nossos exige treinamento desde o zero e muito mais recursos. São metas diferentes.</p></div></section></div></main></div>
<script>
const by=id=>document.getElementById(id);
const HISTORY_KEY='dgxllm_chat_v02';
const TASKS_KEY='dgxllm_tasks_v02';
let history=[];
function loadHistory(){
  try{
    const parsed=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    return Array.isArray(parsed)?parsed.filter(h=>h && (h.role==='user'||h.role==='assistant') && typeof h.content==='string').slice(-36):[];
  }catch{return []}
}
function saveHistory(){
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(-36)))}catch{}
}
function bubble(s,own,engine){
  const d=document.createElement('div');d.className='msg '+(own?'me':'bot');
  if(engine){const e=document.createElement('div');e.className='who';e.textContent=engine;d.append(e)}
  const span=document.createElement('span');span.textContent=s;d.append(span);
  by('messages').append(d);by('messages').scrollTop=by('messages').scrollHeight
}
function addMessage(role,content,engine){
  history.push({role,content,engine:engine||''});
  history=history.slice(-36);saveHistory();
  bubble(content,role==='user',engine)
}
function freshChat(){
  if(history.length && !confirm('Começar uma nova conversa? O histórico desta conversa será apagado deste navegador.'))return;
  history=[];saveHistory();by('messages').replaceChildren();
  bubble('Olá! Sou a DGX LLM. Podemos conversar sobre inteligência artificial, raciocínio e treinamento. Neste estágio, meu modo didático usa regras — não uma LLM real. Também posso executar cálculos e organizar tarefas.',false,'DGX · Modo didático')
}
history=loadHistory();
if(history.length){history.forEach(x=>bubble(x.content,x.role==='user',x.engine))}else{freshChat()}
by('newchat').onclick=freshChat;
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-v]').forEach(n=>n.classList.toggle('active',n===b));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id===b.dataset.v));
  by('ptitle').textContent=({chat:'Conversa DGX LLM',lab:'Laboratório de previsão',plan:'Evolução do projeto'})[b.dataset.v];
  if(b.dataset.v==='lab')predict()
});
function tasks(){
  try{
    const newer=localStorage.getItem(TASKS_KEY);
    return JSON.parse(newer||localStorage.getItem('labllm_tasks')||'[]')
  }catch{return []}
}
function saveTasks(items){try{localStorage.setItem(TASKS_KEY,JSON.stringify(items))}catch{}}
function task(msg){
  let m=msg.match(/^(?:crie|criar|adicione|anote)\s+(?:uma?\s+)?tarefa\s*(?:de|para|:)?\s+(.+)$/i);
  if(m){const t=tasks();t.push({text:m[1],done:false});saveTasks(t);return 'Tarefa anotada neste navegador: '+m[1]}
  if(/^(?:liste|listar|mostre|mostrar)\s+(?:minhas\s+)?tarefas/i.test(msg)){
    const t=tasks();return t.length?t.map((x,i)=>(i+1)+'. '+(x.done?'✓':'○')+' '+x.text).join('\n'):'Ainda não há tarefas.'
  }
  m=msg.match(/^conclu(?:a|ir)\s+tarefa\s+(\d+)$/i);
  if(m){const t=tasks(),i=Number(m[1])-1;if(!t[i])return 'Tarefa não encontrada.';t[i].done=true;saveTasks(t);return 'Tarefa concluída: '+t[i].text}
  return null
}
let busy=false;
async function send(){
  if(busy)return;
  const msg=by('msg').value.trim();if(!msg)return;
  by('msg').value='';const prior=history.slice(-18).map(x=>({role:x.role,content:x.content}));
  addMessage('user',msg);
  busy=true;by('send').disabled=true;by('send').textContent='...';
  const handled=task(msg);
  if(handled!==null){
    addMessage('assistant',handled,'Ferramenta local · sem LLM');
    busy=false;by('send').disabled=false;by('send').textContent='Enviar ↗';return
  }
  try{
    const r=await fetch('/api/chat',{method:'POST',headers:{
      'Content-Type':'application/json',
      'X-DGX-Access-Pin':by('pin').value
    },body:JSON.stringify({message:msg,history:prior})});
    const v=await r.json();
    addMessage('assistant',v.reply||'Não foi possível responder.',v.engine||'DGX');
  }catch{addMessage('assistant','Não consegui conectar ao servidor. Tente novamente.','Falha de rede')}
  finally{busy=false;by('send').disabled=false;by('send').textContent='Enviar ↗'}
}
by('send').onclick=send;
by('msg').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{by('msg').value=b.dataset.example;send()});
async function predict(){
  try{
    const r=await fetch('/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:by('prompt').value})});
    const data=await r.json();by('bars').replaceChildren();
    data.predictions.forEach(x=>{
      const row=document.createElement('div');row.className='barline';
      const label=document.createElement('span');label.className='token';label.textContent=JSON.stringify(x.token);
      const track=document.createElement('div');track.className='track';
      const fill=document.createElement('div');fill.className='fill';fill.style.width=x.pct+'%';track.append(fill);
      const pct=document.createElement('span');pct.className='pct';pct.textContent=x.pct+'%';
      row.append(label,track,pct);by('bars').append(row)
    })
  }catch{by('bars').textContent='Falha ao carregar o experimento.'}
}
let timer;by('prompt').oninput=()=>{clearTimeout(timer);timer=setTimeout(predict,180)};
fetch('/api/status').then(r=>r.json()).then(v=>{
  const status=v.model_connected?'Motor configurado':'Conversa didática';
  by('status').textContent=status;by('smallStatus').textContent=status;
  by('light').style.background=v.model_connected?'#6ee6bb':'#eeb968';
  by('chars').textContent=v.corpus_chars.toLocaleString('pt-BR');
  by('accessbox').style.display=v.pin_required?'block':'none';
}).catch(()=>{by('status').textContent='Servidor indisponível'});
</script></body></html>'''

class Handler(BaseHTTPRequestHandler):
    def send(self,obj,status=200):
        dat=json.dumps(obj,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Length",str(len(dat)))
        self.end_headers(); self.wfile.write(dat)
    def do_GET(self):
        path = parse.urlsplit(self.path).path
        if path == "/favicon.ico":
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path not in ("/api/status", "/health") and not path.startswith("/api/"):
            b=PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type","text/html; charset=utf-8")
            self.send_header("Content-Length",str(len(b)))
            self.end_headers();self.wfile.write(b)
        elif path=="/api/status":
            self.send({"model_connected":bool(BASE and MODEL and ACCESS_PIN),"pin_required":bool(BASE and MODEL and ACCESS_PIN),"corpus_chars":len(CORPUS),"app":"DGX LLM"})
        elif path=="/health":self.send({"ok":True})
        else:self.send({"error":"not found"},404)
    def do_POST(self):
        path = parse.urlsplit(self.path).path
        try:
            n=int(self.headers.get("Content-Length","0"))
            if n<1 or n>25000:return self.send({"error":"invalid size"},400)
            p=json.loads(self.rfile.read(n))
            if not isinstance(p,dict):return self.send({"error":"invalid payload"},400)
            if path=="/api/chat":return self.send(chat(p, self.headers.get("X-DGX-Access-Pin", "")))
            if path=="/api/predict":return self.send({"predictions":get_prediction(p.get("text",""))})
            self.send({"error":"not found"},404)
        except Exception:self.send({"error":"invalid request"},400)
    def log_message(self,*args):pass

if __name__=="__main__":
    print("DGX LLM v0.2 online, PORT",PORT,flush=True)
    ThreadingHTTPServer(("0.0.0.0",PORT),Handler).serve_forever()
