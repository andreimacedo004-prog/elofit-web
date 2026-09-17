import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RotaProtegida from "./componentes/RotaProtegida";
import Layout from "./componentes/Layout";
import Entrar from "./paginas/Entrar";
import Inicio from "./paginas/Inicio";
import Corridas from "./paginas/Corridas";
import Treinos from "./paginas/Treinos";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />

        {/* Tudo aqui dentro exige login e compartilha o mesmo cabeçalho. */}
        <Route
          element={
            <RotaProtegida>
              <Layout />
            </RotaProtegida>
          }
        >
          <Route path="/" element={<Inicio />} />
          <Route path="/corridas" element={<Corridas />} />
          <Route path="/treinos" element={<Treinos />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
