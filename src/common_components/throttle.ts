// Throttle function to limit the rate of function calls
export const throttle = (func: () => void, limit: number = 200) => {
    let inThrottle: boolean = false;
    return () => {
        if (!inThrottle) {
            func();
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};