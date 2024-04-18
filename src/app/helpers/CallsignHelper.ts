export const checkIfCallsignIsRelief = (callsign: string): boolean => {
    return callsign.includes("_1_") || callsign.includes("__");
};

export const getCleanCallsign = (callsign: string): string => {
    return callsign.replace("_1_", "_").replace("__", "_");
};