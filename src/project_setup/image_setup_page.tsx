import {ReactNode, useCallback, useContext, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom"
import {
    AspectRatio,
    Box,
    Button,
    Card, Container,
    DataList,
    Heading,
    HStack,
    Image,
    Spinner,
    Switch,
    Text,
    VStack
} from "@chakra-ui/react";

import {ApiFetchPreviewImage} from "./api.ts";
import {LuCamera} from "react-icons/lu";
import {useDevicePixelRatio} from "use-device-pixel-ratio";
import {ImageRefObjects, ImageRefsContext} from "./imageRefsContext.ts";
import {useResizeDetector} from "react-resize-detector";

type Size = {
    width: number; height: number;
};

export interface ProjectImageSetupPageProps {
    children?: ReactNode;
    onImageContentChange?: (imageRef: HTMLImageElement) => void;
    onImageResize?: (newSize: Size) => void;
}

export default function ProjectImageSetupPage(props: ProjectImageSetupPageProps) {

    /** Reference to the <div> containing the Image. Used as a hook for canvas overlays to get on top of */
    const imgDivRef = useRef<HTMLDivElement | null>(null);

    /** Reference to the actual <img>. Used to get its natural and onscreen size. */
    const imageRef = useRef<HTMLImageElement | null>(null)

    /** Flag to indicate that a new image is being fetched from the backend. */
    const [imageLoading, setImageLoading] = useState<boolean>(false)

    /** The URL to load the image from. Either the Preview Still image or a live feed. */
    const [previewImageUrl, setPreviewImageUrl] = useState<string>();

    /** current size onscreen size of the image */
    const [imageSize, setImageSize] = useState<Size>({width: 0, height: 0});

    /** The number of image pixels per "screen" pixel.*/
    const dpr = useDevicePixelRatio({defaultDpr: 1, round: false, maxDpr: 10});


    const handleNewPreviewImage = () => {
        const loadImage = async () => {
            const newImage = await ApiFetchPreviewImage()
            setPreviewImageUrl(newImage)
        }
        setImageLoading(true)
        loadImage().catch(console.error);
    }

    /** load one image as soon as the component mounts */
    useEffect(() => {
        handleNewPreviewImage()
    }, []);

    const handleImageLoaded = () => {
        setImageLoading(false)
        if (props.onImageContentChange && imageRef.current) {
            props.onImageContentChange(imageRef.current)
        }
    }

    /////////////////////////////////////////////////////////////////////////
    // Handle element resize
    /////////////////////////////////////////////////////////////////////////

    /**
     * Callback function that updates the imageSize state whenever the size of the
     * image element changes.
     */
    const onResize = useCallback(() => {
        if (!imageRef.current) return;

        const imgNaturalSize = {width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight}
        setImageSize(imgNaturalSize)

        if (props.onImageResize) {
            const imgScreenSize: Size = {width: imageRef.current.width, height: imageRef.current.height}
            props.onImageResize(imgScreenSize)
        }
    }, [props]);

    const {ref: resizeDetectorRef} = useResizeDetector({
        refreshMode: 'debounce',
        refreshRate: 500,
        onResize,
    });

    /**
     * Get the size of the shown image in actual screen pixels.
     * These differ from the natural size of the image due to scaling the image up or down to fit on the screen.
     */
    const getImageScreenSize = (): Size => {
        if (!imageRef.current) return {width: 0, height: 0};
        const width = Math.round(imageRef.current.width * dpr);
        const height = Math.round(imageRef.current.height * dpr);
        return {width, height};
    }

    /**
     * Returns to scale between actual image pixels and pixels shown on the screen.
     * If other than one there the shown image is either scaled up or down.
     */
    const getZoomFactor = (): number => {
        if (!imageRef.current) return 0;
        const imgWidth = imageRef.current.width * dpr;
        const imgNaturalWidth = imageRef.current.naturalWidth;
        return imgWidth / imgNaturalWidth;
    }

    return (
        <ImageRefsContext value={{imgDivRef, imageRef} as unknown as null}>
            <HStack padding={"0.5%"} align="top" id="hstack">
                <Card.Root flex={"none"} variant="elevated" bg={"gray.500"} size={"sm"}>
                    <Card.Body>
                        <VStack alignItems="left">
                            <Button onClick={handleNewPreviewImage}>
                                <LuCamera/>New Still Image
                            </Button>
                            <Switch.Root>
                                <Switch.HiddenInput/>
                                <Switch.Label>Video Feed</Switch.Label>
                                <Switch.Control/>
                            </Switch.Root>
                            <p/>
                            <Container bg={"gray.700"} centerContent={true} borderRadius="2xl" padding={"2%"}>
                                <DataList.Root alignItems={"center"}>
                                    <Heading size={"sm"}>Image Size</Heading>
                                    <DataList.Item alignItems={"center"}>
                                        <DataList.ItemLabel>Camera</DataList.ItemLabel>
                                        <DataList.ItemValue>{imageSize.width}x{imageSize.height}</DataList.ItemValue>
                                        <DataList.ItemLabel>Screen</DataList.ItemLabel>
                                        <DataList.ItemValue>{getImageScreenSize().width}x{getImageScreenSize().height}</DataList.ItemValue>
                                        <DataList.ItemLabel>Zoom Factor</DataList.ItemLabel>
                                        <DataList.ItemValue>{getZoomFactor().toFixed(3)}</DataList.ItemValue>
                                    </DataList.Item>
                                </DataList.Root>
                            </Container>
                        </VStack>
                    </Card.Body>
                </Card.Root>
                <Card.Root flex={4} variant="elevated" bg={"black"} size={"sm"}>
                    <Card.Body>
                        <AspectRatio width={"100%"}
                                     height={"100%"}
                                     ratio={imageSize.width / imageSize.height}>
                            <div ref={resizeDetectorRef}>
                                <div
                                    ref={imgDivRef}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        bottom: 0,
                                        right: 0,
                                    }}>
                                    <Image ref={imageRef}
                                           src={previewImageUrl}
                                           alt={"mock"}
                                           objectFit="contain"
                                           htmlHeight={"100%"}
                                           onLoad={() => handleImageLoaded()}
                                    />
                                </div>
                                {imageLoading ?
                                    <div style={{
                                        justifyContent: "center"
                                    }}>
                                        <Spinner size="xl"
                                                 borderWidth="5px"
                                                 color="red.500"/>
                                    </div> : <div/>
                                }
                            </div>
                        </AspectRatio>
                    </Card.Body>
                </Card.Root>
                <Card.Root flex={2} variant="elevated" bg={"gray.500"} size={"sm"}>
                    <Card.Body>
                        {props.children}
                    </Card.Body>
                </Card.Root>
                <Box/>
            </HStack>
        </ImageRefsContext>
    )
}

interface ImageOverlayProps {
    children?: ReactNode
}

export function ImageOverlay({children}: ImageOverlayProps) {

    const myContext = useContext(ImageRefsContext) as unknown as ImageRefObjects;
    const [divRef, setDivRef] = useState<HTMLDivElement>();

    useEffect(() => {
        if (myContext.imgDivRef.current !== undefined)
            setDivRef(myContext.imgDivRef.current);
    }, [myContext]);


    return (
        <div>
            {divRef ? createPortal(
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                    }}>
                    {children}
                </div>,
                divRef as HTMLDivElement
            ) : <Text>humbug</Text>}
        </div>
    )
}

