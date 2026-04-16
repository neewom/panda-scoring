import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import NewGamePage from './pages/NewGamePage'
import HistoryPage from './pages/HistoryPage'
import HistoryDetailPage from './pages/HistoryDetailPage'
import SettingsPage from './pages/SettingsPage'
import GamesPage from './pages/GamesPage'
import GameSession from './pages/GameSession'
import GameResults from './pages/GameResults'
import BottomNav from './components/BottomNav'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new-game" element={<NewGamePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/game/:id" element={<GameSession />} />
        <Route path="/game/:id/results" element={<GameResults />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App
