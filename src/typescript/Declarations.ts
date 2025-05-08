import { Position as DeckPosition } from 'deck.gl'

export enum PATHFINDING_ALGO {
    BFS,
    DFS,
    AStar,
    DIJKSTRA,
    BELLMAN_FORD,
}

export type PathfindingAlgoType = (
    params: PathfindingParameters
) => PathfindingResults

export type TemporalPosition = { pos: DeckPosition; timeStamp: number }

export type TemporalLine = { from: TemporalPosition; to: TemporalPosition }

export type StartEndPoint = { node: GraphNode; isStart: boolean }

export class GraphNode {
    public readonly ID: number
    public readonly position: DeckPosition

    constructor(nodeID: number, position: DeckPosition) {
        this.ID = nodeID
        this.position = position
    }
}

export class GraphData {
    public allGraphNodes: Map<number, GraphNode> = new Map()
    public adjacencyList: Map<number, Set<number>> = new Map()
}

export type PathfindingParameters = {
    startNode: GraphNode
    endNode: GraphNode
    graphData: GraphData
}

export type PathfindingResults = {
    allTemporalPaths: TemporalLine[]
    finalPath: DeckPosition[] | null
    totalDuration: number
}
