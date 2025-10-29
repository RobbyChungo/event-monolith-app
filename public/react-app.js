const { useState, useEffect } = React

function useApi(){
  const base = window.location.origin
  const [token,setToken] = useState(localStorage.getItem('jwt')||'')
  const [claims,setClaims] = useState(()=>{ try{ return JSON.parse(atob((localStorage.getItem('jwt')||'.').split('.')[1]||'{}')) }catch{return {}} })
  useEffect(()=>{ if(token) localStorage.setItem('jwt', token) },[token])
  useEffect(()=>{ try{ setClaims(JSON.parse(atob((token||'.').split('.')[1]||'{}')))}catch{ setClaims({}) } },[token])
  async function call(path, method='GET', body){
    const headers = { 'Content-Type': 'application/json' }
    if(token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${base}${path}`, { method, headers, body: body?JSON.stringify(body):undefined })
    if(!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    return res.json()
  }
  return { token,setToken, claims, call }
}

function Auth({ api }){
  const [email,setEmail] = useState('user@example.com')
  const [password,setPassword] = useState('password')
  async function signup(){ try{ await api.call('/auth/signup','POST',{ email,password }); alert('Signup ok') } catch(e){ alert(e.message) } }
  async function login(){ try{ const out = await api.call('/auth/login','POST',{ email,password }); api.setToken(out?.token||'') } catch(e){ alert(e.message) } }
  return (
    <div className="card">
      <h3>Auth</h3>
      <div className="row">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="password" />
        <button onClick={signup}>Signup</button>
        <button onClick={login}>Login</button>
        <span className="muted">Token: <code>{api.token? api.token.slice(0,12)+'…':'none'}</code></span>
        <span className="muted">Role: <code>{api.claims?.role || 'unknown'}</code></span>
      </div>
    </div>
  )
}

function AIBox({ api }){
  const [topic,setTopic] = useState('health')
  const [out,setOut] = useState('')
  const [list,setList] = useState([])
  async function suggest(){
    try{
      const r = await api.call('/ai/suggest','POST',{ topic, count: 5 })
      setList(r?.suggestions || [])
      setOut(r?.suggestion||r?.message||'')
    } catch(e){ setOut('Error: '+e.message); setList([]) }
  }
  return (
    <div className="card">
      <h3>AI Suggest</h3>
      <div className="row">
        <input value={topic} onChange={e=>setTopic(e.target.value)} />
        <button onClick={suggest}>Suggest</button>
      </div>
      {list.length ? (
        <ul>
          {list.map((s,i)=>(<li key={i}>{s}</li>))}
        </ul>
      ): (<div className="muted">{out}</div>)}
    </div>
  )
}

function Events({ api }){
  const [items,setItems] = useState([])
  async function load(){ const r = await api.call('/events','GET'); setItems(r?.events || r || []) }
  useEffect(()=>{ load() },[])

  async function rsvp(id, response){
    try{ const out = await api.call(`/events/${id}/rsvp`,'POST',{ response }); alert('RSVP ok'); if(out?.suggestions) console.log('suggestions', out.suggestions) }
    catch(e){ alert(e.message) }
  }

  // Organizer/Admin create form
  const [title,setTitle] = useState('Sample Event')
  const [description,setDescription] = useState('Description')
  const [date,setDate] = useState(new Date(Date.now()+86400000).toISOString().slice(0,16))
  const [location,setLocation] = useState('Main Hall')

  async function createEvent(){
    try{
      const iso = new Date(date).toISOString()
      const out = await api.call('/events/create','POST',{ title, description, date: iso, location })
      alert('Created'); load()
    }catch(e){ alert(e.message) }
  }

  return (
    <div className="card">
      <h3>Events</h3>
      <div className="row">
        <button onClick={load}>Reload</button>
        {(api.claims?.role==='ADMIN' || api.claims?.role==='ORGANIZER') && (
          <>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="title" />
            <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="description" />
            <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} />
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="location" />
            <button onClick={createEvent}>Create</button>
          </>
        )}
      </div>
      <div className="list">
        {items.map(ev => (
          <div key={ev.id} className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <div>
                <div><strong>{ev.title}</strong></div>
                <div className="muted">{new Date(ev.date).toLocaleString()} — {ev.location||''} {ev.approved? '✅ approved':'🕓 pending'}</div>
              </div>
              <div className="row">
                <select id={`sel-${ev.id}`} defaultValue="YES">
                  <option value="YES">YES</option>
                  <option value="MAYBE">MAYBE</option>
                  <option value="NO">NO</option>
                </select>
                <button onClick={()=>{
                  const val = document.getElementById(`sel-${ev.id}`).value
                  rsvp(ev.id, val)
                }}>RSVP</button>
                {(api.claims?.role==='ADMIN' || api.claims?.userId===ev.createdById) && (
                  <>
                    <button onClick={async()=>{ try{ const title=prompt('Title', ev.title)||ev.title; const description=prompt('Description', ev.description||'')||''; const date=prompt('ISO date', ev.date)||ev.date; const location=prompt('Location', ev.location||'')||''; await api.call(`/events/${ev.id}`,'PUT',{ title, description, date, location }); alert('Updated'); load() }catch(e){ alert(e.message) } }}>Update</button>
                    <button onClick={async()=>{ if(!confirm('Delete event?')) return; try{ await api.call(`/events/${ev.id}`,'DELETE'); alert('Deleted'); load() }catch(e){ alert(e.message) } }}>Delete</button>
                  </>
                )}
                {api.claims?.role==='ADMIN' && !ev.approved && (
                  <button onClick={async()=>{ try{ await api.call(`/events/${ev.id}/approve`,'PUT'); alert('Approved'); load() }catch(e){ alert(e.message) } }}>Approve</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Realtime(){
  const [logs,setLogs] = useState([])
  useEffect(()=>{
    try{
      const socket = window.io(window.location.origin, { transports:['websocket'] })
      const push = (k,p)=> setLogs(l => [{ t:new Date().toLocaleTimeString(), k, p }, ...l].slice(0,50))
      socket.on('connect', ()=>push('ws','connected'))
      socket.on('rsvps', (p)=>push('rsvps', p))
      socket.on('events', (p)=>push('events', p))
      return ()=> socket.close()
    }catch{}
  },[])
  return (
    <div className="card">
      <h3>Realtime</h3>
      <div className="muted">Listening to <span className="pill">rsvps</span> and <span className="pill">events</span></div>
      <div className="list" style={{marginTop:8}}>
        {logs.map((l,i)=>(<div key={i} className="muted">[{l.t}] {l.k}: {JSON.stringify(l.p)}</div>))}
      </div>
    </div>
  )
}

function App(){
  const api = useApi()
  return (
    <div>
      <h1>Event Monolith — React</h1>
      <Auth api={api} />
      <AIBox api={api} />
      <Events api={api} />
      <Realtime />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)


