"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CircleHelpIcon } from "@/components/ui/icons/circle-help";

export function AlertTest() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Alert Test
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        icon={CircleHelpIcon}
        title="Modeli silmek istiyor musun?"
        description="Bu işlem geri alınamaz. Model kalıcı olarak silinecek."
        destructive
        confirmLabel="Evet, Sil"
        onConfirm={() => {
          toast.success("Silindi (demo)");
          setOpen(false);
        }}
      />
    </>
  );
}
