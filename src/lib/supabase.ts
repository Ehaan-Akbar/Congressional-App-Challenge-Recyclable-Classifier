import { createClient } from "@supabase/supabase-js"

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(configuredUrl && configuredAnonKey)

// Keep previews usable when deployment secrets have not been configured.
// The Supabase client validates its URL eagerly, which previously crashed the
// app before React could render its first frame.
const supabaseUrl = configuredUrl || "https://demo.supabase.co"
const supabaseAnonKey = configuredAnonKey || "demo-anon-key"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TrashReport = {
  id: string
  title: string
  description: string
  category: string
  ai_classification: string | null
  latitude: number
  longitude: number
  address: string | null
  status: "open" | "in_progress" | "resolved"
  image_url: string | null
  created_at: string
}

export const CATEGORIES = [
  { value: "illegal_dumping", label: "Illegal Dumping", color: "#ef4444" },
  { value: "litter", label: "Litter", color: "#f97316" },
  { value: "pollution", label: "Pollution", color: "#8b5cf6" },
  { value: "hazardous_waste", label: "Hazardous Waste", color: "#dc2626" },
  { value: "graffiti", label: "Graffiti", color: "#3b82f6" },
  { value: "other", label: "Other", color: "#6b7280" },
] as const

export function getCategoryColor(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.color ?? "#6b7280"
}

export function getCategoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? "Other"
}
