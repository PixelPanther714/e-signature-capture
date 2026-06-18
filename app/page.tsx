import { SignaturePad } from "@/components/signature-pad"

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-12">
      <header className="flex max-w-xl flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">E-Signature Capture</h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Capture a legally-styled signature by drawing on the pad or typing your name. The signature is exported as a
          PNG and posted to the server.
        </p>
      </header>
      <SignaturePad />
    </main>
  )
}
