import os
import faiss
import numpy as np
import pickle
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from app.core.config import settings

class FAISSVectorStoreService:
    def __init__(self):
        self.index_file = os.path.join(settings.FAISS_INDEX_DIR, "faiss.index")
        self.meta_file = os.path.join(settings.FAISS_INDEX_DIR, "faiss_meta.pkl")
        self.vectorizer = TfidfVectorizer(max_features=512, stop_words="english")
        self.documents_metadata: List[Dict[str, Any]] = []
        self.index = None
        self.is_fitted = False
        self._load_if_exists()

    def _load_if_exists(self):
        if os.path.exists(self.index_file) and os.path.exists(self.meta_file):
            try:
                self.index = faiss.read_index(self.index_file)
                with open(self.meta_file, "rb") as f:
                    data = pickle.load(f)
                    self.documents_metadata = data.get("metadata", [])
                    self.vectorizer = data.get("vectorizer", self.vectorizer)
                    self.is_fitted = data.get("is_fitted", False)
            except Exception as e:
                print(f"Error loading FAISS index: {e}")
                self._reset_index()
        else:
            self._reset_index()

    def _reset_index(self):
        self.index = faiss.IndexFlatL2(512)
        self.documents_metadata = []
        self.is_fitted = False

    def add_chunks(
        self,
        chunks: List[str],
        doc_id: int,
        filename: str,
        sub_criterion: str,
        page_numbers: Optional[List[int]] = None,
        metric_ids: Optional[List[str]] = None
    ):
        if not chunks:
            return

        new_entries = []
        for i, chunk in enumerate(chunks):
            page_num = page_numbers[i] if page_numbers and i < len(page_numbers) else (i + 1)
            metric_id = metric_ids[i] if metric_ids and i < len(metric_ids) else f"{sub_criterion}.1"
            
            new_entries.append({
                "chunk_id": f"{doc_id}_{i}",
                "doc_id": doc_id,
                "filename": filename,
                "sub_criterion": sub_criterion,
                "page_number": page_num,
                "metric_id": metric_id,
                "text": chunk
            })

        self.documents_metadata.extend(new_entries)
        self._rebuild_index()

    def _rebuild_index(self):
        if not self.documents_metadata:
            return

        texts = [doc["text"] for doc in self.documents_metadata]
        embeddings = self.vectorizer.fit_transform(texts).toarray().astype('float32')
        self.is_fitted = True

        # Ensure dimension matches 512
        dim = embeddings.shape[1]
        if dim < 512:
            padding = np.zeros((embeddings.shape[0], 512 - dim), dtype='float32')
            embeddings = np.hstack([embeddings, padding])
        elif dim > 512:
            embeddings = embeddings[:, :512]

        self.index = faiss.IndexFlatL2(512)
        self.index.add(embeddings)
        self._save()

    def _save(self):
        try:
            if self.index:
                faiss.write_index(self.index, self.index_file)
            with open(self.meta_file, "wb") as f:
                pickle.dump({
                    "metadata": self.documents_metadata,
                    "vectorizer": self.vectorizer,
                    "is_fitted": self.is_fitted
                }, f)
        except Exception as e:
            print(f"Error saving FAISS index: {e}")

    def search(self, query: str, sub_criterion: str = "All", top_k: int = 4) -> List[Dict[str, Any]]:
        if not self.documents_metadata or not self.is_fitted:
            return []

        query_vec = self.vectorizer.transform([query]).toarray().astype('float32')
        dim = query_vec.shape[1]
        if dim < 512:
            padding = np.zeros((1, 512 - dim), dtype='float32')
            query_vec = np.hstack([query_vec, padding])
        elif dim > 512:
            query_vec = query_vec[:, :512]

        k = min(top_k * 3, len(self.documents_metadata))
        distances, indices = self.index.search(query_vec, k)

        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.documents_metadata):
                item = self.documents_metadata[idx]
                if sub_criterion == "All" or item["sub_criterion"] == sub_criterion or item["sub_criterion"] == "General":
                    results.append(item)
                    if len(results) >= top_k:
                        break
        return results

    def clear(self):
        self._reset_index()
        if os.path.exists(self.index_file):
            os.remove(self.index_file)
        if os.path.exists(self.meta_file):
            os.remove(self.meta_file)

vector_store_service = FAISSVectorStoreService()
