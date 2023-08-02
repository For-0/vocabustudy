import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import { useAuthStore } from './store';
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
                path: '/credits',
                name: 'credits',
                component: () => import('./views/CreditsView.vue'),
                meta: {
                    title: "Credits"
                }
            },
            {
                path: '/support-us',
                name: 'support-us',
                component: () => import('./views/SupportUsView.vue'),
                meta: {
                    title: "Support Us"
                }
            },
            {
                path: '/login',
                name: 'login',
                component: () => import('./views/LoginView.vue'),
                meta: {
                    title: "Log In"
                }
            },
            {
                path: '/signup',
                redirect: { name: "login" }
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
                path: '/set/:id/view',
                name: 'set-detail',
                component: () => import('./views/NotFoundView.vue'),
                meta: {
                    title: "Set Detail"
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

    router.beforeEach(async (to, _from) => {
        document.title = to.meta.title ? `${to.meta.title} - Vocabustudy` : `Vocabustudy`;
        document.querySelector("link[rel='canonical']")?.setAttribute("href", new URL(to.path, "https://vocabustudy.org").toString());
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

    return router;
}
