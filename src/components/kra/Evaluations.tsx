import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  Clock,
  FileEdit,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Bootstrap } from "@/lib/kra.functions";
import { saveEvaluation, updateEvaluationStatus } from "@/lib/kra.functions";
import {
  calculateEvaluationScore,
  calculateKpiAchievement,
  DEFAULT_EVALUATION_MONTH,
  EVALUATION_MONTHS,
  getAdminEvaluationState,
  getManagerEvaluationState,
  krasFor,
  monthLabel,
  ROLE_LABEL,
  STATUS_LABEL,
  type AdminEvaluationState,
  type EvaluationStatus,
  type ManagerEvaluationState,
  type MonthlyEvaluation,
  type Role,
} from "@/lib/scoring";
import { BandBadge, ScoreBar, StatusBadge, StatusDotText } from "./BandBadge";
import { NumberTicker } from "./NumberTicker";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useRefresh, useSession } from "./session";
import { cn } from "@/lib/utils";
import { getAvatarColor } from "./AppShell";

/** Admin 3-state dot text indicator */
function AdminStatusDotText({ state }: { state: AdminEvaluationState }) {
  switch (state) {
    case "In Review":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          In Review
        </span>
      );
    case "Approved":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          Approved
        </span>
      );
    case "Pending":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          Pending
        </span>
      );
  }
}

/** Admin 3-state badge for evaluation drawer */
function AdminStatusBadge({ state }: { state: AdminEvaluationState }) {
  switch (state) {
    case "In Review":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          In Review
        </span>
      );
    case "Approved":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Approved
        </span>
      );
    case "Pending":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Pending
        </span>
      );
  }
}

