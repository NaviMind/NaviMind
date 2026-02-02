import { useRef, useEffect } from "react";

export default function TopicModal({
  open,
  topicName,
  setTopicName,
  onCreate,
  onClose,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topicName.trim()) {
      onCreate();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2"
      onClick={handleBackdropClick}
    >
      <form
        className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-md flex flex-col items-stretch"
        onSubmit={handleSubmit}
        autoComplete="off"
        onKeyDown={e => { if (e.key === "Escape") onClose(); }}
      >
        <h2 className="text-lg font-bold tracking-wide text-center text-gray-900 dark:text-white mb-4">
          Create Topic
        </h2>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type topic name…"
          value={topicName}
          onChange={(e) => setTopicName(e.target.value)}
          className="w-full px-3 py-2 mb-1 rounded-lg border text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition"
          autoFocus
        />
        {/* Подсказка-пояснение */}
        <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-3 text-center px-1 leading-tight select-none">
         Create a topic to organize your chats by theme. <br />
         For example: <i>“PSC Preparation”</i>, <i>“IMPA Requests”</i>, or <i>“Flag Circulars”</i>.
         </div>
        <button
          type="submit"
          disabled={!topicName.trim()}
          className={`
            w-full px-4 py-2 rounded-xl font-semibold text-base
            transition
            ${topicName.trim()
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow"
              : "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"}
          `}
        >
          Create
        </button>
      </form>
    </div>
  );
}
