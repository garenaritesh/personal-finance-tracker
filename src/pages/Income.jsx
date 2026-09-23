import { useState } from "react";
import { supabase } from "../lib/supabase";

function Income({ onBack, onSaved }) {
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Salary");
    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !amount || Number(amount) <= 0) {
            setMessage("Please enter a valid title and amount.");
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

        const { error } = await supabase.from("income").insert([
            {
                user_id: user.id,
                title: title.trim(),
                amount: Number(amount),
                category,
                description: description.trim() || null,
                income_date: date,
            },
        ]);

        if (error) {
            console.error(error);
            setMessage(error.message);
            setSaving(false);
            return;
        }

        setTitle("");
        setAmount("");
        setCategory("Salary");
        setDescription("");

        setMessage("Income added successfully!");

        if (onSaved) {
            onSaved();
        }

        setSaving(false);
    };

    return (
        <div className="finance-page">
            <div className="finance-container">

                <button className="back-btn" onClick={onBack}>
                    ← Back to Dashboard
                </button>

                <div className="finance-card">
                    <div className="page-heading">
                        <div className="income-icon">₹</div>

                        <div>
                            <h1>Add Income</h1>
                            <p>Record money you received.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>

                        <label>Income Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Salary, Freelance Payment"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <label>Amount</label>
                        <div className="amount-input">
                            <span>₹</span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <label>Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option>Salary</option>
                            <option>Business</option>
                            <option>Freelance</option>
                            <option>Investment</option>
                            <option>Gift</option>
                            <option>Other</option>
                        </select>

                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />

                        <label>Description / Note</label>
                        <textarea
                            placeholder="Optional note..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                        />

                        {message && (
                            <div className="form-message">
                                {message}
                            </div>
                        )}

                        <button
                            className="save-btn"
                            type="submit"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Income"}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}

export default Income;