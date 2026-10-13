import * as React from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import { useNavigate } from "react-router-dom"
import { MapPin, Plus, RefreshCw, Filter } from "lucide-react"
import "leaflet/dist/leaflet.css"

import { supabase, type TrashReport, getCategoryColor, getCategoryLabel, CATEGORIES, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

/** Recenter the map to user location */
function LocationRecenter({ coords }: { coords: [number, number] }) {
  const map = useMap()
  React.useEffect(() => {
    map.setView(coords, 13)
  }, [coords, map])
  return null
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive text-white",
  in_progress: "bg-yellow-500 text-white",
  resolved: "bg-green-600 text-white",
}

export default function MapPage() {
  const navigate = useNavigate()
  const [reports, setReports] = React.useState<TrashReport[]>([])
  const [loading, setLoading] = React.useState(true)
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null)
  const [activeFilters, setActiveFilters] = React.useState<Set<string>>(new Set())
  const [selectedReport, setSelectedReport] = React.useState<TrashReport | null>(null)

  // Default map center (NYC)
  const defaultCenter: [number, number] = [40.7128, -74.006]

  async function fetchReports() {
    setLoading(true)
    if (!isSupabaseConfigured) {
      setReports([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("trash_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
    if (!error && data) setReports(data as TrashReport[])
    setLoading(false)
  }

  React.useEffect(() => {
    fetchReports()
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => null,
      { timeout: 5000 }
    )
  }, [])

  const filteredReports = activeFilters.size === 0
    ? reports
    : reports.filter((r) => activeFilters.has(r.category))

  function toggleFilter(value: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const center = userLocation ?? defaultCenter

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          <span className="font-semibold text-foreground">Community Map</span>
          {!loading && (
            <Badge variant="secondary" className="text-xs">
              {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-8 relative">
                <Filter className="size-4" />
                {activeFilters.size > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {activeFilters.size}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORIES.map((cat) => (
                <DropdownMenuCheckboxItem
                  key={cat.value}
                  checked={activeFilters.has(cat.value)}
                  onCheckedChange={() => toggleFilter(cat.value)}
                >
                  <span
                    className="mr-2 inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.label}
                </DropdownMenuCheckboxItem>
              ))}
              {activeFilters.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={false}
                    onCheckedChange={() => setActiveFilters(new Set())}
                    className="text-muted-foreground"
                  >
                    Clear filters
                  </DropdownMenuCheckboxItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" className="size-8" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={13}
          className="h-full w-full"
          style={{ zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && <LocationRecenter coords={userLocation} />}

          {/* User location marker */}
          {userLocation && (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#3b82f6",
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>You are here</Popup>
            </CircleMarker>
          )}

          {/* Report markers */}
          {filteredReports.map((report) => (
            <CircleMarker
              key={report.id}
              center={[report.latitude, report.longitude]}
              radius={10}
              pathOptions={{
                color: getCategoryColor(report.category),
                fillColor: getCategoryColor(report.category),
                fillOpacity: 0.85,
                weight: 2,
              }}
              eventHandlers={{
                click: () => setSelectedReport(report),
              }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold text-sm">{report.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{getCategoryLabel(report.category)}</p>
                  {report.ai_classification && (
                    <p className="text-xs mt-1 text-gray-600 line-clamp-2">{report.ai_classification}</p>
                  )}
                  <span className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[report.status] ?? "bg-muted text-muted-foreground"}`}>
                    {report.status.replace("_", " ")}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Report detail card */}
        {selectedReport && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <Card className="shadow-lg border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-block size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getCategoryColor(selectedReport.category) }}
                      />
                      <span className="text-xs text-muted-foreground">{getCategoryLabel(selectedReport.category)}</span>
                      <Badge
                        variant={selectedReport.status === "resolved" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {selectedReport.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 font-semibold text-sm leading-tight">{selectedReport.title}</p>
                    {selectedReport.ai_classification && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{selectedReport.ai_classification}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(selectedReport.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => setSelectedReport(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* FAB */}
      <Button
        size="lg"
        className="absolute bottom-6 right-4 z-10 size-14 rounded-full shadow-lg"
        style={{ bottom: selectedReport ? "120px" : undefined }}
        onClick={() => navigate("/report")}
      >
        <Plus className="size-6" />
        <span className="sr-only">Report a problem</span>
      </Button>
    </div>
  )
}
