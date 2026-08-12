const translations: Record<string, string> = {
  'chatList.newConversation': 'New Conversation',
  'chatList.noSessions': 'No sessions yet',
  'chatList.searchSessions': 'Search sessions...',
  'messageInput.placeholder': 'Type a message...',
  'messageInput.send': 'Send',
  'messageInput.stop': 'Stop',
  'chat.newChat.welcome': 'What are we working on?',
};

export function useTranslation() {
  function t(key: string): string {
    return translations[key] ?? key;
  }

  return { t };
}
