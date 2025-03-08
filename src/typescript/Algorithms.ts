import Utils from "./Utils"
import { Position as DeckPosition } from "deck.gl"
import {
    PathfindingParameters, PathfindingResults,
    GraphData, GraphNode, TemporalPath, TemporalPosition,
    PathfindingAlgoType,
} from "./Declarations"
import { Feature, FeatureCollection, Position as GeoPosition, LineString } from "geojson"

const UNITS_PER_THOUSAND_MS: number = 0.000008 // Speed

export const buildGraph = (allFeatures: FeatureCollection): GraphData => {
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

export const breadthFirstSearch: PathfindingAlgoType = (
    params: PathfindingParameters
): PathfindingResults => {

    if (params.graphData.allGraphNodes.size === 0) {
        return new PathfindingResults([], [])
    }
    const allGraphNodes = params.graphData.allGraphNodes
    const adjacencyList = params.graphData.adjacencyList
    const startNode = params.startNode
    const endNode = params.endNode

    const visitedIDs = new Set<number>()
    const queueOfIDs = new Array<number>()
    queueOfIDs.push(startNode.ID)

    const allPaths: TemporalPath[] = []
    const finalPath: DeckPosition[] = []

    let startTime: number = 0

    while (queueOfIDs.length > 0) {
        const idToProcess = queueOfIDs.shift() as number
        visitedIDs.add(idToProcess)

        if (idToProcess === endNode.ID) { // Found!
            return new PathfindingResults(allPaths, finalPath)
        }

        let longestTravelTime: number = 0
        const neighbourIDs = adjacencyList.get(idToProcess) as Set<number>
        neighbourIDs.forEach((idOfNeighbour: number) => {
            if (!visitedIDs.has(idOfNeighbour)) {
                queueOfIDs.push(idOfNeighbour)

                const a = allGraphNodes.get(idToProcess) as GraphNode
                const b = allGraphNodes.get(idOfNeighbour) as GraphNode
                const distance: number = Utils.getNodeDistance(a, b)

                const timeSeconds: number = Utils.distanceToTime(distance)
                const endTime: number = startTime + timeSeconds
                longestTravelTime = Math.max(longestTravelTime, timeSeconds)

                allPaths.push({
                    from: { pos: a.position, timeStamp: startTime },
                    to: { pos: b.position, timeStamp: endTime },
                })
            }
        })
        startTime += longestTravelTime
    }
    return new PathfindingResults(allPaths, finalPath)
}

export const depthFirstSearch: PathfindingAlgoType = (
    params: PathfindingParameters
): PathfindingResults => {
    return dfsHelper(params)
}

const dfsHelper = (
    params: PathfindingParameters, visitedIDs = new Set<number>(),
    results = new PathfindingResults([], []), startTime: number = 0, depth = 0
): PathfindingResults => {

    console.log("Depth: ", depth)
    visitedIDs.add(params.startNode.ID)

    // Base case
    const allNeighbourIDs = params.graphData.adjacencyList.get(params.startNode.ID)
    allNeighbourIDs?.forEach((idOfNeighbour: number) => {
        const neighbourNode = params.graphData.allGraphNodes.get(idOfNeighbour) as GraphNode
        const distToNeighbour = Utils.getNodeDistance(params.startNode, neighbourNode)
        const timeToNeighbour = Utils.distanceToTime(distToNeighbour)

        results.allTemporalPaths.push({
            from: { pos: params.startNode.position, timeStamp: startTime },
            to: { pos: params.endNode.position, timeStamp: (startTime + timeToNeighbour) }
        })

        if (idOfNeighbour === params.endNode.ID) { // Found! 
            return results
        }

        const paramsWithNewStartNode = {
            ...params,
            startNode: params.graphData.allGraphNodes.get(idOfNeighbour)
        } as PathfindingParameters
        return dfsHelper(
            paramsWithNewStartNode, visitedIDs, results, (startTime + timeToNeighbour), depth + 1
        )
    })
    return results
}

export const getRandomTrip = (graphData: GraphData): TemporalPath[] => {
    type NullableGraphNode = GraphNode | null
    const getRandomNeighbour = (node: GraphNode): NullableGraphNode => {
        const neighbourIDs = graphData.adjacencyList.get(node.ID)
        if (!neighbourIDs || neighbourIDs === undefined || neighbourIDs.size === 0) {
            return null
        }
        const randomIndex = Math.floor(Math.random() * neighbourIDs.size)
        const randomNeighbourID = Array.from(neighbourIDs)[randomIndex]
        return graphData.allGraphNodes.get(randomNeighbourID) || null
    }

    const allTrips: TemporalPath[] = []

    const [[_, firstNode]] = graphData.allGraphNodes.entries()
    let currNode: GraphNode = firstNode
    let nextNode: NullableGraphNode = null
    for (let i = 0; i < 50000; i++) {
        nextNode = getRandomNeighbour(currNode)
        if (nextNode === null) { break }

        const fromTP = { pos: currNode.position, timeStamp: i } as TemporalPosition
        const toTP = { pos: nextNode.position, timeStamp: (i + 1) } as TemporalPosition
        allTrips.push({ from: fromTP, to: toTP })
        currNode = nextNode as GraphNode
    }
    return allTrips
}
