import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicStatus from './pages/PublicStatus';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<PublicStatus />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
