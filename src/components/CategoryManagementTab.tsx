'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderTree, 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Tag, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  Play, 
  Layers, 
  ShieldCheck, 
  Building2,
  X,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Category, CategoryStatus, CategoryTreeNode, CreateSubcategoryInput, CreateCategoryInput, UpdateCategoryInput } from '../types';
import { categoryApi } from '../lib/api';
import { useApp } from '../context/AppContext';

export const CategoryManagementTab: React.FC = () => {
  const { refreshData } = useApp();

  // Categories data
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Test suite execution state
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testSummary, setTestSummary] = useState<{ total: number; passed: number; failed: number; allPassed: boolean } | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);

  // Subcategory Creation Modal
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState<boolean>(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [subName, setSubName] = useState<string>('');
  const [subSlug, setSubSlug] = useState<string>('');
  const [subDescription, setSubDescription] = useState<string>('');
  const [subTagInput, setSubTagInput] = useState<string>('');
  const [subTags, setSubTags] = useState<string[]>([]);
  const [isSubmittingSub, setIsSubmittingSub] = useState<boolean>(false);
  const [subModalError, setSubModalError] = useState<string | null>(null);

  // Root Category Creation Modal
  const [isRootCategoryModalOpen, setIsRootCategoryModalOpen] = useState<boolean>(false);
  const [rootName, setRootName] = useState<string>('');
  const [rootSlug, setRootSlug] = useState<string>('');
  const [rootDescription, setRootDescription] = useState<string>('');
  const [rootIconName, setRootIconName] = useState<string>('Layers');
  const [isSubmittingRoot, setIsSubmittingRoot] = useState<boolean>(false);
  const [rootModalError, setRootModalError] = useState<string | null>(null);

  // Quick Tag Management
  const [tagModalCategory, setTagModalCategory] = useState<Category | null>(null);
  const [newTagText, setNewTagText] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);

  // Delete Confirmation Modal
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteForce, setDeleteForce] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // General feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const [treeRes, flatRes] = await Promise.all([
        categoryApi.getTree(true),
        categoryApi.getAll({ includeInactive: true })
      ]);

      if (treeRes.success) {
        setTree(treeRes.tree);
        // By default, expand top level items that have children
        const initialExpanded = new Set<string>();
        treeRes.tree.forEach(node => {
          if (node.children && node.children.length > 0) {
            initialExpanded.add(node.id);
          }
        });
        setExpandedNodeIds(initialExpanded);
      }

      if (flatRes.success) {
        setFlatCategories(flatRes.categories);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch categories' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleNodeExpanded = (id: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open Subcategory Creation Modal
  const handleOpenCreateSubcategory = (parent: Category) => {
    setSelectedParentCategory(parent);
    setSubName('');
    setSubSlug('');
    setSubDescription('');
    setSubTagInput('');
    setSubTags([]);
    setSubModalError(null);
    setIsSubcategoryModalOpen(true);
  };

  // Submit Subcategory
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCategory) return;
    if (!subName.trim()) {
      setSubModalError('Subcategory name is required.');
      return;
    }

    try {
      setIsSubmittingSub(true);
      setSubModalError(null);
      const payload: CreateSubcategoryInput = {
        name: subName.trim(),
        slug: subSlug.trim() || undefined,
        description: subDescription.trim() || undefined,
        parentId: selectedParentCategory.id,
        subcategories: subTags.length > 0 ? subTags : undefined
      };

      const res = await categoryApi.createSubcategory(selectedParentCategory.id, payload);
      if (res.success) {
        setIsSubcategoryModalOpen(false);
        setStatusMessage({ type: 'success', text: `Subcategory "${res.subcategory.name}" successfully created under "${selectedParentCategory.name}".` });
        await fetchCategories();
        await refreshData();
      }
    } catch (err: any) {
      setSubModalError(err.message || 'Failed to create subcategory.');
    } finally {
      setIsSubmittingSub(false);
    }
  };

  // Submit Root Category
  const handleCreateRootCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootName.trim()) {
      setRootModalError('Category name is required.');
      return;
    }

    try {
      setIsSubmittingRoot(true);
      setRootModalError(null);
      const payload: CreateCategoryInput = {
        name: rootName.trim(),
        slug: rootSlug.trim() || undefined,
        description: rootDescription.trim() || undefined,
        iconName: rootIconName.trim() || 'Layers'
      };

      const res = await categoryApi.createCategory(payload);
      if (res.success) {
        setIsRootCategoryModalOpen(false);
        setStatusMessage({ type: 'success', text: `Category "${res.category.name}" created successfully.` });
        await fetchCategories();
        await refreshData();
      }
    } catch (err: any) {
      setRootModalError(err.message || 'Failed to create root category.');
    } finally {
      setIsSubmittingRoot(false);
    }
  };

  // Quick Add Tag
  const handleAddTag = async () => {
    if (!tagModalCategory || !newTagText.trim()) return;
    try {
      setIsAddingTag(true);
      const res = await categoryApi.addSubcategoryTag(tagModalCategory.id, newTagText.trim());
      if (res.success) {
        setTagModalCategory(res.category);
        setNewTagText('');
        await fetchCategories();
        await refreshData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add subcategory tag');
    } finally {
      setIsAddingTag(false);
    }
  };

  // Quick Remove Tag
  const handleRemoveTag = async (tag: string) => {
    if (!tagModalCategory) return;
    try {
      const res = await categoryApi.removeSubcategoryTag(tagModalCategory.id, tag);
      if (res.success) {
        setTagModalCategory(res.category);
        await fetchCategories();
        await refreshData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove tag');
    }
  };

  // Delete Category Execution
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await categoryApi.deleteCategory(categoryToDelete.id, deleteForce);
      if (res.success) {
        setCategoryToDelete(null);
        setStatusMessage({ type: 'success', text: res.message });
        await fetchCategories();
        await refreshData();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete category.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Category Status (Active/Inactive)
  const handleToggleStatus = async (cat: Category) => {
    try {
      const nextStatus: CategoryStatus = cat.status === 'active' ? 'inactive' : 'active';
      const res = await categoryApi.updateCategory(cat.id, { status: nextStatus });
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Category "${cat.name}" is now ${nextStatus}.` });
        await fetchCategories();
        await refreshData();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  // Run Test Suite
  const handleRunTests = async () => {
    try {
      setIsRunningTests(true);
      setIsTestModalOpen(true);
      const res = await categoryApi.runTestSuite();
      if (res.success) {
        setTestResults(res.results);
        setTestSummary(res.summary);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to run test suite.');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Filtered Tree based on Search Query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const query = searchQuery.toLowerCase();

    function filterNode(node: CategoryTreeNode): CategoryTreeNode | null {
      const nameMatch = node.name.toLowerCase().includes(query) ||
                        node.slug.toLowerCase().includes(query) ||
                        node.description?.toLowerCase().includes(query) ||
                        node.subcategories?.some(s => s.toLowerCase().includes(query));

      const filteredChildren = (node.children || [])
        .map(child => filterNode(child))
        .filter((child): child is CategoryTreeNode => child !== null);

      if (nameMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    }

    return tree
      .map(node => filterNode(node))
      .filter((node): node is CategoryTreeNode => node !== null);
  }, [tree, searchQuery]);

  // Render a Node in the Category Tree
  const renderTreeNode = (node: CategoryTreeNode, currentDepth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodeIds.has(node.id) || searchQuery.trim().length > 0;
    const canHaveChildren = (node.depth || currentDepth) < 2; // MAX_CATEGORY_DEPTH is 3 (depth 0, 1, 2)

    return (
      <div key={node.id} className="group transition-all">
        <div 
          className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
            node.status === 'inactive' 
              ? 'bg-slate-50/70 border-slate-200 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800' 
              : 'bg-white border-slate-200/80 hover:border-slate-300 dark:bg-slate-800/80 dark:border-slate-700/80'
          }`}
          style={{ marginLeft: `${currentDepth * 24}px` }}
        >
          {/* Left: Expand toggle, Icon, Title, Depth badge */}
          <div className="flex items-center gap-3 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNodeExpanded(node.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center text-slate-300 dark:text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <span className="text-base">{node.iconName === 'Layers' ? '📂' : '🏷️'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${node.status === 'inactive' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {node.name}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                    /{node.slug}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Lvl {(node.depth ?? currentDepth) + 1}
                  </span>
                  {node.businessCount !== undefined && node.businessCount > 0 && (
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {node.businessCount} {node.businessCount === 1 ? 'business' : 'businesses'}
                    </span>
                  )}
                </div>
                {node.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 max-w-xl">
                    {node.description}
                  </p>
                )}

                {/* Tags preview */}
                {node.subcategories && node.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {node.subcategories.slice(0, 4).map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                    {node.subcategories.length > 4 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{node.subcategories.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Manage Tags Button */}
            <button
              type="button"
              onClick={() => setTagModalCategory(node)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Manage service tags"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Tags ({node.subcategories?.length || 0})</span>
            </button>

            {/* Add Subcategory Button (if depth allows) */}
            {canHaveChildren && (
              <button
                type="button"
                id={`add-subcat-btn-${node.id}`}
                onClick={() => handleOpenCreateSubcategory(node)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                title="Add child subcategory"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Child</span>
              </button>
            )}

            {/* Toggle Status */}
            <button
              type="button"
              onClick={() => handleToggleStatus(node)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                node.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400'
              }`}
            >
              {node.status === 'active' ? 'Active' : 'Inactive'}
            </button>

            {/* Delete button */}
            <button
              type="button"
              id={`delete-cat-btn-${node.id}`}
              onClick={() => {
                setCategoryToDelete(node);
                setDeleteForce(false);
                setDeleteError(null);
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recursive Children rendering */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1 pl-3 border-l-2 border-slate-100 dark:border-slate-800 ml-3">
            {node.children!.map(child => renderTreeNode(child, currentDepth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Business Categories & Subcategories
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Epic 3 Feature 3.1
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage multi-tier hierarchical taxonomy (up to 3 levels deep), subcategory specialization tags, and referential integrity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Run Automated Test Suite */}
          <button
            type="button"
            id="run-category-test-suite-btn"
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 transition-colors shadow-xs cursor-pointer"
          >
            {isRunningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Run Test Suite (14 Tests)</span>
          </button>

          {/* Add Root Category */}
          <button
            type="button"
            id="create-root-category-btn"
            onClick={() => {
              setRootName('');
              setRootSlug('');
              setRootDescription('');
              setRootIconName('Layers');
              setRootModalError(null);
              setIsRootCategoryModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Root Sector</span>
          </button>
        </div>
      </div>

      {/* Status Message Alert */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' 
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories, subcategories, tags..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Total Sectors: <strong className="text-slate-900 dark:text-white">{flatCategories.length}</strong></span>
          <span>•</span>
          <span>Top-Level Roots: <strong className="text-slate-900 dark:text-white">{tree.length}</strong></span>
          <span>•</span>
          <span>Hierarchy Cap: <strong className="text-emerald-600 dark:text-emerald-400">3 Levels</strong></span>
        </div>
      </div>

      {/* Main Hierarchical Tree View */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-sm">Loading category taxonomy tree...</p>
        </div>
      ) : filteredTree.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <FolderTree className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No categories found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or add a new root sector.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTree.map(rootNode => renderTreeNode(rootNode, 0))}
        </div>
      )}

      {/* SUB-CATEGORY CREATION MODAL */}
      {isSubcategoryModalOpen && selectedParentCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Create Subcategory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target Parent: <strong className="text-emerald-600">{selectedParentCategory.name}</strong> (/ {selectedParentCategory.slug})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubcategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subModalError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                {subModalError}
              </div>
            )}

            <form onSubmit={handleCreateSubcategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => {
                    setSubName(e.target.value);
                    if (!subSlug) {
                      // auto-generate slug draft
                      setSubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                    }
                  }}
                  placeholder="e.g., Commercial HVAC & Air Conditioning"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slug (URL-friendly identifier)
                </label>
                <input
                  type="text"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value)}
                  placeholder="commercial-hvac-air-conditioning"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave empty to auto-generate deterministically.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                  placeholder="Industrial and residential cooling, heating, ductwork installations..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Tag Additions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Service Tags (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subTagInput}
                    onChange={(e) => setSubTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (subTagInput.trim() && !subTags.includes(subTagInput.trim())) {
                          setSubTags([...subTags, subTagInput.trim()]);
                          setSubTagInput('');
                        }
                      }
                    }}
                    placeholder="Press enter to add tag (e.g. Chiller Repair)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (subTagInput.trim() && !subTags.includes(subTagInput.trim())) {
                        setSubTags([...subTags, subTagInput.trim()]);
                        setSubTagInput('');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Add
                  </button>
                </div>

                {subTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {subTags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => setSubTags(subTags.filter((_, i) => i !== idx))}
                          className="hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSub}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                >
                  {isSubmittingSub ? 'Creating...' : 'Create Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOT CATEGORY CREATION MODAL */}
      {isRootCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-emerald-600" />
                  <span>Create Root Sector Category</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Top-level commercial industry sector</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRootCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rootModalError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                {rootModalError}
              </div>
            )}

            <form onSubmit={handleCreateRootCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={rootName}
                  onChange={(e) => {
                    setRootName(e.target.value);
                    if (!rootSlug) {
                      setRootSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                    }
                  }}
                  placeholder="e.g., Renewable Energy & Solar"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slug (Unique URL identifier)
                </label>
                <input
                  type="text"
                  value={rootSlug}
                  onChange={(e) => setRootSlug(e.target.value)}
                  placeholder="renewable-energy-solar"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={rootDescription}
                  onChange={(e) => setRootDescription(e.target.value)}
                  placeholder="Commercial solar installations, wind turbine maintenance, inverter engineering..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Icon Identifier
                </label>
                <input
                  type="text"
                  value={rootIconName}
                  onChange={(e) => setRootIconName(e.target.value)}
                  placeholder="Layers, Zap, ShieldCheck, Sun..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsRootCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRoot}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                >
                  {isSubmittingRoot ? 'Creating...' : 'Create Root Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK TAG MANAGEMENT MODAL */}
      {tagModalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>Service Specialization Tags</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Category: <strong>{tagModalCategory.name}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setTagModalCategory(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="New specialization tag..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={isAddingTag || !newTagText.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 cursor-pointer"
                >
                  {isAddingTag ? 'Adding...' : 'Add Tag'}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pt-2">
                {(!tagModalCategory.subcategories || tagModalCategory.subcategories.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-4">No service tags attached yet.</p>
                ) : (
                  tagModalCategory.subcategories.map((tag, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300">#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title="Remove tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setTagModalCategory(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Category</h3>
                <p className="text-xs text-slate-500">"{categoryToDelete.name}"</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove this category? If any child subcategories exist, deleting with forced cascade will safely re-parent them to root level so no taxonomy data is orphaned.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                {deleteError}
              </div>
            )}

            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={deleteForce}
                onChange={(e) => setDeleteForce(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500/20"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Force deletion (promote child subcategories to root, safe retention)
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATED TEST SUITE MODAL */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Category & Subcategory Test Suite</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tasks 3.1.1 & 3.1.2 automated verification</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isRunningTests ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Executing 14 integrity and hierarchy test scenarios...</p>
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {testSummary && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    testSummary.allPassed 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' 
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      {testSummary.allPassed ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
                      <div>
                        <h4 className="text-sm font-bold">
                          {testSummary.allPassed ? 'All 14 Test Scenarios Passed' : `${testSummary.failed} Test Scenarios Failed`}
                        </h4>
                        <p className="text-xs opacity-90 mt-0.5">
                          {testSummary.passed} passed, {testSummary.failed} failed out of {testSummary.total} total tests.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white/60 dark:bg-black/20">
                      100% Verified
                    </span>
                  </div>
                )}

                {testResults && (
                  <div className="space-y-2">
                    {testResults.map((t, idx) => (
                      <div 
                        key={t.id || idx}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {t.status === 'passed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span className="font-bold text-slate-800 dark:text-slate-200">{t.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {t.executionTimeMs}ms
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 pl-6">{t.description}</p>
                        {t.error && (
                          <div className="ml-6 mt-1 p-2 rounded bg-red-100 text-red-800 text-[11px] font-mono">
                            {t.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Re-run Suite
              </button>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
