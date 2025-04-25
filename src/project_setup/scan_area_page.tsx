import * as React from "react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useDevicePixelRatio} from "use-device-pixel-ratio";
import {useQueryClient} from "@tanstack/react-query";
import {
    Alert,
    Box,
    Button,
    Container,
    DataList,
    Field,
    Grid,
    GridItem,
    Heading,
    HStack,
    NumberInput,
    Separator,
    VStack
} from "@chakra-ui/react";

import {$api, ApiError} from "../api.ts";
import {ApiErrorDialog} from "../common_components/api_error_dialog.tsx";
import {SetupPageProps} from "./project_setup.tsx";
import ProjectImageSetupPage, {ImageOverlay} from "./image_setup_page.tsx";
import {NormalizedPoint, PerforationLocation, ScanArea, Size} from "./types.ts";
import {
    getNormalizedPointer,
    rect2ScanArea,
    scaledRect2ScanArea,
    scanAreaToRect,
    scanAreaToScaledRect,
} from "./common.ts";

const themeColors = {
    edgeColor: '#00f000c0',  // Dark green with low transparancy
    fillColor: '#20f020d0',  // Medium green with low transparancy
    activeEdgeColor: '#f0f020c0',  // Medium yellow with low transparancy
    activeFillColor: '#f0f020d0',  // Light yellow with low transparancy
    inacativeFillColor: '#20f02040' // when inactive the drag handles are more transparent
}

/**
 * Edge value for identifying the currently active Edge
 */
enum Edge {
    NONE,
    TOP,
    BOTTOM,
    LEFT,
    RIGHT
}

