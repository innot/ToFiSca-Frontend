import {NormalizedPoint, PerforationLocation, Rect, ScanArea, Size} from "./types.ts";
import * as React from "react";
import {RefObject, useEffect, useState} from "react";

// Handy for casting simple json objects. Does hopefully cover all we need
// Source: https://www.reddit.com/r/typescript/comments/13mssvc/types_for_json_and_writing_json/
type JsonPrimitive = string | number | boolean | null;
type JsonArray = Json[];
type JsonObject = { [key: string]: Json };
type JsonComposite = JsonArray | JsonObject;
export type Json = JsonPrimitive | JsonComposite;


export function getNormalizedPointer(e: React.PointerEvent): NormalizedPoint {
    const {top, left, width, height} = e.currentTarget.getBoundingClientRect()
    const cmx = (e.clientX - left)
    const cmy = (e.clientY - top)
    const mx = cmx / width
    const my = cmy / height
    return {x: mx, y: my};
}

export function scanAreaToRect(scanArea: ScanArea, perfLoc: PerforationLocation): Rect {
    const ref = perfLoc.reference

    const top = ref.y + scanArea.ref_delta.dy;
    const bottom = top + scanArea.size.height;
    const left = ref.x + scanArea.ref_delta.dx;
    const right = left + scanArea.size.width;

    return {top, bottom, left, right};
}

export function scanAreaToScaledRect(scanArea: ScanArea, perfLoc: PerforationLocation, size: Size): Rect {
    let {top, bottom, left, right} = scanAreaToRect(scanArea, perfLoc);

    top *= size.height;
    bottom *= size.height;
    left *= size.width;
    right *= size.width;

    return {top, bottom, left, right}
}

export function rect2ScanArea(rect: Rect, perfLoc: PerforationLocation) {
    const ref = perfLoc.reference

    const dx = rect.left - ref.x
    const dy = rect.top - ref.y
    const width = rect.right - rect.left
    const height = rect.bottom - rect.top

    return {ref_delta: {dx, dy}, size: {width, height}}
}

export function scaledRect2ScanArea(rect: Rect, perfLoc: PerforationLocation, size: Size): ScanArea {
    const ref = perfLoc.reference

    const dx = (rect.left / size.width) - ref.x;
    const dy = (rect.top / size.height) - ref.y;
    const width = (rect.right - rect.left) / size.width;
    const height = (rect.bottom - rect.top) / size.height;

    return {ref_delta: {dx, dy}, size: {width, height}}
}

/**
 * Custom React hook to track the visibility of an element using the Intersection Observer API.
 */
export function useIsVisible(ref: RefObject<HTMLElement | null>) {
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
                if (entry) setIntersecting(entry.isIntersecting)
            }
        );
        if (ref.current) observer.observe(ref.current);

        return () => {
            observer.disconnect();
        };
    }, [ref]);

    return isIntersecting;
}
