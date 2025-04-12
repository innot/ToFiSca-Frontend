import ProjectImageSetupPage, {ImageOverlay} from "./image_setup_page.tsx";
import {Alert, Box, Button, Heading, HStack, Icon, List, Text, VStack} from "@chakra-ui/react";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {PerforationLocation, Point, Size} from "./types.ts";
import {useDevicePixelRatio} from "use-device-pixel-ratio";
import {$api, ApiError} from "../api.ts";
import {useQueryClient} from "@tanstack/react-query"
import {SetupPageProps} from "./project_setup.tsx";
import {getNormalizedPointer} from "./common.ts";
import {LuCircleAlert} from "react-icons/lu";
import {ApiErrorDialog} from "./api_error_dialog.tsx";

enum Messages {
    NOT_STARTED = "NOT_STARTED",
    SUCCESS = "SUCCESS",
    AUTODETECT_FAILED = "AUTODETECT_FAILED",
    MANUALDETECT_FAILED = "MANUALDETECT_FAILED",
}


export default function ReferencePointPage({pageIndex, onFinished}: SetupPageProps) {

    useQueryClient();

    /** The Canvas Element to draw into **/
    const canvasRef = useRef<HTMLCanvasElement>(null)

    /** The size of the canvas drawing area.
     *  On high DPI devices this is larger than the canvas client area. **/
    const [canvasSize, setCanvasSize] = useState({width: 0, height: 0})

    /** The current position of the mouse pointer relative to the canvas (normalized) **/
    const [pointerPosition, setPointerPosition] = useState<Point | null>(null)

    /** Flag to indicate that a detect request has been sent to the backend. **/
    const [isDetecting, setIsDetecting] = useState(false);

    /** The point at which the backend should start looking for a perforation hole */
    const [startPoint, setStartPoint] = useState<Point | undefined>()

    /** The current PerforationLocation. Will be updated by an Autodetect or a manual detect **/
    const [currentPerfLocation, setCurrentPerfLocation] = useState<PerforationLocation | null>(null);

    /** The initial PerforationLocation. Used to revert to the original state if required **/
    const [initialPerfLocation, setInitialPerfLocation] = useState<PerforationLocation | null>(null);

    const [detectorState, setDetectorState] = useState<Messages>(Messages.NOT_STARTED);

    /** The last error message from the backend API. Valid until the next API call **/
    const [apiError, setApiError] = useState<ApiError | null>(null);

    /** The number of canvas pixels per "screen" pixel.**/
    const dpr = useDevicePixelRatio({defaultDpr: 1, round: false, maxDpr: 10});


    /////////////////////////////////////////////////////////////////////////
    // Pointer Events
    /////////////////////////////////////////////////////////////////////////

    /** Invalidate the PointerPosition so no crosshair is drawn anymore **/
    const handlePointerLeave = () => {
        setPointerPosition(null)
    }

    /** Set PointerPosition state to the current pointer position **/
    const handlePointerMove = (e: React.PointerEvent) => {
        setPointerPosition(getNormalizedPointer(e))
    }

    /** Set the current PointerPosition as the starting point for a manual perforation detection */
    const handlePointerDown = (e: React.PointerEvent) => {
        setStartPoint(getNormalizedPointer(e))
    }

    /////////////////////////////////////////////////////////////////////////
    // Button Events
    /////////////////////////////////////////////////////////////////////////

    /** Set StartPoint state to 0 to initiate an autodetect **/
    const handleAutodetect = (): void => {
        setStartPoint({x: 0, y: 0}) //triggers a useEffect to autodetect the perforation
    }

    /** Revert the initial PerforationLocation from the Project **/
    const handleRevert = (): void => {
        setCurrentPerfLocation(initialPerfLocation)
    }

    /////////////////////////////////////////////////////////////////////////
    // API Calls
    /////////////////////////////////////////////////////////////////////////

    /** Get the initial PerforationLocation from the backend on the first render. **/
    const apiGetPerfLoc = $api.useQuery(
        "get",
        "/api/project/perf/location",
        {refetchOnWindowFocus: false}
    );

    /**
     * Handle the get PerforationLocation response.
     * Set the current and inital PerforationLocation to the one supplied by the backend.
     **/
    useEffect(() => {
        if (apiGetPerfLoc.isSuccess) {
            setCurrentPerfLocation(apiGetPerfLoc.data)
            if (!initialPerfLocation) {
                setInitialPerfLocation(apiGetPerfLoc.data)  // Get only once
            }
        }
    }, [apiGetPerfLoc.data, apiGetPerfLoc.isSuccess, initialPerfLocation]);

    /////////////////////////////////////////////////////////////////////////

    /** Send a perforation detection request to the backend **/
    const {mutate: apiPostDetectMutate} = $api.useMutation(
        "post",
        "/api/project/perf/detect",
        {
            onError: (error) => {
                setIsDetecting(false);
                const apiError = error as ApiError
                if (apiError.status !== 420 || !apiError.requestBody) {
                    console.error(`Internal Error: /api/perf/detect invalid return. ${apiError}`)
                    setApiError(apiError)
                    return
                }
                // Error is 404: Perforation not found
                if (!apiError.requestBody) {
                    setApiError(apiError)
                    return
                }

                // check the response body to see if we came from an autodetect or manual detect.
                const point = apiError.requestBody as Point
                if (point.x == 0 && point.y == 0) {
                    setDetectorState(Messages.AUTODETECT_FAILED)
                } else {
                    setDetectorState(Messages.MANUALDETECT_FAILED)
                }
                setCurrentPerfLocation(null)
            },
            onSuccess: (data) => {
                setIsDetecting(false);
                setCurrentPerfLocation(data);
                setDetectorState(Messages.SUCCESS)
                onFinished(pageIndex, true)
            }
        }
    );

    /**
     * Start the detection process on the backend.
     * This effect is executed whenever the startPoint is changed, either by
     * clicking on the Autodetect button (startPoint=null) or by touching down
     * on the canvas (startPoint=pointerPos[normalized])
     */
    useEffect(() => {
        if (!startPoint) return;

        setIsDetecting(true);

        apiPostDetectMutate({body: startPoint})

    }, [apiPostDetectMutate, startPoint]);


    /////////////////////////////////////////////////////////////////////////
    // Effects
    /////////////////////////////////////////////////////////////////////////

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
        const {width, height} = newSize;
        if (!width || !height) return;
        setCanvasSize({width: width * dpr, height: height * dpr});
    }

    /**
     * update the Canvas
     */
    useEffect(() => {
        if (!canvasRef.current) return;
        drawCanvas(canvasRef.current, pointerPosition, currentPerfLocation);
    }, [pointerPosition, currentPerfLocation]);

    return (
        <ProjectImageSetupPage onImageResize={(size) => handleImageResize(size)}>
            <ApiErrorDialog apiError={apiError} setApiError={(error) => setApiError(error)}/>
            <ImageOverlay>
                <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0}}>

                    <canvas ref={canvasRef}
                            style={{
                                width: "100%",
                                height: "auto",
                                touchAction: "none"
                            }}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            onPointerDown={(e) => handlePointerDown(e)}
                            onPointerMove={(e) => handlePointerMove(e)}
                            onPointerLeave={() => handlePointerLeave()}
                    />
                </div>
            </ImageOverlay>
            <VStack alignItems="left" height={"100%"}>
                {currentPerfLocation ? (
                    <HStack alignItems="left">
                        <Heading>✅ Perforation Detected</Heading>
                    </HStack>
                ) : (
                    <HStack alignItems="left">
                        <Icon size={"lg"} color={"orange.500"}>
                            <LuCircleAlert/>
                        </Icon>
                        <Text>Click on perforation hole in image or try Autodetect</Text>
                    </HStack>
                )}
                <Button
                    loading={isDetecting}
                    loadingText="Detecting..."
                    onClick={() => handleAutodetect()}>
                    Autodetect Perforation
                </Button>
                {{
                    "NOT_STARTED":
                        <div></div>,
                    "SUCCESS":
                        <div></div>,
                    "AUTODETECT_FAILED":
                        <Alert.Root status="error" flexDirection="column">
                            <HStack>
                                <Alert.Indicator/>
                                Autodetect failed
                            </HStack>
                            <Alert.Description>
                                Try clicking on the perforation in the image
                                to manually locate the perforation.
                            </Alert.Description>
                        </Alert.Root>,
                    "MANUALDETECT_FAILED":
                        <Alert.Root status="error" flexDirection="column">
                            <Alert.Title>
                                <HStack>
                                    <Alert.Indicator/>
                                    Perforation detection failed
                                </HStack>
                            </Alert.Title>
                            <Alert.Description>
                                Could not find a perforation hole at the marked location.
                                <List.Root paddingLeft="2em">
                                    <List.Item>Move the film to expose the complete frame or</List.Item>
                                    <List.Item>Change camera settings</List.Item>
                                </List.Root>
                                and try again.
                            </Alert.Description>
                        </Alert.Root>,
                }[detectorState]}
                <Box flexGrow="1"><p/></Box>
                <Button
                    onClick={() => handleRevert()}
                    disabled={initialPerfLocation === undefined}>
                    Revert to last stored Position
                </Button>
            </VStack>
        </ProjectImageSetupPage>
    )
}

