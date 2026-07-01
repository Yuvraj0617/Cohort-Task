document.addEventListener("DOMContentLoaded", () => {
    const FT = window.FinTrack;
    if (!FT) return;

    const session = FT.requireAuth();
    if (!session) return;

    const elements = {
        userChip: FT.$("#current-user"),
        balanceValue: FT.$("#balance-value"),
        incomeValue: FT.$("#income-value"),
        expenseValue: FT.$("#expense-value"),
        transactionCount: FT.$("#transaction-count"),
        cashFlowCanvas: FT.$("#cash-flow-chart"),
        transactionList: FT.$("#transaction-list"),
        searchInput: FT.$("#search-input"),
        filterType: FT.$("#filter-type"),
        transactionModal: FT.$("#transaction-modal"),
        transactionModalTitle: FT.$("#transaction-modal-title"),
        transactionForm: FT.$("#transaction-form"),
        transactionId: FT.$("#transaction-id"),
        transactionDate: FT.$("#transaction-date"),
        transactionType: FT.$("#transaction-type"),
        transactionDescription: FT.$("#transaction-description"),
        transactionCategory: FT.$("#transaction-category"),
        transactionAmount: FT.$("#transaction-amount"),
        transactionMessage: FT.$("#transaction-message"),
        openTransactionButton: FT.$("#open-transaction"),
        logoutButton: FT.$("#logout-btn"),
        themeToggleButton: FT.$("#theme-toggle"),
        resetDataButton: FT.$("#reset-data"),
    };

    if (elements.userChip) {
        elements.userChip.textContent = FT.getDisplayName(session.username);
    }

    FT.applyTheme(FT.getTheme());

    const hasDashboardView =
        elements.balanceValue &&
        elements.incomeValue &&
        elements.expenseValue &&
        elements.transactionCount &&
        elements.cashFlowCanvas &&
        elements.transactionList &&
        elements.searchInput &&
        elements.filterType;

    const getUserTransactions = () =>
        FT.getTransactions().filter((transaction) => transaction.username === session.username);

    const filters = {
        search: "",
        type: "all",
    };

    let cashFlowChart = null;

    function calculateSummary(transactions) {
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

    function renderCashFlowChart(summary) {
        if (!elements.cashFlowCanvas || !globalThis.Chart) return;

        const context = elements.cashFlowCanvas.getContext("2d");
        if (!context) return;

        cashFlowChart?.destroy();

        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue("--text").trim() || "#0f172a";
        const gridColor = styles.getPropertyValue("--border").trim() || "rgba(148, 163, 184, 0.25)";
        const incomeColor = styles.getPropertyValue("--success").trim() || "#0f7a3b";
        const expenseColor = styles.getPropertyValue("--danger").trim() || "#b42318";

        cashFlowChart = new globalThis.Chart(context, {
            type: "bar",
            data: {
                labels: ["Income", "Expense"],
                datasets: [
                    {
                        label: "Cash Flow",
                        data: [summary.income, summary.expense],
                        backgroundColor: [incomeColor, expenseColor],
                        borderRadius: 14,
                        borderSkipped: false,
                        maxBarThickness: 96,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: (tooltipItem) => FT.formatMoney(tooltipItem.parsed.y),
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                weight: "600",
                            },
                        },
                        grid: {
                            display: false,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (value) => FT.formatMoney(value).replace(/\.00$/, ""),
                        },
                        grid: {
                            color: gridColor,
                        },
                    },
                },
            },
        });
    }

    function getVisibleTransactions(transactions) {
        const searchText = FT.normalize(filters.search);

        return transactions.filter((transaction) => {
            const searchableText = [
                transaction.description,
                transaction.category,
                transaction.date,
                transaction.type,
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch = !searchText || searchableText.includes(searchText);
            const matchesType = filters.type === "all" || transaction.type === filters.type;

            return matchesSearch && matchesType;
        });
    }

    function renderTransactionTable(transactions) {
        if (!elements.transactionList) return;

        const visibleTransactions = getVisibleTransactions(transactions);

        if (!visibleTransactions.length) {
            elements.transactionList.innerHTML = `
                <tr>
                    <td class="empty-state" colspan="6">No transactions found.</td>
                </tr>
            `;
            return;
        }

        elements.transactionList.innerHTML = visibleTransactions
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(
                (transaction) => `
                    <tr>
                        <td>${FT.escapeHtml(transaction.date)}</td>
                        <td><strong>${FT.escapeHtml(transaction.description)}</strong></td>
                        <td>${FT.escapeHtml(transaction.category)}</td>
                        <td><span class="badge ${transaction.type}">${transaction.type}</span></td>
                        <td class="${transaction.type === "income" ? "positive" : "negative"}">${
                            transaction.type === "income" ? "+" : "-"
                        }${FT.formatMoney(transaction.amount).replace("$", "")}</td>
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

    function openTransactionModal(transaction = null) {
        if (!elements.transactionModal) return;

        elements.transactionModalTitle.textContent = transaction ? "Edit Transaction" : "Add Transaction";
        elements.transactionId.value = transaction?.id ?? "";
        elements.transactionDate.value = transaction?.date ?? new Date().toISOString().slice(0, 10);
        elements.transactionType.value = transaction?.type ?? "expense";
        elements.transactionDescription.value = transaction?.description ?? "";
        elements.transactionCategory.value = transaction?.category ?? "";
        elements.transactionAmount.value = transaction?.amount ?? "";
        FT.showMessage("#transaction-message", "", "success");

        elements.transactionModal.classList.remove("hidden");
        elements.transactionModal.setAttribute("aria-hidden", "false");
        elements.transactionDescription.focus();
    }

    function closeTransactionModal() {
        if (!elements.transactionModal) return;
        elements.transactionModal.classList.add("hidden");
        elements.transactionModal.setAttribute("aria-hidden", "true");
    }

    function refreshDashboard() {
        if (!hasDashboardView) {
            return;
        }

        const userTransactions = getUserTransactions();
        const summary = calculateSummary(userTransactions);

        elements.balanceValue.textContent = FT.formatMoney(summary.balance);
        elements.incomeValue.textContent = FT.formatMoney(summary.income);
        elements.expenseValue.textContent = FT.formatMoney(summary.expense);
        elements.transactionCount.textContent = String(summary.count);

        renderCashFlowChart(summary);
        renderTransactionTable(userTransactions);
    }

    function getTransactionFormData() {
        return {
            id: elements.transactionId.value,
            date: elements.transactionDate.value,
            type: elements.transactionType.value,
            description: elements.transactionDescription.value.trim(),
            category: elements.transactionCategory.value.trim(),
            amount: Number(elements.transactionAmount.value),
        };
    }

    function saveTransaction() {
        const formData = getTransactionFormData();

        if (
            !formData.date ||
            !formData.description ||
            !formData.category ||
            !Number.isFinite(formData.amount) ||
            formData.amount <= 0
        ) {
            FT.showMessage("#transaction-message", "Please complete every field with a valid amount.");
            return;
        }

        const allTransactions = FT.getTransactions();
        const transactionRecord = {
            id: formData.id || FT.generateId(),
            username: session.username,
            date: formData.date,
            type: formData.type,
            description: formData.description,
            category: formData.category,
            amount: Number(formData.amount.toFixed(2)),
            updatedAt: new Date().toISOString(),
        };

        const nextTransactions = formData.id
            ? allTransactions.map((transaction) =>
                  transaction.id === formData.id ? { ...transaction, ...transactionRecord } : transaction
              )
            : [...allTransactions, { ...transactionRecord, createdAt: new Date().toISOString() }];

        FT.saveTransactions(nextTransactions);
        closeTransactionModal();
        refreshDashboard();
    }

    function handleTransactionListClick(event) {
        const editId = event.target.closest("[data-edit]")?.dataset.edit;
        const deleteId = event.target.closest("[data-delete]")?.dataset.delete;

        if (editId) {
            const transaction = FT.getTransactions().find((entry) => entry.id === editId);
            if (transaction) openTransactionModal(transaction);
        }

        if (deleteId) {
            const confirmed = window.confirm("Delete this transaction?");
            if (!confirmed) return;
            FT.saveTransactions(FT.getTransactions().filter((entry) => entry.id !== deleteId));
            refreshDashboard();
        }
    }

    refreshDashboard();

    if (hasDashboardView) {
        elements.searchInput.addEventListener("input", (event) => {
            filters.search = event.target.value;
            renderTransactionTable(getUserTransactions());
        });

        elements.filterType.addEventListener("change", (event) => {
            filters.type = event.target.value;
            renderTransactionTable(getUserTransactions());
        });
    }

    elements.openTransactionButton?.addEventListener("click", () => openTransactionModal());
    elements.logoutButton?.addEventListener("click", () => {
        FT.clearSession();
        window.location.href = "Login.html";
    });

    elements.themeToggleButton?.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
        FT.setTheme(nextTheme);
        FT.applyTheme(nextTheme);
        renderCashFlowChart(calculateSummary(getUserTransactions()));
    });

    elements.resetDataButton?.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Reset all FinTrack data from this browser? This removes users, sessions, and transactions."
        );
        if (!confirmed) return;
        FT.clearAllData();
        window.location.href = "Register.html";
    });

    elements.transactionForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        saveTransaction();
    });

    elements.transactionList?.addEventListener("click", handleTransactionListClick);

    elements.transactionModal?.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal-backdrop")) {
            closeTransactionModal();
        }
    });

    FT.$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeTransactionModal));

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeTransactionModal();
        }
    });

    window.addEventListener("beforeunload", () => {
        cashFlowChart?.destroy();
    });
});
