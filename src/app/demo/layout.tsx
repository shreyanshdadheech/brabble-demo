import type React from "react"
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen overflow-x-hidden">{children}</div>
}

