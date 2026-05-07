"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ALL_CLASSROOMS,
  SCHOOL_INFO,
  getClassroomAverage,
  getSchoolPedagogicalDistribution,
  getCriticalStudents,
  getClassroomRanking,
  getCriticalSubjects,
} from "@/lib/school-data";
import {
  Users,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  Target,
  AlertCircle,
} from "lucide-react";

export function KPICards() {
  const distribution = getSchoolPedagogicalDistribution();
  const criticalStudents = getCriticalStudents();
  const ranking = getClassroomRanking();
  const criticalSubjects = getCriticalSubjects();

  const schoolAverage =
    ALL_CLASSROOMS.reduce((acc, c) => acc + getClassroomAverage(c), 0) /
    ALL_CLASSROOMS.length;

  const bestClass = ranking[0];
  const worstClass = ranking[ranking.length - 1];
  const mostCriticalSubject = criticalSubjects[0];

  const totalActive = distribution.critical + distribution.basic + distribution.adequate + distribution.advanced;
  const adequatePercent = ((distribution.adequate + distribution.advanced) / totalActive * 100).toFixed(1);

  const kpis = [
    {
      title: "Total de Alunos",
      value: SCHOOL_INFO.totalStudents,
      subtitle: `${ALL_CLASSROOMS.length} turmas ativas`,
      icon: Users,
      color: "text-foreground",
      bgColor: "bg-secondary",
    },
    {
      title: "Media Geral",
      value: schoolAverage.toFixed(1),
      subtitle: `${SCHOOL_INFO.bimester} de ${SCHOOL_INFO.year}`,
      icon: Target,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Alunos Criticos",
      value: criticalStudents.length,
      subtitle: `${distribution.critical} abaixo do basico`,
      icon: AlertTriangle,
      color: "text-critical",
      bgColor: "bg-critical/10",
    },
    {
      title: "Adequado + Avancado",
      value: `${adequatePercent}%`,
      subtitle: `${distribution.adequate + distribution.advanced} estudantes`,
      icon: GraduationCap,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Melhor Turma",
      value: bestClass.classroom.name.replace("º Ano", "º").replace("ª Série", "ª"),
      subtitle: `Media ${bestClass.average.toFixed(1)}`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Turma em Alerta",
      value: worstClass.classroom.name.replace("º Ano", "º").replace("ª Série", "ª"),
      subtitle: `Media ${worstClass.average.toFixed(1)}`,
      icon: TrendingDown,
      color: "text-critical",
      bgColor: "bg-critical/10",
    },
    {
      title: "Disciplina Critica",
      value: mostCriticalSubject?.name.split(" ")[0] || "-",
      subtitle: mostCriticalSubject ? `${mostCriticalSubject.percentCritical.toFixed(0)}% abaixo do basico` : "-",
      icon: BookOpen,
      color: "text-critical",
      bgColor: "bg-critical/10",
    },
    {
      title: "Pontos de Atencao",
      value: ALL_CLASSROOMS.reduce((acc, c) => acc + c.students.filter(s => s.isAttention).length, 0),
      subtitle: "Alunos sinalizados",
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="border-2 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <div className={`rounded-lg p-2.5 ${kpi.bgColor}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <p className="mt-1 text-sm text-muted-foreground">{kpi.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
