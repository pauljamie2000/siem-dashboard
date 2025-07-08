// Utility: Get/Set JWT and Profile
function setToken(token) {
  localStorage.setItem('siem_jwt', token);
}
function getToken() {
  return localStorage.getItem('siem_jwt');
}
function clearToken() {
  localStorage.removeItem('siem_jwt');
  localStorage.removeItem('siem_profile');
}
function setProfile(profile) {
  localStorage.setItem('siem_profile', JSON.stringify(profile));
}
function getProfile() {
  const p = localStorage.getItem('siem_profile');
  return p ? JSON.parse(p) : null;
}
function authHeader() {
  const token = getToken();
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

// Login page logic
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';
    try {
      const res = await fetch('https://siem-dashboard.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        errorDiv.textContent = 'Invalid username or password.';
        return;
      }
      const data = await res.json();
      setToken(data.token);
      setProfile(data.profile);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorDiv.textContent = 'Server error.';
    }
  });
}

// Logout logic (shared)
function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', function() {
      clearToken();
      window.location.href = 'index.html';
    });
  }
}

// Dashboard protection and SIEM events
if (window.location.pathname.endsWith('dashboard.html')) {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
  setupLogout();
  const profile = getProfile();
  if (!profile) {
    clearToken();
    window.location.href = 'index.html';
  }
  // Fetch and display events
  async function loadEvents(clientFilter) {
    const res = await fetch('https://siem-dashboard.onrender.com/events', {
      headers: { ...authHeader() }
    });
    if (!res.ok) return;
    let events = await res.json();
    // If admin and filter is set, filter events
    if (profile.role === 'admin' && clientFilter) {
      events = events.filter(e => e.clientId === clientFilter);
    }
    renderEvents(events);
    if (profile.role === 'admin') {
      renderClientDropdown(events, clientFilter);
    }
  }
  // Render events table
  function renderEvents(events) {
    let html = `<h3>SIEM Events</h3><table class="events-table"><thead><tr><th>Client</th><th>Type</th><th>Message</th><th>Timestamp</th></tr></thead><tbody>`;
    if (events.length === 0) {
      html += '<tr><td colspan="4">No events</td></tr>';
    } else {
      for (const e of events) {
        html += `<tr><td>${e.clientId}</td><td>${e.type}</td><td>${e.message}</td><td>${new Date(e.timestamp).toLocaleString()}</td></tr>`;
      }
    }
    html += '</tbody></table>';
    let container = document.getElementById('events-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'events-container';
      document.querySelector('.dashboard-main').appendChild(container);
    }
    container.innerHTML = html;
  }
  // Render client dropdown for admin
  function renderClientDropdown(events, selected) {
    const uniqueClients = [...new Set(events.map(e => e.clientId))];
    let dropdown = document.getElementById('client-filter');
    if (!dropdown) {
      dropdown = document.createElement('select');
      dropdown.id = 'client-filter';
      dropdown.style.margin = '1rem 0';
      document.querySelector('.dashboard-main').insertBefore(dropdown, document.getElementById('events-container'));
      dropdown.addEventListener('change', function() {
        localStorage.setItem('siem_client_filter', dropdown.value);
        loadEvents(dropdown.value);
      });
    }
    dropdown.innerHTML = '<option value="">All Clients</option>' + uniqueClients.map(c => `<option value="${c}"${selected===c?' selected':''}>${c}</option>`).join('');
  }
  // Load with persisted filter for admin
  let clientFilter = '';
  if (profile.role === 'admin') {
    clientFilter = localStorage.getItem('siem_client_filter') || '';
  }
  loadEvents(clientFilter);
}

// Users page logic (unchanged)
if (window.location.pathname.endsWith('users.html')) {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
  setupLogout();
  const usersTable = document.getElementById('users-table').getElementsByTagName('tbody')[0];
  const addUserForm = document.getElementById('add-user-form');
  const addUserError = document.getElementById('add-user-error');

  // Fetch and display users
  async function loadUsers() {
    usersTable.innerHTML = '';
    try {
      const res = await fetch('https://siem-dashboard.onrender.com/users', {
        headers: { ...authHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.username}</td>
          <td><input type="text" value="${user.profile.name || ''}" data-username="${user.username}" data-field="name"></td>
          <td><input type="text" value="${user.profile.role || ''}" data-username="${user.username}" data-field="role"></td>
          <td><button class="save-btn" data-username="${user.username}">Save</button></td>
        `;
        usersTable.appendChild(tr);
      });
    } catch (err) {
      usersTable.innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
    }
  }
  loadUsers();

  // Add new user
  addUserForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    addUserError.textContent = '';
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const name = document.getElementById('new-name').value;
    const role = document.getElementById('new-role').value;
    try {
      const res = await fetch('https://siem-dashboard.onrender.com/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ username, password, profile: { name, role } })
      });
      if (!res.ok) {
        const data = await res.json();
        addUserError.textContent = data.message || 'Error adding user.';
        return;
      }
      addUserForm.reset();
      loadUsers();
    } catch (err) {
      addUserError.textContent = 'Server error.';
    }
  });

  // Save profile edits
  usersTable.addEventListener('click', async function(e) {
    if (e.target.classList.contains('save-btn')) {
      const username = e.target.getAttribute('data-username');
      const nameInput = usersTable.querySelector(`input[data-username='${username}'][data-field='name']`);
      const roleInput = usersTable.querySelector(`input[data-username='${username}'][data-field='role']`);
      try {
        const res = await fetch(`https://siem-dashboard.onrender.com/users/${username}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ profile: { name: nameInput.value, role: roleInput.value } })
        });
        if (!res.ok) {
          alert('Error saving profile.');
          return;
        }
        loadUsers();
      } catch (err) {
        alert('Server error.');
      }
    }
  });
} 