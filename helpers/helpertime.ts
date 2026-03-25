import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export const formatFromNow = (date: Date | string | number): string => {
  return dayjs(date).fromNow();
};

export default { formatFromNow };
