import { Position as DeckPosition } from "deck.gl"
import { Feature, FeatureCollection, Position as GeoPosition, LineString } from "geojson";

// const DeckGLOverlay: React.FC<DeckProps> = props => {
//    const map = useMap()
//    const overlay = useMemo(() => new GoogleMapsOverlay(props))
//
//    useEffect(() => {
//       overlay.setMap(map)
//       return () => overlay.setMap(null)
//    }, [map])
//
//    overlay.setProps(props)
//    return null
// }

export type FromToPair = { from: DeckPosition, to: DeckPosition }

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

export class GraphNode {
    public readonly ID: number
    public readonly position: DeckPosition

    constructor(nodeID: number, position: DeckPosition) {
        this.ID = nodeID
        this.position = position
    }
}

export class FrameData {
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
            const currNodeID: number = Utils.getGeoPosHash(allWayCoords[i])
            if (!allGraphNodes.has(currNodeID)) {
                const newCoords: DeckPosition = Utils.geoToDeckPos(allWayCoords[i])
                allGraphNodes.set(currNodeID, new GraphNode(currNodeID, newCoords))

                // Init 'neighbour IDs' set for 'currNodeID'
                adjacencyList.set(currNodeID, new Set())
            }

            // Lazily instantiate new graph node for 'otherNodeID' 
            // (assuming it doesn't exist yet)
            const otherNodeID: number = Utils.getGeoPosHash(allWayCoords[i + 1])
            if (!allGraphNodes.has(otherNodeID)) {
                const otherCoords: DeckPosition = Utils.geoToDeckPos(allWayCoords[i + 1])
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

export const breadthFirstSearch = (graphData: GraphData): FrameData[] => {
    if (graphData.allGraphNodes.size === 0) {
        return []
    }
    const visitedIDs = new Set<number>()
    const queueOfIDs = new Array<number>()
    const [[firstNodeID, _]] = graphData.adjacencyList.entries()
    queueOfIDs.push(firstNodeID)

    const allFrameData: FrameData[] = []
    while (queueOfIDs.length > 0) {
        const idToProcess = queueOfIDs.shift() as number
        visitedIDs.add(idToProcess)

        const neighbourIDs = graphData.adjacencyList.get(idToProcess) as Set<number>
        neighbourIDs.forEach((idOfNeighbour: number) => {
            if (!visitedIDs.has(idOfNeighbour)) {
                queueOfIDs.push(idOfNeighbour)
                allFrameData.push({ fromID: idToProcess, toID: idOfNeighbour })
            }
        })
    }
    return allFrameData
}

export const depthFirstSearch = (graphData: GraphData): FrameData[] => {
    if (graphData.allGraphNodes.size === 0) {
        return []
    }
    const [[firstNodeID, _]] = graphData.allGraphNodes.entries()
    const visitedIDs = new Set<number>()
    const allFrameData: FrameData[] = DFS(firstNodeID, graphData, visitedIDs)
    return allFrameData
} 

const DFS = (id: number, graphData: GraphData, visitedIDs: Set<number>): FrameData[] => {
    visitedIDs.add(id)
    const neighbourIDs = graphData.adjacencyList.get(id)
    if (!neighbourIDs || neighbourIDs.size === 0) {
        return []
    }

    const allFrameData: FrameData[] = []
    neighbourIDs.forEach((idOfNeighbour: number) => {
        if (visitedIDs.has(idOfNeighbour)) { return }

        allFrameData.push(...DFS(idOfNeighbour, graphData, visitedIDs))
        allFrameData.push({ fromID: id, toID: idOfNeighbour })
    })
    return allFrameData
}
