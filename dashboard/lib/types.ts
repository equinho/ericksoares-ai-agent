export type ConversationStatus = "active" | "scheduled" | "closed"

export type Conversation = {
  id: string
  phone: string
  created_at: string
  updated_at: string
  status: ConversationStatus
  lead_name: string | null
  notes: string | null
  messages?: { count: number }[]
}

export type Message = {
  id: string
  conversation_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
  zapi_message_id: string | null
}

export type PromptVersion = {
  id: string
  content: string
  created_at: string
}

export type KnowledgeFile = {
  id: string
  name: string
  content: string
  file_size: number
  created_at: string
}

export type QuickReply = {
  id: string
  title: string
  content: string
  created_at: string
}

export type AnalyticsStats = {
  totalConversations: number
  activeConversations: number
  closedConversations: number
  msgsToday: number
  msgsYesterday: number
  chartData: { date: string; label: string; count: number }[]
}
