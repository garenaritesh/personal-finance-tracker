import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Debts({ onBack }) {
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [personName, setPersonName] = useState("");
    const [type, setType] = useState("receivable");
    const [totalAmount, setTotalAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [description, setDescription] = useState("");

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [paymentDebt, setPaymentDebt] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentNote, setPaymentNote] = useState("");
    const [paymentSaving, setPaymentSaving] = useState(false);

    useEffect(() => {
        loadDebts();
    }, []);

    // =========================
    // LOAD DEBTS
    // =========================

    async function loadDebts() {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        const { data: debtData, error: debtError } = await supabase
            .from("debts")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (debtError) {
            console.error(debtError);
            setMessage(debtError.message);
            setLoading(false);
            return;
        }

        const { data: paymentData, error: paymentError } = await supabase
            .from("debt_payments")
            .select("*")
            .eq("user_id", user.id);

        if (paymentError) {
            console.error(paymentError);
            setMessage(paymentError.message);
            setLoading(false);
            return;
        }

        const formattedDebts = (debtData || []).map((debt) => {
            const payments = (paymentData || []).filter(
                (payment) => payment.debt_id === debt.id
            );

            const paidAmount = payments.reduce(
                (total, payment) => total + Number(payment.amount),
                0
            );

            const remainingAmount = Math.max(
                Number(debt.total_amount) - paidAmount,
                0
            );

            let status = "pending";

            if (remainingAmount <= 0) {
                status = "paid";
            } else if (paidAmount > 0) {
                status = "partial";
            }

            return {
                ...debt,
                paidAmount,
                remainingAmount,
                status,
            };
        });

        setDebts(formattedDebts);
        setLoading(false);
    }

    // =========================
    // ADD DEBT
    // =========================

    async function handleAddDebt(e) {
        e.preventDefault();

        if (
            !personName.trim() ||
            !totalAmount ||
            Number(totalAmount) <= 0
        ) {
            setMessage("Please enter person name and valid amount.");
            return;
        }

        setSaving(true);
        setMessage("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setMessage("User session not found.");
            setSaving(false);
            return;
        }

        const { error } = await supabase.from("debts").insert([
            {
                user_id: user.id,
                person_name: personName.trim(),
                type,
                total_amount: Number(totalAmount),
                due_date: dueDate || null,
                description: description.trim() || null,
                status: "pending",
            },
        ]);

        if (error) {
            console.error(error);
            setMessage(error.message);
            setSaving(false);
            return;
        }

        setPersonName("");
        setType("receivable");
        setTotalAmount("");
        setDueDate("");
        setDescription("");

        setMessage("Debt added successfully!");

        await loadDebts();

        setSaving(false);
    }

    // =========================
    // ADD PAYMENT
    // =========================

    async function handleAddPayment(e) {
        e.preventDefault();

        if (
            !paymentAmount ||
            Number(paymentAmount) <= 0
        ) {
            return;
        }

        if (Number(paymentAmount) > paymentDebt.remainingAmount) {
            alert(
                `Payment cannot be more than remaining amount ₹${paymentDebt.remainingAmount.toLocaleString(
                    "en-IN"
                )}`
            );
            return;
        }

        setPaymentSaving(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setPaymentSaving(false);
            return;
        }

        const { error } = await supabase
            .from("debt_payments")
            .insert([
                {
                    user_id: user.id,
                    debt_id: paymentDebt.id,
                    amount: Number(paymentAmount),
                    payment_date: new Date()
                        .toISOString()
                        .split("T")[0],
                    note: paymentNote.trim() || null,
                },
            ]);

        if (error) {
            console.error(error);
            alert(error.message);
            setPaymentSaving(false);
            return;
        }

        // Calculate new remaining amount
        const newRemaining =
            paymentDebt.remainingAmount - Number(paymentAmount);

        let newStatus = "partial";

        if (newRemaining <= 0) {
            newStatus = "paid";
        }

        // Update debt status
        const { error: statusError } = await supabase
            .from("debts")
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("id", paymentDebt.id)
            .eq("user_id", user.id);

        if (statusError) {
            console.error(statusError);
        }

        setPaymentAmount("");
        setPaymentNote("");
        setPaymentDebt(null);

        await loadDebts();

        setPaymentSaving(false);
    }

    // =========================
    // DELETE DEBT
    // =========================

    async function handleDeleteDebt(debtId) {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this debt?"
        );

        if (!confirmDelete) return;

        const { error } = await supabase
            .from("debts")
            .delete()
            .eq("id", debtId);

        if (error) {
            alert(error.message);
            return;
        }

        await loadDebts();
    }

    // =========================
    // TOTALS
    // =========================

    const totalReceivable = debts
        .filter((debt) => debt.type === "receivable")
        .reduce(
            (total, debt) => total + debt.remainingAmount,
            0
        );

    const totalPayable = debts
        .filter((debt) => debt.type === "payable")
        .reduce(
            (total, debt) => total + debt.remainingAmount,
            0
        );

    return (
        <div className="debt-page">

            <div className="debt-container">

                {/* HEADER */}

                <div className="debt-header">

                    <div>
                        <button
                            className="back-btn"
                            onClick={onBack}
                        >
                            ← Back to Dashboard
                        </button>

                        <h1>Debt Manager</h1>

                        <p>
                            Track money you have to receive and pay.
                        </p>
                    </div>

                </div>

                {/* SUMMARY */}

                <div className="debt-summary">

                    <div className="debt-summary-card receivable-summary">
                        <span>Money to Receive</span>

                        <strong>
                            ₹{totalReceivable.toLocaleString("en-IN")}
                        </strong>
                    </div>

                    <div className="debt-summary-card payable-summary">
                        <span>Money to Pay</span>

                        <strong>
                            ₹{totalPayable.toLocaleString("en-IN")}
                        </strong>
                    </div>

                </div>

                {/* ADD DEBT */}

                <div className="debt-card">

                    <h2>Add New Debt</h2>

                    <form onSubmit={handleAddDebt}>

                        <label>Person Name</label>

                        <input
                            type="text"
                            placeholder="e.g. Piyush"
                            value={personName}
                            onChange={(e) =>
                                setPersonName(e.target.value)
                            }
                        />

                        <label>Type</label>

                        <div className="type-buttons">

                            <button
                                type="button"
                                className={
                                    type === "receivable"
                                        ? "type-btn active-receivable"
                                        : "type-btn"
                                }
                                onClick={() => setType("receivable")}
                            >
                                Money to Receive
                            </button>

                            <button
                                type="button"
                                className={
                                    type === "payable"
                                        ? "type-btn active-payable"
                                        : "type-btn"
                                }
                                onClick={() => setType("payable")}
                            >
                                Money to Pay
                            </button>

                        </div>

                        <label>Total Amount</label>

                        <div className="debt-amount-input">

                            <span>₹</span>

                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="0"
                                value={totalAmount}
                                onChange={(e) =>
                                    setTotalAmount(e.target.value)
                                }
                            />

                        </div>

                        <label>Due Date</label>

                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) =>
                                setDueDate(e.target.value)
                            }
                        />

                        <label>Description</label>

                        <textarea
                            rows="3"
                            placeholder="Optional note..."
                            value={description}
                            onChange={(e) =>
                                setDescription(e.target.value)
                            }
                        />

                        {message && (
                            <div className="debt-message">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="add-debt-btn"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Add Debt"}
                        </button>

                    </form>

                </div>

                {/* DEBT LIST */}

                <div className="debt-list-section">

                    <h2>Your Debts</h2>

                    {loading ? (
                        <p className="empty-text">
                            Loading debts...
                        </p>
                    ) : debts.length === 0 ? (
                        <div className="empty-debt">
                            <div>💰</div>
                            <h3>No debts added yet</h3>
                            <p>
                                Add a person above to start tracking.
                            </p>
                        </div>
                    ) : (
                        <div className="debt-list">

                            {debts.map((debt) => (

                                <div
                                    className="debt-item"
                                    key={debt.id}
                                >

                                    <div className="debt-item-top">

                                        <div>

                                            <h3>
                                                {debt.person_name}
                                            </h3>

                                            <span
                                                className={
                                                    debt.type === "receivable"
                                                        ? "debt-type receivable"
                                                        : "debt-type payable"
                                                }
                                            >
                                                {debt.type === "receivable"
                                                    ? "Money to Receive"
                                                    : "Money to Pay"}
                                            </span>

                                        </div>

                                        <span
                                            className={`status ${debt.status}`}
                                        >
                                            {debt.status === "pending"
                                                ? "Pending"
                                                : debt.status === "partial"
                                                    ? "Partial"
                                                    : "Paid"}
                                        </span>

                                    </div>

                                    <div className="debt-money-grid">

                                        <div>
                                            <span>Total</span>
                                            <strong>
                                                ₹
                                                {Number(
                                                    debt.total_amount
                                                ).toLocaleString("en-IN")}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Paid</span>
                                            <strong className="paid-amount">
                                                ₹
                                                {debt.paidAmount.toLocaleString(
                                                    "en-IN"
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Remaining</span>
                                            <strong className="remaining-amount">
                                                ₹
                                                {debt.remainingAmount.toLocaleString(
                                                    "en-IN"
                                                )}
                                            </strong>
                                        </div>

                                    </div>

                                    {debt.description && (
                                        <p className="debt-description">
                                            {debt.description}
                                        </p>
                                    )}

                                    {debt.due_date && (
                                        <p className="due-date">
                                            Due: {debt.due_date}
                                        </p>
                                    )}

                                    {/* PROGRESS */}

                                    <div className="payment-progress">

                                        <div
                                            className="payment-progress-bar"
                                            style={{
                                                width: `${Math.min(
                                                    (debt.paidAmount /
                                                        Number(
                                                            debt.total_amount
                                                        )) *
                                                    100,
                                                    100
                                                )}%`,
                                            }}
                                        ></div>

                                    </div>

                                    {/* ACTIONS */}

                                    <div className="debt-actions">

                                        {debt.remainingAmount > 0 && (
                                            <button
                                                className="payment-btn"
                                                onClick={() =>
                                                    setPaymentDebt(debt)
                                                }
                                            >
                                                + Add Payment
                                            </button>
                                        )}

                                        <button
                                            className="delete-debt-btn"
                                            onClick={() =>
                                                handleDeleteDebt(debt.id)
                                            }
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>

                            ))}

                        </div>
                    )}

                </div>

            </div>

            {/* ================= PAYMENT MODAL ================= */}

            {paymentDebt && (

                <div className="modal-overlay">

                    <div className="payment-modal">

                        <button
                            className="modal-close"
                            onClick={() =>
                                setPaymentDebt(null)
                            }
                        >
                            ×
                        </button>

                        <h2>Add Payment</h2>

                        <p>
                            {paymentDebt.person_name}
                        </p>

                        <div className="modal-remaining">
                            Remaining:{" "}
                            <strong>
                                ₹
                                {paymentDebt.remainingAmount.toLocaleString(
                                    "en-IN"
                                )}
                            </strong>
                        </div>

                        <form onSubmit={handleAddPayment}>

                            <label>Payment Amount</label>

                            <div className="debt-amount-input">

                                <span>₹</span>

                                <input
                                    type="number"
                                    min="1"
                                    max={paymentDebt.remainingAmount}
                                    step="0.01"
                                    placeholder="0"
                                    value={paymentAmount}
                                    onChange={(e) =>
                                        setPaymentAmount(e.target.value)
                                    }
                                />

                            </div>

                            <label>Note</label>

                            <textarea
                                rows="3"
                                placeholder="Optional note..."
                                value={paymentNote}
                                onChange={(e) =>
                                    setPaymentNote(e.target.value)
                                }
                            />

                            <button
                                type="submit"
                                className="add-debt-btn"
                                disabled={paymentSaving}
                            >
                                {paymentSaving
                                    ? "Saving..."
                                    : "Save Payment"}
                            </button>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Debts;