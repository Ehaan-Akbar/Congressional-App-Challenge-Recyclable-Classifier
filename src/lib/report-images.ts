import { isSupabaseConfigured, supabase } from "./supabase"

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function validateReportImage(file: File) {
  if (!IMAGE_EXTENSIONS[file.type]) {
    throw new Error("Please choose a JPEG, PNG, or WebP photo.")
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Please choose a photo smaller than 5 MB.")
  }
}

export async function uploadReportImage(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("Photo uploads are currently unavailable.")
  }
  validateReportImage(file)
  const path = `reports/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`
  const { error } = await supabase.storage.from("report-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(`Photo upload failed: ${error.message}`)
  return supabase.storage.from("report-images").getPublicUrl(path).data.publicUrl
}
