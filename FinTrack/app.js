const STORAGE_KEYS = {
    users: "fintrack_users",
    session: "fintrack_session",
    transactions: "fintrack_transactions",
    theme: "fintrack_theme",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const readJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const formatMoney = (value) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value) || 0);

const escapeHtml = (value) =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const normalize = (value) => value.trim().toLowerCase();

function hashPassword(password) {
    let hash = 2166136261;
    for (const char of password) {
        hash ^= char.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return `ft:${(hash >>> 0).toString(16)}`;
}

function generateId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `tx_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function getUsers() {
    return readJSON(STORAGE_KEYS.users, []);
}

function saveUsers(users) {
    writeJSON(STORAGE_KEYS.users, users);
}

function getSession() {
    return readJSON(STORAGE_KEYS.session, null);
}

function setSession(username) {
    writeJSON(STORAGE_KEYS.session, {
        username,
        loggedInAt: new Date().toISOString(),
    });
}

function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.session);
}

function getTransactions() {
    return readJSON(STORAGE_KEYS.transactions, []);
}

function saveTransactions(transactions) {
    writeJSON(STORAGE_KEYS.transactions, transactions);
}

function getTheme() {
    return localStorage.getItem(STORAGE_KEYS.theme) || "light";
}

function setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    const toggle = $("#theme-toggle");
    if (toggle) {
        toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
}

function requireAuth() {
    const session = getSession();
    if (!session?.username) {
        window.location.href = "Login.html";
        return null;
    }
    return session;
}

function clearAllData() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

function showMessage(selector, message, tone = "error") {
    const node = $(selector);
    if (!node) return;
    node.textContent = message;
    node.style.color = tone === "error" ? "var(--danger)" : "var(--success)";
}

function initAuthPage() {
    const form = $("#auth-form");
    if (!form) return;

    const mode = form.dataset.mode;
    const session = getSession();
    if (session?.username) {
        window.location.href = "Dashboard.html";
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const username = normalize($("#username").value);
        const password = $("#password").value;

        if (username.length < 3) {
            showMessage("#auth-message", "Username must be at least 3 characters.");
            return;
        }

        if (password.length < 6) {
            showMessage("#auth-message", "Password must be at least 6 characters.");
            return;
        }

        const users = getUsers();
        const passwordHash = hashPassword(password);

        if (mode === "register") {
            if (users.some((user) => user.username === username)) {
                showMessage("#auth-message", "That username already exists.");
                return;
            }

            users.push({
                username,
                passwordHash,
                createdAt: new Date().toISOString(),
            });
            saveUsers(users);
            setSession(username);
            window.location.href = "Dashboard.html";
            return;
        }

        const user = users.find((entry) => entry.username === username);
        if (!user || user.passwordHash !== passwordHash) {
            showMessage("#auth-message", "Invalid username or password.");
            return;
        }

        setSession(username);
        window.location.href = "Dashboard.html";
    });
}

function getCurrentUserTransactions(username) {
    return getTransactions().filter((transaction) => transaction.username === username);
}

function computeStats(transactions) {
    const income = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expense = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
        income,
        expense,
        balance: income - expense,
        count: transactions.length,
    };
}

function renderChart(stats) {
    const chart = $("#cash-flow-chart");
    if (!chart) return;

    const max = Math.max(stats.income, stats.expense, 1);
    chart.innerHTML = [
        { label: "Income", value: stats.income, className: "income" },
        { label: "Expense", value: stats.expense, className: "expense" },
    ]
        .map((item) => {
            const width = Math.max(4, (item.value / max) * 100);
            return `
                <div class="chart-row">
                    <span class="chart-label">${item.label}</span>
                    <div class="chart-track">
                        <div class="chart-fill ${item.className}" style="width: ${width}%"></div>
                    </div>
                    <span class="chart-value">${formatMoney(item.value)}</span>
                </div>
            `;
        })
        .join("");
}

function renderTransactions(transactions, filters) {
    const tbody = $("#transaction-list");
    if (!tbody) return;

    const { search, type } = filters;
    const query = normalize(search);

    const filtered = transactions.filter((transaction) => {
        const matchesSearch =
            !query ||
            [transaction.description, transaction.category, transaction.date, transaction.type]
                .join(" ")
                .toLowerCase()
                .includes(query);
        const matchesType = type === "all" || transaction.type === type;
        return matchesSearch && matchesType;
    });

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td class="empty-state" colspan="6">No transactions found.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
            (transaction) => `
            <tr>
                <td>${escapeHtml(transaction.date)}</td>
                <td><strong>${escapeHtml(transaction.description)}</strong></td>
                <td>${escapeHtml(transaction.category)}</td>
                <td><span class="badge ${transaction.type}">${transaction.type}</span></td>
                <td class="${transaction.type === "income" ? "positive" : "negative"}">${transaction.type === "income" ? "+" : "-"}${formatMoney(transaction.amount).replace("$", "")}</td>
                <td>
                    <div class="table-actions">
                        <button type="button" data-edit="${transaction.id}">Edit</button>
                        <button type="button" data-delete="${transaction.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `
        )
        .join("");
}

