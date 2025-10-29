(function(){
  const base = window.location.origin
  const $ = (id) => document.getElementById(id)

  function setToken(t){
    if(t){ localStorage.setItem('jwt', t) }
    const preview = t ? (t.slice(0,12)+"…") : 'none'
    $('tokenPreview').textContent = preview
  }
  setToken(localStorage.getItem('jwt'))

  async function api(path, method='GET', body){
    const headers = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('jwt')
    if(token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${base}${path}`, { method, headers, body: body?JSON.stringify(body):undefined })
    if(!res.ok){ throw new Error(`${res.status} ${await res.text()}`) }
    return res.json()
  }

  $('signup').onclick = async () => {
    try{
      const out = await api('/auth/signup','POST',{ email:$('email').value, password:$('password').value })
      console.log('signup', out)
      alert('Signup ok (check server logs for Ethereal mock)')
    }catch(e){ alert('Signup failed: '+e.message) }
  }

  $('login').onclick = async () => {
    try{
      const out = await api('/auth/login','POST',{ email:$('email').value, password:$('password').value })
      setToken(out?.token)
    }catch(e){ alert('Login failed: '+e.message) }
  }

  $('aiSuggest').onclick = async () => {
    const topic = $('topic').value || 'health'
    try{
      const out = await api('/ai/suggest','POST',{ topic, count: 5 })
      const list = out?.suggestions || []
      $('aiOut').innerHTML = list.length ? ('<ul>'+list.map(li=>`<li>${li}</li>`).join('')+'</ul>') : (out?.suggestion || out?.message || JSON.stringify(out))
    }catch(e){ $('aiOut').textContent = 'Error: '+e.message }
  }

  $('loadEvents').onclick = loadEvents
  async function loadEvents(){
    const wrap = $('events'); wrap.innerHTML = ''
    try{
      const items = await api('/events','GET')
      ;(items || []).forEach(ev => {
        const div = document.createElement('div')
        div.className = 'card'
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <div>
              <div><strong>${ev.title}</strong></div>
              <div class="muted">${new Date(ev.date).toLocaleString()} — ${ev.location || ''}</div>
            </div>
            <div class="row">
              <select data-id="${ev.id}" class="rsvpSel">
                <option value="YES">YES</option>
                <option value="MAYBE">MAYBE</option>
                <option value="NO">NO</option>
              </select>
              <button data-id="${ev.id}" class="rsvpBtn">RSVP</button>
            </div>
          </div>`
        wrap.appendChild(div)
      })

      wrap.querySelectorAll('.rsvpBtn').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          const id = e.currentTarget.getAttribute('data-id')
          const sel = e.currentTarget.parentElement.querySelector('.rsvpSel')
          try{
            const out = await api(`/events/${id}/rsvp`,'POST',{ response: sel.value })
            alert('RSVP ok. Suggestions: '+JSON.stringify(out?.suggestions || []))
          }catch(err){ alert('RSVP failed: '+err.message) }
        })
      })
    }catch(e){
      wrap.innerHTML = `<div class="err">Failed to load events: ${e.message}</div>`
    }
  }

  // Realtime
  try{
    const socket = window.io(base, { transports:['websocket'] })
    const log = $('wsLog')
    function push(kind, payload){
      const div = document.createElement('div')
      div.className = 'muted'
      div.textContent = `[${new Date().toLocaleTimeString()}] ${kind}: ${JSON.stringify(payload)}`
      log.prepend(div)
    }
    socket.on('connect', ()=>push('ws','connected'))
    socket.on('rsvps', (p)=>push('rsvps', p))
    socket.on('events', (p)=>push('events', p))
  }catch{}
})();


