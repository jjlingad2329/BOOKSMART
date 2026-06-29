import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, Paperclip } from "lucide-react";

export default function Chat() {
  const [message, setMessage] = useState("");

  const contacts = [
    { id: 1, name: "Sarah Jenkins, CPA", message: "Your 1099s look good.", time: "10:42 AM", unread: 2, active: true },
    { id: 2, name: "Michael Chen", message: "Let's schedule a call.", time: "Yesterday", unread: 0, active: false },
    { id: 3, name: "BookSmart Support", message: "Your issue has been resolved.", time: "Mon", unread: 0, active: false },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col border-border/50 hidden md:flex">
        <div className="p-4 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-9 h-9 bg-secondary/20" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <div key={contact.id} className={`p-4 border-b border-border/20 cursor-pointer hover:bg-secondary/10 transition-colors ${contact.active ? 'bg-secondary/20' : ''}`}>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-semibold truncate">{contact.name}</h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{contact.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate">{contact.message}</p>
                    {contact.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-border/50">
        <div className="p-4 border-b border-border/30 flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">S</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Sarah Jenkins, CPA</h3>
            <p className="text-xs text-muted-foreground">Typically replies in a few hours</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground bg-secondary/20 px-3 py-1 rounded-full">Today</span>
          </div>
          
          <div className="flex gap-3 max-w-[80%]">
            <Avatar className="h-8 w-8 mt-auto">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">S</AvatarFallback>
            </Avatar>
            <div className="bg-secondary/20 p-3 rounded-2xl rounded-bl-sm">
              <p className="text-sm">Hi there! I've reviewed your recent uploads. Your 1099s look good, but we're missing the W-2 from your part-time role.</p>
              <span className="text-[10px] text-muted-foreground mt-1 block">10:40 AM</span>
            </div>
          </div>

          <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
            <Avatar className="h-8 w-8 mt-auto">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">U</AvatarFallback>
            </Avatar>
            <div className="bg-primary/90 text-primary-foreground p-3 rounded-2xl rounded-br-sm">
              <p className="text-sm">Thanks Sarah. I'll get that uploaded right now. Do you need the physical copy or is the PDF fine?</p>
              <span className="text-[10px] text-primary-foreground/70 mt-1 block text-right">10:45 AM</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border/30 bg-card">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input 
              placeholder="Type a message..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 bg-secondary/20 border-transparent focus-visible:ring-1"
              onKeyDown={(e) => e.key === 'Enter' && setMessage('')}
            />
            <Button size="icon" className="shrink-0" onClick={() => setMessage('')}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}