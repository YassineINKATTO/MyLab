// Project data structure
let projects = JSON.parse(localStorage.getItem('projects')) || [];
let currentTab = 'all';
let selectedProject = null;

// Pomodoro Timer variables
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isTimerRunning = false;
let isBreak = false;
let currentProjectId = null;

// DOM Elements
const projectList = document.querySelector('.project-list');
const tabButtons = document.querySelectorAll('.tab-button');
const addButton = document.getElementById('addButton');
const modifyButton = document.getElementById('modifyButton');
const deleteButton = document.getElementById('deleteButton');
const modal = document.getElementById('projectModal');
const closeButton = document.getElementById('closeButton');
const cancelButton = document.getElementById('cancelButton');
const saveButton = document.getElementById('saveButton');
const projectForm = document.getElementById('projectForm');
const projectNameInput = document.getElementById('projectName');
const projectDescInput = document.getElementById('projectDescription');
const projectStatusInput = document.getElementById('projectStatus');
const projectCategoryInput = document.getElementById('projectCategory');
const modalTitle = document.getElementById('modalTitle');

// Pomodoro Timer Elements
const timerDisplay = document.getElementById('timerDisplay');
const startPomodoroButton = document.getElementById('startPomodoro');
const pausePomodoroButton = document.getElementById('pausePomodoro');
const resetPomodoroButton = document.getElementById('resetPomodoro');
const workDurationInput = document.getElementById('workDuration');
const breakDurationInput = document.getElementById('breakDuration');
const pomodoroProjectSelect = document.getElementById('pomodoroProject');
const workCompleteSound = document.getElementById('workCompleteSound');
const breakCompleteSound = document.getElementById('breakCompleteSound');

// Event Listeners
tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
});

addButton.addEventListener('click', () => openModal('add'));
modifyButton.addEventListener('click', () => openModal('modify'));
deleteButton.addEventListener('click', deleteSelectedProject);
closeButton.addEventListener('click', closeModal);
cancelButton.addEventListener('click', closeModal);
saveButton.addEventListener('click', handleFormSubmit);

// Pomodoro Timer Event Listeners
startPomodoroButton.addEventListener('click', startTimer);
pausePomodoroButton.addEventListener('click', pauseTimer);
resetPomodoroButton.addEventListener('click', resetTimer);
workDurationInput.addEventListener('change', updateTimerSettings);
breakDurationInput.addEventListener('change', updateTimerSettings);

// Initialize the application
function init() {
    renderProjects();
    updateButtonStates();
    updateTimerDisplay();
    updatePomodoroProjectList();
}

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;
    tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
    });
    renderProjects();
}

// Render projects based on current tab
function renderProjects() {
    projectList.innerHTML = '';
    
    const filteredProjects = projects.filter(project => {
        if (currentTab === 'all') return true;
        return project.category === currentTab;
    });

    filteredProjects.forEach(project => {
        const projectElement = createProjectElement(project);
        projectList.appendChild(projectElement);
    });
}

// Create project element
function createProjectElement(project) {
    const div = document.createElement('div');
    div.className = `project-item ${project.id === selectedProject?.id ? 'selected' : ''}`;
    div.innerHTML = `
        <div>${project.name}</div>
        <div>${project.description}</div>
        <div class="status ${project.status}">${formatStatus(project.status)}</div>
        <div class="time-spent">${formatTimeSpent(project.timeSpent || 0)}</div>
        <div>${formatDate(project.createdAt)}</div>
        <div>${formatDate(project.updatedAt)}</div>
    `;
    
    div.addEventListener('click', () => selectProject(project));
    return div;
}

// Select a project
function selectProject(project) {
    selectedProject = project;
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.toggle('selected', item.textContent.includes(project.name));
    });
    updateButtonStates();
}

// Update button states based on selection
function updateButtonStates() {
    modifyButton.disabled = !selectedProject;
    deleteButton.disabled = !selectedProject;
}

