import { Position as DeckPosition } from 'deck.gl'
import Utils from './Utils'
import {
    TemporalPosition,
    TemporalLine,
    GraphData,
    GraphNode,
} from './Declarations'
import {
    Position as GeoPosition,
    FeatureCollection,
    LineString,
    Feature,
} from 'geojson'

const GraphHelpers = {
    // =====================================================
    // ================= BUILD GRAPH =======================
    // =====================================================
    buildGraph: (allFeatures: FeatureCollection): GraphData => {
        const allGraphNodes = new Map<number, GraphNode>()
        const adjacencyList = new Map<number, Set<number>>()

        allFeatures.features.forEach((feature: Feature) => {
            if (feature.geometry.type !== 'LineString') {
                return
            }

            const allWayCoords: GeoPosition[] = (feature.geometry as LineString)
                .coordinates
            for (let i = 0; i < allWayCoords.length - 1; i++) {
                // Lazily instantiate new graph node for 'currNodeID'
                // (assuming it doesn't exist yet)
                const currNodeID: number = Utils.getGeoPosHash(allWayCoords[i])
                if (!allGraphNodes.has(currNodeID)) {
                    const newCoords: DeckPosition = Utils.geoToDeckPos(
                        allWayCoords[i]
                    )
                    allGraphNodes.set(
                        currNodeID,
                        new GraphNode(currNodeID, newCoords)
                    )

                    // Init 'neighbour IDs' set for 'currNodeID'
                    adjacencyList.set(currNodeID, new Set())
                }

                // Lazily instantiate new graph node for 'otherNodeID'
                // (assuming it doesn't exist yet)
                const otherNodeID: number = Utils.getGeoPosHash(allWayCoords[i + 1])
                if (!allGraphNodes.has(otherNodeID)) {
                    const otherCoords: DeckPosition = Utils.geoToDeckPos(
                        allWayCoords[i + 1]
                    )
                    allGraphNodes.set(
                        otherNodeID,
                        new GraphNode(otherNodeID, otherCoords)
                    )

                    // Init 'neighbour IDs' set for 'otherNodeID'
                    adjacencyList.set(otherNodeID, new Set())
                }

                // Bi-directional ways
                adjacencyList.get(currNodeID)?.add(otherNodeID)
                adjacencyList.get(otherNodeID)?.add(currNodeID)
            }
        })
        return { allGraphNodes: allGraphNodes, adjacencyList: adjacencyList }
    },
    // ==============================================================
    // ========= CONVERT DECK POSITIONS TO TEMPORAL PATH ============
    // ==============================================================
    convertDeckPositionsToTemporalPath: (
        positions: DeckPosition[],
        startTime: number
    ): TemporalLine[] => {
        const allTemporalPaths: TemporalLine[] = []

        let time: number = startTime
        for (let i = 0; i < positions.length - 1; i++) {
            const distBetweenNodes = Utils.getDeckDistance(
                positions[i],
                positions[i + 1]
            )
            const travelTime = Utils.distanceToTime(distBetweenNodes, 0.2) // Lower multipler to slow down

            allTemporalPaths.push({
                from: { pos: positions[i], timeStamp: time },
                to: { pos: positions[i + 1], timeStamp: time + travelTime },
            })
            time += travelTime
        }
        return allTemporalPaths
    },
    // =====================================================
    // ================ GET RANDOM TRIP ====================
    // =====================================================
    getRandomTrip: (graphData: GraphData): TemporalLine[] => {
        type NullableGraphNode = GraphNode | null
        const getRandomNeighbour = (node: GraphNode): NullableGraphNode => {
            const neighbourIDs = graphData.adjacencyList.get(node.ID)
            if (
                !neighbourIDs ||
                neighbourIDs === undefined ||
                neighbourIDs.size === 0
            ) {
                return null
            }
            const randomIndex = Math.floor(Math.random() * neighbourIDs.size)
            const randomNeighbourID = Array.from(neighbourIDs)[randomIndex]
            return graphData.allGraphNodes.get(randomNeighbourID) || null
        }

        const allTrips: TemporalLine[] = []

        const [[_, firstNode]] = graphData.allGraphNodes.entries()
        let currNode: GraphNode = firstNode
        let nextNode: NullableGraphNode = null
        for (let i = 0; i < 50000; i++) {
            nextNode = getRandomNeighbour(currNode)
            if (nextNode === null) {
                break
            }

            const fromTP = {
                pos: currNode.position,
                timeStamp: i,
            } as TemporalPosition
            const toTP = {
                pos: nextNode.position,
                timeStamp: i + 1,
            } as TemporalPosition
            allTrips.push({ from: fromTP, to: toTP })
            currNode = nextNode as GraphNode
        }
        return allTrips
    }
}

export default GraphHelpers