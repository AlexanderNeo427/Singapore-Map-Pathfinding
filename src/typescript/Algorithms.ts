import { Position as DeckPosition } from "deck.gl"
import { FrameData, GraphData, GraphNode, TemporalFromToPair, TemporalPosition } from "./Declarations"

export const breadthFirstSearch = (
    startNode: GraphNode, endNode: GraphNode, graphData: GraphData
): TemporalFromToPair[] => {
    if (graphData.allGraphNodes.size === 0) { return [] }

    const visitedIDs = new Set<number>()
    const queueOfIDs = new Array<number>()
    queueOfIDs.push(startNode.ID)

    const allFrameData: TemporalFromToPair[] = []
    let index: number = 0
    while (queueOfIDs.length > 0) {
        const idToProcess = queueOfIDs.shift() as number
        visitedIDs.add(idToProcess)

        if (idToProcess === endNode.ID) { return allFrameData } // Found!

        const neighbourIDs = graphData.adjacencyList.get(idToProcess) as Set<number>
        neighbourIDs.forEach((idOfNeighbour: number) => {
            if (!visitedIDs.has(idOfNeighbour)) {
                queueOfIDs.push(idOfNeighbour)

                const fromPos = graphData.allGraphNodes.get(idToProcess)?.position
                const toPos = graphData.allGraphNodes.get(idOfNeighbour)?.position
                allFrameData.push({
                    from: { pos: fromPos as DeckPosition, timeStamp: index },
                    to: { pos: toPos as DeckPosition, timeStamp: (index + 1) },
                })
                index++
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

export const getRandomTrip = (graphData: GraphData): TemporalFromToPair[] => {
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

    const allTrips: TemporalFromToPair[] = []

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