/**
 * Draws a crosshair at the current pointer position.
 *
 * @param canvas The canvas element
 * @param pointerPos The normalized position of the pointer
 * @param perforation The normalized location of the perforation hole
 */
function drawCanvas(canvas: HTMLCanvasElement,
                    pointerPos: Point | null,
                    perforation: PerforationLocation | null) {

    const ctx = canvas.getContext('2d')
    if (ctx == null) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw the perforation location lines
    if (perforation) {
        const top = perforation.top_edge * canvasHeight;
        const bottom = perforation.bottom_edge * canvasHeight;
        const inner = perforation.inner_edge * canvasWidth;
        const outer = perforation.outer_edge * canvasWidth;

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f04000c0';

        ctx.beginPath()
        ctx.moveTo(outer, top);
        ctx.lineTo(inner, top);
        ctx.lineTo(inner, bottom);
        ctx.lineTo(outer, bottom);
        ctx.closePath();
        ctx.stroke();

        // Draw the Reference Point
        const ref = {x: perforation.inner_edge, y: (perforation.top_edge + perforation.bottom_edge) / 2};
        const rx = ref.x * canvasWidth;
        const ry = ref.y * canvasHeight;
        const radius = canvasWidth * 0.03
        const sin_r = radius * Math.sin(Math.PI / 4); // 45°
        const cos_r = radius * Math.cos(Math.PI / 4);

        ctx.lineWidth = 5;
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
    }

    // Draw the crosshair
    if (pointerPos) {
        const {x: px, y: py} = pointerPos;

        // scale normalized pointer pos to canvas size
        const x = px * canvasWidth;
        const y = py * canvasHeight;

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f09000c0';

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

}

