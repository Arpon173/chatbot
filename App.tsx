import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Message, Sender } from './types';

// --- Helper & UI Components (defined outside App to prevent re-renders) ---

const BotIcon = () => (
  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-14.304 0c-1.978-.292-3.348-2.024-3.348-3.97v-6.02c0-1.946 1.37-3.678 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z" clipRule="evenodd" />
    </svg>
  </div>
);

const UserIcon = () => (
  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
  </div>
);

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';
  const parts = message.text.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`flex items-start gap-3 my-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && <BotIcon />}
      <div className={`max-w-md lg:max-w-2xl p-4 rounded-2xl ${isBot ? 'bg-gray-700 text-gray-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
        {parts.map((part, index) => {
          if (part.startsWith('```')) {
            const code = part.replace(/^```(?:\w+\n)?|```$/g, '').trim();
            return (
              <pre key={index} className="bg-gray-800 text-gray-200 p-3 rounded-lg my-2 overflow-x-auto text-sm">
                <code>{code}</code>
              </pre>
            );
          }
          return <p key={index} className="whitespace-pre-wrap">{part}</p>;
        })}
      </div>
       {!isBot && <UserIcon />}
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-3 my-4 justify-start">
    <BotIcon />
    <div className="max-w-md p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-tl-none flex items-center space-x-1">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
    </div>
  </div>
);


interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={scrollRef} />
      </div>
    </div>
  );
};

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <div className="bg-gray-800 p-4 border-t border-gray-700 sticky bottom-0">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Gemini anything..."
          className="flex-1 bg-gray-700 text-gray-200 rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

const Header: React.FC = () => (
    <div className="bg-gray-800/80 backdrop-blur-sm p-4 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
            <h1 className="text-xl font-bold text-white">Gemini AI Chatbot</h1>
        </div>
    </div>
);


// --- Main App Component ---

function App() {
  const [messages, setMessages] = useState<Message[]>([
      {
        id: 'init',
        text: 'Hello! I am Gemini. How can I assist you today?',
        sender: 'bot'
      }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: [],
      });
    } catch (error) {
        console.error("Failed to initialize Gemini AI:", error);
         setMessages(prev => [...prev, {
            id: 'error-init',
            text: 'Error: Could not initialize the AI model. Please check your API key configuration.',
            sender: 'bot'
        }]);
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !chatRef.current) return;

    const userMessage: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      const result = await chatRef.current.sendMessage({ message: text });
      const botResponse = result.text;
      const botMessage: Message = { id: (Date.now() + 1).toString(), text: botResponse, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, but I encountered an error. Please try again.",
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
        <Header />
        <ChatWindow messages={messages} isLoading={isLoading} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}

export default App;