export function Evaluations({
  data,
  initialStaffId,
  onSwitchToRate,
}: {
  data: Bootstrap;
  initialStaffId?: string;
  onSwitchToRate?: () => void;
}) {
  const currentRole = data.me.role;
  const isLead = currentRole === "admin" || currentRole === "manager";
  const isAdmin = currentRole === "admin";
  const isManager = currentRole === "manager";
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<string>(DEFAULT_EVALUATION_MONTH);
  const [selectedTabFilter, setSelectedTabFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "phlebo" | "frontdesk">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    isLead ? initialStaffId || null : data.me.id
  );

  const activeFilterCount =
    (selectedTabFilter !== "all" ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // PRIVACY GUARD: Regular staff can NEVER see other employees' evaluations
  const inScopeStaff = useMemo(() => {
    if (!isLead) {
      return data.staff.filter((s) => s.id === data.me.id);
    }
    return data.staff.filter((s) => s.role === "phlebo" || s.role === "frontdesk");
  }, [data.staff, isLead, data.me.id]);

  // Current evaluations map for this month
  const monthEvalsMap = useMemo(() => {
    const map = new Map<string, MonthlyEvaluation>();
    for (const e of data.evaluations) {
      if (e.month === month) {
        map.set(e.employee_id, e);
      }
    }
    return map;
  }, [data.evaluations, month]);

  // Tab counts dynamically calculated across inScopeStaff
  const tabCounts = useMemo(() => {
    let all = 0;
    let inReview = 0;
    let approved = 0;
    let adminPending = 0;
    let draft = 0;
    let managerPending = 0;

    for (const s of inScopeStaff) {
      if (roleFilter !== "all" && s.role !== roleFilter) continue;
      all++;
      const ev = monthEvalsMap.get(s.id);
      const st: EvaluationStatus = ev?.status || "Not started";

      if (st === "Submitted for review") {
        inReview++;
      } else if (st === "Reviewed" || st === "Locked/Finalized") {
        approved++;
      } else if (st === "In progress") {
        draft++;
        adminPending++;
      } else {
        // "Not started"
        adminPending++;
        managerPending++;
      }
    }

    return { all, inReview, approved, adminPending, draft, managerPending };
  }, [inScopeStaff, roleFilter, monthEvalsMap]);

  // Dynamic filter tabs config
  const filterTabs = useMemo(() => {
    if (isAdmin) {
      return [
        { id: "all", label: "All", count: tabCounts.all },
        { id: "in_review", label: "In Review", count: tabCounts.inReview },
        { id: "approved", label: "Approved", count: tabCounts.approved },
        { id: "pending", label: "Pending", count: tabCounts.adminPending },
      ];
    }
    return [
      { id: "all", label: "All", count: tabCounts.all },
      { id: "draft", label: "Draft", count: tabCounts.draft },
      { id: "in_review", label: "In Review", count: tabCounts.inReview },
      { id: "approved", label: "Approved", count: tabCounts.approved },
      { id: "pending", label: "Pending", count: tabCounts.managerPending },
    ];
  }, [isAdmin, tabCounts]);

  // Filtered staff list for managers & admin
  const filteredStaff = useMemo(() => {
    return inScopeStaff.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          s.name.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      const ev = monthEvalsMap.get(s.id);
      const st: EvaluationStatus = ev?.status || "Not started";

      if (isAdmin) {
        const adminState = getAdminEvaluationState(st);
        if (selectedTabFilter === "in_review" && adminState !== "In Review") return false;
        if (selectedTabFilter === "approved" && adminState !== "Approved") return false;
        if (selectedTabFilter === "pending" && adminState !== "Pending") return false;
      } else {
        const mgrState = getManagerEvaluationState(st);
        if (selectedTabFilter === "draft" && mgrState !== "Draft") return false;
        if (selectedTabFilter === "in_review" && mgrState !== "In Review") return false;
        if (selectedTabFilter === "approved" && mgrState !== "Approved") return false;
        if (selectedTabFilter === "pending" && mgrState !== "Pending") return false;
      }
      return true;
    });
  }, [inScopeStaff, search, roleFilter, selectedTabFilter, monthEvalsMap, isAdmin]);

  // Selected staff details
  const activeStaff = inScopeStaff.find((s) => s.id === selectedStaffId) || null;
  const activeEval = selectedStaffId ? monthEvalsMap.get(selectedStaffId) : undefined;
  const activeReviewer = activeEval?.reviewer_id
    ? data.staff.find((s) => s.id === activeEval.reviewer_id)
    : null;
  const activeReviewerName =
    activeReviewer?.name ||
    (activeEval?.reviewer_id === "u-sheetal" ? "Dr. Sheetal" : "Sandeep Gaikwad");

  const activeAdminState = activeEval ? getAdminEvaluationState(activeEval.status) : "Pending";
  const effectiveReadOnly = isReadOnlyView || (isAdmin && activeAdminState === "Approved");

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {isLead ? "Monthly Evaluations" : "My Performance"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLead
              ? "Monthly data entry, performance review, and sign-off workflow."
              : "Review your monthly assigned targets, actual figures, and review status."}
          </p>
        </div>
      </div>

      {/* If non-lead: directly show their performance evaluation & peer review prompt */}
      {!isLead ? (
        <div className="space-y-4">
          {/* Peer review prompt banner (if active) */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-fuchsia-50/50 to-purple-50 border border-purple-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#601DAF] text-white shadow-xs shrink-0">
                <Star className="h-4 w-4 fill-white" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Peer Recognition Active</p>
                <p className="text-[11px] text-purple-800 truncate">Recognize a coworker for teamwork or patient care</p>
              </div>
            </div>
            {onSwitchToRate && (
              <button
                type="button"
                onClick={onSwitchToRate}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#601DAF] to-[#7B2CBF] text-white text-xs font-bold shadow-xs active:scale-95 transition"
              >
                Rate Peers →
              </button>
            )}
          </div>

          <EvaluationCard
            staff={data.me as any}
            month={month}
            evaluation={monthEvalsMap.get(data.me.id)}
            data={data}
            isLead={false}
          />
        </div>
      ) : (
        /* If Lead: Search Row + Staff List */
        <div className="space-y-4">
          {/* Search Input Row with Circular Filter Icon Button on Right Side */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                placeholder="Search staff by name or ID..."
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-2xl border border-input bg-card pl-9.5 pr-8 text-xs outline-none focus:ring-2 focus:ring-[#601DAF]/30 focus:border-[#601DAF] transition shadow-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center text-slate-400 hover:text-slate-700 transition"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Circular Filter Icon Button right beside Search Bar */}
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              title="Filter evaluations"
              aria-label="Filter evaluations"
              className={cn(
                "relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-all active:scale-95 shadow-xs select-none",
                hasActiveFilters
                  ? "border-[#601DAF] bg-purple-50 text-[#601DAF] font-bold ring-2 ring-[#601DAF]/20"
                  : "border-slate-200/90 bg-card text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#601DAF] text-[9px] font-bold text-white ring-2 ring-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Section: Month Title & Filtered Count */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {monthLabel(month) || "October 2026"}
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">{filteredStaff.length}</span>
            </div>

            {/* Staff Evaluation Rows */}
            <div className="card-surface divide-y divide-border/60">
              {filteredStaff.map((s) => {
                const ev = monthEvalsMap.get(s.id);
                const status: EvaluationStatus = ev?.status || "Not started";
                const adminState = getAdminEvaluationState(status);

                return (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 p-4 hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold text-white shadow-xs",
                          getAvatarColor(s.name)
                        )}
                      >
                        {s.name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("").slice(0, 2)}
                      </span>

                      <div className="min-w-0 flex-1 pt-0.5">
                        {/* Top Line: Full Name */}
                        <p className="font-semibold text-sm text-foreground leading-snug">
                          {s.name}
                        </p>

                        {/* Bottom Line: Role title paired with status indicator */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground truncate">{ROLE_LABEL[s.role]}</span>
                          <span className="text-muted-foreground/30 text-xs">·</span>
                          {isAdmin ? (
                            <AdminStatusDotText state={adminState} />
                          ) : (
                            <StatusDotText status={status} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions By State (PRD Section 4 & FR-04) */}
                    {isAdmin ? (
                      adminState === "In Review" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(s.id);
                            setIsReadOnlyView(false);
                          }}
                          className="shrink-0 h-9 px-4 rounded-full border border-purple-200 bg-purple-50/70 text-xs font-bold text-[#601DAF] hover:bg-purple-100 transition active:scale-95 flex items-center justify-center min-w-[76px] self-center"
                          aria-label={`Review evaluation for ${s.name}`}
                        >
                          Review
                        </button>
                      ) : adminState === "Approved" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(s.id);
                            setIsReadOnlyView(true);
                          }}
                          className="shrink-0 h-9 px-4 rounded-full border border-purple-200 bg-purple-50/70 text-xs font-bold text-[#601DAF] hover:bg-purple-100 transition active:scale-95 flex items-center justify-center min-w-[76px] self-center"
                          aria-label={`View evaluation for ${s.name}`}
                        >
                          View
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success("Reminder alert sent to staff");
                          }}
                          className="shrink-0 h-9 px-4 rounded-full border border-amber-200 bg-amber-50/80 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition active:scale-95 flex items-center justify-center min-w-[76px] self-center"
                          aria-label={`Send alert to ${s.name}`}
                        >
                          Send Alert
                        </button>
                      )
                    ) : (
                      /* Center Manager View */
                      <button
                        type="button"
                        onClick={() => setSelectedStaffId(s.id)}
                        className="shrink-0 h-9 px-4 rounded-full border border-purple-200 bg-purple-50/70 text-xs font-bold text-[#601DAF] hover:bg-purple-100 transition active:scale-95 flex items-center justify-center min-w-[76px] self-center"
                        aria-label={`Open evaluation for ${s.name}`}
                      >
                        {status === "Locked/Finalized" || status === "Reviewed"
                          ? "View"
                          : status === "Submitted for review"
                          ? "Review"
                          : status === "In progress"
                          ? "Continue"
                          : "Start"}
                      </button>
                    )}
                  </div>
                );
              })}

              {!filteredStaff.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No evaluations found matching the selected filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bottom Sheet Popup */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="bottom"
          hideClose
          className="mx-auto max-w-lg rounded-t-3xl border-t border-purple-100 bg-white px-5 pt-3 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] focus:outline-none"
        >
          {/* Native-feel sheet drag bar */}
          <div className="mx-auto -mt-1 mb-3.5 h-1 w-12 rounded-full bg-slate-300/80" />

          {/* Header without icon and without close X */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <SheetTitle className="text-base font-bold text-slate-900">Filters</SheetTitle>
              <p className="text-[11px] text-muted-foreground">Filter evaluations by status and role</p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTabFilter("all");
                  setRoleFilter("all");
                }}
                className="flex items-center gap-1 text-xs font-semibold text-[#601DAF] hover:text-[#4A1282] px-2.5 py-1 rounded-lg hover:bg-purple-50 transition active:scale-95"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="space-y-4 pt-3 max-h-[75vh] overflow-y-auto">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {filterTabs.map((s) => {
                  const isSelected = selectedTabFilter === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedTabFilter(s.id)}
                      className={cn(
                        "h-9 rounded-full flex items-center justify-center px-3.5 text-xs font-semibold transition-all select-none active:scale-95",
                        isSelected
                          ? "border-2 border-[#601DAF] bg-purple-50 text-[#601DAF] font-bold shadow-xs"
                          : "border border-slate-200/80 bg-slate-50 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                      )}
                    >
                      <span>
                        {s.label} ({s.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Role
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "all", label: "All Roles" },
                  { id: "phlebo", label: "Home Phlebotomy" },
                  { id: "frontdesk", label: "Front Desk" },
                ] as const).map((r) => {
                  const isSelected = roleFilter === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoleFilter(r.id as any)}
                      className={cn(
                        "h-9 rounded-full flex items-center justify-center px-4 text-xs font-semibold transition-all select-none active:scale-95",
                        isSelected
                          ? "border-2 border-[#601DAF] bg-purple-50 text-[#601DAF] font-bold shadow-xs"
                          : "border border-slate-200/80 bg-slate-50 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                      )}
                    >
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Apply Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#601DAF] via-[#7B2CBF] to-[#4A1282] text-xs font-bold text-white shadow-md shadow-purple-900/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                Show {filteredStaff.length} {filteredStaff.length === 1 ? "Staff Evaluation" : "Staff Evaluations"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Evaluation Bottom Sheet Popup for Manager Review / Staff Entry */}
      {isLead && activeStaff && (
        <Sheet
          open={!!selectedStaffId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedStaffId(null);
              setIsReadOnlyView(false);
            }
          }}
        >
          <SheetContent
            side="bottom"
            hideClose
            className="mx-auto max-w-xl rounded-t-[32px] border-t border-purple-100 bg-white p-0 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] focus:outline-none flex flex-col max-h-[92vh] h-[92vh] overflow-hidden"
          >
            {/* Native-feel sheet drag bar */}
            <div className="mx-auto mt-3 mb-1.5 h-1 w-12 rounded-full bg-slate-300/80 shrink-0" />

            <SheetHeader className="px-6 py-2.5 border-b border-slate-100 shrink-0 text-left items-start space-y-0">
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="space-y-0.5 min-w-0 text-left">
                  <SheetTitle className="text-left font-display text-base font-bold text-slate-900 truncate">
                    {activeStaff.name}
                  </SheetTitle>
                  <p className="text-left text-xs text-muted-foreground font-medium">
                    {ROLE_LABEL[activeStaff.role]}
                  </p>
                </div>

                <SheetClose className="grid h-7 w-7 place-items-center rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-0 outline-none focus:outline-none focus:ring-0 mt-0.5 -mr-1">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
            </SheetHeader>

            <EvaluationCard
              staff={activeStaff}
              month={month}
              evaluation={activeEval}
              data={data}
              isLead={isLead}
              isReadOnlyView={effectiveReadOnly}
              onClose={() => {
                setSelectedStaffId(null);
                setIsReadOnlyView(false);
              }}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function EvaluationCard({
  staff,
  month,
  evaluation,
  data,
  isLead,
  isReadOnlyView = false,
  onClose,
}: {
  staff: { id: string; name: string; role: Role; center: string };
  month: string;
  evaluation?: MonthlyEvaluation;
  data: Bootstrap;
  isLead: boolean;
  isReadOnlyView?: boolean;
  onClose?: () => void;
}) {
  const { token, user } = useSession();
  const refresh = useRefresh();

  const currentRole = user?.role || data.me.role;
  const isAdmin = currentRole === "admin";
  const isManager = currentRole === "manager";
  const isStaff = !isAdmin && !isManager;
  const isSelf = data.me.id === staff.id;

  // PRIVACY GUARD: Staff can NEVER open or view evaluations belonging to other staff members
  if (isStaff && !isSelf) {
    return (
      <div className="p-6 text-center text-rose-700 bg-rose-50 rounded-2xl border border-rose-200">
        <p className="font-bold text-sm">Access Denied</p>
        <p className="text-xs text-rose-600 mt-1">Staff members can only view their own performance evaluation.</p>
      </div>
    );
  }

  const ks = krasFor(data.kras, staff.role);
  const status: EvaluationStatus = evaluation?.status || "Not started";
  const adminState = getAdminEvaluationState(status);
  const isDraft = status === "Not started" || status === "In progress";
  const isSubmitted = status === "Submitted for review";
  const isReviewed = status === "Reviewed";
  const isLocked = status === "Locked/Finalized";
  const isApproved = isAdmin
    ? status === "Reviewed" || status === "Locked/Finalized"
    : isLocked;

  // Strict role-based editability
  const canEdit = useMemo(() => {
    if (isReadOnlyView) return false;
    if (isLocked || isApproved) return false;
    if (isStaff) return isDraft;
    if (isManager) return isDraft || isSubmitted;
    if (isAdmin) return false;
    return false;
  }, [isReadOnlyView, isLocked, isApproved, isStaff, isManager, isAdmin, isDraft, isSubmitted]);

  // Actual values input state
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const k of ks) {
      const existingVal = evaluation?.kpi_results[k.id]?.actual;
      init[k.id] = existingVal !== null && existingVal !== undefined ? String(existingVal) : "";
    }
    return init;
  });

  const [feedback, setFeedback] = useState<string>(evaluation?.feedback || "");
  const [saving, setSaving] = useState(false);

  const formatDisplayDate = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // Compute live achievement & score
  const nums = useMemo(() => {
    const res: Record<string, number | null> = {};
    for (const k of ks) {
      const v = vals[k.id];
      res[k.id] = v !== "" && v !== undefined && !Number.isNaN(Number(v)) ? Number(v) : null;
    }
    return res;
  }, [vals, ks]);

  const liveResults = useMemo(() => {
    const map: Record<string, { actual: number | null; achievement: number | null }> = {};
    for (const k of ks) {
      const actual = nums[k.id] ?? null;
      const snapTarget = evaluation?.kpi_results[k.id]?.target ?? k.target;
      const snapDir = evaluation?.kpi_results[k.id]?.direction ?? k.direction;
      const ach = calculateKpiAchievement(snapTarget, actual, snapDir);
      map[k.id] = { actual, achievement: ach };
    }
    return map;
  }, [ks, nums, evaluation]);

  const liveScore = useMemo(() => {
    return calculateEvaluationScore(ks, liveResults);
  }, [ks, liveResults]);

  // Stepper increment/decrement
  const step = (kId: string, d: number) => {
    if (!canEdit) return;
    setVals((prev) => {
      const cur = Number(prev[kId]) || 0;
      const next = Math.max(0, cur + d);
      return { ...prev, [kId]: String(next) };
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveEvaluation({
        data: {
          token: token!,
          employee_id: staff.id,
          month,
          status: "In progress",
          actuals: nums,
          feedback,
          reviewer_id: isLead ? user?.id : evaluation?.reviewer_id,
        },
      });
      toast.success("Draft saved successfully");
      refresh();
      onClose?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSaving(true);
    try {
      await saveEvaluation({
        data: {
          token: token!,
          employee_id: staff.id,
          month,
          status: "Submitted for review",
          actuals: nums,
          feedback,
          reviewer_id: isLead ? user?.id : evaluation?.reviewer_id,
        },
      });
      toast.success("Evaluation submitted for review!");
      refresh();
      onClose?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to submit evaluation");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitEvaluationByManager = async () => {
    setSaving(true);
    try {
      await saveEvaluation({
        data: {
          token: token!,
          employee_id: staff.id,
          month,
          status: "Submitted for review",
          actuals: nums,
          feedback,
          reviewer_id: user?.id,
        },
      });
      toast.success("Evaluation submitted for review!");
      refresh();
      onClose?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to submit evaluation");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!isLead) return;
    setSaving(true);
    try {
      await saveEvaluation({
        data: {
          token: token!,
          employee_id: staff.id,
          month,
          status: "Reviewed",
          actuals: nums,
          feedback,
          reviewer_id: user?.id,
        },
      });
      toast.success(
        isAdmin
          ? "Evaluation evaluated & marked as Reviewed by Dr. Sheetal"
          : "Evaluation approved & marked as Reviewed by Sandeep"
      );
      refresh();
      onClose?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to update review");
    } finally {
      setSaving(false);
    }
  };

  const handleAdminApproveAndFinalize = async () => {
    if (!isAdmin) {
      toast.error("Only Administrators can lock & finalize evaluations");
      return;
    }
    setSaving(true);
    try {
      await saveEvaluation({
        data: {
          token: token!,
          employee_id: staff.id,
          month,
          status: "Locked/Finalized",
          actuals: nums,
          feedback,
          reviewer_id: user?.id,
        },
      });
      toast.success("Evaluation approved & finalized by Dr. Sheetal");
      refresh();
      onClose?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to finalize evaluation");
    } finally {
      setSaving(false);
    }
  };

  const handleReturnForRevision = async () => {
    if (!isLead) return;
    setSaving(true);
    try {
      await saveEvaluation({
        data: {
          token: token!,
          employee_id: staff.id,
          month,
          status: "In progress",
          actuals: nums,
          feedback,
          reviewer_id: user?.id,
        },
      });
      toast.success("Evaluation sent back for correction");
      refresh();
      onClose?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to return evaluation");
    } finally {
      setSaving(false);
    }
  };

  const reviewerUser = evaluation?.reviewer_id
    ? data.staff.find((s) => s.id === evaluation.reviewer_id)
    : null;
  const reviewerDisplayName =
    reviewerUser?.name ||
    (evaluation?.reviewer_id === "u-sheetal"
      ? "Dr. Sheetal"
      : evaluation?.reviewer_id === "u-sandeep"
      ? "Sandeep Gaikwad"
      : "Sandeep Gaikwad");

  return (
    <div className={cn("flex flex-col", isLead ? "flex-1 min-h-0 h-full overflow-hidden" : "space-y-4")}>
      {/* Scrollable Content Body */}
      <div className={cn("space-y-4", isLead && "flex-1 overflow-y-auto px-6 pt-4 pb-6")}>
        {/* Header Info Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluation Period</p>
            <p className="font-display font-bold text-slate-900 text-sm">{monthLabel(month)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Audit Chip (PRD Section 4 & FR-04) */}
            {isAdmin ? (
              adminState === "Approved" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  🔒 Approved by Dr. Sheetal
                </span>
              ) : adminState === "In Review" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  In Review • Awaiting Approval
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Pending
                </span>
              )
            ) : isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                🔒 Locked by Dr. Sheetal
              </span>
            ) : isReviewed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#601DAF] border border-purple-200">
                Reviewed by {reviewerDisplayName} • Ready to Lock
              </span>
            ) : isSubmitted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Submitted • Awaiting Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Draft • Unreviewed
              </span>
            )}

            {isAdmin ? (
              <AdminStatusBadge state={adminState} />
            ) : (
              <StatusBadge status={status} />
            )}
          </div>
        </div>

        {/* Read-only Lock Notice Banner */}
        {(isLocked || (isAdmin && isApproved)) && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              This evaluation has been <strong>Approved & Finalized</strong> by Dr. Sheetal
              {evaluation?.timestamps.finalizedAt
                ? ` on ${formatDisplayDate(evaluation.timestamps.finalizedAt)}`
                : ""}
              . All inputs are permanently frozen.
            </span>
          </div>
        )}

        {/* Projected / Final Score Card */}
        <div className="card-surface p-4 bg-gradient-to-br from-white via-purple-50/20 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isLocked || (isAdmin && isApproved) ? "Final Monthly Score" : "Projected Monthly Score"}
              </p>
              <p className="font-display text-3xl font-extrabold tracking-tight text-slate-900 tabular mt-1">
                {liveScore !== null ? <NumberTicker value={liveScore} /> : "—"}
                {liveScore !== null && <span className="text-xl font-bold text-purple-700 ml-0.5">%</span>}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <ScoreBar score={liveScore} />
          </div>
        </div>

        {/* KPI List with Inputs & Calculated Badges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              KRA Metrics ({ks.length})
            </p>
            {!canEdit && (isLocked || (isAdmin && isApproved) || isReadOnlyView) && (
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                Read-only summary
              </span>
            )}
            {!canEdit && !isLocked && !isApproved && !isReadOnlyView && isStaff && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                Read-only while under review
              </span>
            )}
          </div>

          {ks.map((k) => {
            const snapTarget = evaluation?.kpi_results[k.id]?.target ?? k.target;
            const snapUnit = evaluation?.kpi_results[k.id]?.unit ?? k.unit;
            const snapDir = evaluation?.kpi_results[k.id]?.direction ?? k.direction;
            const curVal = vals[k.id] ?? "";
            const ach = liveResults[k.id]?.achievement;

            return (
              <div key={k.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 leading-snug">{k.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target: {snapDir === "lower_better" ? (Number(snapTarget) === 0 ? "0" : `≤ ${snapTarget}`) : snapTarget} {snapUnit} • Weight: {k.weight}%
                      {snapDir === "lower_better" && " • (lower is better)"}
                    </p>
                  </div>
                  {/* Achievement Badge (shows Pending if no value entered, NOT 0%!) */}
                  <BandBadge score={ach} fallbackLabel="Pending" showLabel={false} />
                </div>

                {canEdit ? (
                  /* Data Entry Stepper & Clean Input (Only rendered when editable) */
                  <div className="mt-3 flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={() => step(k.id, -1)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition active:scale-95 shadow-xs"
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </motion.button>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={curVal}
                        placeholder="0"
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^\d.]/g, "");
                          setVals((prev) => ({ ...prev, [k.id]: clean }));
                        }}
                        className={cn(
                          "h-11 w-full rounded-xl border border-input bg-card px-3 text-center font-display text-base font-bold tabular outline-none focus:ring-2 focus:ring-[#601DAF]/30 focus:border-[#601DAF] transition",
                          !curVal
                            ? "text-slate-400 font-normal italic placeholder:text-slate-400"
                            : "text-slate-900"
                        )}
                      />
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={() => step(k.id, 1)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition active:scale-95 shadow-xs"
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </motion.button>
                  </div>
                ) : (
                  /* Strictly READ-ONLY static display: no '-' or '+' steppers! */
                  <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
                    <span className="text-xs font-medium text-slate-500">Actual Recorded</span>
                    <span className="font-display font-bold text-slate-900 text-sm tabular">
                      {curVal !== "" ? (
                        <span>
                          {curVal} <span className="text-xs font-normal text-slate-500">{snapUnit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic text-xs">Pending / No data</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feedback & Coaching Remarks */}
        <div className="space-y-1.5 card-surface p-4">
          <p className="text-xs font-semibold text-slate-700">Manager Review Notes & Feedback</p>
          <textarea
            disabled={!isLead || isLocked || (isAdmin && isApproved) || isReadOnlyView}
            value={feedback}
            placeholder={isLead ? "Enter monthly feedback, coaching points, and observations..." : "Manager feedback will appear here..."}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-[#601DAF]/30 focus:border-[#601DAF] transition disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>
      </div>

      {/* State-Driven Contextual Action Footer (Hick's Law & Strict PRD Roles) */}
      <div className={cn(
        "bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex flex-col gap-2 z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]",
        isLead ? "shrink-0 sticky bottom-0 p-4 px-6 pb-6" : "sticky bottom-0 p-4 rounded-2xl"
      )}>
        {/* ==================== A) ADMIN (DR. SHEETAL) ACTIONS ==================== */}
        {isAdmin && (
          <>
            {/* State 1: In Review -> Primary CTA: "Approve & Finalize" (PRD Section 4 & FR-04) */}
            {adminState === "In Review" && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleAdminApproveAndFinalize}
                  className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#601DAF] via-[#7B2CBF] to-[#4A1282] h-12 text-sm font-bold text-white shadow-md shadow-purple-900/20 active:scale-95 transition disabled:opacity-50"
                >
                  Approve & Finalize
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleReturnForRevision}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
                >
                  Send Back for Correction
                </button>
              </>
            )}

            {/* State 2: Approved -> Strictly Read-Only Summary */}
            {adminState === "Approved" && (
              <div className="space-y-2">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Approved & Finalized by Dr. Sheetal</span>
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Close
                  </button>
                )}
              </div>
            )}

            {/* State 3: Pending -> Send Reminder Alert */}
            {adminState === "Pending" && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Reminder alert sent to staff");
                  }}
                  className="w-full flex items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 h-11 text-xs font-bold text-amber-900 shadow-xs active:scale-95 transition"
                >
                  Send Alert Reminder
                </button>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ==================== B) CENTER MANAGER (SANDEEP) ACTIONS ==================== */}
        {isManager && (
          <>
            {isDraft && (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmitEvaluationByManager}
                  className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#601DAF] via-[#7B2CBF] to-[#4A1282] h-12 text-sm font-bold text-white shadow-md shadow-purple-900/20 active:scale-95 transition disabled:opacity-50"
                >
                  Submit Evaluation
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDraft}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 active:scale-95 transition"
                >
                  Save Draft
                </button>
              </div>
            )}

            {isSubmitted && (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleMarkReviewed}
                  className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#601DAF] via-[#7B2CBF] to-[#4A1282] h-12 text-sm font-bold text-white shadow-md shadow-purple-900/20 active:scale-95 transition disabled:opacity-50"
                >
                  Submit Evaluation
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDraft}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 active:scale-95 transition"
                >
                  Save Draft
                </button>
              </div>
            )}

            {isReviewed && (
              <div className="space-y-2">
                <div className="rounded-2xl bg-purple-50 border border-purple-200/80 p-3.5 text-center text-xs font-semibold text-purple-900 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#601DAF]">
                    <CheckCircle2 className="h-4 w-4 text-[#601DAF]" />
                    <span>Reviewed by {reviewerDisplayName} • Ready to Lock</span>
                  </div>
                  <p className="text-purple-800 text-[11px]">Awaiting Final Admin Sign-off & Lock by Dr. Sheetal</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleReturnForRevision}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition"
                >
                  Send Back for Correction
                </button>
              </div>
            )}

            {isLocked && (
              <div className="space-y-2">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  <span>🔒 Locked by Dr. Sheetal</span>
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Close Evaluation
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ==================== C) REGULAR STAFF ACTIONS ==================== */}
        {isStaff && (
          <>
            {isDraft && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmitForReview}
                  className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#601DAF] via-[#7B2CBF] to-[#4A1282] h-12 text-sm font-bold text-white shadow-md shadow-purple-900/20 active:scale-95 transition disabled:opacity-50"
                >
                  Submit for Review
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDraft}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 active:scale-95 transition"
                >
                  Save Draft
                </button>
              </>
            )}

            {isSubmitted && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-center text-xs font-semibold text-amber-900 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>
                    Submitted{evaluation?.timestamps.submittedAt ? ` on ${formatDisplayDate(evaluation.timestamps.submittedAt)}` : ""}
                  </span>
                </div>
                <p className="text-amber-800 text-[11px]">Awaiting Manager Review • Editing is paused until reviewed</p>
              </div>
            )}

            {isReviewed && (
              <div className="rounded-2xl bg-purple-50 border border-purple-200/80 p-3.5 text-center text-xs font-semibold text-purple-900 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 font-bold text-[#601DAF]">
                  <CheckCircle2 className="h-4 w-4 text-[#601DAF]" />
                  <span>
                    Reviewed{evaluation?.timestamps.reviewedAt ? ` on ${formatDisplayDate(evaluation.timestamps.reviewedAt)}` : ""}
                  </span>
                </div>
                <p className="text-purple-800 text-[11px]">Reviewed by Manager • Awaiting Final Admin Sign-off</p>
              </div>
            )}

            {isLocked && (
              <div className="space-y-2">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  <span>
                    🔒 Locked & Finalized{evaluation?.timestamps.finalizedAt ? ` on ${formatDisplayDate(evaluation.timestamps.finalizedAt)}` : ""}
                  </span>
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Close Evaluation
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