export default function ScanAreaPage({currentPage, pageIndex, onFinished}: SetupPageProps) {

    // activate the api calls
    useQueryClient();

    /** The Canvas Element to draw into */
    const canvasRef = useRef<HTMLCanvasElement>(null)

    /** The size of the canvas drawing area.
     *  On high DPI devices this is larger than the canvas client area.
     */
    const [canvasSize, setCanvasSize] = useState({width: 0, height: 0})

    /** The natural size of the image **/
    const [imageNaturalSize, setImageNaturalSize] = useState({width: 0, height: 0})

    /** The distance from the pointer coordinates to the edge being moved. **/
    const [mouseDelta, setMouseDelta] = useState({x: 0, y: 0})

    /** The edge which is currently being moved. **/
    const [activeEdge, setActiveEdge] = useState(Edge.NONE)

    /** The PerforationLocation upon which the ScanArea is based. Provided by the backend **/
    const [perfLocation, setPerfLocation] = useState<PerforationLocation>();

    /** The current Scan Area. Any changes will be propagated to the backend. **/
    const [currentScanArea, setCurrentScanArea] = useState<ScanArea>();

    /** The initial PerforationLocation. Used to revert to the original state if required **/
    const [initialScanArea, setInitialScanArea] = useState<ScanArea>();

    /** The last error message from the backend API. Valid until cleared in the error dialog **/
    const [apiError, setApiError] = useState<ApiError | null>(null);

    /** The values for the manual input fields **/
    const [topValue, setTopValue] = useState<number>(0);
    const [bottomValue, setBottomValue] = useState<number>(1);
    const [leftValue, setLeftValue] = useState<number>(0);
    const [rightValue, setRightValue] = useState<number>(1);

    /**
     * Flag to indicate if the page is visible or not
     * Used to query for the current perforation location only when the page is actually visible
     */
    const divRef = useRef<HTMLDivElement>(null);

    /** The number of canvas pixels per "screen" pixel.**/
    const dpr = useDevicePixelRatio({defaultDpr: 1, round: false, maxDpr: 10});


    /**
     * The size of the roi drag handles in canvas pixels.
     * Can be set with the "--drag-handle-size" css style (in % or in px).
     * Default is 5% which represents 5% of the canvas width.
     */
    const handleSize: number = useMemo<number>(() => {
        let cssSize = "5%";     // default
        if (canvasRef.current) {
            const propertySize = window.getComputedStyle(canvasRef.current).getPropertyValue("--drag-handle-size");
            if (propertySize) cssSize = propertySize;
        }
        if (cssSize.endsWith("%")) {
            return (canvasSize.width * (parseFloat(cssSize) / 100));
        } else {
            return (parseFloat(cssSize));
        }
    }, [canvasSize])

    /////////////////////////////////////////////////////////////////////////
    //  Manual Entry Field Handler
    /////////////////////////////////////////////////////////////////////////

    /** called whenever a manual entry field has changed */
    const handleValueChange = (edge: Edge, newValue: string) => {

        if (!newValue) return;
        if (!currentScanArea) return;
        if (!perfLocation) return;

        const value = parseFloat(newValue);

        const rect = scanAreaToScaledRect(currentScanArea, imageNaturalSize)

        switch (edge) {
            case Edge.TOP:
                rect.top = value;
                if (rect.top > rect.bottom - 1) rect.bottom = rect.top + 1;
                break;
            case Edge.BOTTOM:
                rect.bottom = value;
                if (rect.bottom < rect.top + 1) rect.top = rect.bottom - 1;
                break;
            case Edge.LEFT:
                rect.left = value;
                if (rect.left > rect.right - 1) rect.right = rect.left + 1;
                break;
            case Edge.RIGHT:
                rect.right = value;
                if (rect.right < rect.left + 1) rect.left = rect.right - 1;
        }

        // Scale the field values back to image resolution
        setTopValue(Math.round(rect.top));
        setBottomValue(Math.round(rect.bottom));
        setLeftValue(Math.round(rect.left));
        setRightValue(Math.round(rect.right));

        const scanarea = scaledRect2ScanArea(rect, perfLocation, imageNaturalSize)

        setCurrentScanArea(scanarea);
    }

    /////////////////////////////////////////////////////////////////////////
    // Button Events
    /////////////////////////////////////////////////////////////////////////

    /** Revert the initial PerforationLocation from the Project **/
    const handleRevert = (): void => {
        setCurrentScanArea(initialScanArea)
    }


    /////////////////////////////////////////////////////////////////////////
    // Pointer Events
    /////////////////////////////////////////////////////////////////////////

    /**
     * Called when the pointer (re)enters the canvas.
     * If it has left during a drag and the button is up end the current drag.
     */
    const handlePointerEnter = (e: React.PointerEvent) => {
        // If the mouse leaves the element we do not get an PointerUp Event.
        // In this case (PointerUp outside the Canvas) stop any drag operations which might be in progress.

        e.preventDefault() // do not generate mouse event

        if (e.buttons == 0) {
            setActiveEdge(Edge.NONE)
        }

    }

    /**
     * Upon PointerUp end the current drag. This will cause an effect to send theScanArea to the backend.
     */
    const handlePointerUp = (e: React.PointerEvent) => {

        e.preventDefault() // do not generate mouse event
        setActiveEdge(Edge.NONE);
    }

    /**
     * Called when the pointer button is pressed.
     * This marks the start of a drag operation
     */
    const handlePointerDown = (e: React.PointerEvent) => {
        // early return if the Component is not set up yet
        if (!canvasRef.current) return;
        if (!perfLocation) return;
        if (!currentScanArea) return;
        if (!imageNaturalSize) return;

        e.preventDefault() // do not generate mouse event

        // convert scanArea to rectangle
        const {top, bottom, left, right} = scanAreaToRect(currentScanArea)

        const p: NormalizedPoint = getNormalizedPointer(e)

        // The edge whose drag area has been hit
        let edgehit: Edge = Edge.NONE;

        // check if any drag boxes are hit
        if (p.x >= left && p.x <= right) {
            if (p.y >= top - handleSize && p.y <= top) {
                edgehit = Edge.TOP;
                setMouseDelta({x: 0, y: top - p.y});
            } else if (p.y >= bottom && p.y <= bottom + handleSize) {
                edgehit = Edge.BOTTOM;
                setMouseDelta({x: 0, y: bottom - p.y});
            } else {
                edgehit = Edge.NONE;
            }
        } else if (p.y >= top && p.y <= bottom) {
            if (p.x >= left - handleSize && p.x <= left) {
                edgehit = Edge.LEFT;
                setMouseDelta({x: left - p.x, y: 0});
            } else if (p.x >= right && p.x <= right + handleSize) {
                edgehit = Edge.RIGHT;
                setMouseDelta({x: right - p.x, y: 0});
            } else {
                edgehit = Edge.NONE;
            }
        }
        setActiveEdge(edgehit)
    }

    /**
     * Perform drag operation if the pointer is down (activeEdge != Edge.None)
     * @param e
     */
    const handlePointerMove = (e: React.PointerEvent) => {
        // early return if the Component is not set up or there is no active egde to drag
        if (!canvasRef.current) return;
        if (!currentScanArea) return;
        if (!perfLocation) return;
        if (activeEdge == Edge.NONE) return;

        e.preventDefault() // do not generate mouse event

        const {width: canvasWidth, height: canvasHeight} = canvasRef.current

        // convert scanArea to rectangle
        let {top, bottom, left, right} = scanAreaToRect(currentScanArea);

        const p = getNormalizedPointer(e)

        const shiftkey = e.shiftKey; // if shift key is pressed move opposite edge

        // add the delta between the active edge and the mouse position at the time of the click
        // so that the edge does not jump to the current mouse position upon movement
        const posX = (p.x + mouseDelta.x);
        const posY = (p.y + mouseDelta.y);

        // width and height of the scanArea
        const width = right - left;
        const height = bottom - top;

        const padOuter = 0.01;     // Padding between edge and canvas edge (default 1%)
        const padInner = 0.01;     // Padding between edge and opposite edge (minimum scanArea size)

        // check which edge to move (if shift then move opposite edge as well)
        switch (activeEdge) {
            case Edge.TOP:
                if (shiftkey) bottom = clamp(posY + height, padOuter, canvasHeight - padOuter);
                top = clamp(posY, padOuter, bottom - padInner)
                break;
            case Edge.BOTTOM:
                if (shiftkey) top = clamp(posY - height, padOuter, canvasHeight - padOuter);
                bottom = clamp(posY, top + padInner, canvasHeight - padOuter);
                break;
            case Edge.LEFT:
                if (shiftkey) right = clamp(posX + width, padOuter, canvasWidth - padOuter);
                left = clamp(posX, padOuter, right - padInner);
                break;
            case Edge.RIGHT:
                if (shiftkey) left = clamp(posX - width, padOuter, canvasWidth - padOuter);
                right = clamp(posX, left + padInner, canvasWidth - padOuter);
                break;
        }

        const r = {top, bottom, left, right}
        const scanarea = rect2ScanArea(r, perfLocation)
        setCurrentScanArea(scanarea)
    }

    /////////////////////////////////////////////////////////////////////////
    // Event Handlers
    /////////////////////////////////////////////////////////////////////////

    const handleImageContentChange = (imgElement: HTMLImageElement) => {
        const width = imgElement.naturalWidth;
        const height = imgElement.naturalHeight;
        setImageNaturalSize({width, height})
    }

    /////////////////////////////////////////////////////////////////////////
    // API Calls
    /////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////
    // Get Perforation Location
    /////////////////////////////////////////////////////////////////////////

    /**
     * Get the PerforationLocation from the backend.
     * This must exist to continue with the ScanArea
     */
    const apiGetPerfLoc = $api.useQuery(
        "get",
        "/api/project/perf/location",
        // {refetchOnWindowFocus: false}
    );

    /**
     * Refetch the PerforationLocation once the page becomes visible
     */
    useEffect(() => {
        if (currentPage == pageIndex) {
            void apiGetPerfLoc.refetch()
        }
    }, [apiGetPerfLoc, apiGetPerfLoc.refetch, currentPage, pageIndex])

    /**
     * Handle the get PerforationLocation response.
     * Set the PerforationLocation or show an error dialog.
     **/
    useEffect(() => {
        if (apiGetPerfLoc.isSuccess) {
            setPerfLocation(apiGetPerfLoc.data)
        }
        if (apiGetPerfLoc.isError) {
            // todo: only show the error message if the page is actually visible
            const error = apiGetPerfLoc.error as unknown as ApiError;
            if (error.status != 404) setApiError(error)
        }
    }, [apiGetPerfLoc.data, apiGetPerfLoc.error, apiGetPerfLoc.isError, apiGetPerfLoc.isSuccess]);

    /////////////////////////////////////////////////////////////////////////
    // Get/Put project Scan Area
    /////////////////////////////////////////////////////////////////////////

    /** Get the initial ScanArea from the backend on the first render. **/
    const apiGetScanArea = $api.useQuery(
        "get",
        "/api/project/scanarea",
        // {refetchOnWindowFocus: false}
    );

    /**
     * Handle the get ScanArea response.
     * Set the current and inital ScanArea to the one supplied by the backend.
     **/
    useEffect(() => {
        if (apiGetScanArea.isSuccess) {
            setCurrentScanArea(apiGetScanArea.data)
            if (!initialScanArea) {
                setInitialScanArea(apiGetScanArea.data)  // Get only once
            }
        }
    }, [apiGetScanArea.data, apiGetScanArea.isSuccess, initialScanArea]);

    /////////////////////////////////////////////////////////////////////////

    /** Send the current ScanArea to the Backend **/
    const {mutate: apiPutScanAreaMutate} = $api.useMutation(
        "put",
        "/api/project/scanarea",
        {
            onError: (error) => {
                setApiError(error as ApiError)
                if (onFinished) {
                    onFinished(pageIndex, false)
                }
            },
            onSuccess: () => {
                // Tell the parent PrejectSetup Component that this page is finished
                if (onFinished) {
                    onFinished(pageIndex, true)
                }
            }
        }
    );

    /**
     * Send the current ScanArea to the backend.
     * This is only called when the ScanArea has changed and there is active drag in progress
     */
    useEffect(() => {
        if (!currentScanArea) return;

        const queryTimer = setTimeout(() => {
            apiPutScanAreaMutate({body: currentScanArea})
        }, 100);

        return () => {
            clearTimeout(queryTimer);
        }
    }, [apiPutScanAreaMutate, currentScanArea]);


    /////////////////////////////////////////////////////////////////////////
    // Effects
    /////////////////////////////////////////////////////////////////////////

    // refetch the perfLoc and ScanArea whenever this page becomes active
    useEffect(() => {
        if (currentPage == pageIndex) {
            apiGetPerfLoc.refetch().catch(console.error)
            apiGetScanArea.refetch().catch(console.error)
        }
    }, [apiGetPerfLoc, apiGetScanArea, currentPage, pageIndex]);

    /** update the manual entry fields on every change of the scanarea */
    useEffect(() => {
        if (!currentScanArea) return;
        if (!perfLocation) return;
        if (!imageNaturalSize) return;

        const {top, bottom, left, right} = scanAreaToScaledRect(currentScanArea, imageNaturalSize)
        setTopValue(Math.round(top));
        setBottomValue(Math.round(bottom));
        setLeftValue(Math.round(left));
        setRightValue(Math.round(right));

    }, [currentScanArea, perfLocation, imageNaturalSize])

    /////////////////////////////////////////////////////////////////////////
    // Handle element resize
    /////////////////////////////////////////////////////////////////////////

    /**
     * Callback function that sets the canvas size (size of the internal drawing surface)
     * to the size of the canvas element itself.
     * This prevents any up- or downscaling of the canvas content due to layout changes.
     * @note: On high DPI devices the canvas size is adjusted for the displayPixelRatio.
     */
    const handleImageResize = (newSize: Size) => {
        console.log(`ScanArea handleImageResize (${JSON.stringify(newSize)})`)
        const {width, height} = newSize;
        if (!width || !height) return;
        setCanvasSize({width: width * dpr, height: height * dpr});

        // this is a bit of a hack, but handleImageResize is called whenever the page becomes visible.
        // So this might be a good place to refetch the latest PerforationLocation
        apiGetPerfLoc.refetch().catch(console.error);
        apiGetScanArea.refetch().catch(console.error);
    }

    /////////////////////////////////////////////////////////////////////////
    // Draw Canvas
    /////////////////////////////////////////////////////////////////////////

    const drawCanvas = useCallback((scanarea: ScanArea, activeedge: Edge) => {

        const canvas = canvasRef.current

        // in the early renders the canvas is not yet set up. No need to draw on a 0x0 Canvas.
        if (!perfLocation) return;
        if (!canvas) return;
        if (canvas.width == 0 || canvas.height == 0) return

        const ctx = canvas.getContext('2d')
        if (ctx == null) return;

        const setColor = (drawingedge: Edge) => {
            // a little util to set the colors depending on the state of the Edge being drawn
            ctx.lineWidth = 5;

            if (activeedge == Edge.NONE || drawingedge != activeedge) {
                ctx.strokeStyle = themeColors.edgeColor;
                ctx.fillStyle = themeColors.inacativeFillColor;
            } else {
                ctx.strokeStyle = themeColors.activeEdgeColor;
                ctx.fillStyle = themeColors.activeFillColor;
            }
        }

        // convert scanArea to scaled rectangle
        const {top, bottom, left, right} = scanAreaToScaledRect(scanarea, canvas)

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Draw the Reference Point
        const ref = {x: perfLocation.inner_edge, y: (perfLocation.top_edge + perfLocation.bottom_edge) / 2}
        const rx = ref.x * width;
        const ry = ref.y * height;
        const radius = width * 0.03
        const sin_r = radius * Math.sin(Math.PI / 4); // 45°
        const cos_r = radius * Math.cos(Math.PI / 4);

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,207,0,0.75)';

        ctx.beginPath()
        ctx.arc(rx, ry, radius, 0, Math.PI * 2, true);
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(rx - sin_r, ry - cos_r);
        ctx.lineTo(rx + sin_r, ry + cos_r);
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(rx - sin_r, ry + cos_r);
        ctx.lineTo(rx + sin_r, ry - cos_r);
        ctx.stroke()

        // draw line from reference point to top left corner
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(left, top);
        ctx.stroke()

        // draw edges
        setColor(Edge.TOP);
        ctx.fillRect(left, top - handleSize, right - left, handleSize);
        ctx.beginPath();
        ctx.moveTo(0, top);
        ctx.lineTo(width, top);
        ctx.stroke();

        setColor(Edge.BOTTOM);
        ctx.fillRect(left, bottom, right - left, handleSize);
        ctx.beginPath();
        ctx.moveTo(0, bottom);
        ctx.lineTo(width, bottom);
        ctx.stroke();

        setColor(Edge.LEFT);
        ctx.fillRect(left - handleSize, top, handleSize, bottom - top);
        ctx.beginPath();
        ctx.moveTo(left, 0);
        ctx.lineTo(left, height);
        ctx.stroke();

        setColor(Edge.RIGHT);
        ctx.fillRect(right, top, handleSize, bottom - top);
        ctx.beginPath();
        ctx.moveTo(right, 0);
        ctx.lineTo(right, height);
        ctx.stroke();

    }, [handleSize, perfLocation])

    /**
     * Redraw Canvas whenever there is a change to the ScanArea or the active edge.
     */
    useEffect(() => {
        if (!currentScanArea) return;

        drawCanvas(currentScanArea, activeEdge);

    }, [currentScanArea, drawCanvas, activeEdge]);


    /////////////////////////////////////////////////////////////////////////
    // Utils for Formating
    /////////////////////////////////////////////////////////////////////////

    const getScanAreaAspectRatioString = (): string => {
        if (!currentScanArea)
            return "undefined"
        const width = Math.round(currentScanArea.size.width * imageNaturalSize.width)
        const height = Math.round(currentScanArea.size.height * imageNaturalSize.height)
        const aspectratio = width / height
        return String(aspectratio.toFixed(4));
    }

    const getScanAreaSizeString = (): string => {
        if (!currentScanArea)
            return "undefined"
        const width = Math.round(currentScanArea.size.width * imageNaturalSize.width)
        const height = Math.round(currentScanArea.size.height * imageNaturalSize.height)
        return `${width}x${height}`

    }

    return (
        <ProjectImageSetupPage onImageContentChange={(image) => handleImageContentChange(image)}
                               onImageResize={(size) => handleImageResize(size)}>
            <ApiErrorDialog apiError={apiError} setApiError={() => setApiError(null)}/>
            <ImageOverlay>
                <div ref={divRef}
                     style={{
                         position: 'absolute',
                         top: 0,
                         bottom: 0,
                         left: 0,
                         right: 0,
                     }}>
                    <canvas ref={canvasRef}
                            style={{
                                width: "100%",
                                height: "auto",
                                touchAction: "none"
                            }}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerMove={handlePointerMove}
                            onPointerEnter={handlePointerEnter}
                    />
                </div>
            </ImageOverlay>
            <Box>
                {
                    !perfLocation ?
                        <Alert.Root status="error" flexDirection="column">
                            <HStack>
                                <Alert.Indicator/>
                                Perforation hole location is not set
                            </HStack>
                            <Alert.Description>
                                Go to the Perforation setup page to set the perforation
                            </Alert.Description>
                        </Alert.Root>
                        :
                        <VStack alignItems="center" height={"100%"}>
                            <Heading>Manual Adjust</Heading>
                            <Container bg={"gray.700"} centerContent={true} borderRadius="2xl" padding={"2%"}>
                                <Grid templateColumns="repeat(2, 1fr)" gap="1">
                                    <GridItem colSpan={2} style={{margin: 'auto'}}>
                                        <SingleEdgeTextInput edge={Edge.TOP} value={topValue} min={0}
                                                             max={imageNaturalSize.height - 1}
                                                             onValueChange={handleValueChange}/>
                                    </GridItem>
                                    <GridItem style={{margin: 'auto'}}>
                                        <SingleEdgeTextInput edge={Edge.LEFT} value={leftValue} min={0}
                                                             max={imageNaturalSize.width - 1}
                                                             onValueChange={handleValueChange}/>
                                    </GridItem>
                                    <GridItem style={{margin: 'auto'}}>
                                        <SingleEdgeTextInput edge={Edge.RIGHT} value={rightValue} min={1}
                                                             max={imageNaturalSize.width}
                                                             onValueChange={handleValueChange}/>
                                    </GridItem>
                                    <GridItem colSpan={2} style={{margin: 'auto'}}>
                                        <SingleEdgeTextInput edge={Edge.BOTTOM} value={bottomValue} min={1}
                                                             max={imageNaturalSize.height}
                                                             onValueChange={handleValueChange}/>
                                    </GridItem>
                                </Grid>
                                <Box flexGrow="1"><p/></Box>
                            </Container>
                            <Separator/>
                            <Container bg={"gray.700"} centerContent={true} borderRadius="2xl" padding={"1%"}>
                                <DataList.Root>
                                    <Heading size={"sm"}>Scan Area Size</Heading>
                                    <DataList.Item alignItems={"center"}>
                                        <DataList.ItemLabel>Pixels</DataList.ItemLabel>
                                        <DataList.ItemValue>{getScanAreaSizeString()}</DataList.ItemValue>
                                        <DataList.ItemLabel>Aspect Ratio</DataList.ItemLabel>
                                        <DataList.ItemValue>{getScanAreaAspectRatioString()}</DataList.ItemValue>
                                    </DataList.Item>
                                </DataList.Root>
                            </Container>
                            <Separator/>
                            <Box flexGrow="1"><p/></Box>
                            <Button width={"100%"}
                                    onClick={handleRevert}
                                    disabled={initialScanArea === undefined}>
                                Revert to last stored ScanArea
                            </Button>
                        </VStack>
                }
            </Box>
        </ProjectImageSetupPage>
    )
}

