import singaporeRoadData from '../../assets/roadData.json'
import { PROTOBUF_PARAMS } from '../Globals'
import { FeatureCollection } from 'geojson'
import GraphHelpers from '../GraphHelpers'
import protobuf from 'protobufjs'
import path from 'path'
import fs from 'fs'

const preprocess = async (geoJson: FeatureCollection): Promise<void> => {
    const graphData = GraphHelpers.buildGraph(geoJson)
    const protoPath = path.resolve(__dirname, PROTOBUF_PARAMS.NAME)

    const root = await protobuf.load(protoPath)
    const nodeType = root.lookupType(PROTOBUF_PARAMS.NODE_TYPE)
    const edgeType = root.lookupType(PROTOBUF_PARAMS.EDGE_TYPE)
    const graphType = root.lookupType(PROTOBUF_PARAMS.GRAPH_TYPE)

    const pbNodes = Array.from(graphData.allGraphNodes).map(([id, node]) => {
        const payload = {
            id: id.toString(),
            x: node.position[0].toString(),
            y: node.position[1].toString(),
        }
        return nodeType.create(payload)
    })

    const pbEdges = (
        (): protobuf.Message[] => {
            const arr: protobuf.Message[] = []
            graphData.adjacencyList.forEach((allNeighbourIDs, nodeID) => {
                allNeighbourIDs.forEach(neighbourID => {
                    const payload = {
                        fromID: nodeID.toString(),
                        toID: neighbourID.toString()
                    }
                    const edge = edgeType.create(payload)
                    arr.push(edge)
                })
            })
            return arr
        }
    )()

    const pbGraph = graphType.create({
        nodes: pbNodes,
        edges: pbEdges
    })

    const binaryData = graphType.encode(pbGraph).finish()
    const outputPath = path.resolve(__dirname, PROTOBUF_PARAMS.OUTPUT_NAME)
    fs.writeFileSync(outputPath, binaryData)

    console.log("Successfully written data to: ", outputPath)
}

// const deserialize = async (): Promise<void> => {
//     const protoPath = path.resolve(__dirname, PROTO_NAME)
//     const root = await protobuf.load(protoPath)
//     const graphType = root.lookupType(GRAPH_TYPE)

//     const inputPath = path.resolve(__dirname, OUTPUT_NAME)
//     const binaryData = fs.readFileSync(inputPath)

//     const deserializedGraph = graphType.decode(binaryData)
//     console.log("Deserialized Graph: ", deserializedGraph)
// }

try {
    await preprocess(singaporeRoadData as FeatureCollection)
} catch (err) {
    console.error((err as Error).message)
}