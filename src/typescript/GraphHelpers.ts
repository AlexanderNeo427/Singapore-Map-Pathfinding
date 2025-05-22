import { Position as DeckPosition } from 'deck.gl'
import { PROTOBUF_PARAMS } from './Globals'
import protoFile from './pathfinding.proto'
import protobuf from 'protobufjs'
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

interface PbNode {
    id: number
    x: number
    y: number
}

interface PbEdge {
    fromID: number
    toID: number
}

interface PbGraph {
    nodes: PbNode[]
    edges: PbEdge[]
}

const GraphHelpers = {
    buildGraphFromBinary: async (binGraphDataURL: string): Promise<GraphData> => {
        const graphData = new GraphData()
        graphData.allGraphNodes = new Map()
        graphData.adjacencyList = new Map()

        const root = await protobuf.load(protoFile)
        const graphType = root.lookupType(PROTOBUF_PARAMS.GRAPH_TYPE)

        const response = await fetch(binGraphDataURL)
        if (!response.ok) {
            throw new Error()
        }

        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const deserializedGraph = graphType.decode(uint8Array) as unknown as PbGraph

        if (deserializedGraph.nodes) {
            deserializedGraph.nodes.forEach(node => {
                graphData.allGraphNodes.set(
                    node.id,
                    new GraphNode(node.id, [node.x, node.y])
                )
            })
        }

        if (deserializedGraph.edges) {
            deserializedGraph.edges.forEach(edge => {
                if (!graphData.adjacencyList.has(edge.fromID)) {
                    graphData.adjacencyList.set(edge.fromID, new Set<number>());
                }
                graphData.adjacencyList.get(edge.fromID)?.add(edge.toID);
            });
        }

        return graphData
    },
    // =====================================================
    // ================= BUILD GRAPH =======================
    // =====================================================
    buildGraph: (allFeatures: FeatureCollection): GraphData => {
        let nextAvailableID = -1000000000
        const nodeIdMap = new Map<string, number>()

        const allGraphNodes = new Map<number, GraphNode>()
        const adjacencyList = new Map<number, Set<number>>()

        allFeatures.features.forEach((feature: Feature) => {
            if (!feature.geometry ||
                !feature.geometry.type ||
                feature.geometry.type !== 'LineString') {
                return
            }
            const lineString = feature.geometry as LineString
            if (!lineString.coordinates) {
                return
            }

            const allWayCoords = lineString.coordinates
            for (let i = 0; i < allWayCoords.length - 1; i++) {
                // Lazily instantiate new graph node for 'currNodeID'
                // (assuming it doesn't exist yet)
                const geoPosStr = Utils.getGeoPosStr(allWayCoords[i])
                if (!nodeIdMap.has(geoPosStr)) {
                    nodeIdMap.set(geoPosStr, nextAvailableID++)
                }
                const nodeID = nodeIdMap.get(geoPosStr) as number

                if (!allGraphNodes.has(nodeID)) {
                    const newCoords: DeckPosition = Utils.geoToDeckPos(
                        allWayCoords[i]
                    )
                    allGraphNodes.set(
                        nodeID,
                        new GraphNode(nodeID, newCoords)
                    )

                    // Init 'neighbour IDs' set for 'currNodeID'
                    adjacencyList.set(nodeID, new Set())
                }

                // Lazily instantiate new graph node for 'otherNodeID'
                // (assuming it doesn't exist yet)
                const otherGeoPosStr = Utils.getGeoPosStr(allWayCoords[i + 1])
                if (!nodeIdMap.has(otherGeoPosStr)) {
                    nodeIdMap.set(otherGeoPosStr, nextAvailableID++)
                }
                const otherNodeID = nodeIdMap.get(otherGeoPosStr) as number
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
                adjacencyList.get(nodeID)?.add(otherNodeID)
                adjacencyList.get(otherNodeID)?.add(nodeID)
            }
        })
        return { allGraphNodes: allGraphNodes, adjacencyList: adjacencyList }
    },
    // =====================================================
    // ================= BUILD GRAPH =======================
    // =====================================================
    geoJsonToInternal: (allFeatures: FeatureCollection): GraphData => {
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