import { RadioType } from '../store/radioStore';

const endStations = ['GUARD', 'ADVISORY'];

/**
 * Compares two radios to determine sort order. The currently connected station
 * will always sort to the front of the list. When enabled, AFV-ordered stations
 * will follow in the order defined by the AFV editor. The remaining stations
 * sort by station name (e.g. "LFPG"), then by position (e.g. "TWR"), then by
 * sub-position (e.g. "N").
 * @param a The first radio to compare
 * @param b The second radio to compare
 * @param connectedStationCallsign The callsign for the connected station
 * @param sortByAfvOrder Whether AFV editor order should take priority
 * @returns -1 if a comes before b. 1 if b comes before a.
 */
export const radioCompare = (
  a: RadioType,
  b: RadioType,
  connectedStationCallsign: string,
  sortByAfvOrder: boolean
): number => {
  // The connected station always gets sorted to the front of the list.
  const aIsConnectedStation = a.callsign === connectedStationCallsign;
  const bIsConnectedStation = b.callsign === connectedStationCallsign;
  if (aIsConnectedStation !== bIsConnectedStation) return aIsConnectedStation ? -1 : 1;

  // Always push "GUARD" and "ADVISORY" to the end of the list
  const aIsEndStation = endStations.includes(a.station);
  const bIsEndStation = endStations.includes(b.station);

  if (aIsEndStation && !bIsEndStation) return 1;
  if (!aIsEndStation && bIsEndStation) return -1;

  // Keep VCCS stations in the order defined by the AFV editor. Ordered stations
  // take priority over manually added or legacy stations without an AFV order.
  if (sortByAfvOrder) {
    if (a.afvOrder !== undefined && b.afvOrder !== undefined) {
      const afvOrderComparison = a.afvOrder - b.afvOrder;
      if (afvOrderComparison !== 0) return afvOrderComparison;
    } else if (a.afvOrder !== undefined) {
      return -1;
    } else if (b.afvOrder !== undefined) {
      return 1;
    }
  }

  // The station name takes sort priority
  const stationComparison = a.station.localeCompare(b.station);
  if (stationComparison !== 0) return stationComparison;

  // Subsort by position name if the station name is the same
  const positionComparison = a.position.localeCompare(b.position);
  if (positionComparison !== 0) return positionComparison;

  // Subsort by sub-position name if the position is the same
  return a.subPosition.localeCompare(b.subPosition);
};
