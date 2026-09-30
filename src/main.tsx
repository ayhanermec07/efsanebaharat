import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#fffdf8',
          color: '#293b2b',
          border: '1px solid #ded9c9',
          borderRadius: '12px',
          fontFamily: 'DM Sans, Arial, sans-serif',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#34513c',
            secondary: '#fffdf8',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#b91c1c',
            secondary: '#fffdf8',
          },
        },
      }}
    />
  </ErrorBoundary>,
)
