"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { PedagogicalDistributionChart } from "@/components/dashboard/pedagogical-distribution-chart";
import { CriticalSubjectsChart } from "@/components/dashboard/critical-subjects-chart";
import { PedagogicalHeatmap } from "@/components/dashboard/pedagogical-heatmap";
import { ClassroomRanking } from "@/components/dashboard/classroom-ranking";
import { CriticalStudentsList } from "@/components/dashboard/critical-students-list";
import { ClassroomAverageChart } from "@/components/dashboard/classroom-average-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PEDAGOGICAL_LEVELS } from "@/lib/school-data";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  AlertTriangle,
  Grid3X3,
} from "lucide-react";

const STORAGE_KEY = "dashboard-tab";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveTab(stored);
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        {/* Legenda Pedagógica - Otimizada para TV */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-6 rounded-xl border-2 border-border bg-card p-4">
          <span className="text-base font-semibold text-foreground">Classificacao Pedagogica:</span>
          {Object.entries(PEDAGOGICAL_LEVELS).map(([key, level]) => (
            <div key={key} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
              <div
                className="h-5 w-5 rounded"
                style={{ backgroundColor: level.color }}
              />
              <span className="text-base font-semibold text-foreground">{level.label}</span>
              <span className="rounded bg-secondary px-2 py-0.5 text-sm font-bold text-muted-foreground">
                {level.min}-{level.max}
              </span>
            </div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-card p-2">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 px-4 py-2.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Visao Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="turmas"
              className="flex items-center gap-2 px-4 py-2.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-5 w-5" />
              <span>Turmas</span>
            </TabsTrigger>
            <TabsTrigger
              value="disciplinas"
              className="flex items-center gap-2 px-4 py-2.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BookOpen className="h-5 w-5" />
              <span>Disciplinas</span>
            </TabsTrigger>
            <TabsTrigger
              value="alertas"
              className="flex items-center gap-2 px-4 py-2.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <AlertTriangle className="h-5 w-5" />
              <span>Alertas</span>
            </TabsTrigger>
            <TabsTrigger
              value="heatmap"
              className="flex items-center gap-2 px-4 py-2.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Grid3X3 className="h-5 w-5" />
              <span>Heatmap</span>
            </TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <KPICards />
            <PedagogicalDistributionChart />
            <div className="grid gap-6 lg:grid-cols-2">
              <ClassroomRanking />
              <CriticalStudentsList />
            </div>
          </TabsContent>

          {/* Turmas */}
          <TabsContent value="turmas" className="space-y-6">
            <ClassroomAverageChart />
            <ClassroomRanking />
            <PedagogicalDistributionChart />
          </TabsContent>

          {/* Disciplinas */}
          <TabsContent value="disciplinas" className="space-y-6">
            <CriticalSubjectsChart />
          </TabsContent>

          {/* Alertas */}
          <TabsContent value="alertas" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <CriticalStudentsList />
              <ClassroomRanking />
            </div>
          </TabsContent>

          {/* Heatmap */}
          <TabsContent value="heatmap" className="space-y-6">
            <PedagogicalHeatmap />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-8 border-t-2 border-border pt-6 text-center">
          <p className="text-base text-muted-foreground">
            Dados extraidos das Atas de Conselho de Classe - 1º Bimestre de 2026
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            EE Carlos Bernardes Staut - Ribeirao dos Indios, SP
          </p>
          <p className="mt-2 text-lg font-semibold text-primary">
            Painel Analitico Educacional Inteligente
          </p>
        </footer>
      </main>
    </div>
  );
}
