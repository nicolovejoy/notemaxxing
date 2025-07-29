# Simplification & Fortification Plan

## 🎯 Priority Order

### Phase 1: Quick Wins (1-2 days)

1. **Extract Constants** - Colors, storage keys, default values
2. **Create Shared UI Components** - Card, Modal, IconButton, Skeletons
3. **Unified Type System** - Single source of truth in `/lib/types`
4. **Error Boundaries** - Wrap main routes for stability

### Phase 2: Core Migration (3-5 days)

5. **Complete Zustand Migration**
   - Homepage → Zustand
   - Notebooks page → Zustand
   - Quizzing → Zustand
6. **Generic CRUD Hooks** - Reduce repetition across entities
7. **Component Decomposition** - Break down 500+ line components

### Phase 3: Fortification (1 week)

8. **Offline Queue System** - IndexedDB for reliability
9. **Type-Safe API Layer** - Better Supabase integration
10. **Performance Optimizations** - React.memo, lazy loading
11. **Migration Utility** - Auto-migrate localStorage data

## 🚀 Implementation Strategy

**Start Small**: Begin with constants/UI components (no breaking changes)
**Test Incrementally**: Migrate one page at a time
**Maintain Backwards Compatibility**: Keep localStorage as fallback initially
**Monitor Errors**: Add error boundaries before major changes

## 📊 Success Metrics

- [ ] Zero duplicate type definitions
- [ ] All pages using Zustand
- [ ] No components > 300 lines
- [ ] 90% code reuse for CRUD operations
- [ ] Offline support working
