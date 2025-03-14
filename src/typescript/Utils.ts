import { GraphNode } from "./Declarations";
import { Position as GeoPosition } from "geojson";
import { Position as DeckPosition } from "deck.gl";

const Utils = {
    hashCode(str: string): number {
        let hash: number = 0;
        for (let i = 0; i < str.length; i++) {
            hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        }
        return hash;
    },
    getGeoPosHash(geoCoord: GeoPosition): number {
        return this.hashCode(`${geoCoord[0]}, ${geoCoord[1]}`)
    },
    geoToDeckPos(geoPos: GeoPosition): DeckPosition { return [geoPos[0], geoPos[1]] },
    deckToGeoPos(deckPos: DeckPosition): DeckPosition { return [deckPos[0], deckPos[1]] },
    getNodeDistance(a: GraphNode, b: GraphNode): number {
        const dx: number = a.position[0] - b.position[0]
        const dy: number = a.position[1] - b.position[1]
        return Math.sqrt(dx * dx + dy * dy)
    },
    getDeckDistance(a: DeckPosition, b: DeckPosition): number {
        const dx: number = a[0] - b[0]
        const dy: number = a[1] - b[1]
        return Math.sqrt(dx * dx + dy * dy)
    },
    distanceToTime(dist: number, speedMultiplier: number = 1): number { 
        // return (dist / 0.000008) / speedMultiplier
        return 1
    },
    // distanceToTime(dist: number): number { return 1 },
}

export default Utils