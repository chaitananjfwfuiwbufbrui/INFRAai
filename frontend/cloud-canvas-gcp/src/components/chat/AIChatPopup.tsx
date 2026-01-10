import { useState, useEffect, useRef } from 'react';
import { X, Send, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useArchitectureStore } from '@/store/architectureStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChatPopup = ({ isOpen, onClose }: AIChatPopupProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you design your cloud architecture. What would you like to build?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { loadArchitecture } = useArchitectureStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    const prompt = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/generate-graph?prompt=${encodeURIComponent(prompt)}`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate architecture');
      }

      const data = await response.json();
      
      // Load the graph into the canvas
      if (data.graph?.nodes && data.graph?.edges) {
        loadArchitecture(data.graph.nodes, data.graph.edges);
      }

      // Add AI response with summary
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.summary || 'Architecture generated successfully!'
      };
      setMessages(prev => [...prev, aiResponse]);
      speakText(aiResponse.content);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error generating the architecture. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-foreground font-medium">AI Assistant</span>
          {isSpeaking && <Volume2 className="w-4 h-4 text-primary animate-pulse" />}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-secondary w-8 h-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'max-w-[85%] p-3 rounded-lg text-sm',
              message.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            {message.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleListening}
            className={cn(
              'w-10 h-10 rounded-full shrink-0',
              isListening
                ? 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your architecture..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="w-10 h-10 rounded-full shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Ctrl+L to toggle • Click mic to speak
        </p>
      </div>
    </div>
  );
};

export default AIChatPopup;
