// The app's information architecture in one place: five top-level areas, some
// of which group several pages behind section tabs. The nav and page headers
// both read from here so they can't drift apart.

export type SectionTab = { href: string; label: string };

export const APPLICATION_TABS: SectionTab[] = [
  { href: "/applications", label: "Board" },
  { href: "/applications/table", label: "Table" },
];

export const SCHEDULE_TABS: SectionTab[] = [
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
];

export const LIBRARY_TABS: SectionTab[] = [
  { href: "/documents", label: "Documents" },
  { href: "/prep", label: "Interview prep" },
  { href: "/contacts", label: "Contacts" },
];

export type NavArea = "today" | "applications" | "schedule" | "library" | "insights";

export const NAV_AREAS: { key: NavArea; href: string; label: string }[] = [
  { key: "today", href: "/", label: "Today" },
  { key: "applications", href: "/applications", label: "Applications" },
  { key: "schedule", href: "/calendar", label: "Schedule" },
  { key: "library", href: "/documents", label: "Library" },
  { key: "insights", href: "/analytics", label: "Insights" },
];

export function areaOf(pathname: string): NavArea | null {
  if (pathname === "/") return "today";
  if (pathname.startsWith("/applications")) return "applications";
  if (pathname.startsWith("/calendar") || pathname.startsWith("/tasks")) {
    return "schedule";
  }
  if (
    pathname.startsWith("/documents") ||
    pathname.startsWith("/prep") ||
    pathname.startsWith("/contacts")
  ) {
    return "library";
  }
  if (pathname.startsWith("/analytics")) return "insights";
  return null;
}
