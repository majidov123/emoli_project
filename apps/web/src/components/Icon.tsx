import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "alert"
  | "arrowDown"
  | "arrowUp"
  | "bag"
  | "ban"
  | "bolt"
  | "box"
  | "check"
  | "checkCircle"
  | "chevronLeft"
  | "chevronRight"
  | "columns"
  | "draft"
  | "edit"
  | "eye"
  | "eyeOff"
  | "filter"
  | "grid"
  | "grip"
  | "image"
  | "info"
  | "plus"
  | "refresh"
  | "search"
  | "send"
  | "sliders"
  | "message"
  | "logout"
  | "truck"
  | "x";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, className = "icon", ...props }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/></>,
    arrowDown: <><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></>,
    arrowUp: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    bag: <><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></>,
    ban: <><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    checkCircle: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/></>,
    chevronLeft: <path d="m15 18-6-6 6-6"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    columns: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M15 5v14"/></>,
    draft: <><path d="M5 4h10l4 4v12H5V4Z"/><path d="M14 4v5h5"/><path d="M8 14h8M8 17h5"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/></>,
    eye: <><path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="2.5"/></>,
    eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 8 9 8a17 17 0 0 1-2.1 3.3"/><path d="M6.6 6.6C4.4 8.1 3 12 3 12s3.5 8 9 8a9 9 0 0 0 3.4-.7"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    grip: <><circle cx="9" cy="6" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r=".8" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r=".8" fill="currentColor" stroke="none"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m3 17 5-4 4 3 3-2 6 5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2L20 9M4 15l2.4 2a7 7 0 0 0 11.5-2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
    sliders: <><path d="M4 6h6M14 6h6M4 12h10M18 12h2M4 18h3M11 18h9"/><circle cx="12" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/><path d="M8 9h8M8 13h5"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></>,
    truck: <><path d="M3 6h11v11H3V6ZM14 10h4l3 3v4h-7v-7Z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    x: <path d="M6 6l12 12M18 6 6 18"/>
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
