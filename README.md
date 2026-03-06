<div align="center">
  <h1>Hybrid Search RAG Chat</h1>
</div>

A full-stack AI chat application that lets you upload documents and ask questions about them. It uses **Hybrid Retrieval-Augmented Generation (RAG)** to find the most relevant information from your files before generating answers.

## 💻 Demo

![rag-demo](https://github.com/user-attachments/assets/a4b25358-db3d-4516-b0ab-82ecd5eda692)

## ✨ Key Features

* **Document Processing:** Upload PDF, TXT, or MD files, or paste raw text.
* **Hybrid Search:** Combines Vector Search (for meaning) and Keyword Search (for keyword matches) using Reciprocal Rank Fusion (RRF) for highly accurate document retrieval.
* **Source Tracking:** Automatically cites the exact files and similarity scores used to generate answers.

## 🛠️ Tech Stack

* **Frontend:** Next.js
* **Backend:** Python, FastAPI
* **Database:** PostgreSQL (with `pgvector` and HNSW indexing)
* **AI & Machine Learning:** Groq API (Llama 3.1 8B), custom recursive text chunker, and `nomic-embed-text` embedding models.


