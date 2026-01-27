import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { ErrorBoundary } from './app/components/ErrorBoundary'
import { AuthProvider } from './app/context/AuthContext'
import { ThemeProvider } from './app/context/ThemeContext'
import './styles/index.css'
import './styles/tailwind.css'
import './styles/theme.css'

console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'Loaded' : 'Missing');
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Loaded' : 'Missing');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
