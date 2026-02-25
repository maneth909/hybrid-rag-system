"use client";

import { useState } from "react";
import SidebarLeft from "../components/SidebarLeft";
import ChatArea from "../components/ChatArea";
import SidebarRight from "../components/SidebarRight";

export default function ChatbotUI() {
  const [userId] = useState("admin");

  // State to track the active conversation.
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-full bg-background text-blackcolor font-sans overflow-hidden">
      {/* LEFT: Navigation & History */}
      <SidebarLeft
        userId={userId}
        currentChatId={currentChatId}
        onSelectChat={(id) => setCurrentChatId(id)}
        onNewChat={() => setCurrentChatId(null)}
      />

      {/* MIDDLE: The Chat Interface */}
      <ChatArea
        userId={userId}
        chatId={currentChatId}
        onChatCreated={(newId) => setCurrentChatId(newId)}
      />

      {/* RIGHT: Document Management */}
      <SidebarRight userId={userId} />
    </div>
  );
}
