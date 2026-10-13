import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Camera, MapPin, Loader2, Sparkles, CheckCircle, AlertTriangle } from "lucide-react"

import { supabase, CATEGORIES, isSupabaseConfigured } from "@/lib/supabase"
import { classifyProblem } from "@/lib/ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

type Step = "form" | "classifying" | "review" | "submitting" | "done" | "error"

export default function ReportPage() {
  const navigate = useNavigate()
  const fileRef = React.useRef<HTMLInputElement>(null)

  const [step, setStep] = React.useState<Step>("form")
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = React.useState(false)
  const [locationError, setLocationError] = React.useState("")
  const [aiResult, setAiResult] = React.useState<{ category: string; summary: string; severity: string } | null>(null)
  const [error, setError] = React.useState("")

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function getLocation() {
    setLocationLoading(true)
    setLocationError("")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLoading(false)
      },
      () => {
        setLocationError("Unable to get location. Please allow location access.")
        setLocationLoading(false)
      },
      { timeout: 8000 }
    )
  }

  async function handleClassify() {
    if (!description.trim()) return
    setStep("classifying")
    try {
      const imageBase64 = imagePreview ?? undefined
      const result = await classifyProblem(description, imageBase64)
      setAiResult(result)
      if (!category) setCategory(result.category)
      setStep("review")
    } catch {
      setError("AI classification failed. You can still submit manually.")
      setStep("review")
    }
  }

  async function handleSubmit() {
    if (!location) {
      setError("Location is required to submit a report.")
      return
    }
    setStep("submitting")
    setError("")

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Reporting is in demo mode. Add the Supabase environment variables to submit reports.")
      }

      let imageUrl: string | null = null

      // Upload image if present (stub — would use Supabase Storage in production)
      if (imageFile) {
        // imageUrl = await uploadImage(imageFile)  // TODO: wire to Supabase Storage
        imageUrl = null
      }

      const { error: dbError } = await supabase.from("trash_reports").insert({
        title: title.trim() || (aiResult?.summary.slice(0, 60) ?? "Environmental Issue"),
        description: description.trim(),
        category: category || "other",
        ai_classification: aiResult?.summary ?? null,
        latitude: location.lat,
        longitude: location.lng,
        status: "open",
        image_url: imageUrl,
      })

      if (dbError) throw dbError
      setStep("done")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report.")
      setStep("error")
    }
  }

  const SEVERITY_COLORS: Record<string, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }

  if (step === "done") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="size-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Report Submitted!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you for helping keep your community clean. Your report is now visible on the map.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button onClick={() => navigate("/")} className="w-full">
            View on Map
          </Button>
          <Button variant="outline" onClick={() => { setStep("form"); setTitle(""); setDescription(""); setCategory(""); setImageFile(null); setImagePreview(null); setLocation(null); setAiResult(null) }} className="w-full">
            Submit Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-semibold text-foreground">Report a Problem</h1>
      </div>

      {/* Progress indicator */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={step === "form" ? "text-primary font-medium" : ""}>1. Describe</span>
          <span>→</span>
          <span className={step === "classifying" || step === "review" ? "text-primary font-medium" : ""}>2. AI Review</span>
          <span>→</span>
          <span className={step === "submitting" ? "text-primary font-medium" : ""}>3. Submit</span>
        </div>
        <Progress
          value={step === "form" ? 20 : step === "classifying" ? 55 : step === "review" ? 70 : step === "submitting" ? 90 : 100}
          className="mt-2 h-1"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Description (always shown) */}
        <div className="space-y-2">
          <Label htmlFor="description">Describe the Problem *</Label>
          <Textarea
            id="description"
            placeholder="e.g. Large pile of trash dumped next to the park fence..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={step === "classifying" || step === "submitting"}
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Image upload */}
        <div className="space-y-2">
          <Label>Photo (optional)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleImageChange}
          />
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-lg border">
              <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 text-xs"
                onClick={() => { setImageFile(null); setImagePreview(null) }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Camera className="size-7" />
              <span className="text-sm">Take or upload a photo</span>
            </button>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label>Location *</Label>
          {location ? (
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
              <MapPin className="size-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm text-foreground">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
              <Button variant="ghost" size="sm" className="ml-auto text-xs h-6" onClick={getLocation}>
                Update
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={getLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Getting location…</>
              ) : (
                <><MapPin className="size-4" /> Use my location</>
              )}
            </Button>
          )}
          {locationError && <p className="text-xs text-destructive">{locationError}</p>}
        </div>

        {/* AI Classification result */}
        {step === "classifying" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Sparkles className="size-5 text-primary animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">AI is analyzing your report…</p>
                <p className="text-xs text-muted-foreground">This takes a few seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {aiResult && step === "review" && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground">AI Analysis</span>
                <span className={`ml-auto rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[aiResult.severity]}`}>
                  {aiResult.severity} severity
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{aiResult.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Category selection (shown after AI or manually) */}
        {(step === "review" || step === "form") && (
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    category === cat.value
                      ? "border-transparent text-white shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-input"
                  }`}
                  style={category === cat.value ? { backgroundColor: cat.color } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title (shown after AI review) */}
        {step === "review" && (
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder={aiResult?.summary.slice(0, 50) ?? "Brief title for this report"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t bg-background p-4 space-y-2">
        {step === "form" && (
          <Button
            className="w-full"
            disabled={!description.trim()}
            onClick={handleClassify}
          >
            <Sparkles className="size-4" />
            Analyze with AI
          </Button>
        )}
        {(step === "review" || step === "submitting") && (
          <Button
            className="w-full"
            disabled={!location || step === "submitting"}
            onClick={handleSubmit}
          >
            {step === "submitting" ? (
              <><Loader2 className="size-4 animate-spin" /> Submitting…</>
            ) : (
              "Submit Report"
            )}
          </Button>
        )}
        {step === "error" && (
          <Button className="w-full" onClick={() => setStep("review")}>
            Try Again
          </Button>
        )}
        {step === "form" && (
          <p className="text-center text-xs text-muted-foreground">
            AI will classify your report automatically
          </p>
        )}
      </div>
    </div>
  )
}
