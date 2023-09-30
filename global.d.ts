declare const YEAR: number;
declare const VERSION: string;
declare const AUTH_EMULATOR_URL: string | null;
declare const FIRESTORE_EMULATOR_URL: string | null;
declare const DD_URL: string;
declare const SITE_ANALYTICS: {
    pageViews: number;
    uniqueVisitors: number;
    numCountries: number;
};
declare const WORKERS_ENDPOINT: string;

declare module "*.vue" {
    import { ComponentOptions } from "vue";
    const component: ComponentOptions;
    export default component;
}

/*declare module "*.vue?chunk=static" {
    import { ComponentOptions } from "vue";
    const component: ComponentOptions;
    export default component;
}*/