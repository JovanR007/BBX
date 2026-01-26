/// <reference types="react" />

declare namespace JSX {
    interface IntrinsicElements {
        "gmpx-api-loader": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
            key?: string;
            "solution-channel"?: string;
        };
        "gmpx-place-picker": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
            placeholder?: string;
            ref?: React.RefObject<any>;
        };
    }
}
