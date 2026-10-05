/**
 * The non-map content the reference app shows: the visitor, nearby and
 * hi-rise listings on Search, tour history, onboarding copy, help items and
 * the AI concierge's canned answers. All of it is dummy data today.
 */

export interface Visitor {
  name: string;
  initials: string;
  email: string;
  phone: string;
}

export interface PropertyListing {
  id: number;
  name: string;
  address: string;
  current: boolean;
  /** Whether the app can tour it; a listing that cannot be toured only notifies. */
  tourable: boolean;
}

export interface Listing {
  name: string;
  address: string;
  meta: string;
}

export interface TourHistoryEntry {
  id: string;
  property: string;
  date: string;
  tags: string[];
}

export interface OnboardingSlide {
  id: string;
  title: string;
  body: string;
}

export interface HelpItem {
  id: string;
  question: string;
  answer: string;
}

export interface ConciergeAnswer {
  /** Lower-case words that trigger the answer. */
  keywords: string[];
  /** May contain `{stop}` for the current stop's name and `{property}`. */
  answer: string;
}
