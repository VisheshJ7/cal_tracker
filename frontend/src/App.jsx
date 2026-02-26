import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import ChatBot from './pages/ChatBot';
import Exercise from './pages/Exercise';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute requireOnboarding><Dashboard /></ProtectedRoute>} />
          <Route path="/exercise" element={<ProtectedRoute requireOnboarding><Exercise /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requireOnboarding><Reports /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute requireOnboarding><ChatBot /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
