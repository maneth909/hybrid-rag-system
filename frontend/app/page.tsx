"use client";

import { useState } from "react";
import SidebarLeft from "../components/SidebarLeft";
import ChatArea from "../components/ChatArea";
import SidebarRight from "../components/SidebarRight";

export default function ChatbotUI() {
  const [userId] = useState("admin");

  return (
    <div className="flex h-screen w-full bg-background text-blackcolor font-sans overflow-hidden">
      <SidebarLeft />
      <ChatArea />
      <SidebarRight userId={userId} />
    </div>
  );
}
