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
        const configjson = await response.json();
        const groupBy = document.getElementById('groupBy').value;
        return configjson[groupBy];
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
            `${config}?key=${apiKey}&action=read`
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

// Helper function to calculate age
function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
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
        console.log(displayData);
        displayData = displayData.filter(row =>
            row[1].toLowerCase().includes(searchTerm) || // Filter by name
            row[2].toString().toLowerCase().includes(searchTerm)    // Filter by RUT
        );
    }

    const sortBy = document.getElementById('sortBy').value;
    if (sortBy === 'date' || sortBy === 'priority' || sortBy === 'age') {
        displayData.sort((a, b) => {
            if (sortBy === 'date') {
                const pendientesA = JSON.parse(a[5] || '[]');
                const pendientesB = JSON.parse(b[5] || '[]');
                const dateA = pendientesA.length ? new Date(pendientesA[0].date) : new Date(0);
                const dateB = pendientesB.length ? new Date(pendientesB[0].date) : new Date(0);
                return dateA - dateB;
            } else if (sortBy === 'age') {
                return calculateAge(b[4]) - calculateAge(a[4]); // Sort by age descending
            } else {
                const pendientesA = JSON.parse(a[5] || '[]');
                const pendientesB = JSON.parse(b[5] || '[]');
                const priorityA = Math.max(...pendientesA.map(p => p.priority), 0);
                const priorityB = Math.max(...pendientesB.map(p => p.priority), 0);
                return priorityB - priorityA;
            }
        });
    }

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = displayData.map(row => `
        <tr>
            <td class="personal-info-cell">
                <div class="main-info">
                    <i class="fas fa-user"></i> ${row[1]}
                </div>
                <div class="sub-info">
                    <i class="fas fa-id-card"></i> ${row[2]}
                </div>
                <div class="sub-info">
                    <i class="fas fa-phone"></i> ${row[3]}
                </div>
            </td>
            <td class="age-info-cell">
                <div class="main-info">
                    <i class="fas fa-hourglass-half"></i> ${calculateAge(row[4])} años
                </div>
                <div class="sub-info">
                    <i class="fas fa-calendar-alt"></i> ${new Date(row[4]).toLocaleDateString()}
                </div>
            </td>
            <td class="observaciones-cell">${row[6]}</td>
            <td class="pendientes-cell">${formatPendientes(row[5])}</td>
            <td class="actions-cell">
                <button onclick="editPerson('${row[0]}')" class="btn">Editar</button>
                <button onclick="deletePerson('${row[0]}')" class="btn btn-danger">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// CRUD Operations
function getPersonFormContent(person = null) {
    return `
        <div class="modal-form-group">
            <label>Nombre:</label>
            <input type="text" id="personNombre" value="${person?.nombre || ''}">
        </div>
        <div class="modal-form-group">
            <label>RUT:</label>
            <input type="text" id="personRut" value="${person?.rut || ''}">
        </div>
        <div class="modal-form-group">
            <label>Teléfono:</label>
            <input type="tel" id="personTelefono" value="${person?.telefono || ''}">
        </div>
        <div class="modal-form-group">
            <label>Fecha de Nacimiento:</label>
            <input type="date" id="personFechaNacimiento" value="${person?.fechaNacimiento || ''}">
        </div>
        <div class="modal-form-group">
            <label>Observaciones:</label>
            <textarea id="personObservaciones" rows="4">${person?.observaciones || ''}</textarea>
        </div>
        <div class="modal-form-group">
            <label>Pendientes:</label>
            <div id="pendientesList"></div>
        </div>
    `;
}

function addNewPerson() {
    const modalContent = `
        <h2>Agregar Nueva Persona</h2>
        ${getPersonFormContent()}
        <div class="modal-buttons">
            <button onclick="addPendienteField()" class="btn">Agregar Pendiente</button>
            <button onclick="saveNewPerson()" class="btn btn-primary">Guardar</button>
            <button onclick="closeModal()" class="btn">Cancelar</button>
        </div>
    `;

    document.getElementById('editModal').innerHTML = modalContent;
    showModal('editModal', 'editModalBackdrop');
    addPendienteField();
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
    const data = {
        nombre: document.getElementById('personNombre').value,
        rut: document.getElementById('personRut').value,
        telefono: document.getElementById('personTelefono').value,
        fechaNacimiento: document.getElementById('personFechaNacimiento').value,
        observaciones: document.getElementById('personObservaciones').value,
        pendientes: Array.from(document.getElementsByClassName('pendiente-field')).map(div => ({
            name: div.children[0].value,
            date: div.children[1].value,
            priority: parseInt(div.children[2].value)
        })).filter(p => p.name && p.date && p.priority)
    };

    showLoading();
    try {
        const config = await getConfig();
        const response = await fetch(`${config}?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                action: 'create',
                ...data
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

    const personData = {
        nombre: person[1],
        rut: person[2],
        telefono: person[3],
        fechaNacimiento: person[4],
        observaciones: person[6],
        pendientes: JSON.parse(person[5] || '[]')
    };

    const modalContent = `
        <h2>Editar Persona</h2>
        ${getPersonFormContent(personData)}
        <div class="modal-buttons">
            <button onclick="addPendienteField()" class="btn">Agregar Pendiente</button>
            <button onclick="saveEdit('${id}')" class="btn btn-primary">Guardar</button>
            <button onclick="closeModal()" class="btn">Cancelar</button>
        </div>
    `;

    document.getElementById('editModal').innerHTML = modalContent;
    showModal('editModal', 'editModalBackdrop');

    personData.pendientes.forEach(p => addPendienteField(p));
}

async function saveEdit(id) {
    const data = {
        nombre: document.getElementById('personNombre').value,
        rut: document.getElementById('personRut').value,
        telefono: document.getElementById('personTelefono').value,
        fechaNacimiento: document.getElementById('personFechaNacimiento').value,
        observaciones: document.getElementById('personObservaciones').value,
        pendientes: Array.from(document.getElementsByClassName('pendiente-field')).map(div => ({
            name: div.children[0].value,
            date: div.children[1].value,
            priority: parseInt(div.children[2].value)
        })).filter(p => p.name && p.date && p.priority)
    };

    showLoading();
    try {
        const config = await getConfig();
        const response = await fetch(`${config}?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update',
                id: id,
                ...data
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
        const response = await fetch(`${config}?key=${apiKey}`, {
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
document.getElementById('groupBy').addEventListener('change', fetchData);

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