function openModal(transaction = null) {
    const modal = $("#transaction-modal");
    if (!modal) return;

    $("#transaction-modal-title").textContent = transaction ? "Edit Transaction" : "Add Transaction";
    $("#transaction-id").value = transaction?.id ?? "";
    $("#transaction-date").value = transaction?.date ?? new Date().toISOString().slice(0, 10);
    $("#transaction-type").value = transaction?.type ?? "expense";
    $("#transaction-description").value = transaction?.description ?? "";
    $("#transaction-category").value = transaction?.category ?? "";
    $("#transaction-amount").value = transaction?.amount ?? "";
    showMessage("#transaction-message", "", "success");

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    $("#transaction-description").focus();
}

function closeModal() {
    const modal = $("#transaction-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function initDashboard() {
    const session = requireAuth();
    if (!session) return;

    const userChip = $("#current-user");
    if (userChip) {
        userChip.textContent = session.username;
    }

    const theme = getTheme();
    applyTheme(theme);

    const hasDashboardView =
        $("#balance-value") &&
        $("#income-value") &&
        $("#expense-value") &&
        $("#transaction-count") &&
        $("#cash-flow-chart") &&
        $("#transaction-list") &&
        $("#search-input") &&
        $("#filter-type");

    const transactions = () => getCurrentUserTransactions(session.username);
    let filters = {
        search: "",
        type: "all",
    };

    const refresh = () => {
        if (!hasDashboardView) {
            return;
        }

        const items = transactions();
        const stats = computeStats(items);

        $("#balance-value").textContent = formatMoney(stats.balance);
        $("#income-value").textContent = formatMoney(stats.income);
        $("#expense-value").textContent = formatMoney(stats.expense);
        $("#transaction-count").textContent = String(stats.count);

        renderChart(stats);
        renderTransactions(items, filters);
    };

    refresh();

    if (hasDashboardView) {
        $("#search-input").addEventListener("input", (event) => {
            filters.search = event.target.value;
            renderTransactions(transactions(), filters);
        });

        $("#filter-type").addEventListener("change", (event) => {
            filters.type = event.target.value;
            renderTransactions(transactions(), filters);
        });
    }

    $("#open-transaction")?.addEventListener("click", () => openModal());
    $("#logout-btn")?.addEventListener("click", () => {
        clearSession();
        window.location.href = "Login.html";
    });

    $("#theme-toggle")?.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
    });

    $("#reset-data")?.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Reset all FinTrack data from this browser? This removes users, sessions, and transactions."
        );
        if (!confirmed) return;
        clearAllData();
        window.location.href = "Register.html";
    });

    $("#transaction-form")?.addEventListener("submit", (event) => {
        event.preventDefault();

        const id = $("#transaction-id").value;
        const date = $("#transaction-date").value;
        const type = $("#transaction-type").value;
        const description = $("#transaction-description").value.trim();
        const category = $("#transaction-category").value.trim();
        const amount = Number($("#transaction-amount").value);

        if (!date || !description || !category || !Number.isFinite(amount) || amount <= 0) {
            showMessage("#transaction-message", "Please complete every field with a valid amount.");
            return;
        }

        const allTransactions = getTransactions();
        const payload = {
            id: id || generateId(),
            username: session.username,
            date,
            type,
            description,
            category,
            amount: Number(amount.toFixed(2)),
            updatedAt: new Date().toISOString(),
        };

        const nextTransactions = id
            ? allTransactions.map((transaction) =>
                  transaction.id === id ? { ...transaction, ...payload } : transaction
              )
            : [...allTransactions, { ...payload, createdAt: new Date().toISOString() }];

        saveTransactions(nextTransactions);
        closeModal();
        refresh();
    });

    if (hasDashboardView) {
        $("#transaction-list").addEventListener("click", (event) => {
            const editId = event.target.closest("[data-edit]")?.dataset.edit;
            const deleteId = event.target.closest("[data-delete]")?.dataset.delete;
            if (editId) {
                const transaction = getTransactions().find((entry) => entry.id === editId);
                if (transaction) openModal(transaction);
            }
            if (deleteId) {
                const confirmed = window.confirm("Delete this transaction?");
                if (!confirmed) return;
                saveTransactions(getTransactions().filter((entry) => entry.id !== deleteId));
                refresh();
            }
        });
    }

    $$("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
    $("#transaction-modal")?.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal-backdrop")) {
            closeModal();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}

function initThemeForNonDashboard() {
    const theme = getTheme();
    applyTheme(theme);
}

document.addEventListener("DOMContentLoaded", () => {
    initAuthPage();
    initDashboard();
    initThemeForNonDashboard();
});
