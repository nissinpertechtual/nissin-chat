export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

// Alias for compatibility
export type Profile = User;

export interface TypingUser {
  user_id: string;
  display_name: string;
}

export interface ConversationMember {
  user_id: string;
  conversation_id: string;
  role: 'admin' | 'member';
  is_muted?: boolean;
  joined_at: string;
}

export interface Conversation {
  id: string;
  name?: string;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  announcement?: string;
  members?: ConversationMember[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'poll';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: string;
  reply_to?: Message;
  is_pinned?: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
}

export interface Keep {
  id: string;
  user_id: string;
  message_id: string;
  created_at: string;
  message?: Message;
}

export interface Mention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
}

export interface Poll {
  id: string;
  message_id: string;
  question: string;
  options: string[];
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface GroupNote {
  id: string;
  conversation_id: string;
  content: string;
  updated_by: string;
  updated_at: string;
}

export interface ConversationInvite {
  id: string;
  conversation_id: string;
  token: string;
  created_by: string;
  expires_at?: string;
  created_at: string;
}

export interface ScheduledMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  scheduled_at: string;
  sent: boolean;
  created_at: string;
}
