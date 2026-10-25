import {
  CalendarClock,
  Eye,
  MessageSquare,
  PartyPopper,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

// Icon and label for each kind of job email Gmail sync recognizes. Shared by
// the Today log and the application's History tab.
export const KIND_ICON: Record<string, React.ElementType> = {
  applied: Send,
  viewed: Eye,
  message: MessageSquare,
  screening: Sparkles,
  interview: CalendarClock,
  offer: PartyPopper,
  rejection: XCircle,
};

export const KIND_LABEL: Record<string, string> = {
  applied: "Application submitted",
  viewed: "Employer viewed your application",
  message: "Message from the employer",
  screening: "Assessment / screening",
  interview: "Interview invite",
  offer: "Offer",
  rejection: "Not moving forward",
};
