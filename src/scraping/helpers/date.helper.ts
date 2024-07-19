import { parse } from 'date-fns';

export const formatDate = (date: string, time: string): Date => {
  const combinedDateTime = `${date} ${time}`;
  // Live score shows the hour in an ambiguous format, so we need to add the year to the date
  // also we are using UTC time to avoid timezone issues
  return parse(combinedDateTime, 'dd MMM HH:mm', new Date());
};
