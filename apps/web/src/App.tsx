import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function ChatList() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-2xl font-bold text-gray-700">Chat</h1>
    </div>
  )
}

function ChatDetail() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-2xl font-bold text-gray-700">Chat Detail</h1>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatList />} />
        <Route path="/chat/:id" element={<ChatDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
