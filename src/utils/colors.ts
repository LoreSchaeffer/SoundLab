export type Color = {
    header?: string;
    text?: string;
    border?: string;
    line?: string;
}

export const colors: Record<string, Color> = {
    blue: {
        header: '#bcdefb',
        text: '#08316d',
        border: '#90caf9',
        line: '#0067ff'
    },
    pink: {
        header: '#f8bbd0',
        text: '#880e4f',
        border: '#f48fb1',
        line: '#ff0088'
    },
    red: {
        header: '#ffcdd2',
        text: '#b71c1c',
        border: '#ef9a9a',
        line: '#d80000'
    },
    orange: {
        header: '#ffe0b2',
        text: '#e65100',
        border: '#ffcc80',
        line: '#ff5900'
    },
    yellow: {
        header: '#fff9c4',
        text: '#f57f17',
        border: '#fff59d',
        line: '#ffa800'
    },
    green: {
        header: '#c8e6c9',
        text: '#1b5e20',
        border: '#a5d6a7',
        line: '#14b323'
    },
    purple: {
        header: '#e1bee7',
        text: '#4a148c',
        border: '#ce93d8',
        line: '#8724ff'
    },
    brown: {
        header: '#d7ccc8',
        text: '#4e342e',
        border: '#a1887f',
        line: '#814c41'
    },
    teal: {
        header: '#b2dfdb',
        text: '#004d40',
        border: '#80cbc4',
        line: '#23ae96'
    },
    lime: {
        header: '#f0ffb2',
        text: '#7cb518',
        border: '#d4fc79',
        line: '#b2ff59'
    },
    indigo: {
        header: '#c5cae9',
        text: '#1a237e',
        border: '#9fa8da',
        line: '#3f51b5'
    },
    deepOrange: {
        header: '#ffccbc',
        text: '#bf360c',
        border: '#ffab91',
        line: '#ff5722'
    },
}