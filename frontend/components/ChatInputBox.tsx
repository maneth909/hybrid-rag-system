import { Sparkles, Loader2, ArrowUp } from "lucide-react";

interface ChatInputBoxProps {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  handleSubmit: (e?: React.FormEvent | React.KeyboardEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function ChatInputBox({
  input,
  setInput,
  isLoading,
  handleSubmit,
  handleKeyDown,
}: ChatInputBoxProps) {
  return (
    <div className="relative w-full max-w-3xl mx-auto px-4">
      <div className="absolute -inset-0.5 bg-linear-to-r from-primary/10 via-purple-400/10 to-blue-400/10 rounded-2xl blur-lg opacity-60"></div>

      <div className="relative bg-background dark:bg-chatinputboxbg border border-border/60 rounded-2xl flex flex-col shadow-sm focus-within:shadow-md focus-within:border-border transition-all duration-300">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything related to your documents"
          className="w-full resize-none outline-none px-4 pt-4 pb-2 min-h-[100px] text-sm text-blackcolor bg-transparent placeholder:text-muted/70"
          disabled={isLoading}
        />

        <div className="flex justify-between items-center px-3 pb-3">
          <div className="flex gap-2 items-center">
            <div className="text-xs flex items-center gap-1.5 border border-border/60 bg-background/80 px-3 py-1.5 rounded-lg text-muted shadow-sm font-medium cursor-default">
              <Sparkles size={14} /> Llama 3.1 8B
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center ${
              input.trim() && !isLoading
                ? "bg-primary text-whitecolor shadow-md hover:opacity-90 scale-100"
                : "bg-secondary dark:bg-background/80 text-muted cursor-not-allowed scale-95"
            }`}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowUp size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
