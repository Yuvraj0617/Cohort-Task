const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const categoryInput = document.querySelector("#category-input");
const taskList = document.querySelector("#tasks-list");
const taskCount = document.querySelector("#task-count");
const clearCompletedBtn = document.querySelector("#clear-completed");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const addButtonText = document.querySelector("#add span");

let tasks = [];
let editingId = null;

const savedTasks = localStorage.getItem("tasks");

if (savedTasks) {
    tasks = JSON.parse(savedTasks);
}

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function updateTaskCount() {
    const activeTasks = tasks.filter(function (task) {
        return task.completed === false;
    });

    if (activeTasks.length === 1) {
        taskCount.textContent = "1 task left";
    } else {
        taskCount.textContent = activeTasks.length + " tasks left";
    }
}

function escapeHTML(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showTasks() {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = '<p class="empty">No tasks to show.</p>';
        updateTaskCount();
        return;
    }

    tasks.forEach(function (task) {
        let completedClass = "";
        let checked = "";

        if (task.completed) {
            completedClass = " completed";
            checked = "checked";
        }

        taskList.innerHTML += `
            <div class="task${completedClass}" data-id="${task.id}">
                <span class="category ${task.category}">${task.category}</span>
                <input class="task-checkbox" type="checkbox" ${checked}>
                <p class="task-title">${escapeHTML(task.title)}</p>
                <div class="task-actions">
                    <button class="task-action edit" type="button">Edit</button>
                    <button class="task-action delete" type="button">Delete</button>
                </div>
            </div>
        `;
    });

    updateTaskCount();
}

function addTask(event) {
    event.preventDefault();

    const title = taskInput.value.trim();
    const category = categoryInput.value || "personal";

    if (title === "") {
        return;
    }

    if (editingId) {
        tasks = tasks.map(function (task) {
            if (String(task.id) === editingId) {
                return {
                    id: task.id,
                    title: title,
                    category: category,
                    completed: task.completed,
                };
            }

            return task;
        });
    } else {
        const newTask = {
            id: Date.now().toString(),
            title: title,
            category: category,
            completed: false,
        };

        tasks.unshift(newTask);
    }

    editingId = null;
    saveTasks();
    showTasks();
    resetForm();
}

function resetForm() {
    taskInput.value = "";
    categoryInput.value = "";
    addButtonText.textContent = "Add Task";
}

function deleteTask(taskId) {
    tasks = tasks.filter(function (task) {
        return String(task.id) !== taskId;
    });
    saveTasks();
    showTasks();
}

function startEdit(taskId) {
    const taskToEdit = tasks.find(function (task) {
        return String(task.id) === taskId;
    });

    if (!taskToEdit) {
        return;
    }

    editingId = taskId;
    taskInput.value = taskToEdit.title;
    categoryInput.value = taskToEdit.category;
    addButtonText.textContent = "Update Task";
    taskInput.focus();
}

function toggleTask(taskId) {
    tasks = tasks.map(function (task) {
        if (String(task.id) === taskId) {
            return {
                id: task.id,
                title: task.title,
                category: task.category,
                completed: !task.completed,
            };
        }

        return task;
    });

    saveTasks();
    showTasks();
}

function clearCompletedTasks() {
    tasks = tasks.filter(function (task) {
        return !task.completed;
    });
    saveTasks();
    showTasks();
}

function changeThemeIcon() {
    if (document.body.classList.contains("dark")) {
        themeIcon.className = "theme-icon ri-sun-fill";
    } else {
        themeIcon.className = "theme-icon ri-moon-fill";
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }

    changeThemeIcon();
}

function loadTheme() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
    }

    changeThemeIcon();
}

taskForm.addEventListener("submit", addTask);
clearCompletedBtn.addEventListener("click", clearCompletedTasks);
themeToggle.addEventListener("click", toggleTheme);

taskList.addEventListener("change", function (event) {
    if (event.target.classList.contains("task-checkbox")) {
        const taskBox = event.target.closest(".task");
        const taskId = taskBox.dataset.id;

        toggleTask(taskId);
    }
});

taskList.addEventListener("click", function (event) {
    const taskBox = event.target.closest(".task");

    if (!taskBox) {
        return;
    }

    const taskId = taskBox.dataset.id;

    if (event.target.classList.contains("edit")) {
        startEdit(taskId);
    }

    if (event.target.classList.contains("delete")) {
        deleteTask(taskId);
    }
});

loadTheme();
showTasks();
