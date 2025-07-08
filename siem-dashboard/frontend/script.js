// Utility: Get/Set JWT
function setToken(token) {
  localStorage.setItem('siem_jwt', token);
}
function getToken() {
  return localStorage.getItem('siem_jwt');
}
function clearToken() {
  localStorage.removeItem('siem_jwt');
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

// Dashboard protection
if (window.location.pathname.endsWith('dashboard.html')) {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
  setupLogout();
  // (Optional: fetch real data here)
}

// Users page logic
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
      const res = await fetch('https://siem-dashboard.onrender.com/users', {
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