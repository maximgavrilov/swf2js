interface CanvasRenderingContext2D {
    _offsetX: number;
    _offsetY: number;
}

interface HTMLMediaElement {
    loopCount: number;
}

interface Window {
    drawCall?(canvas: HTMLCanvasElement): void;
}
