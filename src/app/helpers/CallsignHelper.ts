export const checkIfCallsignIsRelief = (callsign: string): boolean => {
  return callsign.includes("_1_") || callsign.includes("__");
};

export const getCleanCallsign = (callsign: string): string => {
  return callsign.replace("_1_", "_").replace("__", "_");
};

/**
 * Takes a callsign like ZOA-ZSE, SEA_GND, or LFPG_N_TWR and returns the three separate parts:
 * Station: LFPG (or original callsign if no parts found)
 * Position: TWR (or empty string if no position found)
 * Subposition: N (or empty string if no sub-position found)
 * @param callsign The callsign to split apart
 * @returns An array of the three parts: [station, position, subPosition]
 */
export const getCallsignParts = (
  callsign: string,
): [string, string, string] => {
  const parts = callsign.split("_");

  // Handles cases like "ZOA-ZSE"
  if (parts.length === 1) {
    return [callsign, "", ""];
  }

  // Handles cases like "SEA_GND"
  if (parts.length === 2) {
    return [parts[0], parts[1], ""];
  }

  // Handles cases like "LFPG_N_TWR"
  return [parts[0], parts[2], parts[1]];
};
