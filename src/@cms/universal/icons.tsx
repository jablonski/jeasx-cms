/** Shared icon set, drawn with one recipe: 16px grid, 1.5px stroke, currentColor.
    Icons are authored at display size (no downscaling), so all share the same
    stroke weight on every platform. Decorative only — buttons keep labels/titles. */

/** Wrapper for stroke icons; pass the shapes as children. */
export function Icon({ children }: { children: JSX.Element }) {
  const shared = {
    viewBox: "0 0 16 16",
    width: "1em",
    height: "1em",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.5",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    style: "vertical-align: -0.125em",
    "aria-hidden": "true",
  } as const;
  return <svg {...shared}>{children}</svg>;
}

export function ChevronUpIcon() {
  return (
    <Icon>
      <path d="M3.5 10 8 5.5 12.5 10" />
    </Icon>
  );
}

export function ChevronDownIcon() {
  return (
    <Icon>
      <path d="M3.5 6 8 10.5 12.5 6" />
    </Icon>
  );
}

/** Close / remove */
export function XIcon() {
  return (
    <Icon>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  );
}

/** Add / insert */
export function PlusIcon() {
  return (
    <Icon>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

/** Settings (sliders: reads as settings at small sizes, unlike a sun-like cog) */
export function SlidersIcon() {
  return (
    <Icon>
      <path d="M1.75 4.75h4.5M9.25 4.75h5M1.75 11.25h6.5M11.25 11.25h3" />
      <circle cx="7.75" cy="4.75" r="1.6" />
      <circle cx="9.75" cy="11.25" r="1.6" />
    </Icon>
  );
}

/** Revert to an earlier version */
export function RevertIcon() {
  return (
    <Icon>
      <path d="M3 8a5 5 0 1 1 1.5 3.5" />
      <path d="M3 4.5V8h3.5" />
    </Icon>
  );
}

export function PencilIcon() {
  return (
    <Icon>
      <path d="M9.5 3.5 12.5 6.5M3 13l.8-3.8 7-7a1.3 1.3 0 0 1 1.9 0l1.1 1.1a1.3 1.3 0 0 1 0 1.9l-7 7L3 13z" />
    </Icon>
  );
}

export function CopyIcon() {
  return (
    <Icon>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M3 10.5h-.25a.75.75 0 0 1-.75-.75v-7A.75.75 0 0 1 2.75 2h7a.75.75 0 0 1 .75.75V3" />
    </Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon>
      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.75 7v3.5M9.25 7v3.5" />
    </Icon>
  );
}

/** Bold text */
export function BoldIcon() {
  return (
    <Icon>
      <path d="M4.5 2.75h4.25a2.6 2.6 0 0 1 0 5.2H4.5zM4.5 7.95h5a2.65 2.65 0 0 1 0 5.3h-5z" />
    </Icon>
  );
}

/** Italic text */
export function ItalicIcon() {
  return (
    <Icon>
      <path d="M6.5 2.75h6M3.5 13.25h6M9.75 2.75l-3.5 10.5" />
    </Icon>
  );
}

/** Link */
export function LinkIcon() {
  return (
    <Icon>
      <path d="M6.75 9.25a3 3 0 0 0 4.25 0l2-2a3 3 0 0 0-4.25-4.25l-.75.75" />
      <path d="M9.25 6.75a3 3 0 0 0-4.25 0l-2 2a3 3 0 0 0 4.25 4.25l.75-.75" />
    </Icon>
  );
}

/** Bulleted list */
export function ListIcon() {
  return (
    <Icon>
      <path d="M6 4h7.5M6 8h7.5M6 12h7.5M2.75 4h.01M2.75 8h.01M2.75 12h.01" />
    </Icon>
  );
}

/** Drag grip: filled dots, so they read as dots rather than outlined circles */
export function GripIcon() {
  const dots: JSX.Element[] = [];
  for (const x of [6, 10]) {
    for (const y of [4, 8, 12]) {
      dots.push(<circle cx={x} cy={y} r="1.4" />);
    }
  }
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="currentColor"
      stroke="none"
      style="vertical-align: -0.125em"
      aria-hidden="true"
    >
      {dots}
    </svg>
  );
}

/** A document with lines of text (a page of the site). */
export function PageIcon() {
  return (
    <Icon>
      <path d="M3.25 1.75h6.25l3.25 3.25v9.25h-9.5z" />
      <path d="M9.25 1.75V5.25h3.5M5.75 8.25h4.5M5.75 11h4.5" />
    </Icon>
  );
}

/** A folder (the file library). */
export function FolderIcon() {
  return (
    <Icon>
      <path d="M1.75 3.25h4.5l1.5 1.75h6.5v7.75H1.75z" />
    </Icon>
  );
}

/** A broken link (remove a link): the link icon with its middle taken out. */
export function UnlinkIcon() {
  return (
    <Icon>
      <path d="M10 9.5 13 6.5a3 3 0 0 0-4.25-4.25l-1 1" />
      <path d="M6 6.5 3 9.5a3 3 0 0 0 4.25 4.25l1-1" />
      <path d="M11 12v1.5M12 11h1.5M5 4V2.5M4 5H2.5" />
    </Icon>
  );
}
