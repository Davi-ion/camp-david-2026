import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';
import BottomNav from './components/BottomNav';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RollCall from './pages/RollCall';
import Programme from './pages/Programme';
import Incidents from './pages/Incidents';
import Campers from './pages/Campers';
import Admin from './pages/Admin';

function PrivateRoute() {
  const { state } = useApp();
  
  if (!state.currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rollcall" element={<RollCall />} />
          <Route path="/programme" element={<Programme />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/campers" element={<Campers />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
