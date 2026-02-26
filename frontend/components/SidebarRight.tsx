import { useState, useEffect, ChangeEvent } from "react";
import {
  Trash2,
  UploadCloud,
  FileText,
  Loader2,
  AlertCircle,
  Type,
  X,
} from "lucide-react";

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

  // NEW: Toggle state and text input
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [textContent, setTextContent] = useState("");

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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    // Reset input
    e.target.value = "";
  };

  // NEW: Handle plain text submission
  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      setError("Please enter some text first.");
      return;
    }

    // trick: Create a synthetic .txt file from the string
    const blob = new Blob([textContent], { type: "text/plain" });
    const filename = `snippet-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    const file = new File([blob], filename, { type: "text/plain" });

    await uploadFile(file);
    setTextContent(""); // Clear text area on success
  };

  // Shared upload logic
  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

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

      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      await fetch(
        `http://localhost:8000/api/documents/${documentId}?user_id=${userId}`,
        {
          method: "DELETE",
        },
      );
    } catch (err) {
      console.error("Delete error:", err);
      fetchDocuments();
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-80 border-l border-border bg-secondary h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-blackcolor">Knowledge Base</h2>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
        {/* Toggle Switch */}
        <div className="flex p-1 bg-inputboxbg rounded-lg border border-border">
          <button
            onClick={() => setUploadMode("file")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all
              ${uploadMode === "file" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-blackcolor"}`}
          >
            <UploadCloud size={14} />
            Upload File
          </button>
          <button
            onClick={() => setUploadMode("text")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all
              ${uploadMode === "text" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-blackcolor"}`}
          >
            <Type size={14} />
            Paste Text
          </button>
        </div>

        {/* Input Zone */}
        <div className="flex flex-col gap-2">
          {uploadMode === "file" ? (
            // --- FILE MODE ---
            <>
              <p className="text-sm text-muted">Upload PDFs, TXTs, or MDs.</p>
              <label
                className={`border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-inputboxbg group"}`}
              >
                {isUploading ? (
                  <Loader2
                    className="animate-spin text-primary mb-2"
                    size={28}
                  />
                ) : (
                  <UploadCloud
                    className="text-muted group-hover:text-primary mb-2 transition-colors"
                    size={28}
                  />
                )}
                <span className="text-primary font-medium mb-1">
                  {isUploading ? "Ingesting..." : "Select File"}
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
            </>
          ) : (
            // --- TEXT MODE ---
            <>
              <p className="text-sm text-muted">Paste raw text to analyze.</p>
              <div className="relative">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste your content here..."
                  className="w-full h-32 p-3 text-sm bg-inputboxbg border border-border rounded-lg outline-none focus:border-primary resize-none placeholder:text-muted"
                  disabled={isUploading}
                />
                {textContent && (
                  <button
                    onClick={() => setTextContent("")}
                    className="absolute top-2 right-2 text-muted hover:text-error"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={handleTextUpload}
                disabled={!textContent.trim() || isUploading}
                className="flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <UploadCloud size={16} />
                )}
                {isUploading ? "Ingesting..." : "Upload Text"}
              </button>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 text-error bg-error/10 p-3 rounded-md text-xs mt-1">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Document List */}
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
