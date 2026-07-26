import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './zia-orb.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LanguageProvider } from './context/LanguageContext'
import { ZiaProvider } from './context/ZiaContext'
import { RoleProvider } from './context/RoleContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <ZiaProvider>
        <RoleProvider>
          <App />
        </RoleProvider>
      </ZiaProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
