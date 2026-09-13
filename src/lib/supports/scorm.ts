import type { ModuleCours } from "@/lib/supports/cours";

const BLEU = "#1D2C76";
const OR = "#FDE005";

export interface PaquetScorm {
  titreFormation: string;
  modules: ModuleCours[];
}

function echapper(valeur: string) {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Manifeste conforme à la norme SCORM 1.2. */
function manifeste(titre: string) {
  const id = `FORMATRIX-${Date.now()}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${echapper(titre)}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>${echapper(titre)}</title>
        <adlcp:masteryscore>80</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="cours.js"/>
      <file href="scorm.js"/>
    </resource>
  </resources>
</manifest>`;
}

/** API de communication avec le LMS (SCORM 1.2). */
function apiScorm() {
  return `var API = null;
function trouverAPI(win) {
  var essais = 0;
  while (win && !win.API && win.parent && win.parent !== win && essais < 100) {
    essais++; win = win.parent;
  }
  return win ? win.API : null;
}
function initScorm() {
  API = trouverAPI(window) || (window.opener ? trouverAPI(window.opener) : null);
  if (!API) return false;
  API.LMSInitialize("");
  API.LMSSetValue("cmi.core.lesson_status", "incomplete");
  API.LMSCommit("");
  return true;
}
function envoyerProgression(pourcentage) {
  if (!API) return;
  API.LMSSetValue("cmi.core.score.raw", String(Math.round(pourcentage)));
  API.LMSSetValue("cmi.core.score.min", "0");
  API.LMSSetValue("cmi.core.score.max", "100");
  API.LMSCommit("");
}
function terminerScorm(score) {
  if (!API) return;
  API.LMSSetValue("cmi.core.score.raw", String(Math.round(score)));
  API.LMSSetValue("cmi.core.lesson_status", score >= 80 ? "passed" : "completed");
  API.LMSCommit("");
  API.LMSFinish("");
}
window.addEventListener("load", initScorm);
window.addEventListener("beforeunload", function () { if (API) { API.LMSCommit(""); API.LMSFinish(""); } });`;
}

/** Lecteur HTML interactif embarqué dans le paquet. */
function page(titre: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${echapper(titre)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>body{font-family:Carlito,Calibri,system-ui,sans-serif;color:#1A1A1A}</style>
</head>
<body class="bg-slate-50">
  <header class="text-white px-6 py-4" style="background:${BLEU}">
    <h1 class="text-lg font-bold uppercase tracking-wide">${echapper(titre)}</h1>
    <p id="fil" class="text-sm opacity-80"></p>
  </header>
  <div class="h-1" style="background:${OR}"></div>
  <main class="mx-auto max-w-3xl p-6">
    <div class="mb-4 h-2 w-full rounded bg-slate-200">
      <div id="barre" class="h-2 rounded" style="width:0%;background:${BLEU}"></div>
    </div>
    <section id="slide" class="rounded-lg border bg-white p-6 shadow-sm"></section>
    <nav class="mt-6 flex items-center justify-between">
      <button id="prec" class="rounded-md border px-4 py-2 text-sm font-medium">Précédent</button>
      <span id="compteur" class="text-sm text-slate-500"></span>
      <button id="suiv" class="rounded-md px-4 py-2 text-sm font-bold text-white" style="background:${BLEU}">Suivant</button>
    </nav>
  </main>
  <script src="scorm.js"></script>
  <script src="cours.js"></script>
  <script>
  (function () {
    var pages = [];
    COURS.modules.forEach(function (m) {
      m.slides.forEach(function (s) { pages.push({ module: m.title, slide: s }); });
    });
    var index = 0;
    var reponses = {};

    function rendu() {
      var p = pages[index];
      var s = p.slide;
      var quiz = s.interactiveQuiz || { question: "", options: [] };
      var html = '<p class="text-xs font-bold uppercase tracking-wide" style="color:${BLEU}">' + p.module + '</p>';
      html += '<h2 class="mt-1 text-xl font-bold">' + s.title + '</h2>';
      html += '<div class="mt-4 whitespace-pre-line text-sm leading-relaxed">' + s.content + '</div>';
      if (s.keyTakeaways && s.keyTakeaways.length) {
        html += '<ul class="mt-4 list-disc space-y-1 rounded-md bg-slate-100 p-4 pl-8 text-sm">';
        s.keyTakeaways.forEach(function (k) { html += '<li>' + k + '</li>'; });
        html += '</ul>';
      }
      if (quiz.question && quiz.options.length) {
        html += '<div class="mt-6 rounded-md border p-4"><p class="font-bold text-sm">' + quiz.question + '</p><div class="mt-3 space-y-2">';
        quiz.options.forEach(function (o, i) {
          html += '<button data-i="' + i + '" class="reponse block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-slate-50">' + o + '</button>';
        });
        html += '</div><p id="verdict" class="mt-3 text-sm"></p></div>';
      }
      document.getElementById("slide").innerHTML = html;
      document.getElementById("fil").textContent = p.module;
      document.getElementById("compteur").textContent = (index + 1) + " / " + pages.length;
      document.getElementById("barre").style.width = Math.round(((index + 1) / pages.length) * 100) + "%";
      document.getElementById("suiv").textContent = index === pages.length - 1 ? "Terminer" : "Suivant";
      Array.prototype.forEach.call(document.querySelectorAll(".reponse"), function (b) {
        b.addEventListener("click", function () {
          var choisi = parseInt(b.getAttribute("data-i"), 10);
          var bon = choisi === quiz.answerIndex;
          reponses[index] = bon;
          var verdict = document.getElementById("verdict");
          verdict.textContent = bon ? "Bonne réponse." : "Réponse incorrecte, relisez la diapositive.";
          verdict.className = "mt-3 text-sm " + (bon ? "text-green-700" : "text-red-700");
          envoyerProgression(score());
        });
      });
    }

    function score() {
      var total = pages.filter(function (p) { return p.slide.interactiveQuiz && p.slide.interactiveQuiz.question; }).length || 1;
      var justes = Object.keys(reponses).filter(function (k) { return reponses[k]; }).length;
      return (justes / total) * 100;
    }

    document.getElementById("prec").addEventListener("click", function () {
      if (index > 0) { index--; rendu(); }
    });
    document.getElementById("suiv").addEventListener("click", function () {
      if (index < pages.length - 1) { index++; rendu(); envoyerProgression(score()); }
      else { terminerScorm(score()); alert("Module terminé. Score : " + Math.round(score()) + "%"); }
    });
    rendu();
  })();
  </script>
</body>
</html>`;
}

/** Construit une archive SCORM 1.2 prête à être déposée dans un LMS. */
export async function construireScorm(paquet: PaquetScorm): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("imsmanifest.xml", manifeste(paquet.titreFormation));
  zip.file("scorm.js", apiScorm());
  zip.file(
    "cours.js",
    `var COURS = ${JSON.stringify({
      titre: paquet.titreFormation,
      modules: paquet.modules,
    })};`,
  );
  zip.file("index.html", page(paquet.titreFormation));
  return await zip.generateAsync({ type: "blob" });
}
