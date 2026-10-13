import * as React from "react"
import { Camera, Loader2, Recycle, CheckCircle, XCircle, RefreshCw, Info } from "lucide-react"

import { checkRecyclability } from "@/lib/ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

type State = "idle" | "loading" | "result" | "error"

type RecyclabilityResult = {
  recyclable: boolean
  material: string
  instructions: string
  confidence: number
}

export default function RecyclePage() {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [state, setState] = React.useState<State>("idle")
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<RecyclabilityResult | null>(null)
  const [error, setError] = React.useState("")

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
      setResult(null)
      setState("idle")
    }
    reader.readAsDataURL(file)
  }

  async function handleCheck() {
    if (!imagePreview) return
    setState("loading")
    setError("")
    try {
      const res = await checkRecyclability(imagePreview)
      setResult(res)
      setState("result")
    } catch {
      setError("Unable to analyze image. Please try again.")
      setState("error")
    }
  }

  function reset() {
    setImagePreview(null)
    setResult(null)
    setState("idle")
    setError("")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
        <Recycle className="size-5 text-green-600 dark:text-green-400" />
        <h1 className="font-semibold text-foreground">Recycling Checker</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Intro */}
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <div className="flex gap-3">
            <Info className="size-5 text-green-700 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-300">
              Take or upload a photo of any trash item and our AI will tell you if it's recyclable.
            </p>
          </div>
        </div>

        {/* Image capture area */}
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleImageChange}
          />

          {imagePreview ? (
            <div className="relative overflow-hidden rounded-xl border border-border shadow-sm">
              <img src={imagePreview} alt="Item to check" className="h-64 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-3 right-3 text-xs"
                onClick={reset}
              >
                <RefreshCw className="size-3" />
                New photo
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/40 active:scale-[0.98]"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Camera className="size-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Take or upload a photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Photograph the item you want to check</p>
              </div>
            </button>
          )}
        </div>

        {/* Check button */}
        {imagePreview && state !== "result" && (
          <Button
            className="w-full"
            onClick={handleCheck}
            disabled={state === "loading"}
          >
            {state === "loading" ? (
              <><Loader2 className="size-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Recycle className="size-4" /> Check Recyclability</>
            )}
          </Button>
        )}

        {/* Loading state */}
        {state === "loading" && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 text-green-600 dark:text-green-400 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium">Analyzing item…</p>
                  <p className="text-xs text-muted-foreground">Checking recyclability</p>
                </div>
              </div>
              <Progress value={65} className="h-1" />
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {state === "error" && (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Result */}
        {state === "result" && result && (
          <div className="space-y-4">
            <Card className={`border-2 ${result.recyclable ? "border-green-400 dark:border-green-600" : "border-destructive/50"}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-center gap-4">
                  <div className={`flex size-14 items-center justify-center rounded-full ${result.recyclable ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                    {result.recyclable
                      ? <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
                      : <XCircle className="size-8 text-destructive" />
                    }
                  </div>
                  <p className={`text-xl font-bold ${result.recyclable ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                    {result.recyclable ? "Recyclable" : "Not Recyclable"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <RefreshCw className="size-4" />
                Check Another
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                <Camera className="size-4" />
                New Photo
              </Button>
            </div>
          </div>
        )}

        {/* Tips when idle with no image */}
        {state === "idle" && !imagePreview && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tips for best results</p>
            {[
              "Point camera directly at the item",
              "Ensure good lighting",
              "Capture the full item in frame",
              "Include any recycling symbols visible on the item",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5 size-5 rounded-full p-0 flex items-center justify-center text-[10px] shrink-0">
                  {i + 1}
                </Badge>
                <span className="text-sm text-muted-foreground">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
