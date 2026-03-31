import styles from './Card.module.css';
import clsx from "clsx";
import {createContext, type HTMLAttributes, useContext} from "react";
import {useAnimatedUnmount} from "../../hooks/useAnimatedUnmount.ts";
import {PiXBold} from "react-icons/pi";

type CardContextType = {
    onClose?: () => void;
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
    elevation?: 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24;
    zIndex?: number;
    show?: boolean;
    onClose?: () => void;
}

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
    closeable?: boolean;
}

type CardBodyProps = HTMLAttributes<HTMLDivElement>;

const CardContext = createContext<CardContextType>({});

const Card = ({
                  elevation = 2,
                  zIndex = 0,
                  show = true,
                  onClose,
                  children,
                  className,
                  style,
                  onAnimationEnd,
                  ...props
              }: CardProps) => {
    const {shouldRender, transitionProps} = useAnimatedUnmount(show);

    if (!shouldRender) return null;

    return (
        <CardContext.Provider value={{onClose}}>
            <div
                className={clsx(styles.card, className)}
                style={{
                    backgroundColor: `var(--dp${elevation}-background)`,
                    boxShadow: `var(--dp${elevation}-shadow)`,
                    zIndex: Math.round(zIndex) + elevation,
                    ...style,
                    ...transitionProps.style
                }}
                onAnimationEnd={(e) => {
                    transitionProps.onAnimationEnd();
                    onAnimationEnd?.(e);
                }}
                {...props}
            >
                {children}
            </div>
        </CardContext.Provider>
    )
}

const CardHeader = ({
                        closeable = false,
                        children,
                        className,
                        ...props
                    }: CardHeaderProps) => {
    const {onClose} = useContext(CardContext);

    return (
        <div className={clsx(styles.header, className)} {...props}>
            {children}

            {closeable && onClose && (
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Chiudi"
                >
                    <PiXBold/>
                </button>
            )}
        </div>
    )
}

const CardBody = ({children, ...props}: CardBodyProps) => {
    return (
        <div className={styles.body} {...props}>
            {children}
        </div>
    )
}

Card.Header = CardHeader;
Card.Body = CardBody;
export default Card;