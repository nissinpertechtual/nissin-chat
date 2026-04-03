import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// StrictModeを外す: 開発中にuseEffectが2回実行されてauth初期化が競合するのを防ぐ
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
