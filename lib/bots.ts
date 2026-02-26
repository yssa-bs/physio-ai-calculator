export interface BotInput {
  key: string;
  label: string;
  default: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  prefix: string;
  suffix?: string;
}

export interface Bot {
  id: string;
  name: string;
  category: string;
  price: number;       // monthly in AUD
  setupFee: number;    // one-time in AUD
  description: string;
  icon: string;
  inputs: BotInput[];
  calc: (inputs: Record<string, number>) => number;
}

export const BOTS: Bot[] = [
  {
    id: "receptionist", name: "AI Receptionist", category: "Phase 1", price: 1000, setupFee: 2000,
    description: "Answers every call, triages and books patients 24/7",
    icon: "📞",
    inputs: [
      { key: "missedCalls", label: "Missed calls per month", default: 500, unit: "calls not answered", min: 0, max: 2000, step: 10, prefix: "" },
      { key: "callConversion", label: "Call to booking conversion", default: 20, unit: "of answered calls become bookings", min: 5, max: 60, step: 1, prefix: "", suffix: "%" },
      { key: "firstVisitFee", label: "Average first visit fee", default: 150, unit: "per new patient visit", min: 50, max: 500, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round(i.missedCalls * 0.65 * (i.callConversion / 100) * i.firstVisitFee),
  },
  {
    id: "sick-day", name: "Sick Day Rescheduler", category: "Phase 2", price: 100, setupFee: 500,
    description: "Auto-calls and reschedules all patients when a physio is out",
    icon: "🤒",
    inputs: [
      { key: "sickDays", label: "Sick days across all physios/year", default: 6, unit: "total sick days per year", min: 0, max: 50, step: 1, prefix: "" },
      { key: "apptsPerDay", label: "Appointments per physio/day", default: 8, unit: "average daily bookings", min: 1, max: 20, step: 1, prefix: "" },
      { key: "rescheduleRate", label: "Rescheduled successfully", default: 70, unit: "of patients rebook same week", min: 20, max: 95, step: 5, prefix: "", suffix: "%" },
      { key: "avgApptFee", label: "Average appointment fee", default: 100, unit: "per rescheduled appointment", min: 50, max: 300, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round((i.sickDays * i.apptsPerDay * (i.rescheduleRate / 100) * i.avgApptFee) / 12),
  },
  {
    id: "retention", name: "Retention Bot", category: "Phase 3", price: 600, setupFee: 1500,
    description: "Keeps patients on their full recommended treatment course",
    icon: "🔄",
    inputs: [
      { key: "activePatients", label: "Active patients per month", default: 100, unit: "patients in active treatment", min: 10, max: 1000, step: 10, prefix: "" },
      { key: "dropOffRate", label: "Current drop-off rate", default: 40, unit: "leave before completing course", min: 10, max: 80, step: 5, prefix: "", suffix: "%" },
      { key: "followUpFee", label: "Average follow-up visit fee", default: 100, unit: "per follow-up session", min: 50, max: 300, step: 10, prefix: "$" },
      { key: "visitsPerCourse", label: "Visits per treatment course", default: 6, unit: "avg sessions per full course", min: 2, max: 15, step: 1, prefix: "" },
    ],
    calc: (i) => Math.round(i.activePatients * (i.dropOffRate / 100) * 0.3 * (i.visitsPerCourse * 0.5) * i.followUpFee),
  },
  {
    id: "review", name: "Review Bot", category: "Add-on", price: 100, setupFee: 500,
    description: "Automatically prompts happy patients for Google reviews to win new business",
    icon: "⭐",
    inputs: [
      { key: "monthlyPatients", label: "Patients seen per month", default: 80, unit: "total monthly patient visits", min: 10, max: 500, step: 10, prefix: "" },
      { key: "reviewValue", label: "Value of a new Google review", default: 300, unit: "avg revenue per new patient from reviews", min: 100, max: 1000, step: 50, prefix: "$" },
    ],
    calc: (i) => Math.round(i.monthlyPatients * 0.15 * i.reviewValue),
  },
  {
    id: "nurture", name: "New Patient Nurture", category: "Add-on", price: 600, setupFee: 1500,
    description: "Converts 20-30% more enquiries who didn't book immediately",
    icon: "🌱",
    inputs: [
      { key: "unconverted", label: "Unconverted enquiries/month", default: 30, unit: "people who enquired but didn't book", min: 5, max: 200, step: 5, prefix: "" },
      { key: "currentConv", label: "Current enquiry conversion rate", default: 10, unit: "currently converting without nurture", min: 0, max: 50, step: 5, prefix: "", suffix: "%" },
      { key: "nurtureVisitFee", label: "First visit fee", default: 150, unit: "per new patient first visit", min: 50, max: 500, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round(Math.max(0, i.unconverted * 0.25 - i.unconverted * (i.currentConv / 100)) * i.nurtureVisitFee),
  },
  {
    id: "reactivation", name: "DB Reactivation", category: "Add-on", price: 1000, setupFee: 2000,
    description: "Monthly outreach to lapsed patients to bring them back",
    icon: "📊",
    inputs: [
      { key: "lapsedPatients", label: "Lapsed patients in database", default: 200, unit: "patients not seen in 6+ months", min: 50, max: 5000, step: 50, prefix: "" },
      { key: "reactivationFee", label: "First visit fee", default: 150, unit: "per returning patient first visit", min: 50, max: 500, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round(i.lapsedPatients * 0.03 * i.reactivationFee),
  },
  {
    id: "waitlist", name: "Waitlist & Cancellation Filler", category: "Add-on", price: 400, setupFee: 1000,
    description: "Fills cancelled appointment slots automatically from your waitlist",
    icon: "⏱️",
    inputs: [
      { key: "cancellations", label: "Cancellations per month", default: 40, unit: "last-minute cancellations", min: 5, max: 200, step: 5, prefix: "" },
      { key: "waitlistApptValue", label: "Average appointment value", default: 100, unit: "per filled appointment", min: 50, max: 300, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round(i.cancellations * 0.45 * i.waitlistApptValue),
  },
  {
    id: "intake", name: "Pre-Visit Intake Bot", category: "Add-on", price: 300, setupFee: 1000,
    description: "Collects patient history, symptoms & insurance info before their first visit",
    icon: "📋",
    inputs: [
      { key: "newPatientsMonth", label: "New patients per month", default: 30, unit: "new patients arriving", min: 5, max: 200, step: 5, prefix: "" },
      { key: "timeSaved", label: "Minutes saved per patient", default: 10, unit: "admin time saved per intake", min: 5, max: 30, step: 5, prefix: "" },
      { key: "hourlyRate", label: "Physio hourly rate (cost)", default: 80, unit: "staff cost per hour", min: 40, max: 200, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round((i.newPatientsMonth * i.timeSaved / 60) * i.hourlyRate),
  },
  {
    id: "postop", name: "Post-Treatment Check-In", category: "Add-on", price: 400, setupFee: 1000,
    description: "Automated follow-up after treatment milestones to drive rebookings",
    icon: "💬",
    inputs: [
      { key: "discharged", label: "Patients discharged per month", default: 40, unit: "patients finishing treatment", min: 5, max: 200, step: 5, prefix: "" },
      { key: "rebookRate", label: "Rebook rate from check-ins", default: 15, unit: "return for additional treatment", min: 5, max: 40, step: 5, prefix: "", suffix: "%" },
      { key: "rebookValue", label: "Average rebooking value", default: 100, unit: "per returning patient", min: 50, max: 300, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round(i.discharged * (i.rebookRate / 100) * i.rebookValue),
  },
  {
    id: "referral", name: "Referral Program Bot", category: "Add-on", price: 300, setupFee: 1000,
    description: "Turns happy patients into your best source of new business",
    icon: "🤝",
    inputs: [
      { key: "happyPatients", label: "Satisfied patients per month", default: 60, unit: "patients likely to refer", min: 10, max: 300, step: 10, prefix: "" },
      { key: "referralRate", label: "Expected referral rate", default: 8, unit: "who actually refer someone", min: 2, max: 25, step: 1, prefix: "", suffix: "%" },
      { key: "referralValue", label: "Value of a referred patient", default: 400, unit: "lifetime value of referral", min: 100, max: 1000, step: 50, prefix: "$" },
    ],
    calc: (i) => Math.round(i.happyPatients * (i.referralRate / 100) * i.referralValue),
  },
  {
    id: "reminders", name: "Smart Appointment Reminders", category: "Add-on", price: 200, setupFee: 500,
    description: "Conversational reminders that slash no-shows by 60%+",
    icon: "🔔",
    inputs: [
      { key: "monthlyAppts", label: "Monthly appointments", default: 300, unit: "total scheduled appointments", min: 50, max: 2000, step: 50, prefix: "" },
      { key: "noShowRate", label: "Current no-show rate", default: 12, unit: "of patients who don't show", min: 2, max: 30, step: 1, prefix: "", suffix: "%" },
      { key: "reminderApptValue", label: "Average appointment value", default: 100, unit: "per recovered appointment", min: 50, max: 300, step: 10, prefix: "$" },
    ],
    calc: (i) => Math.round(i.monthlyAppts * (i.noShowRate / 100) * 0.6 * i.reminderApptValue),
  },
];

export const MIN_MONTHLY = 500;
export const fmt = (n: number) => "$" + n.toLocaleString();
