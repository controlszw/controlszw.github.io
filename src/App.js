import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Home from "./Home"; // Create this page
import Unauthorized from "./Unauthorized";
import ExpenseTracker from "./ExpenseTracker";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/expensetracker" element={<ExpenseTracker />} />
        <Route path="/" element={<ExpenseTracker />} /> {/* Default route */}
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Routes>
    </Router>
  );
}

export default App;
