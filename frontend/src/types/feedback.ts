// types/feedback.ts — public website feedback (backend/feedback.py)

export const VISITOR_TYPES = [
  "farmer",
  "development_agent",
  "government",
  "research",
  "development_partner",
  "input_supplier",
  "agribusiness",
  "investor",
  "media",
  "student",
  "other",
] as const;
export const LIKED = ["disease_detection", "ai_advisory", "local_languages", "input_trust", "market_prices", "other"] as const;
export const INTERESTS = ["partnership", "pilot", "investment", "using_the_app", "media", "just_exploring"] as const;
export const FEEDBACK_STATUSES = ["new", "contacted", "closed"] as const;

export type VisitorType = (typeof VISITOR_TYPES)[number];
export type Liked = (typeof LIKED)[number];
export type Interest = (typeof INTERESTS)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** English labels: the public pages are English first (exhibition); the admin page uses the same words. */
export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  farmer: "Farmer",
  development_agent: "Development Agent",
  government: "Government",
  research: "Research / University",
  development_partner: "Development partner / NGO",
  input_supplier: "Input supplier",
  agribusiness: "Agribusiness / ABC",
  investor: "Investor",
  media: "Media",
  student: "Student",
  other: "Other",
};
export const LIKED_LABELS: Record<Liked, string> = {
  disease_detection: "Disease detection",
  ai_advisory: "AI advisory",
  local_languages: "Local languages",
  input_trust: "Input Trust",
  market_prices: "Market prices",
  other: "Other",
};
export const INTEREST_LABELS: Record<Interest, string> = {
  partnership: "Partnership",
  pilot: "Pilot",
  investment: "Investment",
  using_the_app: "Using the app",
  media: "Media / interview",
  just_exploring: "Just exploring",
};

export interface FeedbackForm {
  name: string;
  organisation: string;
  visitor_type: VisitorType | "";
  email: string;
  phone: string;
  rating: number | null;
  liked: Liked[];
  comments: string;
  interests: Interest[];
  may_contact: boolean;
  consent: boolean;
  source: string | null;
  /** Honeypot: hidden from people, left empty. */
  website: string;
}

export type FeedbackResult =
  | { ok: true }
  | { ok: false; status: number; message: string; fields: Record<string, string> };

export interface FeedbackItem {
  id: number;
  name: string;
  organisation: string | null;
  visitor_type: VisitorType;
  email: string | null;
  phone: string | null;
  rating: number;
  liked: Liked[];
  comments: string | null;
  interests: Interest[];
  may_contact: boolean;
  source: string | null;
  user_agent: string | null;
  status: FeedbackStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface FeedbackFilters {
  visitor_type?: string;
  interest?: string;
  min_rating?: number;
  source?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface FeedbackSummary {
  count: number;
  average_rating: number | null;
  ratings: Record<string, number>;
  liked: Record<string, number>;
  interests: Record<string, number>;
  visitor_types: Record<string, number>;
  sources: Record<string, number>;
  page_views: { path: string; source: string; views: number }[];
}

/** A partner on the public website ("We have worked with"); backend/website.py. */
export interface WebsitePartner {
  id: number;
  name: string;
  /** Path under the API base (/site/partners/{id}/logo?v=…), or null: the name is shown instead. */
  logo_url: string | null;
  /** Admin list only. */
  active?: boolean;
}
