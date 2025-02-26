import { Vector2 } from "three"

export enum MapProjections {
    Mercator
}

export enum SceneID {
    Pathfinding
}

export class BoundingBox {
    public min = new Vector2()
    public max = new Vector2()

    constructor(min: Vector2, max: Vector2) {
        this.min = min
        this.max = max
    }

    computeLength(): number {
        return Math.abs(this.max.x - this.min.x)
    }

    computeHeight(): number {
        return Math.abs(this.max.y - this.min.y)
    }
}
