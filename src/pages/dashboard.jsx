import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

import { supabase } from "../lib/supabase";

function Dashboard({ onAddIncome, onAddExpense, onAddDebt }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [receivable, setReceivable] = useState(0);
    const [payable, setPayable] = useState(0);

    const [recentActivities, setRecentActivities] = useState([]);

    const [monthlyData, setMonthlyData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        setUser(user);

        // =========================
        // INCOME
        // =========================

        const { data: incomeData, error: incomeError } = await supabase
            .from("income")
            .select("id, title, amount, category, income_date, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (incomeError) {
            console.error("Income Error:", incomeError);
        }

        const totalIncome = (incomeData || []).reduce(
            (total, item) => total + Number(item.amount),
            0
        );

        setIncome(totalIncome);

        // =========================
        // EXPENSE
        // =========================

        const { data: expenseData, error: expenseError } = await supabase
            .from("expenses")
            .select("id, title, amount, category, expense_date, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (expenseError) {
            console.error("Expense Error:", expenseError);
        }

        const totalExpense = (expenseData || []).reduce(
            (total, item) => total + Number(item.amount),
            0
        );

        setExpense(totalExpense);

        // =========================
        // DEBTS
        // =========================

        const { data: debtData, error: debtError } = await supabase
            .from("debts")
            .select("id, person_name, type, total_amount, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (debtError) {
            console.error("Debt Error:", debtError);
        }

        const { data: paymentData, error: paymentError } = await supabase
            .from("debt_payments")
            .select("id, debt_id, amount, payment_date, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (paymentError) {
            console.error("Payment Error:", paymentError);
        }

        let totalReceivable = 0;
        let totalPayable = 0;

        (debtData || []).forEach((debt) => {
            const paidAmount = (paymentData || [])
                .filter((payment) => payment.debt_id === debt.id)
                .reduce(
                    (total, payment) => total + Number(payment.amount),
                    0
                );

            const remaining =
                Number(debt.total_amount) - paidAmount;

            if (remaining <= 0) return;

            if (debt.type === "receivable") {
                totalReceivable += remaining;
            }

            if (debt.type === "payable") {
                totalPayable += remaining;
            }
        });

        setReceivable(totalReceivable);
        setPayable(totalPayable);

        // =========================
        // MONTHLY ANALYTICS
        // =========================

        const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];

        const monthly = months.map((month) => ({
            month,
            income: 0,
            expense: 0,
        }));

        (incomeData || []).forEach((item) => {
            const monthIndex =
                new Date(item.income_date).getMonth();

            monthly[monthIndex].income += Number(item.amount);
        });

        (expenseData || []).forEach((item) => {
            const monthIndex =
                new Date(item.expense_date).getMonth();

            monthly[monthIndex].expense += Number(item.amount);
        });

        setMonthlyData(monthly);

        // =========================
        // EXPENSE CATEGORIES
        // =========================

        const categoryTotals = {};

        (expenseData || []).forEach((item) => {
            const category = item.category || "Other";

            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }

            categoryTotals[category] += Number(item.amount);
        });

        const categories = Object.entries(categoryTotals).map(
            ([name, value]) => ({
                name,
                value,
            })
        );

        setCategoryData(categories);

        // =========================
        // RECENT ACTIVITIES
        // =========================

        const activities = [];

        (incomeData || []).forEach((item) => {
            activities.push({
                id: `income-${item.id}`,
                type: "income",
                title: item.title,
                category: item.category,
                amount: Number(item.amount),
                date: item.income_date,
                createdAt: item.created_at,
            });
        });

        (expenseData || []).forEach((item) => {
            activities.push({
                id: `expense-${item.id}`,
                type: "expense",
                title: item.title,
                category: item.category,
                amount: Number(item.amount),
                date: item.expense_date,
                createdAt: item.created_at,
            });
        });

        (debtData || []).forEach((item) => {
            activities.push({
                id: `debt-${item.id}`,
                type: "debt",
                title: item.person_name,
                category:
                    item.type === "receivable"
                        ? "Money to Receive"
                        : "Money to Pay",
                amount: Number(item.total_amount),
                date: item.created_at?.split("T")[0],
                createdAt: item.created_at,
            });
        });

        (paymentData || []).forEach((item) => {
            const relatedDebt = (debtData || []).find(
                (debt) => debt.id === item.debt_id
            );

            if (relatedDebt) {
                activities.push({
                    id: `payment-${item.id}`,
                    type: "payment",
                    title: relatedDebt.person_name,
                    category:
                        relatedDebt.type === "receivable"
                            ? "Received Payment"
                            : "Paid Debt",
                    amount: Number(item.amount),
                    date: item.payment_date,
                    createdAt: item.created_at,
                });
            }
        });

        activities.sort(
            (a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
        );

        setRecentActivities(activities.slice(0, 8));

        setLoading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
    }

    const balance = income - expense;

    if (loading) {
        return (
            <div style={styles.loadingScreen}>
                Loading Finance Tracker...
            </div>
        );
    }

    return (
        <div style={styles.page}>

            {/* HEADER */}

            <header style={styles.header}>
                <div>
                    <h1 style={styles.logo}>
                        Finance Tracker
                    </h1>

                    <p style={styles.welcome}>
                        Welcome back, {user?.email}
                    </p>
                </div>

                <button
                    onClick={handleLogout}
                    style={styles.logoutButton}
                >
                    Logout
                </button>
            </header>

            <main style={styles.container}>

                {/* BALANCE */}

                <div style={styles.balanceCard}>
                    <div>
                        <p style={styles.balanceLabel}>
                            Current Balance
                        </p>

                        <h2 style={styles.balanceAmount}>
                            ₹{balance.toLocaleString("en-IN")}
                        </h2>
                    </div>

                    <div style={styles.balanceInfo}>
                        <p>
                            Income:{" "}
                            <span style={styles.greenText}>
                                ₹{income.toLocaleString("en-IN")}
                            </span>
                        </p>

                        <p>
                            Expenses:{" "}
                            <span style={styles.redText}>
                                ₹{expense.toLocaleString("en-IN")}
                            </span>
                        </p>
                    </div>
                </div>

                {/* SUMMARY */}

                <div style={styles.summaryGrid}>

                    <SummaryCard
                        icon="↑"
                        label="Total Income"
                        amount={income}
                        iconBackground="#12351f"
                        iconColor="#22c55e"
                    />

                    <SummaryCard
                        icon="↓"
                        label="Total Expenses"
                        amount={expense}
                        iconBackground="#3a1719"
                        iconColor="#ef4444"
                    />

                    <SummaryCard
                        icon="←"
                        label="Money to Receive"
                        amount={receivable}
                        iconBackground="#172d45"
                        iconColor="#3b82f6"
                    />

                    <SummaryCard
                        icon="→"
                        label="Money to Pay"
                        amount={payable}
                        iconBackground="#382718"
                        iconColor="#f59e0b"
                    />

                </div>

                {/* QUICK ACTIONS */}

                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>
                        Quick Actions
                    </h2>

                    <div style={styles.quickActions}>

                        <button
                            onClick={onAddIncome}
                            style={{
                                ...styles.actionButton,
                                background: "#22c55e",
                                color: "#06130a",
                            }}
                        >
                            + Add Income
                        </button>

                        <button
                            onClick={onAddExpense}
                            style={{
                                ...styles.actionButton,
                                background: "#ef4444",
                                color: "#fff",
                            }}
                        >
                            + Add Expense
                        </button>

                        <button
                            onClick={onAddDebt}
                            style={{
                                ...styles.actionButton,
                                background: "#3b82f6",
                                color: "#fff",
                            }}
                        >
                            + Add Debt
                        </button>

                    </div>
                </section>

                {/* ANALYTICS */}

                <section style={styles.section}>

                    <h2 style={styles.sectionTitle}>
                        Financial Analytics
                    </h2>

                    <div style={styles.analyticsGrid}>

                        {/* MONTHLY CHART */}

                        <div style={styles.chartCard}>

                            <h3 style={styles.chartTitle}>
                                Income vs Expense
                            </h3>

                            <p style={styles.chartSubtitle}>
                                Monthly overview
                            </p>

                            <div style={styles.chartWrapper}>

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart data={monthlyData}>

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#292d35"
                                        />

                                        <XAxis
                                            dataKey="month"
                                            stroke="#8b8f98"
                                        />

                                        <YAxis
                                            stroke="#8b8f98"
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background: "#181b21",
                                                border: "1px solid #30343d",
                                                borderRadius: "8px",
                                                color: "#fff",
                                            }}
                                            formatter={(value) =>
                                                `₹${Number(value).toLocaleString(
                                                    "en-IN"
                                                )}`
                                            }
                                        />

                                        <Legend />

                                        <Bar
                                            dataKey="income"
                                            name="Income"
                                            fill="#22c55e"
                                            radius={[4, 4, 0, 0]}
                                        />

                                        <Bar
                                            dataKey="expense"
                                            name="Expense"
                                            fill="#ef4444"
                                            radius={[4, 4, 0, 0]}
                                        />

                                    </BarChart>
                                </ResponsiveContainer>

                            </div>
                        </div>

                        {/* CATEGORY CHART */}

                        <div style={styles.chartCard}>

                            <h3 style={styles.chartTitle}>
                                Expense Categories
                            </h3>

                            <p style={styles.chartSubtitle}>
                                Where your money is going
                            </p>

                            <div style={styles.chartWrapper}>

                                {categoryData.length === 0 ? (
                                    <div style={styles.noChartData}>
                                        No expense data yet.
                                    </div>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart>

                                            <Pie
                                                data={categoryData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={105}
                                                label
                                            >
                                                {categoryData.map(
                                                    (entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                CHART_COLORS[
                                                                index %
                                                                CHART_COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    )
                                                )}
                                            </Pie>

                                            <Tooltip
                                                formatter={(value) =>
                                                    `₹${Number(value).toLocaleString(
                                                        "en-IN"
                                                    )}`
                                                }
                                                contentStyle={{
                                                    background: "#181b21",
                                                    border: "1px solid #30343d",
                                                    borderRadius: "8px",
                                                    color: "#fff",
                                                }}
                                            />

                                            <Legend />

                                        </PieChart>
                                    </ResponsiveContainer>
                                )}

                            </div>
                        </div>

                    </div>
                </section>

                {/* RECENT ACTIVITY */}

                <section style={styles.section}>

                    <h2 style={styles.sectionTitle}>
                        Recent Activity
                    </h2>

                    <div style={styles.activityCard}>

                        {recentActivities.length === 0 ? (
                            <div style={styles.emptyActivity}>
                                <p>No transactions yet.</p>

                                <span>
                                    Add income, expense or debt to see
                                    activity here.
                                </span>
                            </div>
                        ) : (
                            recentActivities.map((activity) => {

                                const isIncome =
                                    activity.type === "income";

                                const isExpense =
                                    activity.type === "expense";

                                const isPayment =
                                    activity.type === "payment";

                                let icon = "💰";
                                let iconBackground = "#172d45";

                                if (isIncome) {
                                    icon = "↑";
                                    iconBackground = "#12351f";
                                }

                                if (isExpense) {
                                    icon = "↓";
                                    iconBackground = "#3a1719";
                                }

                                if (isPayment) {
                                    icon = "₹";
                                    iconBackground = "#382718";
                                }

                                return (
                                    <div
                                        style={styles.activityRow}
                                        key={activity.id}
                                    >

                                        <div
                                            style={{
                                                ...styles.activityIcon,
                                                background: iconBackground,
                                            }}
                                        >
                                            {icon}
                                        </div>

                                        <div style={styles.activityDetails}>

                                            <strong>
                                                {activity.title}
                                            </strong>

                                            <span>
                                                {activity.category}
                                            </span>

                                            <small>
                                                {activity.date}
                                            </small>

                                        </div>

                                        <strong
                                            style={{
                                                ...styles.activityAmount,
                                                color: isExpense
                                                    ? "#ef4444"
                                                    : "#22c55e",
                                            }}
                                        >
                                            {isExpense ? "-" : "+"}
                                            ₹
                                            {activity.amount.toLocaleString(
                                                "en-IN"
                                            )}
                                        </strong>

                                    </div>
                                );
                            })
                        )}

                    </div>

                </section>

                {/* FINANCIAL OVERVIEW */}

                <section style={styles.section}>

                    <h2 style={styles.sectionTitle}>
                        Financial Overview
                    </h2>

                    <div style={styles.overviewCard}>

                        <OverviewRow
                            label="Income"
                            value={income}
                            color="#22c55e"
                        />

                        <OverviewRow
                            label="Expenses"
                            value={expense}
                            color="#ef4444"
                        />

                        <div style={styles.divider}></div>

                        <OverviewRow
                            label="Balance"
                            value={balance}
                            color="#fff"
                        />

                        <OverviewRow
                            label="To Receive"
                            value={receivable}
                            color="#3b82f6"
                        />

                        <OverviewRow
                            label="To Pay"
                            value={payable}
                            color="#f59e0b"
                        />

                    </div>

                </section>

            </main>
        </div>
    );
}


