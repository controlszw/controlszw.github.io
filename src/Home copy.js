import { useEffect, useState, useRef } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from './firebase';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';

function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  //const authorizedUids = ['QMe3niRqoBV4Sltqb1Rauc2xdge2', 'UidExample2', 'UidExample3']; // Substitua pelos UIDs autorizados

  const authorizedUid = process.env.REACT_APP_UID; // Carrega o UID autorizado da variável de ambiente

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login'); // Redireciona para login se não estiver autenticado
      } else {
        if (user.uid !== authorizedUid) {
          navigate('/unauthorized'); // Redireciona para página de acesso não autorizado
        } else {
          setUser(user); // Usuário autorizado, exibe a home
        }
      }
    });

    return unsubscribe; // Limpeza ao desmontar
  }, [auth, navigate]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate('/login'); // Redirect to login after logout
      })
      .catch((err) => {
        console.error('Error signing out:', err);
      });
  };

  const [processos, setProcessos] = useState([]);
  const [selectedProcesso, setSelectedProcesso] = useState('');
  const [novoProcesso, setNovoProcesso] = useState('');
  const [areasData, setAreasData] = useState({});
  const [formData, setFormData] = useState({
    faculdade: '',
    area: '',
    pontosSorteados: [],
    pontos: [''],
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [areasCount, setAreasCount] = useState(0); // Contador de áreas

  // Carregar processos ao montar o componente
  useEffect(() => {
    const fetchProcessos = async () => {
      const querySnapshot = await getDocs(collection(db, 'processos'));
      const loadedProcessos = [];
      const loadedAreasData = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedProcessos.push(data.nome);
        loadedAreasData[data.nome] = data.areas || [];
      });
      setProcessos(loadedProcessos);
      setAreasData(loadedAreasData);
    };

    fetchProcessos();
  }, []);

  useEffect(() => {
    // Atualiza o contador de áreas quando o processo selecionado mudar ou as áreas forem atualizadas
    if (selectedProcesso) {
      setAreasCount(areasData[selectedProcesso]?.length || 0);
    }
  }, [selectedProcesso, areasData]);

  const handleCreateProcesso = async () => {
    if (novoProcesso.trim() === '') return;
    if (!processos.includes(novoProcesso)) {
      const newProcesso = { nome: novoProcesso, areas: [] };
      // Usando o nome do processo como ID no Firestore
      await setDoc(doc(db, 'processos', novoProcesso), newProcesso);
      setProcessos((prev) => [...prev, novoProcesso]);
    }
    setSelectedProcesso(novoProcesso);
    setNovoProcesso('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const addPonto = () => {
    setFormData((prevData) => ({
      ...prevData,
      pontos: [...prevData.pontos, ''],
    }));
  };

  const handlePontoChange = (index, value) => {
    const updatedPontos = [...formData.pontos];
    updatedPontos[index] = value;
    setFormData((prevData) => ({
      ...prevData,
      pontos: updatedPontos,
    }));
  };

  const removePonto = (index) => {
    const updatedPontos = formData.pontos.filter((_, i) => i !== index);
    setFormData((prevData) => ({
      ...prevData,
      pontos: updatedPontos,
    }));
  };

  const handleSave = async () => {
    if (!selectedProcesso) {
      alert('Selecione ou crie um processo antes de salvar os dados.');
      return;
    }

    const processoAreas = areasData[selectedProcesso] || [];
    const updatedAreas = [...processoAreas];

    if (editingIndex !== null) {
      updatedAreas[editingIndex] = formData;
    } else {
      updatedAreas.push(formData);
    }

    const docRef = (await getDocs(collection(db, 'processos'))).docs.find(
      (doc) => doc.data().nome === selectedProcesso
    );

    if (docRef) {
      await updateDoc(doc(db, 'processos', docRef.id), { areas: updatedAreas });
    }

    setAreasData((prevData) => ({
      ...prevData,
      [selectedProcesso]: updatedAreas,
    }));

    setFormData({
      faculdade: '',
      area: '',
      pontosSorteados: [],
      pontos: [''],
    });
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    const dataToEdit = areasData[selectedProcesso][index];
    setFormData(dataToEdit);
    setEditingIndex(index);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRemove = async (index) => {
    const processoAreas = areasData[selectedProcesso] || [];
    const updatedAreas = processoAreas.filter((_, i) => i !== index);

    const docRef = (await getDocs(collection(db, 'processos'))).docs.find(
      (doc) => doc.data().nome === selectedProcesso
    );

    if (docRef) {
      await updateDoc(doc(db, 'processos', docRef.id), { areas: updatedAreas });
    }

    setAreasData((prevData) => ({
      ...prevData,
      [selectedProcesso]: updatedAreas,
    }));
  };

  // Função para atualizar o endpoint 'sorteio' com o processo selecionado
  const handleUtilizar = async () => {
    if (!selectedProcesso) {
      alert('Selecione um processo antes de utilizar!');
      return;
    }

    const processoAreas = areasData[selectedProcesso] || [];

    // Supondo que você deseje atualizar os dados de sorteio no Firestore
    const sorteioRef = doc(db, 'processos', 'sorteio'); // Referência ao documento 'sorteio'

    try {
      await setDoc(sorteioRef, {
        areas: processoAreas, // Atualiza as áreas do sorteio com as áreas do processo selecionado
      });
      alert('Sorteio atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar sorteio:', error);
      alert('Erro ao atualizar sorteio!');
    }
  };

  const formRef = useRef(null);
  /*CARDS ATUALIZAR ORDEM*/
  const handleReorder = async (fromIndex, toIndex) => {
    if (!selectedProcesso) return;

    // Atualiza a ordem no estado local
    const updatedAreas = [...areasData[selectedProcesso]];
    const [movedItem] = updatedAreas.splice(fromIndex, 1);
    updatedAreas.splice(toIndex, 0, movedItem);

    // Atualiza no Firestore
    const processoRef = doc(db, 'processos', selectedProcesso); // Referência ao processo selecionado

    try {
      await setDoc(processoRef, { areas: updatedAreas }, { merge: true });
      // Atualiza o estado local com os dados reordenados
      setAreasData((prevData) => ({
        ...prevData,
        [selectedProcesso]: updatedAreas,
      }));
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      alert('Erro ao atualizar ordem!');
    }
  };
  return (
    <div>
      <div className="text-center">
        <div className="mt-4 flex justify-center">
          <img
            src={user ? user.photoURL : ''}
            alt="Profile"
            className="mt-4 h-32 w-32 rounded-full"
          />
        </div>
        <br></br>
        <h2 className="mb-4 text-3xl">{user ? user.displayName : 'User'}</h2>
        <p>{user ? user.email : 'Loading...'}</p>
      </div>

      <div className="p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Gerenciador de Areas do PSPPS
        </h1>

        {/* Processo */}
        <div className="mb-6 text-center">
          <h3 className="mb-2 font-semibold">Selecione ou Crie um Processo</h3>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <select
              value={selectedProcesso}
              onChange={(e) => setSelectedProcesso(e.target.value)}
              className="w-64 rounded border border-gray-300 p-2"
            >
              <option value="">Selecione um Processo</option>
              {processos.map((processo, index) => (
                <option key={index} value={processo}>
                  {processo}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={novoProcesso}
              onChange={(e) => setNovoProcesso(e.target.value)}
              placeholder="Novo Processo"
              className="w-64 rounded border border-gray-300 p-2"
            />
            <button
              onClick={handleCreateProcesso}
              className="rounded bg-blue-500 px-4 py-2 text-white"
            >
              Criar Processo
            </button>
            {/* Botão "UTILIZAR" */}
            {selectedProcesso && (
              <div className="">
                <button
                  onClick={handleUtilizar}
                  className="rounded bg-green-500 p-2 text-white hover:bg-green-800"
                >
                  Atualizar na Página
                </button>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="rounded bg-red-500 p-2 text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Contador de Áreas */}
        {selectedProcesso && (
          <div className="mb-6 text-center">
            <p>
              <strong>Contagem de Áreas:</strong> {areasCount}
            </p>
          </div>
        )}

        {/* Formulário */}
        {selectedProcesso && (
          <div ref={formRef}>
            <div className="mb-6">
              <h3 className="mb-4 text-center text-2xl font-semibold">
                {editingIndex !== null ? 'Editar Dados' : 'Adicionar Dados'} -
                Processo: {selectedProcesso}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block font-medium">Área:</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    className="w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block font-medium">Faculdade:</label>
                  <input
                    type="text"
                    name="faculdade"
                    value={formData.faculdade}
                    onChange={handleInputChange}
                    className="w-full rounded border border-gray-300 p-2"
                  />
                </div>
              </div>
              <h3 className="mt-4 font-semibold">Pontos:</h3>
              {formData.pontos.map((ponto, index) => (
                <div key={index} className="mb-2 flex items-center gap-4">
                  <input
                    type="text"
                    value={ponto}
                    onChange={(e) => handlePontoChange(index, e.target.value)}
                    className="flex-1 rounded border border-gray-300 p-2"
                  />
                  <button
                    onClick={() => removePonto(index)}
                    className="rounded bg-red-500 px-4 py-2 text-white"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <div className="space-x-4">
                <button
                  onClick={addPonto}
                  className="g-4 rounded bg-green-500 px-4 py-2 text-white"
                >
                  Adicionar Ponto
                </button>
                <button
                  onClick={handleSave}
                  className="rounded bg-blue-500 px-4 py-2 text-white"
                >
                  {editingIndex !== null ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dados Salvos */}
        {selectedProcesso && areasData[selectedProcesso] && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Dados Salvos</h2>
            <ul className="space-y-4">
              {areasData[selectedProcesso].map((data, index) => (
                <li key={index} className="rounded bg-gray-100 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>Área:</strong> {data.area}
                      <br />
                      <strong>Faculdade:</strong> {data.faculdade} <br />
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() =>
                          index > 0 && handleReorder(index, index - 1)
                        }
                        className="rounded bg-blue-500 px-4 py-2 text-white"
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          index < areasData[selectedProcesso].length - 1 &&
                          handleReorder(index, index + 1)
                        }
                        className="rounded bg-green-500 px-4 py-2 text-white"
                        disabled={
                          index === areasData[selectedProcesso].length - 1
                        }
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(index)}
                        className="rounded bg-yellow-500 px-4 py-2 text-white"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleRemove(index)}
                        className="rounded bg-red-500 px-4 py-2 text-white"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-medium">Pontos:</h4>
                    <ul className="ml-6 list-disc">
                      {data.pontos.map((ponto, i) => (
                        <li key={i}>{ponto}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
