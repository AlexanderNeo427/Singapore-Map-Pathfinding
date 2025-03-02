import { Deck, Position as DeckPosition } from "deck.gl"
import { Feature, FeatureCollection, Position as GeoPosition, LineString } from "geojson";

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
    toDeckPosition(geoPos: GeoPosition): DeckPosition { return [geoPos[0], geoPos[1]] },
    toGeoPosition(deckPos: DeckPosition): DeckPosition { return [deckPos[0], deckPos[1]] },
}

export class GraphNode {
    public readonly ID: number
    public readonly position: DeckPosition

    constructor(nodeID: number, position: DeckPosition) {
        this.ID = nodeID
        this.position = position
    }
}

export class BfsFrameData {
    public readonly fromID: number
    public readonly toID: number

    constructor(fromID: number, toID: number) {
        this.fromID = fromID
        this.toID = toID
    }
}

export class GraphData {
    public allGraphNodes: Map<number, GraphNode> = new Map()
    public adjacencyList: Map<number, Set<number>> = new Map()
}

export const createGraphData = (alLFeatures: FeatureCollection): GraphData => {
    const allGraphNodes = new Map<number, GraphNode>()
    const adjacencyList = new Map<number, Set<number>>()

    alLFeatures.features.forEach((feature: Feature) => {
        if (feature.geometry.type !== 'LineString') { return }

        const allWayCoords: GeoPosition[] = (feature.geometry as LineString).coordinates
        for (let i = 0; i < (allWayCoords.length - 1); i++) {

            // Lazily instantiate new graph node for 'currNodeID'
            // (assuming it doesn't exist yet)
            const currNodeID: number = Utils.getCoordHash(allWayCoords[i])
            if (!allGraphNodes.has(currNodeID)) {
                const newCoords: DeckPosition = Utils.toDeckPosition(allWayCoords[i])
                allGraphNodes.set(currNodeID, new GraphNode(currNodeID, newCoords))

                // Init 'neighbour IDs' set for 'currNodeID'
                adjacencyList.set(currNodeID, new Set())
            }

            // Lazily instantiate new graph node for 'otherNodeID' 
            // (assuming it doesn't exist yet)
            const otherNodeID: number = Utils.getCoordHash(allWayCoords[i + 1])
            if (!allGraphNodes.has(otherNodeID)) {
                const otherCoords: DeckPosition = Utils.toDeckPosition(allWayCoords[i + 1])
                allGraphNodes.set(otherNodeID, new GraphNode(otherNodeID, otherCoords))

                // Init 'neighbour IDs' set for 'otherNodeID'
                adjacencyList.set(otherNodeID, new Set())
            }

            // Bi-directional ways
            adjacencyList.get(currNodeID)?.add(otherNodeID)
            adjacencyList.get(otherNodeID)?.add(currNodeID)
        }
    })
    return { allGraphNodes: allGraphNodes, adjacencyList: adjacencyList }
}

export const breadthFirstSearch = (graphData: GraphData): BfsFrameData[] => {
    if (graphData.allGraphNodes.size === 0) {
        return []
    }
    const visitedIDs = new Set<number>()
    const queueOfIDs = new Array<number>()
    const [[firstNodeID, _]] = graphData.adjacencyList.entries()
    queueOfIDs.push(firstNodeID)
    let prevIdToProcess: number = firstNodeID

    const allFrameData: BfsFrameData[] = []
    while (queueOfIDs.length > 0) {
        const idToProcess = queueOfIDs.shift() as number
        visitedIDs.add(idToProcess)

        const neighbourIDs = graphData.adjacencyList.get(idToProcess) as Set<number>
        neighbourIDs.forEach((idOfNeighbour: number) => {
            if (!visitedIDs.has(idOfNeighbour)) {
                queueOfIDs.push(idOfNeighbour)
            }
        })

        if (idToProcess !== prevIdToProcess) {
            allFrameData.push(new BfsFrameData(prevIdToProcess, idToProcess))
            prevIdToProcess = idToProcess
        }
    }
    return allFrameData
}
