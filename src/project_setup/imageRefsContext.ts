import {createContext, RefObject} from "react";

/**
 * The ImageRefsContext contains two references
 * - The Image element itself to e.g. read its natural size
 * - The Div encapsulating the image so overlays can be added
 */
export interface ImageRefObjects {
    imgDivRef: RefObject<HTMLDivElement>;
    imgageRef: RefObject<HTMLImageElement>;
}

export const ImageRefsContext = createContext<ImageRefObjects | null>(null)
