export const ApiFetchPreviewImage = async () => {
    const response = await fetch('/api/preview');
    if (!response.ok) {
        // todo: show error message
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
