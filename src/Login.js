import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/expensetracker"); // Redireciona após o login
    } catch (err) {
      setError("Falha ao fazer login com o Google.");
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="flex w-96 flex-col items-center rounded-xl bg-gray-600 p-6 shadow-lg">
        <img
          src="https://cdn-icons-png.flaticon.com/512/2331/2331965.png"
          alt="Finance Icon"
          className="mb-8 h-32 w-32 object-contain"
        />

        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <button
          onClick={handleLogin}
          className="w-full rounded-lg bg-blue-500 p-3 text-lg font-semibold text-white transition duration-300 hover:bg-blue-600"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;
