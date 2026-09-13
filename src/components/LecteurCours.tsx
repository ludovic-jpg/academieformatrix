import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ModuleCours } from "@/lib/supports/cours";

interface LecteurCoursProps {
  modules: ModuleCours[];
  onFinish?: (score: number) => void;
}

export function LecteurCours({ modules, onFinish }: LecteurCoursProps) {
  const allSlides = modules.flatMap((m) =>
    m.slides.map((s) => ({ ...s, moduleTitle: m.title }))
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showVerdict, setShowVerdict] = useState<number | null>(null);

  const currentSlide = allSlides[index];
  if (!currentSlide) return null;

  const progress = ((index + 1) / allSlides.length) * 100;
  const isLast = index === allSlides.length - 1;

  const handleNext = () => {
    if (isLast) {
      const totalQuiz = allSlides.filter((s) => s.interactiveQuiz?.question).length;
      const score = totalQuiz > 0 
        ? (Object.entries(answers).filter(([idx, ans]) => allSlides[Number(idx)].interactiveQuiz.answerIndex === ans).length / totalQuiz) * 100
        : 100;
      onFinish?.(score);
    } else {
      setIndex(index + 1);
      setShowVerdict(null);
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setShowVerdict(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>{currentSlide.moduleTitle}</span>
          <span>{index + 1} / {allSlides.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="bg-card border rounded-xl p-8 shadow-sm min-h-[400px] flex flex-col">
        <h2 className="text-2xl font-bold text-primary mb-6">{currentSlide.title}</h2>
        
        <div className="flex-1 text-lg leading-relaxed text-slate-700 whitespace-pre-line mb-8">
          {currentSlide.content}
        </div>

        {currentSlide.keyTakeaways?.length > 0 && (
          <div className="bg-slate-50 border-l-4 border-primary p-4 rounded-r-lg mb-8">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              À retenir
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {currentSlide.keyTakeaways.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
        )}

        {currentSlide.interactiveQuiz?.question && (
          <div className="mt-auto border-t pt-6">
            <p className="font-bold mb-4">{currentSlide.interactiveQuiz.question}</p>
            <div className="grid gap-2">
              {currentSlide.interactiveQuiz.options.map((opt, i) => (
                <Button
                  key={i}
                  variant={answers[index] === i ? (i === currentSlide.interactiveQuiz.answerIndex ? "default" : "destructive") : "outline"}
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => {
                    setAnswers({ ...answers, [index]: i });
                    setShowVerdict(i);
                  }}
                >
                  {opt}
                </Button>
              ))}
            </div>
            {showVerdict !== null && (
              <p className={`mt-3 text-sm font-medium ${showVerdict === currentSlide.interactiveQuiz.answerIndex ? "text-green-600" : "text-red-600"}`}>
                {showVerdict === currentSlide.interactiveQuiz.answerIndex ? "Bonne réponse !" : "Réponse incorrecte, relisez la diapositive."}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={handlePrev} disabled={index === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
        </Button>
        <Button onClick={handleNext}>
          {isLast ? "Terminer" : "Suivant"} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
