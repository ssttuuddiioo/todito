import { useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for managing notes archive (for AI notes parser)
 * Table: toditox_notes_archive
 */
export function useNotesArchive() {
  const {
    data: notesArchive,
    loading,
    error,
    create,
    remove,
    refresh,
  } = useSupabaseTable('toditox_notes_archive');

  // Add to archive
  const addNotesArchive = useCallback(async (archive) => {
    return create(archive);
  }, [create]);

  // Delete from archive
  const deleteNotesArchive = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  return {
    notesArchive,
    loading,
    error,
    addNotesArchive,
    deleteNotesArchive,
    refresh,
  };
}

/**
 * Hook for managing ignored items (for AI notes parser "Later" feature)
 * Table: toditox_ignored_items
 */
export function useIgnoredItems() {
  const {
    data: ignoredItems,
    loading,
    error,
    create,
    remove,
    refresh,
  } = useSupabaseTable('toditox_ignored_items');

  // Add ignored item
  const addIgnoredItem = useCallback(async (item) => {
    return create(item);
  }, [create]);

  // Delete ignored item
  const deleteIgnoredItem = useCallback(async (id) => {
    return remove(id);
  }, [remove]);

  return {
    ignoredItems,
    loading,
    error,
    addIgnoredItem,
    deleteIgnoredItem,
    refresh,
  };
}
