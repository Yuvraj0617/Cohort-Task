let state = {
  view: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  timer: { running: false, time: 1500, type: 'Work', interval: null, duration: 1500, customMode: false },
  todoFilter: 'all',
}

const LS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const save = (key, data) => localStorage.setItem(key, JSON.stringify(data))
const ri = (name) => `<i class="ri-${name}"></i>`

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: ri('dashboard-line') },
  { id: 'todo', label: 'Todo List', icon: ri('checkbox-line') },
  { id: 'planner', label: 'Daily Planner', icon: ri('calendar-line') },
  { id: 'goals', label: 'Daily Goals', icon: ri('target-line') },
  { id: 'pomodoro', label: 'Pomodoro', icon: ri('timer-2-line') },
  { id: 'quote', label: 'Motivation', icon: ri('quill-pen-line') },
  { id: 'weather', label: 'Weather', icon: ri('cloud-line') },
]

let appReady = false
let topWeatherFetched = false

function init() {
  document.documentElement.className = state.theme
  setupApp()
}

function setupApp() {
  if (appReady) return
  appReady = true

  document.getElementById('sidebarNav').innerHTML = navItems.map(item =>
    `<button data-nav="${item.id}">${item.icon} <span>${item.label}</span></button>`
  ).join('')

  updateThemeBtn()

  document.querySelectorAll('#sidebarNav button').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.nav))
  )

  document.querySelectorAll('.back-btn').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.back))
  )

  document.getElementById('themeBtn').addEventListener('click', toggleTheme)

  document.getElementById('todoList').addEventListener('click', e => {
    const item = e.target.closest('.todo-item')
    if (!item) return
    const id = Number(item.dataset.id)
    if (e.target.closest('.todo-check')) { toggleTodo(id); renderTodo() }
    else if (e.target.closest('.todo-star')) { toggleImportant(id); renderTodo() }
    else if (e.target.closest('.todo-delete')) { deleteTodo(id); renderTodo() }
    else if (e.target.closest('.todo-edit-btn')) { todoEditStart(id) }
  })

  document.getElementById('todoList').addEventListener('dblclick', e => {
    const item = e.target.closest('.todo-item')
    if (!item) return
    const id = Number(item.dataset.id)
    if (e.target.closest('.todo-text')) { todoEditStart(id) }
  })

  document.getElementById('addTodoBtn').addEventListener('click', addTodo)
  document.getElementById('todoInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo() })
  document.getElementById('clearDone').addEventListener('click', () => { clearDoneTodos(); renderTodo() })

  document.getElementById('goalList').addEventListener('click', e => {
    const item = e.target.closest('.goal-item')
    if (!item) return
    const id = Number(item.dataset.id)
    if (e.target.closest('.goal-check')) { toggleGoal(id); renderGoals() }
    else if (e.target.closest('.goal-delete')) { deleteGoal(id); renderGoals() }
    else if (e.target.closest('.goal-edit-btn')) { goalEditStart(id) }
  })

  document.getElementById('goalList').addEventListener('dblclick', e => {
    const item = e.target.closest('.goal-item')
    if (!item) return
    const id = Number(item.dataset.id)
    if (e.target.closest('.goal-text')) { goalEditStart(id) }
  })

  document.getElementById('addGoalBtn').addEventListener('click', addGoal)
  document.getElementById('goalInput').addEventListener('keydown', e => { if (e.key === 'Enter') addGoal() })

  updateClock()
  setInterval(updateClock, 1000)
  navigate('dashboard')
}

init()

function stopClocks() {
  if (state.timer.interval) { clearInterval(state.timer.interval); state.timer.interval = null }
  if (state.dashTimerInterval) { clearInterval(state.dashTimerInterval); state.dashTimerInterval = null }
}

function navigate(view) {
  state.view = view

  document.querySelectorAll('#sidebarNav button').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.nav === view)
  )

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))

  const viewMap = {
    dashboard: 'viewDashboard',
    todo: 'viewTodo',
    planner: 'viewPlanner',
    goals: 'viewGoals',
    pomodoro: 'viewPomodoro',
    quote: 'viewQuote',
    weather: 'viewWeather',
  }

  const target = document.getElementById(viewMap[view])
  if (!target) return navigate('dashboard')
  target.classList.add('active')

  if (view !== 'dashboard' && state.dashTimerInterval) {
    clearInterval(state.dashTimerInterval)
    state.dashTimerInterval = null
  }

  const renders = {
    dashboard: renderDashboard,
    todo: renderTodo,
    planner: renderPlanner,
    goals: renderGoals,
    pomodoro: renderPomodoro,
    quote: renderQuote,
    weather: renderWeather,
  }

  renders[view]?.()
}

