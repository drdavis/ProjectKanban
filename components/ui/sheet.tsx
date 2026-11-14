"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./button";

export function Sheet({title, children, close}: {title: string; children: React.ReactNode; close: () => void}) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay"/>
      <Dialog.Content className="sheet" aria-describedby={undefined}>
        <header>
          <Dialog.Title>{title}</Dialog.Title>
          <Button variant="ghost" aria-label="Close panel" onClick={close}><X size={18}/></Button>
        </header>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
