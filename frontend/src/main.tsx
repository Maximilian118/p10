import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import App from './App'
import axios from 'axios'
import { resizeOps } from './shared/utility'

// URL for all graphql requests - uses Vite proxy in development
axios.defaults.baseURL = "/graphql"

// MUI style
const theme = createTheme({
  typography: {
    allVariants: {
      fontFamily: 'formula1-regular',
      fontSize: 14,
    },
    button: {
      textTransform: "none",
    },
  },
})

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)

// Make the window size inclusive of mobile browser ui.
resizeOps()
window.addEventListener("resize", resizeOps)

root.render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  </BrowserRouter>
)
