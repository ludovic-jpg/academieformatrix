/** Appel unique et centralisé à l'API Claude (Anthropic) pour toutes les générations. */

export const MODELE_CLAUDE = "claude-sonnet-5";
const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";

export interface ResultatClaude {
  ok: boolean;
  status: number;
  body: string;
}

const DELAI_MAX_MS = 110_000;

async function appel(
  cle: string,
  systeme: string,
  message: string,
  maxTokens: number,
): Promise<ResultatClaude> {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX_MS);
  try {
    const res = await fetch(URL_ANTHROPIC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cle,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELE_CLAUDE,
        max_tokens: maxTokens,
        stream: true,
        system: systeme,
        messages: [{ role: "user", content: message }],
      }),
      signal: controleur.signal,
    });

    if (!res.ok || !res.body) {
      const brut = await res.text().catch(() => "");
      let texte = brut;
      try {
        const parsed = JSON.parse(brut) as {
          error?: { message?: string };
          message?: string;
        };
        texte = parsed.error?.message ?? parsed.message ?? brut;
      } catch {
        // message brut conservé
      }
      return { ok: false, status: res.status, body: texte };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let texte = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lignes = buffer.split("\n");
      buffer = lignes.pop() ?? "";
      for (const ligne of lignes) {
        const t = ligne.trim();
        if (!t.startsWith("data:")) continue;
        const donnees = t.slice(5).trim();
        if (!donnees || donnees === "[DONE]") continue;
        try {
          const evt = JSON.parse(donnees) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (evt.type === "content_block_delta" && evt.delta?.text) {
            texte += evt.delta.text;
          }
        } catch {
          // événement non JSON ignoré
        }
      }
    }
    return { ok: true, status: 200, body: texte };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        body: `Délai de génération dépassé (${DELAI_MAX_MS / 1000} s).`,
      };
    }
    throw e;
  } finally {
    clearTimeout(minuteur);
  }
}

/** Appelle Claude avec une nouvelle tentative en cas d'erreur transitoire. */
export async function genererAvecClaude(options: {
  systeme: string;
  message: string;
  maxTokens?: number;
}): Promise<string> {
  const cle = process.env["ANTHROPIC_API_KEY"];
  if (!cle) {
    throw new Error("La clé Anthropic n'est pas enregistrée côté serveur.");
  }
  const maxTokens = options.maxTokens ?? 8000;
  let tentative = await appel(cle, options.systeme, options.message, maxTokens);
  if (
    !tentative.ok &&
    (tentative.status === 0 || tentative.status === 429 || tentative.status >= 500)
  ) {
    await new Promise((r) => setTimeout(r, 3000));
    tentative = await appel(cle, options.systeme, options.message, maxTokens);
  }
  if (!tentative.ok) {
    throw new Error(
      `La génération a échoué (${tentative.status}) : ${tentative.body || "erreur inconnue"}`,
    );
  }
  return tentative.body;
}

/**
 * Échappe les retours à la ligne et autres caractères de contrôle bruts
 * trouvés à l'intérieur des chaînes JSON. Claude en insère parfois malgré
 * la consigne de répondre en JSON strict (par ex. quand on lui demande des
 * paragraphes avec retours à la ligne), ce qui casse JSON.parse.
 */
function assainirChainesJson(texte: string): string {
  let resultat = "";
  let dansChaine = false;
  let echappement = false;
  for (const car of texte) {
    if (dansChaine) {
      if (echappement) {
        resultat += car;
        echappement = false;
        continue;
      }
      if (car === "\\") {
        resultat += car;
        echappement = true;
        continue;
      }
      if (car === '"') {
        dansChaine = false;
        resultat += car;
        continue;
      }
      if (car === "\n") {
        resultat += "\\n";
        continue;
      }
      if (car === "\r") {
        resultat += "\\r";
        continue;
      }
      if (car === "\t") {
        resultat += "\\t";
        continue;
      }
      resultat += car;
      continue;
    }
    if (car === '"') {
      dansChaine = true;
    }
    resultat += car;
  }
  return resultat;
}

/** Extrait le JSON d'une réponse éventuellement entourée de texte ou de balises. */
export function extraireJsonClaude(texte: string): unknown {
  const nettoye = texte.replace(/```json|```/g, "").trim();
  const debut = nettoye.indexOf("{");
  const fin = nettoye.lastIndexOf("}");
  if (debut < 0 || fin < debut) {
    throw new Error("La réponse de l'IA n'est pas un JSON valide.");
  }
  const candidat = nettoye.slice(debut, fin + 1);
  try {
    return JSON.parse(candidat);
  } catch {
    return JSON.parse(assainirChainesJson(candidat));
  }
}