// Open modal for adding or modifying projects
function openModal(mode) {
    if (mode === 'modify' && !selectedProject) return;
    
    modalTitle.textContent = mode === 'add' ? 'Add New Project' : 'Modify Project';
    modal.classList.add('active');
    
    if (mode === 'modify') {
        projectNameInput.value = selectedProject.name;
        projectDescInput.value = selectedProject.description;
        projectStatusInput.value = selectedProject.status;
        projectCategoryInput.value = selectedProject.category;
    } else {
        projectForm.reset();
    }
    
    projectForm.dataset.mode = mode;
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
    projectForm.reset();
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!projectForm.checkValidity()) {
        projectForm.reportValidity();
        return;
    }
    
    const projectData = {
        name: projectNameInput.value,
        description: projectDescInput.value,
        status: projectStatusInput.value,
        category: projectCategoryInput.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeSpent: 0
    };
    
    if (projectForm.dataset.mode === 'add') {
        projectData.id = Date.now();
        projects.push(projectData);
    } else {
        const index = projects.findIndex(p => p.id === selectedProject.id);
        if (index !== -1) {
            projectData.id = selectedProject.id;
            projectData.createdAt = selectedProject.createdAt;
            projectData.timeSpent = selectedProject.timeSpent || 0;
            projects[index] = projectData;
        }
    }
    
    saveProjects();
    renderProjects();
    updatePomodoroProjectList();
    closeModal();
}

// Delete selected project
function deleteSelectedProject() {
    if (!selectedProject) return;
    
    if (confirm('Are you sure you want to delete this project?')) {
        projects = projects.filter(p => p.id !== selectedProject.id);
        selectedProject = null;
        saveProjects();
        renderProjects();
        updateButtonStates();
    }
}

// Save projects to localStorage
function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
}

// Format status for display
function formatStatus(status) {
    return status.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Update Pomodoro project list
function updatePomodoroProjectList() {
    pomodoroProjectSelect.innerHTML = '<option value="">Select a project...</option>';
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        pomodoroProjectSelect.appendChild(option);
    });
}

// Pomodoro Timer Functions
function startTimer() {
    const selectedProjectId = pomodoroProjectSelect.value;
    if (!selectedProjectId) {
        alert('Please select a project first!');
        return;
    }

    if (!isTimerRunning) {
        isTimerRunning = true;
        currentProjectId = parseInt(selectedProjectId);
        startPomodoroButton.disabled = true;
        pausePomodoroButton.disabled = false;
        pomodoroProjectSelect.disabled = true;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (!isBreak) {
                    // Add time to project
                    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
                    if (projectIndex !== -1) {
                        projects[projectIndex].timeSpent = (projects[projectIndex].timeSpent || 0) + 
                            (parseInt(workDurationInput.value) * 60);
                        saveProjects();
                        renderProjects();
                    }
                    
                    // Switch to break
                    isBreak = true;
                    timeLeft = parseInt(breakDurationInput.value) * 60;
                    workCompleteSound.play();
                    alert('Time for a break!');
                } else {
                    // Switch back to work
                    isBreak = false;
                    timeLeft = parseInt(workDurationInput.value) * 60;
                    breakCompleteSound.play();
                    alert('Break is over! Back to work!');
                }
                
                if (isTimerRunning) {
                    timerInterval = setInterval(() => {
                        timeLeft--;
                        updateTimerDisplay();
                    }, 1000);
                }
            }
        }, 1000);
    }
}

function pauseTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        startPomodoroButton.disabled = false;
        pausePomodoroButton.disabled = true;
        pomodoroProjectSelect.disabled = false;
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    isBreak = false;
    timeLeft = parseInt(workDurationInput.value) * 60;
    currentProjectId = null;
    startPomodoroButton.disabled = false;
    pausePomodoroButton.disabled = false;
    pomodoroProjectSelect.disabled = false;
    updateTimerDisplay();
}

function updateTimerSettings() {
    if (!isTimerRunning) {
        timeLeft = parseInt(workDurationInput.value) * 60;
        updateTimerDisplay();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format time spent
function formatTimeSpent(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// Initialize the application
init(); 