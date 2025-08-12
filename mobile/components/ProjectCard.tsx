import { Link } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';

type Project = {
  id: string | number;
  name: string;
  description: string;
  updatedAt: Date;
};

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} asChild>
      <TouchableOpacity className="bg-card rounded-xl p-4 mx-5 mb-3 border border-border min-h-[100px]">
        <View>
          <Text className="text-lg font-semibold text-card-foreground mb-2">{project.name}</Text>
          <Text
            className="text-sm text-muted-foreground leading-5"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {project.description}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <View className="bg-card rounded-xl p-4 mx-5 mb-3 border border-border min-h-[100px]">
      <View>
        <Skeleton width="70%" height={22} className="mb-2" />
        <Skeleton width="100%" height={16} className="mb-1" />
        <Skeleton width="85%" height={16} />
      </View>
    </View>
  );
}
