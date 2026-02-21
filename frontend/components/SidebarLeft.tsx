import { MessageSquare } from "lucide-react";

export default function SidebarLeft() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-secondary">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-blackcolor">Conversations</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <p className="text-sm text-muted flex items-center gap-2">
          <MessageSquare size={16} />
          No recent conversations.
        </p>
      </div>
    </aside>
  );
}