// =========================
// COMPONENTS
// =========================

function SummaryCard({
    icon,
    label,
    amount,
    iconBackground,
    iconColor,
}) {
    return (
        <div style={styles.card}>

            <div
                style={{
                    ...styles.icon,
                    background: iconBackground,
                    color: iconColor,
                }}
            >
                {icon}
            </div>

            <div>
                <p style={styles.cardLabel}>
                    {label}
                </p>

                <h3 style={styles.cardAmount}>
                    ₹{amount.toLocaleString("en-IN")}
                </h3>
            </div>

        </div>
    );
}


function OverviewRow({
    label,
    value,
    color,
}) {
    return (
        <div style={styles.overviewRow}>

            <span>{label}</span>

            <strong style={{ color }}>
                ₹{value.toLocaleString("en-IN")}
            </strong>

        </div>
    );
}


// =========================
// CHART COLORS
// =========================

const CHART_COLORS = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
    "#14b8a6",
    "#f97316",
    "#ec4899",
];


// =========================
// STYLES
// =========================

const styles = {

    loadingScreen: {
        minHeight: "100vh",
        background: "#0f1115",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
    },

    page: {
        minHeight: "100vh",
        background: "#0f1115",
        color: "#fff",
    },

    header: {
        minHeight: "75px",
        borderBottom: "1px solid #292d35",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        background: "#14161b",
    },

    logo: {
        margin: 0,
        fontSize: "24px",
    },

    welcome: {
        margin: "5px 0 0",
        color: "#8b8f98",
        fontSize: "13px",
    },

    logoutButton: {
        background: "transparent",
        color: "#d1d5db",
        border: "1px solid #3a3f48",
        borderRadius: "8px",
        padding: "9px 16px",
        cursor: "pointer",
    },

    container: {
        maxWidth: "1200px",
        margin: "auto",
        padding: "40px 20px",
    },

    balanceCard: {
        background: "#181b21",
        border: "1px solid #292d35",
        borderRadius: "18px",
        padding: "30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
    },

    balanceLabel: {
        margin: 0,
        color: "#8b8f98",
        fontSize: "14px",
    },

    balanceAmount: {
        margin: "8px 0 0",
        fontSize: "38px",
    },

    balanceInfo: {
        color: "#b5b8c0",
        lineHeight: "1.8",
    },

    summaryGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "18px",
        marginTop: "22px",
    },

    card: {
        background: "#181b21",
        border: "1px solid #292d35",
        borderRadius: "15px",
        padding: "22px",
        display: "flex",
        alignItems: "center",
        gap: "15px",
    },

    icon: {
        width: "45px",
        height: "45px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "22px",
        fontWeight: "bold",
        flexShrink: 0,
    },

    cardLabel: {
        margin: 0,
        color: "#8b8f98",
        fontSize: "13px",
    },

    cardAmount: {
        margin: "5px 0 0",
        fontSize: "22px",
    },

    section: {
        marginTop: "35px",
    },

    sectionTitle: {
        fontSize: "20px",
        marginBottom: "15px",
    },

    quickActions: {
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
    },

    actionButton: {
        padding: "13px 20px",
        border: "none",
        borderRadius: "10px",
        fontWeight: "700",
        cursor: "pointer",
        fontSize: "14px",
    },

    // Analytics

    analyticsGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "18px",
    },

    chartCard: {
        background: "#181b21",
        border: "1px solid #292d35",
        borderRadius: "15px",
        padding: "22px",
    },

    chartTitle: {
        margin: 0,
        fontSize: "17px",
    },

    chartSubtitle: {
        margin: "5px 0 15px",
        color: "#8b8f98",
        fontSize: "12px",
    },

    chartWrapper: {
        width: "100%",
        height: "320px",
    },

    noChartData: {
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#8b8f98",
    },

    // Recent Activity

    activityCard: {
        background: "#181b21",
        border: "1px solid #292d35",
        borderRadius: "15px",
        overflow: "hidden",
    },

    activityRow: {
        display: "flex",
        alignItems: "center",
        gap: "15px",
        padding: "16px 20px",
        borderBottom: "1px solid #292d35",
    },

    activityIcon: {
        width: "42px",
        height: "42px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "18px",
        flexShrink: 0,
    },

    activityDetails: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "3px",
    },

    activityAmount: {
        fontSize: "15px",
        whiteSpace: "nowrap",
    },

    emptyActivity: {
        padding: "35px 20px",
        textAlign: "center",
        color: "#8b8f98",
    },

    // Overview

    overviewCard: {
        background: "#181b21",
        border: "1px solid #292d35",
        borderRadius: "15px",
        padding: "22px",
    },

    overviewRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        color: "#c7cad1",
    },

    divider: {
        height: "1px",
        background: "#292d35",
        margin: "8px 0",
    },

    greenText: {
        color: "#22c55e",
    },

    redText: {
        color: "#ef4444",
    },
};

export default Dashboard;