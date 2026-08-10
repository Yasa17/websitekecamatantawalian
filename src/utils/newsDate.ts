const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const DEFAULT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

export const PORTAL_TIME_ZONE = 'Asia/Makassar';

const isLeapYear = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const parseIsoCalendarDate = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const match = ISO_CALENDAR_DATE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null;
  }

  return { year, month, day };
};

/**
 * Menghasilkan tanggal kalender WITA dalam format yang dipakai input date.
 * Nama lama dipertahankan agar pemanggil yang sudah ada tetap kompatibel.
 */
export const localIsoDate = (date = new Date()) => {
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PORTAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

/** Memastikan nilai adalah tanggal kalender ISO yang benar, bukan sekadar pola. */
export const isValidIsoCalendarDate = (value: unknown): value is string =>
  parseIsoCalendarDate(value) !== null;

const newsDateRank = (value: unknown) => {
  const parsed = parseIsoCalendarDate(value);
  return parsed
    ? parsed.year * 10_000 + parsed.month * 100 + parsed.day
    : Number.NEGATIVE_INFINITY;
};

/** Menentukan apakah berita sudah boleh muncul pada halaman publik. */
export const isNewsReleased = (
  news: { status?: string; datePublished?: string },
  today = localIsoDate(),
) => {
  if (news.status !== 'Published') return false;
  // Berita lama dapat belum memiliki tanggal yang valid. Tetap tampilkan agar
  // pembaruan ini tidak menyembunyikan konten yang sebelumnya sudah publik.
  if (!isValidIsoCalendarDate(news.datePublished)) return true;
  if (!isValidIsoCalendarDate(today)) return true;
  return newsDateRank(news.datePublished) <= newsDateRank(today);
};

/**
 * Mengurutkan salinan daftar berita dari tanggal terbaru tanpa mengubah array
 * sumber. Berita tanpa tanggal valid ditempatkan paling akhir dan urutan pada
 * tanggal yang sama tetap dipertahankan.
 */
export const sortNewsNewestFirst = <T extends { datePublished?: string }>(
  news: readonly T[],
): T[] =>
  news
    .map((item, index) => ({ item, index, rank: newsDateRank(item.datePublished) }))
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank < right.rank ? 1 : -1;
      return left.index - right.index;
    })
    .map(({ item }) => item);

/** Memformat tanggal berita dalam bahasa Indonesia tanpa pergeseran zona waktu. */
export const formatNewsDate = (
  value: unknown,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT_OPTIONS,
) => {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return 'Tanggal belum diatur';

  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
  calendarDate.setUTCHours(0, 0, 0, 0);

  return new Intl.DateTimeFormat('id-ID', {
    ...options,
    timeZone: 'UTC',
  }).format(calendarDate);
};
