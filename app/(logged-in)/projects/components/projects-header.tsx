import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProjectsHeaderProps {
  hasProjects: boolean;
  onCreateClick: () => void;
  isRefreshing?: boolean;
}

export default function ProjectsHeader({ hasProjects, onCreateClick, isRefreshing = false }: ProjectsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl tracking-tight">Your Projects</h1>
        {isRefreshing && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {hasProjects && (
        <Button onClick={onCreateClick}>
          Create Project
        </Button>
      )}
    </div>
  );
}
