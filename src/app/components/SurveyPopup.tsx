import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";

interface SurveyPopupProps {
  triggerEvent: string; // e.g. 'first_deposit'
}

export function SurveyPopup({ triggerEvent }: SurveyPopupProps) {
  const { user } = useAuth();
  const [survey, setSurvey] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (user && triggerEvent) {
      checkAndFetchSurvey();
    }
  }, [user, triggerEvent]);

  async function checkAndFetchSurvey() {
    try {
      // 1. Check if user already responded to this type of survey
      const { data: existing } = await supabase
        .from("survey_responses")
        .select("id")
        .eq("user_id", user?.id)
        .eq("survey_id", (
          supabase.from("surveys").select("id").eq("trigger_event", triggerEvent).eq("is_active", true).limit(1)
        ))
        .maybeSingle();

      // Better check: fetch the survey first, then check response
      const { data: activeSurveys } = await supabase
        .from("surveys")
        .select("*")
        .eq("trigger_event", triggerEvent)
        .eq("is_active", true)
        .limit(1);

      if (!activeSurveys || activeSurveys.length === 0) return;

      const activeSurvey = activeSurveys[0];

      const { data: response } = await supabase
        .from("survey_responses")
        .select("id")
        .eq("user_id", user?.id)
        .eq("survey_id", activeSurvey.id)
        .maybeSingle();

      if (!response) {
        setSurvey(activeSurvey);
        // Delay popup slightly for better UX
        setTimeout(() => setIsVisible(true), 3000);
      }
    } catch (err) {
      console.error("Survey check failed:", err);
    }
  }

  async function handleSubmit() {
    if (!selectedOption || !survey) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("survey_responses").insert({
        user_id: user?.id,
        survey_id: survey.id,
        answer: selectedOption
      });

      if (error) throw error;
      
      setCompleted(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    } catch (err: any) {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isVisible || !survey) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[60] w-full max-w-sm"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden relative">
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>

          {!completed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600">
                  <MessageSquare size={20} />
                </div>
                <h3 className="font-bold dark:text-white">Quick Feedback</h3>
              </div>

              <p className="text-sm font-medium dark:text-slate-300">
                {survey.question}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {survey.options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedOption(opt)}
                    className={`p-3 text-xs font-bold rounded-xl border transition-all ${
                      selectedOption === opt
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!selectedOption || submitting}
                className="w-full bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 h-11 rounded-xl font-bold"
              >
                {submitting ? "Submitting..." : "Send Feedback"}
              </Button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-3"
            >
              <div className="mx-auto size-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-bold dark:text-white">Thank You!</h3>
              <p className="text-xs text-slate-500">Your feedback helps us improve.</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
