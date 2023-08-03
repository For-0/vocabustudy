import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'; // we import this here to make sure it loads instantly without having to wait for a network request
import { useAuthStore, usePreferencesStore } from './store';
import type { Component } from 'vue';

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
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
                component: HomeView as Component,
            },
            {
                path: '/credits/',
                name: 'credits',
                component: () => import('./views/CreditsView.vue'),
                meta: {
                    title: "Credits"
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
                component: () => import('./views/SocialView.vue'),
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
                component: () => import('./views/SupportUsView.vue'),
                meta: {
                    title: "Support Us"
                }
            },
            {
                path: '/privacy/',
                name: 'privacy',
                component: () => import('./views/PrivacyPolicyView.vue'),
                meta: {
                    title: "Privacy Policy"
                }
            },
            {
                path: '/terms/',
                name: 'terms',
                component: () => import('./views/TOSView.vue'),
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
                component: () => import('./views/LoginView.vue'),
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
                component: () => import('./views/AccountView.vue'),
                meta: {
                    title: "Account",
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
                path: '/set/:id/view/',
                name: 'set-detail',
                component: () => import('./views/NotFoundView.vue'),
                meta: {
                    title: "Set Detail"
                }
            },
            {
                path: '/set/:id/edit/',
                name: 'set-editor',
                component: () => import('./views/NotFoundView.vue'),
                meta: {
                    title: "Set Editor"
                }
            },
            {
                path: '/collection/:id/',
                name: 'collection-detail',
                component: () => import('./views/NotFoundView.vue'),
                meta: {
                    title: "Collection Detail"
                }
            }
        ]
    });

    const authStore = useAuthStore();
    const preferencesStore = usePreferencesStore();

    router.beforeEach(async (to, _from) => {
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

    router.afterEach((to) => {
        preferencesStore.stopNavigation();
        document.title = to.meta.title ? `${to.meta.title} - Vocabustudy` : `Vocabustudy`;
        document.querySelector("link[rel='canonical']")?.setAttribute("href", new URL(to.path, "https://vocabustudy.org").toString());
    });

    return router;
}
