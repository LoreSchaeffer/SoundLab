import styles from "./Separator.module.css";
import clsx from "clsx";

type SeparatorProps = {
    width?: number;
    height?: 'sm' | 'md' | 'lg' | number;
    theme?: 'dark' | 'light';
}

const Separator = ({width = 100, height = 'md', theme = 'dark'}: SeparatorProps) => {
    const marginValue = typeof height === 'number'
        ? height : height === 'sm'
            ? 8 : height === 'md'
                ? 16 : height === 'lg'
                    ? 24 : 8;

    return (
        <div className={styles.separatorWrapper}>
            <div
                className={clsx(
                    styles.separator,
                    styles[theme]
                )}
                style={{
                    width: `${width}%`,
                    margin: `${marginValue}px 0`
                }}
            >
            </div>
        </div>
    );
};

export default Separator;