import {expect, test} from 'vitest'
import {PerforationLocation, Rect, ScanArea, Size} from "./types.ts";
import {rect2ScanArea, scaledRect2ScanArea, scanAreaToRect, scanAreaToScaledRect} from "./common.ts";

test("scanAreaToRect", () => {
    const perfLoc: PerforationLocation = {
        top_edge: 0.1,
        bottom_edge: 0.3,
        inner_edge: 0.1,
        outer_edge: 0
    }
    const s: ScanArea = {perf_ref: perfLoc, ref_delta: {dx: 0.3, dy: 0.4}, size: {width: 0.5, height: 0.6}}

    const r1: Rect = scanAreaToRect(s)

    expect(r1.top).toBeCloseTo(0.6, 0)
    expect(r1.bottom).toBeCloseTo(1.2, 0)
    expect(r1.left).toBeCloseTo(0.4, 0)
    expect(r1.right).toBeCloseTo(0.9, 0)

    // round trip
    const s1: ScanArea = rect2ScanArea(r1, perfLoc)
    expect(s1.ref_delta.dx).toBeCloseTo(s.ref_delta.dx, 0)
    expect(s1.ref_delta.dy).toBeCloseTo(s.ref_delta.dy, 0)
    expect(s1.size.width).toBeCloseTo(s.size.width, 0)
    expect(s1.size.height).toBeCloseTo(s.size.height, 0)

    // With scale

    const scale: Size = {width: 100, height: 1000}
    const r2: Rect = scanAreaToScaledRect(s, scale)

    expect(r2.top).toBeCloseTo(600, 0)
    expect(r2.bottom).toBeCloseTo(1200, 0)
    expect(r2.left).toBeCloseTo(40, 0)
    expect(r2.right).toBeCloseTo(90, 0)

    // round trip

    const s2 = scaledRect2ScanArea(r2, perfLoc, scale)
    expect(s2.ref_delta.dx).toBeCloseTo(s.ref_delta.dx, 0)
    expect(s2.ref_delta.dy).toBeCloseTo(s.ref_delta.dy, 0)
    expect(s2.size.width).toBeCloseTo(s.size.width, 0)
    expect(s2.size.height).toBeCloseTo(s.size.height, 0)

});
