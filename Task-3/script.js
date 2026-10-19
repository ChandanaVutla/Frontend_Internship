"use strict";

const $ = (selector) => document.querySelector(selector);

const taskForm = $("#taskForm");
const taskInput = $("#taskInput");
const taskPriority = $("#taskPriority");
const taskDueDate = $("#taskDueDate");
const taskList = $("#taskList");
const emptyState = $("#emptyState");
const searchInput = $("#searchInput");
const toast = $("#toast");

const STORAGE_KEY = "taskflow_professional_tasks";

let tasks = loadTasks();
let currentFilter = "all";
let currentView = "all";
let editingId = null;
let toastTimer;

$("#todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
});

function loadTasks() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

        if (!Array.isArray(data)) return [];

        return data.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.text === "string" &&
            typeof task.completed === "boolean" &&
            ["low", "medium", "high"].includes(task.priority)
        );
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        showToast("Unable to save changes. Check browser storage.");
        return false;
    }
}

function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function createId() {
    return typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(dateString) {
    if (!dateString) return "No due date";

    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function todayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isOverdue(task) {
    return Boolean(
        task.dueDate &&
        task.dueDate < todayString() &&
        !task.completed
    );
}

function openForm(task = null) {
    editingId = task ? task.id : null;

    taskForm.hidden = false;
    $("#formTitle").textContent = task ? "Edit task" : "Create a new task";
    $("#saveTaskBtn").textContent = task ? "Save changes" : "Save task";

    taskInput.value = task ? task.text : "";
    taskPriority.value = task ? task.priority : "medium";
    taskDueDate.value = task ? task.dueDate : "";

    $("#tasksSection").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    taskInput.focus({ preventScroll: true });
}

function closeForm() {
    taskForm.reset();
    taskForm.hidden = true;
    editingId = null;
}

$("#openTaskForm").addEventListener("click", () => openForm());
$("#emptyAddBtn").addEventListener("click", () => openForm());
$("#cancelForm").addEventListener("click", closeForm);

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) {
        taskInput.focus();
        return;
    }

    const dueDate = taskDueDate.value;

    if (dueDate && dueDate < "1000-01-01") {
        showToast("Please enter a valid due date.");
        return;
    }

    if (editingId) {
        const previous = tasks.find(task => task.id === editingId);

        if (!previous) {
            closeForm();
            render();
            return;
        }

        tasks = tasks.map(task =>
            task.id === editingId
                ? {
                    ...task,
                    text,
                    priority: taskPriority.value,
                    dueDate
                }
                : task
        );
    } else {
        tasks.unshift({
            id: createId(),
            text,
            priority: taskPriority.value,
            dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        });
    }

    if (!saveTasks()) return;

    closeForm();
    currentView = "all";
    currentFilter = "all";
    searchInput.value = "";

    render();
    showToast(editingId ? "Task updated." : "Task created.");
});

function toggleTask(id) {
    tasks = tasks.map(task =>
        task.id === id
            ? { ...task, completed: !task.completed }
            : task
    );

    if (saveTasks()) {
        render();
        showToast("Task status updated.");
    }
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);

    if (saveTasks()) {
        render();
        showToast("Task deleted.");
    }
}

function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (task) openForm(task);
}

function clearCompleted() {
    const completed = tasks.filter(task => task.completed).length;

    if (!completed) return;

    tasks = tasks.filter(task => !task.completed);

    if (saveTasks()) {
        render();
        showToast("Completed tasks cleared.");
    }
}

$("#clearCompleted").addEventListener("click", clearCompleted);

searchInput.addEventListener("input", render);

document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        currentView = currentFilter;
        render();
    });
});

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        currentView = button.dataset.view;
        currentFilter = currentView;
        render();

        $("#tasksSection").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
});

function getVisibleTasks() {
    const query = searchInput.value.trim().toLowerCase();

    return tasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(query);

        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "active" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        return matchesSearch && matchesFilter;
    });
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function createTaskRow(task) {
    const row = makeElement("article", "task-row");

    if (task.completed) row.classList.add("is-completed");

    const main = makeElement("div", "task-main");

    const checkbox = makeElement("input", "task-check");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute(
        "aria-label",
        task.completed ? "Mark task as active" : "Mark task as completed"
    );
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const copy = makeElement("div", "task-copy");
    const name = makeElement("span", "task-name", task.text);
    const meta = makeElement(
        "span",
        "task-meta",
        task.completed ? "Completed" : "In your task list"
    );

    copy.append(name, meta);
    main.append(checkbox, copy);

    const priorityCell = makeElement("div", "priority-cell");
    const priority = makeElement(
        "span",
        `priority-badge priority-${task.priority}`,
        task.priority
    );
    priorityCell.append(priority);

    const date = makeElement(
        "div",
        "due-date",
        formatDate(task.dueDate)
    );

    if (isOverdue(task)) {
        date.classList.add("overdue");
        date.textContent = "Overdue · " + formatDate(task.dueDate);
    }

    const actions = makeElement("div", "task-actions");

    const editButton = makeElement("button", "action-btn", "✎");
    editButton.type = "button";
    editButton.title = "Edit task";
    editButton.setAttribute("aria-label", "Edit " + task.text);
    editButton.addEventListener("click", () => editTask(task.id));

    const deleteButton = makeElement("button", "action-btn delete", "×");
    deleteButton.type = "button";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute("aria-label", "Delete " + task.text);
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(editButton, deleteButton);
    row.append(main, priorityCell, date, actions);

    return row;
}

function render() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;
    const rate = total ? Math.round((completed / total) * 100) : 0;

    $("#totalCount").textContent = total;
    $("#activeCount").textContent = active;
    $("#completedCount").textContent = completed;
    $("#completionRate").textContent = rate + "%";
    $("#progressLabel").textContent = rate + "%";
    $("#progressFill").style.width = rate + "%";
    $("#sidebarPending").textContent = active;

    $("#progressFill").setAttribute("role", "progressbar");
    $("#progressFill").setAttribute("aria-valuenow", rate);
    $("#progressFill").setAttribute("aria-valuemin", 0);
    $("#progressFill").setAttribute("aria-valuemax", 100);

    document.querySelectorAll("[data-filter]").forEach(button => {
        const selected = button.dataset.filter === currentFilter;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll("[data-view]").forEach(button => {
        const selected = button.dataset.view === currentView;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    taskList.replaceChildren();

    const visibleTasks = getVisibleTasks();

    visibleTasks.forEach(task => {
        taskList.appendChild(createTaskRow(task));
    });

    taskList.hidden = visibleTasks.length === 0;
    emptyState.hidden = visibleTasks.length !== 0;

    if (total === 0) {
        $("#emptyTitle").textContent = "Ready when you are";
        $("#emptyMessage").textContent =
            "Create your first task to get started.";
    } else if (visibleTasks.length === 0) {
        $("#emptyTitle").textContent = "No tasks found";
        $("#emptyMessage").textContent =
            "Try another filter or search for something else.";
    }

    $("#emptyAddBtn").hidden = total > 0 && visibleTasks.length === 0;

    $("#listSummary").textContent =
        `Showing ${visibleTasks.length} of ${total} tasks`;

    $("#clearCompleted").hidden = completed === 0;
}

render();
