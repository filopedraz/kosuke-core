'use client';

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'updated';

interface ProjectFiltersProps {
  onFiltersChange: (search: string, sort: SortOption) => void;
  totalProjects?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function ProjectFilters({ 
  onFiltersChange,
  totalProjects = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {}
}: ProjectFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'newest');

  // Apply filters when they change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }

    if (sort !== 'newest') {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }
    
    // Reset to page 1 when filters change
    params.set('page', '1');
    
    // Update URL without refreshing the page
    router.push(`?${params.toString()}`, { scroll: false });
    
    // Notify parent component
    onFiltersChange(search, sort);
  }, [search, sort, router, searchParams, onFiltersChange]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    
    onPageChange(newPage);
    
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full h-10 py-0"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Sort options */}
        <Select value={sort} onValueChange={(value: SortOption) => setSort(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="updated">Recently updated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between items-center">
        {/* Total count */}
        <div className="text-sm text-muted-foreground">
          {totalProjects} project{totalProjects !== 1 ? 's' : ''}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 