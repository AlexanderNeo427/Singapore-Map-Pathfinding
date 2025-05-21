import { PATHFINDER_TYPE, PathfindingParameters } from "../typescript/Declarations"
import Pathfinders from "../typescript/PathfindingAlgorithms"
import { PathfindingAlgoMap } from "./MapRenderer"

export interface PathfindWorkerData {
    pathfindType: PATHFINDER_TYPE
    pathfindParams: PathfindingParameters
}

self.onmessage = async e => {
    const {
        pathfindType,
        pathfindParams
    } = e.data as PathfindWorkerData

    console.log("Le data has been received the worker")

    const pathfinder = PathfindingAlgoMap.get(pathfindType) || Pathfinders.BFS
    const pathfindRes = await pathfinder(pathfindParams)
    postMessage(pathfindRes)
}