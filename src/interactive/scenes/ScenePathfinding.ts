import * as THREE from 'three'
import { Feature, FeatureCollection, LineString, Position } from 'geojson';
import sgGeoData from '../assets/sg_geodata.json'
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import SceneBase from './SceneBase';
import { SceneID } from '../SceneManager';
import { BoundingBox } from '../DataClasses';

export default class ScenePathfinding extends SceneBase {
    _camera: THREE.OrthographicCamera
    _camControls: OrbitControls

    constructor(renderer: THREE.WebGLRenderer) {
        super()
        this._camera = new THREE.OrthographicCamera(0, 100, 90, 0, 0.1, 100);
        this._camera.position.set(0, 0, 0)
        // window.addEventListener('resize', () => {
        //     this._camera = new THREE.OrthographicCamera(0, 1000, 800, 0, 0.1, 100);
        // })

        this._camControls = this._setupCamControls(this._camera, renderer)
    }

    onCreate(): void {
        // Get bounding box from geoData
        // const geoData = sgGeoData as FeatureCollection
        // const geoDataBBox: BoundingBox = this._getBoundingBox(geoData)

        // Use prev bounding box to set camera view
        // this._camera.left = geoDataBBox.min.x
        // this._camera.right = geoDataBBox.max.x
        // this._camera.top = geoDataBBox.max.y
        // this._camera.bottom = geoDataBBox.min.y

        // Derive camera position from prev bounding box
        // const newCamPos: THREE.Vector2 = this._getBBoxCenter(geoDataBBox)
        // this._camera.position.setX(newCamPos.x)
        // this._camera.position.setY(newCamPos.y)
        // this._camera.position.setZ(0)

        // Create road lines
        // geoData.features.forEach((feature: Feature) => {
        //     if (feature.geometry.type !== 'LineString') {
        //         return
        //     }
        //     const coordinates: Position[] = feature.geometry.coordinates
        //     const points: THREE.Vector2[] = coordinates.map((coord: Position) => {
        //         const px = coord[0] 
        //         const py = coord[1] 
        //         return new THREE.Vector2(px, py)
        //     })

        //     const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
        //     const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFF0000 })
        //     const line = new THREE.Line(lineGeometry, lineMaterial)
        //     this.add(line)
        // })

        // Create some DEBUG mesh
        const meshCube = new THREE.Mesh(
            new THREE.BoxGeometry(10, 5, 10),
            new THREE.MeshBasicMaterial({ color: 0x00FF00 })
        )
        meshCube.position.set(0, 0, 10)
        this.add(meshCube)

        this.add(new THREE.AmbientLight(0xFFFFFF, 1))
    }

    onEnter(): void { }

    onTick(dt: number): void {
        this._camControls.update()
        // console.log("Pos: ", this._camera.position)
        // console.log("View: ", this._camera.left, this._camera.right)
        // console.log(
        //     this._camera.left, this._camera.bottom,
        //     this._camera.right, this._camera.top,
        // )
    }

    onExit(): void { }

    onDestroy(): void { }

    getCamera(): THREE.Camera {
        return this._camera
    }

    getSceneID(): SceneID {
        return SceneID.Pathfinding
    }

    _setupCamControls(camera: THREE.Camera, renderer: THREE.WebGLRenderer): OrbitControls {
        const camControls = new OrbitControls(camera, renderer.domElement)
        camControls.enableRotate = false
        camControls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY
        }
        camControls.panSpeed = 1
        camControls.zoomSpeed = 1.2
        camControls.position0.set(0, 0, 100)
        return camControls
    }

    _getBoundingBox(geoData: FeatureCollection): BoundingBox {
        const min = new THREE.Vector2(Infinity, Infinity)
        const max = new THREE.Vector2(-Infinity, -Infinity)
        geoData.features.forEach((feature: Feature) => {
            const coords: Position[] = (feature.geometry as LineString)?.coordinates
            if (!coords) {
                return
            }
            coords.forEach((pos: Position) => {
                const px: number = pos[0]
                const py: number = pos[1]

                min.x = Math.min(min.x, px)
                min.y = Math.min(min.y, py)
                max.x = Math.max(max.x, px)
                max.y = Math.max(max.y, py)
            })
        })
        return new BoundingBox(min, max)
    }

    _getBBoxCenter(bbox: BoundingBox): THREE.Vector2 {
        const dx: number = bbox.computeLength()
        const dy: number = bbox.computeHeight()
        return new THREE.Vector2(
            bbox.min.x + (dx * 0.5),
            bbox.min.y + (dy * 0.5)
        )
    }
}