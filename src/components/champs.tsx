import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Champ({
  id,
  label,
  children,
  hint,
  erreur,
  obligatoire,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string | undefined;
  erreur?: string | undefined;
  obligatoire?: boolean | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold text-primary">
        {label}
        {obligatoire ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {erreur ? (
        <p className="text-xs font-medium text-destructive">{erreur}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ListeEditable({
  label,
  valeurs,
  onChange,
  placeholder,
}: {
  label: string;
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  placeholder?: string;
}) {
  const maj = (index: number, valeur: string) =>
    onChange(valeurs.map((v, i) => (i === index ? valeur : v)));
  const supprimer = (index: number) =>
    onChange(valeurs.filter((_, i) => i !== index));
  const ajouter = () => onChange([...valeurs, ""]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-primary">{label}</Label>
      <div className="space-y-2">
        {valeurs.map((valeur, index) => (
          <div key={index} className="flex items-start gap-2">
            <Textarea
              value={valeur}
              onChange={(e) => maj(index, e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => supprimer(index)}
              aria-label={`Supprimer la ligne ${index + 1}`}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={ajouter}
        className="border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une ligne
      </Button>
    </div>
  );
}
