import React, { useMemo, useState } from "react";
import { useUpcomingBirthdays } from "../../hooks/useUpcomingBirthdays";
import { IconCake } from "./Icons";
import BirthdayUpcomingModal from "./BirthdayUpcomingModal";

const DAYS_PER_MONTH = 30;

export default function BirthdaySidebarControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [monthsAhead, setMonthsAhead] = useState(1);
  const daysAhead = monthsAhead * DAYS_PER_MONTH;
  const {
    data: birthdays = [],
    isLoading,
    isFetching,
    error,
  } = useUpcomingBirthdays(daysAhead);

  const todayCount = useMemo(
    () => birthdays.filter((person) => person.daysUntil === 0).length,
    [birthdays],
  );

  const title =
    birthdays.length > 0
      ? `Ver ${birthdays.length} cumpleaños`
      : "Ver cumpleaños";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-pink-600 shadow-sm transition-all hover:bg-pink-50 hover:text-pink-700 active:scale-95 ${
          todayCount > 0
            ? "border-pink-500 bg-pink-600 text-white hover:bg-pink-700 hover:text-white"
            : "border-pink-100 bg-white"
        }`}
        title={title}
        aria-label={title}
      >
        <IconCake size={16} />
        {todayCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-300 px-1 text-[10px] font-black leading-none text-pink-950">
            {todayCount > 9 ? "9+" : todayCount}
          </span>
        ) : null}
      </button>

      <BirthdayUpcomingModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        birthdays={birthdays}
        daysAhead={daysAhead}
        isLoading={isLoading}
        isFetchingMore={isFetching && !isLoading}
        error={error}
        onLoadMore={() => setMonthsAhead((current) => current + 1)}
      />
    </>
  );
}
