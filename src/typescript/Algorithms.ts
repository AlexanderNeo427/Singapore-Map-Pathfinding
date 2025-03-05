import { FrameData, GraphData, GraphNode } from "./Declarations"

export const breadthFirstSearch = (
    startNode: GraphNode, endNode: GraphNode, graphData: GraphData
): FrameData[] => {
    if (graphData.allGraphNodes.size === 0) {
        return []
    }
    const visitedIDs = new Set<number>()
    const queueOfIDs = new Array<number>()
    queueOfIDs.push(startNode.ID)

    const allFrameData: FrameData[] = []
    while (queueOfIDs.length > 0) {
        const idToProcess = queueOfIDs.shift() as number
        visitedIDs.add(idToProcess)

        if (idToProcess === endNode.ID) { return allFrameData }

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
