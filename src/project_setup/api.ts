export const ApiFetchPreviewImage = async () => {
    const response = await fetch('/api/camera/preview');
    if (!response.ok) {
        // todo: show error message
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
