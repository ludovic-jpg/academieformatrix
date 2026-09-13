/** Structures du contenu de cours approfondi produit par l'assistant Claude. */

export interface QuizSlide {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface SlideCours {
  slideNumber: number;
  title: string;
  content: string;
  keyTakeaways: string[];
  interactiveQuiz: QuizSlide;
}

export interface ModuleCours {
  title: string;
  slides: SlideCours[];
}

export interface CoursEnrichi {
  modules: ModuleCours[];
}

/** Nombre de diapositives approfondies imposé par module. */
export const NB_SLIDES_APPROFONDIES = 6;
