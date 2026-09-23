import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Debts from "./pages/Debts";
// import Debts from "./pages/Debts";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Income from "./pages/Income";
import Expense from "./pages/Expense";

import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [showSignup, setShowSignup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);

        if (!session) {
          setPage("dashboard");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        Loading Finance Tracker...
      </div>
    );
  }

  // Login / Signup
  if (!session) {
    if (showSignup) {
      return (
        <Signup
          onSwitchToLogin={() => setShowSignup(false)}
        />
      );
    }

    return (
      <Login
        onSwitchToSignup={() => setShowSignup(true)}
      />
    );
  }

  // Income page
  if (page === "income") {
    return (
      <Income
        onBack={() => setPage("dashboard")}
        onSaved={() => setPage("dashboard")}
      />
    );
  }

  // Expense page
  if (page === "expense") {
    return (
      <Expense
        onBack={() => setPage("dashboard")}
        onSaved={() => setPage("dashboard")}
      />
    );
  }

  if (page === "debts") {
    return (
      <Debts
        onBack={() => setPage("dashboard")}
      />
    );
  }

  // Dashboard
  return (
    <Dashboard
      onAddIncome={() => setPage("income")}
      onAddExpense={() => setPage("expense")}
      onAddDebt={() => setPage("debts")}
    />
  );
}

export default App;