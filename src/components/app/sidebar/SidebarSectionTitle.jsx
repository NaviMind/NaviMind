export default function SidebarSectionTitle({ icon, text }) {
  return (
    <div
      className="
        px-[12px] py-2 mt-3
        text-gray-400 dark:text-gray-400
        text-[14px] font-medium tracking-wide
        cursor-default select-none
      "
    >
      {icon && <span className="mr-1">{icon}</span>}
      {text}
    </div>
  );
}
