document.addEventListener("DOMContentLoaded", () => {
    const FT = window.FinTrack;
    if (!FT) return;

    const form = FT.$("#auth-form");
    if (!form) return;

    FT.applyTheme(FT.getTheme());

    const mode = form.dataset.mode;
    const session = FT.getSession();
    if (session?.username) {
        window.location.href = "Dashboard.html";
        return;
    }

    function getAuthFormValues() {
        return {
            username: FT.normalize(FT.$("#username").value),
            password: FT.$("#password").value,
        };
    }

    function registerUser(username, passwordHash) {
        const users = FT.getUsers();

        if (users.some((user) => user.username === username)) {
            FT.showMessage("#auth-message", "That username already exists.");
            return false;
        }

        users.push({
            username,
            passwordHash,
            fullName: username,
            currency: "USD",
            createdAt: new Date().toISOString(),
        });
        FT.saveUsers(users);
        FT.setSession(username);
        window.location.href = "Dashboard.html";
        return true;
    }

    function loginUser(username, passwordHash) {
        const users = FT.getUsers();
        const user = users.find((entry) => entry.username === username);

        if (!user || user.passwordHash !== passwordHash) {
            FT.showMessage("#auth-message", "Invalid username or password.");
            return;
        }

        FT.setSession(username);
        window.location.href = "Dashboard.html";
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const { username, password } = getAuthFormValues();

        if (username.length < 3) {
            FT.showMessage("#auth-message", "Username must be at least 3 characters.");
            return;
        }

        if (password.length < 6) {
            FT.showMessage("#auth-message", "Password must be at least 6 characters.");
            return;
        }

        const passwordHash = FT.hashPassword(password);

        if (mode === "register") {
            registerUser(username, passwordHash);
            return;
        }

        loginUser(username, passwordHash);
    });
});
