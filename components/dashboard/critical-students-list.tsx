"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_CLASSROOMS, getCriticalStudents, getPedagogicalDistribution, PEDAGOGICAL_LEVELS } from "@/lib/school-data";
import { AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

export function CriticalStudentsList() {
  const criticalStudents = getCriticalStudents();

  // Agrupa por turma
  const criticalByClassroom = ALL_CLASSROOMS.map((classroom) => {
    const dist = getPedagogicalDistribution(classroom);
    const criticalCount = criticalStudents.filter(
      (s) => s.classroom.id === classroom.id
    ).length;
    return {
      name: classroom.name.replace("º Ano", "º").replace("ª Série", "ª"),
      fullName: classroom.name,
      critical: dist.critical,
      criticalStudents: criticalCount,
      total: classroom.totalActive,
      percent: ((dist.critical / classroom.totalActive) * 100).toFixed(0),
    };
  }).sort((a, b) => b.critical - a.critical);

  const totalCritical = criticalByClassroom.reduce((acc, c) => acc + c.critical, 0);

  if (totalCritical === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Alunos em Situacao Critica</CardTitle>
          <CardDescription className="text-base">Alunos com media abaixo de 5.0</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-success/10 p-4">
              <AlertTriangle className="h-10 w-10 text-success" />
            </div>
            <p className="mt-4 text-lg text-muted-foreground">
              Nenhum aluno em situacao critica encontrado!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl">
              <AlertTriangle className="h-6 w-6 text-critical" />
              Alunos Criticos por Turma
            </CardTitle>
            <CardDescription className="mt-1 text-base">
              {totalCritical} alunos abaixo do basico necessitam intervencao
            </CardDescription>
          </div>
          <Badge variant="destructive" className="px-3 py-1.5 text-base">
            {totalCritical} alunos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={criticalByClassroom}
            layout="vertical"
            margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "2px solid hsl(var(--border))",
                borderRadius: "12px",
                padding: "12px 16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              labelStyle={{
                color: "hsl(var(--foreground))",
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
              }}
              itemStyle={{
                color: "hsl(var(--foreground))",
                fontSize: 14,
              }}
              formatter={(value: number, name: string, props: { payload: { total: number; percent: string } }) => {
                return [`${value} de ${props.payload.total} alunos (${props.payload.percent}%)`, "Criticos"];
              }}
              labelFormatter={(label) => {
                const item = criticalByClassroom.find((c) => c.name === label);
                return item?.fullName || label;
              }}
            />
            <Bar dataKey="critical" radius={[0, 8, 8, 0]} maxBarSize={32}>
              {criticalByClassroom.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.critical > 5 ? PEDAGOGICAL_LEVELS.critical.color : entry.critical > 2 ? "#f97316" : PEDAGOGICAL_LEVELS.basic.color}
                />
              ))}
              <LabelList
                dataKey="critical"
                position="right"
                fill="hsl(var(--foreground))"
                fontSize={16}
                fontWeight={700}
                formatter={(value: number) => `${value}`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {criticalByClassroom.slice(0, 4).map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-critical">{item.critical}</div>
              <div className="text-xs text-muted-foreground">
                de {item.total} ({item.percent}%)
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="text-sm text-warning-foreground">
            <strong>Recomendacao:</strong> Alunos em situacao critica necessitam de acompanhamento pedagogico 
            individualizado e possivel contato com as familias.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
