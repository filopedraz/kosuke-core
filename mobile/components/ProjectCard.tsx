import { Link } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Project = {
  id: string;
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
