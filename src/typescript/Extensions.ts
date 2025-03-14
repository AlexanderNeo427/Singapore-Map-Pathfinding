import { LayerExtension } from "deck.gl";

export class GlowExtension extends LayerExtension {
    getShaders() {
        return {
            inject: {
                'fs:DECKGL_FILTER_COLOR': `
            // Use the distance to the center to create a glow effect
            // The 0.5 is the center of the geometry cause it goes from 0 to 1
            // we want to make the glow effect stronger the closer we are to the center so we use abs(x - 0.5)
            float distanceToCenter = abs(geometry.uv.x - 0.5);
  
            // and we want a bigger area than just the center so we exclude the range from 0.25 to 0.75
            float alpha = distanceToCenter < 0.25 ? 1.0 : 1.0 - distanceToCenter;
  
            // Set the color with red and use the calculated alpha
            color = vec4(color.r, color.g, color.b, alpha);
        `,
            },
        };
    }
}