function updateClock() {
  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  document.getElementById('topDate').textContent =
    `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
  document.getElementById('topTime').textContent =
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  fetchTopWeather()
  updateGoalsBadge()
}

function fetchTopWeather() {
  if (topWeatherFetched) return
  topWeatherFetched = true

  const loc = LS('weatherLoc', null)
  const lat = loc?.lat ?? 51.5
  const lon = loc?.lon ?? -0.12

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode`)
    .then(r => r.json())
    .then(data => {
      if (!data.current) return
      document.getElementById('topWeather').innerHTML =
        `<strong>${Math.round(data.current.temperature_2m)}°</strong> ${wmoEmoji(data.current.weathercode)}`
    })
    .catch(() => {})
}

function updateGoalsBadge() {
  const goals = LS('goals', [])
  const done = goals.filter(g => g.done).length
  document.getElementById('topGoals').innerHTML = `Goals: <strong>${done}/${goals.length}</strong>`
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', state.theme)
  document.documentElement.className = state.theme
  updateThemeBtn()
}

function updateThemeBtn() {
  document.getElementById('themeBtn').innerHTML =
    (state.theme === 'dark' ? ri('sun-line') : ri('moon-line')) +
    ` <span>${state.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>`
}

function renderDashTimerStatus() {
  const t = state.timer

  if (t.interval) {
    return `${t.type}: ${fmtTime(t.time)} ${ri('play-circle-line')}`
  }
  if (t.time < t.duration) {
    return `${t.type}: ${fmtTime(t.time)} ${ri('pause-circle-line')}`
  }
  return `${ri('timer-2-line')} Start a timer`
}

function startDashTimerInterval() {
  if (state.dashTimerInterval) clearInterval(state.dashTimerInterval)
  state.dashTimerInterval = setInterval(() => {
    const el = document.getElementById('dashTimerStatus')
    if (el && state.view === 'dashboard') {
      el.querySelector('span').innerHTML = renderDashTimerStatus()
    }
  }, 1000)
}

