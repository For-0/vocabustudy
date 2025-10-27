import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'; // we import this here to make sure it loads instantly without having to wait for a network request
import { useAuthStore, usePreferencesStore } from './store';

declare module "vue-router" {
    interface RouteMeta {
        title: string | false | undefined; // If title is `false`, this page has no unique title. If it's undefined, don't change the previous title
        requiresAuth?: boolean;
    }
}

export default function () {
    const router = createRouter({
        history: createWebHistory(import.meta.env.BASE_URL),
        routes: [
            {
                path: '/',
                name: 'home',
                component: HomeView,
                meta: {
                    title: false
                }
            },
            {
                path: '/credits/',
                name: 'credits',
                component: () => import('./views/CreditsView.vue?chunkName=static#'),
                meta: {
                    title: "Credits"
                }
            },
            {
                path: '/saved/',
                name: 'saved-sets',
                component: () => import('./views/SavedSetsView.vue'),
                meta: {
                    title: "Saved Sets"
                }
            },
            {
                path: '/help-center/',
                name: 'help-center',
                component: () => import('./views/HelpCenterView.vue'),
                meta: {
                    title: "Help Center"
                }
            },
            {
                path: '/social/',
                name: 'social',
                component: () => import('./views/SocialView.vue?chunkName=static#'),
                meta: {
                    title: "Social"
                }
            },
            {
                path: '/forms/',
                name: 'forms',
                component: () => import('./views/FormsView.vue'),
                meta: {
                    title: "Contact Us"
                }
            },
            {
                path: '/support-us/',
                name: 'support-us',
                component: () => import('./views/SupportUsView.vue?chunkName=static#'),
                meta: {
                    title: "Support Us"
                }
            },
            {
                path: '/privacy/',
                name: 'privacy',
                component: () => import('./views/PrivacyPolicyView.vue?chunkName=static#'),
                meta: {
                    title: "Privacy Policy"
                }
            },
            {
                path: '/terms/',
                name: 'terms',
                component: () => import('./views/TOSView.vue?chunkName=static#'),
                meta: {
                    title: "Terms of Service"
                }
            },
            {
                path: '/search/',
                name: 'search',
                component: () => import('./views/SearchView.vue'),
                meta: {
                    title: "Search"
                }
            },
            {
                path: '/login/',
                name: 'login',
                component: () => import('./views/LoginView.vue?chunkName=auth#'),
                meta: {
                    title: "Log in"
                }
            },
            {
                path: '/signup/',
                redirect: { name: "login" }
            },
            {
                path: '/account/',
                name: 'account',
                component: () => import('./views/AccountView.vue?chunkName=auth#'),
                meta: {
                    title: "Account",
                    requiresAuth: true
                }
            },
            {
                path: '/my-sets/',
                name: 'my-sets',
                component: () => import('./views/MySetsView.vue?chunkName=auth#'),
                meta: {
                    title: "My Sets",
                    requiresAuth: true
                }
            },
            {
                path: '/my-collections/',
                name: 'my-collections',
                component: () => import('./views/MyCollectionsView.vue?chunkName=auth#'),
                meta: {
                    title: "My Collections",
                    requiresAuth: true
                }
            },
            {
                path: '/auth-action/',
                name: 'auth-action',
                component: () => import('./views/AuthActionView.vue'),
                meta: {
                    title: "Reset Password / Verify Email"
                }
            },
            {
                path: '/:pathMatch(.*)*',
                name: 'not-found',
                component: () => import('./views/NotFoundView.vue'),
                meta: {
                    title: "404 - Not Found"
                }
            },
            {
                path: '/:type(set|quizlet|import)/:id([\\w_-]+)/',
                component: () => import('./views/SetViewerView.vue?chunkName=set-detail#'),
                children: [
                    {
                        path: '',
                        component: () => import('./views/set-viewer/SetOverviewView.vue?chunkName=set-detail#'),
                        name: "set-detail"
                    },
                    {
                        path: 'view/',
                        redirect: { name: "set-detail" }
                    },
                    {
                        path: 'flashcards/',
                        component: () => import('./views/set-viewer/FlashcardsView.vue?chunkName=set-detail#'),
                        name: "flashcards"
                    },
                    {
                        path: 'learn/',
                        component: () => import('./views/set-viewer/LearnView.vue?chunkName=set-detail#'),
                        name: "learn"
                    },
                    {
                        path: 'test/',
                        component: () => import('./views/set-viewer/TestView.vue?chunkName=set-detail#'),
                        name: "test"
                    },
                    {
                        path: 'match/',
                        component: () => import('./views/set-viewer/MatchView.vue?chunkName=set-detail#'),
                        name: "match"
                    },
                    {
                        path: 'list/',
                        component: () => import('./views/set-viewer/ListView.vue?chunkName=set-detail#'),
                        name: "list"
                    },
                ]
            },
            {
                path: '/:type(set|quizlet)/:id([\\w\\d-]+)/edit/',
                name: 'set-editor',
                component: () => import('./views/SetEditorView.vue'),
                meta: {
                    title: "Edit Set",
                    requiresAuth: true
                },
                alias: '/:type(set)/:id(new|new-guide)/'
            },
            {
                path: '/search/:id/',
                name: 'collection-detail',
                component: () => import('./views/NotFoundView.vue'),
                meta: {
                    title: "Collection Detail"
                }
            },
            {
                path: '/collection/:id/',
                name: 'custom-collection-detail',
                component: () => import('./views/CollectionDetailView.vue'),
                meta: {
                    title: "Custom Collection Detail"
                }
            },
            {
                path: '/users/:uid/',
                name: 'user-profile',
                component: () => import('./views/UserProfileView.vue'),
                meta: {
                    title: "User Profile"
                }
            },
            {
                path: '/import/',
                name: 'import',
                component: () => import('./views/ImportView.vue'),
                meta: {
                    title: "Import Set"
                }
            }
        ]
    });

    const authStore = useAuthStore();
    const preferencesStore = usePreferencesStore();

    router.beforeEach(async (to, from) => {
        // Show the loading title if we're not navigating between two non name changing pages
        if (!(to.meta.name === undefined && from.meta.name === undefined))
            document.title = "Loading... - Vocabustudy"

        preferencesStore.startNavigation();

        if (to.meta.requiresAuth) {
            await authStore.refreshCurrentUser();
            if (!authStore.currentUser) {
                return {
                    path: "/login",
                    query: { next: to.fullPath },
                }
            }
        }
    });

    router.afterEach(to => {
        preferencesStore.stopNavigation();
        if (to.meta.title !== undefined)
            document.title = to.meta.title !== false ? `${to.meta.title} - Vocabustudy` : `Vocabustudy`;
        document.querySelector("link[rel='canonical']")?.setAttribute("href", new URL(to.path, "https://vocabustudy.org").toString());
    });

    router.onError(() => {
        if (!navigator.onLine) {
            void router.push({ name: "not-found" });
        }
    });

    return router;
}
