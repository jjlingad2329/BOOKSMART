import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface Chat {
  id: number;
  sender_id: number;
  receiver_id: number;
  last_message: string;
  last_message_time: string;
  created_at: string;
}

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
}

function fullName(u: UserProfile) {
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return n || u.email;
}

function initials(u: UserProfile) {
  if (u.first_name) return u.first_name[0].toUpperCase();
  return u.email[0].toUpperCase();
}

function relativeTime(ts: string) {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: false });
  } catch {
    return "";
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Chat() {
  const { profile } = useAuth();
  const numericId = profile?.numericId as number | undefined;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  // Parse ?cpa_id= from URL
  const params = new URLSearchParams(window.location.search);
  const cpaNaturalId = params.get("cpa_id") ? Number(params.get("cpa_id")) : null;

  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [userMap, setUserMap] = useState<Record<number, UserProfile>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch all chats for this user ──────────────────────────────────────────
  const { data: chats = [], isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["chats", numericId],
    enabled: !!numericId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .or(`sender_id.eq.${numericId},receiver_id.eq.${numericId}`)
        .order("last_message_time", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Build user map for all other participants ──────────────────────────────
  useEffect(() => {
    if (!numericId || chats.length === 0) return;
    const otherIds = [
      ...new Set(
        chats.map((c) => (c.sender_id === numericId ? c.receiver_id : c.sender_id))
      ),
    ];
    supabase
      .from("users")
      .select("id,first_name,last_name,email,role")
      .in("id", otherIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<number, UserProfile> = {};
        for (const u of data) map[u.id] = u;
        setUserMap(map);
      });
  }, [chats, numericId]);

  // ── Handle ?cpa_id param: find or create a chat ───────────────────────────
  useEffect(() => {
    if (!cpaNaturalId || !numericId || chatsLoading) return;
    const existing = chats.find(
      (c) =>
        (c.sender_id === numericId && c.receiver_id === cpaNaturalId) ||
        (c.receiver_id === numericId && c.sender_id === cpaNaturalId)
    );
    if (existing) {
      setActiveChatId(existing.id);
    } else {
      // Create a new chat
      supabase
        .from("chats")
        .insert({
          sender_id: numericId,
          receiver_id: cpaNaturalId,
          last_message: "",
          last_message_time: new Date().toISOString(),
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            qc.invalidateQueries({ queryKey: ["chats", numericId] });
            setActiveChatId(data.id);
          }
        });
    }
    // Remove ?cpa_id from URL without navigation
    navigate("/user/chat", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpaNaturalId, numericId, chatsLoading]);

  // ── Load messages for active chat ─────────────────────────────────────────
  const loadMessages = useCallback(async (chatId: number) => {
    setMsgsLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    setMsgsLoading(false);
    if (!error) setMessages(data ?? []);

    // Mark unread messages as read
    if (numericId) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .eq("chat_id", chatId)
        .neq("sender_id", numericId)
        .eq("is_read", false)
        .then(() => qc.invalidateQueries({ queryKey: ["chats", numericId] }));
    }
  }, [numericId, qc]);

  useEffect(() => {
    if (!activeChatId) return;
    loadMessages(activeChatId);
  }, [activeChatId, loadMessages]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChatId) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${activeChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${activeChatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          qc.invalidateQueries({ queryKey: ["chats", numericId] });
          // Mark as read if it's from the other person
          if (numericId && newMsg.sender_id !== numericId) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId, numericId, qc]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!activeChatId || !numericId) throw new Error("No active chat");
      const { error: msgErr } = await supabase.from("messages").insert({
        chat_id: activeChatId,
        sender_id: numericId,
        content: text,
        type: "text",
        is_read: false,
      });
      if (msgErr) throw msgErr;
      // Update chat last_message
      await supabase
        .from("chats")
        .update({ last_message: text, last_message_time: new Date().toISOString() })
        .eq("id", activeChatId);
    },
    onSuccess: () => {
      setMessageText("");
      qc.invalidateQueries({ queryKey: ["chats", numericId] });
    },
  });

  const handleSend = () => {
    const text = messageText.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  // ── Computed values ───────────────────────────────────────────────────────
  const filteredChats = chats.filter((c) => {
    if (!search) return true;
    const otherId = c.sender_id === numericId ? c.receiver_id : c.sender_id;
    const u = userMap[otherId];
    if (!u) return false;
    return fullName(u).toLowerCase().includes(search.toLowerCase());
  });

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activePeer = activeChat
    ? userMap[activeChat.sender_id === numericId ? activeChat.receiver_id : activeChat.sender_id]
    : null;

  // Unread counts per chat
  const unreadCounts = chats.reduce<Record<number, number>>((acc, c) => {
    // We'll compute this from messages we have in the cache
    // as a simple proxy: if last_message exists and is_read could be tracked
    // For now, show 0 — real count comes from messages query
    acc[c.id] = 0;
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Sidebar ── */}
      <Card className="w-80 flex-shrink-0 flex flex-col border-border/50 hidden md:flex">
        <div className="p-4 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 h-9 bg-secondary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            filteredChats.map((chat) => {
              const otherId = chat.sender_id === numericId ? chat.receiver_id : chat.sender_id;
              const other = userMap[otherId];
              const isActive = chat.id === activeChatId;
              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`p-4 border-b border-border/20 cursor-pointer hover:bg-secondary/10 transition-colors ${isActive ? "bg-secondary/20" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {other ? initials(other) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="text-sm font-semibold truncate">
                          {other ? fullName(other) : `User #${otherId}`}
                        </h4>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {chat.last_message_time ? relativeTime(chat.last_message_time) : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {chat.last_message || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ── Main Chat Area ── */}
      <Card className="flex-1 flex flex-col border-border/50 min-w-0">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border/30 flex items-center gap-3 shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {activePeer ? initials(activePeer) : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold leading-tight">
                  {activePeer ? fullName(activePeer) : `User #${activeChat.receiver_id}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activePeer?.role === "cpa" ? "CPA" : activePeer?.role ?? ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
              {msgsLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                  No messages yet — say hello!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === numericId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-7 w-7 mt-auto shrink-0">
                        <AvatarFallback
                          className={`text-xs font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
                        >
                          {isMe
                            ? (profile?.email?.[0] ?? "U").toUpperCase()
                            : activePeer
                              ? initials(activePeer)
                              : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`p-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          isMe
                            ? "bg-primary/90 text-primary-foreground rounded-br-sm"
                            : "bg-secondary/20 rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                        <div
                          className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/30 bg-card shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-secondary/20 border-transparent focus-visible:ring-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sendMutation.isPending}
                />
                <Button
                  size="icon"
                  className="shrink-0"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
