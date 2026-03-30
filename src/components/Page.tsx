import type {PropsWithChildren} from "react";
import type {Provider} from "../App.tsx";

type PageProps = PropsWithChildren & {
    providers?: Provider[];
}

const Page = ({providers = [], children}: PageProps) => {
    let content = <>{children}</>;

    // if (providers.includes('player')) content = <PlayerProvider>{content}</PlayerProvider>;

    return content;
};

export default Page;