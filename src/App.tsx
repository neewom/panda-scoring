import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/players" element={<PlayersPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
