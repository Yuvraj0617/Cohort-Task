window.FinTrack = (() => {
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

    const getUserByUsername = (username) => getUsers().find((user) => user.username === username) || null;

    const getCurrentUser = () => {
        const session = getSession();
        if (!session?.username) return null;
        return getUserByUsername(session.username);
    };

    const getDisplayName = (username = null) => {
        const user = username ? getUserByUsername(username) : getCurrentUser();
        return user?.fullName?.trim() || user?.username || "";
    };

    const getCurrencyCode = (username = null) => {
        const user = username ? getUserByUsername(username) : getCurrentUser();
        return user?.currency || "USD";
    };

    const formatMoney = (value, currency = getCurrencyCode()) => {
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
            }).format(Number(value) || 0);
        } catch {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
            }).format(Number(value) || 0);
        }
    };

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

    function updateCurrentUser(updates) {
        const session = getSession();
        if (!session?.username) return null;

        const users = getUsers();
        let updatedUser = null;

        const nextUsers = users.map((user) => {
            if (user.username !== session.username) {
                return user;
            }

            updatedUser = {
                ...user,
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            return updatedUser;
        });

        if (!updatedUser) return null;

        saveUsers(nextUsers);
        return updatedUser;
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

    return {
        STORAGE_KEYS,
        $,
        $$,
        readJSON,
        writeJSON,
        getUserByUsername,
        getCurrentUser,
        getDisplayName,
        getCurrencyCode,
        formatMoney,
        escapeHtml,
        normalize,
        hashPassword,
        generateId,
        getUsers,
        saveUsers,
        updateCurrentUser,
        getSession,
        setSession,
        clearSession,
        getTransactions,
        saveTransactions,
        getTheme,
        setTheme,
        applyTheme,
        requireAuth,
        clearAllData,
        showMessage,
    };
})();
