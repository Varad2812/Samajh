"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cn } from "cn"

const Dialog = DialogPrimitive.Root

type ContentProps = DialogPrimitive.Popup.Props & {
  /** "center" modal or a "right" side sheet. */
  placement?: "center" | "right"
  closeLabel?: string
}

function DialogContent({ className, children, placement = "center", closeLabel = "Close", ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="print:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden border border-border bg-surface text-foreground shadow-2xl outline-none transition-all duration-200 ease-out",
          placement === "center"
            ? "top-1/2 left-1/2 max-h-[92dvh] w-[min(820px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            : "top-0 right-0 bottom-0 w-[min(520px,100vw)] border-y-0 border-r-0 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="print:hidden absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

export { Dialog, DialogContent, DialogTitle, DialogDescription }
