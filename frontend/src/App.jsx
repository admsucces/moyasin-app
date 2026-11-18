import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingProvider } from './context/SettingContext';
import AppRoutes from './routes/AppRoutes';
import PwaInstallBanner from './components/common/PwaInstallBanner';

export function App() {
  return (
    <BrowserRouter>
      <SettingProvider>
        <AuthProvider>
          <AppRoutes />
          <PwaInstallBanner />
        </AuthProvider>
      </SettingProvider>
    </BrowserRouter>
  );
}

export default App;
