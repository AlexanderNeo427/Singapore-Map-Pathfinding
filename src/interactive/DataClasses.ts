import { Vector2 } from "three"

export class BoundingBox {
    public min: Vector2 = new Vector2()
    public max: Vector2 = new Vector2()

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
