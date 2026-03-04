import { useState, useRef, useEffect } from "react";
import { FileText, Sparkles, Copy, Check, ChevronDown } from "lucide-react";
import ChatInputBox from "./ChatInputBox";
import SpaceBackground from "./SpaceBackground";

export interface Source {
  filename: string;
  content_preview: string;
  score?: number;
  similarity?: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface ChatAreaProps {
  userId: string;
  chatId: string | null;
  onChatCreated: (chatId: string) => void;
  selectedDocs: string[];
}

// Helper function to remove duplicate filenames
const getUniqueSources = (sources?: Source[]) => {
  if (!sources || sources.length === 0) return [];
  const unique = new Map<string, Source>();
  sources.forEach((src) => {
    const existing = unique.get(src.filename);
    const currentScore = src.score || src.similarity || 0;
    const existingScore = existing
      ? existing.score || existing.similarity || 0
      : -1;
    if (!existing || currentScore > existingScore) {
      unique.set(src.filename, src);
    }
  });
  return Array.from(unique.values());
};

export default function ChatArea({
  userId,
  chatId,
  onChatCreated,
  selectedDocs,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStreamingRef = useRef(false);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    if (isStreamingRef.current) return;

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

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    isStreamingRef.current = true;

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
          conversation_id: chatId,
          top_k: 5,
          document_ids: selectedDocs,
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

              if (payload.type === "meta") {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <main className="flex-1 flex flex-col bg-background relative h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
          <SpaceBackground />
          <h1 className="z-10 text-2xl md:text-3xl font-medium text-whiteColor mb-8 text-center tracking-tight shadow-black drop-shadow-lg">
            Ask anything about your documents.
          </h1>
          <div className="z-10 w-full">
            <ChatInputBox
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              handleSubmit={handleSubmit}
              handleKeyDown={handleKeyDown}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 space-y-8">
            <div className="max-w-3xl mx-auto space-y-8">
              {messages.map((msg, idx) => {
                const uniqueSources = getUniqueSources(msg.sources);

                return (
                  <div key={idx} className="flex flex-col group relative">
                    {msg.role === "user" ? (
                      <div className="flex justify-end w-full group">
                        <div className="flex items-center gap-3 max-w-[85%] md:max-w-[75%]">
                          <button
                            onClick={() => handleCopy(msg.content, idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 px-2 py-1 text-xs text-muted hover:text-blackcolor hover:bg-secondary rounded-md"
                            title="Copy message"
                          >
                            {copiedIndex === idx ? (
                              <div className="flex items-center gap-1">
                                <Check size={14} /> Copied!
                              </div>
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>

                          <div className="bg-secondary/60 dark:bg-tertiary/10 text-blackcolor px-5 py-3 rounded-2xl shadow-sm whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 mb-4 relative">
                        <div className="shrink-0 mt-1">
                          <div className="w-6 h-6 flex items-center justify-center text-primary">
                            <Sparkles
                              size={20}
                              fill="currentColor"
                              className="opacity-80"
                            />
                          </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-hidden min-w-0 pb-6">
                          <p className="leading-relaxed whitespace-pre-wrap text-blackcolor mt-0.5">
                            {msg.content}
                          </p>

                          {uniqueSources.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/50">
                              <p className="text-xs font-semibold text-muted mb-3 flex items-center gap-2">
                                <ChevronDown size={14} /> Sources
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {uniqueSources.map((source, i) => {
                                  const hasSimilarity =
                                    source.similarity && source.similarity > 0;
                                  const displayScore = hasSimilarity
                                    ? `${Math.round((source.similarity as number) * 100)}%`
                                    : `${source.score?.toFixed(3)}`;

                                  return (
                                    <div
                                      key={i}
                                      className="flex items-center gap-2 bg-secondary/50 border border-border/60 px-3 py-1.5 rounded-md text-xs text-blackcolor hover:bg-secondary transition-colors cursor-help"
                                      title={source.content_preview}
                                    >
                                      <FileText
                                        size={12}
                                        className="text-muted"
                                      />
                                      <span className="truncate max-w-[150px] font-medium">
                                        {source.filename}
                                      </span>
                                      <span className="text-muted ml-1">
                                        {displayScore}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="absolute bottom-0 left-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(msg.content, idx)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted hover:text-blackcolor hover:bg-secondary rounded-md transition-colors"
                            >
                              {copiedIndex === idx ? (
                                <div className="flex items-center gap-1">
                                  <Check size={14} /> Copied!
                                </div>
                              ) : (
                                <>
                                  <Copy size={14} /> Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="relative w-full shrink-0">
            <div className="absolute bottom-full left-0 w-full h-24 bg-linear-to-t from-background to-transparent pointer-events-none z-10"></div>

            <div className="relative p-4 bg-background z-20">
              <ChatInputBox
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                handleSubmit={handleSubmit}
                handleKeyDown={handleKeyDown}
              />
              <p className="text-center text-[10px] text-muted mt-3">
                Consider verifying important information.
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
