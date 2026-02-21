import { Trash2, UploadCloud, FileText } from "lucide-react";

export default function SidebarRight() {
  return (
    <aside className="hidden lg:flex flex-col w-80 border-l border-border bg-secondary">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-blackcolor">Knowledge Base</h2>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
        {/* Upload Zone */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            Upload PDFs, TXTs, or MDs to add context to the AI.
          </p>
          <label className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-inputboxbg transition-all group">
            <UploadCloud
              className="text-muted group-hover:text-primary mb-2 transition-colors"
              size={28}
            />
            <span className="text-primary font-medium mb-1">Select File</span>
            <span className="text-xs text-muted">Max file size: 10MB</span>
            <input type="file" className="hidden" accept=".pdf,.txt,.md" />
          </label>
          <button className="w-full bg-primary text-whitecolor rounded-lg py-2 mt-2 font-medium hover:opacity-90 transition-opacity">
            Upload Document
          </button>
        </div>

        {/* Uploaded Documents List */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Ingested Files</h3>
          <ul className="space-y-2 text-sm text-blackcolor">
            <li className="flex justify-between items-center p-3 bg-background rounded-md border border-border shadow-sm group">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={16} className="text-primary shrink-0" />
                <span className="truncate">example_report.pdf</span>
              </div>
              <button className="text-muted hover:text-error transition-colors shrink-0 p-1">
                <Trash2 size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
