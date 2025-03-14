import Utils from "./Utils"
import { Position as DeckPosition } from "deck.gl"
import { MinPriorityQueue } from "@datastructures-js/priority-queue"
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
                visitedNodes.add(neighbourNode)

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

export const dijkstra: PathfindingAlgoType = (
    { startNode, endNode, graphData }: PathfindingParameters
): PathfindingResults => {
    // Initialize all costs to INFINITY, all predecessors to NULL
    const allMinCosts = new Map<GraphNode, number>()
    const predecessors = new Map<GraphNode, (GraphNode | null)>()
    graphData.allGraphNodes.forEach((node, _) => {
        allMinCosts.set(node, Infinity)
        predecessors.set(node, null)
    })

    // Initialize priority queue + first node (and its start cost to 0)
    const closedList = new Set<GraphNode>()
    const openList = new MinPriorityQueue<GraphNode>(node => {
        return allMinCosts.get(node) || Infinity
    })
    allMinCosts.set(startNode, 0)
    openList.enqueue(startNode)

    // Initialize return results
    const out = {
        allTemporalPaths: [], finalPath: null, totalDuration: 0
    } as PathfindingResults

    let startTime: number = 0
    while (!openList.isEmpty()) {
        const currNode = openList.dequeue() as GraphNode
        closedList.add(currNode)

        if (currNode === endNode) { // Found!
            out.finalPath = []
            out.totalDuration = startTime
            let nodeItr: (GraphNode | null) = currNode
            while (nodeItr !== null) {
                out.finalPath.unshift(nodeItr.position)
                nodeItr = predecessors.get(nodeItr) || null
            }
            return out
        }

        let longestTravelTime: number = 0
        const allNeighbourIDs = graphData.adjacencyList.get(currNode.ID) as Set<number>
        for (const neighbourID of allNeighbourIDs) {
            const neighbourNode = graphData.allGraphNodes.get(neighbourID) as GraphNode

            if (closedList.has(neighbourNode)) { continue }

            const oldCostToNeighbour = allMinCosts.get(neighbourNode) as number
            const distToNeighbour = Utils.getNodeDistance(currNode, neighbourNode)
            const computedCostToNeighbour = (
                allMinCosts.get(currNode) as number + distToNeighbour
            )

            // Visuals - push "TemporalPath" to return obj 'out'
            const timeToTravel: number = Utils.distanceToTime(distToNeighbour)
            longestTravelTime = Math.max(timeToTravel, longestTravelTime)
            out.allTemporalPaths.push({
                from: { pos: currNode.position, timeStamp: startTime }, 
                to: { pos: neighbourNode.position, timeStamp: (startTime + timeToTravel) }
            })

            // Relax 'cost to neighbour'
            if (computedCostToNeighbour < oldCostToNeighbour) {
                allMinCosts.set(neighbourNode, computedCostToNeighbour)
                predecessors.set(neighbourNode, currNode)

                if (openList.contains(node => node === neighbourNode)) {
                    const nodeToReinsert = openList.remove(node => node === neighbourNode)[0]  
                    allMinCosts.set(nodeToReinsert, computedCostToNeighbour)
                    openList.enqueue(nodeToReinsert)
                }
                else {
                    openList.push(neighbourNode)
                }
            }
        }
        startTime += longestTravelTime
    }
    return out
}

export const convertDeckPositionsToTemporalPath = (
    positions: DeckPosition[], startTime: number
): TemporalPath[] => {
    const allTemporalPaths: TemporalPath[] = []

    let time: number = startTime
    for (let i = 0; i < (positions.length - 1); i++) {
        const distBetweenNodes = Utils.getDeckDistance(positions[i], positions[i + 1])
        const travelTime = Utils.distanceToTime(distBetweenNodes, 0.6)

        allTemporalPaths.push({
            from: { pos: positions[i], timeStamp: time },
            to: { pos: positions[i + 1], timeStamp: (time + travelTime) }
        })
        time += travelTime
    }
    return allTemporalPaths
}

// For debugging
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
