import { useState, useEffect, ChangeEvent, useRef } from "react";
import {
  Trash2,
  UploadCloud,
  Loader2,
  AlertCircle,
  Type,
  X,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";

interface Document {
  id: string;
  filename: string;
  file_size_bytes: number;
  uploaded_at: string;
}

interface SidebarRightProps {
  userId: string;
  selectedDocs: string[];
  setSelectedDocs: React.Dispatch<React.SetStateAction<string[]>>;
}

const getFileStyle = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { bg: "bg-red-500", text: "PDF" };
  if (ext === "md") return { bg: "bg-blue-500", text: "MD" };
  if (ext === "txt") return { bg: "bg-gray-500", text: "TXT" };
  return { bg: "bg-gray-400", text: "DOC" };
};

export default function SidebarRight({
  userId,
  selectedDocs,
  setSelectedDocs,
}: SidebarRightProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [textContent, setTextContent] = useState("");

  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "completed" | "error"
  >("idle");
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFirstLoad = useRef(true);

  // Close 3-dots menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDocuments = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/documents?user_id=${userId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch documents");

      const data = await res.json();
      const docs = data.documents || [];
      setDocuments(docs);

      if (isFirstLoad.current) {
        setSelectedDocs(docs.map((d: Document) => d.id));
        isFirstLoad.current = false;
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  const toggleSelection = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id],
    );
  };

  const handleDelete = async (documentId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this file and its indexed data?",
      )
    )
      return;

    try {
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setOpenMenuId(null);
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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      setError("Please enter some text first.");
      return;
    }
    const blob = new Blob([textContent], { type: "text/plain" });
    const filename = `snippet-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    const file = new File([blob], filename, { type: "text/plain" });

    await processUpload(file);
    setTextContent("");
  };

  const processUpload = async (file: File) => {
    setError(null);
    setUploadStatus("uploading");
    setActiveFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    try {
      const res = await fetch("http://localhost:8000/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to upload document");

      if (data.document_id) {
        setSelectedDocs((prev) => [...prev, data.document_id]);
      }

      setUploadStatus("completed");
      fetchDocuments();

      setTimeout(() => {
        setUploadStatus("idle");
        setActiveFileName(null);
      }, 2500);
    } catch (err: any) {
      setUploadStatus("error");
      setError(err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUploadStatus("idle");
    setActiveFileName(null);
    setError(null);
    setTextContent("");
  };

  const openModal = (mode: "file" | "text") => {
    setUploadMode(mode);
    setIsModalOpen(true);
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[320px] border-l border-border/60 bg-secondary/40 h-full">
        {/* --- Header Section --- */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold text-blackcolor">Knowledge Base</h2>
          </div>

          {/* Buttons */}
          <div className="flex gap-1.5 p-1 bg-muted/5 rounded-xl border border-border/60 shadow-sm">
            <button
              onClick={() => openModal("file")}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all text-muted hover:text-blackcolor bg-background dark:bg-blackcolor/5 shadow-sm"
            >
              <UploadCloud size={16} /> Upload File
            </button>
            <button
              onClick={() => openModal("text")}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all text-muted hover:text-blackcolor bg-background dark:bg-blackcolor/5 shadow-sm"
            >
              <Type size={16} /> Paste Text
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <div className="px-2 pb-2 mt-2 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Your Files
            </h3>
            <span className="text-[10px] text-muted font-medium bg-blackcolor/5 px-1.5 rounded">
              {selectedDocs.length} / {documents.length}
            </span>
          </div>

          {isLoadingList ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-muted" size={20} />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-sm text-muted">No files uploaded yet.</p>
            </div>
          ) : (
            <ul className="space-y-0.5 pb-20" ref={menuRef}>
              {documents.map((doc) => {
                const style = getFileStyle(doc.filename);
                const isSelected = selectedDocs.includes(doc.id);

                return (
                  <li
                    key={doc.id}
                    onClick={() => toggleSelection(doc.id)}
                    className="group relative flex items-center justify-between p-2 rounded-xl hover:bg-blackcolor/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="relative w-6 h-5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${style.bg} text-white text-[9px] font-bold rounded transition-opacity duration-200 ${openMenuId === doc.id ? "opacity-0" : "group-hover:opacity-0"}`}
                        >
                          {style.text}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === doc.id ? null : doc.id,
                            );
                          }}
                          className={`absolute inset-0 flex items-center justify-center rounded text-muted hover:text-blackcolor transition-opacity duration-200 ${openMenuId === doc.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openMenuId === doc.id && (
                          <div className="absolute left-0 top-full mt-1.5 w-32 bg-background border border-border/60 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(doc.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-error/10 text-error transition-colors"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <span
                        className="text-sm text-blackcolor truncate select-none"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                    </div>

                    <div className="shrink-0 pl-2 pr-1 pointer-events-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary/80"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden border border-border/60">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <div>
                <h3 className="font-semibold text-blackcolor">
                  {uploadMode === "file" ? "Upload Files" : "Paste Text"}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {uploadMode === "file"
                    ? "Upload documents for AI context"
                    : "Paste raw text for AI context"}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-muted hover:text-blackcolor hover:bg-secondary rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {uploadMode === "file" ? (
                <div className="border-2 border-dashed border-border/80 bg-secondary/50 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors">
                  <UploadCloud size={32} className="text-muted mb-3" />
                  <p className="text-sm font-medium text-blackcolor mb-1">
                    Choose a file or drag & drop it here.
                  </p>
                  <p className="text-xs text-muted mb-4">
                    PDF, TXT, and MD formats, up to 10 MB.
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    disabled={uploadStatus === "uploading"}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadStatus === "uploading"}
                    className="px-4 py-2 bg-background border border-border/60 hover:bg-secondary text-sm font-medium rounded-lg transition-colors text-blackcolor disabled:opacity-50 shadow-sm"
                  >
                    Browse File
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Your raw text goes here..."
                      className="w-full h-36 p-3 text-sm bg-secondary/40 border border-border/60 rounded-xl outline-none focus:border-border focus:ring-1 focus:ring-border resize-none placeholder:text-muted/70 text-blackcolor"
                      disabled={uploadStatus === "uploading"}
                    />
                    {textContent && uploadStatus !== "uploading" && (
                      <button
                        onClick={() => setTextContent("")}
                        className="absolute top-2 right-2 p-1 bg-background rounded-md text-muted hover:text-error border border-transparent hover:border-border/60 shadow-sm transition-all"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleTextUpload}
                    disabled={
                      !textContent.trim() || uploadStatus === "uploading"
                    }
                    className="w-full flex items-center justify-center gap-2 bg-primary text-whitecolor py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:bg-muted"
                  >
                    {uploadStatus === "uploading" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UploadCloud size={16} />
                    )}
                    {uploadStatus === "uploading"
                      ? "Ingesting Data..."
                      : "Process Text"}
                  </button>
                </div>
              )}

              {activeFileName && uploadStatus !== "idle" && (
                <div
                  className={`border rounded-xl p-3 flex items-center justify-between shadow-sm transition-colors ${uploadStatus === "error" ? "border-error/50 bg-error/5" : "border-border/60 bg-background"}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`${getFileStyle(activeFileName).bg} text-white text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0`}
                    >
                      {getFileStyle(activeFileName).text}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-blackcolor truncate">
                        {activeFileName}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        {uploadStatus === "uploading" && (
                          <span className="text-primary flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" />{" "}
                            Uploading & Indexing...
                          </span>
                        )}
                        {uploadStatus === "completed" && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Completed successfully
                          </span>
                        )}
                        {uploadStatus === "error" && (
                          <span className="text-error">Upload failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-error bg-error/10 border border-error/20 p-3 rounded-xl text-xs mt-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
