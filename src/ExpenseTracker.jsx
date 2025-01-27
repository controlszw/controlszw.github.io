import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

function ExpenseTracker() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [installments, setInstallments] = useState(1);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentSort, setCurrentSort] = useState("value");

  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
      } else {
        setUser(user);
        fetchExpenses(user.uid, currentMonth, currentYear);
      }
    });

    return unsubscribe;
  }, [auth, navigate, currentMonth, currentYear]);

  const fetchExpenses = async (uid, month, year) => {
    try {
      const userExpensesRef = collection(db, "users", uid, "expenses");
      const q = query(
        userExpensesRef,
        where("month", "==", month),
        where("year", "==", year)
      );
      const querySnapshot = await getDocs(q);
      const fetchedExpenses = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        };
      });
      setExpenses(fetchedExpenses);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  };

  const addExpense = async () => {
    if (!value || !description) return;

    try {
      const parsedValue = parseFloat(value);
      const expensesToAdd = [];
      const groupId = Date.now().toString();

      for (let i = 0; i < installments; i++) {
        const installmentMonth = (currentMonth + i) % 12;
        const installmentYear = currentYear + Math.floor((currentMonth + i) / 12);
        const newExpense = {
          value: parsedValue / installments,
          description: `${description} - Parcela ${i + 1}/${installments}`,
          month: installmentMonth,
          year: installmentYear,
          timestamp: new Date(),
          groupId: groupId,
        };
        expensesToAdd.push(newExpense);
      }

      const promises = expensesToAdd.map((expense) =>
        addDoc(collection(db, "users", user.uid, "expenses"), expense)
      );
      const addedDocs = await Promise.all(promises);

      const addedExpenses = addedDocs
        .map((docRef, index) => ({
          id: docRef.id,
          ...expensesToAdd[index],
        }))
        .filter(
          (expense) =>
            expense.month === currentMonth && expense.year === currentYear
        );

      setExpenses((prevExpenses) => [...prevExpenses, ...addedExpenses]);
      setValue("");
      setDescription("");
      setInstallments(1);
    } catch (err) {
      console.error("Error adding expense:", err);
    }
  };

  const updateExpense = async (id, newValue, newDescription) => {
    try {
      const docRef = doc(db, "users", user.uid, "expenses", id);
      await updateDoc(docRef, { 
        value: parseFloat(newValue),
        description: newDescription 
      });

      setExpenses((prevExpenses) =>
        prevExpenses.map((expense) =>
          expense.id === id
            ? { 
                ...expense, 
                value: parseFloat(newValue),
                description: newDescription 
              }
            : expense
        )
      );
      setEditId(null);
      setEditValue("");
      setEditDescription("");
    } catch (err) {
      console.error("Error updating expense:", err);
    }
  };

  const removeExpense = async (id) => {
    try {
      const expenseToDelete = expenses.find((expense) => expense.id === id);
      if (!expenseToDelete) return;

      const expensesRef = collection(db, "users", user.uid, "expenses");
      const q = query(
        expensesRef,
        where("groupId", "==", expenseToDelete.groupId)
      );
      const querySnapshot = await getDocs(q);

      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setExpenses((prevExpenses) =>
        prevExpenses.filter(
          (expense) => expense.groupId !== expenseToDelete.groupId
        )
      );
    } catch (err) {
      console.error("Error removing expense:", err);
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate("/login");
      })
      .catch((err) => {
        console.error("Error signing out:", err);
      });
  };

  const nextMonth = () => {
    const nextDate = new Date(currentYear, currentMonth + 1);
    setCurrentMonth(nextDate.getMonth());
    setCurrentYear(nextDate.getFullYear());
    fetchExpenses(user.uid, nextDate.getMonth(), nextDate.getFullYear());
  };

  const previousMonth = () => {
    const prevDate = new Date(currentYear, currentMonth - 1);
    setCurrentMonth(prevDate.getMonth());
    setCurrentYear(prevDate.getFullYear());
    fetchExpenses(user.uid, prevDate.getMonth(), prevDate.getFullYear());
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.value,
    0
  );

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (currentSort === "value") {
      return b.value - a.value;
    } else {
      return b.timestamp - a.timestamp;
    }
  });

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-2 sm:p-4 flex flex-col">
      <div className="max-w-4xl mx-auto flex-1 w-full overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-emerald-400 text-center">
            💰 Controle de Gastos
          </h1>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 text-sm"
          >
            🚪 Sair
          </button>
        </div>

        {/* Month Navigation */}
        <div className="bg-gray-800 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-xl">
          <div className="flex flex-col gap-2 sm:flex-row items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-center">
              📅{" "}
              {new Date(currentYear, currentMonth)
                .toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })
                .replace(/de /g, "")}
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={previousMonth}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 text-sm"
              >
                ← Anterior
              </button>
              <button
                onClick={nextMonth}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 text-sm"
              >
                Próximo →
              </button>
            </div>
          </div>

          {/* Total e Filtro */}
          <div className="bg-gray-700 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-bold text-emerald-400">
              Total: R$ {totalExpenses.toFixed(2)}
            </h3>
            <select
              value={currentSort}
              onChange={(e) => setCurrentSort(e.target.value)}
              className="bg-gray-800 text-gray-100 px-2 py-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="value">Maior valor</option>
              <option value="date">Mais recente</option>
            </select>
          </div>

          {/* Add Expense Form */}
          <div className="flex flex-col gap-2 mb-4 sm:mb-6">
            <input
              type="number"
              placeholder="Valor"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
            />
            <input
              type="text"
              placeholder="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
            />
            <input
              type="number"
              placeholder="Parcelas"
              value={installments}
              min="1"
              onChange={(e) => setInstallments(parseInt(e.target.value))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
            />
            <button
              onClick={addExpense}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors duration-200 text-base"
            >
              ➕ Adicionar Gasto
            </button>
          </div>

          {/* Expenses List */}
          <div className="space-y-3">
            {sortedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-gray-800 p-4 rounded-lg hover:bg-gray-750 transition-colors duration-200"
              >
                {editId === expense.id ? (
                  <div className="flex-1 flex flex-col gap-3">
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                    />
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-base text-gray-200 break-words block font-medium">
                      {expense.description}
                    </span>
                    <span className="text-sm text-gray-400 block mt-1">
                      {expense.timestamp.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-2 sm:mt-0">
                  {editId === expense.id ? (
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => updateExpense(expense.id, editValue, editDescription)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors duration-200 text-base"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setEditId(null);
                          setEditValue("");
                          setEditDescription("");
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors duration-200 text-base"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-base sm:text-lg font-mono text-emerald-400 min-w-[100px] text-right">
                        R$ {expense.value.toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditId(expense.id);
                            setEditValue(expense.value.toString());
                            setEditDescription(expense.description);
                          }}
                          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors duration-200 text-base"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeExpense(expense.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 text-base"
                        >
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpenseTracker;
