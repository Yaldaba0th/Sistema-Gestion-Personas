let apiKey = '';
let currentData = [];

// Loading overlay functions
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Modal handling functions
function showModal(modalId, backdropId) {
    document.getElementById(modalId).style.display = 'block';
    document.getElementById(backdropId).style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling of background
}

function hideModal(modalId, backdropId) {
    document.getElementById(modalId).style.display = 'none';
    document.getElementById(backdropId).style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

function showLoginModal() {
    showModal('loginModal', 'loginModalBackdrop');
}

function closeLoginModal() {
    hideModal('loginModal', 'loginModalBackdrop');
}

function submitApiKey() {
    apiKey = document.getElementById('apiKeyInput').value;
    closeLoginModal();
    fetchData();
}

// API handling
async function getConfig() {
    try {
        const response = await fetch('config.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
        throw error;
    }
}

async function fetchData() {
    if (!apiKey) {
        showLoginModal();
        return;
    }

    showLoading();
    try {
        const config = await getConfig();
        const response = await fetch(
            `${config.API_URL}?key=${apiKey}&action=read`
        );
        const result = await response.json();

        if (result.error) {
            if (result.error.includes('Unauthorized')) {
                showLoginModal();
            }
            throw new Error(result.error);
        }

        currentData = result.data.slice(1); // Skip header row
        displayData();
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading data');
    } finally {
        hideLoading();
    }
}

// Display functions
function getPriorityColor(priority) {
    const value = parseInt(priority);
    const hue = ((10 - value) * 12); // 120 (green) to 0 (red)
    return `hsl(${hue}, 70%, 50%)`;
}

function formatPendientes(pendientesStr) {
    try {
        const pendientes = JSON.parse(pendientesStr);
        return pendientes.map(p => `
    <div class="pendiente-item" style="background-color: ${getPriorityColor(p.priority)}">
        ${p.name} - ${new Date(p.date).toLocaleDateString()} 
        (Prioridad: ${p.priority})
    </div>
`).join('');
    } catch (e) {
        return '';
    }
}

function displayData() {
    let displayData = [...currentData];

    // Apply search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        displayData = displayData.filter(row =>
            row[1].toLowerCase().includes(searchTerm)); // Filter by name
    }

    // Apply sorting
    const sortBy = document.getElementById('sortBy').value;
    if (sortBy === 'date' || sortBy === 'priority') {
        displayData.sort((a, b) => {
            const pendientesA = JSON.parse(a[3] || '[]');
            const pendientesB = JSON.parse(b[3] || '[]');

            if (sortBy === 'date') {
                const dateA = pendientesA.length ? new Date(pendientesA[0].date) : new Date(0);
                const dateB = pendientesB.length ? new Date(pendientesB[0].date) : new Date(0);
                return dateA - dateB;
            } else {
                const priorityA = Math.max(...pendientesA.map(p => p.priority), 0);
                const priorityB = Math.max(...pendientesB.map(p => p.priority), 0);
                return priorityB - priorityA;
            }
        });
    }

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = displayData.map(row => `
<tr>
    <td>${row[1]}</td>
    <td>${row[2]}</td>
    <td>${formatPendientes(row[3])}</td>
    <td>
        <button onclick="editPerson('${row[0]}')" class="btn">Editar</button>
        <button onclick="deletePerson('${row[0]}')" class="btn btn-danger">Eliminar</button>
    </td>
</tr>
`).join('');
}

// CRUD Operations
function addNewPerson() {
    const modalContent = `
<h2>Agregar Nueva Persona</h2>
<div class="modal-form-group">
    <label>Nombre:</label>
    <input type="text" id="newNombre">
</div>
<div class="modal-form-group">
    <label>RUT:</label>
    <input type="text" id="newRut">
</div>
<div id="pendientesList"></div>
<div class="modal-buttons">
    <button onclick="addPendienteField()" class="btn">Agregar Pendiente</button>
    <button onclick="saveNewPerson()" class="btn btn-primary">Guardar</button>
    <button onclick="closeModal()" class="btn">Cancelar</button>
</div>
`;

    document.getElementById('editModal').innerHTML = modalContent;
    showModal('editModal', 'editModalBackdrop');
    addPendienteField(); // Add first pendiente field
}

