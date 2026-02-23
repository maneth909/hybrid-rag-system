import { useState, useEffect, ChangeEvent } from "react";
import {
  Trash2,
  UploadCloud,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Define the shape of the data coming back from our FastAPI GET route
interface Document {
  id: string;
  filename: string;
  file_size_bytes: number;
  uploaded_at: string;
}

export default function SidebarRight({ userId }: { userId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch existing documents when the component loads
  const fetchDocuments = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/documents?user_id=${userId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data.documents);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  // 2. Handle the file upload process
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    // Package the file exactly how FastAPI expects it
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    try {
      const res = await fetch("http://localhost:8000/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to upload document");
      }

      // Refresh the document list to show the newly uploaded file
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      // Reset the input value so the same file can be selected again if needed
      e.target.value = "";
    }
  };

  // 3. Handle document deletion
  const handleDelete = async (documentId: string) => {
    try {
      // Optimistically remove the item from the UI
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));

      const res = await fetch(
        `http://localhost:8000/api/documents/${documentId}?user_id=${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to delete document");
      }
    } catch (err) {
      console.error("Delete error:", err);
      // If deletion fails, re-fetch documents to restore UI state
      fetchDocuments();
    }
  };

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

          <label
            className={`border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-inputboxbg group"}`}
          >
            {isUploading ? (
              <Loader2 className="animate-spin text-primary mb-2" size={28} />
            ) : (
              <UploadCloud
                className="text-muted group-hover:text-primary mb-2 transition-colors"
                size={28}
              />
            )}
            <span className="text-primary font-medium mb-1">
              {isUploading ? "Ingesting Data..." : "Select File"}
            </span>
            <span className="text-xs text-muted">Max file size: 10MB</span>

            <input
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>

          {/* Error Message Display */}
          {error && (
            <div className="flex items-start gap-2 text-error bg-error/10 p-3 rounded-md text-xs mt-1">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Uploaded Documents List */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Ingested Files</h3>
          {documents.length === 0 ? (
            <p className="text-xs text-muted italic">No files uploaded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-blackcolor">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex justify-between items-center p-3 bg-background rounded-md border border-border shadow-sm group"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText size={16} className="text-primary shrink-0" />
                    <span className="truncate" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-muted hover:text-error transition-colors shrink-0 p-1"
                    title="Delete File"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
