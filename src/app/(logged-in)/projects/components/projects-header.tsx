import { Button } from "@/components/ui/button";

interface ProjectsHeaderProps {
  hasProjects: boolean;
  onCreateClick: () => void;
}

export default function ProjectsHeader({ hasProjects, onCreateClick }: ProjectsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl tracking-tight">Your Projects</h1>
      </div>
      {hasProjects && (
        <Button onClick={onCreateClick}>
          Create Project
        </Button>
      )}
    </div>
  );
}
