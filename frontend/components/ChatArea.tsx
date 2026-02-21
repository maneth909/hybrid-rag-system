import { Send } from "lucide-react";

export default function ChatArea() {
  return (
    <main className="flex-1 flex flex-col bg-background relative">
      <header className="p-4 border-b border-border flex items-center justify-between md:hidden">
        <h2 className="font-semibold">Chat</h2>
      </header>

      {/* Chat History View */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-2">How can I help you today?</h1>
        <p className="text-muted">
          Upload a document to the knowledge base to get started.
        </p>
      </div>

      {/* Input Box */}
      <div className="p-4">
        <div className="flex items-center bg-inputboxbg border border-border rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-primary transition-shadow">
          <input
            type="text"
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-transparent outline-none border-none text-blackcolor placeholder-muted"
          />
          <button className="ml-3 text-primary hover:text-opacity-80 transition-colors flex items-center justify-center p-1">
            <Send size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}
