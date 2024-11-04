import { RadioType } from '../store/radioStore';

const endStations = ['GUARD', 'UNICOM'];

/**
 * Compares two radios to determine sort order. The currently connected station
 * will always sort to the front of the list. The remaining stations will sort
 * by station name (e.g. "LFPG"), then by position (e.g. "TWR"), then by
 * sub-position (e.g. "N")
 * @param a The first radio to compare
 * @param b The second radio to compare
 * @param connectedStationCallsign The callsign for the connected station
 * @returns -1 if a comes before b. 1 if b comes before a.
 */
export const radioCompare = (
  a: RadioType,
  b: RadioType,
  connectedStationCallsign: string
): number => {
  // The connected station always get sorted to the front of the list.
  if (a.callsign === connectedStationCallsign) return -1;
  if (b.callsign === connectedStationCallsign) return 1;

  // Always push "GUARD" and "UNICOM" to the end of the list
  const aIsEndStation = endStations.includes(a.station);
  const bIsEndStation = endStations.includes(b.station);

  if (aIsEndStation && !bIsEndStation) return 1;
  if (!aIsEndStation && bIsEndStation) return -1;

  // The station name takes sort priority
  const stationComparison = a.station.localeCompare(b.station);
  if (stationComparison !== 0) return stationComparison;

  // Subsort by position name if the station name is the same
  const positionComparison = a.position.localeCompare(b.position);
  if (positionComparison !== 0) return positionComparison;

  // Subsort by sub-position name if the position is the same
  return a.subPosition.localeCompare(b.subPosition);
};
