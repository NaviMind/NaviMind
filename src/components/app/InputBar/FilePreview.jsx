import React, { useRef } from "react";

export default function FilePreview({ files, onRemove }) {
  const scrollRef = useRef(null);

  // Прокручиваем горизонтально при вращении колесика
  const handleWheel = (e) => {
    if (scrollRef.current) {
      // Только если прокрутка по оси X возможна
      if (scrollRef.current.scrollWidth > scrollRef.current.clientWidth) {
        e.preventDefault();
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  if (!files?.length) return null;
  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className="
        filepreview-hidden-scrollbar
        flex flex-nowrap gap-2 mt-2 px-5 overflow-x-auto
      "
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {files.map((file, idx) => {
        const isImage = file.type.startsWith("image/");
        const previewUrl = isImage ? URL.createObjectURL(file) : null;

        return (
          <div
            key={file.name + idx}
            className={`
              relative flex items-center justify-center
              w-[90px] h-[90px]
              sm:w-[75px] sm:h-[75px]
              xs:w-[60px] xs:h-[60px]
              min-w-[60px] min-h-[60px]
              bg-gray-200 dark:bg-gray-700
              rounded overflow-hidden
              flex-shrink-0
            `}
          >
            {isImage ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="object-cover w-full h-full"
                draggable={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-xs p-2 text-center select-none">
                <svg
                  className="w-6 h-6 mb-1 text-gray-700 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 12h6m-6 4h6M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="truncate">{file.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(file.name)}
              className="
                absolute top-1 right-1 z-10
                bg-black bg-opacity-50 text-white text-xs px-1 rounded
                hover:bg-opacity-80
                min-w-[20px] min-h-[20px]
                flex items-center justify-center
                transition
              "
              tabIndex={0}
              aria-label="Удалить файл"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
