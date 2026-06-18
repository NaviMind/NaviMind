"use client";

import { useState } from "react";
import { getViewerSrc, getFileUrl, DocViewerModal } from "./MessageAttachments";

// Source pills shown under an assistant answer: each pill is one attached file
// the model drew information from. Clicking opens the file in the shared viewer
// so the user can verify the answer against the original document.
export default function SourceFilePills({ files = [] }) {
  const [activeDoc, setActiveDoc] = useState(null);

  if (!files.length) return null;

  const open = (file) => {
    const src = getViewerSrc(file);
    if (!src) return;
    setActiveDoc({ src, url: getFileUrl(file), name: file.name });
  };

  return (
    <div className="pt-1">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-white/30 mb-1.5">
        Sources
      </p>

      <div className="flex flex-wrap gap-1.5">
        {files.map((file, idx) => (
          <button
            key={file.url || file.name + idx}
            type="button"
            onClick={() => open(file)}
            title={`Open ${file.name}`}
            className="
              group flex items-center gap-1.5 max-w-[240px]
              px-2.5 py-1.5 rounded-lg text-left
              border border-blue-200 dark:border-blue-500/30
              bg-blue-50/60 dark:bg-blue-500/10
              hover:border-blue-400 hover:bg-blue-100/70
              dark:hover:border-blue-500/50 dark:hover:bg-blue-500/20
              transition-colors duration-150 cursor-pointer
            "
          >
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] font-medium text-gray-700 dark:text-gray-200 truncate">
              {file.name}
            </span>
          </button>
        ))}
      </div>

      <DocViewerModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
    </div>
  );
}
