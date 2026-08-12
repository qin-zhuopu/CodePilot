import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatLayout } from '@/layouts/ChatLayout';
import { ChatPage } from '@/pages/ChatPage';
import { ChatSessionPage } from '@/pages/ChatSessionPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route element={<ChatLayout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:id" element={<ChatSessionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
