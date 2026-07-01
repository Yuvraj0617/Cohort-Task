document.addEventListener("DOMContentLoaded", () => {
    const FT = window.FinTrack;
    if (!FT) return;

    const session = FT.requireAuth();
    if (!session) return;

    const elements = {
        userChip: FT.$("#current-user"),
        nameInput: FT.$("#profile-name"),
        currencyInput: FT.$("#profile-currency"),
        logoutButton: FT.$("#logout-btn"),
        settingsForm: FT.$("#settings-form"),
        settingsMessage: FT.$("#settings-message"),
        resetDataButton: FT.$("#reset-data"),
    };

    const user = FT.getCurrentUser();

    if (elements.userChip) {
        elements.userChip.textContent = FT.getDisplayName(session.username);
    }

    FT.applyTheme(FT.getTheme());

    if (elements.nameInput) {
        elements.nameInput.value = user?.fullName || FT.getDisplayName(session.username);
    }

    if (elements.currencyInput) {
        elements.currencyInput.value = user?.currency || "USD";
    }

    function saveSettings() {
        const fullName = elements.nameInput.value.trim();
        const currency = elements.currencyInput.value;

        if (!fullName) {
            FT.showMessage("#settings-message", "Full name is required.");
            return;
        }

        const updatedUser = FT.updateCurrentUser({
            fullName,
            currency,
        });

        if (!updatedUser) {
            FT.showMessage("#settings-message", "Could not save your settings right now.");
            return;
        }

        if (elements.userChip) {
            elements.userChip.textContent = FT.getDisplayName(session.username);
        }

        FT.showMessage("#settings-message", "Settings saved.", "success");
    }

    elements.logoutButton?.addEventListener("click", () => {
        FT.clearSession();
        window.location.href = "Login.html";
    });

    elements.settingsForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        saveSettings();
    });

    elements.resetDataButton?.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Reset all FinTrack data from this browser? This removes users, sessions, and transactions."
        );
        if (!confirmed) return;
        FT.clearAllData();
        window.location.href = "Register.html";
    });
});
