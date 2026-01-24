const IDL_ERRORS: Record<number, string> = {
  6000: "EventEnded",
  6001: "EventIdTooLong",
  6002: "NameTooLong",
  6003: "FirstNameTooLong",
  6004: "LastNameTooLong",
  6005: "ClassIdTooLong",
  6006: "SessionNotActive",
  6007: "InvalidSession",
  6008: "SessionEnded",
  6009: "SessionStillActive",
};

const ERROR_MESSAGES: Record<string, string> = {
  EventEnded: "This event has ended. Check-in is no longer available.",
  SessionEnded: "This session has ended. Check-in is no longer available.",
  SessionNotActive: "No active session. Please wait for the teacher to start.",
  InvalidSession: "Invalid session number. Please scan the QR code again.",
  SessionStillActive: "Session is still active. Please wait or end it first.",
  EventIdTooLong: "Event ID is too long (max 32 characters).",
  NameTooLong: "Event name is too long (max 64 characters).",
  FirstNameTooLong: "First name is too long (max 32 characters).",
  LastNameTooLong: "Last name is too long (max 32 characters).",
  ClassIdTooLong: "Class ID is too long (max 16 characters).",

  // Common runtime errors
  "already in use": "You've already checked in to this session.",
  "0x0": "You've already checked in to this session.",
  "Account does not exist": "Event or class not found. The link may be invalid.",
  insufficient: "Insufficient SOL balance. Please add funds to your wallet.",
  "0x1": "Insufficient SOL balance for transaction fees.",
  "User rejected": "Transaction cancelled.",
  "Blockhash not found": "Network timeout. Please try again.",
  "block height exceeded": "Transaction expired. Please try again.",
  "Transaction simulation failed": "Transaction failed. Please try again.",
  "failed to fetch": "Network error. Check your internet connection.",
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function getErrorMessage(error: unknown): string {
  const message = extractErrorMessage(error);

  // Match IDL errors by name or hex code (e.g., 0x1770 for 6000)
  for (const [codeStr, name] of Object.entries(IDL_ERRORS)) {
    const code = Number(codeStr);
    const hexCode = `0x${code.toString(16)}`;
    if (message.includes(name) || message.includes(hexCode)) {
      return ERROR_MESSAGES[name] || `Error: ${name}`;
    }
  }

  // Match by known string patterns
  for (const [pattern, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return friendly;
    }
  }

  return "Something went wrong. Please try again.";
}

export function isAlreadyCheckedInError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return message.includes("already in use") || message.includes("0x0");
}

export function isUserRejectionError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return message.includes("User rejected");
}