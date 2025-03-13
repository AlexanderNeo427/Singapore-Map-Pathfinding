import Utils from "./Utils"
import { Position as DeckPosition } from "deck.gl"
import {
    GraphData, GraphNode, TemporalPath, TemporalPosition,
    PathfindingParameters, PathfindingResults, PathfindingAlgoType,
} from "./Declarations"
import { Feature, FeatureCollection, Position as GeoPosition, LineString } from "geojson"

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
        return {} as PathfindingResults
    }
    const allGraphNodes: Map<number, GraphNode> = params.graphData.allGraphNodes
    const adjacencyList: Map<number, Set<number>> = params.graphData.adjacencyList

    const pathfindResult = { // To be returned
        allTemporalPaths: [], finalPath: [], totalDuration: 0
    } as PathfindingResults
    const visitedNodes = new Set<GraphNode>()
    const queueOfPaths = new Array<Array<GraphNode>>()
    queueOfPaths.push([params.startNode])
    let startTime: number = 0

    while (queueOfPaths.length > 0) {
        const pathSoFar = queueOfPaths.shift() as GraphNode[]
        const nodeToProcess = pathSoFar[pathSoFar.length - 1] as GraphNode
        visitedNodes.add(nodeToProcess)

        let longestTravelTime: number = 0
        const neighbourIDs = adjacencyList.get(nodeToProcess.ID) as Set<number>
        for (const idOfNeighbour of neighbourIDs) {
            const neighbourNode = allGraphNodes.get(idOfNeighbour) as GraphNode
            if (!visitedNodes.has(neighbourNode)) {
                queueOfPaths.push([...pathSoFar, neighbourNode] as GraphNode[])

                const distToNeighbour = Utils.getNodeDistance(nodeToProcess, neighbourNode)
                const timeSeconds: number = Utils.distanceToTime(distToNeighbour)
                const endTime: number = startTime + timeSeconds
                longestTravelTime = Math.max(longestTravelTime, timeSeconds)

                pathfindResult.allTemporalPaths.push({
                    from: { pos: nodeToProcess.position, timeStamp: startTime },
                    to: { pos: neighbourNode.position, timeStamp: endTime },
                })

                if (neighbourNode === params.endNode) {  // Found!
                    pathSoFar.push(neighbourNode)
                    pathfindResult.finalPath = pathSoFar.map(node => node.position)

                    pathfindResult.totalDuration = (startTime + longestTravelTime)
                    return pathfindResult
                }
            }
        }
        startTime += longestTravelTime
    }
    return pathfindResult
}

export const convertDeckPositionsToTemporalPath = (
    positions: DeckPosition[], startTime: number
): TemporalPath[] => {
    const allTemporalPaths: TemporalPath[] = []

    let time: number = startTime
    for (let i = 0; i < (positions.length - 1); i++) {
        const distBetweenNodes: number = Utils.getDeckDistance(positions[i], positions[i + 1])
        const travelTime: number = distBetweenNodes / 0.000006

        allTemporalPaths.push({
            from: { pos: positions[i], timeStamp: time },
            to: { pos: positions[i + 1], timeStamp: (time + travelTime) }
        })
        time += travelTime
    }
    return allTemporalPaths
}

// export const AStar: PathfindingAlgoType = (
//     params: PathfindingParameters
// ): PathfindingResults => {

// }

// export const depthFirstSearch: PathfindingAlgoType = (
//     params: PathfindingParameters
// ): PathfindingResults => {
//     return dfsHelper(params)
// }

// const dfsHelper = (
//     params: PathfindingParameters, visitedIDs = new Set<number>(),
//     results = new PathfindingResults([], []), startTime: number = 0, depth = 0
// ): PathfindingResults => {

//     console.log("Depth: ", depth)
//     visitedIDs.add(params.startNode.ID)

//     // Base case
//     const allNeighbourIDs = params.graphData.adjacencyList.get(params.startNode.ID)
//     allNeighbourIDs?.forEach((idOfNeighbour: number) => {
//         const neighbourNode = params.graphData.allGraphNodes.get(idOfNeighbour) as GraphNode
//         const distToNeighbour = Utils.getNodeDistance(params.startNode, neighbourNode)
//         const timeToNeighbour = Utils.distanceToTime(distToNeighbour)

//         results.allTemporalPaths.push({
//             from: { pos: params.startNode.position, timeStamp: startTime },
//             to: { pos: params.endNode.position, timeStamp: (startTime + timeToNeighbour) }
//         })

//         if (idOfNeighbour === params.endNode.ID) { return results } // Found!

//         const paramsWithNewStartNode = {
//             ...params,
//             startNode: params.graphData.allGraphNodes.get(idOfNeighbour)
//         } as PathfindingParameters
//         return dfsHelper(
//             paramsWithNewStartNode, visitedIDs, results, (startTime + timeToNeighbour), depth + 1
//         )
//     })
//     return results
// }

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
