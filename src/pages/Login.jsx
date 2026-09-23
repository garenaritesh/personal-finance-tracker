import { useState } from "react";
import { supabase } from "../lib/supabase";

function Login({ onSwitchToSignup }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage(error.message);
        }

        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="logo">₹</div>

                <h1>Welcome Back</h1>
                <p className="subtitle">Login to your Finance Tracker</p>

                <form onSubmit={handleLogin}>
                    <label>Email</label>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                {message && <p className="auth-message">{message}</p>}

                <p className="switch-text">
                    Don't have an account?{" "}
                    <button className="link-button" onClick={onSwitchToSignup}>
                        Create Account
                    </button>
                </p>
            </div>
        </div>
    );
}

export default Login;