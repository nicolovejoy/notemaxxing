import { useCallback } from 'react';
import { OptimisticUpdate } from '@/lib/types';

export interface CRUDConfig<T, CreateReq, UpdateReq> {
  entityName: string;
  api: {
    getAll: () => Promise<T[]>;
    create: (data: CreateReq) => Promise<T>;
    update: (id: string, data: UpdateReq) => Promise<T>;
    delete: (id: string) => Promise<void>;
  };
  generateTempItem: (data: CreateReq) => T;
}

export interface CRUDState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  optimisticUpdates: OptimisticUpdate<T>[];
}

export interface CRUDActions<T, CreateReq, UpdateReq> {
  loadItems: () => Promise<void>;
  createItem: (data: CreateReq) => Promise<void>;
  updateItem: (id: string, data: UpdateReq) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setItems: (items: T[]) => void;
  clearError: () => void;
}

export function useCRUD<T extends { id: string }, CreateReq, UpdateReq>(
  config: CRUDConfig<T, CreateReq, UpdateReq>,
  state: CRUDState<T>,
  setState: (updater: (state: CRUDState<T>) => void) => void
): CRUDActions<T, CreateReq, UpdateReq> {
  const { entityName, api, generateTempItem } = config;

  const loadItems = useCallback(async () => {
    setState((state) => {
      state.loading = true;
      state.error = null;
    });

    try {
      const items = await api.getAll();
      setState((state) => {
        state.items = items;
        state.loading = false;
      });
    } catch (error) {
      setState((state) => {
        state.loading = false;
        state.error = error instanceof Error ? error.message : `Failed to load ${entityName}`;
      });
    }
  }, [api, entityName, setState]);

  const createItem = useCallback(async (data: CreateReq) => {
    const tempItem = generateTempItem(data);
    
    // Optimistic update
    setState((state) => {
      state.items.push(tempItem);
      state.optimisticUpdates.push({
        id: tempItem.id,
        type: 'create',
        data: tempItem,
        timestamp: Date.now(),
      });
    });

    try {
      const newItem = await api.create(data);
      setState((state) => {
        const index = state.items.findIndex((item) => item.id === tempItem.id);
        if (index !== -1) {
          state.items[index] = newItem;
        }
        state.optimisticUpdates = state.optimisticUpdates.filter(
          (update) => update.id !== tempItem.id
        );
      });
    } catch (error) {
      // Rollback on error
      setState((state) => {
        state.items = state.items.filter((item) => item.id !== tempItem.id);
        state.optimisticUpdates = state.optimisticUpdates.filter(
          (update) => update.id !== tempItem.id
        );
        state.error = error instanceof Error ? error.message : `Failed to create ${entityName}`;
      });
      throw error;
    }
  }, [api, entityName, generateTempItem, setState]);

  const updateItem = useCallback(async (id: string, data: UpdateReq) => {
    const originalItem = state.items.find((item) => item.id === id);
    if (!originalItem) return;

    // Optimistic update
    setState((state) => {
      const index = state.items.findIndex((item) => item.id === id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...data };
      }
    });

    try {
      const updatedItem = await api.update(id, data);
      setState((state) => {
        const index = state.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          state.items[index] = updatedItem;
        }
      });
    } catch (error) {
      // Rollback
      setState((state) => {
        const index = state.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          state.items[index] = originalItem;
        }
        state.error = error instanceof Error ? error.message : `Failed to update ${entityName}`;
      });
      throw error;
    }
  }, [api, entityName, setState, state.items]);

  const deleteItem = useCallback(async (id: string) => {
    const originalItems = [...state.items];

    // Optimistic update
    setState((state) => {
      state.items = state.items.filter((item) => item.id !== id);
    });

    try {
      await api.delete(id);
    } catch (error) {
      // Rollback
      setState((state) => {
        state.items = originalItems;
        state.error = error instanceof Error ? error.message : `Failed to delete ${entityName}`;
      });
      throw error;
    }
  }, [api, entityName, setState, state.items]);

  const setItems = useCallback((items: T[]) => {
    setState((state) => {
      state.items = items;
    });
  }, [setState]);

  const clearError = useCallback(() => {
    setState((state) => {
      state.error = null;
    });
  }, [setState]);

  return {
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    setItems,
    clearError,
  };
}