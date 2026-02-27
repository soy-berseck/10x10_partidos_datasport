import { MatchStatus } from "../types";

export function parseDateTime(dateString: string, timeString: string): string | null {
  // Assuming dateString is in a format like "Martes 10 marzo" and timeString is "8:00 a 6:00 pm"
  // We need to convert this to a parsable Date object, ideally ISO 8601 format.
  // For simplicity, let's assume the current year for now, or pass it as an argument.
  const currentYear = new Date().getFullYear(); // Or pass as a prop/argument

  const monthMap: { [key: string]: string } = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
  };

  const dateParts = dateString.split(' ');
  const day = dateParts[1];
  const month = monthMap[dateParts[2].toLowerCase()];

  if (!month) {
    console.error(`Unknown month in dateString: ${dateString}`);
    return null;
  }

  // Handle time range, for match start time, we'll take the first time
  const startTimeMatch = timeString.match(/(\d{1,2}:\d{2})\s*(am|pm)?/i);
  if (!startTimeMatch) {
    console.error(`Could not parse start time from timeString: ${timeString}`);
    return null;
  }

  let [_, time, ampm] = startTimeMatch;

  // Convert to 24-hour format if PM and not 12 PM
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm && ampm.toLowerCase() === 'pm' && hours < 12) {
    hours += 12;
  }
  if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
    hours = 0; // 12 AM is 00 hours
  }

  const formattedDate = `${currentYear}-${month}-${day.padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  try {
    const date = new Date(formattedDate);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid Date");
    }
    return date.toISOString();
  } catch (e) {
    console.error(`Failed to create Date object from ${formattedDate}:`, e);
    return null;
  }
}

export function generateMatchTimeSlots(startDate: string, endDate: string, startTime: string, endTime: string, intervalMinutes: number, breakMinutes: number = 0): string[] {
  const slots: string[] = [];
  const currentYear = new Date().getFullYear(); // Assuming current year

  const monthMap: { [key: string]: string } = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
  };

  const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!match) return null;
    let [_, hoursStr, minutesStr, ampm] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (ampm && ampm.toLowerCase() === 'pm' && hours < 12) {
      hours += 12;
    }
    if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
      hours = 0; // 12 AM is 00 hours
    }
    return { hours, minutes };
  };

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startParsedTime = parseTime(startTime);
  const endParsedTime = parseTime(endTime);

  if (!startParsedTime || !endParsedTime) {
    console.error("Invalid start or end time for slot generation.");
    return [];
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = d.getFullYear();

    let currentSlotTime = new Date(year, d.getMonth(), d.getDate(), startParsedTime.hours, startParsedTime.minutes);
    const endOfDayTime = new Date(year, d.getMonth(), d.getDate(), endParsedTime.hours, endParsedTime.minutes);

    while (currentSlotTime <= endOfDayTime) {
      slots.push(currentSlotTime.toISOString());
      currentSlotTime.setMinutes(currentSlotTime.getMinutes() + intervalMinutes + breakMinutes);
    }
  }

  return slots;
}


export function getNextAvailableTimeSlot(slots: string[], occupiedSlots: Set<string>): string | null {
  for (const slot of slots) {
    if (!occupiedSlots.has(slot)) {
      return slot;
    }
  }
  return null;
}

export function getMatchEndTime(startTime: string, durationMinutes: number): string {
  const date = new Date(startTime);
  date.setMinutes(date.getMinutes() + durationMinutes);
  return date.toISOString();
}

export const DEFAULT_MATCH_DURATION_MINUTES = 60; // Default to 60 minutes if not specified
export const DEFAULT_BREAK_MINUTES = 10; // Default break between matches
export const DEFAULT_MATCH_STATUS = MatchStatus.SCHEDULED;
