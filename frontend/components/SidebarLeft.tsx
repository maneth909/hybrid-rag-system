import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  MoreVertical,
  Check,
  X,
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
}

export default function SidebarLeft({
  userId,
  currentChatId,
  onSelectChat,
  onNewChat,
}: SidebarLeftProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for renaming
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // State for the active dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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

  // --- ACTIONS ---

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      await fetch(
        `http://localhost:8000/api/conversations/${chatId}?user_id=${userId}`,
        {
          method: "DELETE",
        },
      );
      setConversations((prev) => prev.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) onNewChat();
      setOpenMenuId(null); // Close menu
    } catch (err) {
      alert("Failed to delete chat");
    }
  };

  const startEditing = (e: React.MouseEvent, chat: Conversation) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title || "New Conversation");
    setOpenMenuId(null); // Close menu
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
    // If clicking the same one, close it. Otherwise open the new one.
    setOpenMenuId(openMenuId === chatId ? null : chatId);
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-secondary h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 bg-background border border-border hover:bg-inputboxbg hover:border-primary transition-all rounded-md px-4 py-2 text-sm font-medium text-blackcolor shadow-sm group"
        >
          <Plus
            size={16}
            className="text-muted group-hover:text-primary transition-colors"
          />
          New Chat
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2" ref={menuRef}>
        {isLoading && conversations.length === 0 ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-muted" size={20} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center p-4">
            <p className="text-sm text-muted">No conversations yet.</p>
          </div>
        ) : (
          <ul className="space-y-1 pb-20">
            {" "}
            {/* Padding bottom for dropdown space */}
            {conversations.map((chat) => (
              <li key={chat.id} className="relative group">
                {editingId === chat.id ? (
                  // --- EDIT MODE ---
                  <form
                    onSubmit={(e) => saveTitle(e, chat.id)}
                    className="flex items-center gap-1 p-2 bg-background border border-primary rounded-md shadow-sm z-10 relative"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none text-blackcolor min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="submit"
                      className="text-green-600 hover:text-green-700 p-1"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  // --- VIEW MODE ---
                  <div className="relative">
                    <button
                      onClick={() => onSelectChat(chat.id)}
                      className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded-md transition-colors text-left pr-8
                        ${
                          currentChatId === chat.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted hover:bg-background hover:text-blackcolor"
                        }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare size={16} className="shrink-0" />
                        <span className="truncate">
                          {chat.title || "New Conversation"}
                        </span>
                      </div>
                    </button>

                    {/* Three Dots Trigger */}
                    <button
                      onClick={(e) => toggleMenu(e, chat.id)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-blackcolor hover:bg-gray-200 transition-all
                        ${openMenuId === chat.id ? "opacity-100 bg-gray-200" : "opacity-0 group-hover:opacity-100"}
                      `}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === chat.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden">
                        <button
                          onClick={(e) => startEditing(e, chat)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-secondary text-blackcolor transition-colors"
                        >
                          <Pencil size={14} />
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, chat.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-red-50 text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete
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

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Online as {userId}
        </div>
      </div>
    </aside>
  );
}
