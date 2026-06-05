export type Color = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink' | 'white';

export const getComputedColor = (colorName: Color, shade: number = 500): string => {
    if (typeof window === 'undefined') return '#ffffff';

    const hexColor = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${colorName}-${shade}`)
        .trim();

    return hexColor || '#ffffff';
};