function addPendienteField(existingData = null) {
    const pendienteDiv = document.createElement('div');
    pendienteDiv.className = 'pendiente-field';
    pendienteDiv.innerHTML = `
<input type="text" placeholder="Nombre" value="${existingData?.name || ''}">
<input type="date" value="${existingData?.date || ''}">
<input type="number" min="1" max="10" placeholder="Prioridad" 
       value="${existingData?.priority || ''}">
<button onclick="this.parentElement.remove()" class="btn btn-danger">×</button>
`;
    document.getElementById('pendientesList').appendChild(pendienteDiv);
}

async function saveNewPerson() {
    const nombre = document.getElementById('newNombre').value;
    const rut = document.getElementById('newRut').value;
    const pendientes = Array.from(document.getElementsByClassName('pendiente-field')).map(div => ({
        name: div.children[0].value,
        date: div.children[1].value,
        priority: parseInt(div.children[2].value)
    })).filter(p => p.name && p.date && p.priority);

    showLoading();
    try {
        const config = await getConfig();
        const response = await fetch(`${config.API_URL}?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                action: 'create',
                nombre: nombre,
                rut: rut,
                pendientes: pendientes
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        closeModal();
        fetchData();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    } finally {
        hideLoading();
    }
}

function editPerson(id) {
    const person = currentData.find(row => row[0] === id);
    if (!person) return;

    const pendientes = JSON.parse(person[3] || '[]');

    const modalContent = `
<h2>Editar Persona</h2>
<div class="modal-form-group">
    <label>Nombre:</label>
    <input type="text" id="editNombre" value="${person[1]}">
</div>
<div class="modal-form-group">
    <label>RUT:</label>
    <input type="text" id="editRut" value="${person[2]}">
</div>
<div id="pendientesList"></div>
<div class="modal-buttons">
    <button onclick="addPendienteField()" class="btn">Agregar Pendiente</button>
    <button onclick="saveEdit('${id}')" class="btn btn-primary">Guardar</button>
    <button onclick="closeModal()" class="btn">Cancelar</button>
</div>
`;

    document.getElementById('editModal').innerHTML = modalContent;
    showModal('editModal', 'editModalBackdrop');

    pendientes.forEach(p => addPendienteField(p));
}

async function saveEdit(id) {
    const nombre = document.getElementById('editNombre').value;
    const rut = document.getElementById('editRut').value;
    const pendientes = Array.from(document.getElementsByClassName('pendiente-field')).map(div => ({
        name: div.children[0].value,
        date: div.children[1].value,
        priority: parseInt(div.children[2].value)
    })).filter(p => p.name && p.date && p.priority);

    showLoading();
    try {
        const config = await getConfig();
        const response = await fetch(`${config.API_URL}?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update',
                id: id,
                nombre: nombre,
                rut: rut,
                pendientes: pendientes
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        closeModal();
        fetchData();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar');
    } finally {
        hideLoading();
    }
}

async function deletePerson(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta persona?')) return;

    showLoading();
    try {
        const config = await getConfig();
        const response = await fetch(`${config.API_URL}?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                id: id
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        fetchData();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar');
    } finally {
        hideLoading();
    }
}

function closeModal() {
    hideModal('editModal', 'editModalBackdrop');
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', displayData);
document.getElementById('sortBy').addEventListener('change', displayData);

// Backdrop click handlers
document.getElementById('loginModalBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeLoginModal();
    }
});

document.getElementById('editModalBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    if (!apiKey) {
        showLoginModal();
    } else {
        fetchData();
    }
});
