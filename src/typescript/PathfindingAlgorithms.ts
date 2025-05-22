import { MinPriorityQueue } from '@datastructures-js/priority-queue'
import Utils from './Utils'
import {
    PathfindingParameters,
    Pathfinder,
    PathfindingResults,
    GraphNode,
} from './Declarations'

const BATCH_SIZE = 300

const Pathfinders: Record<string, Pathfinder> = {
    /**
     * ======================================================
     * ========= === BREADTH FIRST SEARCH ===================
     * ======================================================
     */
    breadthFirstSearch: async ({
        startNode,
        endNode,
        graphData,
    }: PathfindingParameters): Promise<PathfindingResults> => {
        let batchSizeProcessed = 0

        if (graphData.allGraphNodes.size === 0) {
            return {} as PathfindingResults
        }
        const allGraphNodes: Map<number, GraphNode> = graphData.allGraphNodes
        const adjacencyList: Map<number, Set<number>> = graphData.adjacencyList

        const pathfindResult = {
            // To be returned
            allTemporalPaths: [],
            finalPath: [],
            totalDuration: 0,
        } as PathfindingResults
        const visitedNodes = new Set<GraphNode>()
        const queueOfPaths = new Array<Array<GraphNode>>()
        queueOfPaths.push([startNode])
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
                    queueOfPaths.push([
                        ...pathSoFar,
                        neighbourNode,
                    ] as GraphNode[])
                    visitedNodes.add(neighbourNode)

                    const distToNeighbour = Utils.getNodeDistance(
                        nodeToProcess,
                        neighbourNode
                    )
                    const timeSeconds = Utils.distanceToTime(distToNeighbour)
                    const endTime = startTime + timeSeconds
                    longestTravelTime = Math.max(longestTravelTime, timeSeconds)

                    pathfindResult.allTemporalPaths.push({
                        from: {
                            pos: nodeToProcess.position,
                            timeStamp: startTime,
                        },
                        to: { pos: neighbourNode.position, timeStamp: endTime },
                    })

                    if (neighbourNode === endNode) {
                        // Found!
                        pathSoFar.push(neighbourNode)
                        pathfindResult.finalPath = pathSoFar.map(
                            node => node.position
                        )

                        pathfindResult.totalDuration =
                            startTime + longestTravelTime
                        return pathfindResult
                    }
                }
            }
            startTime += longestTravelTime

            if (++batchSizeProcessed > BATCH_SIZE) {
                batchSizeProcessed = 0
                await new Promise(resolve => setTimeout(resolve, 0))
            }
        }
        return pathfindResult
    },
    /**
     * ================================================
     * ================= DIJKSTRA =====================
     * ================================================
     */
    dijkstra: async ({
        startNode,
        endNode,
        graphData,
    }: PathfindingParameters): Promise<PathfindingResults> => {
        let batchSizeProcessed = 0

        // Initialize all costs to INFINITY, all predecessors to NULL
        const allMinCosts = new Map<GraphNode, number>()
        const predecessors = new Map<GraphNode, GraphNode | null>()
        graphData.allGraphNodes.forEach((node, _) => {
            allMinCosts.set(node, Infinity)
            predecessors.set(node, null)
        })

        // Initialize priority queue + first node (and its start cost to 0)
        const openList = new MinPriorityQueue<GraphNode>(node => {
            return allMinCosts.get(node) || Infinity
        })
        allMinCosts.set(startNode, 0)
        openList.enqueue(startNode)

        // Initialize return results
        const out = {
            allTemporalPaths: [],
            finalPath: null,
            totalDuration: 0,
        } as PathfindingResults

        let startTime: number = 0
        while (!openList.isEmpty()) {
            const currNode = openList.dequeue() as GraphNode
            if (currNode === endNode) {
                // Found!
                out.finalPath = []
                out.totalDuration = startTime
                let nodeItr: GraphNode | null = currNode
                while (nodeItr !== null) {
                    out.finalPath.unshift(nodeItr.position)
                    nodeItr = predecessors.get(nodeItr) || null
                }
                return out
            }

            let longestTravelTime: number = 0
            const allNeighbourIDs = graphData.adjacencyList.get(
                currNode.ID
            ) as Set<number>
            for (const neighbourID of allNeighbourIDs) {
                const neighbourNode = graphData.allGraphNodes.get(neighbourID) as GraphNode

                const oldCostToNeighbour = allMinCosts.get(neighbourNode) as number
                const distToNeighbour = Utils.getNodeDistance(
                    currNode,
                    neighbourNode
                )
                const computedCostToNeighbour =
                    (allMinCosts.get(currNode) as number) + distToNeighbour

                // Visuals - push "TemporalPath" to return obj 'out'
                const timeToTravel: number =
                    Utils.distanceToTime(distToNeighbour)
                longestTravelTime = Math.max(timeToTravel, longestTravelTime)
                out.allTemporalPaths.push({
                    from: { pos: currNode.position, timeStamp: startTime },
                    to: {
                        pos: neighbourNode.position,
                        timeStamp: startTime + timeToTravel,
                    },
                })

                // Relax 'cost to neighbour'
                if (computedCostToNeighbour < oldCostToNeighbour) {
                    allMinCosts.set(neighbourNode, computedCostToNeighbour)
                    predecessors.set(neighbourNode, currNode)

                    if (openList.contains(node => node === neighbourNode)) {
                        const nodeToReinsert = openList.remove(
                            node => node === neighbourNode
                        )[0]
                        allMinCosts.set(nodeToReinsert, computedCostToNeighbour)
                        openList.enqueue(nodeToReinsert)
                    } else {
                        openList.push(neighbourNode)
                    }
                }
            }
            startTime += longestTravelTime

            if (++batchSizeProcessed > BATCH_SIZE) {
                batchSizeProcessed = 0
                await new Promise(resolve => setTimeout(resolve, 0))
            }
        }
        return out
    },
    /**
     * ==============================================
     * ========= ======= A-STAR =====================
     * ==============================================
     */
    AStar: async ({
        startNode,
        endNode,
        graphData,
    }: PathfindingParameters): Promise<PathfindingResults> => {
        let batchSizeProcessed = 0

        // Initialize data needed for pathfinding
        const predecessors = new Map<GraphNode, GraphNode | null>()
        const gCosts = new Map<GraphNode, number>()
        graphData.allGraphNodes.forEach((node, _) => {
            predecessors.set(node, null)
            gCosts.set(node, Infinity)
        })

        // Initialize return data
        const out = {
            allTemporalPaths: [],
            finalPath: null,
            totalDuration: 0,
        } as PathfindingResults

        // Initialize open/close lists, starting node - Implicit f-cost calculation
        const priorityQueue = new MinPriorityQueue<GraphNode>(node => {
            return (
                (gCosts.get(node) as number) +
                Utils.getNodeDistance(node, endNode)
            )
        })
        gCosts.set(startNode, 0)
        priorityQueue.enqueue(startNode)

        let startTime: number = 0
        while (!priorityQueue.isEmpty()) {
            const currNode = priorityQueue.dequeue() as GraphNode // Retrieve min f-cost

            if (currNode === endNode) {
                // Found - reconstruct path and return
                out.finalPath = []
                let nodeItr: GraphNode | null = currNode
                while (nodeItr !== null) {
                    out.finalPath.unshift(nodeItr.position)
                    out.totalDuration = startTime
                    nodeItr = predecessors.get(nodeItr) || null
                }
                return out
            }

            const allNeighbours: GraphNode[] = (() => {
                const neighbourIDs = [
                    ...(graphData.adjacencyList.get(
                        currNode.ID
                    ) as Set<number>),
                ]
                return neighbourIDs.map(idOfNeighbour => {
                    return graphData.allGraphNodes.get(
                        idOfNeighbour
                    ) as GraphNode
                })
            })()

            let maxTravelTime: number = 0
            for (const neighbour of allNeighbours) {
                const distToNeighbour = Utils.getNodeDistance(
                    currNode,
                    neighbour
                )
                const gCostTentative =
                    (gCosts.get(currNode) as number) + distToNeighbour

                const timeToNeighbour = Utils.distanceToTime(distToNeighbour)
                maxTravelTime = Math.max(maxTravelTime, timeToNeighbour)
                out.allTemporalPaths.push({
                    from: { pos: currNode.position, timeStamp: startTime },
                    to: {
                        pos: neighbour.position,
                        timeStamp: startTime + timeToNeighbour,
                    },
                })

                if (gCostTentative < (gCosts.get(neighbour) as number)) {
                    gCosts.set(neighbour, gCostTentative)
                    predecessors.set(neighbour, currNode)

                    const nodeToReinsert: GraphNode | null =
                        priorityQueue.remove(node => {
                            return node === neighbour
                        })[0] || null

                    if (nodeToReinsert !== null) {
                        priorityQueue.enqueue(nodeToReinsert)
                    } else {
                        priorityQueue.enqueue(neighbour)
                    }
                }
            }
            startTime += maxTravelTime

            if (++batchSizeProcessed > BATCH_SIZE) {
                batchSizeProcessed = 0
                await new Promise(resolve => setTimeout(resolve, 0))
            }
        }
        return out
    },
    /**
     * ===================================================
     * ============== DEPTH-FIRST SEARCH =================
     * ===================================================
     */
    depthFirstSearch: async ({
        startNode,
        endNode,
        graphData,
    }: PathfindingParameters): Promise<PathfindingResults> => {
        let batchSizeProcessed = 0

        if (graphData.allGraphNodes.size === 0) {
            return {} as PathfindingResults
        }
        const allGraphNodes: Map<number, GraphNode> = graphData.allGraphNodes
        const adjacencyList: Map<number, Set<number>> = graphData.adjacencyList

        const pathfindResult = {
            allTemporalPaths: [],
            finalPath: [],
            totalDuration: 0,
        } as PathfindingResults

        const visitedNodes = new Set<GraphNode>()
        const stackOfPaths = new Array<Array<GraphNode>>()
        stackOfPaths.push([startNode])
        let startTime: number = 0

        while (stackOfPaths.length > 0) {
            const pathSoFar = stackOfPaths.pop() as GraphNode[]
            const nodeToProcess = pathSoFar[pathSoFar.length - 1] as GraphNode

            if (!visitedNodes.has(nodeToProcess)) {
                visitedNodes.add(nodeToProcess)

                let longestTravelTime: number = 0
                const neighbourIDs = adjacencyList.get(
                    nodeToProcess.ID
                ) as Set<number>

                for (const idOfNeighbour of neighbourIDs) {
                    const neighbourNode = allGraphNodes.get(
                        idOfNeighbour
                    ) as GraphNode
                    if (!visitedNodes.has(neighbourNode)) {
                        stackOfPaths.push([...pathSoFar, neighbourNode])

                        const distToNeighbour = Utils.getNodeDistance(
                            nodeToProcess,
                            neighbourNode
                        )
                        const timeSeconds: number =
                            Utils.distanceToTime(distToNeighbour)
                        const endTime: number = startTime + timeSeconds
                        longestTravelTime = Math.max(
                            longestTravelTime,
                            timeSeconds
                        )

                        pathfindResult.allTemporalPaths.push({
                            from: {
                                pos: nodeToProcess.position,
                                timeStamp: startTime,
                            },
                            to: {
                                pos: neighbourNode.position,
                                timeStamp: endTime,
                            },
                        })

                        if (neighbourNode === endNode) {
                            pathSoFar.push(neighbourNode)
                            pathfindResult.finalPath = pathSoFar.map(
                                node => node.position
                            )
                            pathfindResult.totalDuration = startTime + longestTravelTime
                            return pathfindResult
                        }
                    }
                }
                startTime += longestTravelTime

                if (++batchSizeProcessed > BATCH_SIZE) {
                    batchSizeProcessed = 0
                    await new Promise(resolve => setTimeout(resolve, 0))
                }
            }
        }
        return pathfindResult
    },
}

export default Pathfinders