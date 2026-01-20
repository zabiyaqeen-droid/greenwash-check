import { writable } from 'svelte/store';

interface User {
  name: string;
  email: string;
  company: string;
  jobTitle?: string;
  linkedIn?: string;
}

function createUserStore() {
  const { subscribe, set, update } = writable<User | null>(null);

  return {
    subscribe,
    login: (user: User) => {
      set(user);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('greenwash_user', JSON.stringify(user));
      }
    },
    logout: () => {
      set(null);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('greenwash_user');
      }
    },
    init: () => {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('greenwash_user');
        if (stored) {
          try {
            set(JSON.parse(stored));
          } catch (e) {
            localStorage.removeItem('greenwash_user');
          }
        }
      }
    }
  };
}

export const user = createUserStore();
