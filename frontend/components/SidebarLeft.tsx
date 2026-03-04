import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  MoreVertical,
  Check,
  X,
  Search,
  MessageSquarePlus,
  Moon,
  Sun,
  SquarePen,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface SidebarLeftProps {
  userId: string;
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function SidebarLeft({
  userId,
  currentChatId,
  onSelectChat,
  onNewChat,
  isDarkMode,
  toggleDarkMode,
}: SidebarLeftProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/conversations?user_id=${userId}`,
      );
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [userId, currentChatId]);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      await fetch(
        `http://localhost:8000/api/conversations/${chatId}?user_id=${userId}`,
        { method: "DELETE" },
      );
      setConversations((prev) => prev.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) onNewChat();
      setOpenMenuId(null);
    } catch (err) {
      alert("Failed to delete chat");
    }
  };

  const startEditing = (e: React.MouseEvent, chat: Conversation) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title || "New Conversation");
    setOpenMenuId(null);
  };

  const saveTitle = async (
    e: React.MouseEvent | React.FormEvent,
    chatId: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await fetch(`http://localhost:8000/api/conversations/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: editTitle } : c)),
      );
      setEditingId(null);
    } catch (err) {
      alert("Failed to rename chat");
    }
  };

  const toggleMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === chatId ? null : chatId);
  };

  const filteredConversations = conversations.filter((chat) =>
    (chat.title || "New Conversation")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <aside className="hidden md:flex flex-col w-[300px] border-r border-border/60 bg-secondary/40 h-full">
      <div className="p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-blackcolor">Chats</h2>
          <button
            onClick={onNewChat}
            className="p-1.5 text-muted hover:text-blackcolor hover:bg-background border border-transparent hover:border-border/60 rounded-lg transition-all shadow-sm hover:shadow-md"
            title="New Chat"
          >
            <SquarePen size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center bg-background border border-border/60 rounded-xl px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-border transition-all">
          <Search size={16} className="text-muted mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none text-blackcolor placeholder:text-muted/70"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3" ref={menuRef}>
        <div className="px-2 pb-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Recent
          </h3>
        </div>

        {/* Chats listing */}
        {isLoading && conversations.length === 0 ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-muted" size={20} />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center p-4">
            <p className="text-sm text-muted">No chats found.</p>
          </div>
        ) : (
          <ul className="space-y-1 pb-20">
            {filteredConversations.map((chat) => (
              <li key={chat.id} className="relative group">
                {editingId === chat.id ? (
                  <form
                    onSubmit={(e) => saveTitle(e, chat.id)}
                    className="flex items-center gap-1 p-2 bg-background border border-primary/70 rounded-xl shadow-sm z-10 relative"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none text-blackcolor min-w-0 px-1"
                      onClick={(e) => e.stopPropagation()}
                    />

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-muted hover:text-error p-1"
                    >
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => onSelectChat(chat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all text-left pr-8
                        ${
                          currentChatId === chat.id
                            ? "bg-blackcolor/5 text-blackcolor font-medium border-border/40"
                            : "text-muted group-hover:bg-blackcolor/5 group-hover:text-blackcolor border border-transparent"
                        }`}
                    >
                      <span className="truncate">
                        {chat.title || "New Conversation"}
                      </span>
                    </button>

                    <button
                      onClick={(e) => toggleMenu(e, chat.id)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-blackcolor transition-all 
                        ${openMenuId === chat.id ? "opacity-100 bg-background border-border/60 shadow-sm" : "opacity-0 group-hover:opacity-100"}
                      `}
                    >
                      <MoreVertical size={14} />
                    </button>

                    {openMenuId === chat.id && (
                      <div className="absolute right-0 top-full mt-1 w-28 bg-background border border-border/60 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                        <button
                          onClick={(e) => startEditing(e, chat)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-secondary text-blackcolor transition-colors"
                        >
                          <Pencil size={14} className="text-muted" /> Rename
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, chat.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-error/10 text-error transition-colors"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer with User Status and Dark Mode Toggle */}
      <div className="p-4 border-t border-border/60 mt-auto flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-blackcolor font-medium px-1">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          {userId}
        </div>

        {/* Dark Mode Button */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-muted hover:text-blackcolor hover:bg-background border border-transparent hover:border-border/60 rounded-lg transition-all shadow-sm"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </aside>
  );
}
