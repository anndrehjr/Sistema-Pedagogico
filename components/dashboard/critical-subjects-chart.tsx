"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCriticalSubjects, PEDAGOGICAL_LEVELS } from "@/lib/school-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";

export function CriticalSubjectsChart() {
  const criticalSubjects = getCriticalSubjects().slice(0, 12);

  const getBarColor = (percent: number) => {
    if (percent >= 30) return PEDAGOGICAL_LEVELS.critical.color;
    if (percent >= 20) return PEDAGOGICAL_LEVELS.basic.color;
    if (percent >= 10) return PEDAGOGICAL_LEVELS.adequate.color;
    return PEDAGOGICAL_LEVELS.advanced.color;
  };

  const data = criticalSubjects.map((subject) => ({
    name: subject.name.length > 14 ? subject.name.substring(0, 14) + "..." : subject.name,
    fullName: subject.name,
    percent: Math.round(subject.percentCritical),
    color: getBarColor(subject.percentCritical),
  }));

  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Componentes Curriculares Criticos</CardTitle>
        <CardDescription className="text-base">
          Percentual de alunos com nota abaixo do basico (1-4) por disciplina
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 60, left: 130, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              domain={[0, 50]}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 14 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: 600 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={130}
            />
            <ReferenceLine
              x={30}
              stroke={PEDAGOGICAL_LEVELS.critical.color}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Critico (30%)",
                fill: PEDAGOGICAL_LEVELS.critical.color,
                fontSize: 13,
                fontWeight: 700,
                position: "top",
              }}
            />
            <Bar dataKey="percent" radius={[0, 8, 8, 0]} maxBarSize={30}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="percent"
                position="right"
                fill="hsl(var(--foreground))"
                fontSize={15}
                fontWeight={700}
                formatter={(value: number) => `${value}%`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: PEDAGOGICAL_LEVELS.critical.color }}
            />
            <span className="text-sm font-bold text-foreground">30%+ Critico</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: PEDAGOGICAL_LEVELS.basic.color }}
            />
            <span className="text-sm font-bold text-foreground">20-29% Alerta</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: PEDAGOGICAL_LEVELS.adequate.color }}
            />
            <span className="text-sm font-bold text-foreground">10-19% Atencao</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: PEDAGOGICAL_LEVELS.advanced.color }}
            />
            <span className="text-sm font-bold text-foreground">{"<10% Adequado"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
