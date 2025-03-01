import { Position as DeckPosition } from "deck.gl"
import { Position as GeoPosition } from "geojson";

export const Utils = {
    hashCode(s: string): number {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(31, h) + s.charCodeAt(i) | 0;
        }
        return h;
    },
    getCoordHash(geoCoord: GeoPosition): number {
        return this.hashCode(`${geoCoord[0]}, ${geoCoord[1]}`)
    },
    toDeckPosition(geoPos: GeoPosition): DeckPosition {
        return [geoPos[0], geoPos[1]]
    },
    toGeoPosition(deckPos: DeckPosition): DeckPosition {
        return [deckPos[0], deckPos[1]]
    },
}


export class GraphNode {
    public readonly ID: number
    public readonly position: DeckPosition

    constructor(nodeID: number, position: DeckPosition) {
        this.ID = nodeID
        this.position = position
    }
}

