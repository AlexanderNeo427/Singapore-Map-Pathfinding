import { Position as DeckPosition } from "deck.gl"
import { Feature, FeatureCollection, Position as GeoPosition, LineString } from "geojson";
import { Utils } from "./Utils";

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

export type TemporalPosition = { pos: DeckPosition, timeStamp: number }

export type TemporalFromToPair = { from: TemporalPosition, to: TemporalPosition }

export type FromToPair = { from: DeckPosition, to: DeckPosition }

export type StartEndPoint = { node: GraphNode, isStart: boolean }

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

export const createGraphData = (allFeatures: FeatureCollection): GraphData => {
    const allGraphNodes = new Map<number, GraphNode>()
    const adjacencyList = new Map<number, Set<number>>()

    allFeatures.features.forEach((feature: Feature) => {
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

