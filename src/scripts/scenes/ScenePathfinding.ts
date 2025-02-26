import * as THREE from 'three'
import { Feature, FeatureCollection, LineString, Position } from 'geojson';
import sgGeoData from '../../assets/sg_geodata.json'
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import SceneBase from './SceneBase';
import { BoundingBox, SceneID } from '../Declarations';
import proj4 from 'proj4';

export default class ScenePathfinding extends SceneBase {
    _camera: THREE.OrthographicCamera
    _camControls: OrbitControls

    constructor(renderer: THREE.WebGLRenderer) {
        super()
        this._camera = new THREE.OrthographicCamera();
        this._camera.near = 1
        this._camera.far = 800
        this._camera.position.set(0, 0, 100)
        this._camera.updateProjectionMatrix()

        window.addEventListener('resize', () => {
            // Resizing the camera based on the canvas? 
        })
        this._camControls = this._setupCamControls(this._camera, renderer)
    }

    onCreate(): void {
        // Get bounding box from geoData
        const geoData = sgGeoData as FeatureCollection
        const geoDataBBox: BoundingBox = this._getBoundingBox(geoData)

        // Use prev bounding box to set camera view 
        const swProjected = proj4(
            'EPSG:4326', 'EPSG:3857', [geoDataBBox.min.x, geoDataBBox.min.y]
        )
        const neProjected = proj4(
            'EPSG:4326', 'EPSG:3857', [geoDataBBox.max.x, geoDataBBox.max.y]
        )
        this._camera.left = swProjected[0];
        this._camera.right = neProjected[0];
        this._camera.top = neProjected[1];
        this._camera.bottom = swProjected[1];

        // Derive camera position from prev bounding box
        this._camera.updateProjectionMatrix()
        // console.log("Init Cam Pos: ", this._camera.position)
        // console.log(
        //     "Init Cam View: ", this._camera.left, this._camera.bottom,
        //     this._camera.right, this._camera.top
        // )

        // Adding lights to the scene
        this.add(new THREE.AmbientLight(0xFFFFFF, 1))

        // Create road lines
        geoData.features.forEach((feature: Feature) => {
            if (feature.geometry.type !== 'LineString') {
                return
            }
            const coordinates: Position[] = feature.geometry.coordinates
            const points: THREE.Vector2[] = coordinates.map((coord: Position) => {
                const projectedCoord = proj4('EPSG:4326', 'EPSG:3857', coord);
                return new THREE.Vector2(projectedCoord[0], projectedCoord[1]);
            })

            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFF0000 })
            const line = new THREE.Line(lineGeometry, lineMaterial)
            this.add(line)
        })

        //==== Create some DEBUG mesh ====
        // const dx: number = geoDataBBox.computeLength()
        // const dy: number = geoDataBBox.computeHeight()
        // const cube = new THREE.Mesh(
        //     new THREE.BoxGeometry(0.01, 0.01),
        //     new THREE.MeshPhongMaterial({ color: 0xffacff })
        // )
        // cube.position.set(
        //     geoDataBBox.min.x + (dx * 0.5),
        //     geoDataBBox.min.y + (dy * 0.5), 
        //     0
        // )
        // this.add(cube)
    }

    onEnter(): void { }

    onTick(dt: number): void {
        this._camControls.update()
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