import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Play, Search, Table } from 'lucide-react';

export function DatabaseTabSkeleton() {
  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Database Management</h1>
        </div>
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Database Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                <Skeleton className="h-6 w-32" />
              </CardTitle>
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-muted-foreground" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="schema" className="w-full">
        <TabsList>
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Browse Data
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Query
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="space-y-6 pt-6 pb-12">
          {/* Schema content skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Table className="w-4 h-4" />
                      <Skeleton className="h-5 w-24" />
                    </CardTitle>
                    <Skeleton className="h-5 w-12" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, colIndex) => (
                      <div
                        key={colIndex}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Skeleton className="w-3 h-3" />
                            <Skeleton className="w-3 h-3" />
                          </div>
                          <div>
                            <Skeleton className="h-4 w-20 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="browse" className="space-y-6 pt-6 pb-12">
          {/* Table browser skeleton */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-5 w-32" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    <Skeleton className="h-5 w-24" />
                  </CardTitle>
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="border-b bg-muted/50 p-4">
                    <div className="flex gap-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-4 w-20" />
                      ))}
                    </div>
                  </div>

                  {Array.from({ length: 6 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="border-b p-4">
                      <div className="flex gap-4">
                        {Array.from({ length: 5 }).map((_, colIndex) => (
                          <Skeleton key={colIndex} className="h-4 w-20" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="query" className="space-y-6 pt-6 pb-12">
          {/* Query runner skeleton */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-5 w-32" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    <Skeleton className="h-5 w-24" />
                  </CardTitle>
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="border-b bg-muted/50 p-4">
                    <div className="flex gap-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-4 w-24" />
                      ))}
                    </div>
                  </div>

                  {Array.from({ length: 4 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="border-b p-4">
                      <div className="flex gap-4">
                        {Array.from({ length: 4 }).map((_, colIndex) => (
                          <Skeleton key={colIndex} className="h-4 w-24" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
