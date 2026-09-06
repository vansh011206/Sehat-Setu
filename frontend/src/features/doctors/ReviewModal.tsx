import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Star } from "lucide-react";
import { doctorsApi } from "./api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";

interface ReviewModalProps {
  doctorId: number;
  doctorName: string;
  open: boolean;
  onClose: () => void;
  initialRating?: number;
  initialReviewText?: string;
}

export function ReviewModal({
  doctorId,
  doctorName,
  open,
  onClose,
  initialRating = 5,
  initialReviewText = "",
}: ReviewModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [rating, setRating] = useState<number>(initialRating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState(initialReviewText || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRating(initialRating || 5);
      setReviewText(initialReviewText || "");
      setErrorMessage(null);
      setHoverRating(0);
    }
  }, [open, initialRating, initialReviewText]);

  const reviewMutation = useMutation({
    mutationFn: (data: { rating: number; review_text?: string }) =>
      doctorsApi.submitReview(doctorId, data),
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Review Submitted",
        message: "Thank you for sharing your consultation feedback!",
      });
      // Invalidate doctor details, review list, appointments and dashboards immediately
      queryClient.invalidateQueries({ queryKey: ["doctor-detail", doctorId] });
      queryClient.invalidateQueries({ queryKey: ["doctor-reviews", doctorId] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-patient"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-doctor"] });
      onClose();
    },
    onError: (err: any) => {
      const responseData = err?.response?.data;
      if (err?.response?.status === 403) {
        setErrorMessage(
          responseData?.detail ||
            "You can only review doctors after completing a consultation appointment with them."
        );
      } else if (err?.response?.status === 409) {
        setErrorMessage(
          responseData?.detail ||
            "You have already submitted a review for this doctor."
        );
      } else {
        setErrorMessage(responseData?.detail || "Failed to submit review. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    reviewMutation.mutate({
      rating,
      review_text: reviewText.trim(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Write a Review for Dr. ${doctorName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Interactive Star Rating */}
        <div className="space-y-1.5 text-center py-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Rate Your Consultation Experience
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-slate-300 hover:scale-115 transition-transform"
                >
                  <Star
                    size={28}
                    className={
                      isFilled
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 stroke-1"
                    }
                  />
                </button>
              );
            })}
          </div>
          <span className="text-xs font-bold text-amber-700">
            {rating === 5 && "Exceptional (5 Stars)"}
            {rating === 4 && "Very Good (4 Stars)"}
            {rating === 3 && "Average (3 Stars)"}
            {rating === 2 && "Poor (2 Stars)"}
            {rating === 1 && "Very Bad (1 Star)"}
          </span>
        </div>

        {/* Review Textarea */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 block">
            Consultation Feedback (Optional)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share details about the doctor's communication, diagnosis accuracy, and overall treatment..."
            rows={4}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700 bg-white"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={CheckCircle2}
            isLoading={reviewMutation.isPending}
          >
            Submit Review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
