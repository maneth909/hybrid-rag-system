import { useState, useRef, useEffect } from "react";
import { Send, Loader2, FileText, Bot, User } from "lucide-react";

interface Source {
  filename: string;
  content_preview: string;
  similarity: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

// 1. UPDATE: New props to handle conversation state
interface ChatAreaProps {
  userId: string;
  chatId: string | null;
  onChatCreated: (chatId: string) => void;
}

export default function ChatArea({
  userId,
  chatId,
  onChatCreated,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 2. NEW: Fetch chat history when the selected chatId changes
  useEffect(() => {
    if (!chatId) {
      setMessages([]); // Reset for "New Chat" screen
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/conversations/${chatId}`,
        );
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", sources: [] },
    ]);

    try {
      const res = await fetch("http://localhost:8000/api/query/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage,
          user_id: userId,
          conversation_id: chatId, // 3. UPDATE: Send the current chat ID (or null)
          top_k: 5,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));

              // 4. NEW: Handle the "meta" event for new conversations
              if (payload.type === "meta") {
                // If this was a new chat, the backend just sent us the new ID.
                // Notify the parent so it can highlight the correct sidebar item.
                onChatCreated(payload.conversation_id);
                continue;
              }

              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsgIndex = newMessages.length - 1;
                const lastMessage = { ...newMessages[lastMsgIndex] };

                if (payload.type === "sources") {
                  lastMessage.sources = payload.data;
                } else if (payload.type === "token") {
                  lastMessage.content += payload.data;
                } else if (payload.type === "error") {
                  lastMessage.content += `\n[Error: ${payload.data}]`;
                }

                newMessages[lastMsgIndex] = lastMessage;
                return newMessages;
              });
            } catch (e) {
              console.error("Error parsing stream JSON:", e);
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMsgIndex = newMessages.length - 1;
        const lastMessage = { ...newMessages[lastMsgIndex] };
        lastMessage.content +=
          "\nSorry, something went wrong. Please check if the backend is running.";
        newMessages[lastMsgIndex] = lastMessage;
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-background relative h-full">
      <header className="p-4 border-b border-border flex items-center justify-between md:hidden">
        <h2 className="font-semibold">Chat</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <Bot size={48} className="mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">
              How can I help you today?
            </h1>
            <p className="text-sm">
              Upload a document to the right and ask me anything about it.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${msg.role === "assistant" ? "bg-secondary/30 p-4 rounded-lg" : "pl-4"}`}
            >
              <div className="shrink-0 mt-1">
                {msg.role === "assistant" ? (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Bot size={18} />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-muted/20 rounded-full flex items-center justify-center text-blackcolor">
                    <User size={18} />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-hidden">
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>

                {/* Citations Section */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">
                      Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 bg-background border border-border px-2.5 py-1.5 rounded text-xs text-muted hover:text-primary transition-colors cursor-help"
                          title={`Similarity Score: ${source.similarity}`}
                        >
                          <FileText size={12} />
                          <span className="truncate max-w-[150px] font-medium">
                            {source.filename}
                          </span>

                          {/* Visible Score Bubble */}
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              source.similarity > 0.8
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {Math.round(source.similarity * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background">
        <form
          onSubmit={handleSubmit}
          className="flex items-center bg-inputboxbg border border-border rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-primary transition-shadow"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-transparent outline-none border-none text-blackcolor placeholder-muted"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="ml-3 text-primary hover:text-opacity-80 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