function renderDashboard() {
  const todos = LS('todos', [])
  const goals = LS('goals', [])
  const plans = LS('plans', {})
  const hour = new Date().getHours()

  document.getElementById('dashGreeting').textContent =
    (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + "! Let's be productive."

  const todoPending = todos.filter(t => !t.done).length
  const todoDone = todos.filter(t => t.done).length
  const important = todos.filter(t => t.important && !t.done).length
  const goalDone = goals.filter(g => g.done).length
  const planEntries = Object.values(plans).filter(v => v && v.trim()).length
  const goalPct = goals.length > 0 ? Math.round((goalDone / goals.length) * 100) : 0

  document.getElementById('analyticsGrid').innerHTML =
    `<div class="stat-card">
      <div class="stat-card-header">
        <span>Pending Tasks</span>${ri('file-list-3-line')}
      </div>
      <div class="stat-value">${todoPending}</div>
      <div class="stat-sub">${important} marked important</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span>Completed</span>${ri('check-double-line')}
      </div>
      <div class="stat-value">${todoDone}</div>
      <div class="stat-sub">of ${todos.length} tasks</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span>Goals</span>${ri('flag-line')}
      </div>
      <div class="stat-value">${goalDone}/${goals.length}</div>
      <div class="stat-sub">${goals.length - goalDone} remaining</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header">
        <span>Planner</span>${ri('calendar-check-line')}
      </div>
      <div class="stat-value">${planEntries}</div>
      <div class="stat-sub">slots filled</div>
    </div>`

  document.getElementById('dashTimerRow').innerHTML =
    `<div class="dash-card-large">
      <h3>${ri('timer-2-line')} Timer Status</h3>
      <div id="dashTimerStatus" style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:16px;font-weight:600;color:var(--text-heading)">${renderDashTimerStatus()}</span>
        <button class="btn btn-ghost btn-sm" id="openPomodoroBtn">Open ${ri('arrow-right-line')}</button>
      </div>
    </div>`

  document.getElementById('openPomodoroBtn').addEventListener('click', () => navigate('pomodoro'))
  startDashTimerInterval()

  const recentTodos = [...todos].reverse().slice(0, 5)

  document.getElementById('dashMiddleRow').innerHTML =
    `<div class="dash-card-large">
      <h3>${ri('flag-line')} Goals Progress</h3>
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px">
        <span style="font-size:28px;font-weight:700;color:var(--text-heading)">${goalPct}%</span>
        <span style="font-size:13px;color:var(--text-secondary)">${goalDone}/${goals.length} completed</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${goalPct}%"></div>
      </div>
      ${goals.length === 0
        ? '<p style="font-size:12px;color:var(--text-secondary);margin-top:12px">No goals set yet.</p>'
        : ''}
    </div>
    <div class="dash-card-large">
      <h3>${ri('checkbox-line')} Recent Tasks</h3>
      ${recentTodos.length === 0
        ? '<p style="font-size:12px;color:var(--text-secondary)">No tasks yet.</p>'
        : '<ul style="list-style:none;display:flex;flex-direction:column;gap:6px">' +
          recentTodos.map(t =>
            `<li style="display:flex;align-items:center;gap:8px;font-size:13px">
              <span style="width:16px;height:16px;border-radius:50%;border:2px solid ${t.done ? '#10b981' : 'var(--border)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${t.done ? '#10b981' : 'transparent'}">
                ${t.done
                  ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
                  : ''}
              </span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${t.done ? 'var(--text-secondary)' : 'var(--text-heading)'};${t.done ? 'text-decoration:line-through' : ''}">${esc(t.text)}</span>
              ${t.important && !t.done ? `<span style="color:#f59e0b">${ri('star-fill')}</span>` : ''}
            </li>`
          ).join('') + '</ul>'}
    </div>`

  document.getElementById('dashBottomRow').innerHTML =
    `<div class="dash-card-large">
      <h3>${ri('quill-pen-line')} Daily Inspiration</h3>
      <div id="dashQuote">
        <span style="color:var(--text-secondary);font-size:13px">${ri('loader-4-line')} Loading...</span>
      </div>
    </div>
    <div class="dash-card-large">
      <h3>${ri('cloud-line')} Weather</h3>
      <div id="dashWeather">
        <span style="color:var(--text-secondary);font-size:13px">${ri('loader-4-line')} Loading...</span>
      </div>
    </div>`

  fetchQuote('dashQuote')
  fetchWeather('dashWeather')
}

const fallbackQuotes = [
  { quote: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { quote: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { quote: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { quote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { quote: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
  { quote: 'Everything you\'ve ever wanted is on the other side of fear.', author: 'George Addair' },
  { quote: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { quote: 'Hardships often prepare ordinary people for an extraordinary destiny.', author: 'C.S. Lewis' },
]

function fetchQuote(elId) {
  const el = document.getElementById(elId)
  if (!el) return

  fetch('https://dummyjson.com/quotes/random')
    .then(r => { if (!r.ok) throw new Error(); return r.json() })
    .then(data => {
      const q = data?.quote ? data : fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
      el.innerHTML =
        `<p style="font-size:14px;color:var(--text-heading);line-height:1.6">\u201C${esc(q.quote)}\u201D</p>
         <p style="font-size:12px;color:var(--text-secondary);margin-top:8px">\u2014 ${esc(q.author)}</p>`
    })
    .catch(() => {
      const q = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
      el.innerHTML =
        `<p style="font-size:14px;color:var(--text-heading);line-height:1.6">\u201C${esc(q.quote)}\u201D</p>
         <p style="font-size:12px;color:var(--text-secondary);margin-top:8px">\u2014 ${esc(q.author)}</p>`
    })
}

function wmoEmoji(code) {
  if (code === 0) return '\u2600\uFE0F'
  if (code <= 3) return '\u26C5'
  if (code <= 48) return '\u2601\uFE0F'
  if (code <= 57) return '\uD83C\uDF26\uFE0F'
  if (code <= 67) return '\uD83C\uDF27\uFE0F'
  if (code <= 77) return '\u2744\uFE0F'
  return '\uD83C\uDF2A\uFE0F'
}

function wmoText(code) {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Cloudy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  return 'Storm'
}

function fmtCoords(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`
}

function fetchWeather(elId) {
  const el = document.getElementById(elId)
  if (!el) return

  const loc = LS('weatherLoc', null)
  const lat = loc?.lat ?? 51.5
  const lon = loc?.lon ?? -0.12

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relativehumidity_2m,weathercode,windspeed_10m`)
    .then(r => r.json())
    .then(data => {
      if (!data.current) {
        el.innerHTML = '<span style="font-size:13px;color:var(--text-secondary)">Unavailable</span>'
        return
      }
      const c = data.current
      el.innerHTML =
        `<div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:32px">${wmoEmoji(c.weathercode)}</span>
            <div>
              <div style="font-size:22px;font-weight:700;color:var(--text-heading)">${Math.round(c.temperature_2m)}&deg;C</div>
              <div style="font-size:12px;color:var(--text-secondary)">${wmoText(c.weathercode)}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);text-align:right">
            <div>Humidity: ${c.relativehumidity_2m}%</div>
            <div>Wind: ${Math.round(c.windspeed_10m)} km/h</div>
          </div>
        </div>`
    })
    .catch(() => { el.innerHTML = '<span style="font-size:13px;color:var(--text-secondary)">Unavailable</span>' })
}

function renderTodo() {
  const todos = LS('todos', [])
  const filtered = todos.filter(t => {
    if (state.todoFilter === 'active') return !t.done
    if (state.todoFilter === 'done') return t.done
    return true
  })

  document.getElementById('todoFilters').innerHTML = ['all', 'active', 'done'].map(f =>
    `<button class="filter-btn ${state.todoFilter === f ? 'active' : ''}" data-f="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</button>`
  ).join('')

  document.querySelectorAll('#todoFilters .filter-btn').forEach(btn =>
    btn.addEventListener('click', () => { state.todoFilter = btn.dataset.f; renderTodo() })
  )

  document.getElementById('todoList').innerHTML = filtered.length === 0
    ? '<div class="empty-state">No tasks yet.</div>'
    : filtered.map(t =>
      `<li class="todo-item ${t.done ? 'done' : ''}" data-id="${t.id}">
        <button class="todo-check ${t.done ? 'checked' : ''}">
          ${t.done
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
            : ''}
        </button>
        <span class="todo-text">${esc(t.text)}</span>
        <button class="todo-star ${t.important ? 'active' : ''}">${ri('star-line')}</button>
        <button class="todo-edit-btn">${ri('pencil-line')}</button>
        <button class="todo-delete">${ri('close-line')}</button>
      </li>`
    ).join('')

  const remaining = todos.filter(t => !t.done).length
  document.getElementById('todoStats').textContent = `${remaining} of ${todos.length} remaining`
  document.getElementById('clearDone').style.display = todos.some(t => t.done) ? '' : 'none'
  updateGoalsBadge()
}

function addTodo() {
  const input = document.getElementById('todoInput')
  const text = input.value.trim()
  if (!text) return
  const todos = LS('todos', [])
  todos.push({ id: Date.now(), text, done: false, important: false })
  save('todos', todos)
  input.value = ''
  renderTodo()
}

function toggleTodo(id) {
  const todos = LS('todos', [])
  const item = todos.find(t => t.id === id)
  if (item) item.done = !item.done
  save('todos', todos)
}

function toggleImportant(id) {
  const todos = LS('todos', [])
  const item = todos.find(t => t.id === id)
  if (item) item.important = !item.important
  save('todos', todos)
}

function deleteTodo(id) {
  save('todos', LS('todos', []).filter(t => t.id !== id))
}

function clearDoneTodos() {
  save('todos', LS('todos', []).filter(t => !t.done))
}

function todoEditStart(id) {
  const todos = LS('todos', [])
  const item = todos.find(t => t.id === id)
  if (!item || item.done) return

  const li = document.querySelector(`.todo-item[data-id="${id}"]`)
  if (!li) return

  const span = li.querySelector('.todo-text')
  const oldText = item.text
  const inp = document.createElement('input')
  inp.type = 'text'
  inp.className = 'todo-edit-input'
  inp.value = oldText
  span.replaceWith(inp)
  inp.focus()
  inp.select()

  function saveEdit() {
    const value = inp.value.trim()
    if (value && value !== oldText) {
      item.text = value
      save('todos', todos)
    }
    renderTodo()
  }

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') renderTodo()
  })
  inp.addEventListener('blur', saveEdit)
}

function renderPlanner() {
  const plans = LS('plans', {})
  const currentHour = new Date().getHours()
  const hours = Array.from({ length: 15 }, (_, i) => i + 6)
  const fmtHour = h => h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`

  document.getElementById('plannerList').innerHTML = hours.map(h =>
    `<div class="planner-row ${h === currentHour ? 'current' : h < currentHour ? 'past' : ''}">
      <span class="planner-time">${fmtHour(h)}</span>
      <input type="text" class="planner-input" data-hour="${h}" value="${esc(plans[h] || '')}" placeholder="Plan for ${fmtHour(h)}...">
      ${plans[h] ? `<button class="planner-clear" data-hour="${h}">${ri('close-line')}</button>` : ''}
    </div>`
  ).join('')

  document.querySelectorAll('#plannerList .planner-input').forEach(inp =>
    inp.addEventListener('input', () => {
      const plans = LS('plans', {})
      plans[inp.dataset.hour] = inp.value
      save('plans', plans)
    })
  )

  document.querySelectorAll('#plannerList .planner-clear').forEach(btn =>
    btn.addEventListener('click', () => {
      const plans = LS('plans', {})
      delete plans[btn.dataset.hour]
      save('plans', plans)
      renderPlanner()
    })
  )
}

function renderGoals() {
  const goals = LS('goals', [])
  const done = goals.filter(g => g.done).length
  const pct = goals.length > 0 ? Math.round((done / goals.length) * 100) : 0

  document.getElementById('goalsProgress').innerHTML =
    `<div class="goals-progress-header">
      <span>Progress</span>
      <span>${done} of ${goals.length} completed</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>`

  document.getElementById('goalList').innerHTML = goals.length === 0
    ? '<div class="empty-state">No goals yet. What do you want to achieve today?</div>'
    : goals.map(g =>
      `<li class="goal-item ${g.done ? 'done' : ''}" data-id="${g.id}">
        <button class="goal-check ${g.done ? 'checked' : ''}">
          ${g.done
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
            : ''}
        </button>
        <span class="goal-text">${esc(g.text)}</span>
        <button class="goal-edit-btn">${ri('pencil-line')}</button>
        <button class="goal-delete">${ri('close-line')}</button>
      </li>`
    ).join('')

  updateGoalsBadge()
}

function addGoal() {
  const input = document.getElementById('goalInput')
  const text = input.value.trim()
  if (!text) return
  const goals = LS('goals', [])
  goals.push({ id: Date.now(), text, done: false })
  save('goals', goals)
  input.value = ''
  renderGoals()
}

function toggleGoal(id) {
  const goals = LS('goals', [])
  const item = goals.find(g => g.id === id)
  if (item) item.done = !item.done
  save('goals', goals)
  updateGoalsBadge()
}

function deleteGoal(id) {
  save('goals', LS('goals', []).filter(g => g.id !== id))
  updateGoalsBadge()
}

function goalEditStart(id) {
  const goals = LS('goals', [])
  const item = goals.find(g => g.id === id)
  if (!item || item.done) return

  const li = document.querySelector(`.goal-item[data-id="${id}"]`)
  if (!li) return

  const span = li.querySelector('.goal-text')
  const oldText = item.text
  const inp = document.createElement('input')
  inp.type = 'text'
  inp.className = 'goal-edit-input'
  inp.value = oldText
  span.replaceWith(inp)
  inp.focus()
  inp.select()

  function saveEdit() {
    const value = inp.value.trim()
    if (value && value !== oldText) {
      item.text = value
      save('goals', goals)
    }
    renderGoals()
  }

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') renderGoals()
  })
  inp.addEventListener('blur', saveEdit)
}

function renderPomodoro() {
  const t = state.timer
  if (!t.duration) t.duration = 1500
  const total = t.type === 'Work' ? t.duration : 300
  const pct = total > 0 ? ((total - t.time) / total) * 100 : 0
  const r = 95
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)

  const presets = [600, 900, 1500]
  const presetLabels = ['10 min', '15 min', '25 min']

  document.getElementById('pomodoroBody').innerHTML =
    `<div class="pomodoro-presets" id="pomPresets">
      ${presetLabels.map((label, i) =>
        `<button class="btn btn-sm pom-preset-btn ${t.type === 'Work' && t.duration === presets[i] && !t.customMode ? 'active' : ''}" data-minutes="${presets[i] / 60}">${label}</button>`
      ).join('')}
      <button class="btn btn-sm pom-preset-btn ${t.customMode ? 'active' : ''}" id="pomCustomBtn">Custom</button>
    </div>
    <div class="pomodoro-ring">
      <svg width="220" height="220">
        <circle cx="110" cy="110" r="${r}" fill="none" stroke="var(--border)" stroke-width="4"/>
        <circle cx="110" cy="110" r="${r}" fill="none" stroke="var(--text-heading)" stroke-width="4"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition:stroke-dashoffset 0.5s"/>
      </svg>
      <div class="pomodoro-center">
        <div class="pomodoro-label">${t.type}</div>
        <div class="pomodoro-time" id="pomTime">${fmtTime(t.time)}</div>
      </div>
    </div>
    ${t.customMode
      ? `<div class="pom-custom-input">
          <input type="number" class="input" id="pomCustomMinutes" min="1" max="599" value="${Math.floor(t.duration / 60)}" placeholder="Minutes">
          <button class="btn btn-primary btn-sm" id="pomCustomSet">Set</button>
        </div>`
      : ''}
    <div class="pomodoro-controls" id="pomControls"></div>`

  document.querySelectorAll('#pomPresets .pom-preset-btn[data-minutes]').forEach(btn =>
    btn.addEventListener('click', () => pomSetPreset(Number(btn.dataset.minutes) * 60))
  )
  document.getElementById('pomCustomBtn')?.addEventListener('click', pomToggleCustom)
  document.getElementById('pomCustomSet')?.addEventListener('click', pomSetCustom)

  renderPomButtons()
}

function pomSetPreset(seconds) {
  if (state.timer.interval) { clearInterval(state.timer.interval); state.timer.interval = null }
  state.timer.running = false
  state.timer.customMode = false
  state.timer.duration = seconds
  state.timer.time = seconds
  state.timer.type = 'Work'
  renderPomodoro()
}

function pomToggleCustom() {
  if (state.timer.interval) { clearInterval(state.timer.interval); state.timer.interval = null }
  state.timer.running = false
  state.timer.customMode = !state.timer.customMode
  state.timer.type = 'Work'
  renderPomodoro()
}

function pomSetCustom() {
  const mins = parseInt(document.getElementById('pomCustomMinutes')?.value) || 1
  if (mins < 1) return
  const secs = mins * 60
  state.timer.customMode = true
  state.timer.duration = secs
  state.timer.time = secs
  state.timer.running = false
  state.timer.type = 'Work'
  renderPomodoro()
}

function renderPomButtons() {
  const t = state.timer
  const total = t.type === 'Work' ? t.duration : 300
  const el = document.getElementById('pomControls')
  if (!el) return

  if (!t.running && t.time > 0 && t.time < total) {
    el.innerHTML =
      `<button class="btn btn-primary" id="pomStart">${ri('play-circle-line')} Resume</button>
       <button class="btn btn-ghost" id="pomReset">${ri('restart-line')} Reset</button>`
  } else if (!t.running && t.time > 0) {
    el.innerHTML =
      `<button class="btn btn-primary" id="pomStart">${ri('play-circle-line')} Start</button>`
  } else if (t.running) {
    el.innerHTML =
      `<button class="btn btn-secondary" id="pomPause" style="background:#f59e0b;color:white;border-color:#f59e0b">${ri('pause-circle-line')} Pause</button>`
  } else if (t.time === 0) {
    el.innerHTML =
      `<button class="btn btn-primary" id="pomNext">${ri('skip-forward-line')} ${t.type === 'Work' ? 'Start Break' : 'Start Work'}</button>`
  } else {
    el.innerHTML =
      `<button class="btn btn-ghost" id="pomReset">${ri('restart-line')} Reset</button>`
  }

  document.getElementById('pomStart')?.addEventListener('click', () => { pomStart(); renderPomButtons() })
  document.getElementById('pomPause')?.addEventListener('click', () => { pomPause(); renderPomButtons() })
  document.getElementById('pomReset')?.addEventListener('click', () => { pomReset(); renderPomodoro() })
  document.getElementById('pomNext')?.addEventListener('click', () => { pomNext(); renderPomodoro() })
}

function fmtTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function pomStart() {
  if (state.timer.interval) clearInterval(state.timer.interval)
  state.timer.running = true
  state.timer.interval = setInterval(() => {
    if (state.timer.time <= 1) {
      clearInterval(state.timer.interval)
      state.timer.interval = null
      state.timer.running = false
      state.timer.time = 0
      renderPomodoro()
      showToast(`${state.timer.type} session complete!`)
    } else {
      state.timer.time--
      const el = document.getElementById('pomTime')
      if (el) el.textContent = fmtTime(state.timer.time)
    }
  }, 1000)
}

function pomPause() {
  if (state.timer.interval) {
    clearInterval(state.timer.interval)
    state.timer.interval = null
  }
  state.timer.running = false
  renderPomButtons()
}

function pomReset() {
  if (state.timer.interval) {
    clearInterval(state.timer.interval)
    state.timer.interval = null
  }
  state.timer.running = false
  state.timer.time = state.timer.duration
  state.timer.type = 'Work'
  renderPomodoro()
}

function pomNext() {
  state.timer.type = state.timer.type === 'Work' ? 'Break' : 'Work'
  state.timer.time = state.timer.type === 'Work' ? state.timer.duration : 300
  state.timer.running = false
  renderPomodoro()
}

function renderQuote() {
  document.getElementById('quoteBody').innerHTML =
    `<div class="quote-display">
      <p class="quote-placeholder">${ri('quill-pen-line')} Click below to get inspired.</p>
    </div>
    <button class="btn btn-primary" id="fetchQuoteBtn">${ri('refresh-line')} New Quote</button>`

  document.getElementById('fetchQuoteBtn').addEventListener('click', () => {
    const el = document.querySelector('#quoteBody .quote-display')
    el.innerHTML = '<div class="loading"><div class="spinner"></div> Finding wisdom...</div>'

    fetch('https://dummyjson.com/quotes/random')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        const q = data?.quote ? data : fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
        el.innerHTML =
          `<p class="quote-text-lg">\u201C${esc(q.quote)}\u201D</p>
           <p class="quote-author">\u2014 ${esc(q.author)}</p>`
      })
      .catch(() => {
        const q = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
        el.innerHTML =
          `<p class="quote-text-lg">\u201C${esc(q.quote)}\u201D</p>
           <p class="quote-author">\u2014 ${esc(q.author)}</p>`
      })
  })
}

function renderWeather() {
  const el = document.getElementById('weatherBody')
  const loc = LS('weatherLoc', null)
  const lat = loc?.lat ?? 51.5
  const lon = loc?.lon ?? -0.12
  const cityName = loc?.city ?? 'London, UK'

  el.innerHTML =
    `<div class="weather-search">
      <input type="text" class="input" id="weatherSearchInput" placeholder="Search city..." value="${esc(cityName)}">
      <button class="btn btn-primary" id="weatherSearchBtn">${ri('search-line')}</button>
      <button class="btn btn-secondary" id="weatherDetectBtn" title="Auto detect location">${ri('gps-line')}</button>
    </div>
    <div id="weatherContent">
      <div class="flex items-center gap-2" style="justify-content:center;padding:40px 0;color:var(--text-secondary);font-size:13px">
        <div class="spinner"></div> Loading weather...
      </div>
    </div>`

  document.getElementById('weatherSearchBtn').addEventListener('click', weatherSearch)
  document.getElementById('weatherDetectBtn').addEventListener('click', weatherDetect)
  document.getElementById('weatherSearchInput').addEventListener('keydown', e => { if (e.key === 'Enter') weatherSearch() })

  fetchWeatherFull(lat, lon, cityName)
}

function weatherSearch() {
  const q = document.getElementById('weatherSearchInput').value.trim()
  if (!q) return

  document.getElementById('weatherContent').innerHTML =
    '<div class="flex items-center gap-2" style="justify-content:center;padding:40px 0;color:var(--text-secondary);font-size:13px"><div class="spinner"></div> Searching...</div>'

  fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`)
    .then(r => r.json())
    .then(data => {
      if (!data.results?.length) {
        document.getElementById('weatherContent').innerHTML =
          '<p style="text-align:center;color:var(--text-secondary);padding:40px 0">City not found</p>'
        return
      }
      const result = data.results[0]
      const city = result.name + (result.country ? `, ${result.country}` : '')
      save('weatherLoc', { lat: result.latitude, lon: result.longitude, city })
      topWeatherFetched = false
      fetchTopWeather()
      fetchWeatherFull(result.latitude, result.longitude, city)
    })
    .catch(() => {
      document.getElementById('weatherContent').innerHTML =
        '<p style="text-align:center;color:var(--text-secondary);padding:40px 0">Search failed</p>'
    })
}

function weatherDetect() {
  document.getElementById('weatherContent').innerHTML =
    '<div class="flex items-center gap-2" style="justify-content:center;padding:40px 0;color:var(--text-secondary);font-size:13px"><div class="spinner"></div> Detecting location...</div>'

  if (!navigator.geolocation) {
    showToast('Geolocation not supported')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude

      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(r => r.json())
        .then(data => {
          const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || 'Detected Location'
          const fullName = city + (data?.address?.country ? `, ${data.address.country}` : '')
          document.getElementById('weatherSearchInput').value = fullName
          save('weatherLoc', { lat, lon, city: fullName })
          topWeatherFetched = false
          fetchTopWeather()
          fetchWeatherFull(lat, lon, fullName)
        })
        .catch(() => {
          const city = `${lat.toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${lon.toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`
          document.getElementById('weatherSearchInput').value = city
          save('weatherLoc', { lat, lon, city })
          topWeatherFetched = false
          fetchTopWeather()
          fetchWeatherFull(lat, lon, city)
        })
    },
    () => {
      showToast('Location access denied')
      document.getElementById('weatherContent').innerHTML =
        '<p style="text-align:center;color:var(--text-secondary);padding:40px 0">Location access denied. Search manually.</p>'
    }
  )
}

function fetchWeatherFull(lat, lon, cityName) {
  const el = document.getElementById('weatherContent')
  if (!el) return

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relativehumidity_2m,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`)
    .then(r => r.json())
    .then(data => {
      if (!data.current) {
        el.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:13px;padding:40px 0">Unavailable</p>'
        return
      }

      const c = data.current
      const daily = data.daily
      let forecastHtml = ''

      if (daily?.time) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        forecastHtml =
          '<div class="forecast-grid">' +
          daily.time.slice(0, 5).map((t, i) => {
            const day = new Date(t + 'T12:00:00').getDay()
            return `<div class="forecast-day">
              <div class="day-name">${dayNames[day]}</div>
              <div class="day-icon">${wmoEmoji(daily.weathercode[i])}</div>
              <div class="day-temp">${Math.round(daily.temperature_2m_max[i])}&deg; ${Math.round(daily.temperature_2m_min[i])}&deg;</div>
            </div>`
          }).join('') +
          '</div>'
      }

      el.innerHTML =
        `<div class="weather-main">
          <span class="weather-icon">${wmoEmoji(c.weathercode)}</span>
          <div>
            <div class="weather-temp">${Math.round(c.temperature_2m)}&deg;</div>
            <div class="weather-condition">${wmoText(c.weathercode)}</div>
          </div>
        </div>
        <div class="weather-location">${ri('map-pin-line')} ${esc(cityName)}</div>
        <div class="weather-coords">${fmtCoords(lat, lon)}</div>
        <div class="weather-details">
          <div class="weather-detail">
            <div class="detail-label">Humidity</div>
            <div class="detail-value">${c.relativehumidity_2m}%</div>
          </div>
          <div class="weather-detail">
            <div class="detail-label">Wind</div>
            <div class="detail-value">${Math.round(c.windspeed_10m)} km/h</div>
          </div>
          <div class="weather-detail">
            <div class="detail-label">Feels</div>
            <div class="detail-value">${Math.round(c.temperature_2m)}&deg;</div>
          </div>
        </div>
        ${forecastHtml}
        <div style="text-align:center;margin-top:16px">
          <button class="btn btn-ghost btn-sm" id="weatherRefresh">${ri('refresh-line')} Refresh</button>
        </div>`

      document.getElementById('weatherRefresh').addEventListener('click', () => fetchWeatherFull(lat, lon, cityName))
    })
    .catch(() => {
      el.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:13px;padding:40px 0">Weather unavailable</p>'
    })
}

function showToast(msg) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toast._hide)
  toast._hide = setTimeout(() => toast.classList.remove('show'), 3000)
}

function esc(str) {
  if (str == null) return ''
  const div = document.createElement('div')
  div.textContent = String(str)
  return div.innerHTML
}
