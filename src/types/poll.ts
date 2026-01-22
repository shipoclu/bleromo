export interface PollEmoji {
  shortcode: string;
  url: string;
  static_url?: string;
  visible_in_picker?: boolean;
}

export interface PollOption {
  title: string;
  votes_count: number;
  title_map?: Record<string, string> | null;
}

export interface Poll {
  id: string;
  expires_at: string | null;
  expired: boolean;
  multiple: boolean;
  options: PollOption[];
  voters_count: number;
  votes_count: number;
  own_votes?: number[] | null;
  voted: boolean;
  emojis?: PollEmoji[];
  non_anonymous?: boolean;
}
