"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eraser, Undo2, PenLine, Type, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Mode = "draw" | "type"
type Status = "idle" | "submitting" | "success" | "error"

const TYPED_FONTS = [
  { label: "Signature", value: '"Brush Script MT", "Segoe Script", cursive' },
  { label: "Formal", value: 'Georgia, "Times New Roman", serif' },
  { label: "Mono", value: '"Geist Mono", ui-monospace, monospace' },
]

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 220

export function SignaturePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const strokes = useRef<ImageData[]>([])

  const [mode, setMode] = useState<Mode>("draw")
  const [hasDrawing, setHasDrawing] = useState(false)
  const [signer, setSigner] = useState("")
  const [typed, setTyped] = useState("")
  const [font, setFont] = useState(TYPED_FONTS[0].value)
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState<string>("")

  // Set up the canvas with a high-DPI backing store and a solid white background.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const ratio = window.devicePixelRatio || 1
    canvas.width = CANVAS_WIDTH * ratio
    canvas.height = CANVAS_HEIGHT * ratio
    ctx.scale(ratio, ratio)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#111111"
    strokes.current = []
    setHasDrawing(false)
  }, [])

  useEffect(() => {
    setupCanvas()
  }, [setupCanvas])

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    canvas.setPointerCapture(e.pointerId)
    // Save state for undo before starting a new stroke.
    strokes.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    drawing.current = true
    lastPoint.current = getPoint(e)
  }

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx || !lastPoint.current) return
    const point = getPoint(e)
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPoint.current = point
    setHasDrawing(true)
  }

  const endDraw = () => {
    drawing.current = false
    lastPoint.current = null
  }

  const clearCanvas = () => setupCanvas()

  const undo = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const last = strokes.current.pop()
    if (last) {
      ctx.putImageData(last, 0, 0)
      setHasDrawing(strokes.current.length > 0)
    }
  }

  // Render the typed signature to an offscreen canvas to produce a PNG data URL.
  const buildTypedImage = () => {
    const canvas = document.createElement("canvas")
    const ratio = window.devicePixelRatio || 1
    canvas.width = CANVAS_WIDTH * ratio
    canvas.height = CANVAS_HEIGHT * ratio
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.scale(ratio, ratio)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = "#111111"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `64px ${font}`
    ctx.fillText(typed, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH - 40)
    return canvas.toDataURL("image/png")
  }

  const canSubmit =
    signer.trim().length > 0 && (mode === "draw" ? hasDrawing : typed.trim().length > 0) && status !== "submitting"

  const submit = async () => {
    setStatus("submitting")
    setMessage("")
    try {
      const dataUrl = mode === "draw" ? canvasRef.current?.toDataURL("image/png") : buildTypedImage()
      if (!dataUrl) throw new Error("Could not capture signature")

      const res = await fetch("/api/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer: signer.trim(),
          mode,
          image: dataUrl,
          typedText: mode === "type" ? typed.trim() : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Submission failed")

      setStatus("success")
      setMessage(`Signature saved (id: ${data.id}).`)
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const reset = () => {
    setStatus("idle")
    setMessage("")
    setTyped("")
    clearCanvas()
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Sign here</CardTitle>
        <CardDescription>Draw your signature or type it, then submit to confirm.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signer">Full name</Label>
          <Input
            id="signer"
            placeholder="Jane Doe"
            value={signer}
            onChange={(e) => setSigner(e.target.value)}
            autoComplete="name"
          />
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">
              <PenLine className="size-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type">
              <Type className="size-4" />
              Type
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-lg border bg-card">
              <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "auto", aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
                className="block touch-none"
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                aria-label="Signature drawing area"
                role="img"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={undo} disabled={strokes.current.length === 0}>
                <Undo2 className="size-4" />
                Undo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearCanvas} disabled={!hasDrawing}>
                <Eraser className="size-4" />
                Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="type" className="flex flex-col gap-3">
            <div
              className="flex h-[180px] items-center justify-center rounded-lg border bg-card px-4 text-center text-foreground"
              style={{ fontFamily: font, fontSize: "3rem", lineHeight: 1.1 }}
              aria-live="polite"
            >
              {typed || <span className="text-base text-muted-foreground italic">Preview</span>}
            </div>
            <Input placeholder="Type your name" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {TYPED_FONTS.map((f) => (
                <Button
                  key={f.value}
                  type="button"
                  variant={font === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFont(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {message && (
          <p
            className={cn(
              "text-sm",
              status === "success" ? "text-foreground" : status === "error" ? "text-destructive" : "text-muted-foreground",
            )}
            role="status"
          >
            {message}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-3">
        <Button type="button" variant="ghost" onClick={reset} disabled={status === "submitting"}>
          Reset
        </Button>
        <Button type="button" onClick={submit} disabled={!canSubmit}>
          {status === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Check className="size-4" />
              Submit signature
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
