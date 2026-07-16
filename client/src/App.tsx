import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ItemFormPage from "./pages/ItemFormPage";
import ScanPage from "./pages/ScanPage";
import StatsPage from "./pages/StatsPage";
import HouseholdPage from "./pages/HouseholdPage";
import RecipesPage from "./pages/RecipesPage";

function ProtectedLayout() {
  const { me, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">加载中...</div>
    );
  }
  if (!me) return <Navigate to="/login" replace />;
  return <Layout />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/add" element={<ItemFormPage />} />
            <Route path="/edit/:id" element={<ItemFormPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/household" element={<HouseholdPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
