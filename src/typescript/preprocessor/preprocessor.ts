import singaporeRoadData from '../../assets/roadData.json'
import { FeatureCollection } from 'geojson'
import { GraphNode } from '../Declarations'
import GraphHelpers from '../GraphHelpers'
import protobuf from 'protobufjs'
import path from 'path'
import fs from 'fs'

const preprocess = async (geoJson: FeatureCollection): Promise<void> => {
    const graphData = GraphHelpers.buildGraph(geoJson)
    const protoPath = path.resolve(__dirname, 'pathfinding.proto');

    const root = await protobuf.load(protoPath)
    const nodeType = root.lookupType('Pathfinding.Node')
    // const edgeType = root.lookupType('pathfinding.Edge')
    const graphType = root.lookupType('Pathfinding.Graph')

    const obj = nodeType.verify({ id: 59 })
    console.log(obj)
    const nodesPb = Array.from(graphData.allGraphNodes).map(([id, node]) => {
        const payload = {
            id: id.toString(),
            x: node.position[0].toString(),
            y: node.position[1].toString(),
        }
        const err = nodeType.verify({ asd: "asd " })
        if (err) {
            throw new Error(err)
        }
        return nodeType.create(payload)
    })

    // const edgesPb = Array.from(graphData.adjacencyList).map(([id, idOfNeighbours]) => {
    //     const data: protobuf.Message<{}>[] = []

    //     idOfNeighbours.forEach(neighbourID => {
    //         const firstPayload = {
    //             from_id: id,
    //             to_id: neighbourID
    //         }
    //         const secondPayload = {
    //             from_id: neighbourID,
    //             to_id: id
    //         }
    //     })

    //     return data
    // })

    // console.log(
    //     "Is Graph Verified: ",
    //     graphType.verify({ nodes: nodesPb })
    // )
    // const nodeBuffers = await getNodeBuffers(
    //     graphData.allGraphNodes,
    //     root.lookupType('Graph.Node')
    // )
    // const edgeBuffers = await getEdgeBuffers(
    //     graphData.adjacencyList,
    //     root.lookupType('Graph.Edge')
    // )
    // fs.writeFileSync(path.resolve(__dirname, ""), nodeBuffers)
}

try {
    preprocess(singaporeRoadData as FeatureCollection)
} catch (err) {
    console.error((err as Error).message)
}