import { User } from "lucide-react";

import { usePhotoProfil } from "@/hooks/usePhotoProfil";
import { cn } from "@/lib/utils";

/** Vignette ronde de la photo du formateur connecté. */
export function PhotoProfil({ className }: { className?: string }) {
  const url = usePhotoProfil();

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-muted",
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt="Votre photo de profil"
          className="h-full w-full object-cover"
        />
      ) : (
        <User className="h-1/2 w-1/2 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}
