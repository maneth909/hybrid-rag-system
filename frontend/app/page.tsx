"use client";

import { useState, useEffect } from "react";
import SidebarLeft from "../components/SidebarLeft";
import ChatArea from "../components/ChatArea";
import SidebarRight from "../components/SidebarRight";

export default function ChatbotUI() {
  const [userId] = useState("admin");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // track selected documents globally
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-blackcolor font-sans overflow-hidden">
      <SidebarLeft
        userId={userId}
        currentChatId={currentChatId}
        onSelectChat={(id) => setCurrentChatId(id)}
        onNewChat={() => setCurrentChatId(null)}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <ChatArea
        userId={userId}
        chatId={currentChatId}
        onChatCreated={(newId) => setCurrentChatId(newId)}
        selectedDocs={selectedDocs}
      />

      <SidebarRight
        userId={userId}
        selectedDocs={selectedDocs}
        setSelectedDocs={setSelectedDocs}
      />
    </div>
  );
}
