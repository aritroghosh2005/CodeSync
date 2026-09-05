import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { HighContrastProvider } from './context/HighContrastContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HighContrastProvider>
      <App />
    </HighContrastProvider>
  </StrictMode>,
);
