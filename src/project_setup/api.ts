export const ApiFetchPreviewImage = async () => {
    const response = await fetch('http://tofisca:8080/api/camera/preview?reload=' + true);
    if (!response.ok) {
        // todo: show error message
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
