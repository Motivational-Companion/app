export type OnboardingData = {
  bringYouHere: string;
  lookLike: string[];
  obstacles: string[];
  triedBefore: string[];
  vision: string;
  checkinTime: string;
  priorityArea: string;
  coachingStyle: string;
};

export type ActionPlan = {
  vision_statement: string;
  priorities: {
    rank: number;
    theme: string;
    urgency: "high" | "medium" | "low";
    importance: "high" | "medium" | "low";
    next_action: string;
    timeframe: string;
  }[];
  recommended_first_step: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
