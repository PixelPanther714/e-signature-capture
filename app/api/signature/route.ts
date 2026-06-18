import { NextResponse } from "next/server"

type SignatureBody = {
  signer?: string
  mode?: "draw" | "type"
  image?: string
  typedText?: string
}

// Max accepted payload for the base64 PNG (~2MB of image data).
const MAX_IMAGE_LENGTH = 3_000_000

export async function POST(request: Request) {
  let body: SignatureBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const signer = body.signer?.trim()
  const mode = body.mode
  const image = body.image

  if (!signer) {
    return NextResponse.json({ error: "A signer name is required" }, { status: 400 })
  }
  if (mode !== "draw" && mode !== "type") {
    return NextResponse.json({ error: "Mode must be 'draw' or 'type'" }, { status: 400 })
  }
  if (!image || !image.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "A valid PNG signature image is required" }, { status: 400 })
  }
  if (image.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ error: "Signature image is too large" }, { status: 413 })
  }

  // In a real app this is where you would persist the signature
  // (e.g. upload the PNG to storage and store metadata in a database).
  const id = crypto.randomUUID()

  return NextResponse.json({
    id,
    signer,
    mode,
    typedText: body.typedText,
    receivedAt: new Date().toISOString(),
  })
}
