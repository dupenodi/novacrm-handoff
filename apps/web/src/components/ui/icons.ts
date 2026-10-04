/**
 * The app's icon vocabulary. Each concept has exactly one icon; import from here, not lucide-react,
 * so the same thing always looks the same.
 */
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  ExternalLink,
  FolderKanban,
  Hash,
  Inbox,
  Info,
  LayoutGrid,
  LoaderCircle,
  Mail,
  MailCheck,
  Menu,
  MessageSquareText,
  Phone,
  Quote,
  RefreshCw,
  Reply,
  RotateCw,
  SearchX,
  Settings,
  TriangleAlert,
  X,
} from "lucide-react";

// —— Things in the domain ————————————————————————————————————————————————
/** The CS inbox and the watcher that reads it. */
export const InboxIcon = Inbox;
/** An email. */
export const EmailIcon = Mail;
/** An email recognised as a deal handoff. */
export const HandoffIcon = MailCheck;
/** A reply on a deal's thread. */
export const ReplyIcon = Reply;
/** A phone call to the AE. */
export const CallIcon = Phone;
/** A Rocketlane onboarding project. */
export const ProjectIcon = FolderKanban;
/** A Slack channel. */
export const ChannelIcon = Hash;
/** Something an AE said. */
export const QuoteIcon = Quote;

// —— Actions —————————————————————————————————————————————————————————————
/** Check the inbox for new mail now. */
export const CheckInboxIcon = RefreshCw;
/** Run a stopped deal again. */
export const RetryIcon = RotateCw;
/** A link that leaves the app. */
export const ExternalIcon = ExternalLink;
export const CloseIcon = X;
export const MenuIcon = Menu;

// —— Status ——————————————————————————————————————————————————————————————
/** A step or milestone that's done. */
export const DoneIcon = Check;
/** A run that finished, or a success message. */
export const SuccessIcon = CircleCheck;
/** Waiting on a person, or a result someone should look at. */
export const AttentionIcon = TriangleAlert;
/** Something broke. */
export const ErrorIcon = CircleAlert;
/** A step that failed. */
export const FailedIcon = X;
export const InfoIcon = Info;
export const LoadingIcon = LoaderCircle;
export const NotFoundIcon = SearchX;

// —— Navigation ——————————————————————————————————————————————————————————
export const OverviewIcon = LayoutGrid;
export const SettingsIcon = Settings;
export const ExpandIcon = ChevronDown;
export const ForwardIcon = ChevronRight;
export const NextStageIcon = ArrowRight;

/** Each agent's icon, used for its avatar and anywhere else the agent is named. */
export const AGENT_ICON = {
  intake: ClipboardCheck,
  comms: MessageSquareText,
} as const;
