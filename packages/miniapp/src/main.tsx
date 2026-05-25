import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const savedTheme = localStorage.getItem('splitvault-theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.dataset.theme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
        <App />
    </React.StrictMode>,
)
