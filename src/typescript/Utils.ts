import { Position as DeckPosition } from "deck.gl";
import { Position as GeoPosition } from "geojson";

export const Utils = {
    hashCode(s: string): number {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(31, h) + s.charCodeAt(i) | 0;
        }
        return h;
    },
    getGeoPosHash(geoCoord: GeoPosition): number {
        return this.hashCode(`${geoCoord[0]}, ${geoCoord[1]}`)
    },
    geoToDeckPos(geoPos: GeoPosition): DeckPosition { return [geoPos[0], geoPos[1]] },
    deckToGeoPos(deckPos: DeckPosition): DeckPosition { return [deckPos[0], deckPos[1]] },
}