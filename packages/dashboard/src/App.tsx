import { Routes, Route, NavLink } from 'react-router-dom';
import { Printer, FileText, ListTodo, Settings, Home } from 'lucide-react';
import HomePage from './pages/HomePage';
import OrdersPage from './pages/OrdersPage';
import PrintQueuePage from './pages/PrintQueuePage';
import SettingsPage from './pages/SettingsPage';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Printer className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">TK-Print</span>
            </div>
            <div className="flex gap-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`
                }
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </NavLink>
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`
                }
              >
                <FileText className="h-4 w-4" />
                <span>Orders</span>
              </NavLink>
              <NavLink
                to="/print-queue"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`
                }
              >
                <ListTodo className="h-4 w-4" />
                <span>Print Queue</span>
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`
                }
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/print-queue" element={<PrintQueuePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
