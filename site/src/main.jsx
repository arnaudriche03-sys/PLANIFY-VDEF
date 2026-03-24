import React from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './LandingPage'
import './site.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LandingPage onLoginClick={() => window.location.href = 'https://app.planify.com'} />
  </React.StrictMode>,
)
