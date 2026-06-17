import {type CalendarDay as Day} from '@/interface';

export function getCallenderDay(month: number, year: number) {
  type DayObj = {day: number; month: number; year: number};
  let days: DayObj[] = [],
    prevDays: DayObj[] = [],
    nextDays: DayObj[] = [];
  let currentMonthIndex = month;
  let date = new Date(year, currentMonthIndex, 1);

  while (date.getMonth() === currentMonthIndex) {
    days.push({
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
    });
    date.setDate(date.getDate() + 1); // Move to the next day
  }

  // Only show prevDays if the first day of the month is not Monday
  const firstDayOfMonth = new Date(year, currentMonthIndex, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ...
  if (firstDayOfWeek !== 0) {
    const previousMonthLastDay = new Date(year, currentMonthIndex, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, currentMonthIndex, -i); // counts back from day 0
      prevDays.push({
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
  }

  // get days of month for next month
  // get number of days remaning
  const remaningDays = 42 - days.length - prevDays.length; // 42 = (6 X 7), because we are using 6 row calender format, 7 = week days

  const nextMonthFirstDay = new Date(year, currentMonthIndex + 1, 1);
  for (let i = 0; i < remaningDays; i++) {
    nextDays.push({
      day: nextMonthFirstDay.getDate(),
      month: nextMonthFirstDay.getMonth(),
      year: nextMonthFirstDay.getFullYear(),
    });
    nextMonthFirstDay.setDate(nextMonthFirstDay.getDate() + 1);
  }

  return {
    current: days,
    prev: prevDays,
    next: nextDays,
  };
}

export const isCurrentDay = (item: Day) => {
  const currentDate = new Date();
  return item.day === currentDate.getDate() && item.month === currentDate.getMonth() && item.year === currentDate.getFullYear();
};

export const isInRange = (item: Day, startDate: Date = new Date(), endDate?: Date) => {
  return (
    item.day >= startDate.getDate() &&
    item.day <= (endDate?.getDate() ?? startDate.getDate()) &&
    item.month >= startDate.getMonth() &&
    item.month <= (endDate?.getMonth() ?? startDate.getMonth()) &&
    item.year >= startDate.getFullYear() &&
    item.year <= (endDate?.getFullYear() ?? startDate.getFullYear())
  );
};

export const isEndDay = (item: Day, endDate: Date) => {
  if (endDate) {
    return item.day === endDate.getDate() && item.month === endDate.getMonth() && item.year === endDate.getFullYear();
  }
  return false;
};

export const isSelected = (item: Day, date: Date) => {
  return item.day === date.getDate() && item.month === date.getMonth() && item.year === date.getFullYear();
};