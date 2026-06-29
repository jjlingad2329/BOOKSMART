import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, User, Send, Sparkles, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AiChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm your BookSmart AI assistant. I can help you analyze your transactions, suggest tax deductions, or answer general accounting questions. How can I help you today?" }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      // Simulate API call to /api/openai-chat
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Based on your recent transactions, I've identified 3 potential new deductions for your home office. Would you like me to categorize them automatically?" 
        }]);
        setLoading(false);
      }, 1500);
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          AI Tax Assistant <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">Beta</Badge>
        </h1>
        <p className="text-muted-foreground">Instant answers to your financial questions based on your data.</p>
      </div>

      <Card className="flex-1 flex flex-col border-border/50 overflow-hidden shadow-lg shadow-primary/5">
        <div className="bg-secondary/10 p-3 border-b border-border/30 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          AI responses do not constitute professional financial advice. Always verify with your CPA.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
              }`}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-secondary/50 text-foreground rounded-tr-sm' 
                  : 'bg-card border border-border/50 shadow-sm rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm rounded-tl-sm flex items-center gap-2">
                <div className="h-2 w-2 bg-primary/50 rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-card border-t border-border/30">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Ask about your taxes, transactions, or deductions..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-background border-border/50 focus-visible:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button size="icon" className="shrink-0 group" onClick={handleSend} disabled={loading || !input.trim()}>
              <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}