function clamp(value: number, lower: number, upper: number): number {
    if (value < lower) return lower;
    if (value > upper) return upper;
    return value;
}


/**
 * Draws the current ScanArea into the canvas.
 *
 * @param scanArea The scanArea object with normalized values.
 * @param perfLoc The reference point the scanArea is based on
 * @param canvas The canvas element
 * @param activeEdge The currently active edge if a frag is in progress or "Edge.NONE" if no drag is active
 * @param handleSize The size of the edge drag area in canvas pixels
 */


type singleProps = {
    edge: Edge;
    value: number
    min: number
    max: number;
    onValueChange: (arg0: Edge, arg1: string) => void;
}

export function SingleEdgeTextInput({edge, value, min, max, onValueChange}: singleProps) {

    const edgeName = (edge: Edge) => {
        switch (edge) {
            case Edge.TOP:
                return "Top";
            case Edge.BOTTOM:
                return "Bottom";
            case Edge.LEFT:
                return "Left";
            case Edge.RIGHT:
                return "Right";
            default:
                return "foobar";
        }
    }

    return (
        <Field.Root>
            <Field.Label style={{margin: 'auto'}}>{edgeName(edge)}</Field.Label>
            <NumberInput.Root value={value.toString()}
                              spinOnPress={true}
                              min={min}
                              max={max}
                              allowOverflow={false}
                              variant={"outline"}
                              onValueChange={(evt) => onValueChange(edge, evt.value)}>
                <NumberInput.Control/>
                <NumberInput.Input textAlign="center" fontSize="sm" style={{width: "12ch"}} bg={"gray.500"}/>
            </NumberInput.Root>
        </Field.Root>
    )
}
